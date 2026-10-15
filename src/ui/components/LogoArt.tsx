import { useState, type DragEvent } from "react";
import {
  COLORS,
  LOGOS,
  LOGO_COLOR_TOKENS,
  LOGO_SHAPES,
  LOGO_SHAPE_LABEL,
  LOGO_TEMPLATES,
  MAX_LOGO_LAYERS,
  initials,
  layer as makeLayer,
  logoLayers,
  type LogoArt,
  type LogoLayer,
  type LogoShape,
} from "../../core";
import { fileToSquareDataUrl, imageFromTransfer, pickImageFile } from "../../platform/images";
import { useFmt } from "../i18n";
import { useStore } from "../store";
import { Icon } from "./Icon";
import { SliderField, Tabs } from "./ui";

export interface Brand {
  name?: string;
  logo: string;
  color: string;
  logoArt?: LogoArt | null;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [60, 60, 60];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex: string, target: [number, number, number], t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const c = (a: number, z: number) => Math.round(a + (z - a) * t);
  return `rgb(${c(r, target[0])}, ${c(g, target[1])}, ${c(b, target[2])})`;
}

/** Resolves a layer color token against the company color. */
export function resolveLogoColor(color: string, base: string): string {
  switch (color) {
    case "light":
      return "#ffffff";
    case "dark":
      return "rgba(0, 0, 0, 0.35)";
    case "ink":
      return "#111827";
    case "tint":
      return mix(base, [255, 255, 255], 0.45);
    case "shade":
      return mix(base, [0, 0, 0], 0.32);
    default:
      return color;
  }
}

function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(" ");
}

