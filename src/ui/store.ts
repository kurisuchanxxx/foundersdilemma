import { create } from "zustand";
import {
  advanceRound,
  createGame,
  draftFor,
  injectCustomEvent,
  normalizeState,
  saveDraft,
  startGame,
  submitDecision,
  unsubmitDecision,
  type CompanySetup,
  type CustomEventSpec,
  type Decision,
  type GameConfig,
  type GameState,
  type Lang,
} from "../core";
import { STATE_VERSION } from "../core/engine/setup";
import { kvDelete, kvGet, kvSet, prefGet, prefSet } from "../platform/storage";

export type Screen = "home" | "setup" | "game" | "join";
export type View =
  | "dashboard"
  | "decisions"
  | "team"
  | "funding"
  | "product"
  | "market"
  | "news"
  | "leaderboard"
  | "reports"
  | "learn"
  | "settings"
  | "instructor"
  | "results";
export type Theme = "auto" | "light" | "dark";
export type DecisionTab = "core" | "product" | "people" | "growth" | "finance" | "teams" | "network" | "dilemma" | "review";

export interface SaveMeta {
  id: string;
  name: string;
  savedAt: string;
  round: number;
  totalRounds: number;
  finished: boolean;
  mode: GameConfig["mode"];
  seed: string;
  companies: Array<{ name: string; isBot: boolean; sector: string }>;
  classroomRole: "host" | "team" | null;
}

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "good" | "bad";
}

interface StoreState {
  lang: Lang;
  theme: Theme;
  screen: Screen;
  game: GameState | null;
  saveId: string | null;
  activeCompanyId: string | null;
  /** Hot-seat privacy: the team currently allowed to see its data. */
  revealedCompanyId: string | null;
  view: View;
  drafts: Record<string, Decision>;
  reportRound: number | null;
  classroomRole: "host" | "team" | null;
  toasts: Toast[];
  timerEndsAt: number | null;
  learnTopic: string | null;
  decisionsTab: DecisionTab;
  /** Current step of the guided tour, or null when it is not running. */
  tourStep: number | null;

  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  goHome: () => void;
  openSetup: () => void;
  openJoin: () => void;
  newGame: (config: GameConfig, setups: CompanySetup[], bots: number) => void;
  loadGame: (state: GameState, opts?: { saveId?: string | null; classroomRole?: "host" | "team" | null; activeCompanyId?: string | null }) => void;
  replaceGame: (state: GameState) => void;
  setView: (v: View) => void;
  setActive: (companyId: string) => void;
  reveal: (companyId: string | null) => void;
  draft: (companyId: string) => Decision | null;
  updateDraft: (companyId: string, patch: Partial<Decision> | ((d: Decision) => Decision)) => void;
  resetDraft: (companyId: string) => void;
  submit: (companyId: string) => void;
  unsubmit: (companyId: string) => void;
  advance: () => void;
  /** Simulates every remaining round (solo games where the player's company is no longer active). */
  fastForward: () => void;
  injectEvent: (spec: CustomEventSpec) => void;
  closeReport: () => void;
  openReport: (round: number) => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  setTimer: (endsAt: number | null) => void;
  openLearn: (topic: string | null) => void;
  setDecisionsTab: (tab: DecisionTab) => void;
  startTour: () => void;
  setTourStep: (step: number | null) => void;
  saveAs: (name: string) => Promise<string>;
  persist: () => Promise<void>;
}

let toastSeq = 0;

function firstHuman(state: GameState): string | null {
  return state.companies.find((c) => !c.isBot)?.id ?? state.companies[0]?.id ?? null;
}

