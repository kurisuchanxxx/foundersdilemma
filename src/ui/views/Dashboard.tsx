import { SECTORS, currentShowdown, foundersOwnership, lastResolvedShowdown, pmfStage, roundLabel, seanEllisShare, type Company } from "../../core";
import { LineChart } from "../components/charts";
import { ChallengeRow, FounderStrip, LevelChip, ShowdownPanel, XpBar } from "../components/Gamify";
import { Icon } from "../components/Icon";
import { Badge, Callout, Card, InfoTip, Logo, Progress, Stat } from "../components/ui";
import { change, lastSnapshot, prevSnapshot, useActiveCompany, useGame } from "../hooks";
import { useFmt, type Fmt } from "../i18n";
import { useStore } from "../store";

export function healthScore(c: Company): { score: number; grade: string } {
  const h = lastSnapshot(c);
  if (!h) return { score: 50, grade: "C" };
  let s = 0;
  s += Math.min(30, (Math.min(h.runway, 24) / 24) * 30);
  s += c.product.launched ? Math.min(25, h.cac > 0 ? (h.ltv / h.cac / 3) * 25 : 12) : 12;
  s += (c.pmf.score / 100) * 25;
  s += c.morale * 10;
  s += (1 - c.product.techDebt) * 10;
  const grade = s >= 80 ? "A" : s >= 65 ? "B" : s >= 50 ? "C" : s >= 35 ? "D" : "F";
  return { score: Math.round(s), grade };
}

export function stageLabel(f: Fmt, score: number): string {
  const st = pmfStage(score);
  return {
    searching: f.tx("Searching", "In ricerca"),
    earlySignals: f.tx("Early signals", "Primi segnali"),
    promising: f.tx("Promising", "Promettente"),
    achieved: f.tx("PMF achieved", "PMF raggiunto"),
    strong: f.tx("Strong PMF", "PMF solido"),
  }[st];
}

