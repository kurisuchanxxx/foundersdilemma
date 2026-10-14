import type { LText } from "./text";

// ---------------------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------------------

export type SectorId =
  | "saas"
  | "consumer"
  | "ecommerce"
  | "deeptech"
  | "fintech"
  | "healthtech"
  | "marketplace"
  | "aiinfra";

export type Archetype = "hacker" | "hustler" | "designer" | "analyst" | "visionary" | "operator";
export type RiskProfile = "low" | "medium" | "high";
export type GtmChannel = "performance" | "brand" | "partnership" | "salesLed";
export type DevApproach = "rush" | "balanced" | "quality";
export type DiscoveryLevel = "none" | "light" | "deep";
export type TechDebtAction = "ship" | "maintain" | "paydown";
export type FounderHours = 40 | 50 | 60 | 80;
export type ReputationAction = "none" | "pr" | "conference" | "community";
export type BotStyle = "lean" | "steady" | "blitz";
/** Which customers the company targets inside its sector (Moore's beachhead vs the broad market). */
export type TargetSegment = "niche" | "broad" | "premium";
export type PricingModel = "subscription" | "freemium" | "usage";

export type Role =
  | "Engineer"
  | "Product"
  | "Designer"
  | "Growth"
  | "Sales"
  | "Ops"
  | "CustomerSuccess"
  | "Finance";
export type Seniority = "Junior" | "Mid" | "Senior" | "Staff" | "Principal";
export type StatKey = "eng" | "product" | "design" | "growth" | "sales" | "ops" | "cs";
export type Stats = Record<StatKey, number>;

export type GameMode = "solo" | "hotseat" | "classroom";
/** startup = 4 quarters, then semesters. */
export type PeriodPlan = "startup" | "semiannual" | "quarterly";
export type Difficulty = "forgiving" | "standard" | "hardcore";
export type ScoringMode = "founderWealth" | "valuation" | "balanced";
export type Complexity = "essential" | "standard" | "advanced";
export type Currency = "EUR" | "USD";

// ---------------------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------------------

export interface GameConfig {
  seed: string;
  sessionName: string;
  mode: GameMode;
  totalRounds: number;
  periodPlan: PeriodPlan;
  difficulty: Difficulty;
  scoring: ScoringMode;
  complexity: Complexity;
  /** Suggested decision time per round in minutes (null = no timer). */
  turnTimerMinutes: number | null;
  currency: Currency;
  /** Optional PIN that protects the instructor console in hot-seat/classroom games. */
  instructorPin: string | null;
}

export interface Features {
  dilemmas: boolean;
  hiringAuctions: boolean;
  techDebt: boolean;
  advancedFinance: boolean;
}

export interface FounderSetup {
  name: string;
  archetype: Archetype;
}

export interface CompanySetup {
  name: string;
  productName: string;
  sector: SectorId;
  logo: string;
  color: string;
  riskProfile: RiskProfile;
  founders: FounderSetup[];
  /** Share of founder equity that goes to the first founder (only with two founders). */
  equitySplit: number;
  founderVesting: boolean;
  teamMembers: string[];
  isBot: boolean;
  botStyle?: BotStyle;
}

// ---------------------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------------------

export type BonusEffect =
  | "productivityBoost"
  | "codeQuality"
  | "brandBuilding"
  | "cacReduction"
  | "avoidPitfalls"
  | "churnReduction"
  | "dealAcceleration"
  | "conversionBoost";

export interface HiddenBonus {
  trigger: string;
  effect: BonusEffect;
  magnitude: number;
  description: string;
  /** Sectors where the bonus applies at full strength (empty = everywhere). */
  sectors: SectorId[];
}

export interface CandidateCV {
  age: number;
  education: { university: string; degree: string; field: string; graduated: number };
  experiences: Array<{
    company: string;
    role: string;
    yearsWorked: number;
    description: string;
    isKeyExperience: boolean;
  }>;
  skills: Array<{ name: string; level: number }>;
  achievements: string[];
}

