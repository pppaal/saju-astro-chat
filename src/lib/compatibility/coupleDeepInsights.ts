/**
 * Couple Deep Insights
 *
 * Translate the rich saju + astro + fusion data we already compute into
 * concrete plain-Korean answers users actually want:
 * - 왜 서로 끌리는지 / 왜 잘 맞고 안 맞는지
 * - 그 사람 이상형 (Venus·Mars·사주 십성 패턴)
 * - 결혼·약속 준비도
 * - 관계 지속력 (longevity factors)
 *
 * No LLM — all derived from the deterministic analysis output we already
 * have. Built to be cheap (no extra ephem calls).
 */

import type { SajuProfile, AstrologyProfile } from './cosmicCompatibility'
import type { ExtendedAstrologyProfile } from './astrology/comprehensive'

// ============================================================
// Sign-based aspect helpers (re-stated for module independence)
// ============================================================

const ZODIAC = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

function signDistance(s1?: string, s2?: string): number {
  if (!s1 || !s2) return -1
  const i1 = ZODIAC.indexOf(s1 as (typeof ZODIAC)[number])
  const i2 = ZODIAC.indexOf(s2 as (typeof ZODIAC)[number])
  if (i1 < 0 || i2 < 0) return -1
  const diff = Math.abs(i1 - i2) % 12
  return Math.min(diff, 12 - diff)
}

const ELEMENT_GENERATES: Record<string, string> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
}
const ELEMENT_CONTROLS: Record<string, string> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
}

function elementRel(a?: string, b?: string): 'support' | 'same' | 'drain' | 'control' | 'controlled' | null {
  if (!a || !b) return null
  const A = a.toLowerCase()
  const B = b.toLowerCase()
  if (A === B) return 'same'
  if (ELEMENT_GENERATES[B] === A) return 'support' // B generates A
  if (ELEMENT_GENERATES[A] === B) return 'drain' // A generates B
  if (ELEMENT_CONTROLS[A] === B) return 'control' // A controls B
  if (ELEMENT_CONTROLS[B] === A) return 'controlled' // B controls A
  return null
}

// ============================================================
// Ideal type maps (Venus → emotional/relational; Mars → physical/energy)
// ============================================================

const VENUS_IDEAL: Record<string, string> = {
  Aries: '독립적이고 솔직한 사람, 리드해주는 사람',
  Taurus: '안정적이고 신뢰할 수 있는 사람, 감각적인 사람',
  Gemini: '재치있고 대화가 끊이지 않는 사람',
  Cancer: '정서적으로 안전하고 보호적인 사람',
  Leo: '당당하고 빛나는 사람, 표현이 풍부한 사람',
  Virgo: '성실하고 세심하며 실용적인 사람',
  Libra: '조화롭고 우아하며 매너 좋은 사람',
  Scorpio: '깊이 있고 강렬한 사람, 진심 있는 사람',
  Sagittarius: '자유롭고 모험적인 사람, 시야 넓은 사람',
  Capricorn: '성숙하고 책임감 있는 사람, 야망 있는 사람',
  Aquarius: '독특하고 지적이며 자유로운 사람',
  Pisces: '감수성 깊고 다정한 사람, 영적인 사람',
}

const MARS_DRIVE: Record<string, string> = {
  Aries: '직접적이고 활동적인',
  Taurus: '안정적이고 감각적인',
  Gemini: '다재다능하고 빠른',
  Cancer: '보호적이고 헌신적인',
  Leo: '카리스마 있고 당당한',
  Virgo: '꼼꼼하고 실용적인',
  Libra: '조화롭고 외교적인',
  Scorpio: '깊고 강렬한',
  Sagittarius: '자유롭고 모험적인',
  Capricorn: '책임감 있고 끈기 있는',
  Aquarius: '독립적이고 혁신적인',
  Pisces: '직관적이고 부드러운',
}

const SUN_PERSONALITY: Record<string, string> = {
  Aries: '추진력과 솔직함',
  Taurus: '안정감과 끈기',
  Gemini: '재치와 다양성',
  Cancer: '따뜻함과 헌신',
  Leo: '당당함과 카리스마',
  Virgo: '성실함과 세심함',
  Libra: '조화와 균형 감각',
  Scorpio: '깊이와 집중력',
  Sagittarius: '자유로움과 비전',
  Capricorn: '책임감과 야망',
  Aquarius: '독립성과 통찰',
  Pisces: '감수성과 직관',
}

// ============================================================
// Public types
// ============================================================

