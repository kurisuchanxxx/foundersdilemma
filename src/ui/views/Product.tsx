import { PMF_THRESHOLD, SECTORS, computeCapacities, effectiveModifiers, featuresFor, seanEllisShare } from "../../core";
import { LineChart } from "../components/charts";
import { Icon } from "../components/Icon";
import { Callout, Card, InfoTip, Progress, Stat } from "../components/ui";
import { useActiveCompany, useGame, useDraft } from "../hooks";
import { useFmt } from "../i18n";
import { stageLabel } from "./Dashboard";

export function Product() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const draft = useDraft(c);
  if (!c) return null;
  const s = SECTORS[c.sector];
  const features = featuresFor(game.config);
  const mods = effectiveModifiers(game, c, c.sector, game.round);
  const cap = computeCapacities(c, draft, game.month, mods.dev, mods.sales);
  const p = c.pmf;
  const dims: Array<{ key: string; value: number; en: string; it: string; den: string; dit: string }> = [
    { key: "pc", value: p.problemClarity, en: "Problem clarity", it: "Chiarezza del problema", den: "How well you understand customers' real problem. Grows with customer discovery and feedback.", dit: "Quanto bene capisci il vero problema dei clienti. Cresce con la customer discovery e i feedback." },
    { key: "sf", value: p.solutionFit, en: "Solution fit", it: "Adattamento della soluzione", den: "How well the product solves that problem. Capped by problem clarity and quality.", dit: "Quanto il prodotto risolve quel problema. Limitato da chiarezza del problema e qualità." },
    { key: "mp", value: p.marketPull, en: "Market pull", it: "Trazione del mercato", den: "Customers pulling the product: retention, word of mouth, waitlist.", dit: "Clienti che 'tirano' il prodotto: retention, passaparola, lista d'attesa." },
    { key: "lv", value: p.learningVelocity, en: "Learning velocity", it: "Velocità di apprendimento", den: "How fast the team turns feedback into decisions.", dit: "Quanto velocemente il team trasforma i feedback in decisioni." },
  ];
  const history = c.history;
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("Product & product-market fit", "Prodotto e product-market fit")}</h1>
          <p className="muted">{c.productName}</p>
        </div>
      </div>
      <div className="grid cols-2">
        <Card title="Product-market fit" icon="Target" action={<InfoTip concept="pmf" />}>
          <div className="row gap-24 wrap">
            <Stat label={f.tx("PMF score", "Punteggio PMF")} value={Math.round(p.score)} big sub={stageLabel(f, p.score)} tone={p.score >= PMF_THRESHOLD ? "good" : undefined} />
            <Stat label={f.tx("'Very disappointed' users", "Utenti 'molto delusi'")} value={f.pct(seanEllisShare(p.score))} sub={f.tx("Sean Ellis test: PMF at 40%", "Test di Sean Ellis: PMF al 40%")} />
          </div>
          <div className="mt-16" style={{ position: "relative" }}>
            <Progress value={p.score / 100} tone={p.score >= PMF_THRESHOLD ? "good" : undefined} />
            <div style={{ position: "absolute", left: `${PMF_THRESHOLD}%`, top: -4, bottom: -4, width: 2, background: "var(--text-3)" }} title="PMF" />
          </div>
          <div className="col gap-12 mt-16">
            {dims.map((d) => (
              <div key={d.key}>
                <div className="row between small">
                  <span style={{ fontWeight: 600 }}>{f.tx(d.en, d.it)}</span>
                  <span className="num">{f.pct(d.value)}</span>
                </div>
                <Progress value={d.value} thin />
                <div className="tiny faint">{f.tx(d.den, d.dit)}</div>
              </div>
            ))}
          </div>
        </Card>
        <div className="col gap-16">
          <Card title={c.product.launched ? f.tx("Product health", "Salute del prodotto") : f.tx("MVP", "MVP")} icon={c.product.launched ? "HeartPulse" : "Rocket"} action={<InfoTip concept={c.product.launched ? "techDebt" : "mvp"} />}>
            {!c.product.launched ? (
              <div className="col gap-12">
                <Progress value={c.product.mvpProgress} />
                <div className="kv">
                  <span>{f.tx("Progress", "Avanzamento")}</span>
                  <span>{f.pct(c.product.mvpProgress)}</span>
                  <span>{f.tx("Effort needed for this sector", "Sforzo necessario per il settore")}</span>
                  <span>{s.mvpEffort} {f.tx("points", "punti")}</span>
                  <span>{f.tx("Your capacity", "La tua capacità")}</span>
                  <span>
                    {f.num(cap.devPower, 1)} {f.tx("points/month", "punti/mese")}
                  </span>
                  <span>{f.tx("Waitlist", "Lista d'attesa")}</span>
                  <span>{f.compact(c.waitlist)}</span>
                </div>
              </div>
            ) : (
              <div className="grid mini">
                <Stat label={f.tx("Quality", "Qualità")} value={f.pct(c.product.quality)} />
                {features.techDebt && <Stat label={f.tx("Tech debt", "Debito tecnico")} value={f.pct(c.product.techDebt)} tone={c.product.techDebt > 0.5 ? "bad" : c.product.techDebt > 0.3 ? "warn" : "good"} />}
                {features.techDebt && <Stat label={f.tx("Velocity", "Velocità")} value={f.pct(1 - 0.6 * c.product.techDebt)} sub={f.tx("of full speed", "della piena velocità")} />}
                <Stat label={f.tx("Open bugs (index)", "Bug aperti (indice)")} value={Math.round(c.product.bugs)} tone={c.product.bugs > 40 ? "bad" : undefined} />
                <Stat label="NPS" concept="nps" value={Math.round(c.nps)} />
                <Stat label={f.tx("Launched in round", "Lanciato nel round")} value={c.product.launchRound ?? "—"} />
              </div>
            )}
          </Card>
          <Card title={f.tx("Development capacity", "Capacità di sviluppo")} icon="Code2">
            <div className="kv">
              <span>{f.tx("Team (founders + employees)", "Team (fondatori + dipendenti)")}</span>
              <span>{f.num(cap.devPower - cap.contractorPower, 1)}</span>
              <span>{f.tx("Contractors (R&D budget)", "Contractor (budget R&S)")}</span>
              <span>{f.num(cap.contractorPower, 1)}</span>
              <span>{f.tx("Coordination efficiency", "Efficienza di coordinamento")}</span>
              <span>{f.pct(cap.coordination)}</span>
            </div>
            <p className="small faint mt-8">{f.tx("Bigger teams lose efficiency to coordination (Brooks' law); operations people mitigate it.", "I team più grandi perdono efficienza nel coordinamento (legge di Brooks); le persone di operations la mitigano.")}</p>
          </Card>
        </div>
      </div>
      {history.length > 0 && (
        <Card title={f.tx("Product trajectory (index 0-100)", "Traiettoria del prodotto (indice 0-100)")} icon="LineChart">
          <LineChart
            series={[
              { id: "pmf", label: "PMF", color: "var(--s1)", points: history.map((h) => ({ x: h.round, y: h.pmf })) },
              { id: "q", label: f.tx("Quality", "Qualità"), color: "var(--s3)", points: history.map((h) => ({ x: h.round, y: h.quality * 100 })) },
              ...(features.techDebt ? [{ id: "td", label: f.tx("Tech debt", "Debito tecnico"), color: "var(--s2)", points: history.map((h) => ({ x: h.round, y: h.techDebt * 100 })) }] : []),
            ]}
            xFormat={(r) => `R${r}`}
            yFormat={(v) => f.num(v)}
            yMin={0}
            height={220}
          />
        </Card>
      )}
      {!c.product.launched && c.pmf.problemClarity < 0.4 && (
        <Callout tone="info" icon="MessagesSquare">
          {f.tx("Tip: a few rounds of deep customer discovery before launch make PMF much easier to reach.", "Consiglio: qualche round di customer discovery profonda prima del lancio rende il PMF molto più raggiungibile.")}
        </Callout>
      )}
      <Card title={f.tx("How product-market fit works in the game", "Come funziona il product-market fit nel gioco")} icon="BookOpen">
        <p className="small muted">
          {f.tx(
            "The PMF score combines problem clarity (32%), solution fit (38%), market pull (20%) and learning velocity (10%); after launch, retention adds up to 15 points. A score of 60 corresponds to 40% of users who would be 'very disappointed' without your product. PMF lowers churn and CAC, raises willingness to pay and investors' interest, and lets you cross the chasm into the mainstream market.",
            "Il punteggio PMF combina chiarezza del problema (32%), adattamento della soluzione (38%), trazione del mercato (20%) e velocità di apprendimento (10%); dopo il lancio la retention aggiunge fino a 15 punti. Un punteggio di 60 corrisponde al 40% di utenti che sarebbero 'molto delusi' senza il prodotto. Il PMF riduce churn e CAC, aumenta la disponibilità a pagare e l'interesse degli investitori, e permette di attraversare il chasm verso il mercato di massa.",
          )}
        </p>
        <div className="row gap-4 mt-8 small faint">
          <Icon name="Info" size={13} />
          {f.tx("Some ideas simply fit the market better than others: if PMF stays low despite good execution, consider a pivot.", "Alcune idee si adattano al mercato meglio di altre: se il PMF resta basso nonostante una buona esecuzione, valuta un pivot.")}
        </div>
      </Card>
    </div>
  );
}
