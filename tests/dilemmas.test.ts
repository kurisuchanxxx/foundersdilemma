import { describe, expect, it } from "vitest";
import { DILEMMAS, advanceRound, createGame, defaultConfig, startGame } from "../src/core";
import type { CompanySetup, DilemmaInstance, GameState, RoundReport, SectorId } from "../src/core";
import { DILEMMA_CHOICES } from "../src/core/engine/bots";
import { resolveDilemma } from "../src/core/engine/dilemmas";
import { createRng } from "../src/core/rng";
import { fill } from "../src/core/text";
import { glossaryEntry } from "../src/ui/content/glossary";

function team(sector: SectorId): CompanySetup {
  return {
    name: "Team",
    productName: "Team",
    sector,
    logo: "Rocket",
    color: "#0A84FF",
    riskProfile: "medium",
    founders: [
      { name: "Ada", archetype: "hacker" },
      { name: "Bruno", archetype: "hustler" },
    ],
    equitySplit: 0.5,
    founderVesting: true,
    teamMembers: [],
    isBot: false,
  };
}

/** A launched company with customers, revenue and a few employees taken from the game's bots. */
function grownGame(sector: SectorId, seed: string): GameState {
  const state = createGame({ ...defaultConfig(), seed }, [team(sector)], 3);
  startGame(state);
  for (let r = 0; r < 4; r++) advanceRound(state);
  const c = state.companies[0];
  c.product.launched = true;
  c.product.launchRound ??= 1;
  c.customers = Math.max(c.customers, 400);
  c.mrr = c.customers * c.price;
  c.cash = Math.max(c.cash, 500_000);
  c.valuation = Math.max(c.valuation, 3_000_000);
  // borrow employees from the bots so dilemmas about people can be played
  for (const b of state.companies.slice(1)) {
    for (const e of b.team.splice(0)) c.team.push({ ...e, holderId: null, equityPct: 0 });
  }
  return state;
}

const report = (state: GameState, id: string): RoundReport => ({ round: state.round, companyId: id, lines: [], pitchResults: [], hiringResults: [], eventIds: [], insights: [], decision: null });

describe("founder dilemmas", () => {
  it("are well formed: unique ids, known concepts, bot choices that exist", () => {
    const ids = DILEMMAS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DILEMMAS.length).toBeGreaterThanOrEqual(27);
    for (const d of DILEMMAS) {
      expect(glossaryEntry(d.concept), `${d.id} concept ${d.concept}`).toBeTruthy();
      const opts = d.options.map((o) => o.id);
      expect(new Set(opts).size, d.id).toBe(opts.length);
      const bot = DILEMMA_CHOICES[d.id];
      expect(bot, `bot choices for ${d.id}`).toBeTruthy();
      for (const style of ["lean", "steady", "blitz"] as const) expect(opts, `${d.id} ${style}`).toContain(bot[style]);
    }
  });

  it("every option of every dilemma resolves to valid numbers, also after its delayed risk", () => {
    const sectors: SectorId[] = ["saas", "consumer", "ecommerce", "deeptech", "fintech", "healthtech", "marketplace", "aiinfra"];
    let played = 0;
    for (const t of DILEMMAS) {
      for (const o of t.options) {
        // a sector where the dilemma can happen
        const sector = sectors.find((s) => {
          const g = grownGame(s, `DIL-${t.id}-${s}`);
          const c = g.companies[0];
          return t.weight({ company: c, state: g, netBurn: 20_000, runway: 3 }) > 0;
        });
        if (!sector) continue;
        const state = grownGame(sector, `DIL-${t.id}-${o.id}`);
        const c = state.companies[0];
        const ctx = { company: c, state, netBurn: 20_000, runway: 3 };
        const context = t.prepare ? t.prepare(ctx) : {};
        if (context === null) continue;
        const inst: DilemmaInstance = {
          id: `test-${t.id}`,
          templateId: t.id,
          round: state.round,
          title: t.title,
          description: fill(t.description, context),
          options: t.options.map((x) => ({ id: x.id, label: fill(x.label, context), description: fill(x.description, context) })),
          concept: t.concept,
          context,
          chosen: null,
          outcome: null,
        };
        expect(inst.description.it, `${t.id} placeholders`).not.toMatch(/\{[a-zA-Z]+\}/);
        c.dilemma = inst;
        resolveDilemma(state, c, o.id, state.round, createRng("dilemma-test", t.id, o.id), report(state, c.id));
        for (const p of c.pendingRisks) p.probability = 1;
        while (!state.finished && state.round <= inst.round + 3) advanceRound(state);
        for (const v of [c.cash, c.customers, c.mrr, c.valuation, c.morale, c.brand]) expect(Number.isFinite(v), `${t.id}/${o.id}`).toBe(true);
        expect(c.customers, `${t.id}/${o.id}`).toBeGreaterThanOrEqual(0);
        played++;
      }
    }
    expect(played).toBeGreaterThan(50);
  });
});
