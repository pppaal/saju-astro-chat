// Rule-based plain-Korean reading.
//
// The panel had clean evidence (사주 근거 / 점성 근거 / 활동 점수 /
// 좋은 시간 / 조언) but the user said "사용자가 쉽게 읽을 수 있어야
// 한다" — they want a *fortune-teller voice* that turns the data into
// 2-3 sentences of direct advice. AI 풀이 does this for premium; this
// module gives free users the same shape, generated from the deterministic
// engine output without a Claude call.
//
// Input: the same fields the panel already has.
// Output: 2-3 sentence Korean paragraph.

interface PlainReadingInput {
  grade: number              // 0..4
  score: number              // 0..100
  ganzhi?: string            // 일주
  cycleNarrative?: string    // already plain-Korean cycle summary
  topGoodActivity?: { label: string; score: number } | null
  topBadActivity?: { label: string; score: number } | null
  bestTime?: string          // first item from bestTimes[]
  topAdvice?: string         // first item from recommendations[]
  topWarning?: string        // first item from warnings[]
  retrogradePlanets?: string[]
  /** Tightest transit aspect (≤1° orb) for narrative weaving. */
  topTransit?: {
    transitPlanet: string
    natalPoint: string
    aspect: string
    orb: number
  } | null
}

const PLANET_KO_PLAIN: Record<string, string> = {
  Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
  Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성',
}
const ASPECT_PHRASE_KO: Record<string, string> = {
  conjunction: '합쳐지는 각도',
  trine: '받쳐주는 각도',
  sextile: '도와주는 각도',
  square: '견제하는 각도',
  opposition: '맞서는 각도',
}

const GRADE_OPENERS: Record<number, string> = {
  0: '오늘은 결정이 잘 풀리는 날이에요',
  1: '오늘은 손이 가벼운 날이에요',
  2: '오늘은 무난하게 흘러가는 날이에요',
  3: '오늘은 한 박자 늦추는 게 좋은 날이에요',
  4: '오늘은 자제하고 점검에 집중하는 게 좋은 날이에요',
}

export function buildPlainReading(input: PlainReadingInput): string {
  const { grade, score, topGoodActivity, topBadActivity, bestTime, topAdvice, topWarning, retrogradePlanets, cycleNarrative, topTransit } = input
  const opener = GRADE_OPENERS[grade] || '오늘은 평이한 흐름이에요'
  const sentences: string[] = []

  // 1) Opener with concrete strongest activity
  if (topGoodActivity && topGoodActivity.score >= 60) {
    sentences.push(
      `${opener}. 특히 ${topGoodActivity.label} 쪽 흐름이 ${topGoodActivity.score}점으로 받쳐주니, 이 영역에서 한 발 내딛기 좋아요.`
    )
  } else if (topBadActivity && topBadActivity.score <= 35) {
    sentences.push(
      `${opener}. ${topBadActivity.label} 관련해서는 점수가 ${topBadActivity.score}점으로 낮으니, 큰 결정은 다른 날로 미루는 게 안전합니다.`
    )
  } else {
    sentences.push(`${opener}.`)
  }

  // 2) Best time + first advice (separate sentences for natural flow)
  if (bestTime) sentences.push(`핵심 일정은 ${bestTime} 사이에 잡으면 결이 살아나요.`)
  if (topAdvice) {
    const cleaned = topAdvice.trim().replace(/^[\s·]+/, '').replace(/[.!?]+$/, '') + '.'
    sentences.push(cleaned)
  }

  // 3) Strong transit aspect — tightest aspect under 1.5° orb gets woven
  // into the prose because that's a distinctive cosmic signature for
  // the day, not just generic transit noise.
  if (topTransit && topTransit.orb <= 1.5) {
    const planetKo = PLANET_KO_PLAIN[topTransit.transitPlanet] || topTransit.transitPlanet
    const natalKo = PLANET_KO_PLAIN[topTransit.natalPoint] || topTransit.natalPoint
    const aspectKo = ASPECT_PHRASE_KO[topTransit.aspect] || topTransit.aspect
    const flavor =
      topTransit.aspect === 'trine' || topTransit.aspect === 'sextile'
        ? '결이 부드러워지는 신호예요'
        : topTransit.aspect === 'square' || topTransit.aspect === 'opposition'
          ? '긴장과 압박이 들어오는 신호예요'
          : '큰 흐름이 합쳐지는 시점이에요'
    sentences.push(
      `점성으로는 ${planetKo}이 본명 ${natalKo}에 ${aspectKo} (오브 ${topTransit.orb.toFixed(1)}°) — ${flavor}.`
    )
  }

  // 4) Warning / retrograde / cycle as a closing nudge
  const closing: string[] = []
  if (grade >= 3 && topWarning) {
    closing.push(topWarning.replace(/\.$/, ''))
  }
  if (retrogradePlanets && retrogradePlanets.length > 0) {
    const planets = retrogradePlanets
      .map((p) =>
        p === 'Mercury' ? '수성' : p === 'Venus' ? '금성' : p === 'Mars' ? '화성' : p
      )
      .filter(Boolean)
    if (planets.length > 0) {
      closing.push(`${planets.join('·')} 역행 중이라 계약·통신·일정은 한 번 더 점검하세요`)
    }
  }
  if (closing.length === 0 && cycleNarrative) {
    // Strip technical bits; keep a short hint.
    const short = cycleNarrative.split('/')[0]?.replace(/\s*흐름이.*$/, '').trim()
    if (short) closing.push(`${short} 결이 강한 날입니다`)
  }
  if (closing.length > 0) sentences.push(closing.join('. ') + '.')

  // Score footnote (small, factual)
  return sentences.join(' ').replace(/\s{2,}/g, ' ').trim() + ` (점수 ${score}/100)`
}

/**
 * Pick the strongest / weakest activity from the activityScores object
 * for use in buildPlainReading.
 */
export function pickTopActivities(
  activityScores: Record<string, number | undefined> | undefined
): { top: { label: string; score: number } | null; bottom: { label: string; score: number } | null } {
  if (!activityScores) return { top: null, bottom: null }
  const labels: Record<string, string> = {
    marriage: '결혼·관계',
    career: '커리어·업무',
    investment: '투자·재물',
    moving: '이사·이동',
    surgery: '의료·시술',
    study: '학업·자격',
  }
  const items = Object.entries(activityScores)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => ({ label: labels[k] || k, score: v as number }))
  if (items.length === 0) return { top: null, bottom: null }
  items.sort((a, b) => b.score - a.score)
  return { top: items[0], bottom: items[items.length - 1] }
}
