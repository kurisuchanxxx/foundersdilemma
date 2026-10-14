import { SECTORS } from "../data/sectors";
import type { Company, GameState, ValuationBreakdown } from "../types";
import { headcount } from "./util";
import { effectiveModifiers } from "./util";

/** Annualised MRR growth over (up to) the last 6 months. */
export function annualGrowth(c: Company): number {
  const pts = c.monthly;
  if (pts.length < 2) return 0;
  const last = pts[pts.length - 1];
  const idx = Math.max(0, pts.length - 7);
  const base = pts[idx];
  const months = last.month - base.month;
  if (months <= 0 || base.mrr <= 0) return last.mrr > 0 ? 3 : 0;
  const g = last.mrr / base.mrr;
  return Math.min(10, Math.max(-0.95, Math.pow(g, 12 / months) - 1));
}

export function teamStrength(c: Company): number {
  const stats = c.team.reduce((s, e) => s + Object.values(e.stats).reduce((a, b) => a + b, 0), 0);
  return Math.min(1.5, (stats / 40) * 0.6 + headcount(c) * 0.03);
}

/**
 * Company valuation used for leaderboard, investor fairness and acquisition offers:
 * - revenue method: ARR x sector multiple adjusted for growth, margin and PMF;
 * - scorecard method for pre-revenue companies (team, product progress, PMF, reputation),
 *   fading out as revenue grows;
 * - anchored to the last priced round (investors' "mark") for two rounds;
 * - plus half of net cash.
 */
export function computeValuation(state: GameState, c: Company, round = state.round): ValuationBreakdown {
  const s = SECTORS[c.sector];
  const mods = effectiveModifiers(state, c, c.sector, round);
  const arr = c.mrr * 12;
  const growthAnnual = annualGrowth(c);
  const growthAdj = Math.min(2.2, Math.max(0.4, 0.7 + 0.35 * growthAnnual));
  const gm = s.grossMargin + mods.gm;
  const marginAdj = 0.7 + 0.6 * gm;
  const pmfAdj = 0.7 + (0.6 * c.pmf.score) / 100;
  const climate = Math.min(1.5, Math.max(0.5, mods.valuation * state.markets[c.sector].hype));
  const multiple = s.revenueMultiple * growthAdj * marginAdj * pmfAdj * climate;
  const revenueValue = arr * multiple;

  const progress = c.product.launched ? 1 : c.product.mvpProgress;
  const ageRounds = Math.max(0, round - 1);
  const stale = !c.product.launched && ageRounds > 6 ? Math.pow(0.85, ageRounds - 6) : 1;
  const scorecardValue =
    s.preRevenueValuation *
    (0.45 + teamStrength(c) * 0.35 + progress * 0.3 + (c.pmf.score / 100) * 0.9 + (c.reputation.investors / 100) * 0.3 + c.brand * 0.2) *
    climate *
    stale;
  const scorecardWeight = Math.max(0, 1 - arr / Math.max(1, s.preRevenueValuation * 0.6));
  const modelValue = Math.max(revenueValue, 0) + scorecardValue * scorecardWeight;

  let anchor: number | null = null;
  let anchored = modelValue;
  if (c.lastPostMoney !== null && c.lastPricedRound !== null && round - c.lastPricedRound <= 2) {
    anchor = c.lastPostMoney;
    anchored = 0.6 * modelValue + 0.4 * c.lastPostMoney;
  }
  const debt = c.loans.reduce((x, l) => x + l.remaining, 0);
  const netCash = 0.5 * (c.cash - debt);
  const total = c.status === "bankrupt" ? 0 : Math.max(50_000, anchored + netCash);
  return {
    arr,
    growthAnnual,
    multiple,
    growthAdj,
    marginAdj,
    pmfAdj,
    climate,
    revenueValue,
    scorecardValue,
    scorecardWeight,
    modelValue,
    anchor,
    netCash,
    total,
  };
}

export function updateValuation(state: GameState, c: Company, round = state.round): void {
  if (c.status === "exited" && c.exit) {
    c.valuation = c.exit.value;
    return;
  }
  const b = computeValuation(state, c, round);
  c.valuationBreakdown = b;
  c.valuation = b.total;
}