export function Dashboard() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const setView = useStore((s) => s.setView);
  if (!c) return null;
  const s = SECTORS[c.sector];
  const last = lastSnapshot(c);
  const prev = prevSnapshot(c);
  const health = healthScore(c);
  const report = [...game.reports].reverse().find((r) => r.companyId === c.id);
  const own = foundersOwnership(c);
  const monthly = [{ month: 0, cash: s.startingCash, mrr: 0, customers: 0 }, ...c.monthly];

  return (
    <div className="stack">
      <div className="page-head">
        <div className="row gap-12">
          <Logo company={c} size={56} />
          <div>
            <h1>{c.name}</h1>
            <div className="row gap-8 wrap">
              <span className="muted">{c.productName}</span>
              <Badge tone="accent">
                <Icon name={s.icon} size={11} /> {f.L(s.name)}
              </Badge>
              <LevelChip xp={c.xp} />
            </div>
            <div className="mt-8">
              <FounderStrip company={c} size={26} />
            </div>
          </div>
        </div>
        {!game.finished && c.status === "active" && (
          <button className={`btn ${c.submitted ? "" : "primary"}`} onClick={() => setView("decisions")}>
            <Icon name="SlidersHorizontal" size={16} />
            {c.submitted ? f.tx("Review decisions", "Rivedi decisioni") : f.tx("Make this round's decisions", "Prendi le decisioni del round")}
          </button>
        )}
      </div>

      {c.status === "exited" && c.exit && (
        <Callout tone="good" icon="Trophy">
          {f.tx(
            `${c.name} was acquired by ${c.exit.acquirer} for ${f.money(c.exit.value)}. The founders received ${f.money(c.exit.founderPayout)}.`,
            `${c.name} è stata acquisita da ${c.exit.acquirer} per ${f.money(c.exit.value)}. I fondatori hanno incassato ${f.money(c.exit.founderPayout)}.`,
          )}
        </Callout>
      )}
      {c.status === "bankrupt" && (
        <Callout tone="bad" icon="AlertTriangle">
          {f.L(c.bankruptReason)} {f.tx("Use the reports to understand what went wrong: it is the most valuable lesson of the game.", "Usa i report per capire cosa è andato storto: è la lezione più preziosa del gioco.")}
        </Callout>
      )}

      <div className="grid cols-4">
        <Card>
          <Stat
            label={f.tx("Momentum", "Slancio")}
            icon="TrendingUp"
            value={
              last && prev && prev.mrr > 0
                ? last.mrr / prev.mrr >= 4
                  ? `×${f.num(last.mrr / prev.mrr, 1)}`
                  : f.pct((last.mrr - prev.mrr) / prev.mrr)
                : c.product.launched
                  ? "—"
                  : f.pct(c.product.mvpProgress)
            }
            sub={c.product.launched ? f.tx("MRR growth vs last round", "Crescita MRR sul round precedente") : f.tx("MVP progress", "Avanzamento MVP")}
            tone="accent"
          />
        </Card>
        <Card className={last && last.runway < 6 ? "danger" : ""}>
          <Stat
            label="Runway"
            icon="Timer"
            concept="runway"
            value={last ? f.months(last.runway) : f.tx("Not yet measured", "Non ancora misurata")}
            sub={last ? (last.runway < 6 ? f.tx("Critical: act now", "Critica: agisci ora") : last.runway < 12 ? f.tx("Plan your next round", "Pianifica il prossimo round") : f.tx("Comfortable", "Tranquilla")) : f.tx("Available after the first round", "Disponibile dopo il primo round")}
            tone={!last ? undefined : last.runway < 6 ? "bad" : last.runway < 12 ? "warn" : "good"}
          />
        </Card>
        <Card>
          <Stat
            label={f.tx("Health", "Salute")}
            icon="HeartPulse"
            value={health.grade}
            sub={`${health.score}/100 · ${f.tx("runway, LTV/CAC, PMF, morale, tech debt", "runway, LTV/CAC, PMF, morale, debito tecnico")}`}
            tone={health.score >= 65 ? "good" : health.score >= 45 ? "warn" : "bad"}
          />
        </Card>
        <Card tour="pmf">
          <Stat label="Product-market fit" icon="Target" concept="pmf" value={`${Math.round(c.pmf.score)}`} sub={`${stageLabel(f, c.pmf.score)} · ${f.pct(seanEllisShare(c.pmf.score))} ${f.tx("very disappointed", "molto delusi")}`} />
        </Card>
      </div>

      <div className="grid cols-2">
        <ChallengesCard c={c} />
        <ShowdownCard c={c} />
      </div>

      <div className="grid cols-2">
        <Card title={f.tx("Financial health", "Salute finanziaria")} icon="Wallet">
          <div className="grid mini">
            <Stat label={f.tx("Cash", "Cassa")} value={f.money(c.cash)} tone={c.cash < 0 ? "bad" : undefined} delta={change(last?.cash, prev?.cash)} />
            <Stat label={f.tx("Net burn / month", "Burn netto / mese")} concept="burnRate" value={last ? (last.netBurn <= 0 ? f.tx("Profitable", "In utile") : f.money(last.netBurn)) : "—"} tone={last && last.netBurn <= 0 ? "good" : undefined} />
            <Stat label={f.tx("Valuation", "Valutazione")} concept="valuation" value={f.money(c.valuation)} delta={change(last?.valuation, prev?.valuation)} />
            <Stat label={f.tx("Founders' ownership", "Quota dei fondatori")} concept="dilution" value={f.pct(own, 1)} sub={c.totalRaised > 0 ? `${f.tx("raised", "raccolti")} ${f.money(c.totalRaised)}` : f.tx("bootstrapped so far", "finora senza investitori")} />
          </div>
          {last && (
            <div className="mt-16">
              <div className="row between small" style={{ marginBottom: 4 }}>
                <span className="muted">{f.tx("Runway vs 18-month target", "Runway rispetto all'obiettivo di 18 mesi")}</span>
                <span className="num">{f.months(last.runway)}</span>
              </div>
              <Progress value={Math.min(1, last.runway / 18)} tone={last.runway < 6 ? "bad" : last.runway < 12 ? "warn" : "good"} />
            </div>
          )}
        </Card>
        <Card title={f.tx("Growth & unit economics", "Crescita e unit economics")} icon="LineChart">
          {c.product.launched ? (
            <div className="grid mini">
              <Stat label={f.tx("Monthly revenue", "Fatturato mensile")} concept="mrr" value={f.money(c.mrr)} delta={change(last?.mrr, prev?.mrr)} />
              <Stat label={f.tx("Customers", "Clienti")} value={f.compact(c.customers)} delta={change(last?.customers, prev?.customers)} />
              <Stat label={f.tx("Monthly churn", "Churn mensile")} concept="churn" value={f.pct(c.churn, 1)} deltaGood={false} delta={change(last?.churn, prev?.churn)} />
              <Stat label="CAC" concept="cac" value={f.money(c.cac)} />
              <Stat label="LTV" concept="ltv" value={f.money(c.ltv)} />
              <Stat label="LTV / CAC" concept="ltvCac" value={c.cac > 0 ? `${f.num(c.ltv / c.cac, 1)}×` : "—"} tone={c.cac > 0 ? (c.ltv / c.cac >= 3 ? "good" : c.ltv / c.cac < 1 ? "bad" : "warn") : undefined} />
            </div>
          ) : (
            <div className="col gap-12">
              <div className="row between">
                <span className="muted">{f.tx("MVP progress", "Avanzamento MVP")}</span>
                <span className="num" style={{ fontWeight: 650 }}>
                  {f.pct(c.product.mvpProgress)}
                </span>
              </div>
              <Progress value={c.product.mvpProgress} />
              <div className="kv">
                <span>{f.tx("Waitlist", "Lista d'attesa")}</span>
                <span>{f.compact(c.waitlist)}</span>
                <span>{f.tx("Can launch early from", "Lancio anticipato possibile da")}</span>
                <span>50%</span>
              </div>
              <p className="small faint">{f.tx("Before launch there is no revenue: marketing builds a waitlist that converts at launch.", "Prima del lancio non ci sono ricavi: il marketing costruisce una lista d'attesa che converte al lancio.")}</p>
            </div>
          )}
        </Card>
      </div>

      {c.monthly.length > 0 && (
        <div className="grid cols-2">
          <Card title={f.tx("Cash over time", "Cassa nel tempo")} icon="Wallet">
            <LineChart series={[{ id: "cash", label: f.tx("Cash", "Cassa"), color: "var(--s1)", points: monthly.map((p) => ({ x: p.month, y: p.cash })) }]} xFormat={(m) => `M${m}`} yFormat={(v) => f.money(v)} area height={180} />
          </Card>
          <Card title={f.tx("Monthly revenue (MRR)", "Fatturato mensile (MRR)")} icon="LineChart">
            <LineChart series={[{ id: "mrr", label: "MRR", color: "var(--s3)", points: monthly.map((p) => ({ x: p.month, y: p.mrr })) }]} xFormat={(m) => `M${m}`} yFormat={(v) => f.money(v)} area height={180} />
          </Card>
        </div>
      )}

      <div className="grid cols-2">
        <Card tour="mentor" title={f.tx("Mentor", "Mentor")} icon="Lightbulb" action={report ? <span className="small faint">{f.L(roundLabel(game.config, report.round))}</span> : null}>
          {report && report.insights.length > 0 ? (
            <div className="col">
              {report.insights.map((i, k) => (
                <Callout key={k} tone={i.severity === "critical" ? "bad" : i.severity === "warn" ? "warn" : i.severity === "good" ? "good" : "info"}>
                  <span>{f.L(i.text)}</span> {i.concept && <InfoTip concept={i.concept} />}
                </Callout>
              ))}
            </div>
          ) : (
            <p className="muted">
              {f.tx(
                "Welcome! Start by talking to customers (discovery), building your MVP and keeping an eye on runway. The mentor will comment on your numbers after every round.",
                "Benvenuti! Iniziate parlando con i clienti (discovery), costruendo l'MVP e tenendo d'occhio la runway. Il mentor commenterà i vostri numeri dopo ogni round.",
              )}
            </p>
          )}
        </Card>
        <Card title={f.tx("This round", "Questo round")} icon="CalendarClock">
          <ThisRound c={c} />
        </Card>
      </div>
    </div>
  );
}

