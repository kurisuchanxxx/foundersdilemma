import { ARCHETYPES, HOURS_INFO, combinedMultipliers, type FounderMultipliers } from "../data/founders";
import { PERKS, RISK_TAGS_DEF, type TraitEffects } from "../data/perks";
import type { Company, Decision, Employee, SectorId, Stats, StatKey } from "../types";
import { activeFounders, clamp } from "./util";

export interface Capacities {
  stats: Stats;
  /** Development points per month (team + contractors). */
  devPower: number;
  contractorPower: number;
  marketingEff: number;
  salesPts: number;
  csPts: number;
  opsPts: number;
  coordination: number;
  traits: Required<TraitEffects>;
  mult: FounderMultipliers;
  headcount: number;
  seniorEngShare: number;
}

const STAT_KEYS: StatKey[] = ["eng", "product", "design", "growth", "sales", "ops", "cs"];

const TRAIT_CAPS: Record<keyof TraitEffects, [number, number]> = {
  dev: [-0.3, 0.4],
  techDebt: [-0.6, 0.5],
  bugs: [-0.6, 0.5],
  quality: [-0.1, 0.15],
  learning: [-0.1, 0.3],
  cac: [-0.35, 0.2],
  sales: [-0.2, 0.5],
  churn: [-0.35, 0.2],
  burn: [-0.12, 0.1],
  morale: [-0.1, 0.1],
  security: [-0.8, 0.3],
  conversion: [-0.1, 0.25],
  brand: [-0.2, 0.6],
  hiring: [-0.1, 0.2],
};

function emptyTraits(): Required<TraitEffects> {
  return { dev: 0, techDebt: 0, bugs: 0, quality: 0, learning: 0, cac: 0, sales: 0, churn: 0, burn: 0, morale: 0, security: 0, conversion: 0, brand: 0, hiring: 0 };
}

const SENIORITY_PRODUCTIVITY = { Junior: 0.85, Mid: 1, Senior: 1, Staff: 1, Principal: 1 } as const;

/** Share of a founder's output counted for the third and fourth founder (coordination overhead). */
export const EXTRA_FOUNDER_WEIGHT = 0.35;

export function rampFactor(e: Employee, month: number): number {
  const m = month - e.startMonth;
  if (m <= 0) return 0.5;
  if (m === 1) return 0.8;
  return 1;
}

function bonusStrength(sectors: SectorId[], sector: SectorId): number {
  return sectors.length === 0 || sectors.includes(sector) ? 1 : 0.35;
}

/** Aggregated perks, risk tags and (revealed) hidden bonuses of the team. */
export function teamTraits(c: Company): Required<TraitEffects> {
  const t = emptyTraits();
  for (const e of c.team) {
    for (const p of e.perks) {
      const def = PERKS[p];
      if (!def) continue;
      for (const [k, v] of Object.entries(def.effects) as Array<[keyof TraitEffects, number]>) t[k] += v;
    }
    for (const r of e.riskTags) {
      const def = RISK_TAGS_DEF[r];
      if (!def) continue;
      for (const [k, v] of Object.entries(def.effects) as Array<[keyof TraitEffects, number]>) t[k] += v;
    }
    for (const b of e.hiddenBonuses) {
      const s = b.magnitude * bonusStrength(b.sectors, c.sector);
      switch (b.effect) {
        case "productivityBoost":
          t.dev += s * 0.5;
          break;
        case "codeQuality":
          t.techDebt -= s;
          t.bugs -= s;
          break;
        case "brandBuilding":
          t.brand += s;
          break;
        case "cacReduction":
          t.cac -= s * 0.6;
          break;
        case "avoidPitfalls":
          t.security -= s;
          break;
        case "churnReduction":
          t.churn -= s * 0.6;
          break;
        case "dealAcceleration":
          t.sales += s;
          break;
        case "conversionBoost":
          t.conversion += s * 0.6;
          break;
      }
    }
  }
  for (const [k, [lo, hi]] of Object.entries(TRAIT_CAPS) as Array<[keyof TraitEffects, [number, number]]>) {
    t[k] = clamp(t[k], lo, hi);
  }
  return t;
}

/** Founders' output factor given hours, stress and burnout. */
export function founderOutput(c: Company, d: Decision | null): number {
  const hours = HOURS_INFO[d?.founderHours ?? 50]?.output ?? 1;
  const stressPenalty = 1 - Math.max(0, c.founderStress - 0.6) * 0.7;
  const burnout = c.burnoutMonthsLeft > 0 ? 0.5 : 1;
  const vacation = d?.vacation ? 0.9 : 1;
  return hours * stressPenalty * burnout * vacation;
}

