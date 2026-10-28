import { lt, moneyL, type LText, type LTextParams } from "../text";
import type { Company, EffectBundle, GameState, SectorId } from "../types";
import { SECTORS } from "./sectors";

// "Founder's dilemmas": situations with no obviously right answer. Each one maps to a
// concept discussed in class (see docs/corso). Inspired by N. Wasserman, "The Founder's
// Dilemmas" (2012), E. Ries "The Lean Startup" and common startup ethics cases.

export interface DilemmaContext {
  company: Company;
  state: GameState;
  /** Monthly net burn of the last round (positive = losing money). */
  netBurn: number;
  runway: number;
}

export type DilemmaSpecial =
  | { kind: "loseEmployee" }
  | { kind: "retainEmployee"; raisePct: number; equityPct: number }
  | { kind: "cofounderLeaves"; settlement: number }
  | { kind: "cofounderRisk"; probability: number }
  | { kind: "pivot" }
  | { kind: "bridge" }
  | { kind: "professionalCeo" }
  | { kind: "fightBoard" }
  | { kind: "office" }
  | { kind: "remote" }
  | { kind: "openSource" }
  | { kind: "layoffs"; share: number }
  | { kind: "salaryCut"; pct: number; rounds: number }
  | { kind: "acquihire" }
  | { kind: "bigClient" }
  | { kind: "annualPrepay" }
  /** Uses the amounts computed by `prepare`: `customers` added and/or `cashValue` paid or received. */
  | { kind: "scaled"; addCustomers?: boolean; cashSign?: 1 | -1 };

export interface DilemmaOutcomeBranch {
  effects: EffectBundle;
  text: LText;
  special?: DilemmaSpecial;
}

export interface DilemmaOptionDef {
  id: string;
  label: LText;
  description: LText;
  outcome: LText;
  effects?: EffectBundle;
  /** Consequence that may materialise in a later round. */
  risk?: { probability: number; delay: number; title: LText; description: LText; effects: EffectBundle };
  /** Uncertain result resolved immediately. */
  gamble?: { probability: number; success: DilemmaOutcomeBranch; failure: DilemmaOutcomeBranch };
  special?: DilemmaSpecial;
}

export interface DilemmaTemplate {
  id: string;
  title: LText;
  description: LText;
  concept: string;
  /** 0 = not eligible. */
  weight: (ctx: DilemmaContext) => number;
  /** Values for the texts; numbers and strings are also kept on the instance for the resolution. */
  prepare?: (ctx: DilemmaContext) => LTextParams | null;
  options: DilemmaOptionDef[];
}

const B2B: SectorId[] = ["saas", "deeptech", "healthtech", "aiinfra", "fintech"];

function investorSeats(c: Company): number {
  return c.board.investors + c.board.independents;
}

/** Money in each language's format ("€12k" / "12 k €"). */
const euro = (v: number) => moneyL(Math.round(v));

/** A share of the current customers as a new contract (at least one customer). */
function contractOf(c: Company, share: number) {
  const n = Math.max(1, Math.round(c.customers * share));
  return { customers: n, mrr: euro(n * c.price) };
}

function bestSeller(c: Company) {
  return c.team.find((e) => e.role === "Sales") ?? bestEmployee(c);
}

function bestEmployee(c: Company) {
  let best = c.team[0];
  let bestScore = -1;
  for (const e of c.team) {
    const s = Object.values(e.stats).reduce((a, b) => a + b, 0);
    if (s > bestScore) {
      best = e;
      bestScore = s;
    }
  }
  return best;
}

