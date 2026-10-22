import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LogoArt } from "../../core";
import { glossaryEntry } from "../content/glossary";
import { useFmt } from "../i18n";
import { useStore } from "../store";
import { Icon } from "./Icon";
import { LogoMark } from "./LogoArt";

export function Card({ title, icon, action, children, className = "", onClick, tour }: { title?: ReactNode; icon?: string; action?: ReactNode; children?: ReactNode; className?: string; onClick?: () => void; tour?: string }) {
  return (
    <div className={`card ${className}`} onClick={onClick} data-tour={tour}>
      {(title || action) && (
        <div className="card-head">
          <div className="card-title">
            {icon && <Icon name={icon} size={16} />}
            {title}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, icon, concept, tone, big, delta, deltaGood = true }: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: string;
  concept?: string;
  tone?: "good" | "bad" | "warn" | "accent";
  big?: boolean;
  delta?: number | null;
  deltaGood?: boolean;
}) {
  const f = useFmt();
  const flash = useFlash(typeof value === "string" || typeof value === "number" ? value : null);
  let deltaNode: ReactNode = null;
  if (delta !== undefined && delta !== null && Number.isFinite(delta) && Math.abs(delta) > 0.0005) {
    const up = delta > 0;
    const good = up === deltaGood;
    deltaNode = (
      <span className={good ? "delta-up" : "delta-down"} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
        <Icon name={up ? "ArrowUpRight" : "ArrowDownRight"} size={12} />
        {f.pct(Math.abs(delta), Math.abs(delta) < 0.1 ? 1 : 0)}
      </span>
    );
  }
  return (
    <div className="stat">
      <div className="stat-label">
        {icon && <Icon name={icon} size={13} />}
        <span>{label}</span>
        {concept && <InfoTip concept={concept} />}
      </div>
      <div className={`stat-value ${big ? "big" : ""} ${tone ?? ""} ${flash ? "flash" : ""}`}>{value}</div>
      {(sub || deltaNode) && (
        <div className="stat-sub row gap-4">
          {deltaNode}
          {sub}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, disabled }: { value: T; options: Array<{ value: T; label: ReactNode; disabled?: boolean; title?: string }>; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? "on" : ""}
          disabled={disabled || o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SliderField({ label, value, min, max, step, onChange, format, hint, disabled, concept, scale = "linear" }: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  hint?: ReactNode;
  disabled?: boolean;
  concept?: string;
  /** log: for prices spanning orders of magnitude; quad: fine control near zero (budgets). */
  scale?: "linear" | "log" | "quad";
}) {
  const s = step ?? 1;
  const toPos = (v: number) => {
    const x = Math.min(max, Math.max(min, v));
    if (scale === "log") return (Math.log(Math.max(x, min) / min) / Math.log(max / min)) * 1000;
    if (scale === "quad") return Math.sqrt((x - min) / (max - min || 1)) * 1000;
    return x;
  };
  const fromPos = (p: number) => {
    let v: number;
    if (scale === "log") v = min * Math.pow(max / min, p / 1000);
    else if (scale === "quad") v = min + (max - min) * Math.pow(p / 1000, 2);
    else return p;
    const nice = v >= 100_000 ? Math.max(s, 5_000) : v >= 20_000 ? Math.max(s, 1_000) : v >= 2_000 ? Math.max(s, 100) : s;
    return Math.round(v / nice) * nice;
  };
  const nonLinear = scale !== "linear";
  return (
    <div className="field">
      <div className="field-label">
        <span className="row gap-4">
          {label}
          {concept && <InfoTip concept={concept} />}
        </span>
        <span className="num accent">{format(value)}</span>
      </div>
      <input
        type="range"
        min={nonLinear ? 0 : min}
        max={nonLinear ? 1000 : max}
        step={nonLinear ? 1 : s}
        value={toPos(value)}
        disabled={disabled}
        onChange={(e) => onChange(Math.min(max, Math.max(min, fromPos(Number(e.target.value)))))}
        aria-label={typeof label === "string" ? label : undefined}
      />
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className="toggle" style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span>{label}</span>
    </label>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: "accent" | "good" | "warn" | "bad" }) {
  return <span className={`badge ${tone ?? ""}`}>{children}</span>;
}

export function Progress({ value, tone, thin }: { value: number; tone?: "good" | "warn" | "bad"; thin?: boolean }) {
  // Fills from zero on mount and eases to every new value.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className={`progress ${tone ?? ""} ${thin ? "thin" : ""}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${Math.max(0, Math.min(1, shown)) * 100}%` }} />
    </div>
  );
}

/** Adds a short highlight whenever the rendered text changes (after the first render). */
export function useFlash(key: string | number | null | undefined): boolean {
  const [flash, setFlash] = useState(false);
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(id);
  }, [key]);
  return flash;
}

/** A value that flashes when it changes (cash, runway, any headline number). */
export function FlashValue({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const key = typeof children === "string" || typeof children === "number" ? children : null;
  const flash = useFlash(key);
  return (
    <div className={`${className} ${flash ? "flash" : ""}`} style={style}>
      {children}
    </div>
  );
}

export function Callout({ tone = "info", icon, children }: { tone?: "info" | "good" | "warn" | "bad"; icon?: string; children: ReactNode }) {
  const def = { info: "Info", good: "Check", warn: "AlertTriangle", bad: "AlertTriangle" }[tone];
  return (
    <div className={`callout ${tone}`}>
      <Icon name={icon ?? def} size={16} />
      <div className="grow">{children}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Small "i" button that shows a glossary definition on hover/focus and opens the Learn page on click. */
export function InfoTip({ concept, text }: { concept?: string; text?: ReactNode }) {
  const f = useFmt();
  const openLearn = useStore((s) => s.openLearn);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const entry = glossaryEntry(concept);
  if (!entry && !text) return null;
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(window.innerWidth - 340, Math.max(8, r.left - 20));
    const y = r.bottom + 8 + 200 > window.innerHeight ? Math.max(8, r.top - 210) : r.bottom + 8;
    setPos({ x, y });
  };
  return (
    <>
      <button
        ref={ref}
        type="button"
        className="info-dot"
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onFocus={show}
        onBlur={() => setPos(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (entry) openLearn(entry.id);
        }}
        aria-label={entry ? f.L(entry.term) : "info"}
      >
        <Icon name="CircleHelp" size={13} />
      </button>
      {pos &&
        createPortal(
          <div className="popover" style={{ left: pos.x, top: pos.y }}>
            {entry ? (
              <>
                <h4>{f.L(entry.term)}</h4>
                <div className="muted">{f.L(entry.short)}</div>
                {entry.formula && <div className="tiny faint mt-8 num">{entry.formula}</div>}
                <div className="tiny faint mt-8">{f.tx("Click to open the glossary", "Clicca per aprire il glossario")}</div>
              </>
            ) : (
              text
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

export function Logo({ company, size = 40 }: { company: { logo: string; color: string; logoArt?: LogoArt | null; name?: string }; size?: number }) {
  return <LogoMark brand={company} size={size} />;
}

export function Empty({ icon = "Sparkles", children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={28} />
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: Array<{ id: T; label: ReactNode; icon?: string; dot?: boolean }>; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} className={t.id === value ? "on" : ""} onClick={() => onChange(t.id)}>
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
          {t.dot && <span className="dot" />}
        </button>
      ))}
    </div>
  );
}

export function OptionCard({ on, onClick, title, desc, icon, disabled, badge }: { on: boolean; onClick: () => void; title: ReactNode; desc?: ReactNode; icon?: string; disabled?: boolean; badge?: ReactNode }) {
  return (
    <button type="button" className={`option-card ${on ? "on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on}>
      {icon && <Icon name={icon} size={18} className="accent" />}
      <span className="grow">
        <span className="row between">
          <span className="title">{title}</span>
          {badge}
        </span>
        {desc && <span className="desc" style={{ display: "block" }}>{desc}</span>}
      </span>
      {on && <Icon name="Check" size={16} className="accent" />}
    </button>
  );
}

export function NumberInput({ value, onChange, min, max, step, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const [text, setText] = useState(String(Math.round(value)));
  useEffect(() => setText(String(Math.round(value))), [value]);
  return (
    <div className="row gap-4">
      <input
        className="input num"
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={() => {
          let v = Number(text || 0);
          if (min !== undefined) v = Math.max(min, v);
          if (max !== undefined) v = Math.min(max, v);
          if (step) v = Math.round(v / step) * step;
          onChange(v);
          setText(String(v));
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      {suffix && <span className="faint small">{suffix}</span>}
    </div>
  );
}