export interface CandidatePrefs {
  /** Candidate refuses startups with less runway than this (months). */
  minRunwayMonths: number;
  /** 0 = cash only, 1 = loves equity. */
  equityAppetite: number;
  /** 0 = wants a safe late-stage job, 1 = loves early stage risk. */
  riskTolerance: number;
  preferredSectors: SectorId[];
}

export interface Candidate {
  id: string;
  name: string;
  role: Role;
  seniority: Seniority;
  /** Annual salary the candidate expects (total cost to company). */
  askSalary: number;
  stats: Stats;
  perks: string[];
  riskTags: string[];
  cv: CandidateCV;
  hiddenBonuses: HiddenBonus[];
  prefs: CandidatePrefs;
  availableSinceRound: number;
  /** Candidate is holding a counter offer for a company until the given round. */
  heldFor: { companyId: string; untilRound: number } | null;
}

export interface Employee {
  id: string;
  candidateId: string;
  name: string;
  role: Role;
  seniority: Seniority;
  salary: number;
  equityPct: number;
  stats: Stats;
  perks: string[];
  riskTags: string[];
  hiddenBonuses: HiddenBonus[];
  cv: CandidateCV;
  hiredRound: number;
  /** Global month index in which the employee started. */
  startMonth: number;
  holderId: string | null;
  /** Individual morale offset relative to the company morale. */
  moraleOffset: number;
}

export interface Founder {
  id: string;
  name: string;
  archetype: Archetype;
  active: boolean;
  holderId: string;
  leftRound: number | null;
}

// ---------------------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------------------

export type HolderKind = "founder" | "employee" | "investor" | "pool" | "crowd";

export interface Vesting {
  total: number;
  startMonth: number;
  months: number;
  cliff: number;
}

export interface Holder {
  id: string;
  kind: HolderKind;
  name: string;
  shares: number;
  vesting: Vesting | null;
  /** Liquidation preference (amount invested x multiple) for preferred shareholders. */
  preference: number;
  investorId: string | null;
  roundLabel: string | null;
}

export interface CapTable {
  holders: Holder[];
}

export type InvestorType =
  | "angel"
  | "accelerator"
  | "seed"
  | "seriesA"
  | "growth"
  | "corporate"
  | "crowdfunding"
  | "grant"
  | "bank"
  | "ventureDebt";

export type Instrument = "equity" | "safe";

export interface Safe {
  id: string;
  investorId: string;
  investorName: string;
  amount: number;
  /** Post-money valuation cap. */
  cap: number;
  round: number;
}

export interface Loan {
  id: string;
  lenderId: string;
  lenderName: string;
  principal: number;
  remaining: number;
  annualRate: number;
  monthlyPayment: number;
  monthsLeft: number;
  personalGuarantee: boolean;
  startRound: number;
}

export interface FundingRecord {
  id: string;
  round: number;
  investorId: string;
  investorName: string;
  type: InvestorType;
  instrument: "equity" | "safe" | "grant" | "loan" | "crowd" | "rescue" | "conversion";
  amount: number;
  preMoney: number | null;
  postMoney: number | null;
  equityPct: number | null;
  boardSeat: boolean;
}

export interface Board {
  founders: number;
  investors: number;
  independents: number;
}

export interface Pitch {
  investorId: string;
  amount: number;
  /** Pre-money valuation for equity; post-money cap for SAFEs. */
  valuation: number;
  instrument: Instrument;
}

export interface TermSheet {
  id: string;
  investorId: string;
  investorName: string;
  amount: number;
  valuation: number;
  instrument: Instrument;
  validRound: number;
  boardSeat: boolean;
  poolTopUp: number;
  liquidationPref: number;
  note: LText;
}

export interface RequirementCheck {
  label: LText;
  met: boolean;
  hard: boolean;
}

export interface PitchResult {
  investorId: string;
  investorName: string;
  outcome: "closed" | "termSheet" | "rejected";
  reason: LText;
  amount: number;
  valuation: number;
  fairValuation: number;
  checks: RequirementCheck[];
}

