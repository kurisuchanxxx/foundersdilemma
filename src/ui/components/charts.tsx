import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Lightweight SVG charts following the project's dataviz rules: 2px lines, >=8px end markers
// with a surface ring, hairline solid gridlines, a crosshair tooltip, a legend for >=2 series.

export const SERIES_COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.max(200, Math.floor(e.contentRect.width)));
    });
    ro.observe(el);
    setW(Math.max(200, Math.floor(el.getBoundingClientRect().width)));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (max === min) {
    max = min === 0 ? 1 : min * 1.2;
  }
  const range = max - min;
  const raw = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.round(v / step) * step);
  return ticks;
}

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  points: Array<{ x: number; y: number }>;
  /** De-emphasised context series (drawn thin and grey). */
  muted?: boolean;
}

export function LineChart({ series, height = 220, xFormat, yFormat, area, yMin, legend = true, emptyText }: {
  series: LineSeries[];
  height?: number;
  xFormat: (x: number) => string;
  yFormat: (y: number) => string;
  area?: boolean;
  yMin?: number;
  legend?: boolean;
  emptyText?: ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 56, r: 16, t: 10, b: 26 };
  const all = series.flatMap((s) => s.points);
  const xs = Array.from(new Set(all.map((p) => p.x))).sort((a, b) => a - b);
  const ys = all.map((p) => p.y).filter(Number.isFinite);
  const yMinV = Math.min(yMin ?? Infinity, ...ys, 0);
  const yMaxV = Math.max(...ys, yMinV + 1);
  const ticks = useMemo(() => niceTicks(yMinV, yMaxV), [yMinV, yMaxV]);
  if (all.length === 0) return <div className="empty">{emptyText ?? "—"}</div>;
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const xMin = xs[0];
  const xMax = xs[xs.length - 1] === xMin ? xMin + 1 : xs[xs.length - 1];
  const W = width;
  const H = height;
  const sx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const path = (pts: Array<{ x: number; y: number }>) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const xTickEvery = Math.max(1, Math.ceil(xs.length / Math.max(2, Math.floor((W - pad.l) / 70))));
  const ordered = [...series.filter((s) => s.muted), ...series.filter((s) => !s.muted)];
  const hoverX = hover !== null ? xs[hover] : null;

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const x = e.clientX - rect.left + pad.l;
    let best = 0;
    let bestD = Infinity;
    xs.forEach((v, i) => {
      const d = Math.abs(sx(v) - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  const tipRows = hoverX !== null
    ? series
        .map((s) => ({ s, p: s.points.find((p) => p.x === hoverX) }))
        .filter((r) => r.p)
        .sort((a, b) => (b.p!.y ?? 0) - (a.p!.y ?? 0))
        .slice(0, 10)
    : [];

  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={H} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} />
            <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {lo < 0 && hi > 0 && <line className="axis-line" x1={pad.l} x2={W - pad.r} y1={sy(0)} y2={sy(0)} />}
        {xs.map((x, i) =>
          i % xTickEvery === 0 || i === xs.length - 1 ? (
            <text key={x} x={sx(x)} y={H - 6} textAnchor="middle">
              {xFormat(x)}
            </text>
          ) : null,
        )}
        {area &&
          ordered
            .filter((s) => !s.muted && s.points.length > 1)
            .map((s) => (
              <path
                key={`a-${s.id}`}
                d={`${path(s.points)} L${sx(s.points[s.points.length - 1].x)},${sy(Math.max(lo, 0))} L${sx(s.points[0].x)},${sy(Math.max(lo, 0))} Z`}
                fill={s.color}
                opacity={0.1}
              />
            ))}
        {ordered.map((s) => (
          <path
            key={s.id}
            d={path(s.points)}
            fill="none"
            stroke={s.muted ? "var(--muted-series)" : s.color}
            strokeWidth={s.muted ? 1.5 : 2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {ordered
          .filter((s) => !s.muted && s.points.length > 0)
          .map((s) => {
            const p = s.points[s.points.length - 1];
            return <circle key={`e-${s.id}`} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />;
          })}
        {hoverX !== null && (
          <g>
            <line className="axis-line" x1={sx(hoverX)} x2={sx(hoverX)} y1={pad.t} y2={H - pad.b} />
            {tipRows.map(({ s, p }) => (
              <circle key={`h-${s.id}`} cx={sx(p!.x)} cy={sy(p!.y)} r={4} fill={s.muted ? "var(--muted-series)" : s.color} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </g>
        )}
        <rect x={pad.l} y={pad.t} width={Math.max(1, W - pad.l - pad.r)} height={Math.max(1, H - pad.t - pad.b)} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hoverX !== null && tipRows.length > 0 && (
        <div className="chart-tip" style={{ left: Math.min(W - 170, Math.max(0, sx(hoverX) + 12)), top: 8 }}>
          <div className="small faint" style={{ marginBottom: 4 }}>
            {xFormat(hoverX)}
          </div>
          {tipRows.map(({ s, p }) => (
            <div key={s.id} className="row between gap-12">
              <span className="row gap-4">
                <span style={{ width: 8, height: 8, borderRadius: 4, background: s.muted ? "var(--muted-series)" : s.color, display: "inline-block" }} />
                <span className="muted">{s.label}</span>
              </span>
              <span className="num" style={{ fontWeight: 600 }}>
                {yFormat(p!.y)}
              </span>
            </div>
          ))}
        </div>
      )}
      {legend && series.filter((s) => !s.muted).length >= 2 && (
        <div className="legend">
          {series
            .filter((s) => !s.muted)
            .map((s) => (
              <span key={s.id} className="key">
                <span className="swatch" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          {series.some((s) => s.muted) && (
            <span className="key">
              <span className="swatch" style={{ background: "var(--muted-series)" }} />
              …
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

export function Donut({ slices, size = 160, center, format }: { slices: DonutSlice[]; size?: number; center?: ReactNode; format: (v: number) => string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const r = size / 2 - 6;
  const inner = r * 0.62;
  let angle = -Math.PI / 2;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const a0 = angle;
      const a1 = angle + (s.value / total) * Math.PI * 2;
      angle = a1;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const c = size / 2;
      const p = (rad: number, a: number) => `${c + rad * Math.cos(a)},${c + rad * Math.sin(a)}`;
      const full = a1 - a0 >= Math.PI * 2 - 1e-6;
      const d = full
        ? `M${p(r, 0)} A${r},${r} 0 1 1 ${p(r, Math.PI)} A${r},${r} 0 1 1 ${p(r, 0)} M${p(inner, 0)} A${inner},${inner} 0 1 0 ${p(inner, Math.PI)} A${inner},${inner} 0 1 0 ${p(inner, 0)} Z`
        : `M${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} L${p(inner, a1)} A${inner},${inner} 0 ${large} 0 ${p(inner, a0)} Z`;
      return { s, d };
    });
  const hovered = slices.find((s) => s.id === hover);
  return (
    <div className="row gap-16 wrap">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} role="img">
          {arcs.map(({ s, d }) => (
            <path
              key={s.id}
              d={d}
              fill={s.color}
              stroke="var(--surface)"
              strokeWidth={2}
              fillRule="evenodd"
              opacity={hover && hover !== s.id ? 0.55 : 1}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", pointerEvents: "none", padding: inner * 0.35 }}>
          {hovered ? (
            <div>
              <div className="small muted">{hovered.label}</div>
              <div style={{ fontWeight: 650 }}>{format(hovered.value / total)}</div>
            </div>
          ) : (
            center
          )}
        </div>
      </div>
      <div className="col gap-4 grow" style={{ minWidth: 140 }}>
        {slices.map((s) => (
          <div key={s.id} className="row between small" onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
            <span className="row gap-4">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />
              <span className="muted">{s.label}</span>
            </span>
            <span className="num" style={{ fontWeight: 600 }}>
              {format(s.value / total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarList({ items, format, max }: { items: Array<{ id: string; label: ReactNode; value: number; color?: string; highlight?: boolean }>; format: (v: number) => string; max?: number }) {
  const m = max ?? Math.max(1e-9, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="col gap-4">
      {items.map((i) => (
        <div key={i.id} className="row gap-12" title={`${format(i.value)}`}>
          <div className="small" style={{ width: 140, flex: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: i.highlight ? 650 : 400 }}>
            {i.label}
          </div>
          <div className="grow" style={{ height: 12, position: "relative" }}>
            <div
              style={{
                width: `${Math.max(0, (Math.abs(i.value) / m) * 100)}%`,
                maxWidth: "100%",
                height: 12,
                borderRadius: "0 4px 4px 0",
                background: i.color ?? (i.highlight ? "var(--s1)" : "var(--muted-series)"),
              }}
            />
          </div>
          <div className="small num" style={{ width: 80, textAlign: "right" }}>
            {format(i.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface ScatterPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  highlight?: boolean;
}

export function Scatter({ points, xLabel, yLabel, xFormat, yFormat, height = 280, xSplit, logY }: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
  height?: number;
  xSplit?: number;
  logY?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const pad = { l: 84, r: 20, t: 12, b: 40 };
  const W = width;
  const H = height;
  const ty = (v: number) => (logY ? Math.log10(Math.max(1, v)) : v);
  const ysT = points.map((p) => ty(p.y));
  const yLo = Math.min(...ysT, logY ? 4 : 0);
  const yHi = Math.max(...ysT, yLo + 1);
  const sx = (x: number) => pad.l + Math.max(0, Math.min(1, x)) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (ty(y) - yLo) / (yHi - yLo || 1)) * (H - pad.t - pad.b);
  const yTicks = logY
    ? Array.from({ length: Math.floor(yHi) - Math.ceil(yLo) + 1 }, (_, i) => Math.pow(10, Math.ceil(yLo) + i))
    : niceTicks(yLo, yHi);
  const hp = points.find((p) => p.id === hover);
  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={H} role="img">
        {yTicks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} />
            <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={sx(t)} y={H - 22} textAnchor="middle">
            {xFormat(t)}
          </text>
        ))}
        {xSplit !== undefined && <line className="axis-line" x1={sx(xSplit)} x2={sx(xSplit)} y1={pad.t} y2={H - pad.b} strokeDasharray="0" />}
        <text x={(W + pad.l) / 2} y={H - 4} textAnchor="middle" style={{ fill: "var(--text-2)" }}>
          {xLabel}
        </text>
        <text x={10} y={H / 2} textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`} style={{ fill: "var(--text-2)" }}>
          {yLabel}
        </text>
        {points.map((p) => (
          <g key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={14} fill="transparent" />
            <circle cx={sx(p.x)} cy={sy(p.y)} r={p.highlight ? 7 : 5} fill={p.color} stroke="var(--surface)" strokeWidth={2} />
          </g>
        ))}
        {points
          .filter((p) => p.highlight || points.length <= 6)
          .map((p) => {
            const right = sx(p.x) < W - 140;
            return (
              <text key={`l-${p.id}`} x={sx(p.x) + (right ? 10 : -10)} y={sy(p.y) - 8} textAnchor={right ? "start" : "end"} style={{ fill: p.highlight ? "var(--text)" : "var(--text-2)", fontWeight: p.highlight ? 600 : 400 }}>
                {p.label}
              </text>
            );
          })}
      </svg>
      {hp && (
        <div className="chart-tip" style={{ left: Math.min(W - 180, sx(hp.x) + 12), top: Math.max(0, sy(hp.y) - 40) }}>
          <div style={{ fontWeight: 600 }}>{hp.label}</div>
          <div className="muted">
            {xLabel}: {xFormat(hp.x)}
          </div>
          <div className="muted">
            {yLabel}: {yFormat(hp.y)}
          </div>
        </div>
      )}
    </div>
  );
}
