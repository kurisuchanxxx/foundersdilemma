// Product strategy: which customers to target (Moore's beachhead) and how to charge them.
import { lt, type LText } from "../text";
import type { Company, Decision, ModifierEffects, PricingModel, RoundReport, TargetSegment } from "../types";

// local helpers (util.ts imports this module)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

export interface StrategyEffects {
  /** Multiplier on the share of the sector's market the company can reach. */
  tam: number;
  /** Multiplier on how fast the team learns what customers need (PMF dynamics). */
  pmfLearn: number;
  /** Multiplier on price elasticity (lower = customers less sensitive to price). */
  elasticity: number;
  /** Extra dependence on salespeople (0-1, added to the sector's). */
  salesDep: number;
  /** Multiplier on outbound deals per salesperson. */
  outbound: number;
  /** CAC multiplier when the company is in the chasm without enough PMF. */
  chasm: number;
  /** Effects folded into the company's modifiers. */
  mods: ModifierEffects;
}

export const SEGMENT_INFO: Record<TargetSegment, { label: LText; description: LText }> = {
  niche: {
    label: lt("Niche (beachhead)", "Nicchia (testa di ponte)"),
    description: lt(
      "A narrow group with an urgent problem. You learn faster and win them cheaply, but the market you can reach is about a third of the sector.",
      "Un gruppo ristretto con un problema urgente. Impari più in fretta e li conquisti con poco, ma il mercato raggiungibile è circa un terzo del settore.",
    ),
  },
  broad: {
    label: lt("Broad market", "Mercato ampio"),
    description: lt("Everyone in the sector. The biggest market, but needs are mixed and harder to satisfy.", "Tutto il settore. Il mercato più grande, ma i bisogni sono eterogenei e più difficili da soddisfare."),
  },
  premium: {
    label: lt("Premium / large customers", "Premium / grandi clienti"),
    description: lt(
      "Demanding customers who pay much more and stay longer, if quality is high. Fewer of them, more expensive to win, sales-heavy.",
      "Clienti esigenti che pagano molto di più e restano più a lungo, se la qualità è alta. Sono pochi, costosi da conquistare e richiedono venditori.",
    ),
  },
};

export const PRICING_INFO: Record<PricingModel, { label: LText; description: LText }> = {
  subscription: {
    label: lt("Subscription", "Abbonamento"),
    description: lt("A fixed monthly fee. Predictable revenue: the reference model.", "Un canone mensile fisso. Ricavi prevedibili: il modello di riferimento."),
  },
  freemium: {
    label: lt("Freemium", "Freemium"),
    description: lt(
      "A free tier that spreads by word of mouth and converts some users to paid. Cheaper acquisition, but lower willingness to pay, higher churn and the cost of serving free users.",
      "Una versione gratuita che si diffonde col passaparola e converte una parte degli utenti a pagamento. Acquisizione più economica, ma disponibilità a pagare più bassa, churn più alto e il costo di servire chi non paga.",
    ),
  },
  usage: {
    label: lt("Usage-based", "A consumo"),
    description: lt(
      "Customers pay for what they use. Easier to start (price matters less) and customers stay longer, but the average bill is smaller at first.",
      "I clienti pagano quello che usano. È più facile iniziare (il prezzo conta meno) e i clienti restano più a lungo, ma all'inizio la spesa media è più bassa.",
    ),
  },
};

export function strategyEffects(c: Pick<Company, "segment" | "pricingModel" | "product">): StrategyEffects {
  const fx: StrategyEffects = { tam: 1, pmfLearn: 1, elasticity: 1, salesDep: 0, outbound: 1, chasm: 1.5, mods: { cac: 1, churn: 1, wtp: 1, organic: 1, gm: 0 } };
  const m = fx.mods as Required<Pick<ModifierEffects, "cac" | "churn" | "wtp" | "organic" | "gm">>;
  switch (c.segment) {
    case "niche":
      fx.tam = 0.3;
      fx.pmfLearn = 1.3;
      fx.chasm = 1.2;
      m.cac *= 0.85;
      m.churn *= 0.9;
      m.wtp *= 1.05;
      break;
    case "premium":
      fx.tam = 0.4;
      fx.salesDep = 0.25;
      fx.outbound = 0.7;
      m.cac *= 1.5;
      m.churn *= 0.75;
      // premium customers pay for quality
      m.wtp *= 1.7 * (0.75 + 0.5 * clamp01(c.product.quality));
      break;
    default:
      break;
  }
  switch (c.pricingModel) {
    case "freemium":
      m.cac *= 0.7;
      m.organic *= 1.6;
      m.wtp *= 0.85;
      m.churn *= 1.1;
      m.gm -= 0.07;
      break;
    case "usage":
      fx.elasticity = 0.6;
      m.cac *= 0.95;
      m.wtp *= 0.9;
      m.churn *= 0.85;
      m.gm -= 0.02;
      break;
    default:
      break;
  }
  return fx;
}

/** Changing target or pricing model has a cost once customers exist. Returns the customers lost. */
export function applyStrategySwitch(c: Company, d: Decision, report: RoundReport | null): number {
  let lost = 0;
  const launched = c.product.launched && c.customers > 0;
  if (d.targetSegment !== c.segment) {
    if (launched) {
      const l = c.customers * 0.12;
      c.customers -= l;
      lost += l;
      c.pmf.marketPull = clamp01(c.pmf.marketPull - 0.08);
      c.pmf.solutionFit = clamp01(c.pmf.solutionFit * 0.92);
    }
    report?.lines.push({
      kind: "product",
      text: launched
        ? lt("New target customers: some current customers leave and the product must adapt (PMF down a little).", "Nuovi clienti obiettivo: una parte dei clienti attuali se ne va e il prodotto deve adattarsi (PMF un po' più basso).")
        : lt("New target customers chosen before launch: no cost.", "Nuovi clienti obiettivo scelti prima del lancio: nessun costo."),
    });
    c.segment = d.targetSegment;
  }
  if (d.pricingModel !== c.pricingModel) {
    if (launched) {
      const l = c.customers * 0.05;
      c.customers -= l;
      lost += l;
      c.brand = clamp(c.brand - 0.02, 0, 1);
    }
    report?.lines.push({
      kind: "product",
      text: launched
        ? lt("Pricing model changed: a few customers did not like it.", "Modello di prezzo cambiato: ad alcuni clienti non è piaciuto.")
        : lt("Pricing model set before launch.", "Modello di prezzo definito prima del lancio."),
    });
    c.pricingModel = d.pricingModel;
  }
  if (lost > 0) c.mrr = c.customers * c.price;
  return lost;
}
