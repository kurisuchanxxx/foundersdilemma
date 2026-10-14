import { lt, type LText } from "../text";
import type { Archetype, Stats } from "../types";

export interface FounderMultipliers {
  rnd: number;
  marketing: number;
  sales: number;
  operations: number;
  quality: number;
  fundraising: number;
}

export interface ArchetypeDef {
  id: Archetype;
  name: LText;
  description: LText;
  icon: string;
  /** Personal skills of the founder working ~50h/week (same 0-10 scale as employees). */
  stats: Stats;
  multipliers: FounderMultipliers;
}

// Multipliers come straight from the Swift blueprint (FounderProfile.swift).
export const ARCHETYPES: Record<Archetype, ArchetypeDef> = {
  hacker: {
    id: "hacker",
    name: lt("Hacker", "Hacker"),
    description: lt("Tech-first builder, strong in R&D and product.", "Costruttore tecnico, forte in R&D e prodotto."),
    icon: "Terminal",
    stats: { eng: 7, product: 4, design: 1, growth: 1, sales: 1, ops: 2, cs: 1 },
    multipliers: { rnd: 1.5, marketing: 0.8, sales: 0.7, operations: 0.9, quality: 1.4, fundraising: 1.0 },
  },
  hustler: {
    id: "hustler",
    name: lt("Hustler", "Hustler"),
    description: lt("Sales-driven, excels at go-to-market and closing deals.", "Orientato alla vendita, eccelle nel go-to-market e nel chiudere contratti."),
    icon: "Megaphone",
    stats: { eng: 0, product: 2, design: 1, growth: 5, sales: 7, ops: 2, cs: 3 },
    multipliers: { rnd: 0.9, marketing: 1.4, sales: 1.5, operations: 1.0, quality: 0.9, fundraising: 1.3 },
  },
  designer: {
    id: "designer",
    name: lt("Designer", "Designer"),
    description: lt("User-centric, creates polished and delightful products.", "Centrato sull'utente, crea prodotti curati e piacevoli."),
    icon: "Palette",
    stats: { eng: 2, product: 5, design: 7, growth: 3, sales: 1, ops: 1, cs: 2 },
    multipliers: { rnd: 1.1, marketing: 1.3, sales: 0.9, operations: 0.8, quality: 1.5, fundraising: 1.1 },
  },
  analyst: {
    id: "analyst",
    name: lt("Analyst", "Analista"),
    description: lt("Data-driven, optimizes operations and metrics.", "Guidato dai dati, ottimizza operations e metriche."),
    icon: "BarChart3",
    stats: { eng: 2, product: 3, design: 1, growth: 5, sales: 2, ops: 5, cs: 2 },
    multipliers: { rnd: 1.0, marketing: 1.2, sales: 1.0, operations: 1.3, quality: 1.0, fundraising: 1.0 },
  },
  visionary: {
    id: "visionary",
    name: lt("Visionary", "Visionario"),
    description: lt("Big-picture thinker, great at fundraising and inspiring teams.", "Pensa in grande, ottimo nel fundraising e nell'ispirare il team."),
    icon: "Lightbulb",
    stats: { eng: 2, product: 6, design: 3, growth: 3, sales: 4, ops: 1, cs: 1 },
    multipliers: { rnd: 1.2, marketing: 1.1, sales: 1.0, operations: 0.7, quality: 1.3, fundraising: 1.5 },
  },
  operator: {
    id: "operator",
    name: lt("Operator", "Operativo"),
    description: lt("Execution-focused, scales teams and processes efficiently.", "Focalizzato sull'esecuzione, scala team e processi in modo efficiente."),
    icon: "Settings2",
    stats: { eng: 1, product: 2, design: 0, growth: 2, sales: 4, ops: 7, cs: 4 },
    multipliers: { rnd: 1.0, marketing: 1.0, sales: 1.2, operations: 1.5, quality: 1.0, fundraising: 0.9 },
  },
};

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as Archetype[];

/**
 * Combined multipliers of the founding team. The blueprint averaged the two founders,
 * which made complementary teams look mediocre; here each founder covers the area where
 * they are strongest, so a Hacker + Hustler duo is strong in both product and sales.
 */
export function combinedMultipliers(archetypes: Archetype[]): FounderMultipliers {
  if (archetypes.length === 0) {
    return { rnd: 1, marketing: 1, sales: 1, operations: 1, quality: 1, fundraising: 1 };
  }
  const keys: Array<keyof FounderMultipliers> = ["rnd", "marketing", "sales", "operations", "quality", "fundraising"];
  const out = {} as FounderMultipliers;
  for (const k of keys) out[k] = Math.max(...archetypes.map((a) => ARCHETYPES[a].multipliers[k]));
  return out;
}

export const HOURS_INFO: Record<number, { output: number; stress: number; label: LText }> = {
  40: { output: 0.8, stress: -0.05, label: lt("Sustainable (40h)", "Sostenibile (40h)") },
  50: { output: 1.0, stress: 0, label: lt("Committed (50h)", "Impegnato (50h)") },
  60: { output: 1.15, stress: 0.1, label: lt("Intense (60h)", "Intenso (60h)") },
  80: { output: 1.3, stress: 0.25, label: lt("All-in (80h)", "Tutto per tutto (80h)") },
};
