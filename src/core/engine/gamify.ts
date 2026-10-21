// XP, levels, round challenges and team showdowns. Deterministic: challenges and showdowns are
// drawn from their own random streams so they never change the economic simulation.
import { ACHIEVEMENT_XP, CHALLENGES_PER_ROUND, CHALLENGE_DEFS, CHALLENGE_KINDS, CHALLENGE_XP, LEVEL_THRESHOLDS, LEVEL_TITLES, SHOWDOWN_DEFS, SHOWDOWN_KINDS, SHOWDOWN_XP, STREAK_BONUS_XP, STREAK_EVERY } from "../data/gamify";
import { SECTORS } from "../data/sectors";
import type { Rng } from "../rng";
import { fill, lt, type LText } from "../text";
import type { ChallengeKind, ChallengeOutcome, ChallengeTier, Company, Decision, GameState, RoundChallenge, RoundReport, Showdown, ShowdownKind, Snapshot, XpSource } from "../types";
import { clamp01, nextId } from "./util";

export interface LevelInfo {
  /** 1-based level. */
  level: number;
  title: LText;
  xp: number;
  levelStart: number;
  /** XP needed for the next level, null at the top level. */
  nextAt: number | null;
  /** 0-1 progress inside the current level. */
  progress: number;
}

export function levelFor(xp: number): LevelInfo {
  const v = Math.max(0, Math.floor(xp || 0));
  let idx = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (v >= LEVEL_THRESHOLDS[i]) idx = i;
  const start = LEVEL_THRESHOLDS[idx];
  const next = idx + 1 < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[idx + 1] : null;
  return {
    level: idx + 1,
    title: LEVEL_TITLES[idx],
    xp: v,
    levelStart: start,
    nextAt: next,
    progress: next === null ? 1 : clamp01((v - start) / (next - start)),
  };
}

/** Adds XP to a company and keeps a log for the round recap. Returns the new total. */
export function awardXp(c: Company, amount: number, round: number, source: XpSource, label: LText): number {
  const v = Math.round(amount);
  if (v <= 0) return c.xp;
  c.xp = (c.xp || 0) + v;
  c.xpLog.push({ round, source, amount: v, label });
  return c.xp;
}

export function xpGainedInRound(c: Company, round: number): number {
  return c.xpLog.filter((e) => e.round === round).reduce((s, e) => s + e.amount, 0);
}

export function achievementXp(): number {
  return ACHIEVEMENT_XP;
}

// ---------------------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------------------

export function challengeTitle(ch: Pick<RoundChallenge, "kind" | "target">): LText {
  return CHALLENGE_DEFS[ch.kind].title(ch.target);
}

export function challengeDescription(ch: Pick<RoundChallenge, "kind" | "target">): LText {
  return CHALLENGE_DEFS[ch.kind].description(ch.target);
}

export function challengeIcon(kind: ChallengeKind): string {
  return CHALLENGE_DEFS[kind].icon;
}

const NEEDS_PREVIOUS_ROUND: ChallengeKind[] = ["mrrGrowth", "pmfGain", "noDebt"];

/** Three challenges per round (easy, medium, hard), the same for every team. */
export function generateChallenges(state: GameState, round: number, rng: Rng): RoundChallenge[] {
  const active = state.companies.filter((c) => c.status === "active");
  const launchedShare = active.length > 0 ? active.filter((c) => c.product.launched).length / active.length : 0;
  const pool = CHALLENGE_KINDS.filter((k) => {
    const def = CHALLENGE_DEFS[k];
    if (round === 1 && NEEDS_PREVIOUS_ROUND.includes(k)) return false;
    if (def.launched === null) return true;
    return def.launched ? launchedShare >= 0.5 : launchedShare < 0.5;
  });
  const lastKinds = new Set(state.challenges.map((c) => c.kind));
  const fresh = pool.filter((k) => !lastKinds.has(k));
  const candidates = fresh.length >= CHALLENGES_PER_ROUND ? fresh : pool;
  const kinds = rng.shuffle(candidates).slice(0, CHALLENGES_PER_ROUND);
  const tiers: ChallengeTier[] = ["easy", "medium", "hard"];
  return kinds.map((kind, i) => {
    const tier = tiers[i] ?? "medium";
    return { id: nextId(state, "ch"), round, kind, tier, xp: CHALLENGE_XP[tier], target: CHALLENGE_DEFS[kind].targets[tier] };
  });
}

interface Progress {
  progress: number;
  applicable: boolean;
}

const NA: Progress = { progress: 0, applicable: false };
const ratio = (v: number): Progress => ({ progress: clamp01(Number.isFinite(v) ? v : 0), applicable: true });

