import type { CapTable, Company, GameState, Holder, HolderKind, Payout, Safe, Vesting } from "../types";
import { nextId } from "./util";

export const INITIAL_SHARES = 10_000_000;
export const VESTING_MONTHS = 48;
export const CLIFF_MONTHS = 12;

export function totalShares(ct: CapTable): number {
  return ct.holders.reduce((s, h) => s + h.shares, 0);
}

export function poolHolder(ct: CapTable): Holder | undefined {
  return ct.holders.find((h) => h.kind === "pool");
}

export function holderById(ct: CapTable, id: string | null): Holder | undefined {
  if (!id) return undefined;
  return ct.holders.find((h) => h.id === id);
}

export function ownership(ct: CapTable, holderId: string | null): number {
  const h = holderById(ct, holderId);
  const total = totalShares(ct);
  return h && total > 0 ? h.shares / total : 0;
}

/**
 * Fully diluted ownership of the founders that are still active: option pool included and outstanding
 * SAFEs counted as converted at their caps (plus an optional new SAFE, for previews).
 */
export function foundersOwnership(c: Company, newSafePct = 0): number {
  const total = totalShares(c.capTable);
  if (total <= 0) return 0;
  const shares = c.founders
    .filter((f) => f.active)
    .reduce((s, f) => s + (holderById(c.capTable, f.holderId)?.shares ?? 0), 0);
  return (shares / total) * (1 - Math.min(SAFE_LIMIT, safeRawPct(c) + newSafePct));
}

/** Voting ownership of active founders (unissued pool excluded). */
export function foundersVoting(c: Company): number {
  const issued = c.capTable.holders.filter((h) => h.kind !== "pool").reduce((s, h) => s + h.shares, 0);
  if (issued <= 0) return 0;
  const shares = c.founders
    .filter((f) => f.active)
    .reduce((s, f) => s + (holderById(c.capTable, f.holderId)?.shares ?? 0), 0);
  return shares / issued;
}

export function ownershipByKind(ct: CapTable): Record<HolderKind, number> {
  const total = totalShares(ct) || 1;
  const out: Record<HolderKind, number> = { founder: 0, employee: 0, investor: 0, pool: 0, crowd: 0 };
  for (const h of ct.holders) out[h.kind] += h.shares / total;
  return out;
}

export function vestedShares(h: Holder, month: number): number {
  if (!h.vesting) return h.shares;
  const v = h.vesting;
  const elapsed = month - v.startMonth;
  if (elapsed < v.cliff) return h.shares - v.total;
  const vestedOfGrant = Math.min(v.total, (v.total * elapsed) / v.months);
  return h.shares - v.total + vestedOfGrant;
}

export function createCapTable(
  state: GameState,
  founders: Array<{ name: string; share: number }>,
  vesting: boolean,
): { capTable: CapTable; holderIds: string[] } {
  const holders: Holder[] = [];
  const holderIds: string[] = [];
  for (const f of founders) {
    const shares = Math.round(INITIAL_SHARES * f.share);
    const id = nextId(state, "h");
    const v: Vesting | null = vesting ? { total: shares, startMonth: 0, months: VESTING_MONTHS, cliff: CLIFF_MONTHS } : null;
    holders.push({ id, kind: "founder", name: f.name, shares, vesting: v, preference: 0, investorId: null, roundLabel: null });
    holderIds.push(id);
  }
  return { capTable: { holders }, holderIds };
}

/** Shares needed so that a new holder owns `pct` of the company after issuance. */
function sharesForPct(total: number, pct: number): number {
  return Math.round((pct * total) / (1 - pct));
}

/**
 * Grants options to an employee. Uses the unallocated pool first; when the pool is too
 * small, new shares are issued (diluting everybody, founders included).
 */
export function grantOptions(state: GameState, c: Company, name: string, pct: number, startMonth: number): string | null {
  if (pct <= 0) return null;
  const ct = c.capTable;
  const total = totalShares(ct);
  const needed = Math.round(pct * total);
  const pool = poolHolder(ct);
  let shares: number;
  if (pool && pool.shares >= needed) {
    pool.shares -= needed;
    shares = needed;
  } else {
    const fromPool = pool ? pool.shares : 0;
    if (pool) pool.shares = 0;
    const missingPct = pct - fromPool / total;
    shares = fromPool + sharesForPct(total, Math.max(0, missingPct));
  }
  const id = nextId(state, "h");
  ct.holders.push({
    id,
    kind: "employee",
    name,
    shares,
    vesting: { total: shares, startMonth, months: VESTING_MONTHS, cliff: CLIFF_MONTHS },
    preference: 0,
    investorId: null,
    roundLabel: null,
  });
  return id;
}

