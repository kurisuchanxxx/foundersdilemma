import { lt, type LText } from "../text";
import type { Company, EffectBundle, GameState, Impact, ModifierEffects, SectorId } from "../types";

// ---------------------------------------------------------------------------------------
// Global events: announced in the news before players decide, active for some rounds.
// ---------------------------------------------------------------------------------------

export interface GlobalEventTemplate {
  id: string;
  title: LText;
  description: LText;
  impact: Impact;
  /** Fixed sectors, "random" = one sector picked at generation (prefers sectors with players), null = all. */
  sectors: SectorId[] | "random" | null;
  rounds: number;
  effects: ModifierEffects;
  /** Optional second effect applied to every other sector. */
  othersEffects?: ModifierEffects;
  weight: number;
  minRound: number;
  concept: string | null;
}

export const GLOBAL_EVENTS: GlobalEventTemplate[] = [
  {
    id: "market_downturn",
    title: lt("Market downturn", "Crisi di mercato"),
    description: lt(
      "Investor sentiment turns bearish. Rounds are harder to close, valuations shrink and customers cut budgets.",
      "Il sentiment degli investitori diventa negativo. I round sono più difficili da chiudere, le valutazioni scendono e i clienti tagliano i budget.",
    ),
    impact: "negative",
    sectors: null,
    rounds: 2,
    effects: { climate: 0.75, valuation: 0.85, cac: 1.12, wtp: 0.95 },
    weight: 1.2,
    minRound: 2,
    concept: "fundingClimate",
  },
  {
    id: "tech_boom",
    title: lt("Tech boom", "Boom tecnologico"),
    description: lt(
      "Tech is hot again: investors compete for deals and valuations rise. Talent gets more expensive too.",
      "La tecnologia torna di moda: gli investitori si contendono i deal e le valutazioni salgono. Anche i talenti costano di più.",
    ),
    impact: "positive",
    sectors: null,
    rounds: 2,
    effects: { climate: 1.3, valuation: 1.2, cac: 0.95, salaryAsk: 1.05 },
    weight: 1,
    minRound: 2,
    concept: "fundingClimate",
  },
  {
    id: "funding_winter",
    title: lt("Funding winter", "Inverno del venture capital"),
    description: lt(
      "Interest rates and fear freeze venture capital. Only the best companies raise money, at lower valuations. Runway is king.",
      "Tassi e paura congelano il venture capital. Solo le aziende migliori raccolgono, a valutazioni più basse. La runway è tutto.",
    ),
    impact: "negative",
    sectors: null,
    rounds: 3,
    effects: { climate: 0.6, valuation: 0.75 },
    weight: 0.8,
    minRound: 3,
    concept: "runway",
  },
  {
    id: "talent_war",
    title: lt("War for talent", "Guerra dei talenti"),
    description: lt(
      "Big Tech is hiring aggressively. Candidates ask for more and are harder to convince.",
      "Le Big Tech assumono in modo aggressivo. I candidati chiedono di più e sono più difficili da convincere.",
    ),
    impact: "negative",
    sectors: null,
    rounds: 2,
    effects: { hiringBar: 0.06, salaryAsk: 1.15 },
    weight: 1,
    minRound: 2,
    concept: "equityCompensation",
  },
  {
    id: "ai_hype",
    title: lt("AI hype wave", "Ondata di hype sull'AI"),
    description: lt(
      "Every investor wants an AI deal. AI and deep-tech companies raise at premium valuations.",
      "Ogni investitore vuole un deal AI. Le aziende AI e deep-tech raccolgono a valutazioni premium.",
    ),
    impact: "positive",
    sectors: ["aiinfra", "deeptech"],
    rounds: 2,
    effects: { climate: 1.4, valuation: 1.3, organic: 1.2 },
    othersEffects: { hiringBar: 0.02 },
    weight: 0.9,
    minRound: 2,
    concept: "fundingClimate",
  },
  {
    id: "new_regulation",
    title: lt("New EU regulation", "Nuova regolamentazione europea"),
    description: lt(
      "A new directive tightens rules for financial and health data. Compliance costs rise and development slows down.",
      "Una nuova direttiva irrigidisce le regole sui dati finanziari e sanitari. I costi di compliance salgono e lo sviluppo rallenta.",
    ),
    impact: "negative",
    sectors: ["fintech", "healthtech"],
    rounds: 3,
    effects: { compliance: 2_000, dev: 0.93 },
    weight: 0.9,
    minRound: 2,
    concept: "regulation",
  },
  {
    id: "privacy_rules",
    title: lt("Tracking restrictions", "Restrizioni al tracciamento"),
    description: lt(
      "Browsers and phones block ad tracking. Performance marketing becomes less precise and more expensive.",
      "Browser e smartphone bloccano il tracciamento pubblicitario. Il performance marketing diventa meno preciso e più costoso.",
    ),
    impact: "negative",
    sectors: ["consumer", "ecommerce", "marketplace"],
    rounds: 2,
    effects: { cac: 1.2 },
    weight: 0.9,
    minRound: 2,
    concept: "cac",
  },
  {
    id: "rates_up",
    title: lt("Interest rates rise", "Rialzo dei tassi"),
    description: lt(
      "Central banks raise rates. Debt costs more and investors become more selective.",
      "Le banche centrali alzano i tassi. Il debito costa di più e gli investitori diventano più selettivi.",
    ),
    impact: "negative",
    sectors: null,
    rounds: 3,
    effects: { debtRate: 0.03, climate: 0.88, valuation: 0.92 },
    weight: 0.8,
    minRound: 3,
    concept: "debtVsEquity",
  },
  {
    id: "supply_chain",
    title: lt("Supply chain disruption", "Crisi delle forniture"),
    description: lt(
      "Shipping delays and component shortages squeeze the margins of companies that sell physical products.",
      "Ritardi nelle spedizioni e scarsità di componenti comprimono i margini di chi vende prodotti fisici.",
    ),
    impact: "negative",
    sectors: ["ecommerce", "deeptech"],
    rounds: 1,
    effects: { gm: -0.08 },
    weight: 0.8,
    minRound: 2,
    concept: "grossMargin",
  },
  {
    id: "global_crisis",
    title: lt("Global crisis (black swan)", "Crisi globale (cigno nero)"),
    description: lt(
      "An unexpected global shock hits demand and markets. Customers churn more and investors freeze.",
      "Uno shock globale inatteso colpisce domanda e mercati. I clienti abbandonano di più e gli investitori si bloccano.",
    ),
    impact: "negative",
    sectors: null,
    rounds: 2,
    effects: { churn: 1.2, climate: 0.6, demand: 0.9, valuation: 0.8 },
    weight: 0.35,
    minRound: 4,
    concept: "blackSwan",
  },
  {
    id: "bigtech_enters",
    title: lt("Big Tech enters the market", "Una Big Tech entra nel mercato"),
    description: lt(
      "A tech giant launches a free product in this sector. Acquiring customers becomes harder and some customers leave.",
      "Un colosso tecnologico lancia un prodotto gratuito in questo settore. Acquisire clienti diventa più difficile e alcuni clienti se ne vanno.",
    ),
    impact: "negative",
    sectors: "random",
    rounds: 3,
    effects: { cac: 1.3, churn: 1.1, wtp: 0.92 },
    weight: 0.9,
    minRound: 3,
    concept: "competition",
  },
  {
    id: "industry_tailwind",
    title: lt("Industry tailwind", "Vento a favore nel settore"),
    description: lt(
      "A shift in habits accelerates adoption in this sector. Customers are easier to acquire.",
      "Un cambiamento nelle abitudini accelera l'adozione in questo settore. I clienti sono più facili da acquisire.",
    ),
    impact: "positive",
    sectors: "random",
    rounds: 2,
    effects: { cac: 0.8, demand: 1.1, organic: 1.15 },
    weight: 1,
    minRound: 2,
    concept: "marketTiming",
  },
  {
    id: "open_source_model",
    title: lt("Powerful open-source AI model released", "Rilasciato un potente modello AI open-source"),
    description: lt(
      "A free model matches paid APIs. AI infrastructure prices drop, while everyone else builds faster.",
      "Un modello gratuito eguaglia le API a pagamento. I prezzi dell'infrastruttura AI scendono, mentre tutti gli altri sviluppano più velocemente.",
    ),
    impact: "neutral",
    sectors: ["aiinfra"],
    rounds: 2,
    effects: { wtp: 0.8 },
    othersEffects: { dev: 1.1 },
    weight: 0.7,
    minRound: 3,
    concept: "disruption",
  },
  {
    id: "remote_work_trend",
    title: lt("Remote work goes mainstream", "Il lavoro da remoto diventa la norma"),
    description: lt(
      "Companies adopt new collaboration tools and remote talent becomes easier to hire.",
      "Le aziende adottano nuovi strumenti di collaborazione e i talenti da remoto diventano più facili da assumere.",
    ),
    impact: "positive",
    sectors: ["saas", "aiinfra"],
    rounds: 2,
    effects: { demand: 1.1, cac: 0.92 },
    othersEffects: { hiringBar: -0.03 },
    weight: 0.7,
    minRound: 2,
    concept: "marketTiming",
  },
  {
    id: "consumer_confidence",
    title: lt("Consumer confidence rebounds", "Ripresa della fiducia dei consumatori"),
    description: lt(
      "Households spend more: consumer products convert better and customers accept higher prices.",
      "Le famiglie spendono di più: i prodotti consumer convertono meglio e i clienti accettano prezzi più alti.",
    ),
    impact: "positive",
    sectors: ["consumer", "ecommerce", "marketplace"],
    rounds: 2,
    effects: { wtp: 1.08, cac: 0.9 },
    weight: 0.8,
    minRound: 2,
    concept: "pricing",
  },
  {
    id: "green_deal",
    title: lt("Green Deal funding", "Fondi del Green Deal"),
    description: lt(
      "New public and private funds target sustainable and industrial innovation.",
      "Nuovi fondi pubblici e privati puntano su innovazione sostenibile e industriale.",
    ),
    impact: "positive",
    sectors: ["deeptech", "ecommerce"],
    rounds: 2,
    effects: { climate: 1.2 },
    weight: 0.6,
    minRound: 2,
    concept: "grants",
  },
];

