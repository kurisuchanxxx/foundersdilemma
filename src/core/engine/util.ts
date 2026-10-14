import { strategyEffects } from "./strategy";
import type { Company, Features, GameConfig, GameState, Modifier, ModifierEffects, SectorId } from "../types";

export function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Safe division. */
export function div(a: number, b: number, fallback = 0): number {
  return b === 0 || !Number.isFinite(b) ? fallback : a / b;
}

export function nextId(state: GameState, prefix: string): string {
  state.idSeq += 1;
  return `${prefix}_${state.idSeq}`;
}

export function featuresFor(config: GameConfig): Features {
  switch (config.complexity) {
    case "essential":
      return { dilemmas: false, hiringAuctions: false, techDebt: false, advancedFinance: false };
    case "standard":
      return { dilemmas: true, hiringAuctions: true, techDebt: true, advancedFinance: false };
    case "advanced":
    default:
      return { dilemmas: true, hiringAuctions: true, techDebt: true, advancedFinance: true };
  }
}

const MULTIPLICATIVE: Array<keyof ModifierEffects> = [
  "cac", "churn", "wtp", "dev", "climate", "valuation", "organic", "salaryAsk", "sales", "demand",
];

/** Combined effect of all modifiers that apply to a company in a given round. */
export function effectiveModifiers(state: GameState, company: Company | null, sector: SectorId | null, round: number): Required<ModifierEffects> {
  const out: Required<ModifierEffects> = {
    cac: 1, churn: 1, wtp: 1, dev: 1, gm: 0, climate: 1, valuation: 1, organic: 1, compliance: 0,
    hiringBar: 0, salaryAsk: 1, debtRate: 0, morale: 0, stress: 0, sales: 1, demand: 1,
  };
  const apply = (m: Modifier) => {
    if (m.untilRound < round) return;
    if (m.fromRound !== null && m.fromRound > round) return;
    if (m.sectors && sector && !m.sectors.includes(sector)) return;
    for (const [k, v] of Object.entries(m.effects) as Array<[keyof ModifierEffects, number]>) {
      if (v === undefined) continue;
      if (MULTIPLICATIVE.includes(k)) out[k] *= v;
      else out[k] += v;
    }
  };
  state.globalModifiers.forEach(apply);
  company?.modifiers.forEach(apply);
  if (company?.segment) apply({ id: "strategy", source: { en: "", it: "" }, fromRound: null, untilRound: Infinity, sectors: null, effects: strategyEffects(company).mods });
  return out;
}

export function activeFounders(c: Company) {
  return c.founders.filter((f) => f.active);
}

export function headcount(c: Company): number {
  return c.team.length + activeFounders(c).length;
}
