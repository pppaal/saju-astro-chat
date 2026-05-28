/**
 * Return a new array with the elements of `input` in random order.
 *
 * Uses the textbook Fisher–Yates shuffle, which is unbiased: every
 * permutation has exactly 1/n! probability of being produced.
 *
 * Replaces the `[...arr].sort(() => Math.random() - 0.5)` pattern that
 * was sitting in a couple of call sites. That pattern is biased — the
 * V8 sort algorithm is not even guaranteed to evaluate the comparator
 * for every adjacent pair, so the resulting distribution depends on the
 * engine's sort internals rather than the underlying RNG. Worst case
 * documented bias for Chrome's TimSort is the first element appearing
 * in its original position ~3x more often than the others, which is a
 * very visible UX problem on a small deck of cards.
 */
export function shuffleInPlace<T>(input: T[]): T[] {
  for (let i = input.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[input[i], input[j]] = [input[j], input[i]]
  }
  return input
}

/** Non-mutating variant — returns a freshly-shuffled copy. */
export function shuffle<T>(input: readonly T[]): T[] {
  return shuffleInPlace([...input])
}