function newSaveId(): string {
  return `save_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Game state with the unsent drafts stored as company decisions, ready to be saved. */
export function stateForSave(game: GameState, drafts: Record<string, Decision>): GameState {
  const copy = structuredClone(game);
  for (const c of copy.companies) {
    const d = drafts[c.id];
    if (d && !c.submitted && c.status === "active" && !copy.finished) saveDraft(copy, c.id, d);
  }
  return copy;
}

export async function listSaves(): Promise<SaveMeta[]> {
  const raw = await kvGet("saves:index");
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as SaveMeta[];
    return list.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

async function writeSave(id: string, name: string, game: GameState, role: "host" | "team" | null): Promise<void> {
  await kvSet(`save:${id}`, JSON.stringify(game));
  const list = (await listSaves()).filter((s) => s.id !== id);
  list.unshift({
    id,
    name,
    savedAt: new Date().toISOString(),
    round: game.round,
    totalRounds: game.config.totalRounds,
    finished: game.finished,
    mode: game.config.mode,
    seed: game.config.seed,
    companies: game.companies.map((c) => ({ name: c.name, isBot: c.isBot, sector: c.sector })),
    classroomRole: role,
  });
  await kvSet("saves:index", JSON.stringify(list.slice(0, 40)));
}

export async function readSave(id: string): Promise<GameState | null> {
  const raw = await kvGet(`save:${id}`);
  if (!raw) return null;
  return parseGame(raw);
}

export async function deleteSave(id: string): Promise<void> {
  await kvDelete(`save:${id}`);
  const list = (await listSaves()).filter((s) => s.id !== id);
  await kvSet("saves:index", JSON.stringify(list));
}

export function parseGame(raw: string): GameState | null {
  try {
    const obj = JSON.parse(raw);
    const state = (obj && obj.kind === "founders-dilemma-game" ? obj.state : obj) as GameState;
    if (!state || !Array.isArray(state.companies) || !state.config || typeof state.round !== "number") return null;
    if (state.version > STATE_VERSION) console.warn("Loading a game saved by a newer version", state.version);
    return normalizeState(state);
  } catch {
    return null;
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<StoreState>((set, get) => ({
  lang: (prefGet("lang") as Lang) || (typeof navigator !== "undefined" && navigator.language?.startsWith("it") ? "it" : "en"),
  theme: (prefGet("theme") as Theme) || "dark",
  screen: "home",
  game: null,
  saveId: null,
  activeCompanyId: null,
  revealedCompanyId: null,
  view: "dashboard",
  drafts: {},
  reportRound: null,
  classroomRole: null,
  toasts: [],
  timerEndsAt: null,
  learnTopic: null,
  decisionsTab: "core",
  tourStep: null,

  setLang: (lang) => {
    prefSet("lang", lang);
    set({ lang });
  },
  setTheme: (theme) => {
    prefSet("theme", theme);
    set({ theme });
  },
  goHome: () => {
    void get().persist();
    set({ screen: "home", game: null, drafts: {}, saveId: null, activeCompanyId: null, revealedCompanyId: null, reportRound: null, classroomRole: null, timerEndsAt: null, tourStep: null });
  },
  openSetup: () => set({ screen: "setup" }),
  openJoin: () => set({ screen: "join" }),

  newGame: (config, setups, bots) => {
    const state = createGame(config, setups, bots);
    startGame(state);
    const id = newSaveId();
    set({
      game: state,
      screen: "game",
      saveId: id,
      activeCompanyId: firstHuman(state),
      revealedCompanyId: config.mode === "hotseat" ? null : firstHuman(state),
      view: config.mode === "solo" ? "dashboard" : "instructor",
      drafts: {},
      reportRound: null,
      classroomRole: config.mode === "classroom" ? "host" : null,
      timerEndsAt: null,
      decisionsTab: "core",
      tourStep: config.mode === "solo" && !prefGet("tour-done") ? 0 : null,
    });
    void get().persist();
  },

  loadGame: (state, opts) => {
    normalizeState(state);
    const role = opts?.classroomRole ?? (state.config.mode === "classroom" ? "host" : null);
    const active = opts?.activeCompanyId ?? firstHuman(state);
    set({
      game: state,
      screen: "game",
      saveId: opts?.saveId ?? newSaveId(),
      activeCompanyId: active,
      revealedCompanyId: state.config.mode === "hotseat" && role !== "team" ? null : active,
      view: state.finished ? "results" : state.config.mode === "solo" || role === "team" ? "dashboard" : "instructor",
      drafts: {},
      reportRound: null,
      classroomRole: role,
      decisionsTab: "core",
      tourStep: role === "team" && !state.finished && !prefGet("tour-done") ? 0 : null,
    });
  },

  replaceGame: (state) => {
    set({ game: normalizeState(state), drafts: {} });
    void get().persist();
  },

  setView: (view) => set({ view }),
  setActive: (companyId) => {
    const g = get().game;
    const hidden = g?.config.mode === "hotseat" && get().classroomRole !== "team";
    set({ activeCompanyId: companyId, revealedCompanyId: hidden ? null : companyId });
  },
  reveal: (companyId) => set({ revealedCompanyId: companyId }),

  draft: (companyId) => {
    const { game, drafts } = get();
    if (!game) return null;
    if (drafts[companyId]) return drafts[companyId];
    const c = game.companies.find((x) => x.id === companyId);
    if (!c) return null;
    return draftFor(game, c);
  },
  updateDraft: (companyId, patch) => {
    const current = get().draft(companyId);
    if (!current) return;
    const next = typeof patch === "function" ? patch(structuredClone(current)) : { ...current, ...patch };
    set({ drafts: { ...get().drafts, [companyId]: next } });
    schedulePersist(get);
  },
  resetDraft: (companyId) => {
    const drafts = { ...get().drafts };
    delete drafts[companyId];
    set({ drafts });
  },

  submit: (companyId) => {
    const { game } = get();
    const d = get().draft(companyId);
    if (!game || !d) return;
    const next = structuredClone(game);
    submitDecision(next, companyId, d);
    const drafts = { ...get().drafts };
    delete drafts[companyId];
    set({ game: next, drafts });
    void get().persist();
  },
  unsubmit: (companyId) => {
    const { game } = get();
    if (!game) return;
    const next = structuredClone(game);
    const c = next.companies.find((x) => x.id === companyId);
    unsubmitDecision(next, companyId);
    const drafts = { ...get().drafts };
    if (c?.decision) drafts[companyId] = structuredClone(c.decision);
    set({ game: next, drafts });
  },

  advance: () => {
    const { game, drafts } = get();
    if (!game || game.finished) return;
    const next = stateForSave(game, drafts);
    const round = next.round;
    advanceRound(next);
    set({
      game: next,
      drafts: {},
      reportRound: round,
      revealedCompanyId: next.config.mode === "hotseat" && get().classroomRole !== "team" ? null : get().revealedCompanyId,
      view: next.finished ? "results" : get().view === "decisions" ? "dashboard" : get().view,
      timerEndsAt: null,
      decisionsTab: "core",
    });
    void get().persist();
  },

  fastForward: () => {
    const { game, drafts } = get();
    if (!game || game.finished) return;
    const next = stateForSave(game, drafts);
    let guard = 0;
    while (!next.finished && guard++ < 50) advanceRound(next);
    set({ game: next, drafts: {}, reportRound: null, view: "results", timerEndsAt: null });
    void get().persist();
  },

  injectEvent: (spec) => {
    const { game } = get();
    if (!game) return;
    const next = structuredClone(game);
    injectCustomEvent(next, spec);
    set({ game: next });
    void get().persist();
  },

  closeReport: () => set({ reportRound: null }),
  openReport: (round) => set({ reportRound: round }),

  toast: (text, kind = "info") => {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, text, kind }] });
    setTimeout(() => get().dismissToast(id), 4_000);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setTimer: (endsAt) => set({ timerEndsAt: endsAt }),
  openLearn: (topic) => set({ view: "learn", learnTopic: topic }),
  setDecisionsTab: (decisionsTab) => set({ decisionsTab }),
  startTour: () => set({ tourStep: 0, reportRound: null }),
  setTourStep: (tourStep) => {
    if (tourStep === null) prefSet("tour-done", "1");
    set({ tourStep });
  },

  saveAs: async (name) => {
    const { game, drafts, classroomRole } = get();
    if (!game) return "";
    const id = newSaveId();
    await writeSave(id, name, stateForSave(game, drafts), classroomRole);
    set({ saveId: id });
    return id;
  },

  persist: async () => {
    const { game, drafts, saveId, classroomRole } = get();
    if (!game || !saveId) return;
    const name = game.config.sessionName || game.companies.filter((c) => !c.isBot).map((c) => c.name).join(", ") || game.config.seed;
    await writeSave(saveId, name, stateForSave(game, drafts), classroomRole);
  },
}));

function schedulePersist(get: () => StoreState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => void get().persist(), 1_500);
}