export const DILEMMAS: DilemmaTemplate[] = [
  {
    id: "big_client_custom",
    title: lt("The big client wants it their way", "Il grande cliente lo vuole a modo suo"),
    description: lt(
      "A large company offers a 12-month contract worth about {mrr}/month, but only if you build a set of custom features just for them.",
      "Una grande azienda offre un contratto di 12 mesi da circa {mrr}/mese, ma solo se sviluppi una serie di funzionalità su misura per lei.",
    ),
    concept: "focus",
    weight: ({ company }) => (company.product.launched && B2B.includes(company.sector) ? 1 : 0),
    prepare: ({ company }) => {
      const n = Math.max(1, Math.round(company.customers * 0.12));
      return { customers: n, mrr: moneyL(Math.round(n * company.price)) };
    },
    options: [
      {
        id: "accept",
        label: lt("Sign the contract", "Firma il contratto"),
        description: lt("Revenue now, but your roadmap bends to one customer.", "Ricavi subito, ma la roadmap si piega a un solo cliente."),
        outcome: lt("Contract signed. The team is busy with custom work for a while.", "Contratto firmato. Il team sarà impegnato sul lavoro custom per un po'."),
        effects: { techDebt: 0.1, problemClarity: -0.03, modifier: { rounds: 2, effects: { dev: 0.85 } } },
        special: { kind: "bigClient" },
      },
      {
        id: "decline",
        label: lt("Politely decline", "Rifiuta con cortesia"),
        description: lt("Stay focused on the product for the whole market.", "Resta concentrato sul prodotto per tutto il mercato."),
        outcome: lt("You stayed focused. The team appreciates the clarity.", "Sei rimasto concentrato. Il team apprezza la chiarezza."),
        effects: { problemClarity: 0.03, morale: 0.02 },
      },
    ],
  },
  {
    id: "poaching",
    title: lt("Big Tech wants your best person", "Una Big Tech vuole la tua persona migliore"),
    description: lt(
      "{employee} received an offer from a tech giant at almost double the salary. They like your mission, but it is a lot of money.",
      "{employee} ha ricevuto un'offerta da un colosso tecnologico a quasi il doppio dello stipendio. Ama la vostra missione, ma sono tanti soldi.",
    ),
    concept: "equityCompensation",
    weight: ({ company }) => (company.team.length >= 2 ? 0.9 : 0),
    prepare: ({ company }) => {
      const e = bestEmployee(company);
      return e ? { employeeId: e.id, employee: e.name } : null;
    },
    options: [
      {
        id: "counter",
        label: lt("Counter-offer: +25% salary", "Controfferta: +25% di stipendio"),
        description: lt("Keep them with cash. Others may hear about it.", "Lo trattieni con il denaro. Gli altri potrebbero saperlo."),
        outcome: lt("{employee} stays, with a big raise. Some colleagues feel it is unfair.", "{employee} resta, con un forte aumento. Alcuni colleghi lo trovano ingiusto."),
        effects: { morale: -0.03 },
        special: { kind: "retainEmployee", raisePct: 0.25, equityPct: 0 },
      },
      {
        id: "equity",
        label: lt("Promote and grant +1% equity", "Promuovi e dai +1% di equity"),
        description: lt("Bet on ownership: +10% salary and a new vesting grant.", "Punta sulla partecipazione: +10% di stipendio e una nuova assegnazione con vesting."),
        outcome: lt("{employee} accepts the promotion and new equity: now they are an owner.", "{employee} accetta la promozione e la nuova equity: ora è anche socio."),
        effects: { morale: 0.02 },
        special: { kind: "retainEmployee", raisePct: 0.1, equityPct: 0.01 },
      },
      {
        id: "letgo",
        label: lt("Let them go", "Lascialo andare"),
        description: lt("Wish them well and save the money.", "Auguragli buona fortuna e risparmia il denaro."),
        outcome: lt("{employee} left. The team feels the loss.", "{employee} se n'è andato. Il team sente la perdita."),
        effects: { morale: -0.04 },
        special: { kind: "loseEmployee" },
      },
    ],
  },
  {
    id: "cofounder_conflict",
    title: lt("Co-founder conflict", "Conflitto tra co-fondatori"),
    description: lt(
      "You and {cofounder} disagree on strategy and on who decides what. Meetings have become tense.",
      "Tu e {cofounder} non siete d'accordo sulla strategia e su chi decide cosa. Le riunioni sono diventate tese.",
    ),
    concept: "founderVesting",
    weight: ({ company }) => {
      const active = company.founders.filter((f) => f.active);
      if (active.length < 2) return 0;
      const same = active[0].archetype === active[1].archetype ? 0.3 : 0;
      return 0.5 + same + (company.founderStress > 0.6 ? 0.5 : 0);
    },
    prepare: ({ company }) => {
      const co = company.founders.filter((f) => f.active)[1];
      return co ? { cofounderId: co.id, cofounder: co.name } : null;
    },
    options: [
      {
        id: "mediate",
        label: lt("Hire a coach and define roles", "Ingaggia un coach e definite i ruoli"),
        description: lt("€6k and some time, but you write down who owns what.", "6k€ e un po' di tempo, ma mettete per iscritto chi è responsabile di cosa."),
        outcome: lt("The sessions helped: roles are clear and the tension drops.", "Le sessioni hanno aiutato: i ruoli sono chiari e la tensione cala."),
        effects: { cash: -6_000, stress: -0.1, morale: 0.02, modifier: { rounds: 1, effects: { dev: 0.95 } } },
      },
      {
        id: "buyout",
        label: lt("Part ways (buy-back)", "Separatevi (riacquisto quote)"),
        description: lt(
          "{cofounder} leaves. With founder vesting, unvested shares come back; without it, they keep everything.",
          "{cofounder} lascia l'azienda. Con il vesting dei fondatori le quote non maturate tornano indietro; senza, tiene tutto.",
        ),
        outcome: lt("{cofounder} left the company.", "{cofounder} ha lasciato l'azienda."),
        effects: { stress: 0.05, morale: -0.05 },
        special: { kind: "cofounderLeaves", settlement: 20_000 },
      },
      {
        id: "ignore",
        label: lt("Ignore it, it will pass", "Lascia correre, passerà"),
        description: lt("No cost today. Unresolved conflicts tend to explode later.", "Nessun costo oggi. I conflitti irrisolti tendono a esplodere più avanti."),
        outcome: lt("You moved on, but the issue is still there.", "Siete andati avanti, ma il problema resta."),
        effects: { stress: 0.1 },
        special: { kind: "cofounderRisk", probability: 0.4 },
      },
    ],
  },
  {
    id: "dark_patterns",
    title: lt("A growth hack with dark patterns", "Un growth hack con i dark pattern"),
    description: lt(
      "A consultant proposes hiding the cancel button and pre-ticking upsells. 'Everyone does it, churn will drop by a third.'",
      "Un consulente propone di nascondere il pulsante di disdetta e pre-selezionare gli upsell. 'Lo fanno tutti, il churn scenderà di un terzo.'",
    ),
    concept: "ethics",
    weight: ({ company }) =>
      company.product.launched && ["consumer", "ecommerce", "marketplace", "fintech"].includes(company.sector) ? 0.9 : 0,
    options: [
      {
        id: "do",
        label: lt("Do it", "Fallo"),
        description: lt("Lower churn now. Regulators and customers may notice.", "Churn più basso subito. Autorità e clienti potrebbero accorgersene."),
        outcome: lt("Churn drops... for now.", "Il churn scende... per ora."),
        effects: { modifier: { rounds: 2, effects: { churn: 0.75 } } },
        risk: {
          probability: 0.55,
          delay: 1,
          title: lt("Consumer authority fines you", "L'autorità per i consumatori ti multa"),
          description: lt(
            "Complaints about hidden cancellation led to a fine and a public backlash.",
            "I reclami sulla disdetta nascosta hanno portato a una multa e a una protesta pubblica.",
          ),
          effects: { cash: -40_000, rep: { customers: -20, media: -15 }, morale: -0.05, modifier: { rounds: 2, effects: { churn: 1.3 } } },
        },
      },
      {
        id: "refuse",
        label: lt("Refuse", "Rifiuta"),
        description: lt("Keep a clean, honest product.", "Mantieni un prodotto pulito e onesto."),
        outcome: lt("You refused. The team is proud of the decision.", "Hai rifiutato. Il team è orgoglioso della decisione."),
        effects: { morale: 0.03, rep: { customers: 3 } },
      },
    ],
  },
  {
    id: "data_shortcut",
    title: lt("Training on customer data", "Addestrare sui dati dei clienti"),
    description: lt(
      "Your engineers could use customer data to improve the product much faster. Explicit consent would slow you down.",
      "I tuoi ingegneri potrebbero usare i dati dei clienti per migliorare il prodotto molto più in fretta. Chiedere il consenso esplicito vi rallenterebbe.",
    ),
    concept: "ethics",
    weight: ({ company }) =>
      company.product.launched && ["aiinfra", "healthtech", "fintech", "saas"].includes(company.sector) ? 0.8 : 0,
    options: [
      {
        id: "shortcut",
        label: lt("Use the data quietly", "Usa i dati in silenzio"),
        description: lt("Big quality jump. GDPR risk.", "Grande salto di qualità. Rischio GDPR."),
        outcome: lt("The product improved quickly.", "Il prodotto è migliorato rapidamente."),
        effects: { quality: 0.06, solutionFit: 0.04 },
        risk: {
          probability: 0.35,
          delay: 1,
          title: lt("Data protection investigation", "Indagine del Garante privacy"),
          description: lt(
            "A customer discovered how their data was used. Fine, legal costs and lost trust.",
            "Un cliente ha scoperto come venivano usati i suoi dati. Multa, spese legali e fiducia persa.",
          ),
          effects: { cash: -60_000, rep: { customers: -20, media: -10 }, modifier: { rounds: 2, effects: { churn: 1.2 } } },
        },
      },
      {
        id: "consent",
        label: lt("Ask for consent first", "Chiedi prima il consenso"),
        description: lt("Slower, but customers trust you more.", "Più lento, ma i clienti si fidano di più."),
        outcome: lt("You asked for consent. Many customers agreed and appreciated it.", "Hai chiesto il consenso. Molti clienti hanno accettato e apprezzato."),
        effects: { quality: 0.02, rep: { customers: 5 }, modifier: { rounds: 1, effects: { dev: 0.92 } } },
      },
    ],
  },
  {
    id: "pivot_or_persevere",
    title: lt("Pivot or persevere?", "Pivot o perseverare?"),
    description: lt(
      "Months after launch, product-market fit is still weak. Customer interviews point to an adjacent problem that people seem to care about more.",
      "Mesi dopo il lancio, il product-market fit è ancora debole. Le interviste ai clienti indicano un problema vicino che sembra stare più a cuore alle persone.",
    ),
    concept: "pivot",
    weight: ({ company, state }) =>
      company.product.launched &&
      !company.flags.pivoted &&
      company.pmf.score < 38 &&
      state.round >= 4 &&
      (company.product.launchRound ?? state.round) <= state.round - 2
        ? 1.6
        : 0,
    options: [
      {
        id: "pivot",
        label: lt("Pivot", "Fai pivot"),
        description: lt(
          "Refocus on the new problem: you lose part of your customers and some of the product, but understand the market much better.",
          "Ti concentri sul nuovo problema: perdi parte dei clienti e del prodotto, ma capisci molto meglio il mercato.",
        ),
        outcome: lt("You pivoted. A risky but deliberate move.", "Hai fatto pivot. Una mossa rischiosa ma ragionata."),
        special: { kind: "pivot" },
      },
      {
        id: "persevere",
        label: lt("Persevere", "Persevera"),
        description: lt("Stay the course and keep iterating on the current product.", "Mantieni la rotta e continua a iterare sul prodotto attuale."),
        outcome: lt("You stayed the course.", "Hai mantenuto la rotta."),
        effects: { stress: 0.05, learningVelocity: 0.03 },
      },
    ],
  },
  {
    id: "bridge_offer",
    title: lt("Bridge round from your investors", "Round ponte dai tuoi investitori"),
    description: lt(
      "Runway is short. Your existing investors offer {amount} as a SAFE capped at {cap}, while your company is valued at about {val}: a cheap price for them.",
      "La runway è corta. I tuoi investitori attuali offrono {amount} con un SAFE con cap a {cap}, mentre l'azienda vale circa {val}: un prezzo conveniente per loro.",
    ),
    concept: "downRound",
    weight: ({ company, runway }) =>
      runway < 4.5 && company.capTable.holders.some((h) => h.kind === "investor") ? 2 : 0,
    prepare: ({ company, netBurn }) => {
      const amount = Math.max(50_000, Math.round((Math.max(netBurn, 10_000) * 6) / 10_000) * 10_000);
      // about half of the valuation, but never a bridge that buys more than 30% of the company
      const cap = Math.max(500_000, Math.round((company.valuation * 0.5) / 10_000) * 10_000, Math.ceil(amount / 0.3 / 10_000) * 10_000);
      return { amountValue: amount, capValue: cap, amount: moneyL(amount), cap: moneyL(cap), val: moneyL(company.valuation) };
    },
    options: [
      {
        id: "accept",
        label: lt("Accept the bridge", "Accetta il ponte"),
        description: lt("Survive, at the cost of heavy dilution later.", "Sopravvivi, al prezzo di una forte diluizione futura."),
        outcome: lt("The bridge round closed. You bought time.", "Il round ponte è stato chiuso. Hai comprato tempo."),
        special: { kind: "bridge" },
      },
      {
        id: "decline",
        label: lt("Decline and cut costs", "Rifiuta e taglia i costi"),
        description: lt("Keep your ownership, but you must reach profitability or raise elsewhere.", "Mantieni le quote, ma devi arrivare al pareggio o raccogliere altrove."),
        outcome: lt("You declined the bridge.", "Hai rifiutato il ponte."),
        effects: { stress: 0.05 },
      },
    ],
  },
  {
    id: "ceo_replacement",
    title: lt("The board wants a 'professional CEO'", "Il CdA vuole un 'CEO professionista'"),
    description: lt(
      "Growth is below plan. Investors control the board and propose an experienced CEO to replace you. You would stay as founder and shareholder.",
      "La crescita è sotto il piano. Gli investitori controllano il CdA e propongono un CEO esperto al tuo posto. Resteresti come fondatore e socio.",
    ),
    concept: "richVsKing",
    weight: ({ company, state, runway }) => {
      if (state.round < 4 || company.flags.ceoReplaced) return 0;
      if (investorSeats(company) < company.board.founders) return 0;
      const last = company.history[company.history.length - 1];
      const prev = company.history[company.history.length - 2];
      const struggling = runway < 6 || (last && prev && last.mrr <= prev.mrr * 1.05);
      return struggling ? 1.5 : 0;
    },
    options: [
      {
        id: "accept",
        label: lt("Step aside", "Fatti da parte"),
        description: lt(
          "A seasoned CEO joins (€150k/year). Better execution, less stress, but you lose control: Rich over King.",
          "Arriva un CEO esperto (150k€/anno). Esecuzione migliore, meno stress, ma perdi il controllo: Ricco invece che Re.",
        ),
        outcome: lt("A professional CEO now runs the company.", "Un CEO professionista ora guida l'azienda."),
        special: { kind: "professionalCeo" },
      },
      {
        id: "fight",
        label: lt("Fight for your role", "Lotta per il tuo ruolo"),
        description: lt(
          "Try to convince the board. Without a board majority you will probably lose, and the fight hurts the team.",
          "Prova a convincere il CdA. Senza la maggioranza nel consiglio probabilmente perderai, e lo scontro fa male al team.",
        ),
        outcome: lt("You fought the board.", "Hai sfidato il CdA."),
        special: { kind: "fightBoard" },
      },
    ],
  },
  {
    id: "remote_or_office",
    title: lt("Office or remote?", "Ufficio o remoto?"),
    description: lt(
      "The team is growing. A nice office downtown is available; half the team would prefer to stay remote.",
      "Il team sta crescendo. È disponibile un bell'ufficio in centro; metà del team preferirebbe restare da remoto.",
    ),
    concept: "culture",
    weight: ({ company }) => (company.team.length >= 4 && company.flags.officeMode === null ? 1.2 : 0),
    options: [
      {
        id: "office",
        label: lt("Open an office", "Apri un ufficio"),
        description: lt("Rent of €2.5k/month plus €250 per person. Better collaboration and culture.", "Affitto di 2,5k€/mese più 250€ a persona. Collaborazione e cultura migliori."),
        outcome: lt("You opened an office.", "Hai aperto un ufficio."),
        effects: { morale: 0.05 },
        special: { kind: "office" },
      },
      {
        id: "remote",
        label: lt("Stay remote-first", "Resta remote-first"),
        description: lt("No rent and a bigger talent pool, a little more coordination overhead.", "Nessun affitto e un bacino di talenti più ampio, un po' più di fatica nel coordinamento."),
        outcome: lt("You are a remote-first company.", "Siete un'azienda remote-first."),
        special: { kind: "remote" },
      },
    ],
  },
  {
    id: "influencer_campaign",
    title: lt("An influencer campaign", "Una campagna con un influencer"),
    description: lt(
      "A famous influencer proposes a campaign for €25k. It could make you go viral, or it could feel fake to your audience.",
      "Un influencer famoso propone una campagna da 25k€. Potrebbe renderti virale, oppure sembrare finta al tuo pubblico.",
    ),
    concept: "virality",
    weight: ({ company }) =>
      company.product.launched && ["consumer", "ecommerce"].includes(company.sector) && company.cash > 60_000 ? 0.9 : 0,
    options: [
      {
        id: "go",
        label: lt("Go for it (€25k)", "Vai (25k€)"),
        description: lt("High risk, high reward.", "Alto rischio, alto rendimento."),
        outcome: lt("The campaign went live.", "La campagna è partita."),
        effects: { cash: -25_000 },
        gamble: {
          probability: 0.6,
          success: {
            effects: { customersPct: 0.25, brand: 0.1, rep: { media: 8 } },
            text: lt("It worked: a wave of new customers!", "Ha funzionato: un'ondata di nuovi clienti!"),
          },
          failure: {
            effects: { rep: { customers: -8, media: -5 } },
            text: lt("It backfired: followers called it fake.", "Si è ritorta contro: i follower l'hanno trovata finta."),
          },
        },
      },
      {
        id: "skip",
        label: lt("Pass", "Passa"),
        description: lt("Keep the money for product and steady channels.", "Tieni i soldi per prodotto e canali stabili."),
        outcome: lt("You passed on the campaign.", "Hai rinunciato alla campagna."),
      },
    ],
  },
  {
    id: "open_source_core",
    title: lt("Open-source the core?", "Rendere open-source il core?"),
    description: lt(
      "Developers love open source. Releasing your core could create a community and free distribution, but some customers will use the free version.",
      "Gli sviluppatori amano l'open source. Rilasciare il core potrebbe creare una community e distribuzione gratuita, ma alcuni clienti useranno la versione gratis.",
    ),
    concept: "businessModel",
    weight: ({ company, state }) =>
      ["aiinfra", "saas"].includes(company.sector) && !company.flags.openSource && state.round <= 6 ? 0.6 : 0,
    options: [
      {
        id: "open",
        label: lt("Open-source it", "Rendilo open-source"),
        description: lt("Brand and organic growth up, willingness to pay down (open-core model).", "Brand e crescita organica in su, disponibilità a pagare in giù (modello open-core)."),
        outcome: lt("Your core is now open source.", "Il tuo core ora è open source."),
        effects: { brand: 0.25, rep: { talent: 10, media: 6 } },
        special: { kind: "openSource" },
      },
      {
        id: "closed",
        label: lt("Keep it proprietary", "Mantienilo proprietario"),
        description: lt("Protect pricing power.", "Proteggi il potere di prezzo."),
        outcome: lt("The product stays proprietary.", "Il prodotto resta proprietario."),
      },
    ],
  },
  {
    id: "sustainability",
    title: lt("Go sustainable?", "Diventare sostenibili?"),
    description: lt(
      "Switching to sustainable materials and fair suppliers would cost about 4 points of gross margin. Many customers say they care.",
      "Passare a materiali sostenibili e fornitori equi costerebbe circa 4 punti di margine lordo. Molti clienti dicono che ci tengono.",
    ),
    concept: "ethics",
    weight: ({ company }) =>
      ["ecommerce", "consumer", "marketplace"].includes(company.sector) && company.product.launched ? 0.6 : 0,
    options: [
      {
        id: "green",
        label: lt("Make the switch", "Fai il cambio"),
        description: lt("Lower margin, stronger brand and loyalty.", "Margine più basso, brand e fedeltà più forti."),
        outcome: lt("You switched to sustainable suppliers.", "Sei passato a fornitori sostenibili."),
        effects: { brand: 0.12, rep: { customers: 10, talent: 5 }, modifier: { rounds: 99, effects: { gm: -0.04, churn: 0.95 } } },
      },
      {
        id: "later",
        label: lt("Not now", "Non ora"),
        description: lt("Margins first, maybe later.", "Prima i margini, magari più avanti."),
        outcome: lt("You postponed the decision.", "Hai rimandato la decisione."),
      },
    ],
  },
  {
    id: "founder_burnout",
    title: lt("You are running on empty", "Sei allo stremo"),
    description: lt(
      "You sleep five hours a night and snap at the team. Your doctor tells you to slow down.",
      "Dormi cinque ore a notte e scatti con il team. Il medico ti dice di rallentare.",
    ),
    concept: "founderWellbeing",
    weight: ({ company }) => (company.founderStress > 0.7 ? 2 : 0),
    options: [
      {
        id: "rest",
        label: lt("Take two weeks off", "Prenditi due settimane"),
        description: lt("Less output this round, much less stress.", "Meno produzione in questo round, molto meno stress."),
        outcome: lt("You came back rested and clearer.", "Sei tornato riposato e più lucido."),
        effects: { stress: -0.3, modifier: { rounds: 1, effects: { dev: 0.88 } } },
      },
      {
        id: "push",
        label: lt("Push through", "Stringi i denti"),
        description: lt("Keep going. The body may decide for you.", "Vai avanti. Potrebbe decidere il tuo corpo per te."),
        outcome: lt("You kept pushing.", "Hai continuato a spingere."),
        effects: { stress: 0.05 },
        risk: {
          probability: 0.5,
          delay: 1,
          title: lt("Founder burnout", "Burnout del fondatore"),
          description: lt("You collapsed and had to stop for weeks. The company slowed down.", "Sei crollato e hai dovuto fermarti per settimane. L'azienda ha rallentato."),
          effects: { stress: 0.1, morale: -0.05, modifier: { rounds: 1, effects: { dev: 0.6, sales: 0.7 } } },
        },
      },
    ],
  },
  {
    id: "layoffs",
    title: lt("Cut the team?", "Tagliare il team?"),
    description: lt(
      "Cash is running out. You could let go of about {count} people, cut salaries for everyone, or keep going and hope for a round.",
      "La cassa si sta esaurendo. Potresti lasciare a casa circa {count} persone, tagliare gli stipendi a tutti, oppure andare avanti sperando in un round.",
    ),
    concept: "burnRate",
    weight: ({ company, runway }) => (runway < 5 && company.team.length >= 3 ? 1.6 : 0),
    prepare: ({ company }) => ({ count: Math.max(1, Math.ceil(company.team.length * 0.3)) }),
    options: [
      {
        id: "layoffs",
        label: lt("Lay off ~30%", "Licenzia ~30%"),
        description: lt("Severance now, much lower burn later. Morale takes a hit.", "Liquidazioni subito, burn molto più basso dopo. Il morale ne risente."),
        outcome: lt("You reduced the team.", "Hai ridotto il team."),
        effects: { morale: -0.12, rep: { talent: -8 } },
        special: { kind: "layoffs", share: 0.3 },
      },
      {
        id: "paycut",
        label: lt("Cut all salaries by 15%", "Taglia tutti gli stipendi del 15%"),
        description: lt("Everybody shares the pain for two rounds. Someone might leave.", "Tutti condividono il sacrificio per due round. Qualcuno potrebbe andarsene."),
        outcome: lt("Salaries are cut by 15% for two rounds.", "Gli stipendi sono tagliati del 15% per due round."),
        effects: { morale: -0.06 },
        special: { kind: "salaryCut", pct: 0.15, rounds: 2 },
      },
      {
        id: "keep",
        label: lt("Keep everyone", "Tieni tutti"),
        description: lt("Bet on a fundraising or on revenue growth.", "Scommetti su un round o sulla crescita dei ricavi."),
        outcome: lt("You kept the whole team.", "Hai tenuto tutto il team."),
        effects: { morale: 0.02, stress: 0.1 },
      },
    ],
  },
  {
    id: "acquihire_offer",
    title: lt("An acqui-hire offer", "Un'offerta di acqui-hire"),
    description: lt(
      "A large company is not interested in your product, but wants your team. It offers {value} to buy the company and shut the product down.",
      "Una grande azienda non è interessata al tuo prodotto, ma vuole il tuo team. Offre {value} per comprare l'azienda e chiudere il prodotto.",
    ),
    concept: "exit",
    weight: ({ company, state, runway }) =>
      state.round >= 3 && state.round < state.config.totalRounds && company.team.length >= 2 && (company.pmf.score < 35 || runway < 5) ? 1 : 0,
    prepare: ({ company }) => {
      const value = (company.team.length + company.founders.filter((f) => f.active).length) * 250_000;
      return { valueAmount: value, value: moneyL(value) };
    },
    options: [
      {
        id: "accept",
        label: lt("Accept and exit", "Accetta ed esci"),
        description: lt("The game ends for your company with a small, safe exit.", "Il gioco finisce per la tua azienda con un'uscita piccola ma sicura."),
        outcome: lt("You sold the company.", "Hai venduto l'azienda."),
        special: { kind: "acquihire" },
      },
      {
        id: "decline",
        label: lt("Decline", "Rifiuta"),
        description: lt("Keep building your own company.", "Continua a costruire la tua azienda."),
        outcome: lt("You declined: the journey continues.", "Hai rifiutato: il viaggio continua."),
        effects: { morale: 0.02 },
      },
    ],
  },
  {
    id: "annual_prepay",
    title: lt("Discount for annual prepayment?", "Sconto per pagamento annuale anticipato?"),
    description: lt(
      "Your CFO advisor suggests offering 20% off to customers who pay a year upfront. Cash now, less revenue later.",
      "Il tuo advisor finanziario suggerisce uno sconto del 20% ai clienti che pagano un anno in anticipo. Cassa subito, meno ricavi dopo.",
    ),
    concept: "cashVsRevenue",
    weight: ({ company }) => (company.product.launched && B2B.includes(company.sector) && company.mrr > 5_000 ? 0.8 : 0),
    prepare: ({ company }) => {
      const cash = Math.round((company.mrr * 0.25 * 12 * 0.8) / 1_000) * 1_000;
      return { cashValue: cash, cash: moneyL(cash) };
    },
    options: [
      {
        id: "offer",
        label: lt("Offer the discount", "Offri lo sconto"),
        description: lt(
          "About a quarter of customers prepay: ~{cash} now, then no payments from them for 12 months (you gave up 20% of that revenue), but they will not churn.",
          "Circa un quarto dei clienti paga in anticipo: ~{cash} subito, poi per 12 mesi nessun pagamento da loro (hai rinunciato al 20% di quei ricavi), ma non abbandoneranno.",
        ),
        outcome: lt("Prepaid contracts boosted your cash today; the next 12 months will bring in less.", "I contratti prepagati hanno rinforzato la cassa oggi; i prossimi 12 mesi incasserai meno."),
        effects: { modifier: { rounds: 2, effects: { churn: 0.85 } } },
        special: { kind: "annualPrepay" },
      },
      {
        id: "no",
        label: lt("Keep monthly billing", "Mantieni la fatturazione mensile"),
        description: lt("No discounts.", "Niente sconti."),
        outcome: lt("Billing stays monthly.", "La fatturazione resta mensile."),
      },
    ],
  },

  // ---------------------------------------------------------------- realistic cases (v3)
  {
    id: "inflated_metrics",
    title: lt("Inflate the numbers for the round?", "Gonfiare i numeri per il round?"),
    description: lt(
      "Before the fundraising, an advisor suggests counting pilots and letters of intent as recurring revenue in the deck: your ARR would look almost twice as big.",
      "Prima del round, un advisor suggerisce di contare nel pitch deck anche i progetti pilota e le lettere d'intenti come ricavi ricorrenti: l'ARR sembrerebbe quasi il doppio.",
    ),
    concept: "ethics",
    weight: ({ company, state, runway }) => (company.product.launched && company.mrr > 0 && state.round >= 3 && runway < 10 ? 0.8 : 0),
    options: [
      {
        id: "inflate",
        label: lt("Present the inflated numbers", "Presenta i numeri gonfiati"),
        description: lt("Investors see a bigger company. If due diligence finds out, every fund will hear about it.", "Gli investitori vedono un'azienda più grande. Se la due diligence se ne accorge, lo sapranno tutti i fondi."),
        outcome: lt("The deck looks impressive.", "Il deck fa un'ottima impressione."),
        effects: { modifier: { rounds: 2, effects: { climate: 1.15, valuation: 1.15 } } },
        risk: {
          probability: 0.5,
          delay: 1,
          title: lt("Due diligence uncovers the inflated metrics", "La due diligence scopre i numeri gonfiati"),
          description: lt(
            "An investor compared the metrics with the contracts. Word travels fast among funds.",
            "Un investitore ha confrontato le metriche con i contratti. La voce gira in fretta tra i fondi.",
          ),
          effects: { rep: { investors: -30, media: -8 }, morale: -0.05, stress: 0.1, modifier: { rounds: 3, effects: { climate: 0.7, valuation: 0.85 } } },
        },
      },
      {
        id: "honest",
        label: lt("Keep pilots separate", "Tieni separati i pilot"),
        description: lt("A lower valuation, but numbers that survive any due diligence.", "Una valutazione più bassa, ma numeri che reggono qualsiasi due diligence."),
        outcome: lt("You presented honest numbers. Investors noticed the rigour.", "Hai presentato numeri onesti. Gli investitori hanno notato il rigore."),
        effects: { rep: { investors: 6 } },
      },
    ],
  },
  {
    id: "late_payer",
    title: lt("The biggest client pays in 120 days", "Il cliente più grande paga a 120 giorni"),
    description: lt(
      "A large corporation wants about {customers} licences, worth {mrr}/month. Its terms: payment at 120 days and penalties if the service stops.",
      "Una grande azienda vuole circa {customers} licenze, per {mrr}/mese. Le sue condizioni: pagamento a 120 giorni e penali se il servizio si interrompe.",
    ),
    concept: "cashVsRevenue",
    weight: ({ company }) => (company.product.launched && B2B.includes(company.sector) && company.mrr > 3_000 ? 0.8 : 0),
    prepare: ({ company }) => {
      const k = contractOf(company, 0.15);
      // four months of their revenue are financed by you
      return { ...k, cashValue: Math.round((k.customers * company.price * 4) / 1_000) * 1_000 };
    },
    options: [
      {
        id: "accept",
        label: lt("Accept their terms", "Accetta le condizioni"),
        description: lt("More customers and revenue, but you work four months before being paid: cash suffers.", "Più clienti e ricavi, ma lavori quattro mesi prima di essere pagato: la cassa ne risente."),
        outcome: lt("Contract signed. Revenue grows, cash has to wait.", "Contratto firmato. I ricavi crescono, la cassa deve aspettare."),
        special: { kind: "scaled", addCustomers: true, cashSign: -1 },
        risk: {
          probability: 0.15,
          delay: 2,
          title: lt("The client goes into insolvency proceedings", "Il cliente entra in procedura concorsuale"),
          description: lt("The invoices will be paid late and only in part.", "Le fatture saranno pagate in ritardo e solo in parte."),
          effects: { cash: -30_000, customersPct: -0.05, morale: -0.04 },
        },
      },
      {
        id: "negotiate",
        label: lt("Offer a discount for 60 days", "Proponi uno sconto per 60 giorni"),
        description: lt("Half the wait, a smaller contract. They might walk away.", "Metà dell'attesa, contratto più piccolo. Potrebbero rinunciare."),
        outcome: lt("You made a counter-proposal.", "Hai fatto una controproposta."),
        gamble: {
          probability: 0.55,
          success: { effects: { customersPct: 0.07 }, text: lt("They accepted 60 days.", "Hanno accettato i 60 giorni.") },
          failure: { effects: {}, text: lt("They chose a bigger competitor.", "Hanno scelto un concorrente più grande.") },
        },
      },
      {
        id: "decline",
        label: lt("Decline", "Rifiuta"),
        description: lt("No risk for your cash, no client.", "Nessun rischio per la cassa, nessun cliente."),
        outcome: lt("You declined the contract.", "Hai rifiutato il contratto."),
      },
    ],
  },
  {
    id: "public_tender",
    title: lt("A public tender", "Una gara d'appalto pubblica"),
    description: lt(
      "A regional authority opens a tender for a solution like yours: a three-year contract worth {value}. It takes weeks of paperwork, guarantees and a certified partner.",
      "Una regione apre una gara per una soluzione come la vostra: un contratto triennale da {value}. Servono settimane di documenti, garanzie e un partner certificato.",
    ),
    concept: "focus",
    weight: ({ company, state }) =>
      company.product.launched && state.round >= 3 && ["healthtech", "saas", "aiinfra", "deeptech"].includes(company.sector) ? (company.sector === "healthtech" ? 1 : 0.6) : 0,
    prepare: ({ company }) => {
      const value = Math.max(150_000, Math.round((company.mrr * 12 * 0.5) / 10_000) * 10_000);
      return { value: euro(value), customers: Math.max(1, Math.round(value / 36 / Math.max(1, company.price))) };
    },
    options: [
      {
        id: "bid",
        label: lt("Bid (€20k of consultants)", "Partecipa (20k€ di consulenze)"),
        description: lt("The team slows down for a round; if you win, a big and stable public client.", "Il team rallenta per un round; se vincete, un cliente pubblico grande e stabile."),
        outcome: lt("You submitted the bid.", "Avete presentato l'offerta."),
        effects: { cash: -20_000, modifier: { rounds: 1, effects: { dev: 0.85, sales: 0.85 } } },
        gamble: {
          probability: 0.35,
          success: {
            effects: { brand: 0.05, rep: { customers: 6, investors: 5 } },
            special: { kind: "scaled", addCustomers: true },
            text: lt("You won: a {value} public contract. They pay slowly, but it is a solid reference.", "Avete vinto: un contratto pubblico da {value}. Paga con calma, ma è una referenza solida."),
          },
          failure: { effects: { morale: -0.03 }, text: lt("A large system integrator won. At least you now know how tenders work.", "Ha vinto un grande system integrator. Almeno ora sapete come funzionano le gare.") },
        },
      },
      {
        id: "skip",
        label: lt("Let it go", "Lascia perdere"),
        description: lt("The team stays focused on private customers.", "Il team resta concentrato sui clienti privati."),
        outcome: lt("You stayed focused on the private market.", "Siete rimasti concentrati sul mercato privato."),
      },
    ],
  },
  {
    id: "ransomware",
    title: lt("Ransomware attack", "Attacco ransomware"),
    description: lt(
      "On a Friday night ransomware encrypts your servers: the service is down and the attackers ask for €40k in crypto. They may also have copied customer data.",
      "Un venerdì notte un ransomware cifra i server: il servizio è fermo e gli attaccanti chiedono 40k€ in criptovaluta. Forse hanno copiato anche i dati dei clienti.",
    ),
    concept: "techDebt",
    weight: ({ company }) => (company.product.launched ? 0.2 + company.product.techDebt : 0),
    options: [
      {
        id: "pay",
        label: lt("Pay quietly", "Paga in silenzio"),
        description: lt("The service may be back fast, if the criminals keep their word. Not notifying customers breaks GDPR.", "Il servizio può tornare in fretta, se i criminali mantengono la parola. Non avvisare i clienti viola il GDPR."),
        outcome: lt("You paid the ransom.", "Avete pagato il riscatto."),
        effects: { cash: -40_000 },
        gamble: {
          probability: 0.7,
          success: { effects: {}, text: lt("The keys worked: the service was back in a day.", "Le chiavi hanno funzionato: il servizio è ripartito in un giorno.") },
          failure: {
            effects: { rep: { customers: -8 }, modifier: { rounds: 1, effects: { churn: 1.25, dev: 0.8 } } },
            text: lt("The keys did not work: you paid for nothing.", "Le chiavi non funzionavano: avete pagato per niente."),
          },
        },
        risk: {
          probability: 0.4,
          delay: 1,
          title: lt("The stolen data ends up online", "I dati rubati finiscono online"),
          description: lt("Customers learn about the breach from the press. A GDPR fine follows.", "I clienti scoprono la violazione dai giornali. Segue una sanzione GDPR."),
          effects: { cash: -50_000, rep: { customers: -25, media: -15 }, modifier: { rounds: 2, effects: { churn: 1.3 } } },
        },
      },
      {
        id: "restore",
        label: lt("Restore from backups and notify", "Ripristina dai backup e notifica"),
        description: lt("A week of work and some customers lost, but transparency and the 72-hour GDPR notice respected.", "Una settimana di lavoro e qualche cliente perso, ma trasparenza e notifica GDPR entro 72 ore rispettate."),
        outcome: lt("You restored the service and told customers and the authority what happened.", "Avete ripristinato il servizio e spiegato a clienti e Garante cosa è successo."),
        effects: { customersPct: -0.03, techDebt: -0.05, morale: -0.02, rep: { customers: 4 }, modifier: { rounds: 1, effects: { dev: 0.75, churn: 1.12 } } },
      },
    ],
  },
  {
    id: "license_gray_zone",
    title: lt("Launch before the authorisation?", "Lanciare prima dell'autorizzazione?"),
    description: lt(
      "The regulator's authorisation (a payment licence or the CE marking of a medical device) will take six more months. A competitor already launched a similar feature in a legal grey zone.",
      "L'autorizzazione dell'autorità (licenza per i pagamenti o marcatura CE del dispositivo medico) arriverà tra sei mesi. Un concorrente ha già lanciato una funzione simile in una zona grigia normativa.",
    ),
    concept: "regulation",
    weight: ({ company, state }) => (["fintech", "healthtech"].includes(company.sector) && state.round >= 2 ? 0.8 : 0),
    options: [
      {
        id: "launch",
        label: lt("Launch now in the grey zone", "Lancia ora nella zona grigia"),
        description: lt("You get customers first. If the authority intervenes, fine and suspension.", "Arrivi prima ai clienti. Se l'autorità interviene, multa e sospensione."),
        outcome: lt("You launched without waiting.", "Avete lanciato senza aspettare."),
        effects: { customersPct: 0.12, modifier: { rounds: 2, effects: { demand: 1.1 } } },
        risk: {
          probability: 0.4,
          delay: 1,
          title: lt("The authority fines you and suspends the service", "L'autorità vi multa e sospende il servizio"),
          description: lt("An inspection found the service running without authorisation.", "Un'ispezione ha trovato il servizio attivo senza autorizzazione."),
          effects: { cash: -60_000, rep: { customers: -15, investors: -15, media: -10 }, modifier: { rounds: 2, effects: { demand: 0.75, churn: 1.2 } } },
        },
      },
      {
        id: "partner",
        label: lt("Use an authorised partner", "Appoggiati a un partner autorizzato"),
        description: lt("An already licensed institution or manufacturer covers you: you start now, but give up part of the margin.", "Un istituto o un produttore già autorizzato vi fa da ombrello: partite subito, ma cedete una parte del margine."),
        outcome: lt("You launched under a partner's licence.", "Avete lanciato con la licenza di un partner."),
        effects: { rep: { investors: 3 }, modifier: { rounds: 3, effects: { gm: -0.06 } } },
      },
      {
        id: "wait",
        label: lt("Wait for the authorisation", "Aspetta l'autorizzazione"),
        description: lt("No legal risk; the competitor gets the first customers.", "Nessun rischio legale; il concorrente si prende i primi clienti."),
        outcome: lt("You are waiting for the authorisation.", "State aspettando l'autorizzazione."),
        effects: { rep: { investors: 4 }, modifier: { rounds: 2, effects: { cac: 1.1 } } },
      },
    ],
  },
  {
    id: "platform_risk",
    title: lt("The platform changes the rules", "La piattaforma cambia le regole"),
    description: lt(
      "{platform} {change}. A large part of your business depends on that channel.",
      "{platformIt} {changeIt}. Gran parte del vostro business dipende da quel canale.",
    ),
    concept: "businessModel",
    weight: ({ company }) => (company.product.launched && ["consumer", "ecommerce", "aiinfra", "marketplace"].includes(company.sector) ? 0.7 : 0),
    prepare: ({ company }) => {
      const byS: Record<string, [string, string, string, string]> = {
        consumer: ["The app store", "now keeps 30% of every subscription sold in the app", "L'app store", "ora trattiene il 30% su ogni abbonamento venduto in app"],
        ecommerce: ["The marketplace you sell on", "raises its fees and promotes its own private label", "Il marketplace su cui vendete", "alza le commissioni e mette in evidenza i propri prodotti"],
        aiinfra: ["Your AI model provider", "triples the price of its API", "Il fornitore del modello di AI che usate", "triplica il prezzo delle API"],
        marketplace: ["The search engine", "changes its algorithm and your organic traffic collapses", "Il motore di ricerca", "cambia algoritmo e il vostro traffico organico crolla"],
      };
      const [platform, change, platformIt, changeIt] = byS[company.sector] ?? byS.consumer;
      return { platform, change, platformIt, changeIt };
    },
    options: [
      {
        id: "diversify",
        label: lt("Invest to depend less on it", "Investi per dipenderne meno"),
        description: lt("Your own channels, a second supplier: €30k and a slower round, then the margin is safe.", "Canali propri, un secondo fornitore: 30k€ e un round più lento, poi il margine è al sicuro."),
        outcome: lt("You started reducing your dependence on the platform.", "Avete iniziato a ridurre la dipendenza dalla piattaforma."),
        effects: { cash: -30_000, techDebt: 0.03, modifier: { rounds: 1, effects: { dev: 0.85, organic: 0.85 } } },
      },
      {
        id: "passon",
        label: lt("Raise prices for customers", "Alza i prezzi ai clienti"),
        description: lt("The margin holds, but some customers do not accept the increase.", "Il margine regge, ma una parte dei clienti non accetta l'aumento."),
        outcome: lt("You passed the cost on to customers.", "Avete scaricato il costo sui clienti."),
        effects: { customersPct: -0.07, rep: { customers: -4 } },
      },
      {
        id: "absorb",
        label: lt("Absorb the hit", "Assorbi il colpo"),
        description: lt("Nothing changes for customers; the margin drops for good.", "Per i clienti non cambia nulla; il margine scende per sempre."),
        outcome: lt("You absorbed the higher costs.", "Avete assorbito i costi più alti."),
        effects: { modifier: { rounds: 99, effects: { gm: -0.06 } } },
      },
    ],
  },
  {
    id: "pilot_purgatory",
    title: lt("A free pilot for a multinational", "Il pilota gratuito della multinazionale"),
    description: lt(
      "A multinational proposes a free six-month pilot, promising a huge contract if it goes well. It needs dedicated integrations and one of your people on the project.",
      "Una multinazionale propone un progetto pilota gratuito di sei mesi, promettendo un contratto enorme se va bene. Servono integrazioni dedicate e una persona del vostro team sul progetto.",
    ),
    concept: "focus",
    weight: ({ company, state }) => (company.product.launched && B2B.includes(company.sector) && state.round >= 2 ? 0.8 : 0),
    options: [
      {
        id: "free",
        label: lt("Accept the free pilot", "Accetta il pilota gratuito"),
        description: lt("A prestigious logo, but months of unpaid work. Most pilots never become contracts.", "Un logo prestigioso, ma mesi di lavoro non pagato. La maggior parte dei pilot non diventa mai un contratto."),
        outcome: lt("The pilot started.", "Il pilota è partito."),
        effects: { modifier: { rounds: 2, effects: { dev: 0.85, sales: 0.85 } } },
        gamble: {
          probability: 0.3,
          success: {
            effects: { customersPct: 0.15, brand: 0.08, rep: { investors: 8, customers: 5 } },
            text: lt("The pilot became a contract: a reference that opens many doors.", "Il pilota è diventato un contratto: una referenza che apre molte porte."),
          },
          failure: { effects: { morale: -0.04 }, text: lt("After six months the budget moved elsewhere: no contract.", "Dopo sei mesi il budget è stato spostato altrove: niente contratto.") },
        },
      },
      {
        id: "paid",
        label: lt("Ask for a paid pilot", "Chiedi un pilota a pagamento"),
        description: lt("A small but paid pilot proves the problem matters to them.", "Un pilota piccolo ma pagato dimostra che il problema per loro è reale."),
        outcome: lt("You asked them to pay for the pilot.", "Avete chiesto di pagare il pilota."),
        gamble: {
          probability: 0.5,
          success: { effects: { cash: 25_000, customersPct: 0.06, rep: { investors: 4 } }, text: lt("They agreed to pay: a strong signal of interest.", "Hanno accettato di pagare: un segnale forte di interesse.") },
          failure: { effects: {}, text: lt("They gave up: it was not a priority for them.", "Hanno rinunciato: per loro non era una priorità.") },
        },
      },
      {
        id: "decline",
        label: lt("Decline", "Rifiuta"),
        description: lt("Stay focused on the customers who already pay.", "Resta concentrato sui clienti che già pagano."),
        outcome: lt("You declined the pilot.", "Avete rifiutato il pilota."),
      },
    ],
  },
  {
    id: "controversial_client",
    title: lt("A controversial client", "Un cliente controverso"),
    description: lt(
      "An online gambling company wants to use your product to profile its players and offers {mrr}/month. Part of the team is against it.",
      "Un'azienda di gioco d'azzardo online vuole usare il vostro prodotto per profilare i giocatori e offre {mrr}/mese. Una parte del team è contraria.",
    ),
    concept: "ethics",
    weight: ({ company }) => (company.product.launched && ["saas", "aiinfra", "fintech"].includes(company.sector) ? 0.6 : 0),
    prepare: ({ company }) => contractOf(company, 0.1),
    options: [
      {
        id: "accept",
        label: lt("Sign the contract", "Firma il contratto"),
        description: lt("Revenue now; some people may leave and the press may write about it.", "Ricavi subito; qualcuno potrebbe andarsene e la stampa potrebbe scriverne."),
        outcome: lt("You signed. Not everyone in the team agrees.", "Avete firmato. Non tutto il team è d'accordo."),
        effects: { morale: -0.06, rep: { talent: -10 } },
        special: { kind: "scaled", addCustomers: true },
        risk: {
          probability: 0.3,
          delay: 1,
          title: lt("A newspaper investigation names you", "Un'inchiesta giornalistica vi cita"),
          description: lt("An article on gambling addiction mentions your technology.", "Un articolo sulla ludopatia cita la vostra tecnologia."),
          effects: { brand: -0.05, rep: { media: -15, customers: -10 }, modifier: { rounds: 2, effects: { churn: 1.1 } } },
        },
      },
      {
        id: "policy",
        label: lt("Decline and write a client policy", "Rifiuta e scrivi una policy sui clienti"),
        description: lt("Decide in advance who you will not work with: less revenue, more clarity for the team.", "Decidete in anticipo con chi non lavorerete: meno ricavi, più chiarezza per il team."),
        outcome: lt("You declined and wrote down your values.", "Avete rifiutato e messo per iscritto i vostri valori."),
        effects: { morale: 0.05, rep: { talent: 6 } },
      },
    ],
  },
  {
    id: "star_misconduct",
    title: lt("A report about your top seller", "Una segnalazione sul venditore migliore"),
    description: lt(
      "Several colleagues report harassing and humiliating behaviour by {employee}, who brings in most of the new contracts. The team is watching what you do.",
      "Alcuni colleghi segnalano comportamenti molesti e umilianti di {employee}, che porta gran parte dei nuovi contratti. Il team guarda cosa farete.",
    ),
    concept: "culture",
    weight: ({ company }) => (company.team.length >= 4 ? 0.6 : 0),
    prepare: ({ company }) => {
      const e = bestSeller(company);
      return e ? { employeeId: e.id, employee: e.name } : null;
    },
    options: [
      {
        id: "investigate",
        label: lt("Independent inquiry and action", "Indagine indipendente e provvedimenti"),
        description: lt("The reports are confirmed and {employee} leaves: sales slow down for a while, the team trusts you more.", "Le segnalazioni sono confermate e {employee} va via: le vendite rallentano per un po', il team si fida di più."),
        outcome: lt("After the inquiry {employee} left the company.", "Dopo l'indagine {employee} ha lasciato l'azienda."),
        effects: { morale: 0.06, rep: { talent: 8 }, modifier: { rounds: 1, effects: { sales: 0.85 } } },
        special: { kind: "loseEmployee" },
      },
      {
        id: "protect",
        label: lt("An informal warning, nothing more", "Un richiamo informale, nient'altro"),
        description: lt("You keep who brings the numbers and hope things calm down.", "Tieni chi porta i numeri e speri che le acque si calmino."),
        outcome: lt("{employee} stays. The people who reported feel ignored.", "{employee} resta. Chi ha segnalato si sente ignorato."),
        effects: { morale: -0.08 },
        risk: {
          probability: 0.45,
          delay: 1,
          title: lt("The case becomes public", "Il caso diventa pubblico"),
          description: lt("A former employee tells the story on LinkedIn. Candidates start turning you down.", "Un ex dipendente racconta tutto su LinkedIn. I candidati iniziano a rifiutare."),
          effects: { morale: -0.1, rep: { talent: -20, media: -12 }, modifier: { rounds: 2, effects: { hiringBar: 0.05, salaryAsk: 1.1 } } },
        },
      },
    ],
  },
  {
    id: "delaware_flip",
    title: lt("Move the holding to the United States?", "Trasferire la holding negli Stati Uniti?"),
    description: lt(
      "A US fund is interested, but only invests in Delaware companies. The flip costs about €60k in lawyers and taxes and months of work, and you lose the Italian innovative-startup benefits.",
      "Un fondo americano è interessato, ma investe solo in società del Delaware. Il trasferimento costa circa 60k€ tra legali e tasse e mesi di lavoro, e perdete le agevolazioni da startup innovativa italiana.",
    ),
    concept: "fundingClimate",
    weight: ({ company, state }) => (company.product.launched && state.round >= 3 && company.valuation >= 2_000_000 ? 0.5 : 0),
    options: [
      {
        id: "flip",
        label: lt("Do the flip", "Fai il trasferimento"),
        description: lt("Access to bigger investors and higher valuations, at a cost in cash and founders' time.", "Accesso a investitori più grandi e valutazioni più alte, al prezzo di cassa e tempo dei fondatori."),
        outcome: lt("The holding is now a Delaware corporation.", "La holding ora è una società del Delaware."),
        effects: { cash: -60_000, stress: 0.06, modifier: { rounds: 99, effects: { climate: 1.12, valuation: 1.08 } } },
      },
      {
        id: "stay",
        label: lt("Stay Italian", "Resta in Italia"),
        description: lt("Keep tax benefits and Italian grants; US investors stay further away.", "Mantenete agevolazioni fiscali e bandi italiani; gli investitori americani restano più lontani."),
        outcome: lt("The company stays Italian.", "L'azienda resta italiana."),
        effects: { cash: 10_000 },
      },
    ],
  },
  {
    id: "inventory_moq",
    title: lt("The supplier's minimum order", "L'ordine minimo del fornitore"),
    description: lt(
      "The manufacturer offers a 25% lower unit cost if you order stock for the next twelve months: about {cash} to pay now.",
      "Il produttore offre un costo unitario più basso del 25% se ordinate lo stock per i prossimi dodici mesi: circa {cash} da pagare subito.",
    ),
    concept: "grossMargin",
    weight: ({ company }) => (company.product.launched && ["ecommerce", "deeptech"].includes(company.sector) && company.mrr > 5_000 ? 0.8 : 0),
    prepare: ({ company }) => {
      const cogs = company.mrr * (1 - SECTORS[company.sector].grossMargin);
      const cash = Math.max(20_000, Math.round((cogs * 12 * 0.6) / 1_000) * 1_000);
      return { cashValue: cash, cash: euro(cash) };
    },
    options: [
      {
        id: "bulk",
        label: lt("Order for twelve months", "Ordina per dodici mesi"),
        description: lt("Better margin all year, but cash sits in the warehouse. If sales slow down, stock stays unsold.", "Margine migliore per tutto l'anno, ma la cassa resta in magazzino. Se le vendite rallentano, la merce resta invenduta."),
        outcome: lt("The warehouse is full.", "Il magazzino è pieno."),
        effects: { modifier: { rounds: 4, effects: { gm: 0.08 } } },
        special: { kind: "scaled", cashSign: -1 },
        risk: {
          probability: 0.3,
          delay: 2,
          title: lt("Unsold stock", "Merce invenduta"),
          description: lt("Part of the stock is out of fashion or obsolete and must be sold at a loss.", "Una parte dello stock è fuori moda o superata e va svenduta."),
          effects: { cash: -20_000, morale: -0.03 },
        },
      },
      {
        id: "small",
        label: lt("Keep ordering small batches", "Continua con ordini piccoli"),
        description: lt("Higher unit costs, no bet on future sales.", "Costi unitari più alti, nessuna scommessa sulle vendite future."),
        outcome: lt("You kept small orders.", "Avete mantenuto ordini piccoli."),
      },
    ],
  },
];

export function dilemmaTemplate(id: string): DilemmaTemplate | undefined {
  return DILEMMAS.find((d) => d.id === id);
}
