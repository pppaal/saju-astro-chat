/**
 * Couple Tagline — derive a single-sentence headline for the report.
 * Plain Korean, no jargon. Picks the strongest "결" signal from the
 * fusion + saju data so each couple gets something unique.
 *
 * Deterministic (no LLM) so it shows immediately above the dashboard
 * without waiting for the Sonnet stream.
 */

interface TaglineInput {
  overallScore: number
  sajuScore?: number | null
  astrologyScore?: number | null
  crossScore?: number | null
  fusion?: {
    dayMasterHarmony?: number | null
    sunMoonHarmony?: number | null
    venusMarsSynergy?: number | null
    intellectualAlignment?: number | null
    spiritualConnection?: number | null
  } | null
}

export function buildCoupleTagline(input: TaglineInput): {
  headline: string
  subline: string
} {
  const { overallScore, sajuScore, astrologyScore, crossScore, fusion } = input

  const vm = fusion?.venusMarsSynergy ?? 0
  const sm = fusion?.sunMoonHarmony ?? 0
  const dm = fusion?.dayMasterHarmony ?? 0
  const intel = fusion?.intellectualAlignment ?? 0
  const spirit = fusion?.spiritualConnection ?? 0
  const cross = crossScore ?? 0
  const saju = sajuScore ?? 0
  const astro = astrologyScore ?? 0

  // Find the dominant signal
  const signals: Array<{ type: string; score: number }> = [
    { type: 'venusMars', score: vm },
    { type: 'sunMoon', score: sm },
    { type: 'dayMaster', score: dm },
    { type: 'intellectual', score: intel },
    { type: 'spiritual', score: spirit },
  ]
  signals.sort((a, b) => b.score - a.score)
  const top = signals[0]
  const dominant = top.score >= 70 ? top.type : null

  // Cross signal — do saju + astro agree?
  const sajuAstroAligned =
    cross >= 70 || (saju >= 70 && astro >= 70 && Math.abs(saju - astro) < 12)
  const sajuAstroDiverge = cross > 0 && cross < 50

  // === Headline (1 sentence, ~20-35 chars) ===
  let headline = ''
  if (overallScore >= 85) {
    if (dominant === 'venusMars') headline = '첫인상부터 강하게 끌리는 결이에요'
    else if (dominant === 'sunMoon') headline = '마음이 같은 곳을 향하는 결이에요'
    else if (dominant === 'dayMaster') headline = '본성이 자연스럽게 맞아 들어가는 결이에요'
    else if (dominant === 'intellectual') headline = '대화로 깊어지는 결이에요'
    else if (dominant === 'spiritual') headline = '같은 세계관을 공유하는 결이에요'
    else headline = '여러 면에서 잘 맞아 떨어지는 결이에요'
  } else if (overallScore >= 70) {
    if (dominant === 'venusMars') headline = '끌림이 강하고 케미가 좋은 결이에요'
    else if (dominant === 'sunMoon') headline = '감정이 잘 통하는 결이에요'
    else if (dominant === 'dayMaster') headline = '본성이 잘 맞는 결이에요'
    else if (dominant === 'intellectual') headline = '대화 합이 좋은 결이에요'
    else if (sajuAstroAligned) headline = '사주와 별이 같은 방향을 가리키는 결이에요'
    else headline = '안정적으로 좋은 결이에요'
  } else if (overallScore >= 55) {
    if (vm >= 70 && dm < 55) headline = '끌림은 강한데 본성이 다른 결이에요'
    else if (intel >= 70 && sm < 55) headline = '대화는 잘 통해도 감정 결은 다른 자리예요'
    else if (sajuAstroDiverge) headline = '사주와 별이 조금 다른 이야기를 하는 결이에요'
    else headline = '맞춰가면 좋아질 수 있는 결이에요'
  } else {
    if (vm >= 65) headline = '끌림은 있지만 어려움이 있는 결이에요'
    else headline = '서로 다른 결을 인정하는 데서 시작하는 자리예요'
  }

  // === Subline (~30-50 chars) — pragmatic context ===
  let subline = ''
  if (overallScore >= 75 && sajuAstroAligned) {
    subline = '동양과 서양 모두 좋은 흐름으로 같이 봅니다'
  } else if (overallScore >= 75) {
    subline = '잘 맞는 부분을 키워가면 더 깊어지는 자리'
  } else if (overallScore >= 60) {
    subline = '차이점을 의식적으로 다루면 단단해지는 결'
  } else if (overallScore >= 45) {
    subline = '솔직한 대화와 서로 인정이 핵심인 자리'
  } else {
    subline = '시간을 두고 천천히 보는 편이 안전해요'
  }

  return { headline, subline }
}
