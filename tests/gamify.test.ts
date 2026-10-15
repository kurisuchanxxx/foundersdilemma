import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_XP,
  LEVEL_THRESHOLDS,
  LOGO_TEMPLATES,
  MAX_INTERACTIONS,
  SHOWDOWN_XP,
  advanceRound,
  avatarFromSeed,
  createGame,
  defaultConfig,
  draftFor,
  founderShares,
  initials,
  levelFor,
  normalizeState,
  sanitizeInteractions,
  sanitizeLayer,
  sanitizeLogoArt,
  sanitizeTraits,
  startGame,
  submitDecision,
  totalShares,
  xpGainedInRound,
} from "../src/core";
import type { CompanySetup, GameState } from "../src/core";
import { createRng } from "../src/core/rng";
import { botInteractions } from "../src/core/engine/bots";

function human(overrides: Partial<CompanySetup> = {}): CompanySetup {
  return {
    name: "Team Alpha",
    productName: "Alpha",
    sector: "saas",
    logo: "Rocket",
    color: "#0A84FF",
    riskProfile: "medium",
    founders: [
      { name: "Ada", archetype: "hacker", avatar: { kind: "traits", traits: { bg: 1, skin: 2, hair: 3, hairColor: 4, eyes: 1, mouth: 2, accessory: 0 } } },
      { name: "Bruno", archetype: "hustler" },
    ],
    equitySplit: 0.6,
    founderVesting: true,
    teamMembers: [],
    isBot: false,
    ...overrides,
  };
}

function newGame(seed = "GAMIFY-1", setup = human(), bots = 3): GameState {
  const state = createGame({ ...defaultConfig(), seed }, [setup], bots);
  startGame(state);
  return state;
}

describe("founders and branding at setup", () => {
  it("supports teams of up to four founders with equal shares", () => {
    const four = human({
      founders: [
        { name: "A", archetype: "hacker" },
        { name: "B", archetype: "hustler" },
        { name: "C", archetype: "designer" },
        { name: "D", archetype: "operator" },
        { name: "E", archetype: "analyst" },
      ],
    });
    expect(founderShares(four)).toHaveLength(4);
    const state = newGame("FOUR", four);
    const c = state.companies[0];
    expect(c.founders).toHaveLength(4);
    const founderHolders = c.capTable.holders.filter((h) => h.kind === "founder");
    expect(founderHolders).toHaveLength(4);
    for (const h of founderHolders) expect(h.shares / totalShares(c.capTable)).toBeCloseTo(0.25, 5);
    expect(c.founders.every((f) => f.avatar === null)).toBe(true);
  });

  it("honours explicit equity shares and the two-founder split", () => {
    expect(founderShares({ founders: [{ name: "A", archetype: "hacker" }, { name: "B", archetype: "hustler" }], equitySplit: 0.6 })).toEqual([0.6, 0.4]);
    const shares = founderShares({ founders: [{ name: "A", archetype: "hacker" }, { name: "B", archetype: "hustler" }, { name: "C", archetype: "designer" }], equitySplit: 0.5, equityShares: [2, 1, 1] });
    expect(shares).toEqual([0.5, 0.25, 0.25]);
  });

  it("keeps avatars and logo art, dropping invalid ones", () => {
    const state = newGame("ART", human({ logoArt: { kind: "template", template: "orbit" } }));
    const c = state.companies[0];
    expect(c.logoArt).toEqual({ kind: "template", template: "orbit" });
    expect(c.founders[0].avatar?.kind).toBe("traits");
    expect(c.founders[1].avatar).toBeNull();
    expect(sanitizeLogoArt({ kind: "template", template: "nope" })).toBeNull();
    expect(sanitizeLogoArt({ kind: "image", data: "not-an-image" })).toBeNull();
    expect(sanitizeLogoArt({ kind: "image", data: "data:image/png;base64,AAAA" })).toEqual({ kind: "image", data: "data:image/png;base64,AAAA" });
    const composed = sanitizeLogoArt({ kind: "composed", layers: [{ shape: "star", color: "#ff0000", size: 500, x: 0, y: 0, rotation: 0, opacity: 3 }] });
    expect(composed?.kind).toBe("composed");
    if (composed?.kind === "composed") expect(composed.layers[0]).toEqual({ shape: "star", color: "#ff0000", size: 120, x: 0, y: 0, rotation: 0, opacity: 1 });
    expect(sanitizeLayer({ shape: "unknown" as never, color: "red" }).shape).toBe("circle");
  });

  it("generates deterministic avatars in range", () => {
    const a = avatarFromSeed("Giulia Neri");
    expect(a).toEqual(avatarFromSeed("Giulia Neri"));
    expect(a).not.toEqual(avatarFromSeed("Pietro Sala"));
    const fixed = sanitizeTraits({ bg: 99, skin: -1, hair: 2.7 }, "x");
    expect(fixed.bg).toBeLessThan(12);
    expect(fixed.skin).toBe(0);
    expect(fixed.hair).toBe(2);
    expect(initials("Aurora Labs")).toBe("AL");
    expect(initials("Cometa")).toBe("CO");
    for (const t of LOGO_TEMPLATES) expect(t.layers.map(sanitizeLayer)).toEqual(t.layers);
  });

  it("bots get avatars and sometimes a logo mark", () => {
    const state = newGame("BOTS", human(), 6);
    const bots = state.companies.filter((c) => c.isBot);
    expect(bots.every((b) => b.founders.every((f) => f.avatar?.kind === "traits"))).toBe(true);
    expect(bots.some((b) => b.logoArt?.kind === "template")).toBe(true);
  });
});

