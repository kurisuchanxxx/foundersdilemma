import { lt, moneyL, type LText, type LTextParams } from "../text";
import type { Company, EffectBundle, GameState, SectorId } from "../types";

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
  | { kind: "annualPrepay" };

export interface DilemmaOutcomeBranch {
  effects: EffectBundle;
  text: LText;
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
];

export function dilemmaTemplate(id: string): DilemmaTemplate | undefined {
  return DILEMMAS.find((d) => d.id === id);
}