export interface IdealTypeMatch {
  personIndex: 1 | 2
  partnerIndex: 1 | 2
  seeks: string // what this person looks for
  partnerActually: string // partner's actual personality signature
  matchLevel: 'strong' | 'partial' | 'weak'
  note: string
}

export interface MarriageReadiness {
  score: number // 0-100
  band: 'high' | 'medium' | 'low'
  bestWindow: string | null
  sajuSignal: string
  astroSignal: string
  summary: string
}

export interface LongevityAssessment {
  score: number // 0-100
  band: 'strong' | 'medium' | 'fragile'
  positive: string[]
  cautionary: string[]
  summary: string
}

export interface CoupleDeepInsights {
  attractionReasons: string[]
  whyItWorks: string[]
  frictionPoints: string[]
  idealMatch: IdealTypeMatch[]
  marriage: MarriageReadiness
  longevity: LongevityAssessment
}

// ============================================================
// Implementation
// ============================================================

interface DeepInsightInput {
  p1Saju: SajuProfile
  p2Saju: SajuProfile
  p1Astro: AstrologyProfile | ExtendedAstrologyProfile
  p2Astro: AstrologyProfile | ExtendedAstrologyProfile
  fusion: {
    sajuScore?: number | null
    astrologyScore?: number | null
    fusionScore?: number | null
    crossScore?: number | null
    dayMasterHarmony?: number | null
    sunMoonHarmony?: number | null
    venusMarsSynergy?: number | null
    emotionalIntensity?: number | null
    intellectualAlignment?: number | null
    spiritualConnection?: number | null
    conflictCount?: number
    harmonyCount?: number
  }
  sajuActivationWhen?: string | null
  primeYear?: number | null
}

function attractionReasons(input: DeepInsightInput): string[] {
  const { p1Astro, p2Astro, p1Saju, p2Saju, fusion } = input
  const reasons: string[] = []

  // Venus ↔ Mars cross attraction
  const vm1 = signDistance(p1Astro.venus.sign, p2Astro.mars.sign)
  const vm2 = signDistance(p2Astro.venus.sign, p1Astro.mars.sign)
  if (vm1 === 0 || vm2 === 0) {
    reasons.push(
      `Venus-Mars 합 — 서로의 에너지 결이 ${MARS_DRIVE[p1Astro.mars.sign] || ''} 직접 끌림. 첫인상부터 케미가 느껴지는 결.`
    )
  } else if (vm1 === 4 || vm2 === 4) {
    reasons.push(
      `Venus-Mars trine — 자연스러운 끌림. 노력 안 해도 흐름이 잘 흘러요.`
    )
  } else if (vm1 === 6 || vm2 === 6) {
    reasons.push(
      `Venus-Mars 대립 — "정반대 끌림" 클래식. 서로 없는 걸 갖고 있어 강하게 호기심을 느낌.`
    )
  } else if (vm1 === 2 || vm2 === 2) {
    reasons.push(
      `Venus-Mars sextile — 잔잔하지만 꾸준한 매력. 시간 지날수록 더 좋아지는 결.`
    )
  }

  // Sun ↔ Moon emotional resonance
  const sm1 = signDistance(p1Astro.sun.sign, p2Astro.moon.sign)
  const sm2 = signDistance(p2Astro.sun.sign, p1Astro.moon.sign)
  if (sm1 === 0 || sm2 === 0) {
    reasons.push(
      `Sun-Moon 합 — 한쪽의 본질(Sun)이 다른쪽의 정서(Moon)와 같은 자리. 서로가 "고향처럼 느껴지는" 결이에요.`
    )
  } else if (sm1 === 4 || sm2 === 4) {
    reasons.push(
      `Sun-Moon trine — 의식과 감정이 같은 결. 말하지 않아도 통하는 부분 많음.`
    )
  }

  // Saju 일간 element relation
  const dmRel = elementRel(p1Saju.dayMaster.element, p2Saju.dayMaster.element)
  if (dmRel === 'support') {
    reasons.push(
      `사주 일간 상생 — ${p1Saju.dayMaster.name}일간이 ${p2Saju.dayMaster.name}일간을 키워주는 결. 함께 있으면 한쪽이 더 빛나는 자리.`
    )
  } else if (dmRel === 'same') {
    reasons.push(
      `사주 일간 동기 — 같은 ${p1Saju.dayMaster.element} 기운을 공유. 결이 비슷해 편안함을 느끼는 자리.`
    )
  } else if (dmRel === 'drain') {
    reasons.push(
      `사주 일간 식상 관계 — 한쪽이 다른쪽의 표현·창의를 끌어내는 결. 함께하면 새로운 면이 나옴.`
    )
  }

  // Day-master yin/yang complement
  if (p1Saju.dayMaster.yin_yang !== p2Saju.dayMaster.yin_yang) {
    reasons.push(
      `사주 음양 보완 — 한쪽 양(陽), 한쪽 음(陰)으로 자연스러운 조화. 정반대 결이 서로의 빈자리를 채움.`
    )
  }

  // Strong fusion signals
  if ((fusion.venusMarsSynergy ?? 0) >= 70) {
    reasons.push(
      `Venus-Mars 시너지 ${Math.round(fusion.venusMarsSynergy!)}점 — 로맨틱 케미가 강하게 흐름.`
    )
  }
  if ((fusion.sunMoonHarmony ?? 0) >= 70) {
    reasons.push(
      `Sun-Moon 조화 ${Math.round(fusion.sunMoonHarmony!)}점 — 가치관과 정서 결이 잘 맞음.`
    )
  }

  return reasons.slice(0, 5)
}