/** Progress of a company towards a challenge, given the round's snapshot and applied decision. */
export function challengeProgress(c: Company, ch: Pick<RoundChallenge, "kind" | "target">, snap: Snapshot, prev: Snapshot | null, d: Decision | null, report: RoundReport | null): Progress {
  const sector = SECTORS[c.sector];
  const t = ch.target;
  switch (ch.kind) {
    case "mrrGrowth":
      if (!prev || prev.mrr <= 0) return NA;
      return ratio((snap.mrr / prev.mrr - 1) / t);
    case "newCustomers":
      if (!c.product.launched) return NA;
      return ratio(snap.newCustomers / t);
    case "lowChurn": {
      if (!c.product.launched || snap.customers <= 0) return NA;
      const limit = sector.baseChurn * t;
      return ratio(snap.churn <= limit ? 1 : limit / Math.max(snap.churn, 1e-6));
    }
    case "hire":
      return ratio((report?.hiringResults.filter((h) => h.outcome === "hired").length ?? 0) / t);
    case "deepDiscovery":
      return ratio(d?.discovery === "deep" ? 1 : d?.discovery === "light" ? 0.4 : 0);
    case "lowStress":
      return ratio(snap.stress <= t ? 1 : t / Math.max(snap.stress, 1e-6));
    case "raise": {
      const raised = c.fundingHistory.filter((r) => r.round === snap.round).reduce((s, r) => s + r.amount, 0);
      return ratio(t <= 1 ? (raised > 0 ? 1 : 0) : raised / t);
    }
    case "launch": {
      const launchedBefore = c.product.launchRound !== null && c.product.launchRound < snap.round;
      if (launchedBefore) return NA;
      return ratio(c.product.launched ? 1 : c.product.mvpProgress);
    }
    case "pmfGain":
      if (!prev) return NA;
      return ratio((snap.pmf - prev.pmf) / t);
    case "cashPositive":
      if (!c.product.launched) return NA;
      return ratio(snap.netBurn <= 0 ? 1 : snap.mrr / (snap.mrr + snap.netBurn));
    case "qualityShip":
      return ratio(d?.devApproach === "quality" ? 1 : d?.devApproach === "balanced" ? 0.5 : 0);
    case "noDebt": {
      if (!prev) return NA;
      const delta = snap.techDebt - prev.techDebt;
      return ratio(delta <= t ? 1 : 1 - (delta - t) / 0.1);
    }
    case "runway":
      return ratio(Math.min(snap.runway, 99) / t);
    case "morale":
      return ratio(snap.morale / t);
    case "nps":
      if (!c.product.launched || snap.customers <= 0) return NA;
      return ratio(snap.nps / t);
    case "frugal": {
      const total = (d?.rdBudget ?? 0) + (d?.marketingBudget ?? 0) + (d?.opsBudget ?? 0);
      return ratio(total <= t ? 1 : t / Math.max(total, 1));
    }
    case "pitch":
      return ratio((d?.pitches.length ?? 0) > 0 ? 1 : 0);
    case "community":
      return ratio(d && d.reputationAction !== "none" ? 1 : 0);
  }
}

/** Scores the round's challenges for a company, awards XP and the streak bonus. */
export function evaluateChallenges(state: GameState, c: Company, round: number, snap: Snapshot, prev: Snapshot | null, d: Decision, report: RoundReport): ChallengeOutcome[] {
  const outcomes: ChallengeOutcome[] = [];
  let completed = 0;
  let xp = 0;
  for (const ch of state.challenges.filter((x) => x.round === round)) {
    const p = challengeProgress(c, ch, snap, prev, d, report);
    const done = p.applicable && p.progress >= 0.999;
    const gained = done ? ch.xp : 0;
    outcomes.push({ challengeId: ch.id, kind: ch.kind, tier: ch.tier, round, target: ch.target, progress: p.progress, completed: done, applicable: p.applicable, xp: gained });
    if (done) {
      completed += 1;
      xp += gained;
      awardXp(c, gained, round, "challenge", challengeTitle(ch));
    }
  }
  c.challengeLog.push(...outcomes);
  if (outcomes.length === 0) return outcomes;
  c.challengeStreak = completed > 0 ? c.challengeStreak + 1 : 0;
  let bonus = 0;
  if (c.challengeStreak > 0 && c.challengeStreak % STREAK_EVERY === 0) {
    bonus = STREAK_BONUS_XP;
    awardXp(c, bonus, round, "streak", fill(lt("{n}-round challenge streak", "Serie di {n} round con sfide completate"), { n: c.challengeStreak }));
  }
  const applicable = outcomes.filter((o) => o.applicable).length;
  report.lines.push({
    kind: completed > 0 ? "good" : "info",
    text:
      completed > 0
        ? fill(lt("Challenges: {c} of {n} completed (+{x} XP{b}).", "Sfide: {c} su {n} completate (+{x} XP{b})."), { c: completed, n: applicable, x: xp + bonus, b: bonus > 0 ? { en: `, streak bonus included`, it: `, bonus serie incluso` } : "" })
        : fill(lt("Challenges: none of the {n} completed this round.", "Sfide: nessuna delle {n} completata in questo round."), { n: applicable }),
  });
  return outcomes;
}

