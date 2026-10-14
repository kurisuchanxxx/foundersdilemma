import { lt, type LText } from "../text";
import type { EffectBundle, Instrument, InvestorType, ModifierEffects, SectorId } from "../types";

export interface InvestorRequirements {
  launched?: boolean;
  minMvp?: number;
  minMrr?: number;
  minPmf?: number;
  minCustomers?: number;
  /** Traction alternative: requirement is met when ANY of these is met. */
  anyOf?: Array<{ minMrr?: number; minPmf?: number; minCustomers?: number }>;
  maxValuation?: number;
  minRound?: number;
  maxRound?: number;
  requiresPricedRound?: boolean;
  minFounderHours?: number;
}

export interface InvestorPerk {
  text: LText;
  bundle?: EffectBundle;
  modifier?: { rounds: number; effects: ModifierEffects };
  /** Only applies in these sectors (null = always). */
  sectors?: SectorId[];
}

export interface InvestorDef {
  id: string;
  name: string;
  type: InvestorType;
  tagline: LText;
  description: LText;
  icon: string;
  checkMin: number;
  checkMax: number;
  /** Typical equity sold in the round. */
  dilutionMin: number;
  dilutionMax: number;
  instruments: Instrument[];
  /** Preferred sectors (null = generalist). */
  sectors: SectorId[] | null;
  /** Sectors the investor never invests in. */
  excluded: SectorId[];
  /** When true the investor only invests in its preferred sectors. */
  strictSectors?: boolean;
  requirements: InvestorRequirements;
  /** How generous the investor is compared to the model valuation. */
  valuationBias: number;
  /** Base willingness to invest (0-1). */
  appetite: number;
  boardSeat: boolean;
  /** Option pool the investor requires (fraction of post-money), created before the round. */
  poolTopUp: number;
  liquidationPref: number;
  /** Investor reputation gained by the startup when the deal closes. */
  repBoost: number;
  perks: InvestorPerk[];
  oneTime?: boolean;
  /** Fixed deal (accelerators): amount and equity are not negotiable. */
  fixedTerms?: { amount: number; equityPct: number };
  /** Corporate investors scare away other acquirers. */
  signaling?: number;
}

