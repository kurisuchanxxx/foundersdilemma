import { CHASM_PMF, SECTORS, SEGMENTS, competitionFactor, effectiveModifiers, estimateWtp, sectorPenetration, segmentFor, type Segment } from "../../core";
import { LineChart } from "../components/charts";
import { Icon } from "../components/Icon";
import { Badge, Callout, Card, InfoTip, Logo, Stat } from "../components/ui";
import { useActiveCompany, useGame } from "../hooks";
import { useFmt } from "../i18n";

export function Market() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  if (!c) return null;
  const s = SECTORS[c.sector];
  const mods = effectiveModifiers(game, c, c.sector, game.round);
  const pen = sectorPenetration(game, s, mods.demand);
  const seg = segmentFor(pen);
  const rivals = game.companies.filter((o) => o.sector === c.sector && o.id !== c.id);
  const sectorCustomers = game.companies.filter((o) => o.sector === c.sector && o.status === "active").reduce((a, o) => a + o.customers, 0);
  const wtp = estimateWtp(c) * mods.wtp;
  const payback = c.cac > 0 ? c.cac / Math.max(0.01, c.price * s.grossMargin) : 0;
  const segs = Object.keys(SEGMENTS) as Segment[];
  const activeMods = [...game.globalModifiers.filter((m) => (!m.sectors || m.sectors.includes(c.sector)) && m.untilRound >= game.round && (m.fromRound ?? 0) <= game.round), ...c.modifiers.filter((m) => m.untilRound >= game.round)];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("Market", "Mercato")}</h1>
          <p className="muted">
            {f.L(s.name)} · {f.L(s.tagline)}
          </p>
        </div>
      </div>
      <div className="grid cols-4">
        <Card>
          <Stat label={f.tx("Addressable market", "Mercato indirizzabile")} value={f.compact(s.tam * mods.demand)} sub={f.tx("potential customers", "clienti potenziali")} />
        </Card>
        <Card>
          <Stat label={f.tx("Sector penetration", "Penetrazione del settore")} value={f.pct(pen, pen < 0.1 ? 2 : 1)} sub={`${f.compact(sectorCustomers)} ${f.tx("customers, all players", "clienti, tutti i giocatori")}`} />
        </Card>
        <Card>
          <Stat label={f.tx("Your market share", "La tua quota di mercato")} value={sectorCustomers > 0 ? f.pct(c.customers / sectorCustomers) : "—"} sub={f.tx("of in-game customers", "dei clienti in gioco")} />
        </Card>
        <Card>
          <Stat label={f.tx("Competition", "Concorrenza")} concept="competition" value={`×${f.num(competitionFactor(game, c), 2)}`} sub={`${rivals.length} ${f.tx("teams", "team")} + ${game.markets[c.sector].npcCompetitors} ${f.tx("others", "altri")}`} />
        </Card>
      </div>

      <Card title={f.tx("Adoption curve", "Curva di adozione")} icon="Users" action={<InfoTip concept="adoptionCurve" />}>
        <div className="row gap-4" style={{ alignItems: "stretch" }}>
          {segs.map((k, i) => {
            const prevUp = i === 0 ? 0 : SEGMENTS[segs[i - 1]].upTo;
            const width = (SEGMENTS[k].upTo - prevUp) * 100;
            const on = k === seg;
            return (
              <div key={k} style={{ flex: `${width} 1 0`, minWidth: 60 }}>
                <div style={{ height: 10, borderRadius: 4, background: on ? "var(--s1)" : "var(--surface-3)" }} />
                <div className="tiny mt-8" style={{ fontWeight: on ? 650 : 400, color: on ? "var(--text)" : "var(--text-3)" }}>
                  {f.L(SEGMENTS[k].label)}
                </div>
                <div className="tiny faint">
                  CAC ×{SEGMENTS[k].cac} · churn ×{SEGMENTS[k].churn}
                </div>
              </div>
            );
          })}
        </div>
        {(seg === "earlyAdopters" || seg === "innovators") && (
          <p className="small faint mt-16">
            {f.tx(`When the sector passes ${f.pct(SEGMENTS.earlyAdopters.upTo)} penetration, the early majority requires PMF ≥ ${CHASM_PMF} to avoid the chasm penalty.`, `Quando il settore supera il ${f.pct(SEGMENTS.earlyAdopters.upTo)} di penetrazione, la maggioranza anticipatrice richiede PMF ≥ ${CHASM_PMF} per evitare la penalità del chasm.`)}{" "}
            <InfoTip concept="chasm" />
          </p>
        )}
        {(seg === "earlyMajority" || seg === "lateMajority") && c.pmf.score < CHASM_PMF && <Callout tone="warn">{f.tx("You are in the chasm: CAC ×1.5 until your PMF reaches the threshold.", "Sei nel chasm: CAC ×1,5 finché il PMF non raggiunge la soglia.")}</Callout>}
      </Card>

      <div className="grid cols-2">
        <Card title={f.tx("Unit economics", "Unit economics")} icon="Scale" action={<InfoTip concept="ltvCac" />}>
          {c.product.launched ? (
            <div className="grid mini">
              <Stat label={f.tx("Price", "Prezzo")} concept="pricing" value={f.money(c.price, { decimals: c.price < 100 ? 2 : 0 })} sub={`${f.tx("WTP", "Disp. a pagare")} ≈ ${f.money(wtp, { decimals: wtp < 100 ? 2 : 0 })}`} />
              <Stat label={f.tx("Gross margin", "Margine lordo")} concept="grossMargin" value={f.pct(s.grossMargin + mods.gm)} />
              <Stat label="CAC" concept="cac" value={f.money(c.cac)} />
              <Stat label="LTV" concept="ltv" value={f.money(c.ltv)} />
              <Stat label="LTV / CAC" value={c.cac > 0 ? `${f.num(c.ltv / c.cac, 1)}×` : "—"} tone={c.cac > 0 ? (c.ltv / c.cac >= 3 ? "good" : c.ltv / c.cac < 1 ? "bad" : "warn") : undefined} />
              <Stat label={f.tx("CAC payback", "Payback del CAC")} concept="cacPayback" value={payback > 0 ? `${f.num(payback, 1)} ${f.tx("months", "mesi")}` : "—"} />
              <Stat label={f.tx("Monthly churn", "Churn mensile")} concept="churn" value={f.pct(c.churn, 1)} sub={`${f.tx("sector typical", "tipico del settore")} ${f.pct(s.baseChurn, 1)}`} />
              <Stat label={f.tx("Brand", "Brand")} concept="brand" value={f.pct(c.brand)} />
            </div>
          ) : (
            <p className="muted">{f.tx("Unit economics will be measured after launch. Before that, marketing builds a waitlist.", "Le unit economics si misurano dopo il lancio. Prima, il marketing costruisce una lista d'attesa.")}</p>
          )}
        </Card>
        <Card title={f.tx("Teams in your sector", "Team nel tuo settore")} icon="Swords">
          {rivals.length === 0 ? (
            <p className="muted">{f.tx("No other team chose this sector: you only compete with companies outside the game.", "Nessun altro team ha scelto questo settore: competi solo con aziende esterne al gioco.")}</p>
          ) : (
            rivals.map((r) => (
              <div key={r.id} className="list-row">
                <Logo company={r} size={28} />
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>
                    {r.name} {r.isBot && <Badge>bot</Badge>}
                  </div>
                  <div className="small faint">{r.status !== "active" ? (r.status === "exited" ? f.tx("exited", "venduta") : f.tx("bankrupt", "fallita")) : r.product.launched ? f.tx("on the market", "sul mercato") : f.tx("building MVP", "sta costruendo l'MVP")}</div>
                </div>
                <div className="right small">
                  <div className="num">{f.compact(r.customers)} {f.tx("customers", "clienti")}</div>
                  <div className="faint num">{f.money(r.price, { decimals: r.price < 100 ? 2 : 0 })}</div>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      {c.monthly.length > 0 && (
        <Card title={f.tx("Customers: you vs your sector", "Clienti: tu e il tuo settore")} icon="LineChart">
          <LineChart
            series={[
              ...rivals.map((r) => ({ id: r.id, label: r.name, color: r.color, muted: true, points: r.monthly.map((p) => ({ x: p.month, y: p.customers })) })),
              { id: c.id, label: c.name, color: "var(--s1)", points: c.monthly.map((p) => ({ x: p.month, y: p.customers })) },
            ]}
            xFormat={(m) => `M${m}`}
            yFormat={(v) => f.compact(v)}
            height={220}
          />
        </Card>
      )}

      <Card title={f.tx("Forces acting on you now", "Forze che agiscono su di te ora")} icon="Activity">
        {activeMods.length === 0 ? (
          <p className="muted">{f.tx("No special market conditions this round.", "Nessuna condizione di mercato particolare in questo round.")}</p>
        ) : (
          activeMods.map((m) => (
            <div key={m.id} className="list-row">
              <Icon name="Activity" size={15} className="accent" />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{f.L(m.source)}</div>
                <div className="small faint">
                  {Object.entries(m.effects)
                    .map(([k, v]) => describeEffect(f, k, v as number))
                    .join(" · ")}{" "}
                  · {f.tx("until round", "fino al round")} {Math.min(m.untilRound, game.config.totalRounds)}
                </div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

export function describeEffect(f: ReturnType<typeof useFmt>, key: string, v: number): string {
  const mult = (label: string) => `${label} ${v >= 1 ? "+" : "−"}${Math.round(Math.abs(v - 1) * 100)}%`;
  switch (key) {
    case "cac":
      return mult("CAC");
    case "churn":
      return mult("churn");
    case "wtp":
      return mult(f.tx("willingness to pay", "disponibilità a pagare"));
    case "dev":
      return mult(f.tx("development", "sviluppo"));
    case "climate":
      return mult(f.tx("investor appetite", "appetito investitori"));
    case "valuation":
      return mult(f.tx("valuations", "valutazioni"));
    case "organic":
      return mult(f.tx("organic growth", "crescita organica"));
    case "salaryAsk":
      return mult(f.tx("salary asks", "richieste salariali"));
    case "sales":
      return mult(f.tx("sales capacity", "capacità commerciale"));
    case "demand":
      return mult(f.tx("demand", "domanda"));
    case "gm":
      return `${f.tx("gross margin", "margine lordo")} ${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)} pt`;
    case "compliance":
      return `${f.tx("compliance", "compliance")} ${v >= 0 ? "+" : "−"}${f.money(Math.abs(v))}/${f.tx("mo", "mese")}`;
    case "hiringBar":
      return v >= 0 ? f.tx("candidates harder to convince", "candidati più difficili da convincere") : f.tx("candidates easier to convince", "candidati più facili da convincere");
    case "debtRate":
      return `${f.tx("interest rates", "tassi di interesse")} +${f.num(v * 100, 1)} pt`;
    case "morale":
      return `morale ${v >= 0 ? "+" : ""}${v}`;
    case "stress":
      return `stress ${v >= 0 ? "+" : ""}${v}`;
    default:
      return key;
  }
}
