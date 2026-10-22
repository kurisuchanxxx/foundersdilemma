import { describe, expect, it } from "vitest";
import {
  advanceRound,
  createGame,
  defaultConfig,
  foundersOwnership,
  historyCsv,
  previewDecision,
  draftFor,
  standings,
  startGame,
  submitDecision,
  waterfall,
  totalShares,
  estimateWtp,
  SECTORS,
} from "../src/core";
import type { CompanySetup, GameState } from "../src/core";
import { createRng } from "../src/core/rng";
import { applyEquityRound, createCapTable, departHolder, grantOptions, vestedShares } from "../src/core/engine/captable";
import { botDecision } from "../src/core/engine/bots";
import { priceConversion } from "../src/core/engine/market";

function human(name = "Team Alpha", sector: CompanySetup["sector"] = "saas"): CompanySetup {
  return {
    name,
    productName: "Alpha",
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
    teamMembers: ["Student 1", "Student 2"],
    isBot: false,
  };
}

function newGame(seed = "TEST-1", bots = 3): GameState {
  const state = createGame({ ...defaultConfig(), seed }, [human()], bots);
  startGame(state);
  return state;
}

function playToEnd(state: GameState): void {
  let guard = 0;
  while (!state.finished && guard++ < 40) advanceRound(state);
}

describe("rng", () => {
  it("is deterministic for the same parts", () => {
    const a = createRng("seed", 1, "x");
    const b = createRng("seed", 1, "x");
    const xs = Array.from({ length: 10 }, () => a.next());
    const ys = Array.from({ length: 10 }, () => b.next());
    expect(xs).toEqual(ys);
    expect(xs.every((v) => v >= 0 && v < 1)).toBe(true);
  });
  it("differs across streams", () => {
    expect(createRng("seed", 1).next()).not.toEqual(createRng("seed", 2).next());
  });
});

describe("cap table", () => {
  it("prices an equity round with option pool shuffle", () => {
    const state = newGame();
    const c = state.companies[0];
    expect(foundersOwnership(c)).toBeCloseTo(1, 5);
    const res = applyEquityRound(state, c, {
      investorId: "x",
      investorName: "VC",
      amount: 1_000_000,
      preMoney: 4_000_000,
      poolTarget: 0.1,
      liquidationPref: 1,
      kind: "investor",
      roundLabel: "Seed",
    });
    expect(res.investorPct).toBeCloseTo(0.2, 3);
    const pool = c.capTable.holders.find((h) => h.kind === "pool")!;
    expect(pool.shares / totalShares(c.capTable)).toBeCloseTo(0.1, 3);
    // founders bear the pool: 100% - 20% - 10%
    expect(foundersOwnership(c)).toBeCloseTo(0.7, 3);
  });

  it("converts SAFEs at the cap in the next priced round", () => {
    const state = newGame();
    const c = state.companies[0];
    c.safes.push({ id: "s1", investorId: "a", investorName: "Angel", amount: 100_000, cap: 1_000_000, round: 1 });
    applyEquityRound(state, c, { investorId: "x", investorName: "VC", amount: 1_000_000, preMoney: 4_000_000, poolTarget: 0, liquidationPref: 1, kind: "investor", roundLabel: "Seed" });
    const angel = c.capTable.holders.find((h) => h.name === "Angel")!;
    // 10% before the round, diluted by 20% -> 8%
    expect(angel.shares / totalShares(c.capTable)).toBeCloseTo(0.08, 3);
    expect(c.safes.length).toBe(0);
  });

  it("vests with a cliff and returns unvested options to the pool", () => {
    const state = newGame();
    const c = state.companies[0];
    const id = grantOptions(state, c, "Emp", 0.02, 0)!;
    const h = c.capTable.holders.find((x) => x.id === id)!;
    expect(vestedShares(h, 6)).toBe(0);
    expect(vestedShares(h, 24)).toBeCloseTo(h.shares / 2, -1);
    const before = totalShares(c.capTable);
    departHolder(c, id, 6);
    expect(totalShares(c.capTable)).toBe(before);
    expect(c.capTable.holders.find((x) => x.kind === "pool")!.shares).toBeGreaterThan(0);
  });

  it("founder vesting: a departing founder forfeits unvested shares", () => {
    const state = createGame({ ...defaultConfig(), seed: "V" }, [], 0);
    const { capTable, holderIds } = createCapTable(state, [{ name: "A", share: 0.5 }, { name: "B", share: 0.5 }], true);
    const fake = { capTable } as unknown as Parameters<typeof departHolder>[0];
    const forfeited = departHolder(fake, holderIds[1], 6);
    expect(forfeited).toBe(5_000_000);
  });
});

describe("liquidation waterfall", () => {
  it("pays 1x preference before common in a small exit", () => {
    const state = newGame();
    const c = state.companies[0];
    applyEquityRound(state, c, { investorId: "x", investorName: "VC", amount: 2_000_000, preMoney: 8_000_000, poolTarget: 0, liquidationPref: 1, kind: "investor", roundLabel: "A" });
    const small = waterfall(c, 3_000_000);
    const vc = small.find((p) => p.name === "VC")!;
    expect(vc.amount).toBeCloseTo(2_000_000, -2);
    const total = small.reduce((s, p) => s + p.amount, 0);
    expect(total).toBeCloseTo(3_000_000, -2);
  });
  it("converts to common in a large exit", () => {
    const state = newGame();
    const c = state.companies[0];
    applyEquityRound(state, c, { investorId: "x", investorName: "VC", amount: 2_000_000, preMoney: 8_000_000, poolTarget: 0, liquidationPref: 1, kind: "investor", roundLabel: "A" });
    const big = waterfall(c, 100_000_000);
    const vc = big.find((p) => p.name === "VC")!;
    expect(vc.amount).toBeCloseTo(20_000_000, -3);
  });
});