// ---------------------------------------------------------------------------------------
// Product & market
// ---------------------------------------------------------------------------------------

export interface ProductState {
  mvpProgress: number;
  launched: boolean;
  launchRound: number | null;
  quality: number;
  techDebt: number;
  bugs: number;
}

export interface PmfState {
  problemClarity: number;
  solutionFit: number;
  marketPull: number;
  learningVelocity: number;
  /** 0-100 */
  score: number;
}

export interface Reputation {
  investors: number;
  media: number;
  talent: number;
  customers: number;
}

export interface ModifierEffects {
  cac?: number;
  churn?: number;
  wtp?: number;
  dev?: number;
  gm?: number;
  climate?: number;
  valuation?: number;
  organic?: number;
  compliance?: number;
  hiringBar?: number;
  salaryAsk?: number;
  debtRate?: number;
  morale?: number;
  stress?: number;
  sales?: number;
  demand?: number;
}

export interface Modifier {
  id: string;
  source: LText;
  /** First round in which the modifier is active (null = immediately). */
  fromRound: number | null;
  /** Last round (inclusive) in which the modifier is active. */
  untilRound: number;
  /** Only for global modifiers: restrict to these sectors. */
  sectors: SectorId[] | null;
  effects: ModifierEffects;
}

export interface EffectBundle {
  cash?: number;
  customersPct?: number;
  customersAdd?: number;
  techDebt?: number;
  quality?: number;
  bugs?: number;
  problemClarity?: number;
  solutionFit?: number;
  marketPull?: number;
  learningVelocity?: number;
  mvpProgress?: number;
  morale?: number;
  stress?: number;
  brand?: number;
  rep?: Partial<Reputation>;
  modifier?: { rounds: number; effects: ModifierEffects };
}

// ---------------------------------------------------------------------------------------
// Events & dilemmas
// ---------------------------------------------------------------------------------------

export type EventScope = "global" | "company" | "team" | "custom";
export type Impact = "positive" | "negative" | "neutral";

export interface GameEvent {
  id: string;
  round: number;
  scope: EventScope;
  companyId: string | null;
  sectors: SectorId[] | null;
  templateId: string;
  title: LText;
  description: LText;
  impact: Impact;
  concept: string | null;
}

export interface DilemmaOption {
  id: string;
  label: LText;
  description: LText;
}

export interface DilemmaInstance {
  id: string;
  templateId: string;
  round: number;
  title: LText;
  description: LText;
  options: DilemmaOption[];
  concept: string | null;
  context: Record<string, string | number>;
  chosen: string | null;
  outcome: LText | null;
}

export interface PendingRisk {
  id: string;
  round: number;
  probability: number;
  title: LText;
  description: LText;
  effects: EffectBundle;
  concept: string | null;
  /** When set and the risk materialises, this co-founder leaves the company. */
  cofounderId: string | null;
}

export interface CustomEventSpec {
  id: string;
  title: LText;
  description: LText;
  target: { kind: "all" } | { kind: "sector"; sector: SectorId } | { kind: "company"; companyId: string };
  impact: Impact;
  rounds: number;
  effects: ModifierEffects;
  cash: number;
}

// ---------------------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------------------

export interface HiringOffer {
  candidateId: string;
  salary: number;
  equityPct: number;
}

export interface CounterOffer {
  id: string;
  candidateId: string;
  candidateName: string;
  salary: number;
  equityPct: number;
  validRound: number;
  reason: LText;
}

