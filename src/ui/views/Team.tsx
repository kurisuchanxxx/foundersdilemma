import { useMemo, useState } from "react";
import {
  ARCHETYPES,
  BONUS_LABEL,
  ROLES,
  ROLE_LABEL,
  SENIORITY_LABEL,
  askSalary,
  evaluateOffer,
  expectedEquity,
  foundersOwnership,
  traitLabel,
  type Candidate,
  type Company,
  type Employee,
  type Role,
  type Stats,
} from "../../core";
import { MAX_OFFERS } from "../../core";
import { Avatar } from "../components/Avatar";
import { LevelChip, XpBar } from "../components/Gamify";
import { Icon } from "../components/Icon";
import { Badge, Callout, Card, Empty, InfoTip, Modal, Progress, Segmented, SliderField, Stat } from "../components/ui";
import { lastSnapshot, useActiveCompany, useGame, useDraft } from "../hooks";
import { useFmt } from "../i18n";
import { useStore } from "../store";

const STAT_LABELS: Array<[keyof Stats, string, string]> = [
  ["eng", "Eng", "Svil."],
  ["product", "Product", "Prodotto"],
  ["design", "Design", "Design"],
  ["growth", "Growth", "Growth"],
  ["sales", "Sales", "Vendite"],
  ["ops", "Ops", "Ops"],
  ["cs", "CS", "CS"],
];

export function StatBars({ stats }: { stats: Stats }) {
  const f = useFmt();
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "4px 12px" }}>
      {STAT_LABELS.filter(([k]) => stats[k] > 0).map(([k, en, it]) => (
        <div key={k}>
          <div className="row between tiny faint">
            <span>{f.tx(en, it)}</span>
            <span>{stats[k]}</span>
          </div>
          <Progress value={stats[k] / 10} thin />
        </div>
      ))}
    </div>
  );
}

