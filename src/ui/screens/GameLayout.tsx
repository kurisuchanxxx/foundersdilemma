import { useEffect, useState } from "react";
import { allHumansSubmitted, roundLabel, type Company } from "../../core";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Icon } from "../components/Icon";
import { Logo, Modal, Progress } from "../components/ui";
import { useActiveCompany, useGame } from "../hooks";
import { useFmt } from "../i18n";
import { useStore, type View } from "../store";
import { Dashboard } from "../views/Dashboard";
import { Decisions } from "../views/Decisions";
import { Funding } from "../views/Funding";
import { Instructor } from "../views/Instructor";
import { Leaderboard } from "../views/Leaderboard";
import { Learn } from "../views/Learn";
import { Market } from "../views/Market";
import { News } from "../views/News";
import { Product } from "../views/Product";
import { Reports } from "../views/Reports";
import { Results } from "../views/Results";
import { RoundReportModal } from "../views/RoundReport";
import { SettingsView } from "../views/Settings";
import { Team } from "../views/Team";

const COMPANY_VIEWS: View[] = ["dashboard", "decisions", "team", "funding", "product", "market", "reports"];

export function GameLayout() {
  const f = useFmt();
  const game = useGame();
  const company = useActiveCompany();
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const setActive = useStore((s) => s.setActive);
  const revealed = useStore((s) => s.revealedCompanyId);
  const reveal = useStore((s) => s.reveal);
  const role = useStore((s) => s.classroomRole);
  const reportRound = useStore((s) => s.reportRound);
  const advance = useStore((s) => s.advance);
  const drafts = useStore((s) => s.drafts);
  const [pinOk, setPinOk] = useState(false);
  const mode = game.config.mode;
  const humans = game.companies.filter((c) => !c.isBot);
  const isTeamCopy = role === "team";
  const showInstructor = !isTeamCopy && mode !== "solo";
  const needsPrivacy = mode === "hotseat" && !isTeamCopy;
  const hidden = needsPrivacy && COMPANY_VIEWS.includes(view) && revealed !== company?.id;
  const label = f.L(roundLabel(game.config, Math.min(game.round, game.config.totalRounds)));

  const nav: Array<{ id: View; label: string; icon: string; badge?: boolean; show?: boolean }> = [
    { id: "results", label: f.tx("Final results", "Risultati finali"), icon: "Trophy", show: game.finished },
    { id: "dashboard", label: f.tx("Dashboard", "Cruscotto"), icon: "LayoutDashboard" },
    { id: "decisions", label: f.tx("Decisions", "Decisioni"), icon: "SlidersHorizontal", badge: !!company && company.status === "active" && !company.submitted && !game.finished, show: !game.finished },
    { id: "team", label: f.tx("Team & hiring", "Team e assunzioni"), icon: "Users" },
    { id: "funding", label: f.tx("Funding", "Finanziamenti"), icon: "HandCoins" },
    { id: "product", label: f.tx("Product & PMF", "Prodotto e PMF"), icon: "Target" },
    { id: "market", label: f.tx("Market", "Mercato"), icon: "Compass" },
    { id: "news", label: f.tx("News & reputation", "News e reputazione"), icon: "Newspaper" },
    { id: "leaderboard", label: f.tx("Leaderboard", "Classifica"), icon: "Trophy" },
    { id: "reports", label: f.tx("Round reports", "Report dei round"), icon: "FileText" },
    { id: "learn", label: f.tx("Learn", "Impara"), icon: "GraduationCap" },
  ];

  const openInstructor = () => setView("instructor");
  const instructorLocked = view === "instructor" && !!game.config.instructorPin && !pinOk;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="row gap-8" style={{ marginBottom: 12 }}>
            <Icon name="Rocket" size={18} className="accent" />
            <div style={{ fontWeight: 700 }}>Founder's Dilemma</div>
          </div>
          {company && <CompanySwitcher company={company} humans={humans} onPick={setActive} locked={isTeamCopy || mode === "solo"} />}
        </div>
        <nav>
          {showInstructor && (
            <>
              <button className={`nav-item ${view === "instructor" ? "active" : ""}`} onClick={openInstructor}>
                <Icon name="MonitorPlay" size={16} />
                {f.tx("Instructor console", "Console docente")}
              </button>
              <div className="nav-section">{f.tx("Team", "Team")}</div>
            </>
          )}
          {nav
            .filter((n) => n.show !== false)
            .map((n) => (
              <button key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
                <Icon name={n.icon} size={16} />
                {n.label}
                {n.badge && <span className="badge warn">!</span>}
              </button>
            ))}
          <div className="nav-section">{f.tx("App", "App")}</div>
          <button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
            <Icon name="Settings" size={16} />
            {f.tx("Settings & save", "Impostazioni e salvataggio")}
          </button>
        </nav>
        <div className="sidebar-foot">
          <div className="small" style={{ fontWeight: 600 }}>
            {game.finished ? f.tx("Game over", "Partita conclusa") : label}
          </div>
          <div className="tiny faint" style={{ marginBottom: 6 }}>
            {f.tx("Round", "Round")} {Math.min(game.round, game.config.totalRounds)} / {game.config.totalRounds}
            {game.config.sessionName ? ` · ${game.config.sessionName}` : ""}
          </div>
          <Progress value={(game.finished ? game.config.totalRounds : game.round - 1) / game.config.totalRounds} thin />
        </div>
      </aside>
      <main className="main">
        <TopBar company={company} label={label} onAdvance={advance} draftsPending={Object.keys(drafts).length > 0} />
        <div className="content">
          <div className="content-inner">
            {instructorLocked ? (
              <PinGate pin={game.config.instructorPin!} onOk={() => setPinOk(true)} />
            ) : hidden && company ? (
              <PassScreen company={company} onReveal={() => reveal(company.id)} />
            ) : (
              <ErrorBoundary resetKey={view}>
                {view === "dashboard" && <Dashboard />}
                {view === "decisions" && <Decisions />}
                {view === "team" && <Team />}
                {view === "funding" && <Funding />}
                {view === "product" && <Product />}
                {view === "market" && <Market />}
                {view === "news" && <News />}
                {view === "leaderboard" && <Leaderboard />}
                {view === "reports" && <Reports />}
                {view === "learn" && <Learn />}
                {view === "settings" && <SettingsView />}
                {view === "instructor" && <Instructor />}
                {view === "results" && <Results />}
              </ErrorBoundary>
            )}
          </div>
        </div>
      </main>
      {reportRound !== null && <RoundReportModal round={reportRound} />}
    </div>
  );
}

