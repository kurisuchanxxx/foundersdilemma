import { useMemo, useState } from "react";
import {
  ARCHETYPES,
  ARCHETYPE_IDS,
  EXTRA_FOUNDER_WEIGHT,
  MAX_FOUNDERS,
  SCORING_LABEL,
  SECTORS,
  SECTOR_IDS,
  defaultConfig,
  randomSeedLabel,
  totalMonths,
  type Archetype,
  type CompanySetup,
  type GameConfig,
  type SectorId,
} from "../../core";
import { COLORS, LOGOS } from "../../core/engine/setup";
import { Avatar, AvatarBuilder, AvatarStack } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { LogoStudio } from "../components/LogoArt";
import { Badge, Card, Logo, OptionCard, Progress, Segmented, SliderField, Toggle } from "../components/ui";
import { useFmt } from "../i18n";
import { useStore } from "../store";

const DEFAULT_NAMES = ["Aurora Labs", "Brioche Tech", "Cometa", "Dinamo", "Eureka", "Faro", "Girasole", "Halo", "Iride", "Jolly", "Kite", "Lampo"];

function newTeam(i: number): CompanySetup {
  const sector = SECTOR_IDS[i % SECTOR_IDS.length];
  return {
    name: DEFAULT_NAMES[i % DEFAULT_NAMES.length],
    productName: "",
    sector,
    logo: LOGOS[(i * 7) % LOGOS.length],
    color: COLORS[i % COLORS.length],
    logoArt: null,
    riskProfile: "medium",
    founders: [{ name: "", archetype: ARCHETYPE_IDS[i % ARCHETYPE_IDS.length], avatar: null }],
    equitySplit: 0.5,
    founderVesting: true,
    teamMembers: [],
    isBot: false,
  };
}

