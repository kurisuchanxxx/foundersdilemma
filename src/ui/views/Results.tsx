import { Fragment, useState } from "react";
import { ACHIEVEMENTS, PMF_THRESHOLD, SECTORS, decisionsCsv, historyCsv, standings, standingsCsv, type Company } from "../../core";
import { isFramed, saveTextFile } from "../../platform/files";
import { LineChart, Scatter } from "../components/charts";
import { Icon } from "../components/Icon";
import { AvatarStack } from "../components/Avatar";
import { LevelChip } from "../components/Gamify";
import { Badge, Callout, Card, InfoTip, Logo } from "../components/ui";
import { useActiveCompany, useGame } from "../hooks";
import { useFmt } from "../i18n";
import { useStore } from "../store";
import { downloadTeamReport } from "../report/teamReport";
import { StandingsTable } from "./Leaderboard";

export function Results() {
  const f = useFmt();
  const game = useGame();
  const active = useActiveCompany();
  const lang = useStore((s) => s.lang);
  const role = useStore((s) => s.classroomRole);
  const rows = standings(game);
  const [focus, setFocus] = useState<string>(active?.id ?? rows[0]?.companyId ?? "");
  const byId = (id: string) => game.companies.find((c) => c.id === id)!;
  const humans = game.companies.filter((c) => !c.isBot);
  const podium = rows.slice(0, 3).map((r) => ({ r, c: byId(r.companyId) }));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{game.finished ? f.tx("Final results & debrief", "Risultati finali e debriefing") : f.tx("Results so far", "Risultati finora")}</h1>
          <p className="muted">{game.config.sessionName || game.config.seed}</p>
        </div>
        <div className="row wrap no-print">
          {!isFramed() && (
            <button className="btn" onClick={() => window.print()}>
              <Icon name="Printer" size={16} />
              {f.tx("Print / PDF", "Stampa / PDF")}
            </button>
          )}
          {role !== "team" && (
            <>
              <button className="btn" onClick={() => saveTextFile(`${game.config.seed}_standings.csv`, standingsCsv(game, lang), [{ name: "CSV", extensions: ["csv"] }], "text/csv")}>
                <Icon name="FileSpreadsheet" size={16} />
                {f.tx("Standings CSV", "CSV classifica")}
              </button>
              <button className="btn" onClick={() => saveTextFile(`${game.config.seed}_history.csv`, historyCsv(game, lang), [{ name: "CSV", extensions: ["csv"] }], "text/csv")}>
                <Icon name="FileSpreadsheet" size={16} />
                {f.tx("History CSV", "CSV storico")}
              </button>
              <button className="btn" onClick={() => saveTextFile(`${game.config.seed}_decisions.csv`, decisionsCsv(game, lang), [{ name: "CSV", extensions: ["csv"] }], "text/csv")}>
                <Icon name="FileSpreadsheet" size={16} />
                {f.tx("Decisions CSV", "CSV decisioni")}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid cols-3">
        {podium.map(({ r, c }, i) => (
          <Card key={c.id} className={i === 0 ? "selected" : ""}>
            <div className="row gap-12">
              <span className="logo" style={{ width: 36, height: 36, background: i === 0 ? "var(--s4)" : "var(--surface-3)", color: i === 0 ? "#fff" : "var(--text-2)" }}>
                <Icon name={i === 0 ? "Trophy" : "Medal"} size={18} />
              </span>
              <Logo company={c} size={36} />
              <div className="grow">
                <div style={{ fontWeight: 700 }}>
                  {i + 1}. {c.name}
                </div>
                <div className="small muted">
                  {f.tx("Founders", "Fondatori")} {f.money(r.founderWealth)} · {f.tx("valuation", "valutazione")} {f.money(r.valuation)}
                </div>
              </div>
              <AvatarStack founders={c.founders} size={24} />
            </div>
          </Card>
        ))}
      </div>

      <Card title={f.tx("Final standings", "Classifica finale")} icon="Trophy">
        <StandingsTable highlight={active?.id} />
      </Card>

      <div className="grid cols-3">
        {(() => {
          const byXp = [...game.companies].sort((a, b) => b.xp - a.xp);
          const byCups = [...game.companies].sort((a, b) => b.cups - a.cups);
          const byStreak = [...game.companies].sort((a, b) => b.challengeLog.filter((o) => o.completed).length - a.challengeLog.filter((o) => o.completed).length);
          const cards = [
            { icon: "Star", title: f.tx("Most engaged team", "Team più coinvolto"), c: byXp[0], sub: byXp[0] ? `${byXp[0].xp} XP` : "" },
            { icon: "Trophy", title: f.tx("Showdown champion", "Campione delle sfide di squadra"), c: byCups[0]?.cups > 0 ? byCups[0] : undefined, sub: byCups[0] ? `${byCups[0].cups} ${f.tx("cups", "coppe")}` : "" },
            { icon: "Flag", title: f.tx("Challenge hunter", "Cacciatore di sfide"), c: byStreak[0], sub: byStreak[0] ? `${byStreak[0].challengeLog.filter((o) => o.completed).length} ${f.tx("challenges completed", "sfide completate")}` : "" },
          ];
          return cards.map((k) => (
            <Card key={k.title}>
              <div className="row gap-12">
                <span className="logo" style={{ width: 36, height: 36, background: "var(--surface-3)", color: "var(--warn)" }}>
                  <Icon name={k.icon} size={18} />
                </span>
                {k.c ? (
                  <>
                    <Logo company={k.c} size={32} />
                    <div className="grow">
                      <div className="tiny faint">{k.title}</div>
                      <div style={{ fontWeight: 650 }}>{k.c.name}</div>
                      <div className="small muted row gap-4">
                        {k.sub} <LevelChip xp={k.c.xp} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grow">
                    <div className="tiny faint">{k.title}</div>
                    <div className="small muted">—</div>
                  </div>
                )}
              </div>
            </Card>
          ));
        })()}
      </div>

      <div className="grid cols-2">
        <Card title={f.tx("Rich or King?", "Ricco o Re?")} icon="Crown" action={<InfoTip concept="richVsKing" />}>
          <Scatter
            points={game.companies
              .filter((c) => c.status !== "bankrupt")
              .map((c) => {
                const r = rows.find((x) => x.companyId === c.id)!;
                return { id: c.id, x: r.voting, y: Math.max(1_000, r.founderWealth), label: `${c.name}${r.king ? " 👑" : ""}`, color: c.color, highlight: !c.isBot };
              })}
            xLabel={f.tx("Founders' share of votes", "Quota di voti dei fondatori")}
            yLabel={f.tx("Founders' wealth", "Ricchezza dei fondatori")}
            xFormat={(v) => f.pct(v)}
            yFormat={(v) => f.money(v)}
            xSplit={0.5}
            logY
          />
          <p className="small faint mt-8">
            {f.tx(
              "Right of the line: founders keep the majority of votes (👑 = they also control the board: King). Higher up: founders' stake is worth more (Rich). Few teams manage both: Wasserman's founder's dilemma.",
              "A destra della linea: i fondatori mantengono la maggioranza dei voti (👑 = controllano anche il CdA: Re). Più in alto: la quota dei fondatori vale di più (Ricco). Pochi team riescono in entrambe: il dilemma del fondatore di Wasserman.",
            )}
          </p>
        </Card>
        <Card
          title={f.tx("Valuation over time", "Valutazione nel tempo")}
          icon="LineChart"
          action={
            <select className="input" style={{ width: "auto", padding: "4px 8px" }} value={focus} onChange={(e) => setFocus(e.target.value)}>
              {game.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          }
        >
          <LineChart
            series={game.companies.map((c) => ({ id: c.id, label: c.name, color: "var(--s1)", muted: c.id !== focus, points: c.history.map((h) => ({ x: h.round, y: h.valuation })) }))}
            xFormat={(r) => `R${r}`}
            yFormat={(v) => f.money(v)}
            height={260}
          />
        </Card>
      </div>

      <h2>{f.tx("Team journeys", "Il percorso dei team")}</h2>
      <div className="grid cols-2">
        {(humans.length > 0 ? humans : game.companies).map((c) => (
          <Journey key={c.id} c={c} rank={rows.find((r) => r.companyId === c.id)?.rank ?? 0} />
        ))}
      </div>

      <Card title={f.tx("Debrief questions", "Domande per il debriefing")} icon="MessagesSquare">
        <ol style={{ margin: 0, paddingLeft: 20 }} className="col gap-8">
          {[
            f.tx("When did you reach (or miss) product-market fit? Which decisions made the difference?", "Quando avete raggiunto (o mancato) il product-market fit? Quali decisioni hanno fatto la differenza?"),
            f.tx("Compare your founders' ownership with your valuation: was each funding round worth its dilution?", "Confrontate la quota dei fondatori con la valutazione: ogni round valeva la sua diluizione?"),
            f.tx("Which founder's dilemma was the hardest? Would you choose the same again, knowing the consequences?", "Quale dilemma del fondatore è stato il più difficile? Rifareste la stessa scelta, conoscendo le conseguenze?"),
            f.tx("Where would you place yourselves between 'rich' and 'king'? Was it a deliberate choice?", "Dove vi collochereste tra 'ricco' e 're'? È stata una scelta consapevole?"),
            f.tx("Compare your strategy with the bots (lean, steady, blitz): which style won in your sector and why?", "Confrontate la vostra strategia con i bot (lean, steady, blitz): quale stile ha vinto nel vostro settore e perché?"),
            f.tx("If you started again tomorrow with the same sector, what would you do in the first three rounds?", "Se ricominciaste domani nello stesso settore, cosa fareste nei primi tre round?"),
          ].map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </Card>
      {!game.finished && <Callout tone="info">{f.tx("The game is still in progress: results are provisional.", "La partita è ancora in corso: i risultati sono provvisori.")}</Callout>}
    </div>
  );
}

function Journey({ c, rank }: { c: Company; rank: number }) {
  const f = useFmt();
  const game = useGame();
  const lang = useStore((s) => s.lang);
  const pmfRound = c.history.find((h) => h.pmf >= PMF_THRESHOLD)?.round;
  const firstRaise = c.fundingHistory.find((x) => x.instrument !== "loan");
  const last = c.history[c.history.length - 1];
  const items: Array<[string, string]> = [
    [f.tx("Launch", "Lancio"), c.product.launchRound ? `${f.tx("round", "round")} ${c.product.launchRound}` : f.tx("never launched", "mai lanciato")],
    ["Product-market fit", pmfRound ? `${f.tx("round", "round")} ${pmfRound}` : f.tx("not reached", "non raggiunto")],
    [f.tx("First external money", "Primi capitali esterni"), firstRaise ? `${firstRaise.investorName}, R${firstRaise.round}` : f.tx("none (bootstrapped)", "nessuno (bootstrapping)")],
    [f.tx("Total raised", "Totale raccolto"), f.money(c.totalRaised)],
    [f.tx("Final team", "Team finale"), `${c.team.length + c.founders.filter((x) => x.active).length} ${f.tx("people", "persone")}`],
    [f.tx("Final monthly revenue", "Fatturato mensile finale"), f.money(last?.mrr ?? 0)],
  ];
  return (
    <Card>
      <div className="row gap-12" style={{ marginBottom: 12 }}>
        <Logo company={c} size={40} />
        <div className="grow">
          <div style={{ fontWeight: 700 }}>
            #{rank} {c.name}
          </div>
          <div className="small muted">
            {f.L(SECTORS[c.sector].name)} · {c.teamMembers.join(", ") || c.founders.map((x) => x.name).join(", ")}
          </div>
        </div>
        {c.status === "exited" ? <Badge tone="good">exit</Badge> : c.status === "bankrupt" ? <Badge tone="bad">{f.tx("bankrupt", "fallita")}</Badge> : null}
        <button className="btn sm" onClick={() => void downloadTeamReport(game, c, lang)} aria-label={`${f.tx("Team report", "Report del team")}: ${c.name}`}>
          <Icon name="FileText" size={14} />
          {f.tx("Team report", "Report del team")}
        </button>
      </div>
      <div className="kv">
        {items.map(([k, v]) => (
          <Fragment key={k}>
            <span>{k}</span>
            <span>{v}</span>
          </Fragment>
        ))}
      </div>
      {c.exit && (
        <Callout tone="good" icon="Handshake">
          {f.tx(`Sold to ${c.exit.acquirer} in round ${c.exit.round} for ${f.money(c.exit.value)}; founders received ${f.money(c.exit.founderPayout)}.`, `Venduta a ${c.exit.acquirer} nel round ${c.exit.round} per ${f.money(c.exit.value)}; i fondatori hanno incassato ${f.money(c.exit.founderPayout)}.`)}
        </Callout>
      )}
      {c.dilemmaHistory.length > 0 && (
        <div className="mt-16">
          <div className="small" style={{ fontWeight: 650, marginBottom: 6 }}>
            {f.tx("Dilemmas faced", "Dilemmi affrontati")}
          </div>
          {c.dilemmaHistory.map((d) => (
            <div key={d.id} className="small row gap-4 top" style={{ marginBottom: 4 }}>
              <Icon name="Scale" size={13} className="accent" />
              <span>
                R{d.round} · <b>{f.L(d.title)}</b>: {f.L(d.options.find((o) => o.id === d.chosen)?.label)}
              </span>
            </div>
          ))}
        </div>
      )}
      {c.achievements.length > 0 && (
        <div className="row wrap gap-4 mt-16">
          {c.achievements.map((a) => {
            const def = ACHIEVEMENTS.find((x) => x.id === a.id);
            return def ? (
              <span key={a.id} className="chip">
                <Icon name={def.icon} size={11} /> {f.L(def.name)}
              </span>
            ) : null;
          })}
        </div>
      )}
    </Card>
  );
}