describe("levels and XP", () => {
  it("maps XP to levels and progress", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, levelStart: 0, nextAt: 100, progress: 0 });
    expect(levelFor(150)).toMatchObject({ level: 2, levelStart: 100, nextAt: 250 });
    expect(levelFor(150).progress).toBeCloseTo(50 / 150, 5);
    expect(levelFor(LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 500)).toMatchObject({ level: LEVEL_THRESHOLDS.length, nextAt: null, progress: 1 });
    expect(levelFor(-20).level).toBe(1);
  });
});

describe("round challenges and showdowns", () => {
  it("proposes three challenges per round, scores them and awards XP", () => {
    const state = newGame();
    expect(state.challenges).toHaveLength(3);
    expect(state.challenges.every((c) => c.round === 1)).toBe(true);
    expect(new Set(state.challenges.map((c) => c.tier))).toEqual(new Set(["easy", "medium", "hard"]));
    const first = state.challenges.map((c) => c.id);
    const c = state.companies[0];
    const d = draftFor(state, c);
    d.discovery = "deep";
    d.devApproach = "quality";
    d.reputationAction = "community";
    d.pitches = [{ investorId: "angel_1", amount: 100_000, valuation: 1_000_000, instrument: "equity" }];
    submitDecision(state, c.id, d);
    advanceRound(state);
    expect(state.round).toBe(2);
    expect(state.challenges).toHaveLength(3);
    expect(state.challenges.map((x) => x.id)).not.toEqual(first);
    for (const co of state.companies) {
      expect(co.challengeLog.filter((o) => o.round === 1)).toHaveLength(3);
      const earned = co.challengeLog.filter((o) => o.completed).reduce((s, o) => s + o.xp, 0);
      const logged = co.xpLog.filter((e) => e.source === "challenge").reduce((s, e) => s + e.amount, 0);
      expect(logged).toBe(earned);
      const total = co.xpLog.reduce((s, e) => s + e.amount, 0);
      expect(co.xp).toBe(total);
      for (const o of co.challengeLog) {
        expect(o.progress).toBeGreaterThanOrEqual(0);
        expect(o.progress).toBeLessThanOrEqual(1);
        if (o.completed) expect(o.applicable).toBe(true);
      }
    }
    const report = state.reports.find((r) => r.companyId === c.id && r.round === 1)!;
    expect(report.lines.some((l) => /Challenges|Sfide/.test(l.text.en + l.text.it))).toBe(true);
  });

  it("is deterministic for the same seed", () => {
    const a = newGame("DET");
    const b = newGame("DET");
    expect(a.challenges.map((c) => `${c.kind}:${c.tier}`)).toEqual(b.challenges.map((c) => `${c.kind}:${c.tier}`));
    expect(a.showdowns[0].kind).toBe(b.showdowns[0].kind);
    expect(a.challenges.map((c) => c.kind)).not.toEqual(newGame("OTHER-SEED").challenges.map((c) => c.kind));
  });

  it("resolves a showdown every round with a cup for the winner", () => {
    const state = newGame("CUP");
    expect(state.showdowns).toHaveLength(1);
    expect(state.showdowns[0].resolved).toBe(false);
    advanceRound(state);
    const sd = state.showdowns[0];
    expect(sd.resolved).toBe(true);
    expect(sd.results.length).toBeGreaterThan(1);
    expect(sd.results.map((r) => r.rank)).toEqual(sd.results.map((_, i) => i + 1));
    const winner = state.companies.find((c) => c.id === sd.results[0].companyId)!;
    expect(winner.cups).toBe(1);
    expect(sd.results[0].xp).toBe(SHOWDOWN_XP[0]);
    expect(winner.xpLog.some((e) => e.source === "showdown" && e.amount === SHOWDOWN_XP[0])).toBe(true);
    expect(state.companies.reduce((s, c) => s + c.cups, 0)).toBe(1);
    expect(state.showdowns).toHaveLength(2);
    expect(state.showdowns[1].round).toBe(2);
    expect(state.showdowns[1].resolved).toBe(false);
  });

  it("awards streak bonuses and achievement XP", () => {
    const state = newGame("STREAK");
    const c = state.companies[0];
    let guard = 0;
    while (!state.finished && guard++ < 12) {
      const d = draftFor(state, c);
      d.discovery = "deep";
      d.devApproach = "quality";
      d.reputationAction = "community";
      submitDecision(state, c.id, d);
      advanceRound(state);
    }
    const streaks = c.xpLog.filter((e) => e.source === "streak");
    const completedRounds = new Set(c.challengeLog.filter((o) => o.completed).map((o) => o.round)).size;
    if (completedRounds >= 3) expect(streaks.length).toBeGreaterThan(0);
    for (const a of c.achievements) {
      expect(c.xpLog.some((e) => e.source === "achievement" && e.round === a.round && e.amount === ACHIEVEMENT_XP)).toBe(true);
    }
  });
});