function ChallengesCard({ c }: { c: Company }) {
  const f = useFmt();
  const game = useGame();
  const lastRound = game.round - 1;
  const last = c.challengeLog.filter((o) => o.round === lastRound);
  const done = last.filter((o) => o.completed).length;
  const applicable = last.filter((o) => o.applicable).length;
  return (
    <Card title={f.tx("Round challenges", "Sfide del round")} icon="Flag" tour="challenges" action={<span className="small faint">{f.tx("bonus XP", "XP bonus")}</span>}>
      {game.finished ? (
        <p className="muted">{f.tx("The game is over: no more challenges.", "La partita è finita: niente più sfide.")}</p>
      ) : game.challenges.length === 0 ? (
        <p className="muted">{f.tx("Challenges appear at the start of each round.", "Le sfide compaiono all'inizio di ogni round.")}</p>
      ) : (
        <div>
          {game.challenges.map((ch) => (
            <ChallengeRow key={ch.id} challenge={ch} />
          ))}
        </div>
      )}
      {last.length > 0 && (
        <div className="row between small mt-16 wrap gap-4">
          <span className="muted">
            {f.tx("Last round", "Round scorso")}: <b>{done}</b> / {applicable} {f.tx("completed", "completate")}
          </span>
          {c.challengeStreak > 0 && (
            <span className="chip good">
              <Icon name="Flame" size={12} /> {f.tx("streak", "serie")} {c.challengeStreak}
            </span>
          )}
        </div>
      )}
      <div className="mt-16">
        <XpBar company={c} />
      </div>
    </Card>
  );
}

