import { GTM_INFO, SECTORS, type SectorDef } from "../data/sectors";
import { lt, type LText } from "../text";
import type { Company, GameState, ModifierEffects, SectorId } from "../types";
import type { SimCtx } from "./context";
import { strategyEffects } from "./strategy";
import { clamp, clamp01, effectiveModifiers } from "./util";
import { monthsBefore, totalMonths } from "./periods";

// ---------------------------------------------------------------------------------------
// Adoption curve (Rogers) and the "chasm" (Moore)
// ---------------------------------------------------------------------------------------

export type Segment = "innovators" | "earlyAdopters" | "earlyMajority" | "lateMajority" | "laggards";

export const SEGMENTS: Record<Segment, { upTo: number; cac: number; churn: number; wtp: number; label: LText }> = {
  innovators: { upTo: 0.025, cac: 0.8, churn: 1.3, wtp: 1.05, label: lt("Innovators", "Innovatori") },
  earlyAdopters: { upTo: 0.16, cac: 1.0, churn: 1.0, wtp: 1.0, label: lt("Early adopters", "Early adopter") },
  earlyMajority: { upTo: 0.5, cac: 1.3, churn: 0.85, wtp: 0.95, label: lt("Early majority", "Maggioranza anticipatrice") },
  lateMajority: { upTo: 0.84, cac: 1.6, churn: 0.8, wtp: 0.9, label: lt("Late majority", "Maggioranza ritardataria") },
  laggards: { upTo: 1, cac: 2.0, churn: 0.75, wtp: 0.85, label: lt("Laggards", "Ritardatari") },
};

export function segmentFor(penetration: number): Segment {
  if (penetration < SEGMENTS.innovators.upTo) return "innovators";
  if (penetration < SEGMENTS.earlyAdopters.upTo) return "earlyAdopters";
  if (penetration < SEGMENTS.earlyMajority.upTo) return "earlyMajority";
  if (penetration < SEGMENTS.lateMajority.upTo) return "lateMajority";
  return "laggards";
}

/** PMF score needed to "cross the chasm" into the early majority without a CAC penalty. */
export const CHASM_PMF = 55;

export function sectorCustomers(state: GameState, sector: SectorId): number {
  return state.companies.filter((c) => c.sector === sector && c.status === "active").reduce((s, c) => s + c.customers, 0);
}

export function effectiveTam(sector: SectorDef, demandMod: number): number {
  return sector.tam * demandMod;
}

/**
 * Share of the sector's market that has adopted the product category, outside the teams in play
 * (competitors and substitutes): about 1% at the start, the 16% of the chasm a little before
 * mid-game and about 45% at the end, whatever the length of the game.
 */
export function categoryAdoption(state: GameState): number {
  const total = totalMonths(state.config);
  const progress = total > 0 ? clamp01(monthsBefore(state.config, state.round) / total) : 0;
  return 0.01 + 0.44 * Math.pow(progress, 1.17);
}

/** Position of the sector on the adoption curve: the category's adoption plus the teams' own customers. */
export function sectorPenetration(state: GameState, sector: SectorDef, demandMod = 1): number {
  return clamp01(categoryAdoption(state) + sectorCustomers(state, sector.id) / Math.max(1, effectiveTam(sector, demandMod)));
}

// ---------------------------------------------------------------------------------------
// Unit economics helpers (shared by the simulation, the preview and the UI)
// ---------------------------------------------------------------------------------------

export interface MarketQuote {
  wtp: number;
  priceFactor: number;
  cac: number;
  churn: number;
  segment: Segment;
  chasmPenalty: boolean;
  scale: number;
  coldStart: boolean;
  gm: number;
  ltv: number;
}

function networkScale(sector: SectorDef, customers: number): number {
  if (sector.networkEffect <= 0) return 1;
  return 1 + 0.6 * sector.networkEffect * Math.min(1, Math.log10(1 + customers / 1000) / 3);
}

