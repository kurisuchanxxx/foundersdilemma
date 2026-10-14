// Named competitors that react to the market: price wars, ad blitzes, new releases, big
// rounds, aggressive hiring, failures. Their moves become sector news and modifiers.
import { RIVAL_ENTRY, RIVAL_MOVES, RIVAL_NAMES, type RivalMoveTemplate } from "../data/rivals";
import { SECTOR_IDS } from "../data/sectors";
import { createRng, type Rng } from "../rng";
import { fill } from "../text";
import type { GameEvent, GameState, Rival, SectorId, SectorMarketState } from "../types";
import { clamp, nextId } from "./util";

/** The two named rivals each sector starts with (deterministic for a seed). */
export function initialRivals(seed: string, sector: SectorId): Rival[] {
  const rng = createRng(seed, "rivals", sector);
  return RIVAL_NAMES[sector].slice(0, 2).map((name, i) => ({
    id: `rv_${sector}_${i}`,
    name,
    strength: Math.round(rng.range(0.3, 0.7) * 100) / 100,
    active: true,
    lastMove: null,
    lastMoveRound: null,
  }));
}

function leaderShare(state: GameState, sector: SectorId): number {
  const cos = state.companies.filter((c) => c.sector === sector && c.status === "active");
  const total = cos.reduce((s, c) => s + c.customers, 0);
  if (total <= 0) return 0;
  return Math.max(...cos.map((c) => c.customers)) / total;
}

function sectorEvent(state: GameState, sector: SectorId, round: number, templateId: string, title: GameEvent["title"], description: GameEvent["description"], impact: GameEvent["impact"], concept: string | null): GameEvent {
  const ev: GameEvent = { id: nextId(state, "ev"), round, scope: "global", companyId: null, sectors: [sector], templateId, title, description, impact, concept };
  state.events.push(ev);
  return ev;
}

function applyMove(state: GameState, sector: SectorId, market: SectorMarketState, rival: Rival, t: RivalMoveTemplate, round: number): GameEvent {
  const title = fill(t.title, { r: rival.name });
  if (Object.keys(t.effects).length > 0) {
    state.globalModifiers.push({ id: nextId(state, "mod"), source: title, fromRound: round, untilRound: round + t.rounds - 1, sectors: [sector], effects: { ...t.effects } });
  }
  if (t.id === "fundraise") rival.strength = clamp(rival.strength + 0.2, 0, 1);
  if (t.id === "stumble") {
    rival.active = false;
    market.npcCompetitors = Math.max(0, market.npcCompetitors - 1);
  }
  rival.lastMove = title;
  rival.lastMoveRound = round;
  return sectorEvent(state, sector, round, `rival_${t.id}`, title, t.description, t.impact, t.concept);
}

/** Competitors' moves announced at the start of a round (at most one per sector with players). */
export function rivalMoves(state: GameState, round: number, rng: Rng): GameEvent[] {
  const out: GameEvent[] = [];
  const sectors = SECTOR_IDS.filter((id) => state.companies.some((c) => c.sector === id && c.status === "active"));
  for (const sector of sectors) {
    const market = state.markets[sector];
    if (!market.rivals) market.rivals = initialRivals(state.config.seed, sector);
    for (const r of market.rivals) if (r.active) r.strength = clamp(r.strength + rng.normal(0, 0.04), 0.1, 1);

    // a new named competitor may enter the market
    if (rng.chance(0.06)) {
      const used = new Set(market.rivals.map((r) => r.name));
      const name = RIVAL_NAMES[sector].find((n) => !used.has(n));
      market.npcCompetitors += 1;
      if (name) {
        const rival: Rival = { id: `rv_${sector}_${market.rivals.length}`, name, strength: Math.round(rng.range(0.25, 0.55) * 100) / 100, active: true, lastMove: null, lastMoveRound: round };
        rival.lastMove = fill(RIVAL_ENTRY.title, { r: name });
        market.rivals.push(rival);
        out.push(sectorEvent(state, sector, round, "rival_entry", rival.lastMove, RIVAL_ENTRY.description, "negative", "competitorMoves"));
        continue;
      }
    }
    if (round < 2) continue;
    const active = market.rivals.filter((r) => r.active);
    if (active.length === 0) continue;
    const dominant = leaderShare(state, sector) > 0.4;
    // the strongest rivals move first; a dominant team draws reactions
    const order = [...active].sort((a, b) => b.strength - a.strength);
    for (const rival of order) {
      const p = 0.06 + 0.16 * rival.strength + (dominant ? 0.08 : 0);
      if (!rng.chance(p)) continue;
      const t = rng.weighted(RIVAL_MOVES, (m) => {
        let w = m.weight;
        if (dominant && (m.id === "priceWar" || m.id === "adBlitz")) w *= 1.8;
        if (m.id === "stumble") w *= rival.strength < 0.35 ? 2 : 0.3;
        if (m.id === "fundraise" && rival.strength > 0.85) w = 0;
        return w;
      });
      if (t) out.push(applyMove(state, sector, market, rival, t, round));
      break;
    }
  }
  return out;
}
