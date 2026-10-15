// Small image helpers for avatars and logos: pick a file, read it from a drop or paste, and
// downscale it to a square data URL so it fits comfortably in saves and classroom files.

export interface SquareImageOptions {
  size?: number;
  mime?: "image/jpeg" | "image/png";
  quality?: number;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unreadable image"));
    };
    img.src = url;
  });
}

/** Center-crops an image to a square and returns it as a compact data URL. */
export async function fileToSquareDataUrl(blob: Blob, opts: SquareImageOptions = {}): Promise<string> {
  const size = opts.size ?? 160;
  const mime = opts.mime ?? "image/jpeg";
  const quality = opts.quality ?? 0.82;
  const img = await loadImage(blob);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("Empty image");
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL(mime, quality);
}

/** Opens the browser's file picker for one image. Resolves null when cancelled. */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);
    let settled = false;
    const done = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };
    input.onchange = () => done(input.files?.[0] ?? null);
    window.addEventListener("focus", () => setTimeout(() => done(input.files?.[0] ?? null), 1500), { once: true });
    input.click();
  });
}

/** The first image file in a drop or paste event, if any. */
export function imageFromTransfer(dt: DataTransfer | null | undefined): File | null {
  if (!dt) return null;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  for (const f of Array.from(dt.files ?? [])) if (f.type.startsWith("image/")) return f;
  return null;
}