export function computeCapacities(
  c: Company,
  d: Decision | null,
  month: number,
  devModifier = 1,
  salesModifier = 1,
): Capacities {
  const founders = activeFounders(c);
  const mult = combinedMultipliers(founders.map((f) => f.archetype));
  const stats: Stats = { eng: 0, product: 0, design: 0, growth: 0, sales: 0, ops: 0, cs: 0 };
  const fOut = founderOutput(c, d);
  founders.forEach((f, i) => {
    const s = ARCHETYPES[f.archetype].stats;
    const m = ARCHETYPES[f.archetype].multipliers;
    // Founders beyond the second add hands but also meetings: they count at the extra-founder weight.
    const w = fOut * (i < 2 ? 1 : EXTRA_FOUNDER_WEIGHT);
    stats.eng += s.eng * m.rnd * w;
    stats.product += s.product * m.rnd * w;
    stats.design += s.design * m.quality * w;
    stats.growth += s.growth * m.marketing * w;
    stats.sales += s.sales * m.sales * w;
    stats.ops += s.ops * m.operations * w;
    stats.cs += s.cs * m.operations * w;
  });
  const hasMentor = c.team.some((e) => e.perks.includes("mentor") || e.seniority === "Staff" || e.seniority === "Principal");
  let seniorEng = 0;
  let totalEng = 0;
  for (const e of c.team) {
    const morale = clamp(c.morale + e.moraleOffset, 0.05, 1);
    const moraleFactor = 0.6 + 0.5 * morale;
    const prod = e.seniority === "Junior" && hasMentor ? 1 : SENIORITY_PRODUCTIVITY[e.seniority];
    const ramp = rampFactor(e, month);
    let devBoost = 1;
    for (const b of e.hiddenBonuses) {
      if (b.effect === "productivityBoost") devBoost += b.magnitude * bonusStrength(b.sectors, c.sector);
    }
    for (const k of STAT_KEYS) {
      let v = e.stats[k] * moraleFactor * prod * ramp;
      if (k === "eng" || k === "product") v *= devBoost;
      stats[k] += v;
    }
    totalEng += e.stats.eng;
    if (e.seniority !== "Junior" && e.seniority !== "Mid") seniorEng += e.stats.eng;
  }
  // Leadership: founders' strengths partially lift the whole team.
  const lead = (m: number) => 1 + 0.2 * (m - 1);
  const n = c.team.length + founders.length;
  const traits = teamTraits(c);
  let coordination = 1 / (1 + 0.02 * Math.max(0, n - 6));
  if (c.flags.officeMode === "office") coordination *= 1.03;
  if (c.flags.officeMode === "remote") coordination *= 0.97;
  coordination = Math.min(1.03, coordination + Math.min(0.12, stats.ops * 0.008));

  const contractorPower = d ? Math.max(0, d.rdBudget - 1_000) / 1_500 : 0;
  const teamDev = (stats.eng + 0.5 * stats.product + 0.3 * stats.design) * coordination * lead(mult.rnd);
  const devPower = (teamDev * (1 + traits.dev) + contractorPower) * devModifier;
  const growthPts = stats.growth <= 12 ? stats.growth : 12 + Math.sqrt(stats.growth - 12) * 2;
  const marketingEff = clamp((0.6 + 0.03 * growthPts + 0.008 * Math.min(15, stats.design)) * lead(mult.marketing), 0.5, 1.6);
  const salesPts = stats.sales * coordination * lead(mult.sales) * (1 + traits.sales) * salesModifier;
  return {
    stats,
    devPower,
    contractorPower,
    marketingEff,
    salesPts,
    csPts: stats.cs * coordination + (d ? d.opsBudget / 4_000 : 0),
    opsPts: stats.ops * lead(mult.operations) + (d ? d.opsBudget / 2_000 : 0),
    coordination,
    traits,
    mult,
    headcount: n,
    seniorEngShare: totalEng > 0 ? seniorEng / totalEng : 0,
  };
}

export function monthlySalaries(c: Company, round: number): number {
  const cut = c.flags.salaryCutUntil !== null && c.flags.salaryCutUntil >= round ? 1 - c.flags.salaryCutPct : 1;
  return (c.team.reduce((s, e) => s + e.salary, 0) / 12) * cut;
}

/** Target morale the team drifts towards each month. */
export function moraleTarget(c: Company, d: Decision | null, runway: number, mrrGrowth: number, moraleMod: number): number {
  let t = 0.68;
  if (runway < 3) t -= 0.25;
  else if (runway < 6) t -= 0.1;
  if (mrrGrowth > 0.15) t += 0.06;
  if (mrrGrowth < -0.05) t -= 0.06;
  if (c.founderStress > 0.75) t -= 0.08;
  const hours = d?.founderHours ?? 50;
  if (hours >= 80) t -= 0.08;
  else if (hours <= 40) t += 0.03;
  if (d?.teamOffsite) t += 0.08;
  if (c.flags.officeMode === "office") t += 0.03;
  const equityHolders = c.team.filter((e) => e.equityPct > 0).length;
  if (c.team.length > 0) t += 0.06 * (equityHolders / c.team.length);
  if (c.flags.salaryCutUntil !== null) t -= 0.05;
  t += teamTraits(c).morale + moraleMod;
  return clamp(t, 0.1, 1);
}

/** Target founder stress. */
export function stressTarget(c: Company, d: Decision | null, runway: number, round: number, stressMod: number): number {
  let s = 0.15;
  if (runway < 3) s += 0.35;
  else if (runway < 6) s += 0.2;
  else if (runway < 12) s += 0.08;
  const hours = d?.founderHours ?? 50;
  s += HOURS_INFO[hours]?.stress ?? 0;
  // long stretches of 60-80 hour weeks wear founders down: the cost of overwork grows month after month
  const tired = Math.min(12, c.overworkMonths ?? 0);
  if (hours >= 80) s += 0.035 * tired;
  else if (hours >= 60) s += 0.01 * tired;
  if (c.morale < 0.5) s += 0.12;
  if (c.pmf.score < 40 && round >= 6) s += 0.1;
  s += 0.05 * (d?.pitches.length ?? 0);
  if (c.loans.some((l) => l.personalGuarantee)) s += 0.08;
  if (d?.vacation) s -= 0.15;
  return clamp(s + stressMod, 0, 1);
}

/** Probability that an employee resigns in a given month. */
export function resignationChance(c: Company, e: Employee, month: number): number {
  const morale = clamp(c.morale + e.moraleOffset, 0, 1);
  let p = Math.max(0, 0.55 - morale) * 0.08;
  if (e.riskTags.includes("burnout")) p *= 1.5;
  // Golden handcuffs: unvested equity keeps people
  if (e.equityPct > 0 && month - e.startMonth < 36) p *= 0.7;
  return p;
}
