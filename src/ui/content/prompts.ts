import { lt, type GameState, type LText } from "../../core";

// One block per meeting of the session plan (docs/corso/02-piano-sessioni.md). `upTo` is the share of
// the game the meeting covers, so the questions follow the plan whatever the number of rounds.
const PHASE: Array<{ upTo: number; prompts: LText[] }> = [
  {
    upTo: 0.1,
    prompts: [
      lt("What is the riskiest assumption in your business idea? How will you test it cheaply?", "Qual è l'ipotesi più rischiosa della vostra idea? Come la testerete spendendo poco?"),
      lt("Why this co-founding team? What would Wasserman say about your equity split (equal or not, and why)?", "Perché questa squadra? Cosa direbbe Wasserman della vostra divisione delle quote (paritaria o no, e perché)?"),
      lt("How many months of runway do you want to keep, and why?", "Quanti mesi di runway volete mantenere, e perché?"),
    ],
  },
  {
    upTo: 0.3,
    prompts: [
      lt("Launch now or polish the MVP? What do you lose and gain by waiting another round?", "Lanciare ora o rifinire l'MVP? Cosa perdete e cosa guadagnate aspettando un altro round?"),
      lt("Compare two teams: did the one that did more discovery reach a higher PMF? At what cost in cash?", "Confrontate due team: chi ha fatto più discovery ha un PMF più alto? Con quale costo in cassa?"),
      lt("Niche or broad market? If you chose a beachhead, can you describe your customer in one sentence?", "Nicchia o mercato ampio? Chi ha scelto una testa di ponte sa descrivere il proprio cliente in una frase?"),
    ],
  },
  {
    upTo: 0.5,
    prompts: [
      lt("Do you have product-market fit? Which numbers prove it (retention, Sean Ellis %, LTV/CAC)?", "Avete il product-market fit? Quali numeri lo dimostrano (retention, % di Sean Ellis, LTV/CAC)?"),
      lt("Is it time to scale marketing, or would more spend only fill a leaky bucket? How close is the chasm in your market?", "È il momento di scalare il marketing, o più spesa riempirebbe solo un secchio bucato? Quanto è vicino il chasm nel vostro mercato?"),
      lt("Teams in the same sector share the same market: how does knowing it change your strategy?", "Più team nello stesso settore si dividono lo stesso mercato: come cambia la vostra strategia sapendolo?"),
      lt("Coopetition: is a partnership worth more with a team in your sector or with one that has similar customers elsewhere?", "Coopetizione: una partnership conviene di più con chi sta nel vostro settore o con chi ha clienti simili in un altro?"),
    ],
  },
  {
    upTo: 0.7,
    prompts: [
      lt("Are you hiring people or contractors? Which is right at this stage, and why?", "State assumendo persone o contractor? Quale scelta è giusta in questa fase, e perché?"),
      lt("Talent is scarce: salary or equity? Which candidates preferred which, and why?", "Talenti scarsi: stipendio o equity? Quali candidati hanno preferito cosa, e perché?"),
      lt("If you lost a candidate to another team, what would you have offered differently?", "Chi ha perso un candidato a favore di un altro team: cosa avreste offerto di diverso?"),
    ],
  },
  {
    upTo: 0.9,
    prompts: [
      lt("Bootstrapping, angels, accelerator or grants: what does each option cost you besides money?", "Bootstrapping, angel, acceleratore o bandi: cosa vi costa ciascuna opzione oltre al denaro?"),
      lt("How much of the company do you want to own at the end? Rich or king?", "Quanta parte dell'azienda volete possedere alla fine? Ricchi o re?"),
      lt("Look at the cap table: how much of the valuation would really reach the founders with today's preferences?", "Guardate la cap table: quanto della valutazione arriverebbe davvero ai fondatori con le preferenze attuali?"),
      lt("If an investor chose another team over you, what should you have shown?", "Chi è rimasto fuori da un investitore perché un altro team aveva numeri migliori: cosa avreste dovuto mostrare?"),
    ],
  },
  {
    upTo: 1,
    prompts: [
      lt("If you received an acquisition offer today, at what price would you sell? Why?", "Se oggi riceveste un'offerta di acquisizione, a che prezzo vendereste? Perché?"),
      lt("Which decision of the game would you take differently, and what did it teach you?", "Quale decisione della partita prendereste diversamente, e cosa vi ha insegnato?"),
      lt("Where does the game simplify reality too much?", "Dove il gioco semplifica troppo la realtà?"),
    ],
  },
];

const CONCEPT_PROMPTS: Record<string, LText> = {
  fundingClimate: lt("The funding climate changed: should you raise now at a worse price or cut burn and wait?", "Il clima del fundraising è cambiato: conviene raccogliere ora a un prezzo peggiore o tagliare il burn e aspettare?"),
  runway: lt("In a funding winter, which costs would you cut first and which would you protect?", "In un inverno del venture capital, quali costi tagliereste per primi e quali proteggereste?"),
  equityCompensation: lt("Talent is scarce: salary or equity? Which candidates value which?", "I talenti scarseggiano: stipendio o equity? Quali candidati preferiscono cosa?"),
  regulation: lt("Is regulation only a cost, or also a barrier that protects you from new entrants?", "La regolamentazione è solo un costo o anche una barriera che vi protegge dai nuovi entranti?"),
  cac: lt("Acquisition is getting more expensive: which channels or product changes could lower your CAC?", "Acquisire clienti costa di più: quali canali o cambiamenti di prodotto potrebbero abbassare il CAC?"),
  competition: lt("A giant entered your market: compete head-on, find a niche, or look for an exit?", "Un gigante è entrato nel vostro mercato: competere frontalmente, trovare una nicchia o cercare un'exit?"),
  marketTiming: lt("A tailwind is helping your sector: how do you make the most of a temporary advantage?", "Un vento favorevole aiuta il vostro settore: come sfruttare al meglio un vantaggio temporaneo?"),
  blackSwan: lt("A black swan hit: which decisions taken earlier made you more or less resilient?", "È arrivato un cigno nero: quali decisioni prese prima vi hanno reso più o meno resilienti?"),
  disruption: lt("A free open-source alternative appeared: how does your business model respond?", "È comparsa un'alternativa open-source gratuita: come risponde il vostro modello di business?"),
};

export function discussionPrompts(game: GameState): LText[] {
  const total = Math.max(1, game.config.totalRounds);
  const phase = game.round >= total ? PHASE[PHASE.length - 1] : (PHASE.find((p) => game.round <= Math.max(1, Math.round(p.upTo * total))) ?? PHASE[PHASE.length - 1]);
  const out = [...phase.prompts];
  for (const e of game.outlook) {
    if (e.concept && CONCEPT_PROMPTS[e.concept]) out.unshift(CONCEPT_PROMPTS[e.concept]);
  }
  const dilemmas = game.companies.filter((c) => c.dilemma && !c.isBot);
  if (dilemmas.length > 0) {
    out.push(lt("Some teams face a founder's dilemma this round: ask them to explain their choice to the class.", "Alcuni team affrontano un dilemma del fondatore in questo round: chiedete loro di spiegare la scelta alla classe."));
  }
  return out.slice(0, 5);
}
