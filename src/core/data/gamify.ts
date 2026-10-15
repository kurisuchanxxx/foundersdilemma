// Engagement layer: XP levels, round challenges, team showdowns and founder interactions.
// None of this changes the economic ranking: XP is a parallel, visible measure of how actively
// a team plays, meant to keep students engaged between rounds.
import { lt, type LText } from "../text";
import type { ChallengeKind, ChallengeTier, InteractionKind, ShowdownKind } from "../types";

export const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

export const LEVEL_TITLES: LText[] = [
  lt("Garage dreamer", "Sognatore da garage"),
  lt("Pre-seed hustler", "Hustler pre-seed"),
  lt("MVP builder", "Costruttore di MVP"),
  lt("Launch captain", "Capitano del lancio"),
  lt("Growth hacker", "Growth hacker"),
  lt("Market mover", "Motore del mercato"),
  lt("Scale architect", "Architetto della scala"),
  lt("Series A star", "Stella della Serie A"),
  lt("Unicorn rider", "Cavaliere dell'unicorno"),
  lt("Startup legend", "Leggenda delle startup"),
];

export const CHALLENGE_XP: Record<ChallengeTier, number> = { easy: 60, medium: 90, hard: 120 };
export const STREAK_BONUS_XP = 50;
export const STREAK_EVERY = 3;
export const ACHIEVEMENT_XP = 80;
export const SHOWDOWN_XP = [150, 60, 30];
export const CHALLENGES_PER_ROUND = 3;
export const MAX_INTERACTIONS = 2;

export interface ChallengeDef {
  kind: ChallengeKind;
  icon: string;
  /** Target value per tier (meaning depends on the kind). */
  targets: Record<ChallengeTier, number>;
  /** true = makes sense only after launch; false = only before; null = always. */
  launched: boolean | null;
  title: (target: number) => LText;
  description: (target: number) => LText;
}

const pctT = (t: number) => `${Math.round(t * 100)}%`;