describe("simulation", () => {
  it("is deterministic for the same seed and decisions", () => {
    const a = newGame("DET-42");
    const b = newGame("DET-42");
    playToEnd(a);
    playToEnd(b);
    expect(a.companies.map((c) => Math.round(c.cash))).toEqual(b.companies.map((c) => Math.round(c.cash)));
    expect(a.companies.map((c) => Math.round(c.valuation))).toEqual(b.companies.map((c) => Math.round(c.valuation)));
  });

  it("one team's decisions do not change another team's random events", () => {
    const a = newGame("IND-7");
    const b = newGame("IND-7");
    const ha = a.companies[0];
    const d = draftFor(a, ha);
    d.marketingBudget = 50_000;
    submitDecision(a, ha.id, d);
    advanceRound(a);
    advanceRound(b);
    const evA = a.events.filter((e) => e.companyId === a.companies[2].id).map((e) => e.templateId);
    const evB = b.events.filter((e) => e.companyId === b.companies[2].id).map((e) => e.templateId);
    expect(evA).toEqual(evB);
  });

  it("plays a full game with no invalid numbers", () => {
    for (const seed of ["FULL-1", "FULL-2", "FULL-3"]) {
      const state = newGame(seed, 5);
      playToEnd(state);
      expect(state.finished).toBe(true);
      for (const c of state.companies) {
        for (const h of c.history) {
          for (const [k, v] of Object.entries(h)) {
            expect(Number.isFinite(v as number), `${seed} ${c.name} R${h.round} ${k}`).toBe(true);
          }
        }
        expect(c.customers).toBeGreaterThanOrEqual(0);
        expect(foundersOwnership(c)).toBeGreaterThanOrEqual(0);
        expect(foundersOwnership(c)).toBeLessThanOrEqual(1);
      }
      const st = standings(state);
      expect(st.length).toBe(state.companies.length);
      expect(historyCsv(state).split("\n").length).toBeGreaterThan(state.companies.length);
    }
  });

  it("preview does not mutate the state and is consistent with burn", () => {
    const state = newGame("PREV-1");
    const c = state.companies[0];
    const before = JSON.stringify(state);
    const d = draftFor(state, c);
    d.rdBudget = 10_000;
    const p = previewDecision(state, c.id, d)!;
    expect(JSON.stringify(state)).toBe(before);
    expect(p.cashEnd).toBeLessThan(c.cash);
    expect(p.runway).toBeGreaterThan(0);
  });

  it("launches and acquires customers with a reasonable strategy", () => {
    const state = newGame("STRAT-1", 2);
    const c = state.companies[0];
    for (let r = 0; r < 6; r++) {
      const d = draftFor(state, c);
      d.rdBudget = 6_000;
      d.marketingBudget = c.product.launched ? 8_000 : 1_000;
      d.discovery = "deep";
      d.launchNow = c.product.mvpProgress > 0.7;
      submitDecision(state, c.id, d);
      advanceRound(state);
    }
    expect(c.product.launched).toBe(true);
    expect(c.customers).toBeGreaterThan(0);
  });
});

describe("pricing", () => {
  it("has a revenue-maximising price near the willingness to pay, even for inelastic sectors", () => {
    for (const elasticity of [0.36, 0.6, 0.9, 1.4]) {
      const revenue = (r: number) => r * priceConversion(100, 100 * r, elasticity);
      let best = 0.2;
      for (let r = 0.2; r <= 10; r += 0.01) if (revenue(r) > revenue(best)) best = r;
      expect(best).toBeLessThan(1.5);
      expect(revenue(3)).toBeLessThan(revenue(1) * 0.5);
      expect(revenue(10)).toBeLessThan(revenue(1) * 0.2);
    }
  });

  it("does not reward the maximum price over pricing at the willingness to pay", () => {
    for (const sector of ["saas", "deeptech", "aiinfra", "healthtech"] as const) {
      const wealth = (priceAt: "wtp" | "max") => {
        const state = createGame({ ...defaultConfig(), seed: `PRICE-${sector}` }, [human("Pricer", sector)], 2);
        startGame(state);
        const c = state.companies[0];
        while (!state.finished && c.status === "active") {
          // a sensible plan (the steady bot's), only the price changes
          c.botStyle = "steady";
          const d = botDecision(state, c, createRng("PRICE", state.round));
          c.botStyle = undefined;
          d.price = priceAt === "max" ? SECTORS[sector].priceMax : estimateWtp(state, c);
          submitDecision(state, c.id, d);
          advanceRound(state);
        }
        playToEnd(state);
        return standings(state).find((s) => s.companyId === c.id)!.founderWealth;
      };
      expect(wealth("max")).toBeLessThan(wealth("wtp"));
    }
  });
});
