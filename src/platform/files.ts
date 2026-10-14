// Saving and opening files on desktop (Tauri native dialogs) and in the browser.

export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

/** True when the page runs inside another page (for example an online viewer), where printing is unavailable. */
export function isFramed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

interface HostDownloads {
  save(req: { filename: string; data: string }): Promise<unknown>;
}

/** Online viewers that block plain downloads may offer a save capability instead. */
async function hostDownloads(): Promise<HostDownloads | null> {
  const host = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
  if (!host?.use) return null;
  try {
    return (await host.use("downloads")) as HostDownloads | null;
  } catch {
    return null;
  }
}

/** Saves text to a file chosen by the user. Returns false if cancelled. */
export async function saveTextFile(defaultName: string, contents: string, filters: FileFilter[], mime = "application/json"): Promise<boolean> {
  const hosted = await hostDownloads();
  if (hosted) {
    try {
      await hosted.save({ filename: defaultName, data: contents });
      return true;
    } catch (e) {
      console.warn("Save not completed", e);
      return false;
    }
  }
  if (isDesktop()) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await save({ defaultPath: defaultName, filters });
      if (!path) return false;
      await invoke("write_text_file", { path, contents });
      return true;
    } catch (e) {
      console.error("Desktop save failed, falling back to download", e);
    }
  }
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
  return true;
}

/** Lets the user pick one or more text files. Returns [] if cancelled. */
export async function openTextFiles(filters: FileFilter[], multiple = false): Promise<Array<{ name: string; contents: string }>> {
  if (isDesktop()) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");
      const picked = await open({ multiple, filters });
      if (!picked) return [];
      const paths = Array.isArray(picked) ? picked : [picked];
      const out: Array<{ name: string; contents: string }> = [];
      for (const p of paths) {
        const path = typeof p === "string" ? p : String(p);
        const contents = await invoke<string>("read_text_file", { path });
        out.push({ name: path.split(/[\\/]/).pop() ?? path, contents });
      }
      return out;
    } catch (e) {
      console.error("Desktop open failed, falling back to file input", e);
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(",");
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const out = await Promise.all(files.map(async (f) => ({ name: f.name, contents: await f.text() })));
      resolve(out);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}
