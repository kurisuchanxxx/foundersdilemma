import { useDeferredValue, useMemo } from "react";
import {
  APPROACH,
  DISCOVERY,
  GRANTS,
  GTM_INFO,
  HOURS_INFO,
  INTERACTION_DEFS,
  LENDERS,
  MAX_PARTNERSHIPS,
  PARTNERSHIP_ROUNDS,
  PRICING_INFO,
  REPUTATION_ACTIONS,
  SEGMENT_INFO,
  SECTORS,
  activePartnerships,
  computeCapacities,
  effectiveModifiers,
  featuresFor,
  founderPayout,
  grantChecks,
  investorDef,
  loanLimit,
  monthsInRound,
  oneOffCosts,
  previewDecision,
  roundLabel,
  waterfall,
  type Company,
  type Decision,
  type DevApproach,
  type DiscoveryLevel,
  type FounderHours,
  type GtmChannel,
  type PreviewResult,
  type PricingModel,
  type ReputationAction,
  type TargetSegment,
  type TechDebtAction,
} from "../../core";
import { Icon } from "../components/Icon";
import { Badge, Callout, Card, InfoTip, Logo, OptionCard, Progress, Segmented, SliderField, Stat, Tabs, Toggle } from "../components/ui";
import { useActiveCompany, useGame, useDraft } from "../hooks";
import { useFmt, type Fmt } from "../i18n";
import { exportDecisionFile } from "../classroom";
import { useStore, type DecisionTab } from "../store";
import { NetworkTab } from "./Network";

type Tab = DecisionTab;