function ShowdownCard({ c }: { c: Company }) {
  const f = useFmt();
  const game = useGame();
  const open = currentShowdown(game);
  const last = lastResolvedShowdown(game);
  return (
    <Card title={f.tx("Team showdown", "Sfida di squadra")} icon="Swords" action={c.cups > 0 ? <span className="chip good"><Icon name="Trophy" size={12} /> {c.cups} {f.tx(c.cups === 1 ? "cup" : "cups", c.cups === 1 ? "coppa" : "coppe")}</span> : null}>
      <div className="col gap-16">
        {open && !game.finished ? (
          <ShowdownPanel showdown={open} game={game} highlight={c.id} />
        ) : (
          <p className="muted small">{f.tx("A new race against the other teams is announced every round.", "Ogni round viene annunciata una nuova gara contro gli altri team.")}</p>
        )}
        {last && (
          <div>
            <div className="tiny faint" style={{ textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {f.tx("Last result", "Ultimo risultato")} · {f.L(roundLabel(game.config, last.round))}
            </div>
            <ShowdownPanel showdown={last} game={game} highlight={c.id} />
          </div>
        )}
      </div>
    </Card>
  );
}

function ThisRound({ c }: { c: Company }) {
  const f = useFmt();
  const game = useGame();
  const setView = useStore((s) => s.setView);
  const items: Array<{ icon: string; text: string; tone?: "good" | "warn" | "bad"; go?: () => void }> = [];
  if (game.finished) items.push({ icon: "Trophy", text: f.tx("The game is over: see the final results.", "La partita è finita: guarda i risultati finali."), go: () => setView("results") });
  for (const e of game.outlook.filter((e) => !e.sectors || e.sectors.includes(c.sector))) {
    items.push({ icon: "Newspaper", text: `${f.L(e.title)}: ${f.L(e.description)}`, tone: e.impact === "negative" ? "warn" : e.impact === "positive" ? "good" : undefined, go: () => setView("news") });
  }
  if (c.dilemma) items.push({ icon: "Scale", text: `${f.tx("Dilemma", "Dilemma")}: ${f.L(c.dilemma.title)}`, tone: "warn", go: () => setView("decisions") });
  for (const o of c.acquisitionOffers) items.push({ icon: "Handshake", text: f.tx(`Acquisition offer from ${o.acquirer}: ${f.money(o.value)}`, `Offerta di acquisizione da ${o.acquirer}: ${f.money(o.value)}`), tone: "good", go: () => setView("decisions") });
  for (const t of c.termSheets) items.push({ icon: "FileText", text: f.tx(`Term sheet from ${t.investorName}: ${f.money(t.amount)}`, `Term sheet da ${t.investorName}: ${f.money(t.amount)}`), tone: "good", go: () => setView("funding") });
  for (const co of c.counterOffers) items.push({ icon: "UserPlus", text: f.tx(`${co.candidateName} sent a counter-offer`, `${co.candidateName} ha inviato una controproposta`), go: () => setView("team") });
  if (!c.product.launched && c.product.mvpProgress >= 0.5 && !game.finished) items.push({ icon: "Rocket", text: f.tx("Your MVP is usable: you can launch early.", "Il tuo MVP è utilizzabile: puoi lanciare in anticipo."), go: () => setView("decisions") });
  if (items.length === 0) return <p className="muted">{f.tx("No news for your company this round.", "Nessuna novità per la tua azienda in questo round.")}</p>;
  return (
    <div className="col">
      {items.map((i, k) => (
        <button key={k} className={`callout ${i.tone ?? "info"}`} style={{ border: 0, textAlign: "left", cursor: i.go ? "pointer" : "default" }} onClick={i.go}>
          <Icon name={i.icon} size={16} />
          <span className="grow">{i.text}</span>
          {i.go && <Icon name="ChevronRight" size={14} />}
        </button>
      ))}
    </div>
  );
}
