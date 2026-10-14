import { lt, type LText } from "../text";
import type { GameConfig } from "../types";

/** Number of months simulated in a round. */
export function monthsInRound(config: GameConfig, round: number): number {
  switch (config.periodPlan) {
    case "quarterly":
      return 3;
    case "semiannual":
      return 6;
    case "startup":
    default:
      return round <= 4 ? 3 : 6;
  }
}

/** Months elapsed before the start of a round. */
export function monthsBefore(config: GameConfig, round: number): number {
  let m = 0;
  for (let r = 1; r < round; r++) m += monthsInRound(config, r);
  return m;
}

export function totalMonths(config: GameConfig): number {
  return monthsBefore(config, config.totalRounds + 1);
}

/** Human readable label, e.g. "Year 1 · Q2" or "Year 3 · H1". */
export function roundLabel(config: GameConfig, round: number): LText {
  const start = monthsBefore(config, round);
  const len = monthsInRound(config, round);
  const year = Math.floor(start / 12) + 1;
  const monthInYear = start % 12;
  if (len === 3) {
    const q = Math.floor(monthInYear / 3) + 1;
    return lt(`Year ${year} · Q${q}`, `Anno ${year} · T${q}`);
  }
  if (len === 6) {
    const h = monthInYear < 6 ? 1 : 2;
    return lt(`Year ${year} · H${h}`, `Anno ${year} · S${h}`);
  }
  return lt(`Month ${start + 1}-${start + len}`, `Mese ${start + 1}-${start + len}`);
}

export function monthRangeLabel(config: GameConfig, round: number): LText {
  const start = monthsBefore(config, round);
  const len = monthsInRound(config, round);
  return lt(`months ${start + 1}-${start + len}`, `mesi ${start + 1}-${start + len}`);
}
