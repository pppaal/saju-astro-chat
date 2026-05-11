// src/lib/astrology/balance.ts
//
// Element + Modality + Polarity + Hemisphere distribution.
// Mirrors saju's 5행 강약·균형 analysis: a chart with no air planets struggles
// with abstraction, all-fire chart burns out, etc. Used as one of the input
// signals to the comprehensive report's domain scoring.

import type { ZodiacName } from '../interpretations'

export type Element = 'fire' | 'earth' | 'air' | 'water'
export type Modality = 'cardinal' | 'fixed' | 'mutable'
export type Polarity = 'masculine' | 'feminine'

const SIGN_ELEMENT: Record<ZodiacName, Element> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

const SIGN_MODALITY: Record<ZodiacName, Modality> = {
  Aries: 'cardinal',
  Cancer: 'cardinal',
  Libra: 'cardinal',
  Capricorn: 'cardinal',
  Taurus: 'fixed',
  Leo: 'fixed',
  Scorpio: 'fixed',
  Aquarius: 'fixed',
  Gemini: 'mutable',
  Virgo: 'mutable',
  Sagittarius: 'mutable',
  Pisces: 'mutable',
}

// Fire and air signs are masculine (yang); earth and water are feminine (yin).
const SIGN_POLARITY: Record<ZodiacName, Polarity> = {
  Aries: 'masculine',
  Leo: 'masculine',
  Sagittarius: 'masculine',
  Gemini: 'masculine',
  Libra: 'masculine',
  Aquarius: 'masculine',
  Taurus: 'feminine',
  Virgo: 'feminine',
  Capricorn: 'feminine',
  Cancer: 'feminine',
  Scorpio: 'feminine',
  Pisces: 'feminine',
}

export interface ChartBalance {
  elements: Record<Element, number>
  modalities: Record<Modality, number>
  polarity: Record<Polarity, number>
  hemispheres: {
    /** Houses 1-6 (private / self). */
    below: number
    /** Houses 7-12 (public / other). */
    above: number
    /** Houses 1-3, 10-12 (eastern / self-determined). */
    east: number
    /** Houses 4-9 (western / other-influenced). */
    west: number
  }
  total: number
  /** Element with the highest count — primary "voice" of the chart. */
  dominantElement: Element | null
  /** Element with zero or near-zero count — chart's blind spot. */
  weakestElement: Element | null
  dominantModality: Modality | null
  weakestModality: Modality | null
}

interface PlanetForBalance {
  name: string
  sign: ZodiacName
  house: number
}

/**
 * Compute element/modality/polarity/hemisphere distributions across the
 * planets the caller passes in. The caller decides which planets to include
 * — typically the 7 traditional + Asc + MC, sometimes outers too.
 */
export function calculateChartBalance(planets: PlanetForBalance[]): ChartBalance {
  const elements: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  const modalities: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 }
  const polarity: Record<Polarity, number> = { masculine: 0, feminine: 0 }
  const hemispheres = { below: 0, above: 0, east: 0, west: 0 }

  for (const p of planets) {
    const el = SIGN_ELEMENT[p.sign]
    const mo = SIGN_MODALITY[p.sign]
    const po = SIGN_POLARITY[p.sign]
    if (el) elements[el] += 1
    if (mo) modalities[mo] += 1
    if (po) polarity[po] += 1
    if (p.house >= 1 && p.house <= 6) hemispheres.below += 1
    if (p.house >= 7 && p.house <= 12) hemispheres.above += 1
    if (p.house >= 1 && p.house <= 3) hemispheres.east += 1
    if (p.house >= 10 && p.house <= 12) hemispheres.east += 1
    if (p.house >= 4 && p.house <= 9) hemispheres.west += 1
  }

  const total = planets.length
  const dominantElement = pickDominant(elements)
  const weakestElement = pickWeakest(elements)
  const dominantModality = pickDominant(modalities)
  const weakestModality = pickWeakest(modalities)

  return {
    elements,
    modalities,
    polarity,
    hemispheres,
    total,
    dominantElement,
    weakestElement,
    dominantModality,
    weakestModality,
  }
}

function pickDominant<K extends string>(counts: Record<K, number>): K | null {
  let best: K | null = null
  let bestCount = -1
  for (const [key, value] of Object.entries(counts) as Array<[K, number]>) {
    if (value > bestCount) {
      best = key
      bestCount = value
    }
  }
  return bestCount > 0 ? best : null
}

function pickWeakest<K extends string>(counts: Record<K, number>): K | null {
  const entries = Object.entries(counts) as Array<[K, number]>
  if (entries.length === 0) return null
  entries.sort((a, b) => a[1] - b[1])
  return entries[0][1] === 0 ? entries[0][0] : null
}

// ============================================================
// 해석 — 사주 strengthScore.generateStrengthAdvice 와 mirror
// ============================================================