/** Monthly willingness to pay of the customers the company is selling to right now (segment, strategy and events included). */
export function willingnessToPay(state: GameState, c: Company, mods: Required<ModifierEffects>): number {
  const s = SECTORS[c.sector];
  const seg = SEGMENTS[segmentFor(sectorPenetration(state, s, mods.demand))];
  let wtp = s.refPrice * (0.6 + 0.8 * (0.5 * c.product.quality + (0.5 * c.pmf.score) / 100)) * (1 + 0.1 * c.brand) * mods.wtp * seg.wtp;
  if (c.flags.openSource) wtp *= 0.85;
  if (s.networkEffect >= 0.5 && c.customers < s.tam * 0.002) wtp *= 0.85;
  return wtp;
}

/** The same willingness to pay at the current round, for advice, bots and the interface. */
export function estimateWtp(state: GameState, c: Company): number {
  return willingnessToPay(state, c, effectiveModifiers(state, c, c.sector, state.round));
}

/**
 * Conversion boost/penalty from pricing: underpricing helps only a little (up to +60%), overpricing hurts more
 * and more. Above the willingness to pay the elasticity grows with the gap, so even inelastic B2B markets have
 * a revenue-maximising price not far above the WTP instead of rewarding the highest possible price.
 */
export function priceConversion(wtp: number, price: number, elasticity: number): number {
  const r = Math.max(0.01, price) / Math.max(0.01, wtp);
  if (r <= 1) return Math.min(1.6, 1 + (Math.pow(1 / r, elasticity) - 1) * 0.5);
  return Math.max(0.01, Math.pow(r, -(elasticity + 1.5 * (r - 1))));
}

export function competitionFactor(state: GameState, c: Company): number {
  const rivals = state.companies.filter(
    (o) => o.id !== c.id && o.sector === c.sector && o.status === "active" && o.product.launched,
  ).length;
  return 1 + 0.06 * rivals + 0.02 * state.markets[c.sector].npcCompetitors;
}

export function quote(state: GameState, x: SimCtx, price: number): MarketQuote {
  const c = x.c;
  const s = x.sector;
  const pen = sectorPenetration(state, s, x.mods.demand);
  const segment = segmentFor(pen);
  const seg = SEGMENTS[segment];
  const scale = networkScale(s, c.customers);
  const coldStart = s.networkEffect >= 0.5 && c.customers < s.tam * 0.002;

  const wtp = willingnessToPay(state, c, x.mods);
  const fx = strategyEffects(c);
  const priceFactor = priceConversion(wtp, price, s.elasticity * fx.elasticity) * (1 + x.cap.traits.conversion);

  const chasmPenalty = (segment === "earlyMajority" || segment === "lateMajority") && c.pmf.score < CHASM_PMF;
  const pmfCac = 1.3 - (0.5 * c.pmf.score) / 100;
  let cac =
    (s.baseCac * seg.cac * (chasmPenalty ? fx.chasm : 1) * s.gtmFit[x.d.gtm] * competitionFactor(state, c) * pmfCac * (1 - 0.25 * c.brand) *
      (1 - (0.1 * c.reputation.media) / 100) * x.mods.cac * (1 + x.cap.traits.cac)) /
    (x.cap.marketingEff * priceFactor * scale);
  cac = Math.max(s.baseCac * 0.05, cac);

  const priceChurn = price > wtp ? 1 + 0.6 * (price / wtp - 1) : 1 - 0.1 * Math.min(1, wtp / price - 1);
  const csReduction = (0.3 * x.cap.csPts) / (x.cap.csPts + 2 + c.customers / s.customersPerCsPoint);
  let churn =
    s.baseChurn *
    (1.6 - c.pmf.score / 100) *
    seg.churn *
    GTM_INFO[x.d.gtm].churn *
    clamp(priceChurn, 0.85, 2.5) *
    (1 + (c.product.bugs / 100) * 0.6) *
    (1.2 - 0.4 * c.product.quality) *
    (1 - csReduction) *
    (1 - (0.1 * c.reputation.customers) / 100) *
    x.mods.churn *
    (1 + x.cap.traits.churn) /
    Math.sqrt(scale);
  if (coldStart) churn *= 1.15;
  // Support overload: too many customers per customer-success capacity.
  const supportCapacity = (x.cap.csPts + 2) * s.customersPerCsPoint;
  if (c.customers > supportCapacity) churn *= 1 + 0.5 * Math.min(1, c.customers / supportCapacity - 1);
  churn = clamp(churn, 0.003, 0.45);

  const gm = clamp(s.grossMargin + Math.min(0.05, x.cap.opsPts * 0.002) + x.mods.gm, 0.05, 0.95);
  const ltv = (price * gm) * Math.min(1 / churn, 60);
  return { wtp, priceFactor, cac, churn, segment, chasmPenalty, scale, coldStart, gm, ltv };
}