export const INVESTORS: InvestorDef[] = [
  {
    id: "angel_marta",
    name: "Marta Ferri",
    type: "angel",
    tagline: lt("Business angel, ex-founder (fintech exit)", "Business angel, ex fondatrice (exit fintech)"),
    description: lt(
      "Sold her payments startup in 2019. Writes small cheques fast and opens doors with banks and fintech partners.",
      "Ha venduto la sua startup di pagamenti nel 2019. Firma assegni piccoli in fretta e apre porte con banche e partner fintech.",
    ),
    icon: "UserRound",
    checkMin: 25_000,
    checkMax: 150_000,
    dilutionMin: 0.03,
    dilutionMax: 0.12,
    instruments: ["safe", "equity"],
    sectors: ["fintech", "saas", "marketplace"],
    excluded: [],
    requirements: { minMvp: 0.2 },
    valuationBias: 1.0,
    appetite: 0.62,
    boardSeat: false,
    poolTopUp: 0,
    liquidationPref: 1,
    repBoost: 4,
    perks: [
      { text: lt("Mentoring: +problem clarity", "Mentoring: +chiarezza del problema"), bundle: { problemClarity: 0.05 } },
      { text: lt("Partner introductions: CAC -10% for 2 rounds", "Presentazioni a partner: CAC -10% per 2 round"), modifier: { rounds: 2, effects: { cac: 0.9 } } },
    ],
  },
  {
    id: "angel_mark",
    name: "Mark Johnson",
    type: "angel",
    tagline: lt("Angel investor, early employee at a social app", "Business angel, tra i primi dipendenti di un social network"),
    description: lt(
      "Passionate about viral consumer products. Knows every growth hack in the book.",
      "Appassionato di prodotti consumer virali. Conosce ogni growth hack possibile.",
    ),
    icon: "UserRound",
    checkMin: 25_000,
    checkMax: 250_000,
    dilutionMin: 0.05,
    dilutionMax: 0.15,
    instruments: ["safe", "equity"],
    sectors: ["consumer", "marketplace", "ecommerce"],
    excluded: ["deeptech"],
    requirements: { minMvp: 0.3 },
    valuationBias: 1.0,
    appetite: 0.6,
    boardSeat: false,
    poolTopUp: 0,
    liquidationPref: 1,
    repBoost: 4,
    perks: [
      { text: lt("Growth playbook: marketing efficiency +, CAC -15% for 2 rounds", "Playbook di crescita: CAC -15% per 2 round"), modifier: { rounds: 2, effects: { cac: 0.85 } } },
      { text: lt("Social reach: organic growth +30% for 2 rounds", "Visibilità social: crescita organica +30% per 2 round"), modifier: { rounds: 2, effects: { organic: 1.3 } } },
    ],
  },
  {
    id: "angel_lisa",
    name: "Dr. Lisa Wang",
    type: "angel",
    tagline: lt("Physician and health innovation angel", "Medico e angel dell'innovazione sanitaria"),
    description: lt(
      "Medical doctor turned investor. Brings regulatory expertise and credibility with clinics and hospitals.",
      "Medico diventata investitrice. Porta competenze regolatorie e credibilità presso cliniche e ospedali.",
    ),
    icon: "Stethoscope",
    checkMin: 25_000,
    checkMax: 250_000,
    dilutionMin: 0.05,
    dilutionMax: 0.15,
    instruments: ["safe", "equity"],
    sectors: ["healthtech", "deeptech"],
    excluded: ["ecommerce", "consumer"],
    strictSectors: true,
    requirements: { minMvp: 0.15 },
    valuationBias: 1.05,
    appetite: 0.6,
    boardSeat: false,
    poolTopUp: 0,
    liquidationPref: 1,
    repBoost: 5,
    perks: [
      { text: lt("Regulatory fast-track: compliance costs -50% for 3 rounds", "Corsia regolatoria: costi di compliance -50% per 3 round"), modifier: { rounds: 3, effects: { compliance: -1500 } } },
      { text: lt("Clinical credibility: churn -10% for 3 rounds", "Credibilità clinica: churn -10% per 3 round"), modifier: { rounds: 3, effects: { churn: 0.9 } } },
    ],
  },
  {
    id: "angels_club",
    name: "Club Angeli del Nord",
    type: "angel",
    tagline: lt("Business angel syndicate (generalist)", "Network di business angel (generalista)"),
    description: lt(
      "A syndicate of 40 entrepreneurs and managers. Slower due diligence, larger tickets, wants to see a working product.",
      "Un network di 40 imprenditori e manager. Due diligence più lenta, ticket più grandi, vuole vedere un prodotto funzionante.",
    ),
    icon: "Users",
    checkMin: 80_000,
    checkMax: 400_000,
    dilutionMin: 0.08,
    dilutionMax: 0.2,
    instruments: ["equity", "safe"],
    sectors: null,
    excluded: [],
    requirements: { minMvp: 0.6 },
    valuationBias: 0.95,
    appetite: 0.55,
    boardSeat: false,
    poolTopUp: 0,
    liquidationPref: 1,
    repBoost: 6,
    perks: [{ text: lt("Advisors on demand: +learning velocity", "Advisor a disposizione: +velocità di apprendimento"), bundle: { learningVelocity: 0.08 } }],
  },
  {
    id: "accelerator_launchlab",
    name: "LaunchLab Accelerator",
    type: "accelerator",
    tagline: lt("3-month accelerator program with Demo Day", "Programma di accelerazione di 3 mesi con Demo Day"),
    description: lt(
      "Standard deal: €120k for 7%. Mentors, workshops on customer discovery and a Demo Day in front of 200 investors. Very selective, one shot per company.",
      "Deal standard: 120k€ per il 7%. Mentor, workshop di customer discovery e un Demo Day davanti a 200 investitori. Molto selettivo, una sola possibilità per azienda.",
    ),
    icon: "Rocket",
    checkMin: 120_000,
    checkMax: 120_000,
    dilutionMin: 0.07,
    dilutionMax: 0.07,
    instruments: ["equity"],
    sectors: null,
    excluded: [],
    requirements: { maxRound: 6, maxValuation: 4_000_000, minFounderHours: 50 },
    valuationBias: 1.0,
    appetite: 0.5,
    boardSeat: false,
    poolTopUp: 0,
    liquidationPref: 1,
    repBoost: 12,
    oneTime: true,
    fixedTerms: { amount: 120_000, equityPct: 0.07 },
    perks: [
      { text: lt("Customer discovery bootcamp: +problem clarity, +learning velocity", "Bootcamp di customer discovery: +chiarezza del problema, +velocità di apprendimento"), bundle: { problemClarity: 0.1, learningVelocity: 0.1 } },
      { text: lt("Demo Day: investors more interested for 2 rounds", "Demo Day: investitori più interessati per 2 round"), modifier: { rounds: 2, effects: { climate: 1.15 } }, bundle: { rep: { media: 6 } } },
    ],
  },
  {
    id: "seed_aurora",
    name: "Aurora Seed Fund",
    type: "seed",
    tagline: lt("Seed VC fund, generalist", "Fondo VC seed, generalista"),
    description: lt(
      "A €60M seed fund. Invests after launch when early traction or strong product signals are visible. Takes a board observer seat.",
      "Un fondo seed da 60M€. Investe dopo il lancio, quando si vedono trazione iniziale o forti segnali di prodotto. Chiede un posto da osservatore nel CdA.",
    ),
    icon: "Sunrise",
    checkMin: 300_000,
    checkMax: 1_500_000,
    dilutionMin: 0.1,
    dilutionMax: 0.22,
    instruments: ["equity", "safe"],
    sectors: null,
    excluded: [],
    requirements: { launched: true, anyOf: [{ minMrr: 5_000 }, { minPmf: 50 }, { minCustomers: 500 }] },
    valuationBias: 0.95,
    appetite: 0.55,
    boardSeat: false,
    poolTopUp: 0.05,
    liquidationPref: 1,
    repBoost: 9,
    perks: [{ text: lt("Platform team: talent reputation +10", "Platform team: reputazione verso i talenti +10"), bundle: { rep: { talent: 10 } } }],
  },
  {
    id: "seed_bluefield",
    name: "Bluefield Ventures",
    type: "seed",
    tagline: lt("Deep-tech and AI seed fund", "Fondo seed deep-tech e AI"),
    description: lt(
      "Technical partners with PhDs. Invests before revenue if the prototype is convincing, and wants a board seat.",
      "Partner tecnici con dottorato. Investe anche prima dei ricavi se il prototipo convince, e vuole un posto nel CdA.",
    ),
    icon: "Atom",
    checkMin: 500_000,
    checkMax: 2_500_000,
    dilutionMin: 0.12,
    dilutionMax: 0.25,
    instruments: ["equity"],
    sectors: ["deeptech", "aiinfra", "healthtech"],
    excluded: ["ecommerce", "consumer", "marketplace"],
    strictSectors: true,
    requirements: { minMvp: 0.6 },
    valuationBias: 1.0,
    appetite: 0.55,
    boardSeat: true,
    poolTopUp: 0.08,
    liquidationPref: 1,
    repBoost: 10,
    perks: [{ text: lt("Technical due diligence: tech debt -0.05, quality +", "Due diligence tecnica: debito tecnico -0,05, qualità +"), bundle: { techDebt: -0.05, quality: 0.03 } }],
  },
  {
    id: "corporate_nimbus",
    name: "Nimbus Ventures",
    type: "corporate",
    tagline: lt("Corporate VC of a global cloud provider", "Corporate VC di un grande provider cloud"),
    description: lt(
      "Strategic investor: cloud credits and a distribution partnership. Beware: other acquirers will see you as 'Nimbus territory'.",
      "Investitore strategico: crediti cloud e una partnership distributiva. Attenzione: gli altri acquirenti ti vedranno come 'territorio Nimbus'.",
    ),
    icon: "Cloud",
    checkMin: 500_000,
    checkMax: 6_000_000,
    dilutionMin: 0.08,
    dilutionMax: 0.2,
    instruments: ["equity"],
    sectors: ["aiinfra", "saas", "deeptech", "fintech"],
    excluded: ["ecommerce"],
    strictSectors: true,
    requirements: { launched: true, minMrr: 20_000 },
    valuationBias: 1.12,
    appetite: 0.5,
    boardSeat: false,
    poolTopUp: 0,
    liquidationPref: 1,
    repBoost: 8,
    signaling: 0.4,
    perks: [
      { text: lt("Cloud credits: gross margin +8 pts for 4 rounds", "Crediti cloud: margine lordo +8 punti per 4 round"), modifier: { rounds: 4, effects: { gm: 0.08 } } },
      { text: lt("Marketplace listing: CAC -10% for 3 rounds", "Listing nel marketplace: CAC -10% per 3 round"), modifier: { rounds: 3, effects: { cac: 0.9 } } },
    ],
  },
  {
    id: "seriesA_peak",
    name: "Peak Capital",
    type: "seriesA",
    tagline: lt("Series A VC fund, generalist", "Fondo VC Series A, generalista"),
    description: lt(
      "Leads Series A rounds for companies with proven product-market fit and fast growth. Board seat, 1x liquidation preference, 10% option pool.",
      "Guida round Series A per aziende con product-market fit dimostrato e crescita rapida. Posto nel CdA, liquidation preference 1x, pool di opzioni del 10%.",
    ),
    icon: "Mountain",
    checkMin: 2_000_000,
    checkMax: 8_000_000,
    dilutionMin: 0.15,
    dilutionMax: 0.28,
    instruments: ["equity"],
    sectors: null,
    excluded: [],
    requirements: { launched: true, minMrr: 60_000, minPmf: 55 },
    valuationBias: 0.92,
    appetite: 0.55,
    boardSeat: true,
    poolTopUp: 0.1,
    liquidationPref: 1,
    repBoost: 14,
    perks: [{ text: lt("Talent network: talent reputation +15", "Rete di talenti: reputazione verso i talenti +15"), bundle: { rep: { talent: 15 } } }],
  },
  {
    id: "seriesA_meridian",
    name: "Meridian Partners",
    type: "seriesA",
    tagline: lt("B2B-focused Series A fund", "Fondo Series A specializzato B2B"),
    description: lt(
      "Specialists in business software. Larger rounds, demanding governance, a powerful enterprise sales network.",
      "Specialisti di software per aziende. Round più grandi, governance esigente, una potente rete commerciale enterprise.",
    ),
    icon: "Compass",
    checkMin: 3_000_000,
    checkMax: 10_000_000,
    dilutionMin: 0.18,
    dilutionMax: 0.3,
    instruments: ["equity"],
    sectors: ["saas", "aiinfra", "fintech", "healthtech", "deeptech"],
    excluded: ["consumer", "ecommerce"],
    strictSectors: true,
    requirements: { launched: true, minMrr: 80_000, minPmf: 57 },
    valuationBias: 0.95,
    appetite: 0.52,
    boardSeat: true,
    poolTopUp: 0.1,
    liquidationPref: 1,
    repBoost: 14,
    perks: [{ text: lt("Enterprise network: sales capacity +20% for 3 rounds", "Rete enterprise: capacità commerciale +20% per 3 round"), modifier: { rounds: 3, effects: { sales: 1.2 } } }],
  },
  {
    id: "growth_titan",
    name: "Titan Growth Partners",
    type: "growth",
    tagline: lt("Growth equity for scale-ups", "Growth equity per scale-up"),
    description: lt(
      "Large Series B+ cheques for companies that are already scaling. Expects discipline: board seat and an independent director.",
      "Assegni importanti (Series B+) per aziende che stanno già scalando. Pretende disciplina: posto nel CdA e un consigliere indipendente.",
    ),
    icon: "TrendingUp",
    checkMin: 10_000_000,
    checkMax: 40_000_000,
    dilutionMin: 0.12,
    dilutionMax: 0.25,
    instruments: ["equity"],
    sectors: null,
    excluded: [],
    requirements: { launched: true, minMrr: 300_000, minPmf: 62, requiresPricedRound: true },
    valuationBias: 0.95,
    appetite: 0.5,
    boardSeat: true,
    poolTopUp: 0.05,
    liquidationPref: 1,
    repBoost: 15,
    perks: [{ text: lt("Scale playbook: coordination improves (+morale)", "Playbook di scala: migliora il coordinamento (+morale)"), bundle: { morale: 0.05 } }],
  },
  {
    id: "crowd_crowdbase",
    name: "CrowdBase",
    type: "crowdfunding",
    tagline: lt("Equity crowdfunding platform", "Piattaforma di equity crowdfunding"),
    description: lt(
      "Raise from hundreds of small investors, often your own customers. You set the valuation, but success depends on your community, and VCs dislike crowded cap tables.",
      "Raccogli da centinaia di piccoli investitori, spesso i tuoi clienti. Scegli tu la valutazione, ma il successo dipende dalla tua community e ai VC non piacciono cap table affollate.",
    ),
    icon: "UsersRound",
    checkMin: 100_000,
    checkMax: 1_500_000,
    dilutionMin: 0.05,
    dilutionMax: 0.2,
    instruments: ["equity"],
    sectors: ["consumer", "ecommerce", "fintech", "marketplace", "healthtech"],
    excluded: [],
    strictSectors: true,
    requirements: { launched: true, minRound: 2 },
    valuationBias: 1.1,
    appetite: 0.5,
    boardSeat: false,
    poolTopUp: 0,
    liquidationPref: 0,
    repBoost: 3,
    perks: [{ text: lt("Investors become ambassadors: brand +, media +", "Gli investitori diventano ambasciatori: brand +, media +"), bundle: { brand: 0.08, rep: { media: 6, customers: 4 } } }],
  },
];