export const CHALLENGE_DEFS: Record<ChallengeKind, ChallengeDef> = {
  mrrGrowth: {
    kind: "mrrGrowth", icon: "TrendingUp", launched: true, targets: { easy: 0.1, medium: 0.2, hard: 0.35 },
    title: (t) => lt(`Grow MRR by ${pctT(t)}`, `Fai crescere l'MRR del ${pctT(t)}`),
    description: (t) => lt(`Close the round with monthly revenue at least ${pctT(t)} higher than last round.`, `Chiudi il round con un fatturato mensile almeno del ${pctT(t)} superiore al round scorso.`),
  },
  newCustomers: {
    kind: "newCustomers", icon: "Users", launched: true, targets: { easy: 15, medium: 50, hard: 150 },
    title: (t) => lt(`Win ${t} new customers`, `Conquista ${t} nuovi clienti`),
    description: (t) => lt(`Acquire at least ${t} new paying customers during the round.`, `Acquisisci almeno ${t} nuovi clienti paganti durante il round.`),
  },
  lowChurn: {
    kind: "lowChurn", icon: "Lock", launched: true, targets: { easy: 0.9, medium: 0.75, hard: 0.6 },
    title: (t) => lt(`Churn ${Math.round((1 - t) * 100)}% below the sector norm`, `Churn del ${Math.round((1 - t) * 100)}% sotto la norma del settore`),
    description: (t) => lt(`Keep monthly churn at or below ${Math.round(t * 100)}% of your sector's typical churn.`, `Mantieni il churn mensile pari o inferiore al ${Math.round(t * 100)}% del churn tipico del settore.`),
  },
  hire: {
    kind: "hire", icon: "UserPlus", launched: null, targets: { easy: 1, medium: 2, hard: 3 },
    title: (t) => lt(t === 1 ? "Hire one person" : `Hire ${t} people`, t === 1 ? "Assumi una persona" : `Assumi ${t} persone`),
    description: (t) => lt(`Close at least ${t} hire${t > 1 ? "s" : ""} this round: candidates must say yes.`, `Chiudi almeno ${t} assunzion${t > 1 ? "i" : "e"} in questo round: i candidati devono dire di sì.`),
  },
  deepDiscovery: {
    kind: "deepDiscovery", icon: "Search", launched: null, targets: { easy: 1, medium: 1, hard: 1 },
    title: () => lt("Talk to customers", "Parla con i clienti"),
    description: () => lt("Run deep customer discovery this round.", "Fai discovery approfondita con i clienti in questo round."),
  },
  lowStress: {
    kind: "lowStress", icon: "HeartPulse", launched: null, targets: { easy: 0.6, medium: 0.5, hard: 0.4 },
    title: (t) => lt(`Founder stress under ${pctT(t)}`, `Stress dei fondatori sotto il ${pctT(t)}`),
    description: (t) => lt(`End the round with founder stress below ${pctT(t)}: hours, runway and pitches all weigh on it.`, `Chiudi il round con lo stress dei fondatori sotto il ${pctT(t)}: ore, runway e pitch pesano tutti.`),
  },
  raise: {
    kind: "raise", icon: "HandCoins", launched: null, targets: { easy: 1, medium: 100_000, hard: 500_000 },
    title: (t) => lt(t <= 1 ? "Close a funding deal" : `Raise at least ${Math.round(t / 1000)}k`, t <= 1 ? "Chiudi un finanziamento" : `Raccogli almeno ${Math.round(t / 1000)}k`),
    description: (t) => lt(t <= 1 ? "Close any external funding this round (equity, SAFE, grant or loan)." : `Bring in at least ${Math.round(t / 1000)}k of external money this round.`, t <= 1 ? "Chiudi un finanziamento esterno in questo round (equity, SAFE, bando o prestito)." : `Porta in cassa almeno ${Math.round(t / 1000)}k di capitali esterni in questo round.`),
  },
  launch: {
    kind: "launch", icon: "Rocket", launched: false, targets: { easy: 1, medium: 1, hard: 1 },
    title: () => lt("Launch the product", "Lancia il prodotto"),
    description: () => lt("Go live this round: the waitlist converts into paying customers.", "Vai online in questo round: la lista d'attesa si trasforma in clienti paganti."),
  },
  pmfGain: {
    kind: "pmfGain", icon: "Target", launched: null, targets: { easy: 4, medium: 8, hard: 14 },
    title: (t) => lt(`PMF score +${t}`, `Punteggio PMF +${t}`),
    description: (t) => lt(`Raise your product-market fit score by at least ${t} points in the round.`, `Alza il punteggio di product-market fit di almeno ${t} punti nel round.`),
  },
  cashPositive: {
    kind: "cashPositive", icon: "CircleDollarSign", launched: true, targets: { easy: 1, medium: 1, hard: 1 },
    title: () => lt("Cash-flow positive", "Cash flow positivo"),
    description: () => lt("End the round earning more cash than you spend each month.", "Chiudi il round guadagnando ogni mese più cassa di quanta ne spendi."),
  },
  qualityShip: {
    kind: "qualityShip", icon: "BadgeCheck", launched: null, targets: { easy: 1, medium: 1, hard: 1 },
    title: () => lt("Ship with quality", "Sviluppa con qualità"),
    description: () => lt("Choose the quality development approach this round.", "Scegli l'approccio di sviluppo orientato alla qualità in questo round."),
  },
  noDebt: {
    kind: "noDebt", icon: "Wrench", launched: null, targets: { easy: 0, medium: -0.03, hard: -0.08 },
    title: (t) => lt(t === 0 ? "Hold tech debt" : `Cut tech debt by ${Math.round(-t * 100)} points`, t === 0 ? "Tieni fermo il debito tecnico" : `Riduci il debito tecnico di ${Math.round(-t * 100)} punti`),
    description: (t) => lt(t === 0 ? "Finish the round with no more tech debt than you started with." : `Reduce tech debt by at least ${Math.round(-t * 100)} points during the round.`, t === 0 ? "Chiudi il round senza più debito tecnico di quanto ne avevi all'inizio." : `Riduci il debito tecnico di almeno ${Math.round(-t * 100)} punti durante il round.`),
  },
  runway: {
    kind: "runway", icon: "Timer", launched: null, targets: { easy: 9, medium: 12, hard: 18 },
    title: (t) => lt(`Runway above ${t} months`, `Runway sopra i ${t} mesi`),
    description: (t) => lt(`End the round with at least ${t} months of runway.`, `Chiudi il round con almeno ${t} mesi di runway.`),
  },
  morale: {
    kind: "morale", icon: "Heart", launched: null, targets: { easy: 0.7, medium: 0.8, hard: 0.9 },
    title: (t) => lt(`Team morale above ${pctT(t)}`, `Morale del team sopra il ${pctT(t)}`),
    description: (t) => lt(`Finish the round with team morale at ${pctT(t)} or higher.`, `Chiudi il round con il morale del team al ${pctT(t)} o più.`),
  },
  nps: {
    kind: "nps", icon: "Star", launched: true, targets: { easy: 20, medium: 40, hard: 60 },
    title: (t) => lt(`NPS above ${t}`, `NPS sopra ${t}`),
    description: (t) => lt(`Customers must love you: end the round with an NPS of at least ${t}.`, `I clienti devono amarvi: chiudi il round con un NPS di almeno ${t}.`),
  },
  frugal: {
    kind: "frugal", icon: "PiggyBank", launched: null, targets: { easy: 12_000, medium: 7_000, hard: 4_000 },
    title: (t) => lt(`Frugal: budgets under ${Math.round(t / 1000)}k/month`, `Frugale: budget sotto ${Math.round(t / 1000)}k/mese`),
    description: (t) => lt(`Keep R&D + marketing + ops budgets at or below ${Math.round(t / 1000)}k per month this round.`, `Tieni i budget R&S + marketing + ops entro ${Math.round(t / 1000)}k al mese in questo round.`),
  },
  pitch: {
    kind: "pitch", icon: "Presentation", launched: null, targets: { easy: 1, medium: 1, hard: 1 },
    title: () => lt("Pitch an investor", "Fai un pitch a un investitore"),
    description: () => lt("Send at least one pitch this round, whatever the answer.", "Invia almeno un pitch in questo round, qualunque sia la risposta."),
  },
  community: {
    kind: "community", icon: "Megaphone", launched: null, targets: { easy: 1, medium: 1, hard: 1 },
    title: () => lt("Get noticed", "Fatti notare"),
    description: () => lt("Run a reputation action this round (PR, events or community).", "Fai un'azione di reputazione in questo round (PR, eventi o community)."),
  },
};

