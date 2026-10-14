import { COMPANY_EVENTS, GLOBAL_EVENTS, type GlobalEventTemplate } from "../data/events";
import { SECTOR_IDS } from "../data/sectors";
import type { Rng } from "../rng";
import { fill, lt } from "../text";
import type { Company, CustomEventSpec, GameEvent, GameState, RiskProfile, SectorId } from "../types";
import type { SimCtx } from "./context";
import { applyBundle, scaleBundle } from "./effects";
import { nextId } from "./util";

const RISK_NEG: Record<RiskProfile, number> = { low: 0.6, medium: 1, high: 1.5 };
const RISK_POS: Record<RiskProfile, number> = { low: 0.8, medium: 1, high: 1.3 };
const REWARD: Record<RiskProfile, number> = { low: 0.8, medium: 1, high: 1.4 };

function activeSectors(state: GameState): SectorId[] {
  return Array.from(new Set(state.companies.filter((c) => c.status === "active").map((c) => c.sector)));
}

function isActive(state: GameState, id: string, round: number): boolean {
  return state.events.some((e) => e.templateId === id && e.scope === "global" && e.round >= round - 2);
}

/** Creates global news events for the coming round (they become active in that round). */
export function generateOutlook(state: GameState, round: number, rng: Rng): GameEvent[] {
  const created: GameEvent[] = [];
  const count = rng.chance(0.65) ? (round >= 5 && rng.chance(0.25) ? 2 : 1) : 0;
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const pool = GLOBAL_EVENTS.filter((t) => t.minRound <= round && !used.has(t.id) && !isActive(state, t.id, round));
    const t = rng.weighted(pool, (x) => x.weight);
    if (!t) break;
    used.add(t.id);
    created.push(activateGlobal(state, t, round, rng));
  }
  return created;
}

export function activateGlobal(state: GameState, t: GlobalEventTemplate, round: number, rng: Rng): GameEvent {
  let sectors: SectorId[] | null = null;
  if (t.sectors === "random") {
    const withPlayers = activeSectors(state);
    sectors = [rng.pick(withPlayers.length > 0 ? withPlayers : SECTOR_IDS)];
  } else if (t.sectors) {
    sectors = t.sectors;
  }
  const event: GameEvent = {
    id: nextId(state, "ev"),
    round,
    scope: "global",
    companyId: null,
    sectors,
    templateId: t.id,
    title: t.title,
    description: t.description,
    impact: t.impact,
    concept: t.concept,
  };
  state.globalModifiers.push({
    id: nextId(state, "mod"),
    source: t.title,
    fromRound: round,
    untilRound: round + t.rounds - 1,
    sectors,
    effects: { ...t.effects },
  });
  if (t.othersEffects && sectors) {
    state.globalModifiers.push({
      id: nextId(state, "mod"),
      source: t.title,
      fromRound: round,
      untilRound: round + t.rounds - 1,
      sectors: SECTOR_IDS.filter((s) => !sectors!.includes(s)),
      effects: { ...t.othersEffects },
    });
  }
  state.events.push(event);
  return event;
}

/** Decides which surprise events will hit the company this round and in which month. */
export function scheduleCompanyEvents(state: GameState, x: SimCtx, months: number): void {
  const ctx = { company: x.c, state };
  for (const t of COMPANY_EVENTS) {
    const base = t.probability(ctx);
    if (base <= 0) continue;
    const mult = t.impact === "negative" ? RISK_NEG[x.c.riskProfile] : RISK_POS[x.c.riskProfile];
    let p = base * mult;
    if (t.id === "security_breach") p *= Math.max(0.2, 1 + x.cap.traits.security);
    // Rounds of 6 months are longer: slightly higher chance.
    p *= months >= 6 ? 1.3 : 1;
    if (x.rng.chance(Math.min(0.6, p))) x.scheduledEvents.push({ month: x.rng.int(0, months - 1), templateId: t.id });
  }
}

export function fireCompanyEvent(state: GameState, x: SimCtx, templateId: string, round: number): void {
  const t = COMPANY_EVENTS.find((e) => e.id === templateId);
  if (!t) return;
  // Conditions may have changed since scheduling (e.g. product not launched yet).
  if (t.probability({ company: x.c, state }) <= 0) return;
  let bundle = t.effects({ company: x.c, state });
  if (t.impact === "positive") bundle = scaleBundle(bundle, REWARD[x.c.riskProfile], true);
  applyBundle(state, x.c, bundle, t.title, round);
  const event: GameEvent = {
    id: nextId(state, "ev"),
    round,
    scope: t.id.startsWith("team_") ? "team" : "company",
    companyId: x.c.id,
    sectors: null,
    templateId: t.id,
    title: t.title,
    description: t.description,
    impact: t.impact,
    concept: t.concept,
  };
  state.events.push(event);
  x.report.eventIds.push(event.id);
  x.report.lines.push({ kind: "event", text: fill(lt("Event: {t}", "Evento: {t}"), { t: t.title }) });
}

/** Instructor-injected event: active immediately in the current round and shown in the news. */
export function applyCustomEvent(state: GameState, spec: CustomEventSpec, round: number): GameEvent {
  let sectors: SectorId[] | null = null;
  let companies: Company[] = state.companies.filter((c) => c.status === "active");
  if (spec.target.kind === "sector") {
    const sector = spec.target.sector;
    sectors = [sector];
    companies = companies.filter((c) => c.sector === sector);
  }
  if (spec.target.kind === "company") {
    const id = spec.target.companyId;
    companies = companies.filter((c) => c.id === id);
  }
  const event: GameEvent = {
    id: nextId(state, "ev"),
    round,
    scope: "custom",
    companyId: spec.target.kind === "company" ? spec.target.companyId : null,
    sectors,
    templateId: "custom",
    title: spec.title,
    description: spec.description,
    impact: spec.impact,
    concept: null,
  };
  state.events.push(event);
  state.outlook.push(event);
  for (const c of companies) {
    if (spec.cash) c.cash += spec.cash;
    if (Object.keys(spec.effects).length > 0) {
      c.modifiers.push({
        id: nextId(state, "mod"),
        source: spec.title,
        fromRound: round,
        untilRound: round + Math.max(1, spec.rounds) - 1,
        sectors: null,
        effects: { ...spec.effects },
      });
    }
  }
  return event;
}
