import { roundLabel, standings, type Company, type RoundReport } from "../../core";
import { Icon } from "../components/Icon";
import { Callout, Card, InfoTip, Logo, Modal, Stat } from "../components/ui";
import { change, useActiveCompany, useGame } from "../hooks";
import { useFmt } from "../i18n";
import { useStore } from "../store";
import { StandingsTable } from "./Leaderboard";
import { EventCard } from "./News";

const LINE_ICON: Record<string, string> = { info: "Info", good: "Check", bad: "AlertTriangle", event: "Zap", finance: "HandCoins", team: "Users", product: "Rocket" };

export function ReportBody({ c, report }: { c: Company; report: RoundReport }) {
  const f = useFmt();
  const game = useGame();
  const snap = c.history.find((h) => h.round === report.round);
  const prev = c.history.find((h) => h.round === report.round - 1);
  const events = game.events.filter((e) => report.eventIds.includes(e.id));
  return (
    <div className="col gap-16">
      {snap && (
        <div className="grid cols-4">
          <Card className="flat">
            <Stat label={f.tx("Cash", "Cassa")} value={f.money(snap.cash)} delta={change(snap.cash, prev?.cash)} tone={snap.cash < 0 ? "bad" : undefined} />
          </Card>
          <Card className="flat">
            <Stat label={f.tx("Monthly revenue", "Fatturato mensile")} value={f.money(snap.mrr)} delta={change(snap.mrr, prev?.mrr)} />
          </Card>
          <Card className="flat">
            <Stat label={f.tx("Customers", "Clienti")} value={f.compact(snap.customers)} delta={change(snap.customers, prev?.customers)} />
          </Card>
          <Card className="flat">
            <Stat label={f.tx("Valuation", "Valutazione")} value={f.money(snap.valuation)} delta={change(snap.valuation, prev?.valuation)} />
          </Card>
        </div>
      )}
      <Card title={f.tx("What happened", "Cosa è successo")} icon="ClipboardList">
        {report.lines.length === 0 ? (
          <p className="muted">—</p>
        ) : (
          report.lines.map((l, i) => (
            <div key={i} className="list-row" style={{ alignItems: "flex-start" }}>
              <Icon name={LINE_ICON[l.kind] ?? "Info"} size={15} className={l.kind === "bad" ? "bad" : l.kind === "good" ? "good" : "accent"} />
              <div className="grow small">{f.L(l.text)}</div>
            </div>
          ))
        )}
      </Card>
      {(report.pitchResults.length > 0 || report.hiringResults.length > 0) && (
        <div className="grid cols-2">
          {report.pitchResults.length > 0 && (
            <Card title={f.tx("Investors' answers", "Risposte degli investitori")} icon="Presentation">
              {report.pitchResults.map((p) => (
                <div key={p.investorId} className="list-row" style={{ alignItems: "flex-start" }}>
                  <Icon name={p.outcome === "closed" ? "Check" : p.outcome === "termSheet" ? "FileText" : "X"} size={15} className={p.outcome === "closed" ? "good" : p.outcome === "termSheet" ? "warn" : "bad"} />
                  <div className="grow small">
                    <b>{p.investorName}</b>: “{f.L(p.reason)}”
                  </div>
                </div>
              ))}
            </Card>
          )}
          {report.hiringResults.length > 0 && (
            <Card title={f.tx("Candidates' answers", "Risposte dei candidati")} icon="UserPlus">
              {report.hiringResults.map((h) => (
                <div key={h.candidateId} className="list-row" style={{ alignItems: "flex-start" }}>
                  <Icon name={h.outcome === "hired" ? "Check" : h.outcome === "counter" ? "MessageCircle" : "X"} size={15} className={h.outcome === "hired" ? "good" : h.outcome === "counter" ? "warn" : "bad"} />
                  <div className="grow small">
                    <b>{h.candidateName}</b>: {f.L(h.reason)}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
      {events.length > 0 && (
        <Card title={f.tx("Events", "Eventi")} icon="Zap">
          {events.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </Card>
      )}
      {report.insights.length > 0 && (
        <Card title={f.tx("Mentor's comments", "Commenti del mentor")} icon="Lightbulb">
          <div className="col">
            {report.insights.map((i, k) => (
              <Callout key={k} tone={i.severity === "critical" ? "bad" : i.severity === "warn" ? "warn" : i.severity === "good" ? "good" : "info"}>
                {f.L(i.text)} {i.concept && <InfoTip concept={i.concept} />}
              </Callout>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function RoundReportModal({ round }: { round: number }) {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const close = useStore((s) => s.closeReport);
  const setView = useStore((s) => s.setView);
  const role = useStore((s) => s.classroomRole);
  const mode = game.config.mode;
  const personal = mode === "solo" || role === "team";
  const report = c ? game.reports.find((r) => r.round === round && r.companyId === c.id) : undefined;
  const leader = standings(game)[0];
  const leaderCo = game.companies.find((x) => x.id === leader?.companyId);
  return (
    <Modal
      wide
      title={`${f.tx("Results", "Risultati")}: ${f.L(roundLabel(game.config, round))}`}
      onClose={close}
      footer={
        <>
          {game.finished && (
            <button
              className="btn primary"
              onClick={() => {
                close();
                setView("results");
              }}
            >
              <Icon name="Trophy" size={16} />
              {f.tx("See final results", "Vedi i risultati finali")}
            </button>
          )}
          <button className="btn" onClick={close}>
            {f.tx("Continue", "Continua")}
          </button>
        </>
      }
    >
      {personal && c && report ? (
        <div className="col gap-16">
          <div className="row gap-12">
            <Logo company={c} size={40} />
            <h2>{c.name}</h2>
          </div>
          <ReportBody c={c} report={report} />
        </div>
      ) : (
        <div className="col gap-16">
          <Callout tone="info" icon="Users">
            {f.tx(
              "The round has been simulated. Each team will see its detailed report on its dashboard and in 'Round reports'.",
              "Il round è stato simulato. Ogni team vedrà il report dettagliato nel proprio cruscotto e in 'Report dei round'.",
            )}
          </Callout>
          {leaderCo && (
            <Callout tone="good" icon="Trophy">
              {f.tx(`Current leader: ${leaderCo.name}.`, `In testa ora: ${leaderCo.name}.`)}
            </Callout>
          )}
          {!game.finished && game.outlook.length > 0 && (
            <Card title={f.tx("News for the next round", "Notizie per il prossimo round")} icon="Newspaper">
              {game.outlook.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </Card>
          )}
          <Card title={f.tx("Leaderboard", "Classifica")} icon="Trophy">
            <StandingsTable compact />
          </Card>
        </div>
      )}
    </Modal>
  );
}
