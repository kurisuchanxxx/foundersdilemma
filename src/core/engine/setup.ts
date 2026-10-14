import { ARCHETYPE_IDS } from "../data/founders";
import { SECTORS, SECTOR_IDS } from "../data/sectors";
import { createRng, randomSeedLabel, type Rng } from "../rng";
import type { BotStyle, Company, CompanySetup, GameConfig, GameState, SectorId, SectorMarketState } from "../types";
import { createCapTable } from "./captable";
import { defaultDecision } from "./decision";
import { initialCandidates } from "./hiring";
import { pmfScore } from "./product";
import { nextId } from "./util";
import { updateValuation } from "./valuation";

export const STATE_VERSION = 2;

export function defaultConfig(): GameConfig {
  return {
    seed: randomSeedLabel(),
    sessionName: "",
    mode: "solo",
    totalRounds: 10,
    periodPlan: "startup",
    difficulty: "standard",
    scoring: "founderWealth",
    complexity: "standard",
    turnTimerMinutes: null,
    currency: "EUR",
    instructorPin: null,
  };
}

export const LOGOS = [
  "Rocket", "Zap", "Flame", "Sparkles", "Atom", "Box", "Hexagon", "Cpu", "Radio", "ShoppingCart",
  "Briefcase", "CreditCard", "Coins", "LineChart", "BarChart3", "Building2", "Landmark", "MessagesSquare",
  "MessageCircle", "Phone", "Video", "Mic", "Megaphone", "Heart", "Stethoscope", "Dna", "Car", "Plane",
  "Bike", "Package", "Leaf", "Sun", "Moon", "Star", "Globe", "Compass", "Feather", "Gem", "Puzzle", "Bot",
];

/** Validated categorical palette (see dataviz palette): identity colors for companies. */
export const COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767", "#5e5ce6", "#64748b"];

const BOT_NAMES: Record<SectorId, Array<[string, string]>> = {
  saas: [["Brightloop", "LoopDesk"], ["Tessera Labs", "Tessera CRM"], ["Kairos Software", "Kairos HR"]],
  consumer: [["Quokka", "Quokka Habits"], ["Lumina", "Lumina Journal"], ["Picnic Social", "Picnic"]],
  ecommerce: [["Ortica", "Ortica Skincare"], ["Vespa Goods", "Vespa Bags"], ["Nido Home", "Nido"]],
  deeptech: [["Ferrovia Robotics", "RailBot"], ["Siderea", "Siderea Sensors"], ["Gaia Materials", "GaiaFoam"]],
  fintech: [["Vela Pay", "Vela Wallet"], ["Soldo Facile", "Salvadanaio"], ["Ledgerly", "Ledgerly Card"]],
  healthtech: [["Polaris Health", "Polaris Clinic"], ["Medivia", "Medivia Triage"], ["CuraLink", "CuraLink"]],
  marketplace: [["Bottega", "Bottega Market"], ["Passaporto", "Passaporto Travel"], ["TaskPal", "TaskPal"]],
  aiinfra: [["Nebula Labs", "Nebula API"], ["Gradiente", "Gradiente MLOps"], ["Synapse Cloud", "Synapse Eval"]],
};

const BOT_FOUNDERS = ["Alex Rivera", "Sam Okafor", "Giulia Neri", "Leo Brandt", "Maya Chen", "Pietro Sala", "Nora Lind", "Ravi Patel", "Ines Moreau", "Tomás Vidal"];

export function botSetups(count: number, taken: CompanySetup[], rng: Rng): CompanySetup[] {
  const out: CompanySetup[] = [];
  const styles: BotStyle[] = ["steady", "lean", "blitz"];
  const usedNames = new Set(taken.map((t) => t.name));
  for (let i = 0; i < count; i++) {
    const sector = rng.pick(SECTOR_IDS);
    const options = BOT_NAMES[sector].filter(([n]) => !usedNames.has(n));
    const [name, productName] = options.length > 0 ? rng.pick(options) : [`Bot ${i + 1}`, `Product ${i + 1}`];
    usedNames.add(name);
    const a1 = rng.pick(ARCHETYPE_IDS);
    const solo = rng.chance(0.35);
    const a2 = rng.pick(ARCHETYPE_IDS.filter((a) => a !== a1));
    out.push({
      name,
      productName,
      sector,
      logo: rng.pick(LOGOS),
      color: COLORS[(taken.length + i) % COLORS.length],
      riskProfile: rng.pick(["low", "medium", "medium", "high"] as const),
      founders: solo ? [{ name: rng.pick(BOT_FOUNDERS), archetype: a1 }] : [{ name: BOT_FOUNDERS[(i * 2) % BOT_FOUNDERS.length], archetype: a1 }, { name: BOT_FOUNDERS[(i * 2 + 1) % BOT_FOUNDERS.length], archetype: a2 }],
      equitySplit: 0.5,
      founderVesting: rng.chance(0.7),
      teamMembers: [],
      isBot: true,
      botStyle: styles[i % styles.length],
    });
  }
  return out;
}