function CompanySwitcher({ company, humans, onPick, locked }: { company: Company; humans: Company[]; onPick: (id: string) => void; locked: boolean }) {
  const f = useFmt();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button className="card selectable row gap-12" style={{ width: "100%", padding: 10, textAlign: "left" }} onClick={() => !locked && setOpen(!open)} disabled={locked}>
        <Logo company={company} size={34} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{company.name}</div>
          <div className="tiny faint">
            {company.status !== "active"
              ? company.status === "exited"
                ? f.tx("Exited", "Venduta")
                : f.tx("Bankrupt", "Fallita")
              : company.submitted
                ? f.tx("Decisions sent", "Decisioni inviate")
                : f.tx("Deciding…", "In decisione…")}
          </div>
        </div>
        {!locked && <Icon name="ChevronRight" size={14} />}
      </button>
      {open && (
        <div className="card" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: 4, padding: 6, boxShadow: "var(--shadow)" }}>
          {humans.map((h) => (
            <button
              key={h.id}
              className={`nav-item ${h.id === company.id ? "active" : ""}`}
              onClick={() => {
                onPick(h.id);
                setOpen(false);
              }}
            >
              <Logo company={h} size={20} />
              <span className="grow" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {h.name}
              </span>
              {h.status === "active" && (h.submitted ? <Icon name="Check" size={14} /> : <Icon name="Clock" size={14} />)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopBar({ company, label, onAdvance, draftsPending }: { company: Company | null; label: string; onAdvance: () => void; draftsPending: boolean }) {
  const f = useFmt();
  const game = useGame();
  const role = useStore((s) => s.classroomRole);
  const setView = useStore((s) => s.setView);
  const timerEndsAt = useStore((s) => s.timerEndsAt);
  const revealed = useStore((s) => s.revealedCompanyId);
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const mode = game.config.mode;
  const showCompanyStats = company && (mode !== "hotseat" || revealed === company.id || role === "team");
  const last = company?.history[company.history.length - 1];
  const ready = game.companies.filter((c) => !c.isBot && c.status === "active");
  const submitted = ready.filter((c) => c.submitted).length;

  return (
    <div className="topbar">
      <div className="grow">
        <div style={{ fontWeight: 650 }}>{game.finished ? f.tx("Game over", "Partita conclusa") : label}</div>
        <div className="small faint">
          {game.finished
            ? f.tx("See the final results and the debrief.", "Guarda i risultati finali e il debriefing.")
            : `${f.tx("Round", "Round")} ${game.round} ${f.tx("of", "di")} ${game.config.totalRounds}`}
          {draftsPending && !game.finished ? ` · ${f.tx("draft saved", "bozza salvata")}` : ""}
        </div>
      </div>
      {timerEndsAt && <TimerBadge endsAt={timerEndsAt} />}
      {showCompanyStats && company && company.status === "active" && (
        <div className="row gap-16" style={{ marginRight: 8 }}>
          <div className="stat">
            <div className="stat-label">{f.tx("Cash", "Cassa")}</div>
            <div className={`num ${company.cash < 0 ? "bad" : ""}`} style={{ fontWeight: 650 }}>
              {f.money(company.cash)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Runway</div>
            <div className={`num ${last && last.runway < 6 ? "bad" : ""}`} style={{ fontWeight: 650 }}>
              {last ? f.months(last.runway) : "—"}
            </div>
          </div>
        </div>
      )}
      {!game.finished && mode !== "solo" && role !== "team" && (
        <span className="badge accent">
          <Icon name="Users" size={12} /> {submitted}/{ready.length} {f.tx("ready", "pronti")}
        </span>
      )}
      {!game.finished && mode === "solo" && company && company.status !== "active" && (
        <button className="btn primary" onClick={() => useStore.getState().fastForward()}>
          <Icon name="FastForward" size={16} />
          {f.tx("Simulate to the end", "Simula fino alla fine")}
        </button>
      )}
      {!game.finished && mode === "solo" && company?.submitted && (
        <button className="btn primary" onClick={onAdvance}>
          <Icon name="FastForward" size={16} />
          {f.tx("Advance to next period", "Avanza al periodo successivo")}
        </button>
      )}
      {!game.finished && mode === "hotseat" && role !== "team" && (
        <button
          className={`btn ${allHumansSubmitted(game) ? "primary" : ""}`}
          onClick={() => (allHumansSubmitted(game) ? onAdvance() : setConfirmAdvance(true))}
        >
          <Icon name="FastForward" size={16} />
          {f.tx("Advance round", "Avanza il round")}
        </button>
      )}
      {role === "team" && !game.finished && (
        <button className="btn" onClick={() => setView("decisions")}>
          <Icon name="Upload" size={16} />
          {f.tx("Send decisions", "Invia decisioni")}
        </button>
      )}
      {confirmAdvance && (
        <Modal
          title={f.tx("Not all teams are ready", "Non tutti i team sono pronti")}
          onClose={() => setConfirmAdvance(false)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirmAdvance(false)}>
                {f.tx("Wait", "Aspetta")}
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setConfirmAdvance(false);
                  onAdvance();
                }}
              >
                {f.tx("Advance anyway", "Avanza comunque")}
              </button>
            </>
          }
        >
          <p>
            {f.tx(
              "Teams that did not submit will play with last round's settings (drafts are used if present).",
              "I team che non hanno inviato giocheranno con le impostazioni del round precedente (se presenti, si usano le bozze).",
            )}
          </p>
        </Modal>
      )}
    </div>
  );
}

export function TimerBadge({ endsAt }: { endsAt: number }) {
  const f = useFmt();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, endsAt - now);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className={`badge ${left === 0 ? "bad" : left < 120_000 ? "warn" : "accent"} timer`} style={{ fontSize: 13, padding: "4px 10px" }}>
      <Icon name="Timer" size={14} /> {left === 0 ? f.tx("Time's up", "Tempo scaduto") : `${m}:${String(s).padStart(2, "0")}`}
    </span>
  );
}

function PassScreen({ company, onReveal }: { company: Company; onReveal: () => void }) {
  const f = useFmt();
  return (
    <div className="pass-screen">
      <Logo company={company} size={72} />
      <h1>{f.tx(`Pass the computer to ${company.name}`, `Passa il computer a ${company.name}`)}</h1>
      <p className="muted" style={{ maxWidth: 480 }}>
        {f.tx("Other teams should look away: company data is private until the team opens it.", "Gli altri team non guardino: i dati dell'azienda sono privati finché il team non li apre.")}
      </p>
      {company.teamMembers.length > 0 && <p className="small faint">{company.teamMembers.join(" · ")}</p>}
      <button className="btn primary lg" onClick={onReveal}>
        <Icon name="Eye" size={18} />
        {f.tx(`We are ${company.name}: show our company`, `Siamo ${company.name}: mostra la nostra azienda`)}
      </button>
    </div>
  );
}

function PinGate({ pin, onOk }: { pin: string; onOk: () => void }) {
  const f = useFmt();
  const [value, setValue] = useState("");
  const [err, setErr] = useState(false);
  return (
    <div className="pass-screen">
      <Icon name="KeyRound" size={40} className="accent" />
      <h2>{f.tx("Instructor console", "Console docente")}</h2>
      <p className="muted">{f.tx("Enter the instructor PIN.", "Inserisci il PIN del docente.")}</p>
      <input
        className="input"
        style={{ width: 160, textAlign: "center", fontSize: 20, letterSpacing: 6 }}
        type="password"
        inputMode="numeric"
        value={value}
        autoFocus
        onChange={(e) => {
          setValue(e.target.value);
          setErr(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (value === pin) onOk();
            else setErr(true);
          }
        }}
      />
      {err && <div className="bad small">{f.tx("Wrong PIN", "PIN errato")}</div>}
      <button className="btn primary" onClick={() => (value === pin ? onOk() : setErr(true))}>
        <Icon name="Unlock" size={16} />
        {f.tx("Unlock", "Sblocca")}
      </button>
    </div>
  );
}