export function investorDef(id: string): InvestorDef | undefined {
  return INVESTORS.find((i) => i.id === id);
}

export interface GrantDef {
  id: string;
  name: LText;
  description: LText;
  amount: number;
  sectors: SectorId[] | null;
  minMvp: number;
  minProblemClarity: number;
  baseSuccess: number;
  /** Development time lost writing the application and reports. */
  devPenalty: number;
  oneTime: boolean;
}

export const GRANTS: GrantDef[] = [
  {
    id: "grant_regional",
    name: lt("Regional Innovation Voucher", "Voucher regionale per l'innovazione"),
    description: lt(
      "Non-dilutive grant of €40k for young innovative companies. Paid out the following round if approved.",
      "Contributo a fondo perduto di 40k€ per giovani imprese innovative. Erogato il round successivo se approvato.",
    ),
    amount: 40_000,
    sectors: null,
    minMvp: 0,
    minProblemClarity: 0.3,
    baseSuccess: 0.5,
    devPenalty: 0.05,
    oneTime: true,
  },
  {
    id: "grant_eu",
    name: lt("EU Deep-Tech Grant", "Grant europeo Deep-Tech"),
    description: lt(
      "€300k non-dilutive funding for breakthrough technology. Competitive, slow and with heavy reporting, but it does not cost equity.",
      "300k€ a fondo perduto per tecnologie di frontiera. Competitivo, lento e con rendicontazione pesante, ma non costa equity.",
    ),
    amount: 300_000,
    sectors: ["deeptech", "healthtech", "aiinfra"],
    minMvp: 0.25,
    minProblemClarity: 0.4,
    baseSuccess: 0.3,
    devPenalty: 0.1,
    oneTime: true,
  },
];

