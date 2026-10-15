// Company logos: ready-made marks built from a few primitives, plus the same primitives for the
// logo studio where teams compose their own. Colors are tokens resolved against the company color.
import { lt, type LText } from "../text";
import type { LogoArt, LogoLayer, LogoShape } from "../types";

export const LOGO_SHAPES: LogoShape[] = ["circle", "ring", "square", "rounded", "triangle", "diamond", "hexagon", "star", "bolt", "heart", "drop", "leaf", "bar", "arc", "dots", "monogram"];

export const LOGO_SHAPE_LABEL: Record<LogoShape, LText> = {
  circle: lt("Circle", "Cerchio"),
  ring: lt("Ring", "Anello"),
  square: lt("Square", "Quadrato"),
  rounded: lt("Rounded square", "Quadrato stondato"),
  triangle: lt("Triangle", "Triangolo"),
  diamond: lt("Diamond", "Rombo"),
  hexagon: lt("Hexagon", "Esagono"),
  star: lt("Star", "Stella"),
  bolt: lt("Bolt", "Fulmine"),
  heart: lt("Heart", "Cuore"),
  drop: lt("Drop", "Goccia"),
  leaf: lt("Leaf", "Foglia"),
  bar: lt("Bar", "Barra"),
  arc: lt("Arc", "Arco"),
  dots: lt("Dots", "Punti"),
  monogram: lt("Monogram", "Monogramma"),
};

/** Color tokens a layer may use besides a hex color. */
export const LOGO_COLOR_TOKENS = ["light", "dark", "tint", "shade", "ink"] as const;
export type LogoColorToken = (typeof LOGO_COLOR_TOKENS)[number];

export const MAX_LOGO_LAYERS = 6;

export function layer(shape: LogoShape, color: string, size = 60, x = 0, y = 0, rotation = 0, opacity = 1): LogoLayer {
  return { shape, color, size, x, y, rotation, opacity };
}

export interface LogoTemplate {
  id: string;
  name: LText;
  layers: LogoLayer[];
}

