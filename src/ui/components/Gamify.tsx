import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CHALLENGE_DEFS,
  SHOWDOWN_DEFS,
  challengeDescription,
  challengeTitle,
  levelFor,
  type ChallengeOutcome,
  type Company,
  type GameState,
  type RoundChallenge,
  type Showdown,
} from "../../core";
import { useFmt, type Fmt } from "../i18n";
import { Avatar, AvatarStack } from "./Avatar";
import { Icon } from "./Icon";
import { Logo, Progress } from "./ui";

/** Animated number that counts up to its value. */
export function CountUp({ to, duration = 900, format }: { to: number; duration?: number; format?: (v: number) => string }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(a + (to - a) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{format ? format(v) : Math.round(v)}</>;
}

/** Falling confetti, pure CSS; mount it only while celebrating. */
export function Confetti({ pieces = 80 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.2 + Math.random() * 1.6,
        color: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9", "#ffd166"][i % 7],
        size: 6 + Math.random() * 7,
        rot: Math.random() * 360,
      })),
    [pieces],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {items.map((p, i) => (
        <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, background: p.color, width: p.size, height: p.size * 0.6, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}

export function LevelChip({ xp, size = "sm" }: { xp: number; size?: "sm" | "md" }) {
  const f = useFmt();
  const lv = levelFor(xp);
  return (
    <span className={`level-chip ${size}`} title={`${lv.xp} XP`}>
      <Icon name="Star" size={size === "sm" ? 11 : 13} />
      {f.tx("Lv", "Liv")} {lv.level} · {f.L(lv.title)}
    </span>
  );
}

/** XP bar with level, title and progress to the next level. */
export function XpBar({ company, compact }: { company: Pick<Company, "xp" | "cups">; compact?: boolean }) {
  const f = useFmt();
  const lv = levelFor(company.xp);
  return (
    <div className={`xp-bar ${compact ? "compact" : ""}`} data-tour="xp">
      <div className="row between" style={{ marginBottom: 4 }}>
        <span className="row gap-4 small" style={{ fontWeight: 650 }}>
          <Icon name="Star" size={13} className="warn" />
          {f.tx("Level", "Livello")} {lv.level}
          {!compact && <span className="muted" style={{ fontWeight: 500 }}>· {f.L(lv.title)}</span>}
        </span>
        <span className="tiny faint num">
          {lv.xp} XP{lv.nextAt !== null ? ` / ${lv.nextAt}` : ""}
          {company.cups > 0 && (
            <span className="warn" style={{ marginLeft: 6 }}>
              <Icon name="Trophy" size={11} /> {company.cups}
            </span>
          )}
        </span>
      </div>
      <div className="xp-track">
        <div className="xp-fill" style={{ width: `${Math.round(lv.progress * 100)}%` }} />
      </div>
    </div>
  );
}

export function tierLabel(f: Fmt, tier: RoundChallenge["tier"]): string {
  return tier === "easy" ? f.tx("easy", "facile") : tier === "medium" ? f.tx("medium", "media") : f.tx("hard", "difficile");
}

/** One challenge with its outcome (ticked, failed, not applicable) or live state. */
export function ChallengeRow({ challenge, outcome, index = 0, animate }: { challenge: Pick<RoundChallenge, "kind" | "target" | "tier" | "xp">; outcome?: ChallengeOutcome | null; index?: number; animate?: boolean }) {
  const f = useFmt();
  const def = CHALLENGE_DEFS[challenge.kind];
  const state = outcome ? (!outcome.applicable ? "na" : outcome.completed ? "done" : "missed") : "open";
  return (
    <div className={`challenge-row ${state} ${animate ? "reveal" : ""}`} style={animate ? { animationDelay: `${0.15 + index * 0.18}s` } : undefined}>
      <span className={`challenge-icon ${challenge.tier}`}>
        <Icon name={state === "done" ? "Check" : state === "missed" ? "X" : def.icon} size={16} />
      </span>
      <div className="grow">
        <div className="row between wrap gap-4">
          <span style={{ fontWeight: 600 }}>{f.L(challengeTitle(challenge))}</span>
          <span className="row gap-4">
            <span className={`chip tier-${challenge.tier}`}>{tierLabel(f, challenge.tier)}</span>
            <span className={`chip xp ${state === "done" ? "good" : ""}`}>+{challenge.xp} XP</span>
          </span>
        </div>
        <div className="small muted">{f.L(challengeDescription(challenge))}</div>
        {outcome && outcome.applicable && !outcome.completed && (
          <div className="row gap-8 mt-8">
            <div className="grow">
              <Progress value={outcome.progress} thin tone={outcome.progress >= 0.7 ? "warn" : "bad"} />
            </div>
            <span className="tiny faint num">{Math.round(outcome.progress * 100)}%</span>
          </div>
        )}
        {outcome && !outcome.applicable && <div className="tiny faint mt-8">{f.tx("Did not apply to your company this round.", "Non si applicava alla tua azienda in questo round.")}</div>}
      </div>
    </div>
  );
}

export function showdownValueLabel(f: Fmt, kind: Showdown["kind"], v: number): string {
  const def = SHOWDOWN_DEFS[kind];
  switch (def.format) {
    case "pct":
      return f.pct(v, 1);
    case "money":
      return f.money(v);
    case "months":
      return f.months(v);
    case "points":
      return `${v >= 0 ? "+" : ""}${f.num(v * (kind === "brandBattle" ? 100 : 1), 1)}`;
    default:
      return f.num(v);
  }
}

/** The podium of a resolved showdown (or the announcement of an open one). */
export function ShowdownPanel({ showdown, game, highlight, animate }: { showdown: Showdown; game: GameState; highlight?: string | null; animate?: boolean }) {
  const f = useFmt();
  const def = SHOWDOWN_DEFS[showdown.kind];
  const byId = (id: string) => game.companies.find((c) => c.id === id);
  if (!showdown.resolved) {
    return (
      <div className="showdown-open">
        <span className="showdown-icon">
          <Icon name={def.icon} size={22} />
        </span>
        <div className="grow">
          <div style={{ fontWeight: 650 }}>{f.L(def.title)}</div>
          <div className="small muted">{f.L(def.description)}</div>
          <div className="tiny faint mt-8">
            <Icon name="Trophy" size={11} /> {f.tx("Winner: a cup and +150 XP · 2nd +60 · 3rd +30", "Vincitore: una coppa e +150 XP · 2° +60 · 3° +30")}
          </div>
        </div>
      </div>
    );
  }
  const top = showdown.results.slice(0, 3);
  const mine = highlight ? showdown.results.find((r) => r.companyId === highlight) : null;
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="col gap-12">
      <div className="row gap-8">
        <Icon name={def.icon} size={16} className="accent" />
        <span style={{ fontWeight: 650 }}>{f.L(def.title)}</span>
        <span className="small faint">· {f.L(def.description)}</span>
      </div>
      <div className={`podium ${animate ? "animate" : ""}`}>
        {order.map((r) => {
          const c = byId(r.companyId);
          if (!c) return null;
          const place = r.rank;
          return (
            <div key={r.companyId} className={`podium-col place-${place} ${c.id === highlight ? "me" : ""}`}>
              <div className="podium-team">
                <Logo company={c} size={34} />
                <div className="small" style={{ fontWeight: 650, textAlign: "center", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                </div>
                <div className="tiny faint num">{showdownValueLabel(f, showdown.kind, r.value)}</div>
              </div>
              <div className="podium-block">
                <span className="podium-rank">{place === 1 ? <Icon name="Trophy" size={18} /> : place}</span>
                {r.xp > 0 && <span className="tiny">+{r.xp} XP</span>}
              </div>
            </div>
          );
        })}
      </div>
      {mine && mine.rank > 3 && (
        <div className="small muted center">
          {f.tx(`You finished ${mine.rank} of ${showdown.results.length}`, `Siete arrivati ${mine.rank} su ${showdown.results.length}`)} · {showdownValueLabel(f, showdown.kind, mine.value)}
        </div>
      )}
    </div>
  );
}

/** Founders of a company with avatars, names and archetype labels. */
export function FounderStrip({ company, size = 30, names = true }: { company: Pick<Company, "founders">; size?: number; names?: boolean }) {
  const active = company.founders.filter((x) => x.active);
  if (!names) return <AvatarStack founders={company.founders} size={size} />;
  return (
    <span className="row wrap gap-8">
      {active.map((fd) => (
        <span key={fd.id} className="row gap-4 small">
          <Avatar avatar={fd.avatar} name={fd.name} size={size} />
          <span className="muted">{fd.name}</span>
        </span>
      ))}
    </span>
  );
}

/** Highlighted banner used for level-ups and cups. */
export function Banner({ icon, tone = "accent", children }: { icon: string; tone?: "accent" | "good" | "warn"; children: ReactNode }) {
  return (
    <div className={`banner ${tone} reveal`}>
      <span className="banner-icon">
        <Icon name={icon} size={22} />
      </span>
      <div className="grow">{children}</div>
    </div>
  );
}