/**
 * One month of market dynamics for every company of a sector. Companies of the same sector
 * share the addressable market: when demand exceeds what the market can absorb in a month,
 * new customers are split proportionally.
 */
export function marketMonth(state: GameState, sector: SectorDef, ctxs: SimCtx[]): void {
  if (ctxs.length === 0) return;
  const demandMod = ctxs[0].mods.demand;
  const tam = effectiveTam(sector, demandMod);
  const remaining = Math.max(0, tam - sectorCustomers(state, sector.id));

  const plans = ctxs.map((x) => {
    const c = x.c;
    const q = quote(state, x, x.d.price);
    // The target segment limits the part of the sector the company can reach.
    const fx = strategyEffects(c);
    const myTam = tam * fx.tam;
    const myRemaining = Math.min(remaining, Math.max(0, myTam - c.customers));
    const myPen = clamp01(1 - myRemaining / Math.max(1, myTam));
    // Spending beyond what the growth team can execute is much less effective.
    const execCap = 10_000 + x.cap.stats.growth * 6_000 + x.cap.stats.design * 1_000;
    const M = Math.min(x.d.marketingBudget, execCap) + 0.3 * Math.max(0, x.d.marketingBudget - execCap);
    const satSpend = myTam * 0.001 * sector.baseCac * (1 + c.brand);
    const saturation = 1 / (1 + M / Math.max(1, satSpend));
    x.marketingSpent += x.d.marketingBudget;

    if (!c.product.launched) {
      // Pre-launch marketing builds a waitlist (cheaper sign-ups, no revenue yet).
      const signups = (M / (q.cac * 0.3)) * saturation + c.brand * c.brand * myTam * 0.0001;
      return { x, q, paid: 0, outbound: 0, organic: 0, inbound: 0, waitlist: signups * x.mods.demand, desired: 0 };
    }
    const dep = clamp(sector.salesDependence + fx.salesDep, 0, 0.95);
    const coverage = dep > 0 ? 1 - dep + dep * Math.min(1, x.cap.salesPts / (10 * dep)) : 1;
    const paid = (M / q.cac) * saturation * coverage;
    const salesPts = x.cap.salesPts <= 12 ? x.cap.salesPts : 12 + Math.sqrt(x.cap.salesPts - 12) * 3.5;
    // Salespeople can negotiate a discount into a deal, but cannot close prices far above what buyers value.
    const dealPrice = q.priceFactor >= 1 ? Math.sqrt(Math.min(q.priceFactor, 1.5)) : q.priceFactor;
    const outbound =
      sector.dealsPerSalesPoint > 0
        ? salesPts * sector.dealsPerSalesPoint * fx.outbound * (x.d.gtm === "salesLed" ? 1.6 : 0.6) * dealPrice * (0.6 + (0.8 * c.pmf.score) / 100) * x.mods.sales * (1 - myPen)
        : 0;
    const npsFactor = clamp(0.5 + c.nps / 100, 0.2, 1.5);
    const pmfFactor = Math.min(1.6, Math.pow(Math.max(0.05, c.pmf.score / 60), 1.5));
    // Referred prospects see the same price tag: overpricing slows word of mouth as well.
    const organic =
      c.customers * sector.virality * pmfFactor * npsFactor * Math.min(1, q.priceFactor) * x.mods.organic * (1 + 0.5 * (q.scale - 1)) * (c.flags.openSource ? 1.6 : 1) * (1 - myPen) * (1 - myPen);
    const inbound = c.brand * c.brand * myTam * 0.00015 * Math.min(1.5, q.priceFactor) * (1 - myPen);
    const desired = (paid + outbound + organic + inbound) * x.mods.demand;
    return { x, q, paid, outbound, organic, inbound, waitlist: 0, desired: Math.min(desired, myRemaining * 0.04) };
  });

  const totalDesired = plans.reduce((s, p) => s + p.desired, 0);
  const capacity = remaining * 0.1;
  const scale = totalDesired > capacity && totalDesired > 0 ? capacity / totalDesired : 1;

  for (const p of plans) {
    const { x, q } = p;
    const c = x.c;
    if (!c.product.launched) {
      c.waitlist = c.waitlist * 0.97 + p.waitlist;
      c.cac = q.cac * 0.3;
      continue;
    }
    const newCustomers = p.desired * scale;
    const churned = c.customers * q.churn;
    c.customers = Math.max(0, c.customers + newCustomers - churned);
    c.churn = q.churn;
    c.ltv = q.ltv;
    const paidShare = p.desired > 0 ? (p.paid * x.mods.demand * scale) / Math.max(1e-9, newCustomers) : 0;
    const paidNew = newCustomers * Math.min(1, paidShare);
    c.cac = paidNew > 0.01 ? x.d.marketingBudget / paidNew : q.cac;
    x.organicShare = newCustomers > 0 ? clamp01(((p.organic + p.inbound) * x.mods.demand * scale) / newCustomers) : 0;
    x.newCustomers += newCustomers;
    x.churnedCustomers += churned;
    x.paidCustomers += paidNew;
    c.mrr = c.customers * x.d.price;
  }
}