function createCompany(state: GameState, setup: CompanySetup): Company {
  const s = SECTORS[setup.sector];
  const founders = setup.founders.slice(0, 2);
  const shares = founders.length === 2 ? [setup.equitySplit, 1 - setup.equitySplit] : [1];
  const { capTable, holderIds } = createCapTable(
    state,
    founders.map((f, i) => ({ name: f.name || `Founder ${i + 1}`, share: shares[i] })),
    setup.founderVesting,
  );
  const c: Company = {
    id: nextId(state, "co"),
    name: setup.name.trim() || "Startup",
    productName: setup.productName.trim() || setup.name.trim() || "Product",
    sector: setup.sector,
    logo: setup.logo,
    color: setup.color,
    riskProfile: setup.riskProfile,
    isBot: setup.isBot,
    botStyle: setup.isBot ? setup.botStyle ?? "steady" : null,
    teamMembers: setup.teamMembers.filter((m) => m.trim().length > 0),
    founders: founders.map((f, i) => ({ id: nextId(state, "f"), name: f.name || `Founder ${i + 1}`, archetype: f.archetype, active: true, holderId: holderIds[i], leftRound: null })),
    founderVesting: setup.founderVesting,
    status: "active",
    exit: null,
    bankruptRound: null,
    bankruptReason: null,
    cash: s.startingCash,
    loans: [],
    safes: [],
    capTable,
    fundingHistory: [],
    board: { founders: founders.length, investors: 0, independents: 0 },
    lastPostMoney: null,
    lastPricedRound: null,
    totalRaised: 0,
    rescues: 0,
    product: { mvpProgress: 0, launched: false, launchRound: null, quality: 0.3, techDebt: 0, bugs: 0 },
    pmf: { problemClarity: 0.2, solutionFit: 0.1, marketPull: 0.15, learningVelocity: 0.3, score: 0 },
    fitPotential: 1,
    customers: 0,
    waitlist: 0,
    price: 0,
    mrr: 0,
    churn: s.baseChurn,
    cac: s.baseCac,
    ltv: 0,
    nps: 0,
    brand: 0.02,
    reputation: { investors: 30, media: 20, talent: 40, customers: 35 },
    team: [],
    morale: 0.8,
    founderStress: 0.3,
    stressStreak: 0,
    burnoutMonthsLeft: 0,
    modifiers: [],
    decision: null,
    submitted: false,
    lastDecision: null,
    dilemma: null,
    dilemmaHistory: [],
    termSheets: [],
    counterOffers: [],
    acquisitionOffers: [],
    pendingGrants: [],
    pendingRisks: [],
    valuation: 0,
    valuationBreakdown: null,
    history: [],
    monthly: [],
    achievements: [],
    flags: {
      wasLowRunway: false,
      pivoted: false,
      pivotRound: null,
      acceleratorUsed: false,
      crowdfundingUsed: false,
      grantsUsed: [],
      officeMode: null,
      openSource: false,
      initialCac: null,
      seniorHires: 0,
      everRaisedEquity: false,
      ceoReplaced: false,
      salaryCutUntil: null,
      salaryCutPct: 0,
    },
  };
  c.fitPotential = Math.round(createRng(state.config.seed, "fit", c.id).range(0.72, 1.08) * 100) / 100;
  c.price = defaultDecision(c).price;
  c.pmf.score = pmfScore(c, s.baseChurn);
  return c;
}

/**
 * Creates a new game. Human teams come first, then bots fill the remaining seats.
 */
export function createGame(config: GameConfig, setups: CompanySetup[], botCount = 0): GameState {
  const seed = config.seed.trim() || randomSeedLabel();
  const cfg: GameConfig = { ...config, seed, totalRounds: Math.max(4, Math.min(16, Math.round(config.totalRounds))) };
  const rng = createRng(seed, "setup");
  const markets = {} as Record<SectorId, SectorMarketState>;
  for (const id of SECTOR_IDS) markets[id] = { npcCompetitors: SECTORS[id].npcCompetitors, hype: 1 };
  const state: GameState = {
    version: STATE_VERSION,
    id: `game_${seed}_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    config: cfg,
    round: 1,
    month: 0,
    finished: false,
    companies: [],
    markets,
    globalModifiers: [],
    outlook: [],
    events: [],
    candidates: [],
    candidateSeq: 0,
    usedCandidateIds: [],
    reports: [],
    firsts: { pmf: null, profitable: null },
    idSeq: 0,
  };
  const all = [...setups, ...botSetups(botCount, setups, rng)];
  for (const s of all) state.companies.push(createCompany(state, s));
  for (const c of state.companies) updateValuation(state, c, 1);
  state.candidates = initialCandidates(state, rng);
  return state;
}
