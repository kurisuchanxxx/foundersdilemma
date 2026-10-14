// The guided first round: each step opens a view (and a decisions tab) and highlights
// the element marked with data-tour="<target>".
import type { DecisionTab, View } from "../store";

export interface TourStep {
  view?: View;
  tab?: DecisionTab;
  target?: string;
  title: [en: string, it: string];
  body: [en: string, it: string];
}

export const TOUR: TourStep[] = [
  {
    view: "dashboard",
    title: ["Welcome, founder", "Benvenuto, fondatore"],
    body: [
      "You will run your startup for about four years. Every round you decide, then the market answers. This tour takes two minutes and shows you where everything is.",
      "Guiderai la tua startup per circa quattro anni. A ogni round decidi, poi il mercato risponde. Questo tour dura due minuti e ti mostra dove si trova tutto.",
    ],
  },
  {
    view: "dashboard",
    target: "topbar-stats",
    title: ["Cash and runway", "Cassa e runway"],
    body: [
      "Runway is how many months you can survive with the cash you have. Below 6 months start raising money: a funding round takes time.",
      "La runway indica quanti mesi puoi sopravvivere con la cassa che hai. Sotto i 6 mesi inizia a cercare fondi: un round richiede tempo.",
    ],
  },
  {
    view: "dashboard",
    target: "pmf",
    title: ["Product-market fit", "Product-market fit"],
    body: [
      "Your first goal. At 60 points, 40% of users would be very disappointed without your product (the Sean Ellis test). Scaling before that burns cash.",
      "Il primo obiettivo. A 60 punti il 40% degli utenti sarebbe molto deluso senza il tuo prodotto (il test di Sean Ellis). Scalare prima brucia cassa.",
    ],
  },
  {
    view: "dashboard",
    target: "mentor",
    title: ["Your mentor", "Il tuo mentor"],
    body: [
      "After every round the mentor explains what is happening and why. Read it before deciding.",
      "Dopo ogni round il mentor spiega cosa sta succedendo e perché. Leggilo prima di decidere.",
    ],
  },
  {
    view: "decisions",
    tab: "core",
    target: "decision-tabs",
    title: ["This round's decisions", "Le decisioni del round"],
    body: [
      "Decisions are split into tabs: budget and price, product, founders and team, reputation, finance, other teams (partnerships and acquisitions). When a founder's dilemma arrives it gets its own tab.",
      "Le decisioni sono divise in schede: budget e prezzo, prodotto, fondatori e team, reputazione, finanza, altri team (partnership e acquisizioni). Quando arriva un dilemma del fondatore compare una scheda dedicata.",
    ],
  },
  {
    view: "decisions",
    tab: "core",
    target: "budgets",
    title: ["Monthly budgets", "Budget mensili"],
    body: [
      "Research and development, marketing and operations make up your monthly burn, together with salaries. Before launch, marketing builds a waitlist.",
      "Ricerca e sviluppo, marketing e operations formano il burn mensile, insieme agli stipendi. Prima del lancio il marketing costruisce una lista d'attesa.",
    ],
  },
  {
    view: "decisions",
    tab: "core",
    target: "projection",
    title: ["The projection", "La proiezione"],
    body: [
      "Every change updates the expected cash, runway and PMF at the end of the round. It shows the trend, not the surprises: random events stay hidden.",
      "Ogni modifica aggiorna cassa, runway e PMF attesi a fine round. Mostra la tendenza, non le sorprese: gli eventi casuali restano nascosti.",
    ],
  },
  {
    view: "decisions",
    tab: "product",
    target: "segment",
    title: ["Who are your customers?", "Chi sono i tuoi clienti?"],
    body: [
      "A niche learns faster and wins customers cheaply, but the market is smaller; premium customers pay more but want quality. Choose before launch: changing later costs customers.",
      "Una nicchia fa imparare più in fretta e costa meno conquistarla, ma il mercato è più piccolo; i clienti premium pagano di più ma vogliono qualità. Scegli prima del lancio: cambiare dopo costa clienti.",
    ],
  },
  {
    view: "decisions",
    tab: "product",
    target: "discovery",
    title: ["Talk to customers", "Parla con i clienti"],
    body: [
      "In the first rounds customer discovery costs little and raises PMF: building the wrong thing costs much more.",
      "Nei primi round la customer discovery costa poco e alza il PMF: costruire la cosa sbagliata costa molto di più.",
    ],
  },
  {
    view: "decisions",
    tab: "finance",
    target: "grants",
    title: ["Money that does not dilute", "Denaro che non diluisce"],
    body: [
      "Grants and the accelerator are the cheapest money at the start. Investors arrive later, when you have traction: every euro of equity costs ownership.",
      "Bandi e acceleratore sono il denaro più economico all'inizio. Gli investitori arrivano dopo, quando hai trazione: ogni euro di equity costa quote.",
    ],
  },
  {
    view: "decisions",
    tab: "review",
    target: "submit",
    title: ["Submit", "Invia"],
    body: [
      "Check the warnings and submit. Then advance to the next period from the top bar and read the round report.",
      "Controlla gli avvisi e invia. Poi avanza al periodo successivo dalla barra in alto e leggi il report del round.",
    ],
  },
  {
    target: "nav-learn",
    title: ["When in doubt", "Nel dubbio"],
    body: [
      "Every question mark opens the explanation of a concept; the Learn page has the whole glossary. You can restart this tour from there. Enjoy the game!",
      "Ogni punto interrogativo apre la spiegazione di un concetto; la pagina Impara contiene tutto il glossario. Da lì puoi anche rivedere questo tour. Buona partita!",
    ],
  },
];