export const LOGO_TEMPLATES: LogoTemplate[] = [
  { id: "orbit", name: lt("Orbit", "Orbita"), layers: [layer("ring", "light", 70), layer("circle", "light", 18, 24, -24)] },
  { id: "spark", name: lt("Spark", "Scintilla"), layers: [layer("star", "light", 66), layer("star", "tint", 26, 26, -26)] },
  { id: "peak", name: lt("Peak", "Vetta"), layers: [layer("triangle", "shade", 70, -10, 8), layer("triangle", "light", 58, 12, 12)] },
  { id: "stack", name: lt("Stack", "Pila"), layers: [layer("bar", "light", 64, 0, -20), layer("bar", "light", 64, 0, 0, 0, 0.75), layer("bar", "light", 64, 0, 20, 0, 0.5)] },
  { id: "bolt", name: lt("Bolt", "Fulmine"), layers: [layer("rounded", "shade", 74), layer("bolt", "light", 56)] },
  { id: "hexcore", name: lt("Hex core", "Nucleo esagonale"), layers: [layer("hexagon", "light", 72), layer("hexagon", "shade", 44), layer("circle", "light", 16)] },
  { id: "pulse", name: lt("Pulse", "Impulso"), layers: [layer("arc", "light", 70, 0, 10), layer("arc", "tint", 44, 0, 10), layer("circle", "light", 12, 0, 12)] },
  { id: "sprout", name: lt("Sprout", "Germoglio"), layers: [layer("leaf", "light", 46, -12, -10, -20), layer("leaf", "tint", 46, 14, 4, 60), layer("bar", "light", 8, 0, 34, 90)] },
  { id: "target", name: lt("Target", "Bersaglio"), layers: [layer("ring", "light", 74), layer("ring", "light", 44), layer("circle", "light", 16)] },
  { id: "diamond", name: lt("Diamond", "Diamante"), layers: [layer("diamond", "shade", 72), layer("diamond", "light", 48), layer("diamond", "tint", 22)] },
  { id: "sunrise", name: lt("Sunrise", "Alba"), layers: [layer("arc", "light", 72, 0, 14), layer("circle", "tint", 34, 0, 14), layer("bar", "light", 70, 0, 30)] },
  { id: "cube", name: lt("Cube", "Cubo"), layers: [layer("hexagon", "light", 72), layer("diamond", "shade", 36, 0, -18), layer("square", "tint", 30, -18, 14, 30)] },
  { id: "drop", name: lt("Drop", "Goccia"), layers: [layer("drop", "light", 66), layer("circle", "tint", 18, 8, 10)] },
  { id: "flame", name: lt("Flame", "Fiamma"), layers: [layer("drop", "light", 68, 0, 0, 180), layer("drop", "tint", 36, 0, 10, 180)] },
  { id: "shield", name: lt("Shield", "Scudo"), layers: [layer("rounded", "light", 66, 0, -4, 45), layer("rounded", "shade", 36, 0, -4, 45), layer("star", "light", 20, 0, -4)] },
  { id: "heart", name: lt("Heart", "Cuore"), layers: [layer("heart", "light", 68), layer("heart", "tint", 30, 0, -2)] },
  { id: "grid", name: lt("Grid", "Griglia"), layers: [layer("dots", "light", 66)] },
  { id: "arrow", name: lt("Arrow", "Freccia"), layers: [layer("triangle", "light", 54, 0, -14), layer("bar", "light", 22, 0, 22, 90)] },
  { id: "wave", name: lt("Wave", "Onda"), layers: [layer("arc", "light", 44, -20, 0, 0), layer("arc", "light", 44, 20, 0, 180), layer("arc", "tint", 44, -20, 24, 0, 0.7), layer("arc", "tint", 44, 20, 24, 180, 0.7)] },
  { id: "chat", name: lt("Chat", "Chat"), layers: [layer("rounded", "light", 64, 0, -6), layer("triangle", "light", 22, -16, 26, 200), layer("dots", "shade", 30, 0, -6)] },
  { id: "infinity", name: lt("Loop", "Anello doppio"), layers: [layer("ring", "light", 46, -16, 0), layer("ring", "light", 46, 16, 0)] },
  { id: "pixel", name: lt("Pixel", "Pixel"), layers: [layer("square", "light", 26, -16, -16), layer("square", "tint", 26, 16, -16), layer("square", "tint", 26, -16, 16), layer("square", "light", 26, 16, 16)] },
  { id: "monogram", name: lt("Monogram", "Monogramma"), layers: [layer("monogram", "light", 100)] },
  { id: "badge", name: lt("Badge", "Distintivo"), layers: [layer("circle", "light", 76), layer("monogram", "ink", 72)] },
];

export function logoTemplate(id: string): LogoTemplate | undefined {
  return LOGO_TEMPLATES.find((t) => t.id === id);
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

export function sanitizeLayer(l: Partial<LogoLayer> | null | undefined): LogoLayer {
  const shape = LOGO_SHAPES.includes(l?.shape as LogoShape) ? (l!.shape as LogoShape) : "circle";
  const color = typeof l?.color === "string" && (/^#[0-9a-fA-F]{6}$/.test(l.color) || (LOGO_COLOR_TOKENS as readonly string[]).includes(l.color)) ? l.color : "light";
  return {
    shape,
    color,
    size: clampNum(l?.size, 6, 120, 60),
    x: clampNum(l?.x, -45, 45, 0),
    y: clampNum(l?.y, -45, 45, 0),
    rotation: clampNum(l?.rotation, -180, 360, 0),
    opacity: clampNum(l?.opacity, 0.1, 1, 1),
  };
}

/** Keeps only valid logo art; unknown templates and oversized images are dropped. */
export function sanitizeLogoArt(art: LogoArt | null | undefined): LogoArt | null {
  if (!art || typeof art !== "object") return null;
  if (art.kind === "template") return logoTemplate(art.template) ? { kind: "template", template: art.template } : null;
  if (art.kind === "composed") return Array.isArray(art.layers) && art.layers.length > 0 ? { kind: "composed", layers: art.layers.slice(0, MAX_LOGO_LAYERS).map(sanitizeLayer) } : null;
  if (art.kind === "image") return typeof art.data === "string" && art.data.startsWith("data:image/") && art.data.length < 400_000 ? { kind: "image", data: art.data } : null;
  return null;
}

/** The layers to draw for a logo (templates are expanded). */
export function logoLayers(art: LogoArt | null): LogoLayer[] {
  if (!art) return [];
  if (art.kind === "template") return logoTemplate(art.template)?.layers ?? [];
  if (art.kind === "composed") return art.layers;
  return [];
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