export function Setup() {
  const f = useFmt();
  const goHome = useStore((s) => s.goHome);
  const newGame = useStore((s) => s.newGame);
  const [config, setConfig] = useState<GameConfig>(() => defaultConfig());
  const [humans, setHumans] = useState(1);
  const [bots, setBots] = useState(3);
  const [teams, setTeams] = useState<CompanySetup[]>(() => Array.from({ length: 12 }, (_, i) => newTeam(i)));
  const [step, setStep] = useState(0);
  const [avatarFor, setAvatarFor] = useState<number | null>(null);

  const maxTotal = 12;
  const setMode = (mode: GameConfig["mode"]) => {
    setConfig({ ...config, mode });
    if (mode === "solo") {
      setHumans(1);
      setBots(Math.max(bots, 1));
    } else if (humans < 2) {
      setHumans(mode === "classroom" ? 6 : 3);
      setBots(mode === "classroom" ? 0 : Math.min(bots, 2));
    }
  };
  const steps = 1 + humans + 1;
  const isTeamStep = step >= 1 && step <= humans;
  const team = isTeamStep ? teams[step - 1] : null;
  const updateTeam = (patch: Partial<CompanySetup>) => {
    setTeams(teams.map((t, i) => (i === step - 1 ? { ...t, ...patch } : t)));
  };
  const usedNames = useMemo(() => new Set(teams.slice(0, humans).map((t) => t.name.trim().toLowerCase())), [teams, humans]);
  const nameClash = team ? teams.slice(0, humans).filter((t) => t.name.trim().toLowerCase() === team.name.trim().toLowerCase()).length > 1 : false;

  const start = () => {
    const setups = teams.slice(0, humans).map((t, i) => ({
      ...t,
      name: t.name.trim() || `${f.tx("Team", "Team")} ${i + 1}`,
      productName: t.productName.trim() || t.name.trim(),
      founders: t.founders.map((fd, k) => ({ ...fd, name: fd.name.trim() || `${f.tx("Founder", "Fondatore")} ${k + 1}` })),
    }));
    newGame(config, setups, bots);
  };

  const months = totalMonths(config);

  return (
    <div className="wizard">
      <div className="wizard-inner">
        <div className="row between" style={{ marginBottom: 20 }}>
          <button className="btn ghost" onClick={() => (step === 0 ? goHome() : setStep(step - 1))}>
            <Icon name="ChevronLeft" size={16} />
            {step === 0 ? f.tx("Home", "Home") : f.tx("Back", "Indietro")}
          </button>
          <div className="small faint">
            {f.tx("Step", "Passo")} {step + 1} / {steps}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <Progress value={(step + 1) / steps} thin />
        </div>

        <div key={step} className="wizard-step">
        {step === 0 && (
          <div className="stack">
            <div>
              <h1>{f.tx("New game", "Nuova partita")}</h1>
              <p className="muted mt-8">{f.tx("Choose how you will play and the rules of the session.", "Scegli come giocare e le regole della sessione.")}</p>
            </div>
            <Card title={f.tx("Game mode", "Modalità di gioco")} icon="Users">
              <div className="grid cols-3" style={{ gap: 10 }}>
                <OptionCard
                  on={config.mode === "solo"}
                  onClick={() => setMode("solo")}
                  icon="UserRound"
                  title={f.tx("Solo vs bots", "Solo contro bot")}
                  desc={f.tx("One team against AI competitors. Ideal for individual practice.", "Un team contro concorrenti AI. Ideale per esercitarsi da soli.")}
                />
                <OptionCard
                  on={config.mode === "hotseat"}
                  onClick={() => setMode("hotseat")}
                  icon="Users"
                  title={f.tx("Hot-seat (one computer)", "Hot-seat (un computer)")}
                  desc={f.tx("Teams take turns on the same computer or projector; the instructor advances the rounds.", "I team si alternano sullo stesso computer o proiettore; il docente avanza i round.")}
                />
                <OptionCard
                  on={config.mode === "classroom"}
                  onClick={() => setMode("classroom")}
                  icon="School"
                  title={f.tx("Classroom (files)", "Classe (file)")}
                  desc={f.tx("Each team plays on its own laptop and exchanges decision files with the instructor. No server needed.", "Ogni team gioca sul proprio portatile e scambia file di decisione con il docente. Nessun server necessario.")}
                />
              </div>
              <div className="grid cols-2 mt-16">
                <SliderField
                  label={f.tx("Human teams", "Team umani")}
                  value={humans}
                  min={1}
                  max={config.mode === "solo" ? 1 : maxTotal}
                  disabled={config.mode === "solo"}
                  onChange={(v) => {
                    setHumans(v);
                    setBots(Math.min(bots, maxTotal - v));
                  }}
                  format={(v) => String(v)}
                />
                <SliderField
                  label={f.tx("Bot competitors", "Concorrenti bot")}
                  value={bots}
                  min={config.mode === "solo" ? 1 : 0}
                  max={Math.max(config.mode === "solo" ? 1 : 0, Math.min(8, maxTotal - humans))}
                  onChange={setBots}
                  format={(v) => String(v)}
                  hint={f.tx("Bots play three styles: lean, steady and blitz.", "I bot giocano tre stili: lean, steady e blitz.")}
                />
              </div>
            </Card>

            <Card title={f.tx("Session", "Sessione")} icon="Settings2">
              <div className="grid cols-2">
                <div className="field">
                  <div className="field-label">{f.tx("Session name (optional)", "Nome della sessione (opzionale)")}</div>
                  <input className="input" value={config.sessionName} placeholder={f.tx("e.g. Startup Venturing 2026 - Class A", "es. Startup Venturing 2026 - Classe A")} onChange={(e) => setConfig({ ...config, sessionName: e.target.value })} />
                </div>
                <div className="field">
                  <div className="field-label">
                    {f.tx("Seed", "Seed")}
                    <span className="faint small">{f.tx("same seed = same events", "stesso seed = stessi eventi")}</span>
                  </div>
                  <div className="row">
                    <input className="input" value={config.seed} onChange={(e) => setConfig({ ...config, seed: e.target.value.toUpperCase() })} />
                    <button className="btn" onClick={() => setConfig({ ...config, seed: randomSeedLabel() })} aria-label="Random seed">
                      <Icon name="RefreshCcw" size={14} />
                    </button>
                  </div>
                </div>
                <SliderField
                  label={f.tx("Rounds", "Round")}
                  value={config.totalRounds}
                  min={4}
                  max={14}
                  onChange={(v) => setConfig({ ...config, totalRounds: v })}
                  format={(v) => `${v}`}
                  hint={f.tx(`About ${Math.round(months / 12 * 10) / 10} years of company life.`, `Circa ${Math.round((months / 12) * 10) / 10} anni di vita dell'azienda.`)}
                />
                <div className="field">
                  <div className="field-label">{f.tx("Round length", "Durata dei round")}</div>
                  <Segmented
                    value={config.periodPlan}
                    options={[
                      { value: "startup", label: f.tx("4 quarters, then semesters", "4 trimestri, poi semestri") },
                      { value: "semiannual", label: f.tx("Semesters", "Semestri") },
                      { value: "quarterly", label: f.tx("Quarters", "Trimestri") },
                    ]}
                    onChange={(v) => setConfig({ ...config, periodPlan: v })}
                  />
                </div>
              </div>
            </Card>

            <Card title={f.tx("Rules", "Regole")} icon="Scale">
              <div className="col gap-16">
                <div className="field">
                  <div className="field-label">{f.tx("Complexity", "Complessità")}</div>
                  <div className="grid cols-3" style={{ gap: 10 }}>
                    <OptionCard on={config.complexity === "essential"} onClick={() => setConfig({ ...config, complexity: "essential" })} title={f.tx("Essential", "Essenziale")} desc={f.tx("No dilemmas, no tech debt, instant hiring. For a first 90-minute session.", "Niente dilemmi, niente debito tecnico, assunzioni immediate. Per una prima sessione di 90 minuti.")} />
                    <OptionCard on={config.complexity === "standard"} onClick={() => setConfig({ ...config, complexity: "standard" })} title={f.tx("Standard", "Standard")} desc={f.tx("All systems: dilemmas, hiring auctions, tech debt.", "Tutti i sistemi: dilemmi, aste per le assunzioni, debito tecnico.")} badge={<Badge tone="accent">{f.tx("recommended", "consigliato")}</Badge>} />
                    <OptionCard on={config.complexity === "advanced"} onClick={() => setConfig({ ...config, complexity: "advanced" })} title={f.tx("Advanced", "Avanzata")} desc={f.tx("Standard plus an exit waterfall simulator: preference stack and payout of every shareholder at any exit value. For master's and finance courses.", "Standard più un simulatore del waterfall di uscita: stack delle preferenze e incasso di ogni socio a qualsiasi valore di exit. Per magistrali e corsi di finanza.")} />
                  </div>
                </div>
                <div className="grid cols-2">
                  <div className="field">
                    <div className="field-label">{f.tx("Difficulty", "Difficoltà")}</div>
                    <Segmented
                      value={config.difficulty}
                      options={[
                        { value: "forgiving", label: f.tx("Forgiving", "Indulgente") },
                        { value: "standard", label: f.tx("Standard", "Standard") },
                        { value: "hardcore", label: f.tx("Realistic", "Realistica") },
                      ]}
                      onChange={(v) => setConfig({ ...config, difficulty: v })}
                    />
                    <div className="field-hint">
                      {config.difficulty === "forgiving"
                        ? f.tx("Up to 3 rescue rounds when cash runs out.", "Fino a 3 round di salvataggio quando finisce la cassa.")
                        : config.difficulty === "standard"
                          ? f.tx("One punitive rescue round, then bankruptcy.", "Un round di salvataggio punitivo, poi fallimento.")
                          : f.tx("Running out of cash means bankruptcy.", "Finire la cassa significa fallire.")}
                    </div>
                  </div>
                  <div className="field">
                    <div className="field-label">{f.tx("Currency", "Valuta")}</div>
                    <Segmented value={config.currency} options={[{ value: "EUR", label: "€ EUR" }, { value: "USD", label: "$ USD" }]} onChange={(v) => setConfig({ ...config, currency: v })} />
                  </div>
                </div>
                <div className="field">
                  <div className="field-label">{f.tx("How the winner is decided", "Come si decide il vincitore")}</div>
                  <div className="grid cols-3" style={{ gap: 10 }}>
                    {(["founderWealth", "valuation", "balanced"] as const).map((m) => (
                      <OptionCard key={m} on={config.scoring === m} onClick={() => setConfig({ ...config, scoring: m })} title={f.L(SCORING_LABEL[m].name)} desc={f.L(SCORING_LABEL[m].description)} />
                    ))}
                  </div>
                </div>
                {config.mode !== "solo" && (
                  <div className="grid cols-2">
                    <div className="field">
                      <div className="field-label">{f.tx("Suggested time per round", "Tempo suggerito per round")}</div>
                      <Segmented
                        value={config.turnTimerMinutes ?? 0}
                        options={[0, 10, 15, 20, 30, 45].map((m) => ({ value: m, label: m === 0 ? f.tx("None", "Nessuno") : `${m}′` }))}
                        onChange={(v) => setConfig({ ...config, turnTimerMinutes: v === 0 ? null : v })}
                      />
                    </div>
                    <div className="field">
                      <div className="field-label">{f.tx("Instructor PIN (optional)", "PIN del docente (opzionale)")}</div>
                      <input
                        className="input"
                        inputMode="numeric"
                        maxLength={6}
                        value={config.instructorPin ?? ""}
                        placeholder="••••"
                        onChange={(e) => setConfig({ ...config, instructorPin: e.target.value.replace(/\D/g, "") || null })}
                      />
                      <div className="field-hint">{f.tx("Protects the instructor console from curious students.", "Protegge la console del docente dagli studenti curiosi.")}</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn primary lg" onClick={() => setStep(1)}>
                {f.tx("Configure teams", "Configura i team")}
                <Icon name="ChevronRight" size={16} />
              </button>
            </div>
          </div>
        )}

        {isTeamStep && team && (
          <div className="stack">
            <div className="row gap-12">
              <Logo company={team} size={52} />
              <div className="grow">
                <h1>{humans > 1 ? `${f.tx("Team", "Team")} ${step}` : f.tx("Your startup", "La tua startup")}</h1>
                <p className="muted">{f.tx("Founding decisions you cannot change later.", "Decisioni fondative che non potrai cambiare dopo.")}</p>
              </div>
              <AvatarStack founders={team.founders.map((fd, k) => ({ name: fd.name || `${f.tx("Founder", "Fondatore")} ${k + 1}`, avatar: fd.avatar }))} size={36} />
            </div>
            <Card title={f.tx("Company", "Azienda")} icon="Building2">
              <div className="grid cols-2">
                <div className="field">
                  <div className="field-label">{f.tx("Company name", "Nome dell'azienda")}</div>
                  <input className="input" value={team.name} onChange={(e) => updateTeam({ name: e.target.value })} />
                  {nameClash && <div className="field-hint bad">{f.tx("Another team uses this name.", "Un altro team usa questo nome.")}</div>}
                </div>
                <div className="field">
                  <div className="field-label">{f.tx("Product name", "Nome del prodotto")}</div>
                  <input className="input" value={team.productName} placeholder={team.name} onChange={(e) => updateTeam({ productName: e.target.value })} />
                </div>
                {config.mode !== "solo" && (
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <div className="field-label">{f.tx("Other team members (optional)", "Altri membri del team (opzionale)")}</div>
                    <input
                      className="input"
                      value={team.teamMembers.join(", ")}
                      placeholder={f.tx("Students who are not playing a founder, separated by commas (used in reports)", "Studenti che non impersonano un fondatore, separati da virgole (usati nei report)")}
                      onChange={(e) => updateTeam({ teamMembers: e.target.value.split(",").map((x) => x.trimStart()) })}
                    />
                  </div>
                )}
              </div>
            </Card>

            <Card title={f.tx("Sector", "Settore")} icon="Compass">
              <div className="grid cols-4" style={{ gap: 10 }}>
                {SECTOR_IDS.map((id) => {
                  const s = SECTORS[id];
                  return (
                    <OptionCard key={id} on={team.sector === id} onClick={() => updateTeam({ sector: id as SectorId })} icon={s.icon} title={f.L(s.name)} desc={f.L(s.tagline)} />
                  );
                })}
              </div>
              <SectorDetails sector={team.sector} />
            </Card>

            <Card
              title={f.tx("Founders", "Fondatori")}
              icon="UsersRound"
              action={
                <span className="small faint">
                  {team.founders.length} / {MAX_FOUNDERS}
                </span>
              }
            >
              <div className="col gap-16">
                <p className="small muted">
                  {f.tx(
                    "Each student can play a founder: give them a name, an archetype and an avatar (cartoon or photo). Teams of one to four.",
                    "Ogni studente può impersonare un fondatore: dategli un nome, un archetipo e un avatar (cartoon o foto). Team da uno a quattro.",
                  )}
                </p>
                <div className="grid cols-2" style={{ gap: 12 }}>
                  {team.founders.map((fd, k) => {
                    const label = k === 0 ? f.tx("Founder", "Fondatore") : `${f.tx("Co-founder", "Co-fondatore")} ${k + 1}`;
                    const display = fd.name || `${f.tx("Founder", "Fondatore")} ${k + 1}`;
                    return (
                      <div key={k} className="founder-card col gap-12">
                        <div className="row gap-12 top">
                          <button type="button" className="avatar-btn" onClick={() => setAvatarFor(k)} aria-label={`${f.tx("Edit avatar of", "Modifica l'avatar di")} ${display}`} title={f.tx("Avatar or photo", "Avatar o foto")}>
                            <Avatar avatar={fd.avatar ?? null} name={display} size={60} />
                            <span className="avatar-edit">
                              <Icon name="Camera" size={12} />
                            </span>
                          </button>
                          <div className="grow col gap-4">
                            <div className="row between">
                              <h3>{label}</h3>
                              {k > 0 && (
                                <button className="btn sm ghost" onClick={() => updateTeam({ founders: team.founders.filter((_, j) => j !== k) })} aria-label={f.tx("Remove", "Rimuovi")}>
                                  <Icon name="X" size={14} />
                                </button>
                              )}
                            </div>
                            <input
                              className="input"
                              placeholder={f.tx("Name", "Nome")}
                              value={fd.name}
                              onChange={(e) => updateTeam({ founders: team.founders.map((x, j) => (j === k ? { ...x, name: e.target.value } : x)) })}
                            />
                            <button type="button" className="btn sm ghost" style={{ alignSelf: "flex-start" }} onClick={() => setAvatarFor(k)}>
                              <Icon name="Camera" size={13} />
                              {fd.avatar?.kind === "photo" ? f.tx("Change photo", "Cambia foto") : f.tx("Avatar or photo", "Avatar o foto")}
                            </button>
                          </div>
                        </div>
                        <div className="grid cols-3" style={{ gap: 6, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                          {ARCHETYPE_IDS.map((a) => (
                            <OptionCard
                              key={a}
                              on={fd.archetype === a}
                              onClick={() => updateTeam({ founders: team.founders.map((x, j) => (j === k ? { ...x, archetype: a as Archetype } : x)) })}
                              icon={ARCHETYPES[a].icon}
                              title={<span className="small">{f.L(ARCHETYPES[a].name)}</span>}
                            />
                          ))}
                        </div>
                        <ArchetypeMults archetype={fd.archetype} />
                      </div>
                    );
                  })}
                </div>
                {team.founders.length < MAX_FOUNDERS && (
                  <button
                    className="btn"
                    onClick={() => {
                      const used = new Set(team.founders.map((x) => x.archetype));
                      const next = ARCHETYPE_IDS.find((a) => !used.has(a)) ?? "hustler";
                      updateTeam({ founders: [...team.founders, { name: "", archetype: next, avatar: null }] });
                    }}
                  >
                    <Icon name="UserPlus" size={16} />
                    {team.founders.length === 1 ? f.tx("Add a co-founder", "Aggiungi un co-fondatore") : f.tx("Add another founder", "Aggiungi un altro fondatore")}
                  </button>
                )}
                {team.founders.length >= 3 && (
                  <p className="small faint">
                    {f.tx(
                      `Equity is split equally between ${team.founders.length} founders. The third and fourth founder add ${Math.round(EXTRA_FOUNDER_WEIGHT * 100)}% of a founder's capacity each (coordination takes time), so larger teams are not automatically stronger.`,
                      `Le quote sono divise in parti uguali tra ${team.founders.length} fondatori. Il terzo e il quarto fondatore aggiungono ciascuno il ${Math.round(EXTRA_FOUNDER_WEIGHT * 100)}% della capacità di un fondatore (coordinarsi richiede tempo), quindi i team più grandi non sono automaticamente più forti.`,
                    )}
                  </p>
                )}
                {team.founders.length === 2 && (
                  <SliderField
                    label={f.tx("Equity split between founders", "Divisione delle quote tra i fondatori")}
                    value={Math.round(team.equitySplit * 100)}
                    min={50}
                    max={90}
                    step={5}
                    onChange={(v) => updateTeam({ equitySplit: v / 100 })}
                    format={(v) => `${v}% / ${100 - v}%`}
                    concept="richVsKing"
                    hint={f.tx("Complementary skills give the team the best multipliers of both. Equal splits are quick to agree but often hide future conflicts.", "Competenze complementari danno al team i moltiplicatori migliori di entrambi. Le divisioni alla pari sono facili da concordare ma spesso nascondono conflitti futuri.")}
                  />
                )}
                <div className="row between wrap">
                  <Toggle checked={team.founderVesting} onChange={(v) => updateTeam({ founderVesting: v })} label={f.tx("Founder vesting (4 years, 1-year cliff)", "Vesting dei fondatori (4 anni, cliff di 1 anno)")} />
                  <span className="small faint row gap-4">
                    {f.tx("Protects the company if a founder leaves.", "Protegge l'azienda se un fondatore se ne va.")}
                  </span>
                </div>
              </div>
            </Card>

            <Card title={f.tx("Risk appetite", "Propensione al rischio")} icon="Flame">
              <Segmented
                value={team.riskProfile}
                options={[
                  { value: "low", label: f.tx("Prudent", "Prudente") },
                  { value: "medium", label: f.tx("Balanced", "Bilanciata") },
                  { value: "high", label: f.tx("Bold", "Audace") },
                ]}
                onChange={(v) => updateTeam({ riskProfile: v })}
              />
              <p className="small faint mt-8">{f.tx("Bold companies meet more surprises, good and bad, and get bigger rewards from lucky events.", "Le aziende audaci incontrano più sorprese, belle e brutte, e ottengono premi maggiori dagli eventi fortunati.")}</p>
            </Card>

            <Card title={f.tx("Logo & brand", "Logo e brand")} icon="Palette">
              <p className="small muted" style={{ marginBottom: 12 }}>
                {f.tx("Pick an icon, choose a ready-made mark from the gallery, compose your own from pieces and colours, or upload your logo.", "Scegli un'icona, prendi un marchio pronto dalla galleria, componi il tuo con pezzi e colori, oppure carica il vostro logo.")}
              </p>
              <LogoStudio brand={team} onChange={(p) => updateTeam(p)} />
            </Card>

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn primary lg" disabled={!team.name.trim() || (nameClash && usedNames.size < humans)} onClick={() => setStep(step + 1)}>
                {step < humans ? f.tx("Next team", "Team successivo") : f.tx("Review", "Riepilogo")}
                <Icon name="ChevronRight" size={16} />
              </button>
            </div>
          </div>
        )}

        {step === humans + 1 && (
          <div className="stack">
            <h1>{f.tx("Ready to start", "Pronti a partire")}</h1>
            <Card>
              <div className="kv">
                <span>{f.tx("Mode", "Modalità")}</span>
                <span>{config.mode === "solo" ? f.tx("Solo vs bots", "Solo contro bot") : config.mode === "hotseat" ? "Hot-seat" : f.tx("Classroom (files)", "Classe (file)")}</span>
                <span>{f.tx("Rounds", "Round")}</span>
                <span>
                  {config.totalRounds} ({Math.round((months / 12) * 10) / 10} {f.tx("years", "anni")})
                </span>
                <span>{f.tx("Winner", "Vincitore")}</span>
                <span>{f.L(SCORING_LABEL[config.scoring].name)}</span>
                <span>Seed</span>
                <span>{config.seed}</span>
                <span>{f.tx("Bots", "Bot")}</span>
                <span>{bots}</span>
              </div>
            </Card>
            <div className="grid cols-2">
              {teams.slice(0, humans).map((t, i) => (
                <Card key={i}>
                  <div className="row gap-12">
                    <Logo company={t} size={40} />
                    <div className="grow">
                      <div style={{ fontWeight: 650 }}>{t.name || `Team ${i + 1}`}</div>
                      <div className="small muted">
                        {f.L(SECTORS[t.sector].name)} · {t.founders.map((x) => f.L(ARCHETYPES[x.archetype].name)).join(" + ")}
                      </div>
                    </div>
                    <AvatarStack founders={t.founders.map((fd, k) => ({ name: fd.name || `${f.tx("Founder", "Fondatore")} ${k + 1}`, avatar: fd.avatar }))} size={28} />
                    <button className="btn sm ghost" onClick={() => setStep(i + 1)}>
                      <Icon name="Pencil" size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn primary lg" onClick={start}>
                <Icon name="Rocket" size={18} />
                {f.tx("Start the game", "Inizia la partita")}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
      {avatarFor !== null && team && team.founders[avatarFor] && (
        <AvatarBuilder
          avatar={team.founders[avatarFor].avatar ?? null}
          name={team.founders[avatarFor].name || `${f.tx("Founder", "Fondatore")} ${avatarFor + 1}`}
          onChange={(a) => updateTeam({ founders: team.founders.map((x, j) => (j === avatarFor ? { ...x, avatar: a } : x)) })}
          onClose={() => setAvatarFor(null)}
        />
      )}
    </div>
  );
}

function ArchetypeMults({ archetype }: { archetype: Archetype }) {
  const f = useFmt();
  const a = ARCHETYPES[archetype];
  const m = a.multipliers;
  const items: Array<[string, number]> = [
    ["R&D", m.rnd],
    [f.tx("Mkt", "Mkt"), m.marketing],
    [f.tx("Sales", "Vend."), m.sales],
    ["Ops", m.operations],
    [f.tx("Quality", "Qualità"), m.quality],
    [f.tx("Funding", "Raccolta"), m.fundraising],
  ];
  return (
    <span>
      <span style={{ display: "block", marginBottom: 4 }}>{f.L(a.description)}</span>
      <span className="row wrap gap-4">
        {items.map(([k, v]) => (
          <span key={k} className={`chip ${v > 1 ? "good" : v < 1 ? "bad" : ""}`} style={{ fontSize: 11, padding: "0 6px" }}>
            {k} {f.num(v, 1)}×
          </span>
        ))}
      </span>
    </span>
  );
}

function SectorDetails({ sector }: { sector: SectorId }) {
  const f = useFmt();
  const s = SECTORS[sector];
  return (
    <div className="mt-16 col gap-12">
      <p className="muted">{f.L(s.description)}</p>
      <div className="grid cols-3" style={{ gap: 8 }}>
        {s.traits.map((t, i) => (
          <div key={i} className={`callout ${t.kind === "pro" ? "good" : "warn"}`}>
            <Icon name={t.kind === "pro" ? "Check" : "AlertTriangle"} size={15} />
            <div>
              <div style={{ fontWeight: 600 }}>{f.L(t.title)}</div>
              <div className="small muted">{f.L(t.text)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid cols-4" style={{ gap: 8 }}>
        <MiniFact label={f.tx("Starting cash", "Cassa iniziale")} value={f.money(s.startingCash)} />
        <MiniFact label={f.tx("Typical price", "Prezzo tipico")} value={`${f.money(s.refPrice)} ${f.L(s.priceUnit)}`} />
        <MiniFact label={f.tx("Gross margin", "Margine lordo")} value={f.pct(s.grossMargin)} />
        <MiniFact label={f.tx("Revenue multiple", "Multiplo sui ricavi")} value={`${s.revenueMultiple}× ARR`} />
        <MiniFact label={f.tx("Market size", "Dimensione del mercato")} value={`${f.compact(s.tam)} ${f.tx("customers", "clienti")}`} />
        <MiniFact label={f.tx("MVP effort", "Sforzo per l'MVP")} value={`${s.mvpEffort} ${f.tx("dev points", "punti sviluppo")}`} />
        <MiniFact label={f.tx("Typical monthly churn", "Churn mensile tipico")} value={f.pct(s.baseChurn, 1)} />
        <MiniFact label={f.tx("Competitors (outside the game)", "Concorrenti (fuori dal gioco)")} value={String(s.npcCompetitors)} />
      </div>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flat" style={{ padding: "8px 10px" }}>
      <div className="tiny faint">{label}</div>
      <div className="small" style={{ fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}
