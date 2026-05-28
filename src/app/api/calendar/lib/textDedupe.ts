/**
 * Shared text deduplication for calendar narrative output.
 *
 * The same NFKC-lowercase-punctuation-strip normalizer plus 16-char
 * substring overlap detector was copy-pasted into three of the
 * calendar lib helpers. Promoted here so a tuning change to the
 * fuzzy-overlap threshold or the punctuation regex doesn't have to
 * be applied (and re-debugged) in three files at once.
 *
 * Note: `calendarRecommendationSupport.ts` intentionally keeps a
 * local, simpler variant (looser normalization, exact-key matching
 * only). That one is *not* a duplicate of this — see the comment
 * there for why recommendation text wants exact-key dedup instead.
 */

export function normalizeTextForDedupe(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function dedupeTexts(values: Array<string | null | undefined>): string[] {
  const out: string[] = []
  const keys: string[] = []
  for (const value of values) {
    const trimmed = String(value || '').trim()
    if (!trimmed) continue
    const key = normalizeTextForDedupe(trimmed)
    if (!key) continue
    const hasDuplicate = keys.some((existing) => {
      if (existing === key) return true
      // Substring overlap only kicks in once both sides have enough
      // content for a true near-duplicate — short strings (e.g. tags,
      // single nouns) would over-collapse if every substring counted.
      const canCompareInclusion = existing.length >= 16 && key.length >= 16
      return canCompareInclusion && (existing.includes(key) || key.includes(existing))
    })
    if (hasDuplicate) continue
    keys.push(key)
    out.push(trimmed)
  }
  return out
}
