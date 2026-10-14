import { SCORING_LABEL, SECTORS, standings } from "../../core";
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

export function Leaderboard() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
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
        <StandingsTable highlight={c?.id} />
      </Card>
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
