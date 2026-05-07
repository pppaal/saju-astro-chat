/**
 * Tiny seeded PRNG for deterministic match-time divinations.
 *
 * Uses xfnv1a → mulberry32 (well-known small JS PRNG construction).
 * Stateless seeding so two clients with the same connectionId+date+activity
 * draw the same tarot cards.
 */

function xfnv1a(str: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
    return (h ^ (h >>> 14)) >>> 0;
  };
}

export interface SeededRandom {
  /** Float in [0, 1) */
  next(): number;
  /** Integer in [0, max) */
  nextInt(max: number): number;
  /** True with given probability */
  chance(probability: number): boolean;
}

export function createSeededRandom(seed: string): SeededRandom {
  const gen = xfnv1a(seed);
  return {
    next() {
      return gen() / 0xffffffff;
    },
    nextInt(max: number) {
      if (max <= 0) {
        return 0;
      }
      return Math.floor((gen() / 0x100000000) * max);
    },
    chance(probability: number) {
      return gen() / 0xffffffff < probability;
    },
  };
}