export const CHALLENGE_KINDS = Object.keys(CHALLENGE_DEFS) as ChallengeKind[];

export interface ShowdownDef {
  kind: ShowdownKind;
  icon: string;
  launched: boolean | null;
  title: LText;
  description: LText;
  /** How the value is displayed: percent, number, money or months. */
  format: "pct" | "num" | "money" | "months" | "points";
  higherIsBetter: boolean;
}

export const SHOWDOWN_DEFS: Record<ShowdownKind, ShowdownDef> = {
  mrrSprint: { kind: "mrrSprint", icon: "TrendingUp", launched: true, format: "pct", higherIsBetter: true, title: lt("MRR sprint", "Sprint dell'MRR"), description: lt("The team with the highest MRR growth this round wins the cup.", "Il team con la crescita dell'MRR più alta in questo round vince la coppa.") },
  customerRush: { kind: "customerRush", icon: "Users", launched: true, format: "num", higherIsBetter: true, title: lt("Customer rush", "Corsa ai clienti"), description: lt("Most new customers acquired in the round.", "Più nuovi clienti acquisiti nel round.") },
  retentionDuel: { kind: "retentionDuel", icon: "Lock", launched: true, format: "pct", higherIsBetter: false, title: lt("Retention duel", "Duello della retention"), description: lt("Lowest monthly churn among launched teams.", "Churn mensile più basso tra i team già lanciati.") },
  pmfRace: { kind: "pmfRace", icon: "Target", launched: null, format: "points", higherIsBetter: true, title: lt("PMF race", "Corsa al PMF"), description: lt("Biggest gain in product-market fit score.", "Maggior guadagno di punteggio di product-market fit.") },
  moraleCup: { kind: "moraleCup", icon: "Heart", launched: null, format: "pct", higherIsBetter: true, title: lt("Morale cup", "Coppa del morale"), description: lt("Happiest team at the end of the round.", "Team più felice alla fine del round.") },
  efficiencyCup: { kind: "efficiencyCup", icon: "Timer", launched: null, format: "months", higherIsBetter: true, title: lt("Efficiency cup", "Coppa dell'efficienza"), description: lt("Longest runway at the end of the round (capped at 36 months).", "Runway più lunga alla fine del round (massimo 36 mesi).") },
  brandBattle: { kind: "brandBattle", icon: "Megaphone", launched: null, format: "points", higherIsBetter: true, title: lt("Brand battle", "Battaglia del brand"), description: lt("Biggest brand awareness gain in the round.", "Maggior crescita della notorietà del brand nel round.") },
  fundraisingDerby: { kind: "fundraisingDerby", icon: "HandCoins", launched: null, format: "money", higherIsBetter: true, title: lt("Fundraising derby", "Derby della raccolta"), description: lt("Most external money brought in during the round.", "Più capitali esterni portati in cassa durante il round.") },
  buildSprint: { kind: "buildSprint", icon: "Hammer", launched: false, format: "pct", higherIsBetter: true, title: lt("Build sprint", "Sprint di sviluppo"), description: lt("Biggest MVP progress (or quality gain once launched) in the round.", "Maggior avanzamento dell'MVP (o guadagno di qualità dopo il lancio) nel round.") },
};