function whyItWorks(input: DeepInsightInput): string[] {
  const { fusion, p1Saju, p2Saju } = input
  const reasons: string[] = []

  if ((fusion.dayMasterHarmony ?? 0) >= 70) {
    reasons.push(
      `사주 일간 조화 ${Math.round(fusion.dayMasterHarmony!)}점 — 본성 결이 잘 맞아 일상 리듬이 자연스럽게 합쳐짐.`
    )
  }
  if ((fusion.intellectualAlignment ?? 0) >= 65) {
    reasons.push(
      `점성 Mercury 시너스트리 양호 — 대화 패턴이 비슷해 사소한 갈등 없이 의사 결정이 가능.`
    )
  }
  if ((fusion.spiritualConnection ?? 0) >= 65) {
    reasons.push(
      `깊은 가치·세계관이 같은 방향 — 인생의 "왜"에 대한 답이 비슷.`
    )
  }
  if ((fusion.crossScore ?? 0) >= 70) {
    reasons.push(
      `사주와 점성이 같은 방향 — 두 시스템이 같은 신호를 보내는 흔치 않은 일관성.`
    )
  }

  // 사주 일간 yin/yang complement is positive
  if (p1Saju.dayMaster.yin_yang !== p2Saju.dayMaster.yin_yang) {
    reasons.push(
      `음양 보완 구조 — 한쪽이 강할 때 다른쪽이 받쳐주는 자연스러운 역할 분담.`
    )
  }

  // Element complement (one's weak = other's strong)
  const p1Weak = (Object.entries(p1Saju.elements) as [string, number][])
    .filter(([, v]) => v <= 1)
    .map(([k]) => k)
  const p2Strong = (Object.entries(p2Saju.elements) as [string, number][])
    .filter(([, v]) => v >= 3)
    .map(([k]) => k)
  const filled = p1Weak.filter((e) => p2Strong.includes(e))
  if (filled.length > 0) {
    const elKo: Record<string, string> = {
      wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
    }
    reasons.push(
      `사주 5행 보완 — 한쪽 부족한 ${filled.map((e) => elKo[e] || e).join('·')} 기운을 상대가 채워줌.`
    )
  }

  return reasons.slice(0, 5)
}

function frictionPoints(input: DeepInsightInput): string[] {
  const { p1Saju, p2Saju, p1Astro, p2Astro, fusion } = input
  const points: string[] = []

  // Day master controlled relation
  const dmRel = elementRel(p1Saju.dayMaster.element, p2Saju.dayMaster.element)
  if (dmRel === 'controlled') {
    points.push(
      `사주 일간 상극 — ${p2Saju.dayMaster.name}일간이 ${p1Saju.dayMaster.name}일간을 누르는 결. 한쪽이 위축감을 느낄 수 있음, 의식적인 존중이 중요.`
    )
  } else if (dmRel === 'control') {
    points.push(
      `사주 일간 상극 — ${p1Saju.dayMaster.name}일간이 ${p2Saju.dayMaster.name}일간을 누르는 결. 주도권 균형을 의식해야 함.`
    )
  }

  // Sun-sun square / opposition
  const ss = signDistance(p1Astro.sun.sign, p2Astro.sun.sign)
  if (ss === 3) {
    points.push(
      `Sun square — 의지·자아 방향이 90도. 큰 결정에서 "왜 그렇게 생각해?" 식 충돌 발생 가능.`
    )
  }

  // Mars-Mars hard
  const mm = signDistance(p1Astro.mars.sign, p2Astro.mars.sign)
  if (mm === 3) {
    points.push(
      `Mars square — 행동 패턴이 90도. 갈등 처리 방식이 정반대로 어긋날 수 있음.`
    )
  } else if (mm === 6) {
    points.push(
      `Mars 대립 — 한쪽이 직진할 때 다른쪽이 멈추는 패턴. 속도 조정 노력 필요.`
    )
  }

  // Yin-yang same (both 양 or both 음)
  if (p1Saju.dayMaster.yin_yang === p2Saju.dayMaster.yin_yang) {
    if (p1Saju.dayMaster.yin_yang === 'yang') {
      points.push(
        `둘 다 양일간 — 추진력은 강하지만 둘 다 리드하려는 충돌 발생 가능. 역할 분담 명확히.`
      )
    } else {
      points.push(
        `둘 다 음일간 — 안정적이지만 결정 미루기·소극적 패턴 누적 가능. 누가 결정자 역할인지 정해야.`
      )
    }
  }

  if ((fusion.intellectualAlignment ?? 50) < 45) {
    points.push(
      `Mercury 시너스트리 약함 — 의사소통 스타일 차이. 같은 말을 다르게 받아들이기 쉬워, 명확한 표현이 핵심.`
    )
  }

  return points.slice(0, 4)
}

