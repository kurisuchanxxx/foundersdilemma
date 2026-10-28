import { SCORING_LABEL, SECTORS, SHOWDOWN_DEFS, levelFor, roundLabel, standings } from "../../core";
import { AvatarStack } from "../components/Avatar";
import { LevelChip, showdownValueLabel } from "../components/Gamify";
import { Icon } from "../components/Icon";
import { Badge, Card, InfoTip, Logo } from "../components/ui";
import { useActiveCompany, useGame } from "../hooks";
import { useFmt } from "../i18n";

export function StandingsTable({ highlight, compact }: { highlight?: string | null; compact?: boolean }) {
  const f = useFmt();
  const game = useGame();
  const rows = standings(game);
  const mode = game.config.scoring;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>{f.tx("Company", "Azienda")}</th>
            {!compact && <th>{f.tx("Sector", "Settore")}</th>}
            <th className="num">{mode === "balanced" ? f.tx("Score", "Punteggio") : mode === "valuation" ? f.tx("Valuation", "Valutazione") : f.tx("Founder wealth", "Ricchezza fondatori")}</th>
            {mode !== "valuation" && <th className="num">{f.tx("Valuation", "Valutazione")}</th>}
            {mode !== "founderWealth" && !compact && <th className="num">{f.tx("Founder wealth", "Ricchezza fondatori")}</th>}
            <th className="num">{f.tx("Founders own", "Quota fondatori")}</th>
            {!compact && <th className="num">{f.tx("Monthly revenue", "Fatturato mensile")}</th>}
            {!compact && <th className="num">{f.tx("Customers", "Clienti")}</th>}
            <th className="num">XP</th>
            <th>{f.tx("Status", "Stato")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const c = game.companies.find((x) => x.id === r.companyId)!;
            return (
              <tr key={r.companyId} className={highlight === c.id ? "me" : ""}>
                <td>{r.rank === 1 ? <Icon name="Trophy" size={15} className="warn" /> : r.rank}</td>
                <td>
                  <div className="row gap-8">
                    <Logo company={c} size={24} />
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {c.name} {c.isBot && <Badge>bot</Badge>}
                      </div>
                      {c.teamMembers.length > 0 && !compact && <div className="tiny faint">{c.teamMembers.join(", ")}</div>}
                    </div>
                  </div>
                </td>
                {!compact && <td className="small muted">{f.L(SECTORS[c.sector].name)}</td>}
                <td className="num" style={{ fontWeight: 650 }}>
                  {mode === "balanced" ? f.num(r.score, 1) : f.money(r.score)}
                </td>
                {mode !== "valuation" && <td className="num">{f.money(r.valuation)}</td>}
                {mode !== "founderWealth" && !compact && <td className="num">{f.money(r.founderWealth)}</td>}
                <td className="num">
                  {f.pct(r.ownership, 0)} {r.king && <Icon name="Crown" size={12} className="warn" />}
                </td>
                {!compact && <td className="num">{f.money(r.mrr)}</td>}
                {!compact && <td className="num">{f.compact(r.customers)}</td>}
                <td className="num">
                  <span className="row gap-4" style={{ justifyContent: "flex-end" }}>
                    {!compact && <LevelChip xp={c.xp} />}
                    <span className="small">{c.xp}</span>
                    {c.cups > 0 && (
                      <span className="warn small">
                        <Icon name="Trophy" size={11} /> {c.cups}
                      </span>
                    )}
                  </span>
                </td>
                <td>
                  {r.status === "active" ? <Badge tone="accent">{f.tx("active", "attiva")}</Badge> : r.status === "exited" ? <Badge tone="good">exit</Badge> : <Badge tone="bad">{f.tx("bankrupt", "fallita")}</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StandingsPodium({ highlight }: { highlight?: string | null }) {
  const f = useFmt();
  const game = useGame();
  const rows = standings(game).slice(0, 3);
  const mode = game.config.scoring;
  if (rows.length < 2) return null;
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  return (
    <div className="podium animate">
      {order.map((r) => {
        const c = game.companies.find((x) => x.id === r.companyId)!;
        return (
          <div key={r.companyId} className={`podium-col place-${r.rank} ${c.id === highlight ? "me" : ""}`}>
            <div className="podium-team">
              <Logo company={c} size={40} />
              <AvatarStack founders={c.founders} size={22} />
              <div className="small" style={{ fontWeight: 650, textAlign: "center" }}>
                {c.name}
              </div>
              <div className="tiny faint num">{mode === "balanced" ? f.num(r.score, 1) : f.money(r.score)}</div>
            </div>
            <div className="podium-block">
              <span className="podium-rank">{r.rank === 1 ? <Icon name="Trophy" size={18} /> : r.rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Leaderboard() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const byXp = [...game.companies].sort((a, b) => b.xp - a.xp || b.cups - a.cups);
  const resolved = game.showdowns.filter((s) => s.resolved).slice().reverse();
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("Leaderboard", "Classifica")}</h1>
          <p className="muted">
            {f.L(SCORING_LABEL[game.config.scoring].name)}: {f.L(SCORING_LABEL[game.config.scoring].description)}
          </p>
        </div>
      </div>
      <Card>
        <StandingsPodium highlight={c?.id} />
      </Card>
      <Card>
        <StandingsTable highlight={c?.id} />
      </Card>
      <div className="grid cols-2">
        <Card title={f.tx("Engagement: XP and cups", "Engagement: XP e coppe")} icon="Star" action={<InfoTip text={f.tx("XP measures how actively a team plays (challenges, showdowns, achievements, founder network). It never changes the economic ranking above.", "Gli XP misurano quanto attivamente gioca un team (sfide, sfide di squadra, traguardi, rete dei fondatori). Non cambiano mai la classifica economica qui sopra.")} />}>
          <div className="col">
            {byXp.map((co, i) => {
              const lv = levelFor(co.xp);
              return (
                <div key={co.id} className="list-row" style={{ background: co.id === c?.id ? "var(--accent-soft)" : undefined, borderRadius: 8, padding: "6px 8px" }}>
                  <span className="faint small num" style={{ width: 18 }}>
                    {i + 1}
                  </span>
                  <Logo company={co} size={24} />
                  <span className="grow small" style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {co.name}
                  </span>
                  <span className="xp-level">
                    <LevelChip xp={co.xp} />
                  </span>
                  <span className="small num" style={{ width: 60, textAlign: "right" }}>
                    {co.xp} XP
                  </span>
                  <span className="small warn num" style={{ width: 40, textAlign: "right" }}>
                    {co.cups > 0 ? (
                      <>
                        <Icon name="Trophy" size={11} /> {co.cups}
                      </>
                    ) : (
                      ""
                    )}
                  </span>
                  <span className="tiny faint xp-next" style={{ width: 90, textAlign: "right" }}>
                    {lv.nextAt !== null ? `${lv.nextAt - lv.xp} ${f.tx("to next", "al prossimo")}` : f.tx("max level", "livello massimo")}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title={f.tx("Showdown history", "Storico delle sfide di squadra")} icon="Swords">
          {resolved.length === 0 ? (
            <p className="muted">{f.tx("The first showdown is decided at the end of this round.", "La prima sfida di squadra si decide alla fine di questo round.")}</p>
          ) : (
            <div className="col">
              {resolved.map((s) => {
                const def = SHOWDOWN_DEFS[s.kind];
                const win = s.results[0] ? game.companies.find((x) => x.id === s.results[0].companyId) : null;
                const mine = s.results.find((r) => r.companyId === c?.id);
                return (
                  <div key={s.id} className="list-row">
                    <Icon name={def.icon} size={15} className="accent" />
                    <div className="grow small">
                      <b>{f.L(def.title)}</b> · {f.L(roundLabel(game.config, s.round))}
                      {win && s.results[0] && (
                        <div className="tiny muted">
                          <Icon name="Trophy" size={10} /> {win.name} ({showdownValueLabel(f, s.kind, s.results[0].value)})
                          {mine && mine.rank > 1 ? ` · ${f.tx("you", "voi")}: ${mine.rank}/${s.results.length}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
      <Card title={f.tx("Reading the leaderboard", "Come leggere la classifica")} icon="Info">
        <p className="small muted">
          {f.tx(
            "Founder wealth is what the founders' shares are worth after dilution and liquidation preferences: a company can be very valuable while its founders own little of it. The crown marks founders who still control both the shares and the board (the 'King' outcome).",
            "La ricchezza dei fondatori è il valore delle loro quote dopo diluizione e liquidation preference: un'azienda può valere molto mentre i fondatori ne possiedono poco. La corona indica i fondatori che controllano ancora sia le quote sia il CdA (l'esito 'Re').",
          )}{" "}
          <InfoTip concept="richVsKing" /> <InfoTip concept="liquidationPreference" />
        </p>
      </Card>
    </div>
  );
}
