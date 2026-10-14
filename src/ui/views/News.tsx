import { ACHIEVEMENTS, SECTORS, roundLabel, type GameEvent } from "../../core";
import { Icon } from "../components/Icon";
import { Badge, Card, Empty, InfoTip, Progress } from "../components/ui";
import { useActiveCompany, useGame } from "../hooks";
import { useFmt } from "../i18n";
import { useStore } from "../store";

export function EventCard({ e }: { e: GameEvent }) {
  const f = useFmt();
  const tone = e.impact === "positive" ? "good" : e.impact === "negative" ? "bad" : "accent";
  return (
    <div className="list-row" style={{ alignItems: "flex-start" }}>
      <span className={`badge ${tone}`} style={{ marginTop: 2 }}>
        <Icon name={e.scope === "global" ? "Globe" : e.scope === "custom" ? "MonitorPlay" : e.scope === "team" ? "Users" : "Building2"} size={12} />
      </span>
      <div className="grow">
        <div className="row gap-8 wrap">
          <b>{f.L(e.title)}</b>
          {e.sectors && <span className="small faint">{e.sectors.map((s) => f.L(SECTORS[s].name)).join(", ")}</span>}
          {e.concept && <InfoTip concept={e.concept} />}
        </div>
        <div className="small muted">{f.L(e.description)}</div>
      </div>
    </div>
  );
}

export function News() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const revealed = useStore((s) => s.revealedCompanyId);
  const showPrivate = !!c && (game.config.mode !== "hotseat" || revealed === c.id);
  const visible = game.events.filter((e) => e.scope === "global" || e.scope === "custom" ? e.companyId === null || e.companyId === c?.id : showPrivate && e.companyId === c?.id);
  const rounds = Array.from(new Set(visible.map((e) => e.round))).sort((a, b) => b - a);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("News & reputation", "News e reputazione")}</h1>
          <p className="muted">{f.tx("What happens in the world changes the rules for everyone.", "Ciò che succede nel mondo cambia le regole per tutti.")}</p>
        </div>
      </div>
      <Card title={f.tx("Breaking news this round", "Ultime notizie di questo round")} icon="Newspaper">
        {game.outlook.length === 0 ? <p className="muted">{f.tx("A quiet period: no major market news.", "Un periodo tranquillo: nessuna grande notizia di mercato.")}</p> : game.outlook.map((e) => <EventCard key={e.id} e={e} />)}
      </Card>
      {c && showPrivate && (
        <div className="grid cols-2">
          <Card title={f.tx("Reputation", "Reputazione")} icon="Star" action={<InfoTip concept="reputation" />}>
            {(
              [
                ["investors", f.tx("Investors", "Investitori"), f.tx("Fundraising success", "Successo nella raccolta")],
                ["media", f.tx("Media", "Media"), f.tx("Lower CAC, more inbound", "CAC più basso, più contatti spontanei")],
                ["talent", f.tx("Talent", "Talenti"), f.tx("Easier hiring", "Assunzioni più facili")],
                ["customers", f.tx("Customers", "Clienti"), f.tx("Lower churn", "Churn più basso")],
              ] as const
            ).map(([k, label, hint]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div className="row between small">
                  <span style={{ fontWeight: 600 }}>{label}</span>
                  <span className="num">{Math.round(c.reputation[k])}</span>
                </div>
                <Progress value={c.reputation[k] / 100} thin />
                <div className="tiny faint">{hint}</div>
              </div>
            ))}
            <div className="row between small">
              <span style={{ fontWeight: 600 }}>{f.tx("Brand", "Brand")}</span>
              <span className="num">{Math.round(c.brand * 100)}</span>
            </div>
            <Progress value={c.brand} thin />
          </Card>
          <Card title={f.tx("Achievements", "Traguardi")} icon="Award">
            {c.achievements.length === 0 ? (
              <Empty icon="Award">{f.tx("No achievements yet.", "Ancora nessun traguardo.")}</Empty>
            ) : (
              <div className="col">
                {c.achievements.map((a) => {
                  const def = ACHIEVEMENTS.find((x) => x.id === a.id);
                  if (!def) return null;
                  return (
                    <div key={a.id} className="row gap-12">
                      <span className="logo" style={{ width: 32, height: 32, background: "var(--accent-soft)", color: "var(--accent-text)" }}>
                        <Icon name={def.icon} size={16} />
                      </span>
                      <div className="grow">
                        <div style={{ fontWeight: 600 }}>{f.L(def.name)}</div>
                        <div className="small faint">{f.L(def.description)}</div>
                      </div>
                      <Badge>R{a.round}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
      <Card title={f.tx("Timeline", "Cronologia")} icon="CalendarClock">
        {rounds.length === 0 ? (
          <Empty icon="Newspaper">{f.tx("Nothing has happened yet.", "Non è ancora successo nulla.")}</Empty>
        ) : (
          rounds.map((r) => (
            <div key={r} style={{ marginBottom: 12 }}>
              <div className="small faint" style={{ fontWeight: 600, marginTop: 8 }}>
                {f.L(roundLabel(game.config, Math.min(r, game.config.totalRounds)))}
              </div>
              {visible
                .filter((e) => e.round === r)
                .map((e) => (
                  <EventCard key={e.id} e={e} />
                ))}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
