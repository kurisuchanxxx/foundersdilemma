import { useState } from "react";
import { SECTORS, SECTOR_IDS, allHumansSubmitted, roundLabel, type CustomEventSpec, type ModifierEffects, type SectorId } from "../../core";
import { openTextFiles, saveTextFile } from "../../platform/files";
import { applyDecisionFiles, gameFileContents, gameFileName, type ImportResult } from "../classroom";
import { Icon } from "../components/Icon";
import { Badge, Callout, Card, Logo, Modal, Segmented, SliderField } from "../components/ui";
import { useGame } from "../hooks";
import { useFmt } from "../i18n";
import { stateForSave, useStore } from "../store";
import { StandingsTable } from "./Leaderboard";
import { EventCard } from "./News";
import { discussionPrompts } from "../content/prompts";
import { describeEffect } from "./Market";

export function Instructor() {
  const f = useFmt();
  const game = useGame();
  const advance = useStore((s) => s.advance);
  const setActive = useStore((s) => s.setActive);
  const setView = useStore((s) => s.setView);
  const replaceGame = useStore((s) => s.replaceGame);
  const drafts = useStore((s) => s.drafts);
  const timerEndsAt = useStore((s) => s.timerEndsAt);
  const setTimer = useStore((s) => s.setTimer);
  const toast = useStore((s) => s.toast);
  const [confirm, setConfirm] = useState(false);
  const [projector, setProjector] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [imports, setImports] = useState<ImportResult[] | null>(null);
  const humans = game.companies.filter((c) => !c.isBot);
  const allReady = allHumansSubmitted(game);
  const classroom = game.config.mode === "classroom";
  const minutes = game.config.turnTimerMinutes ?? 15;

  const exportForTeams = async () => {
    const ok = await saveTextFile(gameFileName(game), gameFileContents(stateForSave(game, drafts)), [{ name: "Founder's Dilemma", extensions: ["json"] }]);
    if (ok) toast(f.tx("Game file exported: share it with the teams.", "File di partita esportato: condividilo con i team."), "good");
  };
  const importDecisions = async () => {
    const files = await openTextFiles([{ name: "Decision", extensions: ["json"] }], true);
    if (!files.length) return;
    const res = applyDecisionFiles(game, files);
    replaceGame(res.state);
    setImports(res.results);
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("Instructor console", "Console docente")}</h1>
          <p className="muted">
            {game.config.sessionName || f.tx("Session", "Sessione")} · {game.finished ? f.tx("game over", "partita conclusa") : f.L(roundLabel(game.config, game.round))} · seed {game.config.seed}
          </p>
        </div>
        <div className="row wrap">
          <button className="btn" onClick={() => setProjector(true)}>
            <Icon name="MonitorPlay" size={16} />
            {f.tx("Projector view", "Vista proiettore")}
          </button>
          {!game.finished && (
            <button className={`btn ${allReady ? "primary" : ""}`} onClick={() => (allReady ? advance() : setConfirm(true))}>
              <Icon name="FastForward" size={16} />
              {f.tx("Advance round", "Avanza il round")}
            </button>
          )}
        </div>
      </div>

      {!game.finished && (
        <div className="grid cols-3">
          <Card title={f.tx("Round timer", "Timer del round")} icon="Timer">
            <div className="row wrap">
              {timerEndsAt ? (
                <button className="btn" onClick={() => setTimer(null)}>
                  <Icon name="X" size={14} />
                  {f.tx("Stop timer", "Ferma il timer")}
                </button>
              ) : (
                [minutes, 10, 20, 30]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((m) => (
                    <button key={m} className="btn sm" onClick={() => setTimer(Date.now() + m * 60_000)}>
                      {m}′
                    </button>
                  ))
              )}
            </div>
            <p className="small faint mt-8">{f.tx("The countdown appears in the top bar for everyone.", "Il conto alla rovescia compare nella barra in alto per tutti.")}</p>
          </Card>
          <Card title={f.tx("Teams ready", "Team pronti")} icon="Users">
            <div className="stat-value">
              {humans.filter((c) => c.submitted || c.status !== "active").length} / {humans.length}
            </div>
            <p className="small faint">{allReady ? f.tx("Everyone submitted: you can advance.", "Tutti hanno inviato: puoi avanzare.") : f.tx("Missing teams run on autopilot and lose ground.", "I team mancanti vanno col pilota automatico e perdono terreno.")}</p>
          </Card>
          <Card title={f.tx("Surprise event", "Evento a sorpresa")} icon="Zap">
            <button className="btn primary" onClick={() => setEventOpen(true)}>
              <Icon name="Plus" size={16} />
              {f.tx("Inject an event", "Inserisci un evento")}
            </button>
            <p className="small faint mt-8">{f.tx("Effective immediately, shown in everyone's news.", "Effettivo da subito, visibile nelle news di tutti.")}</p>
          </Card>
        </div>
      )}

      {classroom && (
        <Card title={f.tx("Classroom files", "File della classe")} icon="School">
          <Callout tone="info">
            {f.tx(
              "Round cycle: share the game file → teams send back their decision files → import them → advance → share the new game file.",
              "Ciclo del round: condividi il file di partita → i team rimandano i file delle decisioni → importali → avanza → condividi il nuovo file di partita.",
            )}
          </Callout>
          <div className="row wrap mt-16">
            <button className="btn" onClick={exportForTeams}>
              <Icon name="Download" size={16} />
              {f.tx("Export game file for teams", "Esporta file di partita per i team")}
            </button>
            {!game.finished && (
              <button className="btn primary" onClick={importDecisions}>
                <Icon name="Upload" size={16} />
                {f.tx("Import decision files", "Importa i file delle decisioni")}
              </button>
            )}
          </div>
          {imports && (
            <div className="col gap-4 mt-16">
              {imports.map((r, i) => (
                <div key={i} className="row gap-8 small">
                  <Icon name={r.ok ? "Check" : "X"} size={14} className={r.ok ? "good" : "bad"} />
                  <b>{r.companyName ?? r.file}</b>
                  <span className="muted">{f.L(r.message)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title={f.tx("Teams", "Team")} icon="ClipboardList">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{f.tx("Team", "Team")}</th>
                <th>{f.tx("Sector", "Settore")}</th>
                <th>{f.tx("Status", "Stato")}</th>
                <th className="num">{f.tx("Cash", "Cassa")}</th>
                <th className="num">Runway</th>
                <th className="num">MRR</th>
                <th className="num">PMF</th>
                <th className="num">{f.tx("Valuation", "Valutazione")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {game.companies.map((c) => {
                const last = c.history[c.history.length - 1];
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="row gap-8">
                        <Logo company={c} size={24} />
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {c.name} {c.isBot && <Badge>bot · {c.botStyle}</Badge>}
                          </div>
                          {c.teamMembers.length > 0 && <div className="tiny faint">{c.teamMembers.join(", ")}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="small muted">{f.L(SECTORS[c.sector].name)}</td>
                    <td>
                      {c.status !== "active" ? (
                        <Badge tone={c.status === "exited" ? "good" : "bad"}>{c.status === "exited" ? "exit" : f.tx("bankrupt", "fallita")}</Badge>
                      ) : game.finished ? (
                        <Badge>{f.tx("final", "finale")}</Badge>
                      ) : c.submitted ? (
                        <Badge tone="good">
                          <Icon name="Check" size={11} /> {f.tx("ready", "pronto")}
                        </Badge>
                      ) : (
                        <Badge tone="warn">{f.tx("deciding", "in decisione")}</Badge>
                      )}
                    </td>
                    <td className="num">{f.money(c.cash)}</td>
                    <td className={`num ${last && last.runway < 6 ? "bad" : ""}`}>{last ? f.months(last.runway) : "—"}</td>
                    <td className="num">{f.money(c.mrr)}</td>
                    <td className="num">{Math.round(c.pmf.score)}</td>
                    <td className="num">{f.money(c.valuation)}</td>
                    <td className="right">
                      {!c.isBot && game.config.mode === "hotseat" && (
                        <button
                          className="btn sm"
                          onClick={() => {
                            setActive(c.id);
                            setView(game.finished ? "results" : "decisions");
                          }}
                        >
                          {f.tx("Open", "Apri")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid cols-2">
        <Card title={f.tx("News this round", "Notizie di questo round")} icon="Newspaper">
          {game.outlook.length === 0 ? <p className="muted">{f.tx("No market news this round.", "Nessuna notizia di mercato in questo round.")}</p> : game.outlook.map((e) => <EventCard key={e.id} e={e} />)}
        </Card>
        <Card title={f.tx("Discussion prompts", "Spunti per la discussione")} icon="MessagesSquare">
          <ul style={{ margin: 0, paddingLeft: 18 }} className="col gap-8">
            {discussionPrompts(game).map((p, i) => (
              <li key={i} className="small">
                {f.L(p)}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {confirm && (
        <Modal
          title={f.tx("Not all teams are ready", "Non tutti i team sono pronti")}
          onClose={() => setConfirm(false)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirm(false)}>
                {f.tx("Wait", "Aspetta")}
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setConfirm(false);
                  advance();
                }}
              >
                {f.tx("Advance anyway", "Avanza comunque")}
              </button>
            </>
          }
        >
          <p>
            {f.tx("Missing teams:", "Team mancanti:")} {humans.filter((c) => c.status === "active" && !c.submitted).map((c) => c.name).join(", ")}
          </p>
          <p className="small muted mt-8">{f.tx(
            "Without a decision file they run on autopilot and lose ground (slower development and sales, lower morale and investors' trust), more with every missed round.",
            "Senza file di decisioni vanno col pilota automatico e perdono terreno (sviluppo e vendite più lenti, morale e fiducia degli investitori in calo), sempre di più a ogni round saltato.",
          )}</p>
        </Modal>
      )}
      {eventOpen && <InjectEventModal onClose={() => setEventOpen(false)} />}
      {projector && (
        <Modal wide title={`${game.config.sessionName || "Founder's Dilemma"} · ${game.finished ? f.tx("Final standings", "Classifica finale") : f.L(roundLabel(game.config, game.round))}`} onClose={() => setProjector(false)}>
          <div className="projector col gap-16">
            {game.outlook.length > 0 && (
              <Card title={f.tx("Breaking news", "Ultime notizie")} icon="Newspaper">
                {game.outlook.map((e) => (
                  <EventCard key={e.id} e={e} />
                ))}
              </Card>
            )}
            <Card>
              <StandingsTable compact />
            </Card>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface Preset {
  id: string;
  en: string;
  it: string;
  impact: CustomEventSpec["impact"];
  effects: ModifierEffects;
  cash: number;
  descEn: string;
  descIt: string;
}

const PRESETS: Preset[] = [
  { id: "freeze", en: "Investors freeze", it: "Gli investitori si bloccano", impact: "negative", effects: { climate: 0.6, valuation: 0.8 }, cash: 0, descEn: "A major fund collapsed: investors are scared.", descIt: "Un grande fondo è crollato: gli investitori hanno paura." },
  { id: "boom", en: "Demand boom", it: "Boom della domanda", impact: "positive", effects: { demand: 1.2, cac: 0.85 }, cash: 0, descEn: "A viral trend pushes customers to try new products.", descIt: "Una tendenza virale spinge i clienti a provare nuovi prodotti." },
  { id: "costs", en: "Cost shock", it: "Shock dei costi", impact: "negative", effects: { gm: -0.08 }, cash: -15_000, descEn: "Energy and supplier prices jump.", descIt: "I prezzi dell'energia e dei fornitori schizzano in alto." },
  { id: "talent", en: "Talent crunch", it: "Carenza di talenti", impact: "negative", effects: { hiringBar: 0.08, salaryAsk: 1.15 }, cash: 0, descEn: "A tech giant opens an office in town and hires everyone.", descIt: "Un colosso tecnologico apre un ufficio in città e assume tutti." },
  { id: "regulation", en: "New regulation", it: "Nuova regolamentazione", impact: "negative", effects: { compliance: 2_000, dev: 0.92 }, cash: 0, descEn: "A new law requires certifications and audits.", descIt: "Una nuova legge richiede certificazioni e audit." },
  { id: "recession", en: "Recession", it: "Recessione", impact: "negative", effects: { demand: 0.85, churn: 1.15, climate: 0.85 }, cash: 0, descEn: "Customers cut budgets: fewer purchases, more cancellations, cautious investors.", descIt: "I clienti tagliano i budget: meno acquisti, più disdette, investitori prudenti." },
  { id: "entrant", en: "New competitor", it: "Nuovo concorrente", impact: "negative", effects: { cac: 1.2, wtp: 0.92, churn: 1.1 }, cash: 0, descEn: "A well-funded newcomer enters the market with aggressive prices and ads.", descIt: "Un nuovo arrivato ben finanziato entra nel mercato con prezzi e pubblicità aggressivi." },
  { id: "grant", en: "Government stimulus", it: "Stimolo governativo", impact: "positive", effects: { climate: 1.2 }, cash: 20_000, descEn: "A public program gives every startup a small grant.", descIt: "Un programma pubblico dà a ogni startup un piccolo contributo." },
];

function InjectEventModal({ onClose }: { onClose: () => void }) {
  const f = useFmt();
  const game = useGame();
  const inject = useStore((s) => s.injectEvent);
  const [preset, setPreset] = useState(PRESETS[0]);
  const [title, setTitle] = useState(f.tx(preset.en, preset.it));
  const [desc, setDesc] = useState(f.tx(preset.descEn, preset.descIt));
  const [target, setTarget] = useState<"all" | "sector" | "company">("all");
  const [sector, setSector] = useState<SectorId>(SECTOR_IDS[0]);
  const [companyId, setCompanyId] = useState(game.companies[0]?.id ?? "");
  const [rounds, setRounds] = useState(1);
  const [strength, setStrength] = useState(1);
  const pick = (p: Preset) => {
    setPreset(p);
    setTitle(f.tx(p.en, p.it));
    setDesc(f.tx(p.descEn, p.descIt));
  };
  const scaled = (): ModifierEffects => {
    const out: ModifierEffects = {};
    for (const [k, v] of Object.entries(preset.effects) as Array<[keyof ModifierEffects, number]>) {
      const additive = k === "gm" || k === "compliance" || k === "hiringBar" || k === "debtRate" || k === "morale" || k === "stress";
      out[k] = additive ? v * strength : 1 + (v - 1) * strength;
    }
    return out;
  };
  const submit = () => {
    const spec: CustomEventSpec = {
      id: `custom_${Date.now()}`,
      title: { en: title, it: title },
      description: { en: desc, it: desc },
      target: target === "all" ? { kind: "all" } : target === "sector" ? { kind: "sector", sector } : { kind: "company", companyId },
      impact: preset.impact,
      rounds,
      effects: scaled(),
      cash: Math.round(preset.cash * strength),
    };
    inject(spec);
    onClose();
  };
  return (
    <Modal
      title={f.tx("Inject a surprise event", "Inserisci un evento a sorpresa")}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {f.tx("Cancel", "Annulla")}
          </button>
          <button className="btn primary" onClick={submit} disabled={!title.trim()}>
            <Icon name="Zap" size={16} />
            {f.tx("Publish event", "Pubblica l'evento")}
          </button>
        </>
      }
    >
      <div className="col gap-16">
        <div className="row wrap gap-4">
          {PRESETS.map((p) => (
            <button key={p.id} className={`btn sm ${preset.id === p.id ? "primary" : ""}`} onClick={() => pick(p)}>
              {f.tx(p.en, p.it)}
            </button>
          ))}
        </div>
        <div className="field">
          <div className="field-label">{f.tx("Headline", "Titolo")}</div>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">{f.tx("Description", "Descrizione")}</div>
          <textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">{f.tx("Who is affected", "Chi è colpito")}</div>
          <Segmented
            value={target}
            options={[
              { value: "all", label: f.tx("Everyone", "Tutti") },
              { value: "sector", label: f.tx("A sector", "Un settore") },
              { value: "company", label: f.tx("One team", "Un team") },
            ]}
            onChange={setTarget}
          />
          {target === "sector" && (
            <select className="input" value={sector} onChange={(e) => setSector(e.target.value as SectorId)}>
              {SECTOR_IDS.map((s) => (
                <option key={s} value={s}>
                  {f.L(SECTORS[s].name)}
                </option>
              ))}
            </select>
          )}
          {target === "company" && (
            <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {game.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <SliderField label={f.tx("Strength", "Intensità")} value={strength} min={0.5} max={2} step={0.25} onChange={setStrength} format={(v) => `×${v}`} />
        <p className="small muted">
          {f.tx("Effects", "Effetti")}: {Object.entries(scaled()).map(([k, v]) => describeEffect(f, k, v as number)).join(", ")}
          {preset.cash !== 0 && `, ${f.tx("cash", "cassa")} ${f.money(Math.round(preset.cash * strength), { sign: true })} ${f.tx("for each company hit", "per ogni azienda colpita")}`}
          {` · ${f.count(rounds, ["round", "rounds"], ["round", "round"])}`}
        </p>
        <SliderField label={f.tx("Duration (rounds)", "Durata (round)")} value={rounds} min={1} max={4} onChange={setRounds} format={(v) => String(v)} />
      </div>
    </Modal>
  );
}
