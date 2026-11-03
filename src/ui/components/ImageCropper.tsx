import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { useFmt } from "../i18n";
import { Icon } from "./Icon";
import { SliderField } from "./ui";

/** Size of the crop stage on screen; the output is rendered at `outputSize` from the same framing. */
const VIEW = 260;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export interface ImageCropperProps {
  file: Blob;
  /** Preview mask: a circle for avatars, a rounded square for logos. The output is always the full square. */
  shape: "circle" | "rounded";
  outputSize: number;
  mime: "image/jpeg" | "image/png";
  quality?: number;
  confirmLabel?: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

/**
 * Frames an image before it becomes an avatar or a logo: drag to move, slider or wheel to
 * zoom, rotate in quarter turns. The image always covers the whole square.
 */
export function ImageCropper({ file, shape, outputSize, mime, quality = 0.85, confirmLabel, onConfirm, onCancel }: ImageCropperProps) {
  const f = useFmt();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.onerror = () => setFailed(true);
    im.src = url;
    setZoom(1);
    setRot(0);
    setOff({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const w0 = img?.naturalWidth || 1;
  const h0 = img?.naturalHeight || 1;
  const rotated = rot % 180 !== 0;
  const w = rotated ? h0 : w0;
  const h = rotated ? w0 : h0;
  /** Scale at which the (rotated) image just covers the stage. */
  const base = Math.max(VIEW / w, VIEW / h);
  const s = base * zoom;

  const clampOff = (o: { x: number; y: number }, z = zoom, r = rot) => {
    const rw = r % 180 !== 0 ? h0 : w0;
    const rh = r % 180 !== 0 ? w0 : h0;
    const b = Math.max(VIEW / rw, VIEW / rh) * z;
    const mx = Math.max(0, (rw * b - VIEW) / 2);
    const my = Math.max(0, (rh * b - VIEW) / 2);
    return { x: clamp(o.x, -mx, mx), y: clamp(o.y, -my, my) };
  };
  const changeZoom = (z: number) => {
    const nz = clamp(z, 1, 4);
    setZoom(nz);
    setOff((o) => clampOff(o, nz));
  };
  const rotate = (delta: number) => {
    const nr = (rot + delta + 360) % 360;
    setRot(nr);
    setOff((o) => clampOff(o, zoom, nr));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const d = drag.current;
    setOff(clampOff({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    changeZoom(zoom * (e.deltaY < 0 ? 1.08 : 0.92));
  };

  const confirm = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outputSize, outputSize);
    }
    const k = outputSize / VIEW;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate((VIEW / 2 + off.x) * k, (VIEW / 2 + off.y) * k);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(s * k, s * k);
    ctx.drawImage(img, -w0 / 2, -h0 / 2);
    onConfirm(canvas.toDataURL(mime, quality));
  };

  if (failed) {
    return (
      <div className="cropper">
        <p className="bad small">{f.tx("This image could not be read.", "Impossibile leggere questa immagine.")}</p>
        <button type="button" className="btn sm" onClick={onCancel}>
          {f.tx("Back", "Indietro")}
        </button>
      </div>
    );
  }

  return (
    <div className="cropper" data-testid="cropper">
      <div
        className={`cropper-stage ${shape}`}
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        role="img"
        aria-label={f.tx("Crop preview: drag to move, scroll to zoom", "Anteprima del ritaglio: trascina per spostare, rotella per lo zoom")}
      >
        {img && (
          <img
            src={img.src}
            alt=""
            className="cropper-img"
            draggable={false}
            style={{ width: w0 * s, height: h0 * s, transform: `translate(-50%, -50%) translate(${off.x}px, ${off.y}px) rotate(${rot}deg)` }}
          />
        )}
        <div className="cropper-mask" aria-hidden="true">
          <div className="cropper-hole" />
        </div>
      </div>
      <div className="cropper-controls">
        <SliderField label={f.tx("Zoom", "Zoom")} value={Math.round(zoom * 100)} min={100} max={400} step={2} onChange={(v) => changeZoom(v / 100)} format={(v) => `${v}%`} />
        <div className="row wrap gap-4">
          <button type="button" className="btn sm" onClick={() => rotate(-90)} title={f.tx("Rotate left", "Ruota a sinistra")}>
            <Icon name="RotateCcw" size={14} />
            {f.tx("Rotate", "Ruota")}
          </button>
          <button type="button" className="btn sm" onClick={() => rotate(90)} title={f.tx("Rotate right", "Ruota a destra")}>
            <Icon name="RefreshCcw" size={14} />
          </button>
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => {
              setZoom(1);
              setRot(0);
              setOff({ x: 0, y: 0 });
            }}
          >
            {f.tx("Reset", "Ripristina")}
          </button>
        </div>
        <p className="tiny faint">{f.tx("Drag the picture to frame it. The whole square is kept; the shape shows what will be visible.", "Trascina l'immagine per inquadrarla. Viene conservato tutto il quadrato; la forma mostra cosa sarà visibile.")}</p>
        <div className="row gap-8" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onCancel}>
            {f.tx("Cancel", "Annulla")}
          </button>
          <button type="button" className="btn primary" onClick={confirm} disabled={!img}>
            <Icon name="Check" size={16} />
            {confirmLabel ?? f.tx("Use this image", "Usa questa immagine")}
          </button>
        </div>
      </div>
    </div>
  );
}