/** Adds a new vesting grant to an existing holder (equity refresh). */
export function addGrant(c: Company, holderId: string, pct: number, startMonth: number): void {
  const ct = c.capTable;
  const h = holderById(ct, holderId);
  if (!h || pct <= 0) return;
  const total = totalShares(ct);
  const needed = Math.round(pct * total);
  const pool = poolHolder(ct);
  let shares: number;
  if (pool && pool.shares >= needed) {
    pool.shares -= needed;
    shares = needed;
  } else {
    shares = sharesForPct(total, pct);
  }
  // Merge into a fresh vesting schedule covering the unvested remainder + new grant.
  const unvested = h.shares - vestedShares(h, startMonth);
  h.shares += shares;
  h.vesting = { total: unvested + shares, startMonth, months: VESTING_MONTHS, cliff: 0 };
}

/**
 * Removes a departing person. Unvested shares go back to the pool (employees) or are
 * repurchased and cancelled (founders). Returns the number of shares forfeited.
 */
export function departHolder(c: Company, holderId: string | null, month: number): number {
  const ct = c.capTable;
  const h = holderById(ct, holderId);
  if (!h) return 0;
  const vested = Math.round(vestedShares(h, month));
  const forfeited = h.shares - vested;
  h.shares = vested;
  h.vesting = null;
  if (forfeited > 0) {
    if (h.kind === "employee") {
      let pool = poolHolder(ct);
      if (!pool) {
        pool = { id: `${h.id}_pool`, kind: "pool", name: "Option pool", shares: 0, vesting: null, preference: 0, investorId: null, roundLabel: null };
        ct.holders.push(pool);
      }
      pool.shares += forfeited;
    }
  }
  if (h.shares <= 0) ct.holders = ct.holders.filter((x) => x.id !== h.id);
  return forfeited;
}

export interface EquityRoundInput {
  investorId: string;
  investorName: string;
  amount: number;
  preMoney: number;
  /** Required unallocated option pool as a fraction of post-money. */
  poolTarget: number;
  liquidationPref: number;
  kind: "investor" | "crowd";
  roundLabel: string;
}

export interface EquityRoundResult {
  newShares: number;
  investorPct: number;
  poolAdded: number;
  convertedSafes: Array<{ safe: Safe; shares: number; pct: number }>;
  postMoney: number;
}

/**
 * Priced equity round. Converts outstanding SAFEs, tops up the option pool in the pre-money
 * (the "option pool shuffle") and issues new preferred shares to the investor.
 */
export function applyEquityRound(state: GameState, c: Company, input: EquityRoundInput): EquityRoundResult {
  const ct = c.capTable;
  const postMoney = input.preMoney + input.amount;
  const a = input.amount / postMoney;

  // 1) SAFE conversion
  const S0 = totalShares(ct);
  const safes = c.safes.slice();
  const fractions = safes.map((s) => s.amount / Math.max(1, Math.min(s.cap, input.preMoney)));
  const F = Math.min(SAFE_LIMIT, fractions.reduce((x, y) => x + y, 0));
  const X = F > 0 ? (S0 * F) / (1 - F) : 0;
  const totalFrac = fractions.reduce((x, y) => x + y, 0) || 1;
  const convertedSafes: EquityRoundResult["convertedSafes"] = [];
  safes.forEach((s, i) => {
    const shares = Math.round((X * fractions[i]) / totalFrac);
    ct.holders.push({
      id: nextId(state, "h"),
      kind: "investor",
      name: s.investorName,
      shares,
      vesting: null,
      preference: s.amount,
      investorId: s.investorId,
      roundLabel: "SAFE",
    });
    convertedSafes.push({ safe: s, shares, pct: 0 });
  });
  c.safes = [];
  const S1 = totalShares(ct);

  // 2) Option pool top-up (in the pre-money)
  let pool = poolHolder(ct);
  const poolExisting = pool ? pool.shares : 0;
  let poolAdd = 0;
  if (input.poolTarget > 0) {
    const p = input.poolTarget;
    const denom = 1 - p / (1 - a);
    if (denom > 0) poolAdd = Math.round(Math.max(0, ((p * S1) / (1 - a) - poolExisting) / denom));
    if (poolAdd > 0) {
      if (!pool) {
        pool = { id: nextId(state, "h"), kind: "pool", name: "Option pool", shares: 0, vesting: null, preference: 0, investorId: null, roundLabel: null };
        ct.holders.push(pool);
      }
      pool.shares += poolAdd;
    }
  }

  // 3) New money
  const T = (S1 + poolAdd) / (1 - a);
  const newShares = Math.round(T * a);
  ct.holders.push({
    id: nextId(state, "h"),
    kind: input.kind,
    name: input.investorName,
    shares: newShares,
    vesting: null,
    preference: input.kind === "investor" ? input.amount * input.liquidationPref : 0,
    investorId: input.investorId,
    roundLabel: input.roundLabel,
  });
  const total = totalShares(ct);
  for (const cs of convertedSafes) cs.pct = cs.shares / total;
  return { newShares, investorPct: newShares / total, poolAdded: poolAdd, convertedSafes, postMoney };
}

