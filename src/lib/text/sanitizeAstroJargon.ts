/**
 * Astro/Saju Jargon → Friendly Korean Sanitizer
 *
 * Generic post-pass for any Korean LLM narrative (compatibility,
 * saju, astrology reports) to catch English/한자 jargon leaks and
 * replace with the friendly Korean equivalent. Idempotent — safe to
 * apply multiple times.
 *
 * Used by:
 * - /api/compatibility/narrative-stream (per-chunk + finalize)
 * - saju premium report post-process (additional pass after engine
 *   sanitizer)
 */

const JARGON_REPLACEMENTS: Array<[RegExp, string]> = [
  // English astrology terms (only replace when standalone — not inside
  // a Korean word boundary)
  [/\bSun-Moon\b/g, '태양과 달의 만남'],
  [/\bSun\s*&\s*Moon\b/g, '태양과 달의 만남'],
  [/\bVenus-Mars\b/g, '금성과 화성의 만남'],
  [/\bVenus\s*&\s*Mars\b/g, '금성과 화성의 만남'],
  [/\bsynastry\b/gi, '두 차트의 만남'],
  [/\bcomposite\b/gi, '두 분이 합쳐진 한 사람'],
  [/\btransit\b/gi, '지금 별의 흐름'],
  [/\bconjunction\b/gi, '합'],
  [/\btrine\b/gi, '부드럽게 만나는 자리'],
  [/\bsextile\b/gi, '잔잔히 호응하는 자리'],
  [/\bopposition\b/gi, '정반대로 마주치는 자리'],
  [/\bsquare\b/gi, '팽팽하게 마주치는 자리'],
  [/\baspect\b/gi, '결의 만남'],
  [/\borb\b/gi, '오차 범위'],

  // Standalone planet names — only match if not preceded/followed by Korean
  [/(^|[^가-힣])Sun([^가-힣]|$)/g, '$1태양$2'],
  [/(^|[^가-힣])Moon([^가-힣]|$)/g, '$1달$2'],
  [/(^|[^가-힣])Venus([^가-힣]|$)/g, '$1금성$2'],
  [/(^|[^가-힣])Mars([^가-힣]|$)/g, '$1화성$2'],
  [/(^|[^가-힣])Mercury([^가-힣]|$)/g, '$1수성$2'],
  [/(^|[^가-힣])Jupiter([^가-힣]|$)/g, '$1목성$2'],
  [/(^|[^가-힣])Saturn([^가-힣]|$)/g, '$1토성$2'],
  [/(^|[^가-힣])Uranus([^가-힣]|$)/g, '$1천왕성$2'],
  [/(^|[^가-힣])Neptune([^가-힣]|$)/g, '$1해왕성$2'],
  [/(^|[^가-힣])Pluto([^가-힣]|$)/g, '$1명왕성$2'],
  [/(^|[^가-힣])Chiron([^가-힣]|$)/g, '$1카이런(상처점)$2'],
  [/(^|[^가-힣])Lilith([^가-힣]|$)/g, '$1릴리스(그림자점)$2'],
  [/(^|[^가-힣])Vertex([^가-힣]|$)/g, '$1버텍스(운명점)$2'],
  [/(^|[^가-힣])Juno([^가-힣]|$)/g, '$1주노(결혼점)$2'],
  [/(^|[^가-힣])Vesta([^가-힣]|$)/g, '$1베스타(헌신점)$2'],
  [/(^|[^가-힣])Pallas([^가-힣]|$)/g, '$1팔라스(지혜점)$2'],
  [/(^|[^가-힣])Ceres([^가-힣]|$)/g, '$1케레스(돌봄점)$2'],

  // Korean astrology label collapses
  [/POF\b/g, '행복점'],
  [/MC\b/g, '천정(MC)'],
  [/ASC\b/g, '상승점'],
  [/DSC\b/g, '하강점'],
  [/IC\b/g, '천저(IC)'],
]

/**
 * Apply replacements. Idempotent — re-running won't break already-clean text.
 */
export function sanitizeAstroJargon(text: string): {
  cleaned: string
  replacementsCount: number
} {
  if (!text) return { cleaned: text, replacementsCount: 0 }
  let out = text
  let count = 0
  for (const [pattern, replacement] of JARGON_REPLACEMENTS) {
    const before = out
    out = out.replace(pattern, replacement)
    if (out !== before) count += 1
  }
  return { cleaned: out, replacementsCount: count }
}

/**
 * Returns true when the text still contains uncovered jargon — useful
 * for monitoring/logging the LLM output quality.
 */
export function hasJargonLeak(text: string): boolean {
  const patterns = [
    /\b(Sun|Moon|Venus|Mars|Mercury|Jupiter|Saturn)\b/i,
    /\b(synastry|composite|transit|conjunction|trine|sextile|aspect)\b/i,
    /\b(Chiron|Lilith|Vertex|Juno|Vesta|Pallas|Ceres)\b/i,
  ]
  return patterns.some((p) => p.test(text))
}
