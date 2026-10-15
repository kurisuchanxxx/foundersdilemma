import { useState } from "react";
import { INTERACTION_DEFS, INTERACTION_KINDS, MAX_INTERACTIONS, ROLE_LABEL, SECTORS, SENIORITY_LABEL, relation, standings, type Company, type Decision, type InteractionKind } from "../../core";
import { AvatarStack } from "../components/Avatar";
import { LevelChip } from "../components/Gamify";
import { Icon } from "../components/Icon";
import { Badge, Callout, Card, Logo, Modal } from "../components/ui";
import { useGame } from "../hooks";
import { useFmt } from "../i18n";
import { useStore } from "../store";

function RelationMeter({ value }: { value: number }) {
  const f = useFmt();
  const label = value >= 3 ? f.tx("allies", "alleati") : value > 0 ? f.tx("friendly", "amichevoli") : value <= -3 ? f.tx("feud", "faida") : value < 0 ? f.tx("rivals", "rivali") : f.tx("neutral", "neutrali");
  return (
    <span className="row gap-4 tiny faint" title={`${label} (${value})`}>
      <span className="relation-meter">
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} className={value >= i ? "pos" : value <= -i ? "neg" : ""} />
        ))}
      </span>
      {label}
    </span>
  );
}

/** Decisions tab: what the founders do to (or for) the other teams this round. */
export function NetworkTab({ c, d, set }: { c: Company; d: Decision; set: (p: Partial<Decision>) => void }) {
  const f = useFmt();
  const game = useGame();
  const toast = useStore((s) => s.toast);
  const [poachFor, setPoachFor] = useState<Company | null>(null);
  const others = game.companies.filter((o) => o.id !== c.id && o.status === "active");
  const ranks = new Map(standings(game).map((s) => [s.companyId, s.rank]));
  const picked = d.interactions ?? [];
  const has = (kind: InteractionKind, targetId: string) => picked.some((p) => p.kind === kind && p.targetId === targetId);
  const remove = (kind: InteractionKind, targetId: string) => set({ interactions: picked.filter((p) => !(p.kind === kind && p.targetId === targetId)) });
  const add = (kind: InteractionKind, targetId: string, employeeId: string | null = null) => {
    if (picked.length >= MAX_INTERACTIONS) {
      toast(f.tx(`At most ${MAX_INTERACTIONS} actions per round.`, `Al massimo ${MAX_INTERACTIONS} azioni per round.`), "bad");
      return;
    }
    set({ interactions: [...picked, { kind, targetId, employeeId }] });
  };

  return (
    <div className="stack">
      <Callout tone="info" icon="HeartHandshake">
        {f.tx(
          `Founders talk to each other. Pick up to ${MAX_INTERACTIONS} actions towards other teams this round: cheer them, mentor them, needle them or recruit their people. Everything is public and ends up in the news.`,
          `I fondatori si parlano. Scegli fino a ${MAX_INTERACTIONS} azioni verso gli altri team in questo round: incoraggiali, fai da mentor, punzecchiali o recluta le loro persone. Tutto è pubblico e finisce nelle news.`,
        )}
      </Callout>
      <div className="row between">
        <span className="small muted">
          {picked.length} / {MAX_INTERACTIONS} {f.tx("actions chosen", "azioni scelte")}
        </span>
        {picked.length > 0 && (
          <button className="btn sm ghost" onClick={() => set({ interactions: [] })}>
            <Icon name="X" size={13} />
            {f.tx("Clear", "Azzera")}
          </button>
        )}
      </div>
      {others.length === 0 ? (
        <Callout tone="warn">{f.tx("No other active team to interact with.", "Nessun altro team attivo con cui interagire.")}</Callout>
      ) : (
        <div className="grid cols-2">
          {others.map((o) => {
            const rel = relation(game, c.id, o.id);
            const poach = picked.find((p) => p.kind === "poach" && p.targetId === o.id);
            const poachName = poach?.employeeId ? o.team.find((e) => e.id === poach.employeeId)?.name : null;
            return (
              <div key={o.id} className="interaction-card">
                <div className="row gap-12">
                  <Logo company={o} size={38} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row gap-8 wrap">
                      <b>{o.name}</b>
                      {o.isBot && <Badge>bot</Badge>}
                      <LevelChip xp={o.xp} />
                    </div>
                    <div className="row gap-8 wrap small muted">
                      <span>#{ranks.get(o.id) ?? "-"}</span>
                      <span>{f.L(SECTORS[o.sector].name)}</span>
                      <RelationMeter value={rel} />
                    </div>
                  </div>
                  <AvatarStack founders={o.founders} size={24} />
                </div>
                <div className="actions">
                  {INTERACTION_KINDS.map((k) => {
                    const def = INTERACTION_DEFS[k];
                    const on = has(k, o.id);
                    const disabled = (!on && picked.length >= MAX_INTERACTIONS) || (k === "poach" && o.team.filter((e) => e.candidateId !== "pro_ceo").length === 0);
                    return (
                      <button
                        key={k}
                        type="button"
                        className={`btn sm ${on ? "on" : ""}`}
                        disabled={disabled}
                        title={f.L(def.description)}
                        onClick={() => (on ? remove(k, o.id) : k === "poach" ? setPoachFor(o) : add(k, o.id))}
                      >
                        <Icon name={on ? "Check" : def.icon} size={14} className={on ? "accent" : def.tone === "bad" ? "bad" : def.tone === "warn" ? "warn" : def.tone === "good" ? "good" : "accent"} />
                        {f.L(def.title)}
                      </button>
                    );
                  })}
                </div>
                {poach && (
                  <div className="tiny faint">
                    <Icon name="UserMinus" size={11} /> {poachName ? `${f.tx("Target", "Obiettivo")}: ${poachName}` : f.tx("Target: whoever is easiest to convince", "Obiettivo: chi è più facile da convincere")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Card title={f.tx("How the founder network works", "Come funziona la rete dei fondatori")} icon="Info">
        <div className="grid cols-2" style={{ gap: 10 }}>
          {INTERACTION_KINDS.map((k) => {
            const def = INTERACTION_DEFS[k];
            return (
              <div key={k} className="row gap-12 top">
                <span className={`badge ${def.tone === "bad" ? "bad" : def.tone === "warn" ? "warn" : def.tone === "good" ? "good" : "accent"}`} style={{ marginTop: 2 }}>
                  <Icon name={def.icon} size={12} />
                </span>
                <div className="small">
                  <b>{f.L(def.title)}</b>
                  <div className="muted">{f.L(def.description)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="tiny faint mt-8">{f.tx("Relationships remember what happened: repeated taunts and poaching turn teams into rivals, shout-outs and mentorship into allies.", "Le relazioni ricordano: sfottò e talenti soffiati ripetuti rendono i team rivali, shout-out e mentorship li rendono alleati.")}</p>
      </Card>
      {poachFor && (
        <Modal title={`${f.tx("Who do you want to recruit from", "Chi vuoi reclutare da")} ${poachFor.name}?`} onClose={() => setPoachFor(null)}>
          <div className="col">
            {poachFor.team
              .filter((e) => e.candidateId !== "pro_ceo")
              .map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="option-card"
                  onClick={() => {
                    add("poach", poachFor.id, e.id);
                    setPoachFor(null);
                  }}
                >
                  <Icon name="UserRound" size={16} className="accent" />
                  <span className="grow">
                    <span className="title">{e.name}</span>
                    <span className="desc" style={{ display: "block" }}>
                      {f.L(ROLE_LABEL[e.role])} · {f.L(SENIORITY_LABEL[e.seniority])} · {f.money(e.salary)} → {f.money(Math.round(e.salary * 1.15))}
                    </span>
                  </span>
                </button>
              ))}
            <button
              type="button"
              className="btn"
              onClick={() => {
                add("poach", poachFor.id, null);
                setPoachFor(null);
              }}
            >
              <Icon name="Shuffle" size={14} />
              {f.tx("Let the engine pick someone", "Lascia scegliere al motore")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