/** Issues a small number of shares (warrants) without preference. */
export function issueWarrants(state: GameState, c: Company, name: string, investorId: string, pct: number): void {
  const total = totalShares(c.capTable);
  c.capTable.holders.push({
    id: nextId(state, "h"),
    kind: "investor",
    name,
    shares: sharesForPct(total, pct),
    vesting: null,
    preference: 0,
    investorId,
    roundLabel: "Warrants",
  });
}

/** Most of the company that outstanding SAFEs may convert into (larger stacks are refused). */
export const SAFE_LIMIT = 0.6;

function safeRawPct(c: Company): number {
  return c.safes.reduce((s, x) => s + x.amount / Math.max(1, x.cap), 0);
}

/** Ownership a SAFE would represent if it converted at its cap today. */
export function safeImpliedPct(c: Company): number {
  return Math.min(SAFE_LIMIT, safeRawPct(c));
}

interface Claimant {
  holderId: string;
  name: string;
  kind: HolderKind;
  shares: number;
  pref: number;
  converting: boolean;
}

/**
 * Liquidation waterfall with 1x non-participating preferences (pari passu).
 * Unissued pool options get nothing; SAFEs are treated as preferred that can convert at their cap.
 */
export function waterfall(c: Company, exitValue: number): Payout[] {
  const ct = c.capTable;
  const holders = ct.holders.filter((h) => h.kind !== "pool" && h.shares > 0);
  const issued = holders.reduce((s, h) => s + h.shares, 0);
  const claimants: Claimant[] = holders.map((h) => ({
    holderId: h.id,
    name: h.name,
    kind: h.kind,
    shares: h.shares,
    pref: h.preference,
    converting: h.preference <= 0,
  }));
  // SAFEs: as-converted shares at their cap
  const F = safeImpliedPct(c);
  if (c.safes.length > 0 && F > 0) {
    const X = (issued * F) / (1 - F);
    const totalFrac = c.safes.reduce((s, x) => s + x.amount / Math.max(1, x.cap), 0) || 1;
    for (const s of c.safes) {
      claimants.push({
        holderId: s.id,
        name: s.investorName,
        kind: "investor",
        shares: (X * (s.amount / Math.max(1, s.cap))) / totalFrac,
        pref: s.amount,
        converting: false,
      });
    }
  }
  const value = Math.max(0, exitValue);
  const preferred = claimants.filter((x) => x.pref > 0);

  const compute = () => {
    const prefTotal = claimants.filter((x) => !x.converting).reduce((s, x) => s + x.pref, 0);
    const commonShares = claimants.filter((x) => x.converting).reduce((s, x) => s + x.shares, 0);
    return { prefTotal, commonShares };
  };

  // A preferred holder converts when the common price per share beats its preference per share.
  // Holders with the lowest preference per share convert first; each conversion lowers the price,
  // so the first holder for whom converting no longer pays stops the sequence (a stable outcome).
  const byThreshold = preferred.slice().sort((x, y) => x.pref / x.shares - y.pref / y.shares);
  let { prefTotal: owed, commonShares: common } = compute();
  let price = value - owed <= 0 ? 0 : common > 0 ? (value - owed) / common : Infinity;
  for (const p of byThreshold) {
    if (price <= 0 || p.pref / p.shares > price) break;
    p.converting = true;
    owed -= p.pref;
    common += p.shares;
    price = (value - owed) / common;
  }

  const { prefTotal, commonShares } = compute();
  const payouts: Payout[] = [];
  if (prefTotal >= value) {
    for (const x of claimants) {
      const amount = !x.converting && prefTotal > 0 ? (value * x.pref) / prefTotal : 0;
      payouts.push({ holderId: x.holderId, name: x.name, kind: x.kind, amount });
    }
    return payouts;
  }
  const pps = commonShares > 0 ? (value - prefTotal) / commonShares : 0;
  for (const x of claimants) {
    payouts.push({ holderId: x.holderId, name: x.name, kind: x.kind, amount: x.converting ? x.shares * pps : x.pref });
  }
  return payouts;
}

export function founderPayout(c: Company, payouts: Payout[]): number {
  const ids = new Set(c.founders.filter((f) => f.active).map((f) => f.holderId));
  return payouts.filter((p) => ids.has(p.holderId)).reduce((s, p) => s + p.amount, 0);
}
