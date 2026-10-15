import { useEffect, useId, useState, type DragEvent } from "react";
import {
  ACCESSORIES,
  AVATAR_BG,
  AVATAR_HAIR_COLORS,
  AVATAR_SKIN,
  EYE_STYLES,
  HAIR_STYLES,
  MOUTH_STYLES,
  avatarFromSeed,
  randomAvatar,
  type AvatarTraits,
  type FounderAvatar,
} from "../../core";
import { fileToSquareDataUrl, imageFromTransfer, pickImageFile } from "../../platform/images";
import { useFmt } from "../i18n";
import { useStore } from "../store";
import { Icon } from "./Icon";
import { Modal } from "./ui";

const INK = "#1d1d1f";

/** The cartoon face drawn from traits (SVG, scales to any size). */
export function AvatarFace({ traits, size = 48, className }: { traits: AvatarTraits; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const bg = AVATAR_BG[traits.bg] ?? AVATAR_BG[0];
  const skin = AVATAR_SKIN[traits.skin] ?? AVATAR_SKIN[0];
  const hair = AVATAR_HAIR_COLORS[traits.hairColor] ?? AVATAR_HAIR_COLORS[0];
  const style = HAIR_STYLES[traits.hair] ?? "none";
  const eyes = EYE_STYLES[traits.eyes] ?? "round";
  const mouth = MOUTH_STYLES[traits.mouth] ?? "smile";
  const acc = ACCESSORIES[traits.accessory] ?? "none";
  const capClip = `cap-${id}`;
  const showCap = style !== "none" && style !== "mohawk";
  const capY = style === "short" ? 40 : style === "side" ? 38 : 39;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true" style={{ borderRadius: "50%", flex: "none", display: "block" }}>
      <defs>
        <clipPath id={capClip}>
          <rect x="0" y="0" width="100" height={capY} />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill={bg} />
      {style === "long" && <rect x="25" y="28" width="50" height="52" rx="18" fill={hair} />}
      {style === "bun" && <circle cx="50" cy="19" r="8" fill={hair} />}
      {style === "mohawk" && <rect x="44" y="10" width="12" height="34" rx="5" fill={hair} />}
      <path d="M16,100 C16,80 31,71 50,71 C69,71 84,80 84,100 Z" fill="#f5f5f7" opacity="0.92" />
      <rect x="43" y="56" width="14" height="16" fill={skin} />
      <circle cx="28" cy="45" r="4.5" fill={skin} />
      <circle cx="72" cy="45" r="4.5" fill={skin} />
      <circle cx="50" cy="43" r="22" fill={skin} />
      {showCap && <circle cx="50" cy="43" r="22.5" fill={hair} clipPath={`url(#${capClip})`} />}
      {style === "side" && <path d="M29,40 L60,22 L71,40 Z" fill={hair} />}
      {style === "curly" && (
        <>
          <circle cx="31" cy="34" r="6" fill={hair} />
          <circle cx="40" cy="25" r="6.5" fill={hair} />
          <circle cx="50" cy="21" r="7" fill={hair} />
          <circle cx="60" cy="25" r="6.5" fill={hair} />
          <circle cx="69" cy="34" r="6" fill={hair} />
        </>
      )}
      {style === "short" && (
        <>
          <rect x="27" y="38" width="4" height="10" fill={hair} />
          <rect x="69" y="38" width="4" height="10" fill={hair} />
        </>
      )}
      {eyes === "round" && (
        <>
          <circle cx="42" cy="43" r="2.7" fill={INK} />
          <circle cx="58" cy="43" r="2.7" fill={INK} />
        </>
      )}
      {eyes === "happy" && (
        <>
          <path d="M38,44 Q42,38.5 46,44" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M54,44 Q58,38.5 62,44" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )}
      {eyes === "wink" && (
        <>
          <circle cx="42" cy="43" r="2.7" fill={INK} />
          <path d="M54,43 L62,43" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {eyes === "sleepy" && (
        <>
          <path d="M38,42 Q42,45 46,42" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M54,42 Q58,45 62,42" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )}
      {mouth === "smile" && <path d="M43,52 Q50,58.5 57,52" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {mouth === "grin" && <path d="M42,51 Q50,61 58,51 Z" fill="#fff" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />}
      {mouth === "neutral" && <path d="M44,53.5 L56,53.5" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />}
      {mouth === "open" && <ellipse cx="50" cy="54" rx="4" ry="5" fill="#7a2d2d" />}
      {acc === "glasses" && (
        <g stroke={INK} strokeWidth="1.8" fill="none">
          <circle cx="42" cy="43" r="6.5" />
          <circle cx="58" cy="43" r="6.5" />
          <path d="M48.5,43 L51.5,43" />
        </g>
      )}
      {acc === "sunglasses" && (
        <g fill="#222" stroke="#111" strokeWidth="1">
          <rect x="34.5" y="38" width="14" height="9" rx="3" />
          <rect x="51.5" y="38" width="14" height="9" rx="3" />
          <path d="M48.5,42 L51.5,42" stroke="#111" strokeWidth="2" />
        </g>
      )}
      {acc === "headphones" && (
        <g>
          <path d="M26,43 A24,24 0 0 1 74,43" stroke="#2b2b2e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <rect x="22" y="39" width="8" height="13" rx="3" fill="#2b2b2e" />
          <rect x="70" y="39" width="8" height="13" rx="3" fill="#2b2b2e" />
        </g>
      )}
      {acc === "cap" && (
        <g>
          <path d="M27,38 A23,23 0 0 1 73,38 Z" fill="#2b3a55" />
          <rect x="24" y="36" width="52" height="5" rx="2.5" fill="#1d2a40" />
        </g>
      )}
      {acc === "earring" && <circle cx="72" cy="50" r="2.2" fill="#f4c542" />}
    </svg>
  );
}

/** A founder's avatar: photo, cartoon, or a cartoon derived from the name when none was chosen. */
export function Avatar({ avatar, name, size = 40, className, title }: { avatar: FounderAvatar | null | undefined; name: string; size?: number; className?: string; title?: string }) {
  if (avatar?.kind === "photo") {
    return <img src={avatar.data} alt={name} title={title ?? name} width={size} height={size} className={className} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flex: "none", display: "block" }} />;
  }
  const traits = avatar?.kind === "traits" ? avatar.traits : avatarFromSeed(name || "founder");
  return (
    <span title={title ?? name} className={className} style={{ display: "inline-flex", flex: "none" }}>
      <AvatarFace traits={traits} size={size} />
    </span>
  );
}

/** A row of overlapping founder avatars. */
export function AvatarStack({ founders, size = 28, max = 4 }: { founders: Array<{ name: string; avatar: FounderAvatar | null | undefined; active?: boolean }>; size?: number; max?: number }) {
  const shown = founders.slice(0, max);
  return (
    <span className="avatar-stack" style={{ height: size }}>
      {shown.map((f, i) => (
        <span key={i} className="avatar-stack-item" style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: shown.length - i, opacity: f.active === false ? 0.45 : 1 }}>
          <Avatar avatar={f.avatar} name={f.name} size={size} />
        </span>
      ))}
    </span>
  );
}

function Swatches({ colors, value, onChange, label }: { colors: string[]; value: number; onChange: (i: number) => void; label: string }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="row wrap gap-4">
        {colors.map((c, i) => (
          <button key={c} type="button" className={`swatch ${i === value ? "on" : ""}`} style={{ background: c }} onClick={() => onChange(i)} aria-label={`${label} ${i + 1}`} aria-pressed={i === value} />
        ))}
      </div>
    </div>
  );
}

function TraitPicker({ label, count, value, onChange, render }: { label: string; count: number; value: number; onChange: (i: number) => void; render: (i: number) => AvatarTraits }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="row wrap gap-4">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" className={`trait-pick ${i === value ? "on" : ""}`} onClick={() => onChange(i)} aria-pressed={i === value} aria-label={`${label} ${i + 1}`}>
            <AvatarFace traits={render(i)} size={40} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Builds a cartoon avatar trait by trait, or loads a photo (file picker, drag and drop, paste). */
export function AvatarBuilder({ avatar, name, onChange, onClose }: { avatar: FounderAvatar | null; name: string; onChange: (a: FounderAvatar | null) => void; onClose: () => void }) {
  const f = useFmt();
  const toast = useStore((s) => s.toast);
  const [traits, setTraits] = useState<AvatarTraits>(avatar?.kind === "traits" ? avatar.traits : avatarFromSeed(name || "founder"));
  const [photo, setPhoto] = useState<string | null>(avatar?.kind === "photo" ? avatar.data : null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<AvatarTraits>) => {
    setPhoto(null);
    setTraits({ ...traits, ...patch });
  };

  const usePhoto = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await fileToSquareDataUrl(file, { size: 160, mime: "image/jpeg", quality: 0.82 });
      setPhoto(data);
    } catch {
      toast(f.tx("This image could not be read.", "Impossibile leggere questa immagine."), "bad");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFromTransfer(e.clipboardData);
      if (file) {
        e.preventDefault();
        void usePhoto(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void usePhoto(imageFromTransfer(e.dataTransfer));
  };

  const current: FounderAvatar = photo ? { kind: "photo", data: photo } : { kind: "traits", traits };

  return (
    <Modal
      wide
      title={`${f.tx("Avatar of", "Avatar di")} ${name || f.tx("the founder", "fondatore")}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            {f.tx("Cancel", "Annulla")}
          </button>
          <button
            className="btn primary"
            onClick={() => {
              onChange(current);
              onClose();
            }}
          >
            <Icon name="Check" size={16} />
            {f.tx("Use this avatar", "Usa questo avatar")}
          </button>
        </>
      }
    >
      <div className="avatar-builder">
        <div className="avatar-builder-preview">
          <div className="avatar-preview-ring">
            <Avatar avatar={current} name={name} size={168} />
          </div>
          <div className="row wrap gap-4" style={{ justifyContent: "center" }}>
            <button className="btn sm" onClick={() => set(randomAvatar())}>
              <Icon name="Shuffle" size={14} />
              {f.tx("Surprise me", "Sorprendimi")}
            </button>
            <button className="btn sm" disabled={busy} onClick={() => void pickImageFile().then(usePhoto)}>
              <Icon name="Camera" size={14} />
              {f.tx("Upload a photo", "Carica una foto")}
            </button>
            {photo && (
              <button className="btn sm ghost" onClick={() => setPhoto(null)}>
                <Icon name="Eraser" size={14} />
                {f.tx("Back to cartoon", "Torna al cartoon")}
              </button>
            )}
          </div>
          <div
            className={`dropzone ${over ? "over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
          >
            <Icon name="ImagePlus" size={18} />
            <span className="small">{busy ? f.tx("Processing…", "Elaborazione…") : f.tx("Drop a photo here or paste it (Ctrl+V). It is cropped to a square and kept small.", "Trascina qui una foto o incollala (Ctrl+V). Viene ritagliata in quadrato e tenuta piccola.")}</span>
          </div>
        </div>
        <div className="avatar-builder-traits col gap-12">
          <Swatches label={f.tx("Background", "Sfondo")} colors={AVATAR_BG} value={traits.bg} onChange={(bg) => set({ bg })} />
          <Swatches label={f.tx("Skin", "Pelle")} colors={AVATAR_SKIN} value={traits.skin} onChange={(skin) => set({ skin })} />
          <TraitPicker label={f.tx("Hair", "Capelli")} count={HAIR_STYLES.length} value={traits.hair} onChange={(hair) => set({ hair })} render={(i) => ({ ...traits, hair: i, accessory: 0 })} />
          <Swatches label={f.tx("Hair colour", "Colore dei capelli")} colors={AVATAR_HAIR_COLORS} value={traits.hairColor} onChange={(hairColor) => set({ hairColor })} />
          <TraitPicker label={f.tx("Eyes", "Occhi")} count={EYE_STYLES.length} value={traits.eyes} onChange={(eyes) => set({ eyes })} render={(i) => ({ ...traits, eyes: i, accessory: 0 })} />
          <TraitPicker label={f.tx("Mouth", "Bocca")} count={MOUTH_STYLES.length} value={traits.mouth} onChange={(mouth) => set({ mouth })} render={(i) => ({ ...traits, mouth: i })} />
          <TraitPicker label={f.tx("Accessory", "Accessorio")} count={ACCESSORIES.length} value={traits.accessory} onChange={(accessory) => set({ accessory })} render={(i) => ({ ...traits, accessory: i })} />
        </div>
      </div>
    </Modal>
  );
}