// ---------------------------------------------------------------------------------------
// Showdowns
// ---------------------------------------------------------------------------------------

export function showdownValue(kind: ShowdownKind, c: Company, snap: Snapshot, prev: Snapshot | null): number | null {
  switch (kind) {
    case "mrrSprint":
      return prev && prev.mrr > 0 ? snap.mrr / prev.mrr - 1 : null;
    case "customerRush":
      return c.product.launched ? snap.newCustomers : null;
    case "retentionDuel":
      return c.product.launched && snap.customers > 0 ? snap.churn : null;
    case "pmfRace":
      return snap.pmf - (prev?.pmf ?? 0);
    case "moraleCup":
      return snap.morale;
    case "efficiencyCup":
      return Math.min(36, snap.runway);
    case "brandBattle":
      return snap.brand - (prev?.brand ?? 0.02);
    case "fundraisingDerby":
      return c.fundingHistory.filter((r) => r.round === snap.round).reduce((s, r) => s + r.amount, 0);
    case "buildSprint":
      if (!prev) return snap.mvpProgress;
      return prev.mvpProgress >= 1 ? snap.quality - prev.quality : snap.mvpProgress - prev.mvpProgress;
  }
}

export function currentShowdown(state: GameState): Showdown | null {
  return state.showdowns.find((s) => s.round === state.round && !s.resolved) ?? null;
}

export function lastResolvedShowdown(state: GameState): Showdown | null {
  for (let i = state.showdowns.length - 1; i >= 0; i--) if (state.showdowns[i].resolved) return state.showdowns[i];
  return null;
}

/** Announces the race of the round. */
export function openShowdown(state: GameState, round: number, rng: Rng): Showdown {
  const active = state.companies.filter((c) => c.status === "active");
  const launchedShare = active.length > 0 ? active.filter((c) => c.product.launched).length / active.length : 0;
  const pool = SHOWDOWN_KINDS.filter((k) => {
    const def = SHOWDOWN_DEFS[k];
    if (round === 1 && k === "mrrSprint") return false;
    if (def.launched === null) return true;
    return def.launched ? launchedShare >= 0.5 : launchedShare < 0.5;
  });
  const last = state.showdowns[state.showdowns.length - 1];
  const fresh = pool.filter((k) => k !== last?.kind);
  const kind = rng.pick(fresh.length > 0 ? fresh : pool);
  const sd: Showdown = { id: nextId(state, "sd"), round, kind, resolved: false, results: [] };
  state.showdowns.push(sd);
  return sd;
}

/** Ranks every team that played the round, awards XP and a cup to the winner. */
export function resolveShowdown(state: GameState, round: number, reportOf: (companyId: string) => RoundReport | undefined): Showdown | null {
  const sd = state.showdowns.find((s) => s.round === round && !s.resolved);
  if (!sd) return null;
  const def = SHOWDOWN_DEFS[sd.kind];
  const rows: Array<{ c: Company; value: number }> = [];
  for (const c of state.companies) {
    const snap = c.history.find((h) => h.round === round);
    if (!snap || c.status === "bankrupt") continue;
    const prev = c.history.find((h) => h.round === round - 1) ?? null;
    const v = showdownValue(sd.kind, c, snap, prev);
    if (v === null || !Number.isFinite(v)) continue;
    rows.push({ c, value: v });
  }
  rows.sort((a, b) => (def.higherIsBetter ? b.value - a.value : a.value - b.value));
  sd.results = rows.map((r, i) => ({ companyId: r.c.id, value: r.value, rank: i + 1, xp: rows.length > 1 ? SHOWDOWN_XP[i] ?? 0 : 0 }));
  sd.resolved = true;
  if (rows.length > 1) {
    for (const res of sd.results) {
      const c = rows[res.rank - 1].c;
      if (res.rank === 1) c.cups = (c.cups || 0) + 1;
      if (res.xp > 0) awardXp(c, res.xp, round, "showdown", fill(lt("{t}: {r}{s} place", "{t}: {r}{s} posto"), { t: def.title, r: res.rank, s: ordinal(res.rank) }));
      reportOf(c.id)?.lines.push({
        kind: res.rank === 1 ? "good" : "info",
        text:
          res.rank === 1
            ? fill(lt("Showdown '{t}': you won the cup (+{x} XP)!", "Sfida di squadra '{t}': avete vinto la coppa (+{x} XP)!"), { t: def.title, x: res.xp })
            : fill(lt("Showdown '{t}': you finished {r} of {n}{x}.", "Sfida di squadra '{t}': siete arrivati {r} su {n}{x}."), { t: def.title, r: res.rank, n: rows.length, x: res.xp > 0 ? { en: ` (+${res.xp} XP)`, it: ` (+${res.xp} XP)` } : "" }),
      });
    }
  }
  return sd;
}

function ordinal(n: number): LText {
  const en = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return { en, it: "°" };
}
