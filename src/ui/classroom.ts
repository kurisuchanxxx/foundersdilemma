// Classroom mode without a server: the instructor's copy of the game is the master.
// 1. The instructor exports the game file and shares it (LMS, e-mail, shared folder, USB key).
// 2. Each team opens it ("Join a class"), plays its round and exports a small decision file.
// 3. The instructor imports all decision files, advances the round and shares the new game file.

import { sanitizeDecision, submitDecision, type Decision, type GameState } from "../core";
import { STATE_VERSION } from "../core/engine/setup";
import { saveTextFile } from "../platform/files";

export interface GameFile {
  kind: "founders-dilemma-game";
  version: number;
  exportedAt: string;
  state: GameState;
}

export interface DecisionFile {
  kind: "founders-dilemma-decision";
  version: number;
  gameId: string;
  seed: string;
  round: number;
  companyId: string;
  companyName: string;
  exportedAt: string;
  decision: Decision;
}

export function gameFileContents(state: GameState): string {
  const file: GameFile = { kind: "founders-dilemma-game", version: STATE_VERSION, exportedAt: new Date().toISOString(), state };
  return JSON.stringify(file);
}

export function gameFileName(state: GameState): string {
  const base = (state.config.sessionName || state.config.seed).replace(/[^\w-]+/g, "_");
  return state.finished ? `${base}_final.fdgame.json` : `${base}_round${state.round}.fdgame.json`;
}

export function decisionFileContents(state: GameState, companyId: string, decision: Decision): string {
  const c = state.companies.find((x) => x.id === companyId)!;
  const file: DecisionFile = {
    kind: "founders-dilemma-decision",
    version: STATE_VERSION,
    gameId: state.id,
    seed: state.config.seed,
    round: state.round,
    companyId,
    companyName: c.name,
    exportedAt: new Date().toISOString(),
    decision,
  };
  return JSON.stringify(file, null, 1);
}

export function decisionFileName(state: GameState, companyId: string): string {
  const c = state.companies.find((x) => x.id === companyId);
  return `${(c?.name ?? "team").replace(/[^\w-]+/g, "_")}_round${state.round}.fddecision.json`;
}

/** Saves the team's decision file (desktop dialog or browser download). */
export function exportDecisionFile(state: GameState, companyId: string, decision: Decision): Promise<boolean> {
  return saveTextFile(decisionFileName(state, companyId), decisionFileContents(state, companyId, decision), [{ name: "Decision", extensions: ["json"] }]);
}

export interface ImportResult {
  file: string;
  ok: boolean;
  companyName?: string;
  message: { en: string; it: string };
}

/** Applies teams' decision files to the instructor's game (returns a new state). */
export function applyDecisionFiles(state: GameState, files: Array<{ name: string; contents: string }>): { state: GameState; results: ImportResult[] } {
  const next = structuredClone(state);
  const results: ImportResult[] = [];
  for (const f of files) {
    let parsed: DecisionFile;
    try {
      parsed = JSON.parse(f.contents);
    } catch {
      results.push({ file: f.name, ok: false, message: { en: "Not a valid JSON file.", it: "Non è un file JSON valido." } });
      continue;
    }
    if (parsed.kind !== "founders-dilemma-decision") {
      results.push({ file: f.name, ok: false, message: { en: "Not a decision file.", it: "Non è un file di decisione." } });
      continue;
    }
    if (parsed.gameId !== next.id) {
      results.push({ file: f.name, ok: false, companyName: parsed.companyName, message: { en: "It belongs to another game.", it: "Appartiene a un'altra partita." } });
      continue;
    }
    if (parsed.round !== next.round) {
      results.push({ file: f.name, ok: false, companyName: parsed.companyName, message: { en: `It is for round ${parsed.round}, the game is at round ${next.round}.`, it: `È per il round ${parsed.round}, la partita è al round ${next.round}.` } });
      continue;
    }
    const c = next.companies.find((x) => x.id === parsed.companyId);
    if (!c || c.isBot) {
      results.push({ file: f.name, ok: false, companyName: parsed.companyName, message: { en: "Unknown team.", it: "Team sconosciuto." } });
      continue;
    }
    submitDecision(next, c.id, sanitizeDecision(next, c, parsed.decision));
    results.push({ file: f.name, ok: true, companyName: c.name, message: { en: "Decisions imported.", it: "Decisioni importate." } });
  }
  return { state: next, results };
}

/** Merges an updated game file from the instructor into a team's copy. */
export function checkTeamUpdate(current: GameState, incoming: GameState): { ok: boolean; message: { en: string; it: string } } {
  if (incoming.id !== current.id) return { ok: false, message: { en: "This file belongs to another game.", it: "Questo file appartiene a un'altra partita." } };
  if (incoming.round < current.round) return { ok: false, message: { en: "This file is older than your copy.", it: "Questo file è più vecchio della tua copia." } };
  return { ok: true, message: { en: "Game updated.", it: "Partita aggiornata." } };
}
