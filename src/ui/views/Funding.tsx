import { useMemo, useState } from "react";
import {
  INVESTORS,
  INVESTOR_TYPE_LABEL,
  MAX_PITCHES,
  SECTORS,
  fairValuation,
  featuresFor,
  foundersOwnership,
  foundersVoting,
  investorCapacity,
  investorChecks,
  safeImpliedPct,
  totalShares,
  type Company,
  type GameState,
  type InvestorDef,
  type Pitch,
} from "../../core";
import { applyEquityRound } from "../../core/engine/captable";
import { Donut, SERIES_COLORS } from "../components/charts";
import { Icon } from "../components/Icon";
import { Badge, Callout, Card, Empty, InfoTip, Modal, Segmented, SliderField, Stat } from "../components/ui";
import { useActiveCompany, useGame, useDraft } from "../hooks";
import { useFmt } from "../i18n";
import { useStore } from "../store";
import { instrumentLabel } from "../content/labels";
import { ExitWaterfall } from "./ExitWaterfall";

export function Funding() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const draft = useDraft(c);
  const update = useStore((s) => s.updateDraft);
  const [pitchTo, setPitchTo] = useState<InvestorDef | null>(null);
  if (!c || !draft) return null;
  const locked = c.submitted || c.status !== "active" || game.finished;
  const own = foundersOwnership(c);
  const voting = foundersVoting(c);
  const others = c.board.investors + c.board.independents;
  const control = c.board.founders > others;
  const report = [...game.reports].reverse().find((r) => r.companyId === c.id && r.pitchResults.length > 0);

  // cap table slices
  const groups = new Map<string, { label: string; value: number }>();
  for (const h of c.capTable.holders) {
    const key = h.kind === "founder" ? `f:${h.id}` : h.kind === "employee" ? "employees" : h.kind === "pool" ? "pool" : h.kind === "crowd" ? `c:${h.id}` : `i:${h.name}`;
    const label = h.kind === "employee" ? f.tx("Employees", "Dipendenti") : h.kind === "pool" ? f.tx("Option pool (unallocated)", "Pool di opzioni (non assegnato)") : h.name;
    const g = groups.get(key) ?? { label, value: 0 };
    g.value += h.shares;
    groups.set(key, g);
  }
  const slices = Array.from(groups.entries()).map(([id, g], i) => ({ id, label: g.label, value: g.value, color: SERIES_COLORS[i % SERIES_COLORS.length] }));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("Funding", "Finanziamenti")}</h1>
          <p className="muted">{f.tx("Every euro you raise costs ownership or control. Choose what you are willing to give up.", "Ogni euro raccolto costa quote o controllo. Scegli a cosa sei disposto a rinunciare.")}</p>
        </div>
      </div>

      <div className="grid cols-4">
        <Card>
          <Stat label={f.tx("Valuation", "Valutazione")} concept="valuation" value={f.money(c.valuation)} sub={c.lastPostMoney ? `${f.tx("last post-money", "ultima post-money")} ${f.money(c.lastPostMoney)}` : undefined} />
        </Card>
        <Card>
          <Stat label={f.tx("Founders' ownership", "Quota dei fondatori")} concept="dilution" value={f.pct(own, 1)} sub={`${f.tx("voting", "con diritto di voto")} ${f.pct(voting, 1)}`} />
        </Card>
        <Card>
          <Stat label={f.tx("Total raised", "Totale raccolto")} value={f.money(c.totalRaised)} sub={`${c.fundingHistory.length} ${f.tx("operations", "operazioni")}`} />
        </Card>
        <Card>
          <Stat label={f.tx("Board control", "Controllo del CdA")} concept="richVsKing" value={control ? f.tx("Founders", "Fondatori") : f.tx("Investors", "Investitori")} tone={control ? "good" : "warn"} sub={`${c.board.founders} ${f.tx("founders", "fondatori")} · ${c.board.investors} ${f.tx("investors", "investitori")} · ${c.board.independents} ${f.tx("independent", "indipendenti")}`} />
        </Card>
      </div>

      <div className="grid cols-2">
        <Card title={f.tx("Cap table", "Cap table")} icon="PieChart" action={<InfoTip concept="optionPool" />}>
          <Donut slices={slices} format={(v) => f.pct(v, 1)} center={<div><div className="tiny faint">{f.tx("founders", "fondatori")}</div><div style={{ fontWeight: 700 }}>{f.pct(own, 0)}</div></div>} />
          {c.safes.length > 0 && (
            <Callout tone="warn" icon="FileText">
              {f.tx(
                `${c.safes.length} SAFE(s) outstanding (${f.money(c.safes.reduce((s, x) => s + x.amount, 0))}): they will convert at the next priced round, worth ≈${f.pct(safeImpliedPct(c), 1)} of the company at their caps.`,
                `${c.safes.length} SAFE in essere (${f.money(c.safes.reduce((s, x) => s + x.amount, 0))}): si convertiranno al prossimo round con prezzo, pari a ≈${f.pct(safeImpliedPct(c), 1)} dell'azienda ai loro cap.`,
              )}{" "}
              <InfoTip concept="safe" />
            </Callout>
          )}
        </Card>
        <Card title={f.tx("Funding history", "Storico dei finanziamenti")} icon="ClipboardList">
          {c.fundingHistory.length === 0 ? (
            <Empty icon="PiggyBank">{f.tx("Bootstrapped: no external funding yet.", "Bootstrapping: ancora nessun finanziamento esterno.")}</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>R</th>
                    <th>{f.tx("From", "Da")}</th>
                    <th>{f.tx("Type", "Tipo")}</th>
                    <th className="num">{f.tx("Amount", "Importo")}</th>
                    <th className="num">{f.tx("Stake", "Quota")}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.fundingHistory.map((r) => (
                    <tr key={r.id}>
                      <td>{r.round}</td>
                      <td>{r.investorName}</td>
                      <td className="small muted">{instrumentLabel(f, r.instrument)}</td>
                      <td className="num">{f.money(r.amount)}</td>
                      <td className="num">{r.equityPct ? f.pct(r.equityPct, 1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {c.loans.length > 0 && (
            <div className="mt-16 col gap-4">
              <h3>{f.tx("Loans", "Prestiti")}</h3>
              {c.loans.map((l) => (
                <div key={l.id} className="row between small">
                  <span>{l.lenderName}</span>
                  <span className="num muted">
                    {f.money(l.remaining)} {f.tx("left", "residui")} · {f.money(l.monthlyPayment)}/{f.tx("mo", "mese")} · {l.monthsLeft} {f.tx("months", "mesi")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {featuresFor(game.config).advancedFinance && <ExitWaterfall c={c} />}

      {report && (
        <Card title={f.tx("Last pitch results", "Esito degli ultimi pitch")} icon="Presentation">
          {report.pitchResults.map((p) => (
            <div key={p.investorId} className="list-row">
              <Icon name={p.outcome === "closed" ? "Check" : p.outcome === "termSheet" ? "FileText" : "X"} size={16} className={p.outcome === "closed" ? "good" : p.outcome === "termSheet" ? "warn" : "bad"} />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>
                  {p.investorName} · {f.tx("round", "round")} {report.round}
                </div>
                <div className="small muted">“{f.L(p.reason)}”</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card title={f.tx("Investors", "Investitori")} icon="HandCoins" action={<span className="small faint">{draft.pitches.length}/{MAX_PITCHES} {f.tx("pitches this round", "pitch in questo round")}</span>}>
        <p className="small muted" style={{ marginBottom: 12 }}>
          {f.tx(
            "Investors judge your last round's numbers, the market climate and your ask. Hard requirements must be met; asking for a valuation far above what they consider fair gets you rejected or a counter term sheet.",
            "Gli investitori giudicano i numeri dell'ultimo round, il clima di mercato e la tua richiesta. I requisiti obbligatori vanno soddisfatti; chiedere una valutazione molto sopra quella che ritengono equa porta a un rifiuto o a un term sheet alternativo.",
          )}{" "}
          {f.tx(
            "Each investor backs only a few companies per round and has a limited budget: if other teams pitch the same investor, the strongest pitch wins.",
            "Ogni investitore sostiene poche aziende per round e ha un budget limitato: se altri team fanno pitch allo stesso investitore, vince il pitch più forte.",
          )}{" "}
          <InfoTip concept="investorCapacity" />
        </p>
        <div className="grid cols-2">
          {INVESTORS.map((inv) => {
            const checks = investorChecks(game, c, inv, draft.founderHours);
            const hardOk = checks.every((ch) => !ch.hard || ch.met);
            const planned = draft.pitches.find((p) => p.investorId === inv.id);
            return (
              <div key={inv.id} className={`card flat`} style={{ opacity: hardOk ? 1 : 0.75 }}>
                <div className="row between top">
                  <div className="row gap-12">
                    <span className="logo" style={{ width: 36, height: 36, background: "var(--surface-3)", color: "var(--accent-text)" }}>
                      <Icon name={inv.icon} size={18} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 650 }}>{inv.name}</div>
                      <div className="small muted">{f.L(inv.tagline)}</div>
                    </div>
                  </div>
                  <Badge tone="accent">{f.L(INVESTOR_TYPE_LABEL[inv.type])}</Badge>
                </div>
                <p className="small muted mt-8">{f.L(inv.description)}</p>
                <div className="kv mt-8 small">
                  <span>{f.tx("Cheque", "Ticket")}</span>
                  <span>{inv.fixedTerms ? `${f.money(inv.fixedTerms.amount)} ${f.tx("for", "per")} ${f.pct(inv.fixedTerms.equityPct)}` : `${f.money(inv.checkMin)} – ${f.money(inv.checkMax)}`}</span>
                  <span>{f.tx("Typical dilution", "Diluizione tipica")}</span>
                  <span>
                    {f.pct(inv.dilutionMin)} – {f.pct(inv.dilutionMax)}
                  </span>
                  {inv.sectors && (
                    <>
                      <span>{f.tx("Focus", "Focus")}</span>
                      <span>{inv.sectors.map((s) => f.L(SECTORS[s].name)).join(", ")}</span>
                    </>
                  )}
                  {(inv.dealsPerRound || inv.capital) && (
                    <>
                      <span>{f.tx("Availability", "Disponibilità")}</span>
                      <span>
                        {inv.dealsPerRound ? f.tx(`${inv.dealsPerRound} new deal${inv.dealsPerRound > 1 ? "s" : ""} per round`, `${inv.dealsPerRound} ${inv.dealsPerRound > 1 ? "nuovi investimenti" : "nuovo investimento"} per round`) : ""}
                        {inv.capital ? ` · ${f.money(Math.max(0, investorCapacity(game, inv, game.round).capitalLeft))} ${f.tx("left", "ancora da investire")}` : ""}
                      </span>
                    </>
                  )}
                  <span>{f.tx("Terms", "Condizioni")}</span>
                  <span>
                    {inv.boardSeat ? f.tx("board seat", "posto CdA") : f.tx("no board seat", "nessun posto CdA")}
                    {inv.poolTopUp > 0 ? ` · pool ${f.pct(inv.poolTopUp)}` : ""}
                  </span>
                </div>
                {inv.perks.length > 0 && (
                  <div className="col gap-4 mt-8">
                    {inv.perks.map((p, i) => (
                      <div key={i} className="small row gap-4 top">
                        <Icon name="Star" size={12} className="accent" />
                        <span>{f.L(p.text)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="row wrap gap-4 mt-8">
                  {checks.map((ch, i) => (
                    <span key={i} className={`chip ${ch.met ? "good" : ch.hard ? "bad" : ""}`}>
                      <Icon name={ch.met ? "Check" : "X"} size={11} /> {f.L(ch.label)}
                    </span>
                  ))}
                </div>
                <div className="row mt-16">
                  {planned ? (
                    <>
                      <Badge tone="accent">
                        {f.tx("Pitch planned", "Pitch previsto")}: {f.money(planned.amount)}
                      </Badge>
                      {!locked && (
                        <>
                          <button className="btn sm" onClick={() => setPitchTo(inv)}>
                            <Icon name="Pencil" size={13} />
                          </button>
                          <button className="btn sm ghost" onClick={() => update(c.id, (d) => ({ ...d, pitches: d.pitches.filter((p) => p.investorId !== inv.id) }))}>
                            <Icon name="Trash2" size={13} />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    !locked && (
                      <button className="btn sm primary" disabled={!hardOk || draft.pitches.length >= MAX_PITCHES} onClick={() => setPitchTo(inv)}>
                        <Icon name="Presentation" size={14} />
                        {f.tx("Pitch", "Fai un pitch")}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {pitchTo && <PitchModal c={c} inv={pitchTo} onClose={() => setPitchTo(null)} />}
    </div>
  );
}

/** Founders' ownership after a hypothetical equity round, computed with the real cap-table engine. */
function simulateRound(game: GameState, c: Company, inv: InvestorDef, p: Pitch): { investorPct: number; foundersAfter: number; poolAdded: number } {
  const g = structuredClone(game);
  const cc = g.companies.find((x) => x.id === c.id)!;
  if (p.instrument === "safe") {
    return { investorPct: p.amount / p.valuation, foundersAfter: foundersOwnership(cc) * (1 - p.amount / p.valuation), poolAdded: 0 };
  }
  const res = applyEquityRound(g, cc, {
    investorId: inv.id,
    investorName: inv.name,
    amount: p.amount,
    preMoney: p.valuation,
    poolTarget: inv.poolTopUp,
    liquidationPref: inv.liquidationPref,
    kind: inv.type === "crowdfunding" ? "crowd" : "investor",
    roundLabel: "preview",
  });
  return { investorPct: res.investorPct, foundersAfter: foundersOwnership(cc), poolAdded: res.poolAdded / (totalShares(cc.capTable) || 1) };
}

function PitchModal({ c, inv, onClose }: { c: Company; inv: InvestorDef; onClose: () => void }) {
  const f = useFmt();
  const game = useGame();
  const update = useStore((s) => s.updateDraft);
  const draft = useDraft(c);
  const existing = draft?.pitches.find((p) => p.investorId === inv.id);
  const fair = fairValuation(game, c, inv);
  const fixed = inv.fixedTerms;
  const [instrument, setInstrument] = useState<Pitch["instrument"]>(existing?.instrument ?? inv.instruments[0]);
  const [amount, setAmount] = useState(existing?.amount ?? (fixed ? fixed.amount : Math.round((inv.checkMin + inv.checkMax) / 2 / 5_000) * 5_000));
  const defaultVal = fixed ? fixed.amount / fixed.equityPct - fixed.amount : Math.round(fair / 10_000) * 10_000;
  const [valuation, setValuation] = useState(existing?.valuation ?? (instrument === "safe" ? defaultVal + amount : defaultVal));
  const pitch: Pitch = fixed
    ? { investorId: inv.id, amount: fixed.amount, valuation: fixed.amount / fixed.equityPct - fixed.amount, instrument: "equity" }
    : { investorId: inv.id, amount, valuation, instrument };
  const sim = useMemo(() => simulateRound(game, c, inv, pitch), [game, c, inv, pitch.amount, pitch.valuation, pitch.instrument]);
  const lowBand = fair * 0.8;
  const highBand = fair * 1.2;
  const askPre = pitch.instrument === "safe" ? pitch.valuation - pitch.amount : pitch.valuation;
  const save = () => {
    update(c.id, (d) => ({ ...d, pitches: [...d.pitches.filter((p) => p.investorId !== inv.id), pitch] }));
    onClose();
  };
  const valMin = Math.max(100_000, Math.round(fair * 0.3 / 10_000) * 10_000);
  const valMax = Math.max(valMin * 2, Math.round(fair * 3 / 10_000) * 10_000);
  return (
    <Modal
      title={`${f.tx("Pitch to", "Pitch a")} ${inv.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {f.tx("Cancel", "Annulla")}
          </button>
          <button className="btn primary" onClick={save}>
            <Icon name="Presentation" size={16} />
            {f.tx("Plan this pitch", "Pianifica il pitch")}
          </button>
        </>
      }
    >
      <div className="col gap-16">
        {fixed ? (
          <Callout tone="info">{f.tx(`Standard deal: ${f.money(fixed.amount)} for ${f.pct(fixed.equityPct)}. Selection depends on your team and your learning about customers.`, `Deal standard: ${f.money(fixed.amount)} per il ${f.pct(fixed.equityPct)}. La selezione dipende dal team e da quanto avete imparato dai clienti.`)}</Callout>
        ) : (
          <>
            {inv.instruments.length > 1 && (
              <div className="field">
                <div className="field-label">
                  <span className="row gap-4">
                    {f.tx("Instrument", "Strumento")} <InfoTip concept="safe" />
                  </span>
                </div>
                <Segmented
                  value={instrument}
                  options={inv.instruments.map((i) => ({ value: i, label: i === "safe" ? f.tx("SAFE (convertible)", "SAFE (convertibile)") : f.tx("Priced equity", "Equity con prezzo") }))}
                  onChange={(v) => {
                    setInstrument(v);
                    setValuation(v === "safe" ? valuation + amount : Math.max(valMin, valuation - amount));
                  }}
                />
              </div>
            )}
            <SliderField label={f.tx("Amount", "Importo")} value={amount} min={inv.checkMin} max={inv.checkMax} step={5_000} onChange={setAmount} format={(v) => f.money(v)} />
            <SliderField
              label={instrument === "safe" ? f.tx("Valuation cap (post-money)", "Cap di valutazione (post-money)") : f.tx("Pre-money valuation you ask for", "Valutazione pre-money richiesta")}
              value={valuation}
              min={valMin}
              max={valMax + (instrument === "safe" ? amount : 0)}
              step={10_000}
              scale="log"
              concept="preMoney"
              onChange={setValuation}
              format={(v) => f.money(v)}
              hint={f.tx(
                `Companies like yours are usually valued between ${f.money(lowBand)} and ${f.money(highBand)} pre-money by this investor.`,
                `Aziende come la tua sono di solito valutate tra ${f.money(lowBand)} e ${f.money(highBand)} pre-money da questo investitore.`,
              )}
            />
          </>
        )}
        <Card className="flat">
          <div className="kv">
            <span>{f.tx("Investor's stake", "Quota dell'investitore")}</span>
            <span>{f.pct(sim.investorPct, 1)}</span>
            <span>{f.tx("Post-money valuation", "Valutazione post-money")}</span>
            <span>{f.money(pitch.instrument === "safe" ? pitch.valuation : pitch.valuation + pitch.amount)}</span>
            {sim.poolAdded > 0 && (
              <>
                <span>{f.tx("Option pool top-up (pre-money)", "Ampliamento pool di opzioni (pre-money)")}</span>
                <span className="warn">{f.pct(sim.poolAdded, 1)}</span>
              </>
            )}
            <span>{f.tx("Founders' ownership", "Quota dei fondatori")}</span>
            <span>
              {f.pct(foundersOwnership(c), 1)} → <span className="warn">{f.pct(sim.foundersAfter, 1)}</span>
            </span>
            {inv.boardSeat && (
              <>
                <span>{f.tx("Board", "CdA")}</span>
                <span>{f.tx("+1 investor seat", "+1 posto investitore")}</span>
              </>
            )}
          </div>
          {pitch.instrument === "safe" && <p className="tiny faint mt-8">{f.tx("SAFE dilution happens at conversion; the estimate uses the cap.", "La diluizione del SAFE avviene alla conversione; la stima usa il cap.")}</p>}
        </Card>
        {!fixed && askPre > highBand * 1.1 && <Callout tone="warn">{f.tx("You are asking well above the usual range: expect a rejection or a lower counter-offer.", "Stai chiedendo molto sopra la forchetta abituale: aspettati un rifiuto o una controfferta più bassa.")}</Callout>}
        {sim.investorPct > 0.35 && <Callout tone="bad">{f.tx("Selling more than ~35-40% in one round is a red flag for investors.", "Cedere più del 35-40% in un solo round è un campanello d'allarme per gli investitori.")}</Callout>}
        <p className="small faint">{f.tx("Each pitch takes about 10% of the founders' time this round.", "Ogni pitch assorbe circa il 10% del tempo dei fondatori in questo round.")}</p>
      </div>
    </Modal>
  );
}