function buildIdealMatch(input: DeepInsightInput): IdealTypeMatch[] {
  const { p1Astro, p2Astro } = input
  const out: IdealTypeMatch[] = []

  for (const [self, partner, selfIdx, partnerIdx] of [
    [p1Astro, p2Astro, 1, 2],
    [p2Astro, p1Astro, 2, 1],
  ] as const) {
    const seeks = `${VENUS_IDEAL[self.venus.sign] || '편안한 사람'} · ${MARS_DRIVE[self.mars.sign] || ''}타입에 끌림`
    const partnerActually = `${SUN_PERSONALITY[partner.sun.sign] || partner.sun.sign}, ${MARS_DRIVE[partner.mars.sign] || ''}결`

    // Match scoring — Venus sign element vs partner Sun element
    let level: IdealTypeMatch['matchLevel'] = 'partial'
    let note = ''

    const venusElRel = elementRel(self.venus.element, partner.sun.element)
    const marsElRel = elementRel(self.mars.element, partner.mars.element)

    if (
      venusElRel === 'same' ||
      venusElRel === 'support' ||
      (marsElRel === 'same' && venusElRel !== 'controlled')
    ) {
      level = 'strong'
      note = `이상형과 실제가 잘 맞아요. 첫 만남에 끌릴 가능성 큼.`
    } else if (venusElRel === 'controlled' || venusElRel === 'control') {
      level = 'weak'
      note = `이상형과 실제 결이 다른 결. 처음엔 낯설지만, 차이를 통해 새로움을 발견할 수 있어요.`
    } else {
      level = 'partial'
      note = `부분적으로 맞음. 시간이 지나면서 매력을 발견하는 결이에요.`
    }

    out.push({
      personIndex: selfIdx,
      partnerIndex: partnerIdx,
      seeks,
      partnerActually,
      matchLevel: level,
      note,
    })
  }

  return out
}

function buildMarriage(input: DeepInsightInput): MarriageReadiness {
  const { fusion, sajuActivationWhen, primeYear } = input

  // Score = composite of dayMaster harmony + sunMoon + spiritual connection + cross
  const components = [
    fusion.dayMasterHarmony ?? 50,
    fusion.sunMoonHarmony ?? 50,
    fusion.spiritualConnection ?? 50,
    fusion.crossScore ?? fusion.fusionScore ?? 50,
  ].map((v) => Math.max(0, Math.min(100, v)))
  const score = Math.round(components.reduce((a, b) => a + b, 0) / components.length)

  let band: MarriageReadiness['band'] = 'medium'
  if (score >= 75) band = 'high'
  else if (score < 55) band = 'low'

  let summary = ''
  if (band === 'high') {
    summary =
      '일간·정서·가치관 결이 모두 같은 방향으로 정렬돼 — 결혼·동거 같은 장기 약속을 진지하게 고려해도 좋은 흐름.'
  } else if (band === 'medium') {
    summary =
      '결혼·약속의 토대는 있지만, 한두 영역(소통이나 음양 균형)에서 의식적인 조율이 필요. 서두르지 말고 단계적으로.'
  } else {
    summary =
      '결혼 전 점검해야 할 결이 있어요 — 본성·정서·가치관 중 한 곳에 큰 차이. 1-2년 동거나 깊은 대화 단계를 거치는 편이 안전.'
  }

  let bestWindow: string | null = null
  if (sajuActivationWhen && primeYear) {
    bestWindow = `${sajuActivationWhen} (사주) + ${primeYear}년 (점성)`
  } else if (sajuActivationWhen) {
    bestWindow = sajuActivationWhen
  } else if (primeYear) {
    bestWindow = `${primeYear}년`
  }

  const sajuSignal =
    (fusion.dayMasterHarmony ?? 0) >= 70
      ? '일간 조화 충분 — 사주적 토대 갖춤'
      : '일간 조화 보통 — 음양 균형 의식하면 보완 가능'

  const astroSignal =
    (fusion.sunMoonHarmony ?? 0) >= 70
      ? 'Sun-Moon 정렬 — 정서·가치관 같은 방향'
      : 'Sun-Moon 부분 정렬 — 가치관 차이는 서로 인정'

  return {
    score,
    band,
    bestWindow,
    sajuSignal,
    astroSignal,
    summary,
  }
}

