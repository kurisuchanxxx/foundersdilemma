import { useEffect, useMemo, useState } from "react";
import { CATEGORY_LABEL, GLOSSARY, type GlossaryEntry } from "../content/glossary";
import { Icon } from "../components/Icon";
import { Card, Segmented } from "../components/ui";
import { useFmt } from "../i18n";
import { useStore } from "../store";

export function HowToPlay() {
  const f = useFmt();
  const steps: Array<[string, string, string, string, string]> = [
    ["Rocket", "Found your company", "Fonda la tua azienda", "Choose sector, founders, equity split and vesting. These founding choices shape the whole game.", "Scegli settore, fondatori, divisione delle quote e vesting. Queste scelte fondative condizionano tutta la partita."],
    ["SlidersHorizontal", "Decide every round", "Decidi a ogni round", "Set monthly budgets, price, channel, product approach, customer discovery, hires and pitches. The projection panel shows the expected effect before you submit.", "Imposta budget mensili, prezzo, canale, approccio al prodotto, customer discovery, assunzioni e pitch. Il pannello di proiezione mostra l'effetto atteso prima dell'invio."],
    ["MessagesSquare", "Find product-market fit", "Trova il product-market fit", "Talk to customers, launch an MVP and iterate until at least 40% of users would be very disappointed without you. Scaling before PMF burns cash.", "Parla con i clienti, lancia un MVP e itera finché almeno il 40% degli utenti sarebbe molto deluso senza di te. Scalare prima del PMF brucia cassa."],
    ["Users", "Build the team", "Costruisci il team", "Compete with other teams for candidates with salary and equity. People are more efficient than contractors but harder to cut.", "Competi con gli altri team per i candidati con stipendio ed equity. Le persone sono più efficienti dei contractor ma più difficili da tagliare."],
    ["HandCoins", "Fund the journey", "Finanzia il viaggio", "Bootstrap, apply for grants, borrow, or sell equity to angels, accelerators and VCs. Every option has a price in ownership, control or risk.", "Fai bootstrapping, partecipa a bandi, chiedi prestiti o cedi equity ad angel, acceleratori e VC. Ogni opzione ha un prezzo in quote, controllo o rischio."],
    ["Scale", "Face the dilemmas", "Affronta i dilemmi", "Co-founder conflicts, poaching, ethics, pivots, board fights: there is rarely a right answer, but every choice has consequences.", "Conflitti tra co-fondatori, tentativi di sottrarti persone, etica, pivot, scontri nel CdA: raramente c'è una risposta giusta, ma ogni scelta ha conseguenze."],
    ["Trophy", "Exit or keep building", "Vendi o continua a costruire", "Acquisition offers may arrive. At the end the founders' wealth (after dilution and liquidation preferences) decides the ranking, unless the instructor chose another scoring.", "Possono arrivare offerte di acquisizione. Alla fine la ricchezza dei fondatori (dopo diluizione e liquidation preference) decide la classifica, salvo diverso criterio scelto dal docente."],
  ];
  return (
    <div className="grid cols-2">
      {steps.map(([icon, en, it, den, dit], i) => (
        <div key={i} className="card flat row gap-12 top">
          <span className="logo" style={{ width: 34, height: 34, background: "var(--accent-soft)", color: "var(--accent-text)" }}>
            <Icon name={icon} size={18} />
          </span>
          <div>
            <div style={{ fontWeight: 650 }}>
              {i + 1}. {f.tx(en, it)}
            </div>
            <div className="small muted">{f.tx(den, dit)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EntryCard({ e, open }: { e: GlossaryEntry; open: boolean }) {
  const f = useFmt();
  return (
    <div id={`g-${e.id}`} className={`card ${open ? "selected" : ""}`}>
      <div className="row between">
        <h3>{f.L(e.term)}</h3>
        <span className="badge">{f.L(CATEGORY_LABEL[e.category])}</span>
      </div>
      <p className="muted mt-8" style={{ fontWeight: 550 }}>
        {f.L(e.short)}
      </p>
      <p className="small mt-8">{f.L(e.body)}</p>
      {e.formula && (
        <div className="card flat mt-8 small num" style={{ padding: "6px 10px" }}>
          {e.formula}
        </div>
      )}
      <div className="small mt-8 row gap-4 top">
        <Icon name="Puzzle" size={13} />
        <span>
          <b>{f.tx("In the game", "Nel gioco")}:</b> {f.L(e.inGame)}
        </span>
      </div>
      {e.refs && <div className="tiny faint mt-8">{e.refs.join(" · ")}</div>}
    </div>
  );
}

export function LearnContent() {
  const f = useFmt();
  const topic = useStore((s) => s.learnTopic);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<GlossaryEntry["category"] | "all">("all");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return GLOSSARY.filter((e) => (cat === "all" || e.category === cat) && (!needle || `${e.term.en} ${e.term.it} ${e.short.en} ${e.short.it}`.toLowerCase().includes(needle)));
  }, [q, cat]);
  useEffect(() => {
    if (topic) document.getElementById(`g-${topic}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [topic]);
  return (
    <div className="stack">
      <Card title={f.tx("How to play", "Come si gioca")} icon="Play">
        <HowToPlay />
      </Card>
      <div className="row wrap gap-12">
        <div className="row grow" style={{ minWidth: 220 }}>
          <Icon name="Search" size={16} />
          <input className="input" placeholder={f.tx("Search the glossary…", "Cerca nel glossario…")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented
          value={cat}
          options={[{ value: "all" as const, label: f.tx("All", "Tutti") }, ...(Object.keys(CATEGORY_LABEL) as GlossaryEntry["category"][]).map((k) => ({ value: k, label: f.L(CATEGORY_LABEL[k]) }))]}
          onChange={setCat}
        />
      </div>
      <div className="grid cols-2">
        {list.map((e) => (
          <EntryCard key={e.id} e={e} open={topic === e.id} />
        ))}
      </div>
    </div>
  );
}

export function Learn() {
  const f = useFmt();
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("Learn", "Impara")}</h1>
          <p className="muted">{f.tx("The concepts behind every mechanic of the game, with references for the course.", "I concetti dietro ogni meccanica del gioco, con i riferimenti per il corso.")}</p>
        </div>
      </div>
      <LearnContent />
    </div>
  );
}