export function Decisions() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const draft = useDraft(c);
  const update = useStore((s) => s.updateDraft);
  const storedTab = useStore((s) => s.decisionsTab);
  const setTab = useStore((s) => s.setDecisionsTab);
  const deferred = useDeferredValue(draft);
  const preview = useMemo(() => (c && deferred && c.status === "active" ? previewDecision(game, c.id, deferred) : null), [game, c, deferred]);
  if (!c || !draft) return null;
  if (game.finished || c.status !== "active") {
    return (
      <div className="stack">
        <Callout tone="info">{f.tx("No decisions to take: this company is no longer active.", "Nessuna decisione da prendere: questa azienda non è più attiva.")}</Callout>
        {!game.finished && game.config.mode === "solo" && (
          <button className="btn primary" onClick={() => useStore.getState().fastForward()}>
            <Icon name="FastForward" size={16} />
            {f.tx("Simulate the remaining rounds and see the results", "Simula i round rimanenti e guarda i risultati")}
          </button>
        )}
      </div>
    );
  }
  const otherTeams = game.companies.filter((o) => o.id !== c.id && o.status === "active");
  const tab: Tab = (storedTab === "dilemma" && !c.dilemma) || (storedTab === "teams" && otherTeams.length === 0) ? "core" : storedTab;
  const locked = c.submitted;
  const set = (patch: Partial<Decision>) => update(c.id, patch);
  const features = featuresFor(game.config);
  const months = monthsInRound(game.config, game.round);

  const tabs: Array<{ id: Tab; label: string; icon: string; dot?: boolean }> = [
    { id: "core", label: f.tx("Budget & price", "Budget e prezzo"), icon: "Wallet" },
    { id: "product", label: f.tx("Product", "Prodotto"), icon: "Target" },
    { id: "people", label: f.tx("Founders & team", "Fondatori e team"), icon: "Users" },
    { id: "growth", label: f.tx("Reputation", "Reputazione"), icon: "Megaphone" },
    { id: "finance", label: f.tx("Finance & exit", "Finanza ed exit"), icon: "HandCoins", dot: c.termSheets.length + c.acquisitionOffers.length > 0 },
  ];
  if (otherTeams.length > 0) tabs.push({ id: "teams", label: f.tx("Deals", "Accordi"), icon: "Handshake", dot: c.partnershipOffers.length > 0 });
  tabs.push({ id: "network", label: f.tx("Founder network", "Rete dei fondatori"), icon: "HeartHandshake" });
  if (c.dilemma) tabs.push({ id: "dilemma", label: f.tx("Dilemma", "Dilemma"), icon: "Scale", dot: !draft.dilemmaChoice });
  tabs.push({ id: "review", label: f.tx("Review & submit", "Riepilogo e invio"), icon: "ListChecks" });

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("Decisions", "Decisioni")}</h1>
          <p className="muted">
            {f.L(roundLabel(game.config, game.round))} · {months} {f.tx("months will be simulated", "mesi verranno simulati")}
          </p>
        </div>
        {locked && <SubmittedBanner c={c} />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(250px, 300px)", gap: 16, alignItems: "start" }} className="decisions-grid">
        <div style={{ minWidth: 0 }}>
          <div data-tour="decision-tabs">
            <Tabs value={tab} tabs={tabs} onChange={setTab} />
          </div>
          <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            {tab === "core" && <CoreTab c={c} d={draft} set={set} preview={preview} />}
            {tab === "product" && <ProductTab c={c} d={draft} set={set} techDebt={features.techDebt} />}
            {tab === "people" && <PeopleTab c={c} d={draft} set={set} />}
            {tab === "growth" && <GrowthTab d={draft} set={set} />}
            {tab === "finance" && <FinanceTab c={c} d={draft} set={set} />}
            {tab === "teams" && <TeamsTab c={c} d={draft} set={set} />}
            {tab === "network" && <NetworkTab c={c} d={draft} set={set} />}
            {tab === "dilemma" && c.dilemma && <DilemmaTab c={c} d={draft} set={set} />}
          </fieldset>
          {tab === "review" && <ReviewTab c={c} d={draft} preview={preview} onEdit={setTab} />}
          {tab !== "review" && (
            <div className="row mt-16" style={{ justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setTab(tabs[Math.min(tabs.length - 1, tabs.findIndex((t) => t.id === tab) + 1)].id)}>
                {f.tx("Next", "Avanti")}
                <Icon name="ChevronRight" size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="sticky-side" id="decision-projection">
          <PreviewPanel c={c} preview={preview} />
        </div>
      </div>
      {preview && (
        // on narrow screens the projection sits below the form: a compact bar keeps its key numbers in sight
        <button className="mini-projection" onClick={() => document.getElementById("decision-projection")?.scrollIntoView({ behavior: "smooth" })}>
          <Icon name="Gauge" size={14} />
          <span>
            {f.tx("Cash at end of round", "Cassa a fine round")} <b>{f.money(preview.cashEnd)}</b>
          </span>
          <span>
            Runway <b className={preview.runway < 6 ? "bad" : ""}>{f.months(preview.runway)}</b>
          </span>
        </button>
      )}
      <style>{`@media (max-width: 1000px) { .decisions-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function SubmittedBanner({ c }: { c: Company }) {
  const f = useFmt();
  const unsubmit = useStore((s) => s.unsubmit);
  const advance = useStore((s) => s.advance);
  const game = useGame();
  return (
    <div className="row wrap">
      <Badge tone="good">
        <Icon name="Check" size={12} /> {f.tx("Decisions submitted", "Decisioni inviate")}
      </Badge>
      <button className="btn" onClick={() => unsubmit(c.id)}>
        <Icon name="Unlock" size={16} />
        {f.tx("Edit decisions", "Modifica decisioni")}
      </button>
      {game.config.mode === "solo" && (
        <button className="btn primary" onClick={advance}>
          <Icon name="FastForward" size={16} />
          {f.tx("Advance to next period", "Avanza al periodo successivo")}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------

function PreviewPanel({ c, preview }: { c: Company; preview: PreviewResult | null }) {
  const f = useFmt();
  if (!preview) return null;
  const runwayTone = preview.runway < 3 ? "bad" : preview.runway < 6 ? "warn" : "good";
  return (
    <Card title={f.tx("Projection (what if)", "Proiezione (what if)")} icon="Gauge" tour="projection">
      <p className="small faint" style={{ marginTop: -6, marginBottom: 12 }}>
        {f.tx("Expected values at the end of the round, without random events, assuming your offers are accepted and no new funding.", "Valori attesi a fine round, senza eventi casuali, ipotizzando offerte accettate e nessun nuovo finanziamento.")}
      </p>
      <div className="col gap-12">
        <Stat label={f.tx("Cash at end of round", "Cassa a fine round")} value={f.money(preview.cashEnd)} tone={preview.cashEnd < 0 ? "bad" : undefined} sub={`${f.tx("now", "ora")} ${f.money(c.cash)}`} />
        <Stat label="Runway" value={f.months(preview.runway)} tone={runwayTone} concept="runway" />
        <div className="kv">
          <span>{f.tx("Expenses / month", "Spese / mese")}</span>
          <span>{f.money(preview.expensesMonthly)}</span>
          <span>{f.tx("Net burn / month", "Burn netto / mese")}</span>
          <span className={preview.netBurnMonthly <= 0 ? "good" : ""}>{preview.netBurnMonthly <= 0 ? f.tx("profit", "utile") : f.money(preview.netBurnMonthly)}</span>
          {preview.oneOffCosts > 0 && (
            <>
              <span>{f.tx("One-off costs", "Costi una tantum")}</span>
              <span>{f.money(preview.oneOffCosts)}</span>
            </>
          )}
          {preview.hiringCostMonthly > 0 && (
            <>
              <span>{f.tx("New hires / month", "Nuove assunzioni / mese")}</span>
              <span>{f.money(preview.hiringCostMonthly)}</span>
            </>
          )}
          {preview.launched ? (
            <>
              <span>{f.tx("Monthly revenue", "Fatturato mensile")}</span>
              <span>{f.money(preview.revenueMonthlyEnd)}</span>
              <span>{f.tx("Customers", "Clienti")}</span>
              <span>
                {f.compact(preview.customersEnd)} <span className="faint">(+{f.compact(preview.newCustomers)})</span>
              </span>
              <span>CAC</span>
              <span>{f.money(preview.cac)}</span>
              <span>LTV</span>
              <span>{f.money(preview.ltv)}</span>
              <span>{f.tx("Monthly churn", "Churn mensile")}</span>
              <span>{f.pct(preview.churn, 1)}</span>
            </>
          ) : (
            <>
              <span>MVP</span>
              <span>
                {f.pct(c.product.mvpProgress)} → {f.pct(preview.mvpProgressEnd)}
              </span>
            </>
          )}
          <span>PMF</span>
          <span>
            {Math.round(c.pmf.score)} → {Math.round(preview.pmfEnd)}
          </span>
          <span>{f.tx("Headcount", "Persone")}</span>
          <span>{preview.headcount}</span>
        </div>
        {!c.product.launched && preview.launched && (
          <Callout tone="good" icon="Rocket">
            {f.tx("At this pace you will launch during this round.", "A questo ritmo lancerai durante questo round.")}
          </Callout>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------

function CoreTab({ c, d, set, preview }: { c: Company; d: Decision; set: (p: Partial<Decision>) => void; preview: PreviewResult | null }) {
  const f = useFmt();
  const game = useGame();
  const s = SECTORS[c.sector];
  const mods = effectiveModifiers(game, c, c.sector, game.round);
  const cap = computeCapacities(c, d, game.month, mods.dev, mods.sales);
  const execCap = 10_000 + cap.stats.growth * 6_000 + cap.stats.design * 1_000;
  const contractorPts = Math.max(0, d.rdBudget - 1_000) / 1_500;
  const budgetMax = Math.max(50_000, Math.min(1_000_000, Math.round(Math.max(c.cash, 0) / 3 / 10_000) * 10_000));
  const wtp = preview?.wtp ?? s.refPrice;
  const priceRatio = d.price / wtp;
  return (
    <div className="stack">
      <Card title={f.tx("Monthly budgets", "Budget mensili")} icon="Wallet" tour="budgets">
        <div className="col gap-16">
          <SliderField
            label={f.tx("R&D: contractors, tools, cloud", "R&S: contractor, strumenti, cloud")}
            value={d.rdBudget}
            min={0}
            max={budgetMax}
            scale="quad"
            onChange={(v) => set({ rdBudget: v })}
            format={(v) => `${f.money(v)}/${f.tx("mo", "mese")}`}
            hint={f.tx(
              `Adds ≈${f.num(contractorPts, 1)} development points/month on top of your team (${f.num(cap.devPower, 1)} total). The first ${f.money(1_000)} covers tools. Contractors create more tech debt than employees.`,
              `Aggiunge ≈${f.num(contractorPts, 1)} punti di sviluppo/mese oltre al team (${f.num(cap.devPower, 1)} in totale). I primi ${f.money(1_000)} coprono gli strumenti. I contractor creano più debito tecnico dei dipendenti.`,
            )}
          />
          <SliderField
            label={f.tx("Marketing", "Marketing")}
            value={d.marketingBudget}
            min={0}
            max={budgetMax}
            scale="quad"
            concept="cac"
            onChange={(v) => set({ marketingBudget: v })}
            format={(v) => `${f.money(v)}/${f.tx("mo", "mese")}`}
            hint={
              <>
                {c.product.launched
                  ? f.tx("Buys customers at the current CAC, with diminishing returns.", "Compra clienti al CAC attuale, con rendimenti decrescenti.")
                  : f.tx("Before launch it builds a waitlist.", "Prima del lancio costruisce una lista d'attesa.")}{" "}
                {f.tx(`Your growth team can execute about ${f.money(execCap)}/month efficiently.`, `Il tuo team growth può gestire con efficienza circa ${f.money(execCap)}/mese.`)}
                {d.marketingBudget > execCap && <span className="warn"> {f.tx("Above that, spend is 70% less effective: hire growth people.", "Oltre, la spesa è efficace al 30%: assumi persone growth.")}</span>}
              </>
            }
          />
          <SliderField
            label={f.tx("Operations & support", "Operations e supporto")}
            value={d.opsBudget}
            min={0}
            max={Math.max(20_000, budgetMax / 2)}
            scale="quad"
            onChange={(v) => set({ opsBudget: v })}
            format={(v) => `${f.money(v)}/${f.tx("mo", "mese")}`}
            hint={f.tx("Infrastructure, admin and outsourced support: fewer bugs and outages, more support capacity, slightly better margins.", "Infrastruttura, amministrazione e supporto esterno: meno bug e disservizi, più capacità di supporto, margini leggermente migliori.")}
          />
        </div>
      </Card>
      <Card title={f.tx("Pricing model", "Modello di prezzo")} icon="Layers" action={<InfoTip concept="pricingModel" />}>
        <div className="grid cols-3" style={{ gap: 8 }}>
          {(Object.keys(PRICING_INFO) as PricingModel[]).map((m) => (
            <OptionCard key={m} on={d.pricingModel === m} onClick={() => set({ pricingModel: m })} title={f.L(PRICING_INFO[m].label)} desc={f.L(PRICING_INFO[m].description)} badge={c.pricingModel === m ? <Badge>{f.tx("current", "attuale")}</Badge> : undefined} />
          ))}
        </div>
        <StrategySwitchNote c={c} changed={d.pricingModel !== c.pricingModel} loss={0.05} />
      </Card>
      <Card title={f.tx("Price", "Prezzo")} icon="CircleDollarSign" action={<InfoTip concept="pricing" />}>
        <SliderField
          label={`${f.tx("Price", "Prezzo")} (${f.L(s.priceUnit)})`}
          value={d.price}
          min={s.priceMin}
          max={s.priceMax}
          step={s.priceMin < 10 ? 0.1 : 1}
          scale="log"
          onChange={(v) => set({ price: v })}
          format={(v) => f.money(v, { decimals: v < 100 ? 2 : 0 })}
        />
        <div className="row gap-12 wrap mt-8">
          <Badge tone={priceRatio > 1.15 ? "bad" : priceRatio < 0.7 ? "warn" : "good"}>
            {f.tx("Estimated willingness to pay", "Disponibilità a pagare stimata")}: {f.money(wtp, { decimals: wtp < 100 ? 2 : 0 })}
          </Badge>
          <span className="small muted">
            {priceRatio > 1.15
              ? f.tx("Too expensive: fewer conversions and more churn.", "Troppo caro: meno conversioni e più churn.")
              : priceRatio < 0.7
                ? f.tx("Very cheap: easy to sell, but you leave money on the table.", "Molto economico: facile da vendere, ma lasci soldi sul tavolo.")
                : f.tx("In line with the value customers perceive.", "In linea con il valore percepito dai clienti.")}
          </span>
        </div>
        <p className="small faint mt-8">{f.tx("Willingness to pay grows with product quality, PMF and brand.", "La disponibilità a pagare cresce con qualità del prodotto, PMF e brand.")}</p>
      </Card>
      <Card title={f.tx("Go-to-market channel", "Canale go-to-market")} icon="Megaphone" action={<InfoTip concept="gtm" />}>
        <div className="grid cols-2" style={{ gap: 8 }}>
          {(Object.keys(GTM_INFO) as GtmChannel[]).map((g) => {
            const fit = s.gtmFit[g];
            const best = Math.min(...Object.values(s.gtmFit));
            return (
              <OptionCard
                key={g}
                on={d.gtm === g}
                onClick={() => set({ gtm: g })}
                title={f.L(GTM_INFO[g].name)}
                desc={f.L(GTM_INFO[g].description)}
                badge={<Badge tone={fit === best ? "good" : fit <= 1.05 ? "accent" : "warn"}>{fit === best ? f.tx("best fit", "ideale") : fit <= 1.05 ? f.tx("ok", "ok") : f.tx("poor fit", "poco adatto")}</Badge>}
              />
            );
          })}
        </div>
        {s.salesDependence >= 0.3 && (
          <Callout tone="info">{f.tx("In this sector paid leads need salespeople to close: without sales capacity, marketing converts poorly.", "In questo settore i lead a pagamento vanno chiusi da venditori: senza capacità commerciale il marketing converte poco.")}</Callout>
        )}
      </Card>
    </div>
  );
}

function ProductTab({ c, d, set, techDebt }: { c: Company; d: Decision; set: (p: Partial<Decision>) => void; techDebt: boolean }) {
  const f = useFmt();
  const approachText: Record<DevApproach, [string, string]> = {
    rush: [f.tx("Rush", "Corsa"), f.tx(`×${APPROACH.rush.speed} speed, lots of tech debt and bugs, rougher launch.`, `Velocità ×${APPROACH.rush.speed}, molto debito tecnico e bug, lancio più grezzo.`)],
    balanced: [f.tx("Balanced", "Bilanciato"), f.tx("Standard pace, moderate tech debt.", "Ritmo standard, debito tecnico moderato.")],
    quality: [f.tx("Quality first", "Prima la qualità"), f.tx(`×${APPROACH.quality.speed} speed, little debt, better quality at launch.`, `Velocità ×${APPROACH.quality.speed}, poco debito, qualità migliore al lancio.`)],
  };
  const discText: Record<DiscoveryLevel, [string, string]> = {
    none: [f.tx("None", "Nessuna"), f.tx("All time on building.", "Tutto il tempo sullo sviluppo.")],
    light: [f.tx("Light", "Leggera"), f.tx(`Some interviews: ${f.money(DISCOVERY.light.cost)}/month, -5% dev time.`, `Qualche intervista: ${f.money(DISCOVERY.light.cost)}/mese, -5% tempo di sviluppo.`)],
    deep: [f.tx("Deep", "Profonda"), f.tx(`Continuous discovery: ${f.money(DISCOVERY.deep.cost)}/month, -12% dev time, much faster learning.`, `Discovery continua: ${f.money(DISCOVERY.deep.cost)}/mese, -12% tempo di sviluppo, apprendimento molto più rapido.`)],
  };
  const debtText: Record<TechDebtAction, [string, string]> = {
    ship: [f.tx("Ship fast", "Spedisci veloce"), f.tx("No refactoring: debt grows 30% faster.", "Nessun refactoring: il debito cresce del 30% più in fretta.")],
    maintain: [f.tx("Maintain", "Mantieni"), f.tx("10% of time on refactoring.", "10% del tempo sul refactoring.")],
    paydown: [f.tx("Pay down", "Ripaga"), f.tx("25% of time on refactoring: debt falls, features slow down.", "25% del tempo sul refactoring: il debito scende, le funzionalità rallentano.")],
  };
  return (
    <div className="stack">
      <Card title={c.product.launched ? f.tx("Product is live", "Prodotto lanciato") : f.tx("Building the MVP", "Costruzione dell'MVP")} icon="Rocket" action={<InfoTip concept="mvp" />}>
        {c.product.launched ? (
          <div className="kv">
            <span>{f.tx("Quality", "Qualità")}</span>
            <span>{f.pct(c.product.quality)}</span>
            <span>{f.tx("Tech debt", "Debito tecnico")}</span>
            <span>{f.pct(c.product.techDebt)}</span>
            <span>Bug</span>
            <span>{Math.round(c.product.bugs)}</span>
          </div>
        ) : (
          <div className="col gap-12">
            <Progress value={c.product.mvpProgress} />
            <div className="row between small">
              <span className="muted">{f.pct(c.product.mvpProgress)} {f.tx("complete", "completato")}</span>
              <span className="faint">{f.tx("Launch automatically at 100%", "Lancio automatico al 100%")}</span>
            </div>
            <Toggle
              checked={d.launchNow}
              disabled={c.product.mvpProgress < 0.5}
              onChange={(v) => set({ launchNow: v })}
              label={f.tx("Launch early as soon as the MVP is at least 50% done", "Lancia in anticipo appena l'MVP è almeno al 50%")}
            />
            <p className="small faint">{f.tx("Launching early gives you real customers to learn from, but quality and churn suffer.", "Lanciare presto ti dà clienti veri da cui imparare, ma qualità e churn ne risentono.")}</p>
          </div>
        )}
      </Card>
      <Card title={f.tx("Target customers", "Clienti obiettivo")} icon="Crosshair" action={<InfoTip concept="beachhead" />} tour="segment">
        <div className="grid cols-3" style={{ gap: 8 }}>
          {(Object.keys(SEGMENT_INFO) as TargetSegment[]).map((g) => (
            <OptionCard key={g} on={d.targetSegment === g} onClick={() => set({ targetSegment: g })} title={f.L(SEGMENT_INFO[g].label)} desc={f.L(SEGMENT_INFO[g].description)} badge={c.segment === g ? <Badge>{f.tx("current", "attuale")}</Badge> : undefined} />
          ))}
        </div>
        <StrategySwitchNote c={c} changed={d.targetSegment !== c.segment} loss={0.12} />
      </Card>
      <Card title={f.tx("Development approach", "Approccio allo sviluppo")} icon="Code2">
        <div className="grid cols-3" style={{ gap: 8 }}>
          {(["rush", "balanced", "quality"] as DevApproach[]).map((a) => (
            <OptionCard key={a} on={d.devApproach === a} onClick={() => set({ devApproach: a })} title={approachText[a][0]} desc={approachText[a][1]} />
          ))}
        </div>
      </Card>
      <Card title={f.tx("Customer discovery", "Customer discovery")} icon="MessagesSquare" action={<InfoTip concept="customerDiscovery" />} tour="discovery">
        <div className="grid cols-3" style={{ gap: 8 }}>
          {(["none", "light", "deep"] as DiscoveryLevel[]).map((a) => (
            <OptionCard key={a} on={d.discovery === a} onClick={() => set({ discovery: a })} title={discText[a][0]} desc={discText[a][1]} />
          ))}
        </div>
        <p className="small faint mt-8">{f.tx("Discovery raises problem clarity: you cannot build a fitting solution for a problem you do not understand.", "La discovery aumenta la chiarezza del problema: non puoi costruire una soluzione adatta a un problema che non capisci.")}</p>
      </Card>
      {techDebt && (
        <Card title={f.tx("Technical debt", "Debito tecnico")} icon="Wrench" action={<InfoTip concept="techDebt" />}>
          <div className="grid cols-3" style={{ gap: 8 }}>
            {(["ship", "maintain", "paydown"] as TechDebtAction[]).map((a) => (
              <OptionCard key={a} on={d.techDebtAction === a} onClick={() => set({ techDebtAction: a })} title={debtText[a][0]} desc={debtText[a][1]} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function PeopleTab({ c, d, set }: { c: Company; d: Decision; set: (p: Partial<Decision>) => void }) {
  const f = useFmt();
  const game = useGame();
  const setView = useStore((s) => s.setView);
  return (
    <div className="stack">
      <Card title={f.tx("Founders' workload", "Carico di lavoro dei fondatori")} icon="Clock" action={<InfoTip concept="founderWellbeing" />}>
        <Segmented
          value={d.founderHours}
          options={([40, 50, 60, 80] as FounderHours[]).map((h) => ({ value: h, label: `${h}h` }))}
          onChange={(v) => set({ founderHours: v })}
        />
        <p className="small muted mt-8">
          {f.L(HOURS_INFO[d.founderHours].label)} · {f.tx("output", "produttività")} ×{f.num(HOURS_INFO[d.founderHours].output, 2)} · {f.tx("stress", "stress")} {HOURS_INFO[d.founderHours].stress >= 0 ? "+" : "−"}
          {f.pct(Math.abs(HOURS_INFO[d.founderHours].stress))}
          {d.founderHours >= 60 &&
            ` · ${f.tx("fatigue builds up every month at this pace", "a questo ritmo la fatica cresce ogni mese")}${(c.overworkMonths ?? 0) > 0 ? ` (${c.overworkMonths} ${f.tx("months so far", "mesi finora")})` : ""}`}
        </p>
        <div className="row between mt-16">
          <span className="small muted">
            {f.tx("Founder stress", "Stress dei fondatori")}: <b className={c.founderStress > 0.75 ? "bad" : c.founderStress > 0.5 ? "warn" : "good"}>{f.pct(c.founderStress)}</b>
          </span>
          <Toggle checked={d.vacation} onChange={(v) => set({ vacation: v })} label={f.tx("Take a week off", "Prendi una settimana di pausa")} />
        </div>
      </Card>
      <Card title={f.tx("Team", "Team")} icon="Users" action={<button className="btn sm" onClick={() => setView("team")}>{f.tx("Open team & job market", "Apri team e mercato del lavoro")}</button>}>
        <div className="kv">
          <span>{f.tx("Employees", "Dipendenti")}</span>
          <span>{c.team.length}</span>
          <span>{f.tx("Team morale", "Morale del team")}</span>
          <span className={c.morale < 0.5 ? "bad" : ""}>{f.pct(c.morale)}</span>
          <span>{f.tx("Offers this round", "Offerte in questo round")}</span>
          <span>{d.offers.length}</span>
          <span>{f.tx("People leaving", "Persone in uscita")}</span>
          <span>{d.fires.length}</span>
        </div>
        {d.offers.length > 0 && (
          <div className="col gap-4 mt-16">
            {d.offers.map((o) => {
              const cand = game.candidates.find((k) => k.id === o.candidateId);
              return (
                <div key={o.candidateId} className="row between small">
                  <span>
                    <Icon name="UserPlus" size={13} /> {cand?.name ?? o.candidateId}
                  </span>
                  <span className="num muted">
                    {f.money(o.salary)}/{f.tx("yr", "anno")} {o.equityPct > 0 ? `+ ${f.pct(o.equityPct, 2)}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {c.counterOffers.length > 0 && (
          <div className="col gap-8 mt-16">
            <h3>{f.tx("Counter-offers", "Controproposte")}</h3>
            {c.counterOffers.map((co) => (
              <Toggle
                key={co.id}
                checked={d.acceptCounterIds.includes(co.id)}
                onChange={(v) => set({ acceptCounterIds: v ? [...d.acceptCounterIds, co.id] : d.acceptCounterIds.filter((x) => x !== co.id) })}
                label={`${co.candidateName}: ${f.money(co.salary)}/${f.tx("yr", "anno")} + ${f.pct(co.equityPct, 2)}`}
              />
            ))}
          </div>
        )}
        <div className="mt-16">
          <Toggle checked={d.teamOffsite} onChange={(v) => set({ teamOffsite: v })} label={f.tx(`Team offsite (≈${f.money(1_000 * (c.team.length + c.founders.filter((x) => x.active).length))}, +morale)`, `Offsite del team (≈${f.money(1_000 * (c.team.length + c.founders.filter((x) => x.active).length))}, +morale)`)} />
        </div>
      </Card>
    </div>
  );
}

function GrowthTab({ d, set }: { d: Decision; set: (p: Partial<Decision>) => void }) {
  const f = useFmt();
  return (
    <Card title={f.tx("Reputation & marketing actions", "Azioni di reputazione e marketing")} icon="Megaphone" action={<InfoTip concept="reputation" />}>
      <div className="grid cols-2" style={{ gap: 8 }}>
        {(Object.keys(REPUTATION_ACTIONS) as ReputationAction[]).map((a) => (
          <OptionCard
            key={a}
            on={d.reputationAction === a}
            onClick={() => set({ reputationAction: a })}
            title={f.L(REPUTATION_ACTIONS[a].label)}
            desc={
              <>
                {f.L(REPUTATION_ACTIONS[a].description)} {REPUTATION_ACTIONS[a].cost > 0 && <b>{f.money(REPUTATION_ACTIONS[a].cost)}</b>}
              </>
            }
          />
        ))}
      </div>
    </Card>
  );
}

function FinanceTab({ c, d, set }: { c: Company; d: Decision; set: (p: Partial<Decision>) => void }) {
  const f = useFmt();
  const setView = useStore((s) => s.setView);
  return (
    <div className="stack">
      <Card title={f.tx("Pitches to investors", "Pitch agli investitori")} icon="Presentation" action={<button className="btn sm" onClick={() => setView("funding")}>{f.tx("Open funding page", "Apri finanziamenti")}</button>}>
        {d.pitches.length === 0 ? (
          <p className="muted small">{f.tx("No pitch planned this round. Investors evaluate your last round's numbers; each pitch takes founders' time.", "Nessun pitch previsto in questo round. Gli investitori valutano i numeri dell'ultimo round; ogni pitch toglie tempo ai fondatori.")}</p>
        ) : (
          d.pitches.map((p) => (
            <div key={p.investorId} className="list-row">
              <Icon name="Presentation" size={16} className="accent" />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{investorDef(p.investorId)?.name}</div>
                <div className="small muted">
                  {f.money(p.amount)} · {p.instrument === "safe" ? `SAFE cap ${f.money(p.valuation)}` : `pre-money ${f.money(p.valuation)}`}
                </div>
              </div>
              <button className="icon-btn" onClick={() => set({ pitches: d.pitches.filter((x) => x.investorId !== p.investorId) })} aria-label="Remove">
                <Icon name="Trash2" size={15} />
              </button>
            </div>
          ))
        )}
      </Card>
      {c.termSheets.length > 0 && (
        <Card title={f.tx("Term sheets received", "Term sheet ricevuti")} icon="FileText" action={<InfoTip concept="termSheet" />}>
          {c.termSheets.map((t) => (
            <div key={t.id} className="list-row">
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{t.investorName}</div>
                <div className="small muted">{f.L(t.note)}</div>
                <div className="small faint">
                  {t.boardSeat ? f.tx("Board seat · ", "Posto nel CdA · ") : ""}
                  {t.poolTopUp > 0 ? `${f.tx("option pool", "pool di opzioni")} ${f.pct(t.poolTopUp)} · ` : ""}
                  {t.liquidationPref > 0 ? `${t.liquidationPref}x ${f.tx("liquidation preference", "liquidation preference")}` : ""}
                </div>
              </div>
              <Toggle
                checked={d.acceptTermSheetIds.includes(t.id)}
                onChange={(v) => set({ acceptTermSheetIds: v ? [...d.acceptTermSheetIds, t.id] : d.acceptTermSheetIds.filter((x) => x !== t.id) })}
                label={f.tx("Accept", "Accetta")}
              />
            </div>
          ))}
        </Card>
      )}
      <Card title={f.tx("Grants (non-dilutive)", "Bandi (non diluitivi)")} icon="Landmark" action={<InfoTip concept="grants" />} tour="grants">
        <div className="col gap-8">
          <OptionCard on={d.grantApplication === null} onClick={() => set({ grantApplication: null })} title={f.tx("No application", "Nessuna domanda")} />
          {GRANTS.map((g) => {
            const checks = grantChecks(c, g.id);
            const ok = checks.every((ch) => ch.met);
            return (
              <OptionCard
                key={g.id}
                on={d.grantApplication === g.id}
                disabled={!ok}
                onClick={() => set({ grantApplication: g.id })}
                title={`${f.L(g.name)} · ${f.money(g.amount)}`}
                desc={
                  <>
                    {f.L(g.description)}
                    <span className="row wrap gap-4 mt-8">
                      {checks.map((ch, i) => (
                        <span key={i} className={`chip ${ch.met ? "good" : "bad"}`}>
                          <Icon name={ch.met ? "Check" : "X"} size={11} /> {f.L(ch.label)}
                        </span>
                      ))}
                    </span>
                  </>
                }
              />
            );
          })}
        </div>
      </Card>
      <Card title={f.tx("Loans", "Prestiti")} icon="Banknote" action={<InfoTip concept="debtVsEquity" />}>
        <LoanPicker c={c} d={d} set={set} />
      </Card>
      {c.acquisitionOffers.length > 0 && (
        <Card title={f.tx("Acquisition offers", "Offerte di acquisizione")} icon="Handshake" action={<InfoTip concept="exit" />} className="warning">
          {c.acquisitionOffers.map((o) => {
            const payouts = waterfall(c, o.value);
            const fp = founderPayout(c, payouts);
            return (
              <div key={o.id} className="list-row">
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>
                    {o.acquirer} · {f.money(o.value)}
                  </div>
                  <div className="small muted">
                    {o.kind === "team" ? f.tx("Another team of the game", "Un altro team della partita") : o.kind === "financial" ? f.tx("Financial buyer", "Acquirente finanziario") : o.kind === "acquihire" ? "Acqui-hire" : f.tx("Strategic acquirer", "Acquirente strategico")} · {f.tx("premium", "premio")} {f.pct(o.premium - 1)} ·{" "}
                    {f.tx("founders would receive", "i fondatori incasserebbero")} <b>{f.money(fp)}</b>
                  </div>
                </div>
                <Toggle checked={d.acceptAcquisitionId === o.id} onChange={(v) => set({ acceptAcquisitionId: v ? o.id : null })} label={f.tx("Sell", "Vendi")} />
              </div>
            );
          })}
          <p className="small faint mt-8">{f.tx("Selling ends the game for your company: your final score is fixed at the exit value.", "Vendere chiude il gioco per la tua azienda: il punteggio finale resta fissato al valore dell'exit.")}</p>
        </Card>
      )}
    </div>
  );
}

function LoanPicker({ c, d, set }: { c: Company; d: Decision; set: (p: Partial<Decision>) => void }) {
  const f = useFmt();
  const game = useGame();
  const lenderId = d.loanRequest?.lenderId ?? null;
  return (
    <div className="col gap-8">
      <OptionCard on={!lenderId} onClick={() => set({ loanRequest: null })} title={f.tx("No loan", "Nessun prestito")} />
      {LENDERS.map((l) => {
        const lim = loanLimit(c, l, game.round);
        const ok = lim.checks.every((ch) => ch.met) && lim.max > 0;
        const on = lenderId === l.id;
        return (
          <div key={l.id} className="col gap-8">
            <OptionCard
              on={on}
              disabled={!ok}
              onClick={() => set({ loanRequest: { lenderId: l.id, amount: Math.min(lim.max, Math.max(10_000, Math.round(lim.max / 2 / 1000) * 1000)) } })}
              title={`${l.name}${ok ? ` · ${f.tx("up to", "fino a")} ${f.money(lim.max)}` : ""}`}
              desc={
                <>
                  {f.L(l.description)}
                  {!ok && (
                    <span className="row wrap gap-4 mt-8">
                      {lim.checks.map((ch, i) => (
                        <span key={i} className={`chip ${ch.met ? "good" : "bad"}`}>
                          <Icon name={ch.met ? "Check" : "X"} size={11} /> {f.L(ch.label)}
                        </span>
                      ))}
                    </span>
                  )}
                </>
              }
            />
            {on && d.loanRequest && (
              <SliderField label={f.tx("Amount", "Importo")} value={d.loanRequest.amount} min={10_000} max={Math.max(10_000, lim.max)} step={1_000} onChange={(v) => set({ loanRequest: { lenderId: l.id, amount: v } })} format={(v) => f.money(v)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StrategySwitchNote({ c, changed, loss }: { c: Company; changed: boolean; loss: number }) {
  const f = useFmt();
  if (!changed) return null;
  const launched = c.product.launched && c.customers > 0;
  return launched ? (
    <Callout tone="warn">
      {f.tx(
        `Changing now costs about ${f.pct(loss)} of your customers (≈${f.compact(c.customers * loss)})${loss > 0.1 ? " and some product-market fit" : ""}: decide once, then stick to it.`,
        `Cambiare ora costa circa il ${f.pct(loss)} dei clienti (≈${f.compact(c.customers * loss)})${loss > 0.1 ? " e un po' di product-market fit" : ""}: decidi una volta e poi tieni la rotta.`,
      )}
    </Callout>
  ) : (
    <p className="small faint mt-8">{f.tx("Before launch you can change it for free.", "Prima del lancio puoi cambiarlo senza costi.")}</p>
  );
}

function TeamsTab({ c, d, set }: { c: Company; d: Decision; set: (p: Partial<Decision>) => void }) {
  const f = useFmt();
  const game = useGame();
  const others = game.companies.filter((o) => o.id !== c.id && o.status === "active");
  const partners = activePartnerships(c, game.round);
  const full = partners.length >= MAX_PARTNERSHIPS;
  const teamOffers = c.acquisitionOffers.filter((o) => o.kind === "team");
  return (
    <div className="stack">
      {c.partnershipOffers.length > 0 && (
        <Card title={f.tx("Partnership proposals received", "Proposte di partnership ricevute")} icon="Handshake" action={<InfoTip concept="coopetition" />} className="warning">
          {c.partnershipOffers.map((o) => {
            const from = game.companies.find((x) => x.id === o.fromCompanyId);
            return (
              <div key={o.id} className="list-row">
                {from && <Logo company={from} size={28} />}
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{o.fromName}</div>
                  <div className="small muted">
                    {from && from.sector === c.sector
                      ? f.tx(`Same sector: an alliance for ${PARTNERSHIP_ROUNDS} rounds (CAC -8%, churn -5% for both).`, `Stesso settore: un'alleanza per ${PARTNERSHIP_ROUNDS} round (CAC -8%, churn -5% per entrambi).`)
                      : f.tx(`Different sector: co-marketing for ${PARTNERSHIP_ROUNDS} rounds (CAC -12%, word of mouth +15% for both).`, `Settore diverso: co-marketing per ${PARTNERSHIP_ROUNDS} round (CAC -12%, passaparola +15% per entrambi).`)}
                  </div>
                </div>
                <Toggle
                  checked={d.acceptPartnershipIds.includes(o.id)}
                  onChange={(v) => set({ acceptPartnershipIds: v ? [...d.acceptPartnershipIds, o.id] : d.acceptPartnershipIds.filter((x) => x !== o.id) })}
                  label={f.tx("Accept", "Accetta")}
                />
              </div>
            );
          })}
        </Card>
      )}
      {teamOffers.length > 0 && (
        <Callout tone="warn" icon="Handshake">
          {f.tx("Another team wants to buy your company: you find the offer in Finance & exit.", "Un altro team vuole comprare la vostra azienda: trovate l'offerta in Finanza ed exit.")}
        </Callout>
      )}
      <Card title={f.tx("Teams in the game", "I team della partita")} icon="Users" action={<span className="small faint">{f.tx("Partnerships", "Partnership")} {partners.length}/{MAX_PARTNERSHIPS}</span>}>
        <p className="small muted" style={{ marginBottom: 12 }}>
          {f.tx(
            "You can propose one partnership per round and make one acquisition offer. The other team answers next round; an acquisition is paid in cash from your account.",
            "Potete proporre una partnership per round e fare un'offerta di acquisizione. L'altro team risponde nel round successivo; l'acquisizione si paga in contanti dalla vostra cassa.",
          )}{" "}
          <InfoTip concept="startupMna" />
        </p>
        {others.map((o) => {
          const partner = partners.find((p) => p.partnerId === o.id);
          const proposed = d.partnershipProposals.includes(o.id);
          const bidding = d.acquisitionBid?.targetId === o.id;
          const bidMax = Math.max(0, Math.floor(c.cash / 10_000) * 10_000);
          // offers below half of the valuation are not taken seriously
          const bidMin = Math.max(10_000, Math.round((o.valuation * 0.5) / 10_000) * 10_000);
          const canBid = bidMax >= bidMin;
          return (
            <div key={o.id} className="list-row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <Logo company={o} size={32} />
              <div className="grow" style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 600 }}>
                  {o.name} {o.isBot && <Badge>bot</Badge>} {partner && <Badge tone="good">{f.tx(`partner until round ${partner.untilRound}`, `partner fino al round ${partner.untilRound}`)}</Badge>}
                </div>
                <div className="small muted">
                  {f.L(SECTORS[o.sector].name)}
                  {o.sector === c.sector ? ` (${f.tx("your sector", "il tuo settore")})` : ""} · {f.tx("valuation", "valutazione")} {f.money(o.valuation)} · {f.compact(o.customers)} {f.tx("customers", "clienti")}
                </div>
                {!canBid && !bidding && <div className="tiny faint">{f.tx(`To make an offer you need at least ${f.money(bidMin)} in cash (half of their valuation).`, `Per fare un'offerta servono almeno ${f.money(bidMin)} in cassa (metà della loro valutazione).`)}</div>}
                {bidding && d.acquisitionBid && (
                  <div className="mt-8">
                    <SliderField
                      label={f.tx("Cash offer", "Offerta in contanti")}
                      value={d.acquisitionBid.amount}
                      min={bidMin}
                      max={Math.max(bidMin, bidMax)}
                      step={10_000}
                      onChange={(v) => set({ acquisitionBid: { targetId: o.id, amount: v } })}
                      format={(v) => `${f.money(v)} (${f.num(v / Math.max(1, o.valuation), 2)}× ${f.tx("valuation", "valutazione")})`}
                      hint={f.tx(
                        o.sector === c.sector
                          ? "Same sector: you take on most of their customers and their team. Below their valuation they will probably refuse."
                          : "Different sector: you gain their team and know-how, not their customers. Below their valuation they will probably refuse.",
                        o.sector === c.sector
                          ? "Stesso settore: prendete gran parte dei loro clienti e il loro team. Sotto la loro valutazione probabilmente rifiuteranno."
                          : "Settore diverso: acquisite il loro team e le competenze, non i clienti. Sotto la loro valutazione probabilmente rifiuteranno.",
                      )}
                    />
                  </div>
                )}
              </div>
              <div className="col gap-8" style={{ alignItems: "flex-end" }}>
                <Toggle
                  checked={proposed}
                  disabled={!!partner || (full && !proposed) || (!proposed && d.partnershipProposals.length >= 1)}
                  onChange={(v) => set({ partnershipProposals: v ? [o.id] : [] })}
                  label={f.tx("Propose partnership", "Proponi partnership")}
                />
                <Toggle
                  checked={bidding}
                  disabled={!canBid && !bidding}
                  onChange={(v) => set({ acquisitionBid: v ? { targetId: o.id, amount: Math.min(bidMax, Math.max(bidMin, Math.round(o.valuation / 10_000) * 10_000)) } : null })}
                  label={f.tx("Acquisition offer", "Offerta di acquisizione")}
                />
              </div>
            </div>
          );
        })}
      </Card>
      {partners.length > 0 && (
        <Card title={f.tx("Active partnerships", "Partnership attive")} icon="Handshake">
          {partners.map((p) => (
            <div key={p.id} className="list-row">
              <Icon name="Handshake" size={16} className="accent" />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{p.partnerName}</div>
                <div className="small muted">
                  {p.sameSector ? f.tx("Alliance: CAC -8%, churn -5%", "Alleanza: CAC -8%, churn -5%") : f.tx("Co-marketing: CAC -12%, word of mouth +15%", "Co-marketing: CAC -12%, passaparola +15%")} · {f.tx("until round", "fino al round")} {p.untilRound}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function DilemmaTab({ c, d, set }: { c: Company; d: Decision; set: (p: Partial<Decision>) => void }) {
  const f = useFmt();
  const dil = c.dilemma!;
  return (
    <Card title={f.L(dil.title)} icon="Scale" action={dil.concept ? <InfoTip concept={dil.concept} /> : null}>
      <p style={{ fontSize: 15 }}>{f.L(dil.description)}</p>
      <div className="col gap-8 mt-16">
        {dil.options.map((o) => (
          <OptionCard key={o.id} on={d.dilemmaChoice === o.id} onClick={() => set({ dilemmaChoice: o.id })} title={f.L(o.label)} desc={f.L(o.description)} />
        ))}
      </div>
      <p className="small faint mt-16">{f.tx("If you do not choose, the most passive option will be applied. Some consequences appear only in later rounds.", "Se non scegli, verrà applicata l'opzione più passiva. Alcune conseguenze si vedono solo nei round successivi.")}</p>
    </Card>
  );
}

function warningsFor(f: Fmt, c: Company, d: Decision, preview: PreviewResult | null): Array<{ tone: "bad" | "warn" | "info"; text: string }> {
  const out: Array<{ tone: "bad" | "warn" | "info"; text: string }> = [];
  if (preview) {
    if (preview.cashEnd < 0) out.push({ tone: "bad", text: f.tx("You will run out of cash during this round. Cut spending, raise money or take a loan.", "Finirai la cassa durante questo round. Taglia le spese, raccogli capitali o chiedi un prestito.") });
    else if (preview.runway < 3) out.push({ tone: "warn", text: f.tx("Less than 3 months of runway at the end of the round.", "Meno di 3 mesi di runway a fine round.") });
    if (preview.launched && preview.wtp > 0 && d.price > preview.wtp * 1.3) out.push({ tone: "warn", text: f.tx("Your price is well above customers' willingness to pay.", "Il prezzo è molto sopra la disponibilità a pagare dei clienti.") });
  }
  const live = c.product.launched && c.customers > 0;
  if (live && d.targetSegment !== c.segment) out.push({ tone: "warn", text: f.tx("You are changing target customers: about 12% of customers will leave and PMF drops a little.", "State cambiando clienti obiettivo: circa il 12% dei clienti se ne andrà e il PMF scende un po'.") });
  if (live && d.pricingModel !== c.pricingModel) out.push({ tone: "warn", text: f.tx("You are changing pricing model: about 5% of customers will leave.", "State cambiando modello di prezzo: circa il 5% dei clienti se ne andrà.") });
  if (d.acquisitionBid && preview && preview.cashEnd < d.acquisitionBid.amount) out.push({ tone: "warn", text: f.tx("If the acquisition is accepted next round, you may not have enough cash to pay it.", "Se l'acquisizione verrà accettata il prossimo round, potreste non avere abbastanza cassa per pagarla.") });
  if (!c.product.launched && d.discovery === "none") out.push({ tone: "info", text: f.tx("No customer discovery before launch: you risk building the wrong thing.", "Nessuna customer discovery prima del lancio: rischi di costruire la cosa sbagliata.") });
  if (c.dilemma && !d.dilemmaChoice) out.push({ tone: "warn", text: f.tx("You have not answered this round's dilemma.", "Non hai risposto al dilemma di questo round.") });
  if (d.founderHours >= 80 && c.founderStress > 0.6) out.push({ tone: "warn", text: f.tx("80-hour weeks with high stress: burnout risk.", "Settimane da 80 ore con stress alto: rischio burnout.") });
  return out;
}

function ReviewTab({ c, d, preview, onEdit }: { c: Company; d: Decision; preview: PreviewResult | null; onEdit: (t: Tab) => void }) {
  const f = useFmt();
  const submit = useStore((s) => s.submit);
  const role = useStore((s) => s.classroomRole);
  const toast = useStore((s) => s.toast);
  const game = useGame();
  const warnings = warningsFor(f, c, d, preview);
  const oneOff = oneOffCosts(c, d);
  const rows: Array<[string, string, Tab]> = [
    [f.tx("R&D", "R&S"), `${f.money(d.rdBudget)}/${f.tx("mo", "mese")}`, "core"],
    ["Marketing", `${f.money(d.marketingBudget)}/${f.tx("mo", "mese")}`, "core"],
    ["Ops", `${f.money(d.opsBudget)}/${f.tx("mo", "mese")}`, "core"],
    [f.tx("Price", "Prezzo"), f.money(d.price, { decimals: d.price < 100 ? 2 : 0 }), "core"],
    [f.tx("Channel", "Canale"), f.L(GTM_INFO[d.gtm].name), "core"],
    [f.tx("Pricing model", "Modello di prezzo"), f.L(PRICING_INFO[d.pricingModel].label), "core"],
    [f.tx("Target customers", "Clienti obiettivo"), f.L(SEGMENT_INFO[d.targetSegment].label), "product"],
    [f.tx("Development", "Sviluppo"), { rush: f.tx("Rush", "Corsa"), balanced: f.tx("Balanced", "Bilanciato"), quality: f.tx("Quality first", "Prima la qualità") }[d.devApproach], "product"],
    ["Discovery", { none: f.tx("None", "Nessuna"), light: f.tx("Light", "Leggera"), deep: f.tx("Deep", "Profonda") }[d.discovery], "product"],
    [f.tx("Founders' hours", "Ore dei fondatori"), `${d.founderHours}h`, "people"],
    [
      f.tx("Hiring offers", "Offerte di assunzione"),
      d.offers.length > 0 ? d.offers.map((o) => game.candidates.find((k) => k.id === o.candidateId)?.name ?? "?").join(", ") : f.tx("none", "nessuna"),
      "people",
    ],
    [f.tx("Reputation action", "Azione di reputazione"), f.L(REPUTATION_ACTIONS[d.reputationAction].label), "growth"],
    [
      f.tx("Pitches", "Pitch"),
      d.pitches.length > 0 ? d.pitches.map((p) => `${investorDef(p.investorId)?.name ?? "?"}: ${f.money(p.amount)}`).join(", ") : f.tx("none", "nessuno"),
      "finance",
    ],
    [
      f.tx("Founder network", "Rete dei fondatori"),
      d.interactions.length > 0 ? d.interactions.map((i) => `${f.L(INTERACTION_DEFS[i.kind].title)} → ${game.companies.find((o) => o.id === i.targetId)?.name ?? "?"}`).join(", ") : f.tx("none", "nessuna"),
      "network",
    ],
  ];
  // one-off decisions with big consequences: listed only when taken
  if (d.fires.length > 0)
    rows.push([f.tx("Layoffs", "Licenziamenti"), d.fires.map((id) => c.team.find((e) => e.id === id)?.name ?? "?").join(", "), "people"]);
  if (d.acceptCounterIds.length > 0)
    rows.push([f.tx("Counter-offers accepted", "Controfferte accettate"), c.counterOffers.filter((co) => d.acceptCounterIds.includes(co.id)).map((co) => `${co.candidateName}: ${f.money(co.salary)}`).join(", "), "people"]);
  if (d.grantApplication) rows.push([f.tx("Grant application", "Domanda di bando"), f.L(GRANTS.find((g) => g.id === d.grantApplication)?.name), "finance"]);
  if (d.loanRequest) rows.push([f.tx("Loan request", "Richiesta di prestito"), `${LENDERS.find((l) => l.id === d.loanRequest!.lenderId)?.name ?? "?"}: ${f.money(d.loanRequest.amount)}`, "finance"]);
  if (d.acceptTermSheetIds.length > 0)
    rows.push([f.tx("Term sheets accepted", "Term sheet accettati"), c.termSheets.filter((t) => d.acceptTermSheetIds.includes(t.id)).map((t) => `${t.investorName}: ${f.money(t.amount)}`).join(", "), "finance"]);
  if (d.acceptAcquisitionId) {
    const o = c.acquisitionOffers.find((x) => x.id === d.acceptAcquisitionId);
    rows.push([f.tx("Sell the company", "Vendita dell'azienda"), o ? `${o.acquirer}: ${f.money(o.value)}` : "?", "finance"]);
  }
  const teamName = (id: string) => game.companies.find((o) => o.id === id)?.name ?? "?";
  if (d.partnershipProposals.length + d.acceptPartnershipIds.length > 0 || d.acquisitionBid)
    rows.push([
      f.tx("Deals", "Accordi"),
      [
        ...d.partnershipProposals.map((id) => `${f.tx("partnership proposed to", "partnership proposta a")} ${teamName(id)}`),
        ...d.acceptPartnershipIds.map((id) => `${f.tx("partnership accepted with", "partnership accettata con")} ${c.partnershipOffers.find((o) => o.id === id)?.fromName ?? "?"}`),
        ...(d.acquisitionBid ? [`${f.tx("offer to buy", "offerta per comprare")} ${teamName(d.acquisitionBid.targetId)}: ${f.money(d.acquisitionBid.amount)}`] : []),
      ].join("; "),
      "teams",
    ]);
  if (c.dilemma) rows.push([f.tx("Dilemma", "Dilemma"), d.dilemmaChoice ? f.L(c.dilemma.options.find((o) => o.id === d.dilemmaChoice)?.label) : f.tx("not answered", "senza risposta"), "dilemma"]);
  return (
    <div className="stack">
      <Card title={f.tx("Your decisions", "Le tue decisioni")} icon="ListChecks">
        <table className="table">
          <tbody>
            {rows.map(([k, v, t]) => (
              <tr key={k}>
                <td className="muted">{k}</td>
                <td>{v}</td>
                <td className="right">
                  {!c.submitted && (
                    <button className="btn sm ghost" onClick={() => onEdit(t)}>
                      <Icon name="Pencil" size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {oneOff > 0 && (
              <tr>
                <td className="muted">{f.tx("One-off costs", "Costi una tantum")}</td>
                <td>{f.money(oneOff)}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      {warnings.map((w, i) => (
        <Callout key={i} tone={w.tone}>
          {w.text}
        </Callout>
      ))}
      {!c.submitted ? (
        <button
          className="btn primary lg block"
          data-tour="submit"
          onClick={async () => {
            submit(c.id);
            if (role === "team") {
              if (await exportDecisionFile(game, c.id, d)) toast(f.tx("Decision file exported: send it to the instructor.", "File delle decisioni esportato: invialo al docente."), "good");
            } else {
              toast(game.config.mode === "solo" ? f.tx("Decisions submitted. Advance when you are ready.", "Decisioni inviate. Avanza quando sei pronto.") : f.tx("Decisions submitted.", "Decisioni inviate."), "good");
            }
          }}
        >
          <Icon name={role === "team" ? "Upload" : "Check"} size={18} />
          {role === "team" ? f.tx("Lock and export the decision file", "Blocca ed esporta il file delle decisioni") : f.tx("Submit decisions", "Invia le decisioni")}
        </button>
      ) : role === "team" ? (
        <div className="stack">
          <Callout tone="good">{f.tx("Decisions locked. Send the decision file to the instructor; when you receive the new game file, import it from Settings & save.", "Decisioni bloccate. Invia il file delle decisioni al docente; quando ricevi il nuovo file di partita, importalo da Impostazioni e salvataggio.")}</Callout>
          <button className="btn block" onClick={() => c.decision && void exportDecisionFile(game, c.id, c.decision)}>
            <Icon name="Upload" size={16} />
            {f.tx("Export the decision file again", "Esporta di nuovo il file delle decisioni")}
          </button>
        </div>
      ) : (
        <Callout tone="good">
          {game.config.mode === "solo"
            ? f.tx("Decisions submitted. Advance to the next period when you are ready.", "Decisioni inviate. Avanza al periodo successivo quando sei pronto.")
            : f.tx("Decisions submitted. The instructor will advance the round when all teams are ready.", "Decisioni inviate. Il docente avanzerà il round quando tutti i team saranno pronti.")}
        </Callout>
      )}
    </div>
  );
}
