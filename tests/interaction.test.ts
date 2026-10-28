import { describe, expect, it } from "vitest";
import {
  STATE_VERSION,
  activePartnerships,
  advanceRound,
  createGame,
  defaultConfig,
  draftFor,
  effectiveModifiers,
  normalizeState,
  startGame,
  strategyEffects,
  submitDecision,
} from "../src/core";
import type { CompanySetup, GameState, PitchResult, RoundReport } from "../src/core";
import { allocateDeals, type PitchCandidate } from "../src/core/engine/finance";
import { applyStrategySwitch } from "../src/core/engine/strategy";

function team(name: string, sector: CompanySetup["sector"] = "saas"): CompanySetup {
  return {
    name,
    productName: name,
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

function classGame(seed: string, sectors: CompanySetup["sector"][]): GameState {
  const state = createGame({ ...defaultConfig(), seed }, sectors.map((s, i) => team(`Team ${i + 1}`, s)), 0);
  startGame(state);
  return state;
}

function report(state: GameState, companyId: string): RoundReport {
  return { round: state.round, companyId, lines: [], pitchResults: [], hiringResults: [], eventIds: [], insights: [], decision: null };
}

function candidate(state: GameState, i: number, score: number, amount = 100_000): PitchCandidate {
  const c = state.companies[i];
  const result: PitchResult = { investorId: "angel_marta", investorName: "Marta Ferri", outcome: "closed", reason: { en: "", it: "" }, amount, valuation: 1_000_000, fairValuation: 1_000_000, checks: [] };
  return { c, report: report(state, c.id), assessment: { result, close: { investorId: "angel_marta", amount, valuation: 1_000_000, instrument: "safe" }, score }, order: i };
}

describe("investors with limited slots and capital", () => {
  it("back only the best pitches of the round and tell the others who won", () => {
    const state = classGame("SLOTS-1", ["saas", "saas", "fintech"]);
    const cash = state.companies.map((c) => c.cash);
    const ks = [candidate(state, 0, 0.5), candidate(state, 1, 0.9), candidate(state, 2, 0.7)];
    allocateDeals(state, ks, state.round);
    // angel_marta backs two startups per round: the two best scores
    expect(state.companies[1].cash - cash[1]).toBe(100_000);
    expect(state.companies[2].cash - cash[2]).toBe(100_000);
    expect(state.companies[0].cash).toBe(cash[0]);
    expect(ks[0].assessment.result.outcome).toBe("rejected");
    expect(ks[0].assessment.result.reason.en).toContain("Team 2");
    expect(ks[0].assessment.result.reason.en).toContain("Team 3");
    expect(state.investorBook.angel_marta.committed).toBe(200_000);
  });

  it("cannot invest more than the capital left", () => {
    const state = classGame("SLOTS-2", ["saas", "fintech"]);
    state.investorBook.angel_marta = { committed: 950_000, deals: [] };
    const k = candidate(state, 0, 0.9);
    const cash = state.companies[0].cash;
    allocateDeals(state, [k], state.round);
    expect(state.companies[0].cash).toBe(cash);
    expect(k.assessment.result.outcome).toBe("rejected");
    expect(k.assessment.result.reason.en).toContain("ask for less");
  });
});

describe("deals between teams", () => {
  it("an accepted acquisition offer moves the target into the buyer", () => {
    const state = classGame("ACQ-1", ["saas", "saas"]);
    const [a, b] = state.companies;
    a.cash = 3_000_000;
    const da = draftFor(state, a);
    da.acquisitionBid = { targetId: b.id, amount: 800_000 };
    submitDecision(state, a.id, da);
    advanceRound(state);

    const offer = b.acquisitionOffers.find((o) => o.kind === "team");
    expect(offer?.fromCompanyId).toBe(a.id);
    expect(offer?.value).toBe(800_000);

    const db = draftFor(state, b);
    db.acceptAcquisitionId = offer!.id;
    submitDecision(state, b.id, db);
    const people = b.team.length + a.team.length;
    const cashBefore = a.cash;
    const targetCash = b.cash;
    b.loans.push({ id: "test_loan", lenderId: "loan_bank", lenderName: "Bank", principal: 50_000, remaining: 50_000, annualRate: 0.075, monthlyPayment: 2_250, monthsLeft: 24, personalGuarantee: true, startRound: 1 });
    advanceRound(state);

    expect(b.status).toBe("exited");
    expect(b.exit?.kind).toBe("team");
    expect(b.exit?.value).toBe(800_000);
    expect(a.status).toBe("active");
    expect(a.team.length).toBeGreaterThanOrEqual(people);
    // the buyer pays the price and takes over the target's cash and debts
    expect(targetCash).toBeGreaterThan(0);
    expect(b.cash).toBe(0);
    expect(b.loans).toHaveLength(0);
    expect(a.loans.some((l) => l.id === "test_loan")).toBe(true);
    expect(cashBefore - a.cash).toBeGreaterThanOrEqual(800_000 - targetCash);
    expect(cashBefore - a.cash).toBeLessThan(800_000);
  });

  it("a bid larger than the buyer's cash is not sent", () => {
    const state = classGame("ACQ-2", ["saas", "fintech"]);
    const [a, b] = state.companies;
    const da = draftFor(state, a);
    da.acquisitionBid = { targetId: b.id, amount: a.cash * 10 };
    submitDecision(state, a.id, da);
    advanceRound(state);
    expect(b.acquisitionOffers.filter((o) => o.kind === "team")).toHaveLength(0);
  });

  it("a partnership needs the other team's answer and lowers CAC for both", () => {
    const state = classGame("PART-1", ["saas", "fintech"]);
    const [a, b] = state.companies;
    const da = draftFor(state, a);
    da.partnershipProposals = [b.id];
    submitDecision(state, a.id, da);
    advanceRound(state);
    expect(b.partnershipOffers).toHaveLength(1);
    expect(activePartnerships(a, state.round)).toHaveLength(0);

    const cacBefore = effectiveModifiers(state, a, a.sector, state.round).cac;
    const db = draftFor(state, b);
    db.acceptPartnershipIds = [b.partnershipOffers[0].id];
    submitDecision(state, b.id, db);
    advanceRound(state);

    for (const c of [a, b]) expect(activePartnerships(c, state.round)).toHaveLength(1);
    expect(effectiveModifiers(state, a, a.sector, state.round).cac).toBeLessThan(cacBefore);
    // three rounds, then it ends
    expect(activePartnerships(a, state.round + 2)).toHaveLength(0);
  });
});

describe("product strategy", () => {
  it("a niche reaches a smaller market but learns faster and pays less for customers", () => {
    const state = classGame("SEG-1", ["saas"]);
    const c = state.companies[0];
    const broad = strategyEffects(c);
    const niche = strategyEffects({ ...c, segment: "niche" });
    expect(niche.tam).toBeLessThan(broad.tam);
    expect(niche.pmfLearn).toBeGreaterThan(broad.pmfLearn);
    expect(niche.mods.cac!).toBeLessThan(broad.mods.cac!);
    const freemium = strategyEffects({ ...c, pricingModel: "freemium" });
    expect(freemium.mods.organic!).toBeGreaterThan(1);
    expect(freemium.mods.wtp!).toBeLessThan(1);
  });

  it("changing target after launch costs customers, before launch it is free", () => {
    const state = classGame("SEG-2", ["saas"]);
    const c = state.companies[0];
    const d = draftFor(state, c);
    d.targetSegment = "niche";
    applyStrategySwitch(c, d, null);
    expect(c.segment).toBe("niche");
    expect(c.customers).toBe(0);

    c.product.launched = true;
    c.customers = 1_000;
    d.targetSegment = "premium";
    d.pricingModel = "usage";
    const lost = applyStrategySwitch(c, d, null);
    expect(lost).toBeCloseTo(1_000 - 1_000 * 0.88 * 0.95, 6);
    expect(c.segment).toBe("premium");
    expect(c.pricingModel).toBe("usage");
  });
});

describe("rivals outside the game", () => {
  it("are deterministic for a seed and announce their moves as sector news", () => {
    const play = () => {
      const state = classGame("RIV-1", ["saas", "consumer", "fintech"]);
      while (!state.finished) advanceRound(state);
      return state;
    };
    const a = play();
    const b = play();
    const moves = (s: GameState) => s.events.filter((e) => e.templateId.startsWith("rival_")).map((e) => `${e.round}:${e.templateId}:${e.sectors?.join()}`);
    expect(moves(a)).toEqual(moves(b));
    expect(moves(a).length).toBeGreaterThan(0);
    for (const e of a.events.filter((x) => x.templateId.startsWith("rival_"))) expect(["saas", "consumer", "fintech"]).toContain(e.sectors![0]);
    expect(a.markets.saas.rivals.length).toBeGreaterThanOrEqual(2);
  });
});

describe("saved games", () => {
  it("a game saved before these mechanics is migrated and keeps playing", () => {
    const state = classGame("MIG-1", ["saas", "fintech"]);
    advanceRound(state);
    const old = JSON.parse(JSON.stringify(state));
    old.version = 2;
    delete old.investorBook;
    for (const m of Object.values(old.markets) as Array<Record<string, unknown>>) delete m.rivals;
    for (const c of old.companies) {
      delete c.segment;
      delete c.pricingModel;
      delete c.partnerships;
      delete c.partnershipOffers;
      for (const d of [c.decision, c.lastDecision]) {
        if (!d) continue;
        delete d.targetSegment;
        delete d.pricingModel;
        delete d.partnershipProposals;
        delete d.acceptPartnershipIds;
        delete d.acquisitionBid;
      }
    }
    const migrated = normalizeState(old as GameState);
    expect(migrated.version).toBe(STATE_VERSION);
    expect(migrated.companies[0].segment).toBe("broad");
    expect(migrated.markets.saas.rivals.length).toBe(2);
    while (!migrated.finished) advanceRound(migrated);
    expect(migrated.finished).toBe(true);
  });
});