export function Team() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const draft = useDraft(c);
  const update = useStore((s) => s.updateDraft);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [cvOf, setCvOf] = useState<Candidate | Employee | null>(null);
  const [offerFor, setOfferFor] = useState<Candidate | null>(null);
  if (!c || !draft) return null;
  const active = c.status === "active" && !game.finished;
  const locked = c.submitted || !active;
  const report = [...game.reports].reverse().find((r) => r.companyId === c.id && r.hiringResults.length > 0);
  const salaries = c.team.reduce((s, e) => s + e.salary, 0);
  const candidates = game.candidates.filter((k) => roleFilter === "all" || k.role === roleFilter);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("Team & hiring", "Team e assunzioni")}</h1>
          <p className="muted">{f.tx("People are your most effective (and most expensive) resource.", "Le persone sono la risorsa più efficace (e più costosa).")}</p>
        </div>
      </div>

      <div className="grid cols-4">
        <Card>
          <Stat label={f.tx("Headcount", "Persone")} icon="Users" value={c.team.length + c.founders.filter((x) => x.active).length} sub={`${c.founders.filter((x) => x.active).length} ${f.tx("founders", "fondatori")}`} />
        </Card>
        <Card>
          <Stat label={f.tx("Payroll / month", "Stipendi / mese")} icon="Banknote" value={f.money(salaries / 12)} />
        </Card>
        <Card>
          <Stat label={f.tx("Team morale", "Morale del team")} icon="Heart" concept="culture" value={f.pct(c.morale)} tone={c.morale < 0.5 ? "bad" : c.morale < 0.65 ? "warn" : "good"} />
        </Card>
        <Card>
          <Stat label={f.tx("Talent reputation", "Reputazione verso i talenti")} icon="Star" value={Math.round(c.reputation.talent)} sub={f.tx("helps convince candidates", "aiuta a convincere i candidati")} />
        </Card>
      </div>

      <Card title={f.tx("Founders", "Fondatori")} icon="Crown" action={<LevelChip xp={c.xp} size="md" />}>
        <div className="grid cols-2">
          {c.founders.map((fd) => (
            <div key={fd.id} className="row gap-12" style={{ opacity: fd.active ? 1 : 0.5 }}>
              <Avatar avatar={fd.avatar} name={fd.name} size={46} />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>
                  {fd.name} {!fd.active && <Badge tone="bad">{f.tx("left", "uscito")}</Badge>}
                </div>
                <div className="small muted row gap-4">
                  <Icon name={ARCHETYPES[fd.archetype].icon} size={12} className="accent" />
                  {f.L(ARCHETYPES[fd.archetype].name)} · {f.L(ARCHETYPES[fd.archetype].description)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16">
          <XpBar company={c} />
        </div>
        <div className="row between mt-16 small">
          <span className="muted">
            {f.tx("Founders' ownership", "Quota dei fondatori")}: <b>{f.pct(foundersOwnership(c), 1)}</b> · {c.founderVesting ? f.tx("founder vesting active", "vesting dei fondatori attivo") : f.tx("no founder vesting", "senza vesting dei fondatori")}
          </span>
          <span className="muted">
            {f.tx("Stress", "Stress")}: <b className={c.founderStress > 0.75 ? "bad" : ""}>{f.pct(c.founderStress)}</b>
          </span>
        </div>
      </Card>

      <Card title={f.tx("Employees", "Dipendenti")} icon="Briefcase">
        {c.team.length === 0 ? (
          <Empty icon="Users">{f.tx("No employees yet. The founders do everything.", "Ancora nessun dipendente. I fondatori fanno tutto.")}</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{f.tx("Name", "Nome")}</th>
                  <th>{f.tx("Role", "Ruolo")}</th>
                  <th className="num">{f.tx("Salary", "Stipendio")}</th>
                  <th className="num">Equity</th>
                  <th>{f.tx("Traits", "Caratteristiche")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {c.team.map((e) => {
                  const leaving = draft.fires.includes(e.id);
                  return (
                    <tr key={e.id} style={{ opacity: leaving ? 0.5 : 1 }}>
                      <td>
                        <button className="btn ghost sm" style={{ padding: 0 }} onClick={() => setCvOf(e)}>
                          <b>{e.name}</b>
                        </button>
                        <div className="tiny faint">
                          {f.tx("since round", "dal round")} {e.hiredRound}
                        </div>
                      </td>
                      <td>
                        {f.L(ROLE_LABEL[e.role])}
                        <div className="tiny faint">{f.L(SENIORITY_LABEL[e.seniority])}</div>
                      </td>
                      <td className="num">{f.money(e.salary)}</td>
                      <td className="num">{e.equityPct > 0 ? f.pct(e.equityPct, 2) : "—"}</td>
                      <td>
                        <div className="row wrap gap-4">
                          {e.perks.slice(0, 2).map((p) => (
                            <span key={p} className="chip good">
                              {f.L(traitLabel(p))}
                            </span>
                          ))}
                          {e.riskTags.slice(0, 1).map((p) => (
                            <span key={p} className="chip bad">
                              {f.L(traitLabel(p))}
                            </span>
                          ))}
                          {e.hiddenBonuses.map((b) => (
                            <span key={b.trigger} className="chip" title={b.description}>
                              <Icon name="Sparkles" size={11} /> {f.L(BONUS_LABEL[b.effect])}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="right">
                        {!locked && e.candidateId !== "pro_ceo" && (
                          <button
                            className={`btn sm ${leaving ? "" : "danger"}`}
                            onClick={() => update(c.id, (d) => ({ ...d, fires: leaving ? d.fires.filter((x) => x !== e.id) : [...d.fires, e.id] }))}
                          >
                            {leaving ? f.tx("Keep", "Tieni") : f.tx("Let go", "Licenzia")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {draft.fires.length > 0 && <Callout tone="warn">{f.tx("Letting people go costs one month of salary and hurts morale and talent reputation.", "Licenziare costa un mese di stipendio e danneggia morale e reputazione verso i talenti.")}</Callout>}
      </Card>

      {report && (
        <Card title={f.tx("Last hiring results", "Ultimi risultati delle assunzioni")} icon="ClipboardList">
          {report.hiringResults.map((h) => (
            <div key={h.candidateId} className="list-row">
              <Icon name={h.outcome === "hired" ? "Check" : h.outcome === "counter" ? "MessageCircle" : "X"} size={16} className={h.outcome === "hired" ? "good" : h.outcome === "counter" ? "warn" : "bad"} />
              <div className="grow small">
                <b>{h.candidateName}</b> · {f.L(h.reason)}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card
        title={f.tx("Job market", "Mercato del lavoro")}
        icon="UserPlus"
        action={
          <span className="small faint">
            {draft.offers.length}/{MAX_OFFERS} {f.tx("offers", "offerte")} · <InfoTip concept="equityCompensation" />
          </span>
        }
      >
        <p className="small muted" style={{ marginBottom: 12 }}>
          {f.tx(
            "Offers are evaluated at the start of the round. Other teams may bid for the same person: the candidate picks the most attractive offer (salary, equity, stage, reputation, fit).",
            "Le offerte vengono valutate all'inizio del round. Altri team possono puntare sulla stessa persona: il candidato sceglie l'offerta più attraente (stipendio, equity, fase, reputazione, affinità).",
          )}
        </p>
        <Segmented
          value={roleFilter}
          options={[{ value: "all" as const, label: f.tx("All", "Tutti") }, ...ROLES.map((r) => ({ value: r, label: f.L(ROLE_LABEL[r]) }))]}
          onChange={setRoleFilter}
        />
        <div className="grid cols-2 mt-16">
          {candidates.map((k) => {
            const offer = draft.offers.find((o) => o.candidateId === k.id);
            const heldElsewhere = k.heldFor && k.heldFor.companyId !== c.id && k.heldFor.untilRound >= game.round;
            return (
              <div key={k.id} className="card flat">
                <div className="row between top">
                  <div>
                    <div style={{ fontWeight: 650 }}>{k.name}</div>
                    <div className="small muted">
                      {f.L(ROLE_LABEL[k.role])} · {f.L(SENIORITY_LABEL[k.seniority])} · {k.cv.age} {f.tx("y/o", "anni")}
                    </div>
                  </div>
                  <div className="right">
                    <div className="num" style={{ fontWeight: 650 }}>
                      {f.money(askSalary(game, c, k))}
                    </div>
                    <div className="tiny faint">{f.tx("asks / year", "chiede / anno")}</div>
                  </div>
                </div>
                <div className="small faint mt-8">
                  <Icon name="GraduationCap" size={12} /> {k.cv.education.degree} {k.cv.education.field} · {k.cv.education.university}
                </div>
                {k.cv.experiences[0] && (
                  <div className="small faint">
                    <Icon name="Briefcase" size={12} /> {k.cv.experiences[0].company} · {k.cv.experiences[0].role}
                  </div>
                )}
                <div className="mt-8">
                  <StatBars stats={k.stats} />
                </div>
                <div className="row wrap gap-4 mt-8">
                  {k.perks.map((p) => (
                    <span key={p} className="chip good">
                      {f.L(traitLabel(p))}
                    </span>
                  ))}
                  {k.riskTags.map((p) => (
                    <span key={p} className="chip bad">
                      {f.L(traitLabel(p))}
                    </span>
                  ))}
                  {k.hiddenBonuses.length > 0 && (
                    <span className="chip" title={f.tx("Something in this CV looks special…", "C'è qualcosa di speciale in questo CV…")}>
                      <Icon name="Sparkles" size={11} /> {f.tx("Special talent?", "Talento speciale?")}
                    </span>
                  )}
                </div>
                <div className="row mt-16">
                  <button className="btn sm" onClick={() => setCvOf(k)}>
                    <Icon name="FileText" size={14} />
                    CV
                  </button>
                  {heldElsewhere ? (
                    <Badge tone="warn">{f.tx("Negotiating with another team", "In trattativa con un altro team")}</Badge>
                  ) : offer ? (
                    <>
                      <Badge tone="accent">
                        {f.tx("Offer", "Offerta")}: {f.money(offer.salary)} + {f.pct(offer.equityPct, 2)}
                      </Badge>
                      {!locked && (
                        <>
                          <button className="btn sm" onClick={() => setOfferFor(k)}>
                            <Icon name="Pencil" size={13} />
                          </button>
                          <button className="btn sm ghost" onClick={() => update(c.id, (d) => ({ ...d, offers: d.offers.filter((o) => o.candidateId !== k.id) }))}>
                            <Icon name="Trash2" size={13} />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    !locked && (
                      <button className="btn sm primary" disabled={draft.offers.length >= MAX_OFFERS} onClick={() => setOfferFor(k)}>
                        <Icon name="HandCoins" size={14} />
                        {f.tx("Make offer", "Fai un'offerta")}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {cvOf && <CvModal person={cvOf} onClose={() => setCvOf(null)} />}
      {offerFor && <OfferModal c={c} cand={offerFor} onClose={() => setOfferFor(null)} />}
    </div>
  );
}

function CvModal({ person, onClose }: { person: Candidate | Employee; onClose: () => void }) {
  const f = useFmt();
  const isEmployee = "hiredRound" in person;
  return (
    <Modal title={person.name} onClose={onClose}>
      <div className="col gap-16">
        <div className="small muted">
          {f.L(ROLE_LABEL[person.role])} · {f.L(SENIORITY_LABEL[person.seniority])} · {person.cv.age} {f.tx("years old", "anni")}
        </div>
        <Card title={f.tx("Education", "Formazione")} icon="GraduationCap">
          {person.cv.education.degree} {person.cv.education.field} · {person.cv.education.university} ({person.cv.education.graduated})
        </Card>
        <Card title={f.tx("Experience", "Esperienza")} icon="Briefcase">
          {person.cv.experiences.map((e, i) => (
            <div key={i} className="list-row">
              <div className="grow">
                <div style={{ fontWeight: 600 }}>
                  {e.role} · {e.company}
                </div>
                <div className="small muted">{e.description}</div>
              </div>
              <span className="small faint">
                {e.yearsWorked} {f.tx("yrs", "anni")}
              </span>
            </div>
          ))}
        </Card>
        {person.cv.skills.length > 0 && (
          <Card title={f.tx("Skills", "Competenze")} icon="Wrench">
            <div className="row wrap gap-4">
              {person.cv.skills.map((s) => (
                <span key={s.name} className="chip">
                  {s.name} {"●".repeat(s.level)}
                  {"○".repeat(Math.max(0, 5 - s.level))}
                </span>
              ))}
            </div>
          </Card>
        )}
        {person.cv.achievements.length > 0 && (
          <Card title={f.tx("Achievements", "Risultati")} icon="Award">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {person.cv.achievements.map((a) => (
                <li key={a} className="small">
                  {a}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card title={f.tx("Skills profile", "Profilo di competenze")} icon="BarChart3">
          <StatBars stats={person.stats} />
        </Card>
        {person.hiddenBonuses.length > 0 && (
          <Callout tone={isEmployee ? "good" : "info"} icon="Sparkles">
            {isEmployee ? person.hiddenBonuses.map((b) => b.description).join(" · ") : f.tx("This CV hints at a special talent that will be revealed after hiring.", "Questo CV fa intuire un talento speciale che verrà rivelato dopo l'assunzione.")}
          </Callout>
        )}
      </div>
    </Modal>
  );
}

function OfferModal({ c, cand, onClose }: { c: Company; cand: Candidate; onClose: () => void }) {
  const f = useFmt();
  const game = useGame();
  const update = useStore((s) => s.updateDraft);
  const draft = useDraft(c);
  const existing = draft?.offers.find((o) => o.candidateId === cand.id);
  const ask = askSalary(game, c, cand);
  const exp = expectedEquity(c, cand);
  const [salary, setSalary] = useState(existing?.salary ?? ask);
  const [equity, setEquity] = useState(existing?.equityPct ?? Math.round(exp * 10_000) / 10_000);
  const last = lastSnapshot(c);
  const runway = last ? last.runway : 99;
  const ev = useMemo(() => evaluateOffer(game, c, cand, { candidateId: cand.id, salary, equityPct: equity }, Math.min(runway, 99)), [game, c, cand, salary, equity, runway]);
  const margin = ev.score - ev.threshold;
  const likelihood = margin > 0.06 ? { t: f.tx("Very likely to accept", "Molto probabile che accetti"), tone: "good" as const } : margin > 0 ? { t: f.tx("Likely, if nobody offers more", "Probabile, se nessuno offre di più"), tone: "good" as const } : margin > -0.08 ? { t: f.tx("Uncertain: may ask for more", "Incerto: potrebbe chiedere di più"), tone: "warn" as const } : { t: f.tx("Unlikely to accept", "Improbabile che accetti"), tone: "bad" as const };
  const own = foundersOwnership(c);
  const ownAfter = own * (1 - equity);
  const save = () => {
    update(c.id, (d) => ({ ...d, offers: [...d.offers.filter((o) => o.candidateId !== cand.id), { candidateId: cand.id, salary, equityPct: equity }] }));
    onClose();
  };
  return (
    <Modal
      title={`${f.tx("Offer to", "Offerta a")} ${cand.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {f.tx("Cancel", "Annulla")}
          </button>
          <button className="btn primary" onClick={save}>
            <Icon name="Check" size={16} />
            {f.tx("Confirm offer", "Conferma offerta")}
          </button>
        </>
      }
    >
      <div className="col gap-16">
        <SliderField
          label={f.tx("Annual salary (total cost)", "Stipendio annuo (costo totale)")}
          value={salary}
          min={Math.round((ask * 0.7) / 500) * 500}
          max={Math.round((ask * 1.6) / 500) * 500}
          step={500}
          onChange={setSalary}
          format={(v) => f.money(v, { compact: false })}
          hint={`${f.tx("Asks", "Chiede")} ${f.money(ask, { compact: false })} · ${f.money(salary / 12, { compact: false })}/${f.tx("month", "mese")}`}
        />
        <SliderField
          label={f.tx("Equity (options, 4-year vesting, 1-year cliff)", "Equity (opzioni, vesting 4 anni, cliff 1 anno)")}
          value={equity * 100}
          min={0}
          max={Math.max(1, Math.ceil(exp * 400 * 10) / 10)}
          step={0.05}
          onChange={(v) => setEquity(Math.round(v * 100) / 10_000)}
          format={(v) => `${f.num(v, 2)}%`}
          concept="vesting"
          hint={`${f.tx("Typical for this profile and stage", "Tipico per questo profilo e fase")}: ${f.pct(exp, 2)}`}
        />
        <Card className="flat">
          <div className="kv">
            <span>{f.tx("Cost to founders", "Costo per i fondatori")}</span>
            <span>{f.pct(equity, 2)} {f.tx("of the company", "dell'azienda")}</span>
            <span>{f.tx("Value at current valuation", "Valore alla valutazione attuale")}</span>
            <span>{f.money(c.valuation * equity)}</span>
            <span>{f.tx("Founders' ownership", "Quota dei fondatori")}</span>
            <span>
              {f.pct(own, 1)} → <span className="warn">{f.pct(ownAfter, 1)}</span>
            </span>
          </div>
        </Card>
        <Callout tone={likelihood.tone} icon="Users">
          <b>{likelihood.t}</b>
          {ev.reasons.length > 0 && margin < 0.06 && <div className="small mt-8">“{f.L(ev.reasons[0].text)}”</div>}
          <div className="small faint mt-8">{f.tx("Estimate without competing offers from other teams.", "Stima senza offerte concorrenti di altri team.")}</div>
        </Callout>
      </div>
    </Modal>
  );
}