const ELEMENT_DOMINANT_KO: Record<Element, string> = {
  fire:  '주도·발화·표현 지향. 추진력은 강하나 소진·과열 주의.',
  earth: '안정·축적·실용 지향. 신뢰감 강하나 변화 적응이 더딤.',
  air:   '연결·소통·추상 지향. 사고 활발하나 정서 깊이 약할 수 있음.',
  water: '정서·공감·내면 지향. 감수성 풍부하나 경계 흐려질 수 있음.',
}

const ELEMENT_WEAK_KO: Record<Element, string> = {
  fire:  '활력·동기 부재 — 의식적으로 신체 활동·도전·자기 표현 보충 필요.',
  earth: '실행·뿌리 부재 — 루틴·신체·물질 영역 의식적으로 보강 필요.',
  air:   '소통·객관 부재 — 토론·글쓰기·관계 다양화 시도 필요.',
  water: '공감·정서 부재 — 내면 탐구·예술·휴식 시간 의식적 확보 필요.',
}

const MODALITY_DOMINANT_KO: Record<Modality, string> = {
  cardinal: '시작·개시 우세 — 일을 벌이는 데 강함, 마무리·지속이 과제.',
  fixed:    '지속·고정 우세 — 끈기 강함, 변화·전환이 과제.',
  mutable:  '변통·적응 우세 — 유연성 강함, 결단·집중이 과제.',
}

const MODALITY_WEAK_KO: Record<Modality, string> = {
  cardinal: '시작 동력 부재 — 의식적으로 첫발 떼는 훈련 필요.',
  fixed:    '지속력 부재 — 한 가지 끝까지 가는 훈련 필요.',
  mutable:  '유연성 부재 — 상황 변화에 적응하는 훈련 필요.',
}

const HEMISPHERE_LABEL_KO = {
  below_dominant: '1-6궁(자기·사적 영역) 우세 — 내면·개인 작업 중심.',
  above_dominant: '7-12궁(타인·공적 영역) 우세 — 관계·사회 작업 중심.',
  east_dominant:  '동반구(1-3, 10-12궁) 우세 — 자기 주도·결정 성향.',
  west_dominant:  '서반구(4-9궁) 우세 — 타인 영향·반응 성향.',
}

export interface ChartBalanceInterpretation {
  dominantElementText: string | null
  weakestElementText: string | null
  dominantModalityText: string | null
  weakestModalityText: string | null
  hemisphereText: string
  polarityText: string
  overall: string
}

export function getChartBalanceInterpretation(balance: ChartBalance): ChartBalanceInterpretation {
  const dominantElementText = balance.dominantElement
    ? `Dominant element: ${balance.dominantElement} — ${ELEMENT_DOMINANT_KO[balance.dominantElement]}`
    : null
  const weakestElementText = balance.weakestElement
    ? `Missing element: ${balance.weakestElement} — ${ELEMENT_WEAK_KO[balance.weakestElement]}`
    : null
  const dominantModalityText = balance.dominantModality
    ? `Dominant modality: ${balance.dominantModality} — ${MODALITY_DOMINANT_KO[balance.dominantModality]}`
    : null
  const weakestModalityText = balance.weakestModality
    ? `Missing modality: ${balance.weakestModality} — ${MODALITY_WEAK_KO[balance.weakestModality]}`
    : null

  const { below, above, east, west } = balance.hemispheres
  const verticalText =
    above > below + 1
      ? HEMISPHERE_LABEL_KO.above_dominant
      : below > above + 1
        ? HEMISPHERE_LABEL_KO.below_dominant
        : '상·하반구 균형 — 자기·타인 영역 모두 작동.'
  const horizontalText =
    east > west + 1
      ? HEMISPHERE_LABEL_KO.east_dominant
      : west > east + 1
        ? HEMISPHERE_LABEL_KO.west_dominant
        : '동·서반구 균형 — 자기 주도·반응 모두 작동.'
  const hemisphereText = `${verticalText} | ${horizontalText}`

  const yang = balance.polarity.masculine
  const yin = balance.polarity.feminine
  const polarityText =
    yang > yin + 1
      ? `양(masculine) ${yang} > 음(feminine) ${yin} — 능동·외향 우세.`
      : yin > yang + 1
        ? `음(feminine) ${yin} > 양(masculine) ${yang} — 수용·내향 우세.`
        : `양(masculine) ${yang} ≈ 음(feminine) ${yin} — 음양 균형.`

  const overall = [
    dominantElementText,
    weakestElementText,
    dominantModalityText,
    weakestModalityText,
    polarityText,
    hemisphereText,
  ].filter(Boolean).join(' / ')

  return {
    dominantElementText,
    weakestElementText,
    dominantModalityText,
    weakestModalityText,
    hemisphereText,
    polarityText,
    overall,
  }
}