describe("founder interactions", () => {
  it("validates requests: no self, no unknown targets, at most two", () => {
    const state = newGame("IX");
    const c = state.companies[0];
    const bots = state.companies.filter((x) => x.isBot);
    const reqs = sanitizeInteractions(state, c, [
      { kind: "shoutout", targetId: c.id, employeeId: null },
      { kind: "shoutout", targetId: "nope", employeeId: null },
      { kind: "poach", targetId: bots[0].id, employeeId: null },
      { kind: "shoutout", targetId: bots[0].id, employeeId: null },
      { kind: "taunt", targetId: bots[1].id, employeeId: null },
      { kind: "mentorship", targetId: bots[2].id, employeeId: null },
    ]);
    expect(reqs.length).toBeLessThanOrEqual(MAX_INTERACTIONS);
    expect(reqs.every((r) => r.targetId !== c.id && r.targetId !== "nope")).toBe(true);
    expect(reqs.some((r) => r.kind === "poach")).toBe(bots[0].team.length > 0);
  });

  it("a shout-out lifts both teams and the relationship", () => {
    const state = newGame("SHOUT");
    const c = state.companies[0];
    const bot = state.companies.find((x) => x.isBot)!;
    const d = draftFor(state, c);
    d.interactions = [{ kind: "shoutout", targetId: bot.id, employeeId: null }];
    submitDecision(state, c.id, d);
    advanceRound(state);
    const rec = state.interactions.find((i) => i.fromId === c.id && i.kind === "shoutout");
    expect(rec).toBeDefined();
    expect(rec!.toId).toBe(bot.id);
    expect(rec!.success).toBe(true);
    expect(c.xpLog.some((e) => e.source === "interaction" && e.amount === 15)).toBe(true);
    expect(bot.xpLog.some((e) => e.source === "interaction" && e.amount === 15)).toBe(true);
    expect(state.relations[[c.id, bot.id].sort().join("|")]).toBe(1);
    const report = state.reports.find((r) => r.companyId === c.id && r.round === 1)!;
    expect(report.lines.some((l) => l.text.en.includes("shout-out"))).toBe(true);
  });

  it("poaching moves an employee with a raise when it succeeds", () => {
    const state = newGame("POACH", human(), 5);
    const c = state.companies[0];
    let guard = 0;
    while (guard++ < 6 && !state.companies.some((x) => x.isBot && x.status === "active" && x.team.length > 0)) advanceRound(state);
    const target = state.companies.find((x) => x.isBot && x.status === "active" && x.team.length > 0);
    expect(target).toBeDefined();
    const emp = target!.team[0];
    const salary = emp.salary;
    const d = draftFor(state, c);
    d.interactions = [{ kind: "poach", targetId: target!.id, employeeId: emp.id }];
    submitDecision(state, c.id, d);
    const round = state.round;
    advanceRound(state);
    const rec = state.interactions.find((i) => i.fromId === c.id && i.kind === "poach" && i.round === round)!;
    expect(rec).toBeDefined();
    if (rec.success) {
      const moved = c.team.find((e) => e.id === emp.id);
      expect(moved).toBeDefined();
      expect(moved!.salary).toBe(Math.round(salary * 1.15));
      expect(target!.team.some((e) => e.id === emp.id)).toBe(false);
      expect(xpGainedInRound(c, round)).toBeGreaterThanOrEqual(60);
    } else {
      expect(target!.team.some((e) => e.id === emp.id) || !target!.team.length).toBe(true);
    }
  });

  it("bots join the network deterministically", () => {
    const state = newGame("BOTNET");
    advanceRound(state);
    const bot = state.companies.find((x) => x.isBot)!;
    const a = botInteractions(state, bot, createRng("s", 2, "x"));
    const b = botInteractions(state, bot, createRng("s", 2, "x"));
    expect(a).toEqual(b);
    for (const r of a) expect(r.targetId).not.toBe(bot.id);
  });
});

