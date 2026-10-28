import { useMemo } from "react";
import { draftFor, type Company, type Decision, type GameState } from "../core";
import { useStore } from "./store";

export function useGame(): GameState {
  const g = useStore((s) => s.game);
  if (!g) throw new Error("No game loaded");
  return g;
}

export function useActiveCompany(): Company | null {
  const g = useStore((s) => s.game);
  const id = useStore((s) => s.activeCompanyId);
  if (!g || !id) return null;
  return g.companies.find((c) => c.id === id) ?? null;
}

export function lastSnapshot(c: Company) {
  return c.history[c.history.length - 1] ?? null;
}

export function prevSnapshot(c: Company) {
  return c.history[c.history.length - 2] ?? null;
}

export function change(curr: number | undefined, prev: number | undefined): number | null {
  if (curr === undefined || prev === undefined || !Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null;
  // a percentage change across zero (e.g. cash going negative) means nothing
  if (curr < 0 !== prev < 0) return null;
  return (curr - prev) / Math.abs(prev);
}

/** The working decision of a company: the unsent draft, or a fresh one derived from the game. */
export function useDraft(c: Company | null): Decision | null {
  const game = useStore((s) => s.game);
  const stored = useStore((s) => (c ? s.drafts[c.id] : undefined));
  return useMemo(() => {
    if (!c || !game) return null;
    return stored ?? draftFor(game, c);
  }, [stored, game, c]);
}