function starPath(outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

/** One primitive, drawn centred in a 100x100 box (-50..50). */
function Shape({ shape, fill, text }: { shape: LogoShape; fill: string; text: string }) {
  switch (shape) {
    case "circle":
      return <circle r="50" fill={fill} />;
    case "ring":
      return <circle r="42" fill="none" stroke={fill} strokeWidth="14" />;
    case "square":
      return <rect x="-50" y="-50" width="100" height="100" fill={fill} />;
    case "rounded":
      return <rect x="-50" y="-50" width="100" height="100" rx="24" fill={fill} />;
    case "triangle":
      return <path d="M0,-50 L50,40 L-50,40 Z" fill={fill} strokeLinejoin="round" />;
    case "diamond":
      return <path d="M0,-50 L50,0 L0,50 L-50,0 Z" fill={fill} />;
    case "hexagon":
      return <polygon points={hexPoints(50)} fill={fill} />;
    case "star":
      return <path d={starPath(50, 22)} fill={fill} />;
    case "bolt":
      return <path d="M12,-50 L-32,8 L-4,8 L-14,50 L32,-12 L4,-12 Z" fill={fill} strokeLinejoin="round" />;
    case "heart":
      return <path d="M0,42 C-6,34 -50,10 -50,-18 C-50,-36 -36,-48 -22,-48 C-12,-48 -4,-42 0,-34 C4,-42 12,-48 22,-48 C36,-48 50,-36 50,-18 C50,10 6,34 0,42 Z" fill={fill} />;
    case "drop":
      return <path d="M0,-50 C22,-18 40,2 40,20 A40,40 0 1 1 -40,20 C-40,2 -22,-18 0,-50 Z" fill={fill} />;
    case "leaf":
      return <path d="M-46,46 C-46,-18 10,-46 46,-46 C46,16 -10,46 -46,46 Z M-46,46 L46,-46" fill={fill} stroke={fill} strokeWidth="3" />;
    case "bar":
      return <rect x="-50" y="-12" width="100" height="24" rx="8" fill={fill} />;
    case "arc":
      return <path d="M-42,0 A42,42 0 0 1 42,0" fill="none" stroke={fill} strokeWidth="14" strokeLinecap="round" />;
    case "dots":
      return (
        <g fill={fill}>
          {[-32, 0, 32].flatMap((x) => [-32, 0, 32].map((y) => <circle key={`${x}:${y}`} cx={x} cy={y} r="10" />))}
        </g>
      );
    case "monogram":
      return (
        <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontFamily="-apple-system, 'Segoe UI', system-ui, sans-serif" fontWeight="800" fontSize={text.length > 1 ? 52 : 64} fill={fill} style={{ letterSpacing: "-0.04em" }}>
          {text}
        </text>
      );
  }
}

/** Draws any logo art (template, composed layers or image) on the company colour. */
export function LogoMark({ brand, size = 40, radius }: { brand: Brand; size?: number; radius?: number }) {
  const r = radius ?? size * 0.26;
  const art = brand.logoArt ?? null;
  const base: React.CSSProperties = { width: size, height: size, borderRadius: r, background: brand.color, overflow: "hidden", flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" };
  if (art?.kind === "image") {
    return (
      <span className="logo" style={base}>
        <img src={art.data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </span>
    );
  }
  const layers = logoLayers(art);
  if (layers.length === 0) {
    return (
      <span className="logo" style={{ ...base, color: "#fff" }}>
        <Icon name={brand.logo} size={size * 0.55} />
      </span>
    );
  }
  const mono = initials(brand.name ?? "");
  return (
    <span className="logo" style={base}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ display: "block" }}>
        {layers.map((l, i) => (
          <g key={i} transform={`translate(${50 + l.x} ${50 + l.y}) rotate(${l.rotation}) scale(${l.size / 100})`} opacity={l.opacity}>
            <Shape shape={l.shape} fill={resolveLogoColor(l.color, brand.color)} text={mono} />
          </g>
        ))}
      </svg>
    </span>
  );
}

type StudioTab = "icons" | "gallery" | "studio" | "upload";

/** The whole logo workflow: plain icons, ready-made marks, a layer composer and image upload. */
export function LogoStudio({ brand, onChange }: { brand: Brand; onChange: (patch: Partial<Brand>) => void }) {
  const f = useFmt();
  const art = brand.logoArt ?? null;
  const initial: StudioTab = art?.kind === "image" ? "upload" : art?.kind === "composed" ? "studio" : art?.kind === "template" ? "gallery" : "icons";
  const [tab, setTab] = useState<StudioTab>(initial);
  const tabs: Array<{ id: StudioTab; label: string; icon: string }> = [
    { id: "icons", label: f.tx("Icons", "Icone"), icon: "Sparkles" },
    { id: "gallery", label: f.tx("Gallery", "Galleria"), icon: "Gem" },
    { id: "studio", label: f.tx("Studio", "Studio"), icon: "Layers" },
    { id: "upload", label: f.tx("Upload", "Carica"), icon: "Upload" },
  ];
  return (
    <div className="col gap-12">
      <div className="row gap-12 top">
        <LogoMark brand={brand} size={72} />
        <div className="grow">
          <Tabs value={tab} tabs={tabs} onChange={setTab} />
        </div>
      </div>
      {tab === "icons" && (
        <div className="row wrap gap-4">
          {LOGOS.map((l) => (
            <button key={l} type="button" className={`option-card logo-pick ${!art && brand.logo === l ? "on" : ""}`} onClick={() => onChange({ logo: l, logoArt: null })} aria-label={l}>
              <Icon name={l} size={20} />
            </button>
          ))}
        </div>
      )}
      {tab === "gallery" && (
        <div className="logo-gallery">
          {LOGO_TEMPLATES.map((t) => {
            const on = art?.kind === "template" && art.template === t.id;
            return (
              <button key={t.id} type="button" className={`logo-tile ${on ? "on" : ""}`} onClick={() => onChange({ logoArt: { kind: "template", template: t.id } })} aria-pressed={on} title={f.L(t.name)}>
                <LogoMark brand={{ ...brand, logoArt: { kind: "template", template: t.id } }} size={52} />
                <span className="tiny">{f.L(t.name)}</span>
              </button>
            );
          })}
        </div>
      )}
      {tab === "studio" && <LogoComposer brand={brand} onChange={onChange} />}
      {tab === "upload" && <LogoUpload brand={brand} onChange={onChange} />}
      <div className="field">
        <div className="field-label">{f.tx("Brand colour", "Colore del brand")}</div>
        <div className="row wrap gap-4">
          {COLORS.map((c) => (
            <button key={c} type="button" className={`swatch ${brand.color === c ? "on" : ""}`} style={{ background: c }} onClick={() => onChange({ color: c })} aria-label={c} aria-pressed={brand.color === c} />
          ))}
          <label className="swatch custom" title={f.tx("Custom colour", "Colore personalizzato")}>
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(brand.color) ? brand.color : "#3987e5"} onChange={(e) => onChange({ color: e.target.value })} aria-label={f.tx("Custom colour", "Colore personalizzato")} />
            <Icon name="Palette" size={14} />
          </label>
        </div>
      </div>
    </div>
  );
}

