// Named competitors outside the game (fictional companies). Two start in each sector;
// the others may enter later.
import { lt, type LText } from "../text";
import type { ModifierEffects, SectorId } from "../types";

export const RIVAL_NAMES: Record<SectorId, string[]> = {
  saas: ["Cloudlane", "Opsfield", "Taskwise", "Ledgerline"],
  consumer: ["Snapnest", "Moodly", "Hoppa", "Glimmo"],
  ecommerce: ["Cartiva", "Shopwell", "Boxeta", "Vendora"],
  deeptech: ["Quantora", "Fotonix", "Atomica Labs", "Kinetra"],
  fintech: ["Paylio", "Monetica", "Spendly", "Cassaforte"],
  healthtech: ["Curevo", "Medisync", "Vitalink", "Salubra"],
  marketplace: ["Gigloop", "Tradeo", "Rentaly", "Scambio"],
  aiinfra: ["Tensorly", "InferOne", "Modelia", "Vectra Cloud"],
};

export type RivalMoveId = "priceWar" | "adBlitz" | "featureLaunch" | "fundraise" | "talentRaid" | "stumble";

export interface RivalMoveTemplate {
  id: RivalMoveId;
  weight: number;
  rounds: number;
  effects: ModifierEffects;
  impact: "positive" | "negative" | "neutral";
  concept: string;
  title: LText;
  description: LText;
}

export const RIVAL_MOVES: RivalMoveTemplate[] = [
  {
    id: "priceWar",
    weight: 1,
    rounds: 2,
    effects: { wtp: 0.9 },
    impact: "negative",
    concept: "pricing",
    title: lt("{r} cuts prices by 20%", "{r} taglia i prezzi del 20%"),
    description: lt(
      "A price war in the sector: customers expect to pay less (willingness to pay -10% for two rounds). Compete on value, not only on price.",
      "Guerra dei prezzi nel settore: i clienti si aspettano di pagare meno (disponibilità a pagare -10% per due round). Competete sul valore, non solo sul prezzo.",
    ),
  },
  {
    id: "adBlitz",
    weight: 1.2,
    rounds: 1,
    effects: { cac: 1.15 },
    impact: "negative",
    concept: "cac",
    title: lt("{r} launches a massive ad campaign", "{r} lancia una campagna pubblicitaria massiccia"),
    description: lt("Advertising space gets crowded: acquiring customers costs 15% more this round.", "Gli spazi pubblicitari si affollano: acquisire clienti costa il 15% in più in questo round."),
  },
  {
    id: "featureLaunch",
    weight: 1,
    rounds: 2,
    effects: { churn: 1.08 },
    impact: "negative",
    concept: "competitorMoves",
    title: lt("{r} releases a new version of its product", "{r} rilascia una nuova versione del prodotto"),
    description: lt("Customers compare: churn +8% for two rounds unless your product keeps up.", "I clienti confrontano: churn +8% per due round, se il tuo prodotto non tiene il passo."),
  },
  {
    id: "fundraise",
    weight: 0.8,
    rounds: 1,
    effects: { salaryAsk: 1.05 },
    impact: "negative",
    concept: "fundingClimate",
    title: lt("{r} raises a big round", "{r} chiude un grande round di finanziamento"),
    description: lt("A better-funded competitor: it will be more aggressive and hires compete for the same people.", "Un concorrente con più capitali: sarà più aggressivo e compete per le stesse persone."),
  },
  {
    id: "talentRaid",
    weight: 0.6,
    rounds: 1,
    effects: { salaryAsk: 1.12, hiringBar: 0.03 },
    impact: "negative",
    concept: "equityCompensation",
    title: lt("{r} hires aggressively", "{r} assume in modo aggressivo"),
    description: lt("Candidates in the sector ask for more (+12%) and are harder to convince this round.", "I candidati del settore chiedono di più (+12%) e sono più difficili da convincere in questo round."),
  },
  {
    id: "stumble",
    weight: 0.5,
    rounds: 2,
    effects: { demand: 1.06 },
    impact: "positive",
    concept: "competitorMoves",
    title: lt("{r} shuts down", "{r} chiude i battenti"),
    description: lt("Its customers look for an alternative: demand in the sector +6% for two rounds.", "I suoi clienti cercano un'alternativa: domanda nel settore +6% per due round."),
  },
];

export const RIVAL_ENTRY = {
  title: lt("New competitor: {r} enters the market", "Nuovo concorrente: {r} entra nel mercato"),
  description: lt("One more company chases the same customers: competition goes up.", "Un'azienda in più insegue gli stessi clienti: la concorrenza aumenta."),
};