export interface Decision {
  // Budgets (EUR per month)
  rdBudget: number;
  marketingBudget: number;
  opsBudget: number;
  /** Monthly price per customer (ARPA). */
  price: number;
  gtm: GtmChannel;
  // Product
  devApproach: DevApproach;
  discovery: DiscoveryLevel;
  techDebtAction: TechDebtAction;
  launchNow: boolean;
  // Founders & culture
  founderHours: FounderHours;
  vacation: boolean;
  reputationAction: ReputationAction;
  teamOffsite: boolean;
  // People
  offers: HiringOffer[];
  acceptCounterIds: string[];
  fires: string[];
  // Finance
  pitches: Pitch[];
  acceptTermSheetIds: string[];
  grantApplication: string | null;
  loanRequest: { lenderId: string; amount: number } | null;
  // Exit & dilemmas
  acceptAcquisitionId: string | null;
  dilemmaChoice: string | null;
  // Strategy
  targetSegment: TargetSegment;
  pricingModel: PricingModel;
  // Other teams
  /** Offer to buy another company (paid in cash if the target accepts next round). */
  acquisitionBid: { targetId: string; amount: number } | null;
  /** Companies the team proposes a partnership to (at most one per round). */
  partnershipProposals: string[];
  acceptPartnershipIds: string[];
}

// ---------------------------------------------------------------------------------------
// Results, history, exit
// ---------------------------------------------------------------------------------------

export interface AcquisitionOffer {
  id: string;
  acquirer: string;
  kind: "acquihire" | "strategic" | "financial" | "team";
  value: number;
  validRound: number;
  premium: number;
  /** Set when the bidder is another company of the game. */
  fromCompanyId?: string;
}

export interface PartnershipOffer {
  id: string;
  fromCompanyId: string;
  fromName: string;
  validRound: number;
}

export interface Partnership {
  id: string;
  partnerId: string;
  partnerName: string;
  startRound: number;
  untilRound: number;
  sameSector: boolean;
}

export interface Payout {
  holderId: string;
  name: string;
  kind: HolderKind;
  amount: number;
}

export interface ExitRecord {
  round: number;
  value: number;
  acquirer: string;
  kind: AcquisitionOffer["kind"];
  payouts: Payout[];
  founderPayout: number;
}

export interface ValuationBreakdown {
  arr: number;
  growthAnnual: number;
  multiple: number;
  growthAdj: number;
  marginAdj: number;
  pmfAdj: number;
  climate: number;
  revenueValue: number;
  scorecardValue: number;
  scorecardWeight: number;
  modelValue: number;
  anchor: number | null;
  netCash: number;
  total: number;
}

export interface Snapshot {
  round: number;
  month: number;
  cash: number;
  mrr: number;
  customers: number;
  newCustomers: number;
  churnedCustomers: number;
  churn: number;
  cac: number;
  ltv: number;
  price: number;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netBurn: number;
  runway: number;
  valuation: number;
  founderOwnership: number;
  pmf: number;
  quality: number;
  techDebt: number;
  mvpProgress: number;
  headcount: number;
  morale: number;
  stress: number;
  nps: number;
  reputation: number;
  brand: number;
  debt: number;
  marketingSpend: number;
  totalRaised: number;
}

export interface MonthPoint {
  month: number;
  cash: number;
  mrr: number;
  customers: number;
}

export interface Insight {
  severity: "good" | "info" | "warn" | "critical";
  text: LText;
  concept: string | null;
}

export interface ReportLine {
  kind: "info" | "good" | "bad" | "event" | "finance" | "team" | "product";
  text: LText;
}

export interface HiringResult {
  candidateId: string;
  candidateName: string;
  outcome: "hired" | "rejected" | "counter" | "lostToRival";
  reason: LText;
  salary: number;
  equityPct: number;
}

export interface RoundReport {
  round: number;
  companyId: string;
  lines: ReportLine[];
  pitchResults: PitchResult[];
  hiringResults: HiringResult[];
  eventIds: string[];
  insights: Insight[];
  /** The decision applied in this round (for debriefs and exports). */
  decision: Decision | null;
}

export interface Achievement {
  id: string;
  round: number;
}

export interface CompanyFlags {
  wasLowRunway: boolean;
  pivoted: boolean;
  pivotRound: number | null;
  acceleratorUsed: boolean;
  crowdfundingUsed: boolean;
  grantsUsed: string[];
  officeMode: "remote" | "office" | null;
  openSource: boolean;
  initialCac: number | null;
  seniorHires: number;
  everRaisedEquity: boolean;
  ceoReplaced: boolean;
  salaryCutUntil: number | null;
  salaryCutPct: number;
}