export function grantDef(id: string): GrantDef | undefined {
  return GRANTS.find((g) => g.id === id);
}

export interface LenderDef {
  id: string;
  name: string;
  type: "bank" | "ventureDebt";
  description: LText;
  annualRate: number;
  termMonths: number;
  personalGuarantee: boolean;
  /** Warrants (equity kicker) granted to the lender, as fraction of the company. */
  warrantsPct: number;
  oneTime: boolean;
}

export const LENDERS: LenderDef[] = [
  {
    id: "loan_public",
    name: "Fondo Nazionale Innovazione",
    type: "bank",
    description: lt(
      "Public zero-interest loan for innovative startups (up to €150k, 48 months). Requires a working MVP. One per company.",
      "Finanziamento pubblico a tasso zero per startup innovative (fino a 150k€, 48 mesi). Richiede un MVP funzionante. Uno per azienda.",
    ),
    annualRate: 0,
    termMonths: 48,
    personalGuarantee: false,
    warrantsPct: 0,
    oneTime: true,
  },
  {
    id: "loan_bank",
    name: "Banca del Territorio",
    type: "bank",
    description: lt(
      "Bank loan up to 8x your monthly revenue (max €250k), 24 months at 7.5%. The bank asks for a personal guarantee from the founders.",
      "Prestito bancario fino a 8 volte il fatturato mensile (max 250k€), 24 mesi al 7,5%. La banca chiede una garanzia personale ai fondatori.",
    ),
    annualRate: 0.075,
    termMonths: 24,
    personalGuarantee: true,
    warrantsPct: 0,
    oneTime: false,
  },
  {
    id: "loan_venture",
    name: "Atlas Venture Debt",
    type: "ventureDebt",
    description: lt(
      "Venture debt for VC-backed companies: up to 35% of your last equity round, 36 months at 12% plus 0.5% warrants.",
      "Venture debt per aziende finanziate da VC: fino al 35% dell'ultimo round equity, 36 mesi al 12% più warrant dello 0,5%.",
    ),
    annualRate: 0.12,
    termMonths: 36,
    personalGuarantee: false,
    warrantsPct: 0.005,
    oneTime: false,
  },
];

export function lenderDef(id: string): LenderDef | undefined {
  return LENDERS.find((l) => l.id === id);
}

export const INVESTOR_TYPE_LABEL: Record<InvestorType, LText> = {
  angel: lt("Business angel", "Business angel"),
  accelerator: lt("Accelerator", "Acceleratore"),
  seed: lt("Seed fund", "Fondo seed"),
  seriesA: lt("Series A fund", "Fondo Series A"),
  growth: lt("Growth fund", "Fondo growth"),
  corporate: lt("Corporate VC", "Corporate VC"),
  crowdfunding: lt("Crowdfunding", "Crowdfunding"),
  grant: lt("Public grant", "Bando pubblico"),
  bank: lt("Loan", "Prestito"),
  ventureDebt: lt("Venture debt", "Venture debt"),
};