/** Customers converted from the waitlist at launch. */
export function convertWaitlist(state: GameState, x: SimCtx): number {
  const q = quote(state, x, x.d.price);
  const converted = x.c.waitlist * 0.35 * Math.min(1, q.priceFactor);
  x.c.customers += converted;
  x.c.waitlist = 0;
  x.newCustomers += converted;
  return converted;
}

/** Monthly drift of brand, NPS and customer reputation. */
export function brandAndSentiment(state: GameState, x: SimCtx): void {
  const c = x.c;
  const s = x.sector;
  const tam = effectiveTam(s, x.mods.demand);
  const brandRef = tam * 0.002 * s.baseCac;
  const build = (x.d.marketingBudget * GTM_INFO[x.d.gtm].brandBuild) / Math.max(1, brandRef) * 0.5 / (1 + 2 * c.brand);
  c.brand = clamp01(c.brand * 0.97 + build + x.cap.traits.brand * 0.01 + (c.reputation.media / 100) * 0.004);

  if (c.product.launched) {
    const q = quote(state, x, x.d.price);
    const priceGap = Math.max(0, x.d.price / q.wtp - 1);
    c.nps = clamp(-60 + 160 * (0.4 * c.product.quality + (0.4 * c.pmf.score) / 100 + 0.2 * (1 - c.product.bugs / 100)) - 30 * priceGap, -100, 100);
    const target = 30 + 50 * (0.5 * c.product.quality + (0.5 * c.pmf.score) / 100) - c.product.bugs * 0.2;
    c.reputation.customers = clamp(c.reputation.customers + (target - c.reputation.customers) * 0.1, 0, 100);
  }
}