export interface PendingGrant {
  id: string;
  grantId: string;
  name: LText;
  amount: number;
  round: number;
}

export interface Company {
  id: string;
  name: string;
  productName: string;
  sector: SectorId;
  logo: string;
  color: string;
  riskProfile: RiskProfile;
  isBot: boolean;
  botStyle: BotStyle | null;
  teamMembers: string[];

  founders: Founder[];
  founderVesting: boolean;
  status: "active" | "exited" | "bankrupt";
  exit: ExitRecord | null;
  bankruptRound: number | null;
  bankruptReason: LText | null;

  // finance
  cash: number;
  loans: Loan[];
  safes: Safe[];
  capTable: CapTable;
  fundingHistory: FundingRecord[];
  board: Board;
  lastPostMoney: number | null;
  lastPricedRound: number | null;
  totalRaised: number;
  rescues: number;

  // product
  product: ProductState;
  pmf: PmfState;
  /** Hidden quality of the opportunity (0.7-1.1): some ideas simply fit the market better. */
  fitPotential: number;

  // market
  customers: number;
  waitlist: number;
  price: number;
  mrr: number;
  churn: number;
  cac: number;
  ltv: number;
  nps: number;
  brand: number;
  reputation: Reputation;

  // people
  team: Employee[];
  morale: number;
  founderStress: number;
  stressStreak: number;
  burnoutMonthsLeft: number;

  modifiers: Modifier[];

  // turn state
  decision: Decision | null;
  submitted: boolean;
  lastDecision: Decision | null;
  dilemma: DilemmaInstance | null;
  dilemmaHistory: DilemmaInstance[];
  termSheets: TermSheet[];
  counterOffers: CounterOffer[];
  acquisitionOffers: AcquisitionOffer[];
  partnershipOffers: PartnershipOffer[];
  partnerships: Partnership[];
  pendingGrants: PendingGrant[];
  pendingRisks: PendingRisk[];

  // derived & history
  valuation: number;
  valuationBreakdown: ValuationBreakdown | null;
  history: Snapshot[];
  monthly: MonthPoint[];
  achievements: Achievement[];
  flags: CompanyFlags;
  // strategy in force
  segment: TargetSegment;
  pricingModel: PricingModel;
}

export interface Rival {
  id: string;
  name: string;
  /** 0-1: how strong and aggressive the competitor is. */
  strength: number;
  active: boolean;
  lastMove: LText | null;
  lastMoveRound: number | null;
}

export interface SectorMarketState {
  npcCompetitors: number;
  hype: number;
  /** Named competitors outside the game that react to the market. */
  rivals: Rival[];
}

export interface GameState {
  version: number;
  id: string;
  createdAt: string;
  config: GameConfig;
  /** Current round (1-based). */
  round: number;
  /** Months elapsed before the current round started. */
  month: number;
  finished: boolean;
  companies: Company[];
  markets: Record<SectorId, SectorMarketState>;
  globalModifiers: Modifier[];
  /** Global events active in the current round (announced as news before deciding). */
  outlook: GameEvent[];
  events: GameEvent[];
  candidates: Candidate[];
  candidateSeq: number;
  /** Capital and deals committed by each investor during the game (limited capacity). */
  investorBook: Record<string, { committed: number; deals: Array<{ round: number; companyId: string }> }>;
  /** Ids of every candidate that ever entered the job market. */
  usedCandidateIds: string[];
  reports: RoundReport[];
  firsts: { pmf: string | null; profitable: string | null };
  idSeq: number;
}

export interface PreviewResult {
  cashEnd: number;
  runway: number;
  netBurnMonthly: number;
  expensesMonthly: number;
  revenueMonthlyEnd: number;
  customersEnd: number;
  newCustomers: number;
  mvpProgressEnd: number;
  launched: boolean;
  techDebtEnd: number;
  pmfEnd: number;
  cac: number;
  ltv: number;
  wtp: number;
  churn: number;
  headcount: number;
  oneOffCosts: number;
  hiringCostMonthly: number;
}
