// Deterministic pseudo-random numbers.
//
// The Swift blueprint used a single LCG shared by every player, which meant that one
// team's choices could change the random draws of every other team. Here every random
// stream is derived from (game seed, round, purpose, entity id), so the same seed always
// produces the same outcome for the same decisions, independently of what others do.

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Normal distribution sample. */
  normal(mean?: number, sd?: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Weighted pick; returns undefined when all weights are zero. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined;
  /** Fisher-Yates shuffle (returns a new array). */
  shuffle<T>(items: readonly T[]): T[];
  /** True when this generator is a deterministic "expected value" generator used for previews. */
  readonly isPreview: boolean;
}

/** cyrb128 string hash -> four 32 bit seeds. */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** sfc32: small, fast, well distributed 32 bit generator. */
class Sfc32 implements Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  readonly isPreview = false;

  constructor(seed: string) {
    [this.a, this.b, this.c, this.d] = cyrb128(seed);
    // Warm up so that similar seeds diverge quickly.
    for (let i = 0; i < 15; i++) this.next();
  }

  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  normal(mean = 0, sd = 1): number {
    // Box-Muller
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined {
    const total = items.reduce((s, it) => s + Math.max(0, weight(it)), 0);
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r < 0) return it;
    }
    return items[items.length - 1];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

/**
 * "Expected value" generator used to preview the outcome of a decision before submitting it.
 * No surprises: chance() is always false, noise is zero, ranges return their midpoint.
 */
class PreviewRng implements Rng {
  readonly isPreview = true;
  next(): number {
    return 0.5;
  }
  range(min: number, max: number): number {
    return (min + max) / 2;
  }
  int(min: number, max: number): number {
    return Math.round((min + max) / 2);
  }
  chance(): boolean {
    return false;
  }
  normal(mean = 0): number {
    return mean;
  }
  pick<T>(items: readonly T[]): T {
    return items[0];
  }
  weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined {
    let best: T | undefined;
    let bestW = 0;
    for (const it of items) {
      const w = weight(it);
      if (w > bestW) {
        best = it;
        bestW = w;
      }
    }
    return best;
  }
  shuffle<T>(items: readonly T[]): T[] {
    return items.slice();
  }
}

export function createRng(...parts: Array<string | number>): Rng {
  return new Sfc32(parts.join("|"));
}

export function createPreviewRng(): Rng {
  return new PreviewRng();
}

/** Generates a short, readable seed such as "LUNA-4821". */
export function randomSeedLabel(): string {
  const words = [
    "AURORA", "BOREAL", "CEDAR", "DELTA", "EMBER", "FALCON", "GALILEO", "HARBOR", "IRIS", "JUNO",
    "KESTREL", "LUNA", "MISTRAL", "NOVA", "ORBIT", "PIXEL", "QUASAR", "RIVIERA", "SIRIO", "TORRE",
    "ULISSE", "VESPA", "ZEFIRO",
  ];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}-${n}`;
}