const LAYER_COLORS = ["light", "tint", "shade", "dark", "ink"] as const;

function LogoComposer({ brand, onChange }: { brand: Brand; onChange: (patch: Partial<Brand>) => void }) {
  const f = useFmt();
  const art = brand.logoArt;
  const layers: LogoLayer[] = art?.kind === "composed" ? art.layers : art?.kind === "template" ? logoLayers(art) : [makeLayer("circle", "light", 64)];
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, layers.length - 1);
  const current = layers[idx];
  const commit = (next: LogoLayer[]) => onChange({ logoArt: { kind: "composed", layers: next } });
  const patch = (p: Partial<LogoLayer>) => commit(layers.map((l, i) => (i === idx ? { ...l, ...p } : l)));
  const tokenLabel: Record<(typeof LAYER_COLORS)[number], string> = {
    light: f.tx("White", "Bianco"),
    tint: f.tx("Light tint", "Tinta chiara"),
    shade: f.tx("Dark shade", "Tono scuro"),
    dark: f.tx("Shadow", "Ombra"),
    ink: f.tx("Ink", "Inchiostro"),
  };
  return (
    <div className="logo-composer">
      <div className="col gap-8">
        <div className="small muted">{f.tx("Stack up to six pieces. Pick a piece, then move, scale, rotate and colour it.", "Impila fino a sei pezzi. Scegli un pezzo, poi spostalo, ridimensionalo, ruotalo e coloralo.")}</div>
        <div className="layer-list">
          {layers.map((l, i) => (
            <div key={i} className={`layer-row ${i === idx ? "on" : ""}`} onClick={() => setSel(i)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(i)}>
              <span className="layer-swatch" style={{ background: resolveLogoColor(l.color, brand.color) }} />
              <span className="grow small">
                {i + 1}. {f.L(LOGO_SHAPE_LABEL[l.shape])}
              </span>
              <button type="button" className="icon-btn" disabled={i === 0} aria-label="up" onClick={(e) => { e.stopPropagation(); const n = [...layers]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; commit(n); setSel(i - 1); }}>
                <Icon name="ChevronUp" size={14} />
              </button>
              <button type="button" className="icon-btn" disabled={i === layers.length - 1} aria-label="down" onClick={(e) => { e.stopPropagation(); const n = [...layers]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; commit(n); setSel(i + 1); }}>
                <Icon name="ChevronDown" size={14} />
              </button>
              <button type="button" className="icon-btn" disabled={layers.length <= 1} aria-label="remove" onClick={(e) => { e.stopPropagation(); commit(layers.filter((_, k) => k !== i)); setSel(Math.max(0, idx - (i <= idx ? 1 : 0))); }}>
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn sm"
          disabled={layers.length >= MAX_LOGO_LAYERS}
          onClick={() => {
            const next = [...layers, makeLayer(LOGO_SHAPES[(layers.length * 5) % LOGO_SHAPES.length], layers.length % 2 === 0 ? "tint" : "light", 40, 0, 0)];
            commit(next);
            setSel(next.length - 1);
          }}
        >
          <Icon name="Plus" size={14} />
          {f.tx("Add a piece", "Aggiungi un pezzo")}
        </button>
      </div>
      <div className="col gap-12">
        <div className="field">
          <div className="field-label">{f.tx("Piece", "Pezzo")}</div>
          <div className="row wrap gap-4">
            {LOGO_SHAPES.map((s) => (
              <button key={s} type="button" className={`shape-pick ${current.shape === s ? "on" : ""}`} onClick={() => patch({ shape: s })} title={f.L(LOGO_SHAPE_LABEL[s])} aria-pressed={current.shape === s}>
                <svg viewBox="-55 -55 110 110" width="30" height="30" aria-hidden="true">
                  <Shape shape={s} fill="currentColor" text={initials(brand.name ?? "AB")} />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <div className="field-label">{f.tx("Colour", "Colore")}</div>
          <div className="row wrap gap-4">
            {LAYER_COLORS.map((c) => (
              <button key={c} type="button" className={`swatch ${current.color === c ? "on" : ""}`} style={{ background: resolveLogoColor(c, brand.color) }} onClick={() => patch({ color: c })} title={tokenLabel[c]} aria-label={tokenLabel[c]} aria-pressed={current.color === c} />
            ))}
            {COLORS.map((c) => (
              <button key={c} type="button" className={`swatch ${current.color === c ? "on" : ""}`} style={{ background: c }} onClick={() => patch({ color: c })} aria-label={c} aria-pressed={current.color === c} />
            ))}
            <label className="swatch custom" title={f.tx("Custom colour", "Colore personalizzato")}>
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(current.color) ? current.color : "#ffffff"} onChange={(e) => patch({ color: e.target.value })} aria-label={f.tx("Custom colour", "Colore personalizzato")} />
              <Icon name="Palette" size={14} />
            </label>
          </div>
        </div>
        <div className="grid cols-2" style={{ gap: 8 }}>
          <SliderField label={f.tx("Size", "Dimensione")} value={current.size} min={6} max={120} onChange={(size) => patch({ size })} format={(v) => `${v}%`} />
          <SliderField label={f.tx("Rotation", "Rotazione")} value={current.rotation} min={-180} max={180} step={5} onChange={(rotation) => patch({ rotation })} format={(v) => `${v}°`} />
          <SliderField label={f.tx("Horizontal", "Orizzontale")} value={current.x} min={-45} max={45} onChange={(x) => patch({ x })} format={(v) => `${v}`} />
          <SliderField label={f.tx("Vertical", "Verticale")} value={current.y} min={-45} max={45} onChange={(y) => patch({ y })} format={(v) => `${v}`} />
          <SliderField label={f.tx("Opacity", "Opacità")} value={Math.round(current.opacity * 100)} min={10} max={100} step={5} onChange={(v) => patch({ opacity: v / 100 })} format={(v) => `${v}%`} />
        </div>
        {LOGO_COLOR_TOKENS.length > 0 && <div className="tiny faint">{f.tx("Tints and shades follow the brand colour, so the logo stays consistent if you change it later.", "Tinte e toni seguono il colore del brand, così il logo resta coerente se lo cambi in seguito.")}</div>}
      </div>
    </div>
  );
}

function LogoUpload({ brand, onChange }: { brand: Brand; onChange: (patch: Partial<Brand>) => void }) {
  const f = useFmt();
  const toast = useStore((s) => s.toast);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const use = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const png = file.type === "image/png" || file.type === "image/svg+xml" || file.type === "image/webp";
      const data = await fileToSquareDataUrl(file, { size: 192, mime: png ? "image/png" : "image/jpeg", quality: 0.85 });
      onChange({ logoArt: { kind: "image", data } });
    } catch {
      toast(f.tx("This image could not be read.", "Impossibile leggere questa immagine."), "bad");
    } finally {
      setBusy(false);
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void use(imageFromTransfer(e.dataTransfer));
  };
  return (
    <div className="col gap-12">
      <div
        className={`dropzone ${over ? "over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onPaste={(e) => {
          const file = imageFromTransfer(e.clipboardData);
          if (file) void use(file);
        }}
      >
        <Icon name="ImagePlus" size={20} />
        <span className="small">{busy ? f.tx("Processing…", "Elaborazione…") : f.tx("Drop your logo here (PNG with transparency works best). It is resized to 192 px.", "Trascina qui il tuo logo (meglio un PNG con trasparenza). Viene ridimensionato a 192 px.")}</span>
        <button type="button" className="btn sm" disabled={busy} onClick={() => void pickImageFile().then(use)}>
          <Icon name="Upload" size={14} />
          {f.tx("Choose a file", "Scegli un file")}
        </button>
      </div>
      {brand.logoArt?.kind === "image" && (
        <button type="button" className="btn sm ghost" onClick={() => onChange({ logoArt: null })}>
          <Icon name="Eraser" size={14} />
          {f.tx("Remove the uploaded logo", "Rimuovi il logo caricato")}
        </button>
      )}
    </div>
  );
}
