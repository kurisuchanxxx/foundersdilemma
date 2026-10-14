// Bilingual text used by the simulation core. The core never depends on the UI, so every
// message it produces (events, investor feedback, mentor tips...) carries both languages.

export type Lang = "it" | "en";

export interface LText {
  en: string;
  it: string;
}

export type TextParams = Record<string, string | number>;
export type LTextParams = Record<string, string | number | LText>;

export function lt(en: string, it: string): LText {
  return { en, it };
}

export function interpolate(template: string, params?: TextParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

function pick(params: LTextParams, lang: Lang): TextParams {
  const out: TextParams = {};
  for (const [k, v] of Object.entries(params)) out[k] = typeof v === "object" ? v[lang] : v;
  return out;
}

/** Returns a new LText with {placeholders} filled in for both languages (params may be bilingual). */
export function fill(text: LText, params: LTextParams): LText {
  return { en: interpolate(text.en, pick(params, "en")), it: interpolate(text.it, pick(params, "it")) };
}

export function tr(text: LText | undefined, lang: Lang): string {
  if (!text) return "";
  return text[lang] ?? text.en;
}

/** Compact money formatting usable inside core-generated messages (e.g. "€1.2M"). */
export function moneyShort(value: number, symbol = "€"): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${symbol}${(abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `${sign}${symbol}${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}${symbol}${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}k`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}
