// Persistent storage for saved games. Uses IndexedDB (large quota, works in browsers and in
// the Tauri webview) and falls back to localStorage, then to memory.

const DB_NAME = "founders-dilemma";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, string>();

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function kvGet(key: string): Promise<string | null> {
  const v = await idb<string>("readonly", (s) => s.get(key));
  if (typeof v === "string") return v;
  try {
    const ls = localStorage.getItem(`fd:${key}`);
    if (ls !== null) return ls;
  } catch {
    /* ignore */
  }
  return memory.get(key) ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  if (db) {
    const ok = await idb<IDBValidKey>("readwrite", (s) => s.put(value, key));
    if (ok !== undefined) return;
  }
  try {
    localStorage.setItem(`fd:${key}`, value);
    return;
  } catch {
    memory.set(key, value);
  }
}

export async function kvDelete(key: string): Promise<void> {
  await idb("readwrite", (s) => s.delete(key));
  try {
    localStorage.removeItem(`fd:${key}`);
  } catch {
    /* ignore */
  }
  memory.delete(key);
}

/** Small synchronous preferences (language, theme). */
export function prefGet(key: string): string | null {
  try {
    return localStorage.getItem(`fd-pref:${key}`);
  } catch {
    return null;
  }
}

export function prefSet(key: string, value: string): void {
  try {
    localStorage.setItem(`fd-pref:${key}`, value);
  } catch {
    /* ignore */
  }
}