export const SHOWDOWN_KINDS = Object.keys(SHOWDOWN_DEFS) as ShowdownKind[];

export interface InteractionDef {
  kind: InteractionKind;
  icon: string;
  title: LText;
  description: LText;
  tone: "good" | "warn" | "bad" | "accent";
}

export const INTERACTION_DEFS: Record<InteractionKind, InteractionDef> = {
  shoutout: { kind: "shoutout", icon: "Megaphone", tone: "good", title: lt("Shout-out", "Shout-out"), description: lt("Publicly praise another team: morale and brand up for both, +15 XP each.", "Elogia pubblicamente un altro team: morale e brand su per entrambi, +15 XP a testa.") },
  mentorship: { kind: "mentorship", icon: "Lightbulb", tone: "accent", title: lt("Mentorship", "Mentorship"), description: lt("Share what you learned: they learn faster (PMF), you earn +40 XP but lose a little focus.", "Condividi quello che hai imparato: loro imparano più in fretta (PMF), tu guadagni +40 XP ma perdi un po' di focus.") },
  taunt: { kind: "taunt", icon: "Swords", tone: "warn", title: lt("Taunt", "Sfottò"), description: lt("Call out a rival in the press: media attention for you, stress for them. Backfires if you are behind them.", "Punzecchia un rivale sulla stampa: attenzione dei media per te, stress per loro. Si ritorce contro se sei dietro di loro.") },
  poach: { kind: "poach", icon: "UserMinus", tone: "bad", title: lt("Poach talent", "Soffia un talento"), description: lt("Try to recruit one of their employees with a 15% raise. Works better when their morale is low.", "Prova a reclutare un loro dipendente con un aumento del 15%. Funziona meglio se il loro morale è basso.") },
};

export const INTERACTION_KINDS = Object.keys(INTERACTION_DEFS) as InteractionKind[];