describe("older saves", () => {
  it("are normalised with the new fields", () => {
    const state = newGame("OLD");
    const raw = JSON.parse(JSON.stringify(state)) as GameState;
    delete (raw as Partial<GameState>).challenges;
    delete (raw as Partial<GameState>).showdowns;
    delete (raw as Partial<GameState>).relations;
    delete (raw as Partial<GameState>).interactions;
    for (const c of raw.companies) {
      const anyC = c as unknown as Record<string, unknown>;
      delete anyC.xp;
      delete anyC.cups;
      delete anyC.challengeLog;
      delete anyC.xpLog;
      delete anyC.logoArt;
      for (const f of c.founders) delete (f as unknown as Record<string, unknown>).avatar;
    }
    const fixed = normalizeState(raw);
    expect(fixed.challenges).toEqual([]);
    expect(fixed.showdowns).toEqual([]);
    expect(fixed.relations).toEqual({});
    for (const c of fixed.companies) {
      expect(c.xp).toBe(0);
      expect(c.cups).toBe(0);
      expect(c.challengeLog).toEqual([]);
      expect(c.logoArt).toBeNull();
      for (const f of c.founders) expect(f.avatar).toBeNull();
    }
    advanceRound(fixed);
    expect(fixed.round).toBe(2);
    expect(fixed.challenges).toHaveLength(3);
  });
});
