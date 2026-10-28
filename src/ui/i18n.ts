import { useMemo } from "react";
import type { Currency, Lang, LText } from "../core";
import { useStore } from "./store";

export interface Fmt {
  lang: Lang;
  /** Inline bilingual string. */
  tx: (en: string, it: string) => string;
  /** Localized core text. */
  L: (t: LText | null | undefined) => string;
  money: (v: number, opts?: { compact?: boolean; decimals?: number; sign?: boolean }) => string;
  num: (v: number, decimals?: number) => string;
  /** "1 team" / "3 teams": a count with the right singular or plural word for the language. */
  count: (n: number, en: [string, string], it: [string, string]) => string;
  compact: (v: number) => string;
  pct: (v: number, decimals?: number) => string;
  months: (v: number) => string;
  date: (iso: string) => string;
  currency: Currency;
}

export function makeFmt(lang: Lang, currency: Currency): Fmt {
  const locale = lang === "it" ? "it-IT" : "en-US";
  const symbol = currency === "USD" ? "$" : "€";
  const full0 = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
  const full2 = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const numF = (d: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const fixCurrency = (s: string) => (symbol === "$" ? s.replace(/€/g, "$") : s);
  // non-breaking spaces: "780 k €" must never wrap across two lines
  const suffixes = lang === "it" ? { k: "\u00a0k", m: "\u00a0Mln", b: "\u00a0Mrd" } : { k: "k", m: "M", b: "B" };
  /** Short number such as "462k", "1,2 Mln" / "1.2M". */
  const short = (v: number): string => {
    const a = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (a >= 1e9) return `${sign}${numF(a >= 1e10 ? 0 : 1).format(a / 1e9)}${suffixes.b}`;
    if (a >= 1e6) return `${sign}${numF(a >= 1e7 ? 0 : 1).format(a / 1e6)}${suffixes.m}`;
    if (a >= 1e4) return `${sign}${numF(a >= 1e5 ? 0 : 1).format(a / 1e3)}${suffixes.k}`;
    return `${sign}${numF(0).format(a)}`;
  };
  const shortMoney = (v: number): string => (lang === "it" ? `${short(v)}\u00a0${symbol}` : `${v < 0 ? "-" : ""}${symbol}${short(Math.abs(v))}`);
  return {
    lang,
    currency,
    tx: (en, it) => (lang === "it" ? it : en),
    L: (t) => (t ? fixCurrency(t[lang] ?? t.en) : ""),
    money: (v, opts) => {
      if (!Number.isFinite(v)) return "—";
      const sign = opts?.sign && v > 0 ? "+" : "";
      if (opts?.decimals) return sign + full2.format(v);
      if (opts?.compact !== false && Math.abs(v) >= 10_000) return sign + shortMoney(v);
      if (Math.abs(v) < 100 && v !== Math.round(v)) return sign + full2.format(v);
      return sign + full0.format(v);
    },
    num: (v, decimals = 0) => (Number.isFinite(v) ? numF(decimals).format(v) : "—"),
    count: (n, en, it) => `${numF(0).format(n)} ${(lang === "it" ? it : en)[Math.round(n) === 1 ? 0 : 1]}`,
    compact: (v) => (Number.isFinite(v) ? short(Math.round(v)) : "—"),
    pct: (v, decimals = 0) => (Number.isFinite(v) ? `${numF(decimals).format(v * 100)}%` : "—"),
    months: (v) => (v >= 99 ? (lang === "it" ? "∞ (in utile)" : "∞ (profitable)") : `${numF(1).format(Math.max(0, v))}\u00a0${lang === "it" ? "mesi" : "mo"}`),
    date: (iso) => new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }),
  };
}

/** Formatter for the current language and the game's currency (or `currencyOverride` before a game exists). */
export function useFmt(currencyOverride?: Currency): Fmt {
  const lang = useStore((s) => s.lang);
  const gameCurrency = useStore((s) => s.game?.config.currency ?? "EUR");
  const currency = currencyOverride ?? gameCurrency;
  return useMemo(() => makeFmt(lang, currency), [lang, currency]);
}
