import type { LText } from "../text";
import type { Company, EffectBundle, GameState, Reputation } from "../types";
import { clamp, clamp01, nextId } from "./util";

/** Applies an effect bundle (from an event, a dilemma choice, a perk...) to a company. */
export function applyBundle(state: GameState, c: Company, b: EffectBundle, source: LText, round: number): void {
  if (b.cash) c.cash += b.cash;
  if (b.customersPct) c.customers = Math.max(0, c.customers * (1 + b.customersPct));
  if (b.customersAdd) c.customers = Math.max(0, c.customers + b.customersAdd);
  if (b.customersPct || b.customersAdd) c.mrr = c.customers * c.price;
  if (b.techDebt) c.product.techDebt = clamp01(c.product.techDebt + b.techDebt);
  if (b.quality) c.product.quality = clamp(c.product.quality + b.quality, 0.05, 1);
  if (b.bugs) c.product.bugs = clamp(c.product.bugs + b.bugs, 0, 100);
  if (b.mvpProgress) c.product.mvpProgress = clamp01(c.product.mvpProgress + b.mvpProgress);
  if (b.problemClarity) c.pmf.problemClarity = clamp01(c.pmf.problemClarity + b.problemClarity);
  if (b.solutionFit) c.pmf.solutionFit = clamp01(c.pmf.solutionFit + b.solutionFit);
  if (b.marketPull) c.pmf.marketPull = clamp01(c.pmf.marketPull + b.marketPull);
  if (b.learningVelocity) c.pmf.learningVelocity = clamp01(c.pmf.learningVelocity + b.learningVelocity);
  if (b.morale) c.morale = clamp(c.morale + b.morale, 0.05, 1);
  if (b.stress) c.founderStress = clamp01(c.founderStress + b.stress);
  if (b.brand) c.brand = clamp01(c.brand + b.brand);
  if (b.rep) {
    for (const [k, v] of Object.entries(b.rep) as Array<[keyof Reputation, number]>) {
      c.reputation[k] = clamp(c.reputation[k] + v, 0, 100);
    }
  }
  if (b.modifier) {
    c.modifiers.push({
      id: nextId(state, "mod"),
      source,
      fromRound: null,
      untilRound: round + b.modifier.rounds - 1,
      sectors: null,
      effects: { ...b.modifier.effects },
    });
  }
}

export function scaleBundle(b: EffectBundle, factor: number, onlyPositive: boolean): EffectBundle {
  const out: EffectBundle = { ...b };
  const scale = (v: number | undefined) => (v === undefined ? v : onlyPositive && v < 0 ? v : v * factor);
  out.customersPct = scale(b.customersPct);
  out.customersAdd = scale(b.customersAdd);
  out.brand = scale(b.brand);
  if (b.rep) {
    out.rep = {};
    for (const [k, v] of Object.entries(b.rep) as Array<[keyof Reputation, number]>) out.rep[k] = scale(v);
  }
  return out;
}

export function averageReputation(c: Company): number {
  const r = c.reputation;
  return (r.investors + r.media + r.talent + r.customers) / 4;
}
