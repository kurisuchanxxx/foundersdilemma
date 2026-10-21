// Founder avatars: a small set of cartoon traits that can be mixed by hand, generated from a
// name, or replaced by an uploaded photo. Everything is plain data so saves stay small.
import type { AvatarTraits, FounderAvatar } from "../types";

export const AVATAR_BG = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9", "#e66767", "#5e5ce6", "#0ea5a4", "#64748b", "#f59e0b", "#111827"];
export const AVATAR_SKIN = ["#f6d7c3", "#eab896", "#d49a6a", "#b47a4c", "#8d5a3a", "#5c3b25"];
export const AVATAR_HAIR_COLORS = ["#2b2118", "#5a3a22", "#a66a2c", "#e3c16f", "#c7c7c7", "#d94a4a", "#5b6cff", "#2ecc71"];
export const HAIR_STYLES = ["none", "buzz", "short", "side", "curly", "long", "bun", "mohawk"] as const;
export const EYE_STYLES = ["round", "happy", "wink", "sleepy"] as const;
export const MOUTH_STYLES = ["smile", "grin", "neutral", "open"] as const;
export const ACCESSORIES = ["none", "glasses", "sunglasses", "headphones", "cap", "earring"] as const;

/** FNV-1a 32 bit hash, used to derive stable "random" traits from a name. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function avatarFromSeed(seed: string): AvatarTraits {
  const h = hashString(seed || "founder");
  const pick = (n: number, shift: number) => ((h >>> shift) ^ (h << (shift % 7))) % n;
  return {
    bg: Math.abs(pick(AVATAR_BG.length, 0)),
    skin: Math.abs(pick(AVATAR_SKIN.length, 4)),
    hair: Math.abs(pick(HAIR_STYLES.length, 8)),
    hairColor: Math.abs(pick(AVATAR_HAIR_COLORS.length, 12)),
    eyes: Math.abs(pick(EYE_STYLES.length, 16)),
    mouth: Math.abs(pick(MOUTH_STYLES.length, 20)),
    accessory: Math.abs(pick(ACCESSORIES.length, 24)),
  };
}

export function randomAvatar(rand: () => number = Math.random): AvatarTraits {
  const r = (n: number) => Math.min(n - 1, Math.floor(rand() * n));
  return {
    bg: r(AVATAR_BG.length),
    skin: r(AVATAR_SKIN.length),
    hair: r(HAIR_STYLES.length),
    hairColor: r(AVATAR_HAIR_COLORS.length),
    eyes: r(EYE_STYLES.length),
    mouth: r(MOUTH_STYLES.length),
    accessory: r(ACCESSORIES.length),
  };
}

export function defaultAvatar(seed: string): FounderAvatar {
  return { kind: "traits", traits: avatarFromSeed(seed) };
}

/** Clamps every trait index into its range (saves edited by hand, older versions). */
export function sanitizeTraits(t: Partial<AvatarTraits> | null | undefined, seed = "founder"): AvatarTraits {
  const base = avatarFromSeed(seed);
  const fix = (v: unknown, n: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(n - 1, Math.max(0, Math.floor(v))) : fallback);
  return {
    bg: fix(t?.bg, AVATAR_BG.length, base.bg),
    skin: fix(t?.skin, AVATAR_SKIN.length, base.skin),
    hair: fix(t?.hair, HAIR_STYLES.length, base.hair),
    hairColor: fix(t?.hairColor, AVATAR_HAIR_COLORS.length, base.hairColor),
    eyes: fix(t?.eyes, EYE_STYLES.length, base.eyes),
    mouth: fix(t?.mouth, MOUTH_STYLES.length, base.mouth),
    accessory: fix(t?.accessory, ACCESSORIES.length, base.accessory),
  };
}
