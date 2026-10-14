import type { SectorDef } from "../data/sectors";
import type { Rng } from "../rng";
import type { Company, Decision, Features, GameState, ModifierEffects, RoundReport } from "../types";
import type { Capacities } from "./team";

/** Per-company working data for the round being simulated (never persisted). */
export interface SimCtx {
  c: Company;
  d: Decision;
  sector: SectorDef;
  mods: Required<ModifierEffects>;
  cap: Capacities;
  features: Features;
  rng: Rng;
  report: RoundReport;
  /** Share of founders' time lost to fundraising, discovery, events (0-1). */
  distraction: number;
  oneOffCosts: number;
  // round accumulators
  newCustomers: number;
  churnedCustomers: number;
  paidCustomers: number;
  revenue: number;
  grossProfit: number;
  expenses: number;
  marketingSpent: number;
  organicShare: number;
  startMrr: number;
  startCash: number;
  monthlyExpensesLast: number;
  scheduledEvents: Array<{ month: number; templateId: string }>;
  launchedThisRound: boolean;
  preview: boolean;
}

export interface RoundCtx {
  state: GameState;
  round: number;
  months: number;
  ctxs: SimCtx[];
  preview: boolean;
}