// ---------------------------------------------------------------------------------------
// Company events: surprises that happen during a round.
// ---------------------------------------------------------------------------------------

export interface CompanyEventContext {
  company: Company;
  state: GameState;
}

export interface CompanyEventTemplate {
  id: string;
  title: LText;
  description: LText;
  impact: Impact;
  /** Probability that the event happens in a round (before the risk-profile multiplier). */
  probability: (ctx: CompanyEventContext) => number;
  effects: (ctx: CompanyEventContext) => EffectBundle;
  concept: string | null;
}

const B2B: SectorId[] = ["saas", "deeptech", "healthtech", "aiinfra"];

export const COMPANY_EVENTS: CompanyEventTemplate[] = [
  {
    id: "viral_moment",
    title: lt("Viral moment", "Momento virale"),
    description: lt(
      "A creator with millions of followers shows your product. New users flood in.",
      "Un creator con milioni di follower mostra il tuo prodotto. Arrivano nuovi utenti a valanga.",
    ),
    impact: "positive",
    probability: ({ company }) => {
      if (!company.product.launched) return 0;
      const sectorBoost = ["consumer", "marketplace", "ecommerce"].includes(company.sector) ? 1.6 : 0.5;
      return (0.02 + (company.pmf.score / 100) * 0.08) * sectorBoost;
    },
    effects: () => ({ customersPct: 0.2, brand: 0.08, rep: { media: 10 }, modifier: { rounds: 1, effects: { organic: 1.8 } } }),
    concept: "virality",
  },
  {
    id: "strategic_partnership",
    title: lt("Strategic partnership", "Partnership strategica"),
    description: lt(
      "An established player signs a distribution partnership with you.",
      "Un operatore affermato firma con te una partnership di distribuzione.",
    ),
    impact: "positive",
    probability: ({ company }) => (company.product.launched ? 0.04 + (company.reputation.customers / 100) * 0.06 : 0),
    effects: () => ({ customersPct: 0.1, rep: { customers: 5, investors: 3 }, modifier: { rounds: 2, effects: { churn: 0.9, cac: 0.92 } } }),
    concept: "partnerships",
  },
  {
    id: "security_breach",
    title: lt("Security breach", "Violazione dei dati"),
    description: lt(
      "Attackers exploited a vulnerability and leaked customer data. Trust drops and you pay for forensics and notifications.",
      "Degli attaccanti hanno sfruttato una vulnerabilità e diffuso dati dei clienti. La fiducia crolla e paghi analisi forensi e notifiche.",
    ),
    impact: "negative",
    probability: ({ company }) => {
      if (!company.product.launched) return 0;
      const exposure = ["fintech", "healthtech"].includes(company.sector) ? 1.4 : 1;
      return (0.015 + company.product.techDebt * 0.08) * exposure;
    },
    effects: ({ company }) => ({
      cash: -Math.max(15_000, company.mrr * 1.5),
      morale: -0.05,
      rep: { customers: -15, media: -10 },
      modifier: { rounds: 1, effects: { churn: 1.25 } },
    }),
    concept: "techDebt",
  },
  {
    id: "key_customer_churn",
    title: lt("Key customer churns", "Un cliente chiave se ne va"),
    description: lt(
      "One of your largest accounts leaves for a competitor.",
      "Uno dei tuoi clienti più grandi passa a un concorrente.",
    ),
    impact: "negative",
    probability: ({ company }) => (company.product.launched && B2B.includes(company.sector) && company.customers >= 3 ? 0.07 : 0),
    effects: ({ company }) => ({
      customersAdd: -Math.max(1, Math.round(company.customers * 0.06)),
      morale: -0.02,
      rep: { customers: -4 },
    }),
    concept: "churn",
  },
  {
    id: "award",
    title: lt("Startup award", "Premio startup"),
    description: lt(
      "You win 'Startup of the Year' at a national competition. Great for recruiting and press.",
      "Vinci il premio 'Startup dell'anno' in un concorso nazionale. Ottimo per il recruiting e la stampa.",
    ),
    impact: "positive",
    probability: ({ company }) => 0.025 + company.product.quality * 0.04,
    effects: () => ({ morale: 0.05, brand: 0.05, rep: { media: 12, talent: 8, investors: 4 } }),
    concept: "reputation",
  },
  {
    id: "outage",
    title: lt("Major outage", "Disservizio grave"),
    description: lt(
      "Your product was down for two days. Customers are angry and some leave.",
      "Il prodotto è rimasto fuori servizio per due giorni. I clienti sono arrabbiati e alcuni se ne vanno.",
    ),
    impact: "negative",
    probability: ({ company }) => (company.product.launched ? 0.02 + (company.product.bugs / 100) * 0.15 + company.product.techDebt * 0.05 : 0),
    effects: () => ({ morale: -0.03, rep: { customers: -8 }, modifier: { rounds: 1, effects: { churn: 1.15 } } }),
    concept: "techDebt",
  },
  {
    id: "press_feature",
    title: lt("Press feature", "Articolo sulla stampa"),
    description: lt(
      "A major business newspaper publishes a feature about your company.",
      "Un importante quotidiano economico pubblica un articolo sulla tua azienda.",
    ),
    impact: "positive",
    probability: ({ company }) => 0.03 + (company.reputation.media / 100) * 0.08,
    effects: () => ({ brand: 0.05, rep: { media: 8, investors: 3 }, modifier: { rounds: 1, effects: { cac: 0.9 } } }),
    concept: "reputation",
  },
  {
    id: "patent_granted",
    title: lt("Patent granted", "Brevetto concesso"),
    description: lt(
      "Your core technology is now protected by a patent. Investors value defensible IP.",
      "La tua tecnologia chiave ora è protetta da un brevetto. Gli investitori apprezzano una proprietà intellettuale difendibile.",
    ),
    impact: "positive",
    probability: ({ company }) =>
      ["deeptech", "healthtech", "aiinfra"].includes(company.sector) && company.product.mvpProgress >= 0.5 ? 0.06 : 0,
    effects: () => ({ rep: { investors: 10 }, modifier: { rounds: 4, effects: { valuation: 1.1 } } }),
    concept: "ip",
  },
  {
    id: "supplier_issue",
    title: lt("Supplier problem", "Problema con un fornitore"),
    description: lt(
      "Your main supplier raises prices and delivers late.",
      "Il tuo fornitore principale aumenta i prezzi e consegna in ritardo.",
    ),
    impact: "negative",
    probability: ({ company }) => (company.product.launched && ["ecommerce", "deeptech"].includes(company.sector) ? 0.08 : 0),
    effects: () => ({ rep: { customers: -5 }, modifier: { rounds: 1, effects: { gm: -0.07 } } }),
    concept: "grossMargin",
  },
  {
    id: "regulatory_audit",
    title: lt("Regulatory audit", "Ispezione regolatoria"),
    description: lt(
      "The regulator audits your processes. Lawyers' fees and a month of distraction.",
      "L'autorità di vigilanza ispeziona i tuoi processi. Parcelle legali e un mese di distrazione.",
    ),
    impact: "negative",
    probability: ({ company }) => (company.product.launched && ["fintech", "healthtech"].includes(company.sector) ? 0.07 : 0),
    effects: () => ({ cash: -20_000, stress: 0.05, modifier: { rounds: 1, effects: { dev: 0.9 } } }),
    concept: "regulation",
  },
  {
    id: "big_customer_win",
    title: lt("Lighthouse customer", "Cliente faro"),
    description: lt(
      "A well-known company signs up and lets you use its logo. Other customers follow.",
      "Un'azienda molto nota firma con te e ti permette di usare il suo logo. Altri clienti la seguono.",
    ),
    impact: "positive",
    probability: ({ company }) => (company.product.launched && B2B.includes(company.sector) ? 0.03 + company.pmf.score / 1500 : 0),
    effects: ({ company }) => ({
      customersAdd: Math.max(2, Math.round(company.customers * 0.08)),
      rep: { customers: 6, investors: 4 },
    }),
    concept: "socialProof",
  },
  {
    id: "competitor_stumbles",
    title: lt("A competitor stumbles", "Un concorrente inciampa"),
    description: lt(
      "A rival's scandal sends prospects your way.",
      "Uno scandalo di un rivale spinge i potenziali clienti verso di te.",
    ),
    impact: "positive",
    probability: ({ company }) => (company.product.launched ? 0.04 : 0),
    effects: () => ({ modifier: { rounds: 1, effects: { cac: 0.85 } } }),
    concept: "competition",
  },
  {
    id: "team_bonding",
    title: lt("Team bonding win", "Il team si compatta"),
    description: lt(
      "After a tough sprint the team gels beautifully. Morale and execution improve.",
      "Dopo uno sprint difficile il team si compatta. Morale ed esecuzione migliorano.",
    ),
    impact: "positive",
    probability: ({ company }) => (company.team.length >= 2 && company.morale > 0.6 ? 0.12 : 0),
    effects: () => ({ morale: 0.08 }),
    concept: "culture",
  },
  {
    id: "team_burnout",
    title: lt("Team burnout", "Team in burnout"),
    description: lt(
      "Too many long nights: the team is exhausted and productivity drops.",
      "Troppe notti in bianco: il team è esausto e la produttività cala.",
    ),
    impact: "negative",
    probability: ({ company }) =>
      company.team.length >= 2 ? (company.morale < 0.5 ? 0.15 : 0) + ((company.lastDecision?.founderHours ?? 50) >= 80 ? 0.12 : 0) : 0,
    effects: () => ({ morale: -0.08, modifier: { rounds: 1, effects: { dev: 0.88 } } }),
    concept: "culture",
  },
];