function buildLongevity(input: DeepInsightInput): LongevityAssessment {
  const { fusion, p1Saju, p2Saju } = input

  const positive: string[] = []
  const cautionary: string[] = []

  if ((fusion.dayMasterHarmony ?? 0) >= 65) positive.push('사주 일간 조화 — 본성 결이 잘 맞음')
  if ((fusion.spiritualConnection ?? 0) >= 65) positive.push('가치관·세계관 정렬 — 큰 그림 같은 방향')
  if ((fusion.crossScore ?? 0) >= 70) positive.push('사주·점성 두 시스템 일관 — 흔치 않은 신호')
  if (p1Saju.dayMaster.yin_yang !== p2Saju.dayMaster.yin_yang)
    positive.push('음양 보완 — 자연스러운 역할 분담')

  if ((fusion.dayMasterHarmony ?? 50) < 45)
    cautionary.push('사주 일간 결이 어긋나 — 본성 차이가 일상에 누적될 수 있음')
  if ((fusion.intellectualAlignment ?? 50) < 45)
    cautionary.push('소통 스타일 차이 — 같은 말의 다른 해석 자주 발생 가능')
  if ((fusion.sunMoonHarmony ?? 50) < 45)
    cautionary.push('Sun-Moon 정서 결 약함 — 정서 시너지 의식적으로 만들어야')
  if (p1Saju.dayMaster.yin_yang === p2Saju.dayMaster.yin_yang)
    cautionary.push('같은 음양 — 강함이 충돌하거나 둘 다 미루는 패턴 가능')

  // Conflict count if available (from PairAnalysis topAspects/topHouseOverlays inferred)
  const conflictPenalty = (input.fusion.conflictCount ?? 0) >= 3 ? 10 : 0

  // Score
  const base = [
    fusion.dayMasterHarmony ?? 50,
    fusion.sunMoonHarmony ?? 50,
    fusion.spiritualConnection ?? 50,
    fusion.crossScore ?? 50,
  ].reduce((a, b) => a + b, 0) / 4

  const positiveBonus = positive.length * 3
  const cautionaryPenalty = cautionary.length * 4
  const score = Math.max(
    20,
    Math.min(95, Math.round(base + positiveBonus - cautionaryPenalty - conflictPenalty))
  )

  let band: LongevityAssessment['band'] = 'medium'
  if (score >= 75) band = 'strong'
  else if (score < 55) band = 'fragile'

  let summary = ''
  if (band === 'strong') {
    summary =
      '관계 지속력 양호 — 시간이 지나도 안정적으로 깊어질 수 있는 결. 큰 위기보다 일상의 작은 누적이 중요.'
  } else if (band === 'medium') {
    summary =
      '평균적인 지속력 — 한두 가지를 의식적으로 조정하면 길게 갈 수 있음. 자동으로 잘 굴러가진 않음.'
  } else {
    summary =
      '지속력에 변수 많음 — 위 주의 신호들이 누적되면 갈라설 가능성 ↑. 큰 결정 전에 솔직한 점검 필수.'
  }

  return {
    score,
    band,
    positive: positive.slice(0, 4),
    cautionary: cautionary.slice(0, 4),
    summary,
  }
}

export function analyzeCoupleDeepInsights(input: DeepInsightInput): CoupleDeepInsights {
  return {
    attractionReasons: attractionReasons(input),
    whyItWorks: whyItWorks(input),
    frictionPoints: frictionPoints(input),
    idealMatch: buildIdealMatch(input),
    marriage: buildMarriage(input),
    longevity: buildLongevity(input),
  }
}
