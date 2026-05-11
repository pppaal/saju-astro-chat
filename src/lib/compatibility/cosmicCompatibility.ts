/**
 * Cosmic Compatibility Calculator
 * 사주(Saju) + 점성학(Astrology) 기반 종합 궁합 계산
 */

import { FiveElement } from '../saju/types'
import { iga, eulReul } from '../i18n/koParticle'

// ============================================================
// 타입 정의
// ============================================================

export interface SajuProfile {
  dayMaster: {
    element: FiveElement
    yin_yang: 'yin' | 'yang'
    name: string
  }
  pillars: {
    year: { stem: string; branch: string }
    month: { stem: string; branch: string }
    day: { stem: string; branch: string }
    time: { stem: string; branch: string }
  }
  elements: {
    wood: number
    fire: number
    earth: number
    metal: number
    water: number
  }
}

export interface AstrologyProfile {
  sun: { sign: string; element: string }
  moon: { sign: string; element: string }
  venus: { sign: string; element: string }
  mars: { sign: string; element: string }
  ascendant?: { sign: string; element: string }
  mercury?: { sign: string; element: string }
  jupiter?: { sign: string; element: string }
  saturn?: { sign: string; element: string }
  uranus?: { sign: string; element: string }
  neptune?: { sign: string; element: string }
  pluto?: { sign: string; element: string }
  northNode?: { sign: string; element: string }
  southNode?: { sign: string; element: string }
}

export interface CompatibilityResult {
  overallScore: number // 0-100
  breakdown: {
    saju: number
    astrology: number
    elementalHarmony: number
    yinYangBalance: number
  }
  strengths: string[]
  challenges: string[]
  advice: string
  details: {
    sajuAnalysis: SajuCompatibilityAnalysis
    astrologyAnalysis: AstrologyCompatibilityAnalysis
  }
}

export interface SajuCompatibilityAnalysis {
  score: number
  dayMasterHarmony: number
  elementBalance: number
  yinYangBalance: number
  pillarSynergy: number
  insights: string[]
}

export interface AstrologyCompatibilityAnalysis {
  score: number
  sunMoonHarmony: number
  venusMarsSynergy: number
  elementalAlignment: number
  insights: string[]
}

// ============================================================
// 오행 상생상극 관계
// ============================================================

// 영어 오행 타입 (이 파일 내부 전용)
type FiveElementEn = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

// 한글 오행 -> 영어 오행 변환 맵
const ELEMENT_KO_TO_EN: Record<FiveElement, FiveElementEn> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}

// 영어로 변환하는 헬퍼 함수
const toEnElement = (el: FiveElement): FiveElementEn => ELEMENT_KO_TO_EN[el]

const ELEMENT_RELATIONS: {
  generates: Record<FiveElementEn, FiveElementEn>
  controls: Record<FiveElementEn, FiveElementEn>
  controlledBy: Record<FiveElementEn, FiveElementEn>
} = {
  // 상생 (generates)
  generates: {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood',
  },

  // 상극 (controls)
  controls: {
    wood: 'earth',
    earth: 'water',
    water: 'fire',
    fire: 'metal',
    metal: 'wood',
  },

  // 피극 (controlled by)
  controlledBy: {
    wood: 'metal',
    metal: 'fire',
    fire: 'water',
    water: 'earth',
    earth: 'wood',
  },
}

// ============================================================
// 황도12궁 오행 매핑
// ============================================================

const ZODIAC_ELEMENTS: Record<string, string> = {
  Aries: 'fire',
  Taurus: 'earth',
  Gemini: 'air',
  Cancer: 'water',
  Leo: 'fire',
  Virgo: 'earth',
  Libra: 'air',
  Scorpio: 'water',
  Sagittarius: 'fire',
  Capricorn: 'earth',
  Aquarius: 'air',
  Pisces: 'water',
}

// 서양 4원소 -> 동양 5원소 변환 (영어 오행 반환)
const WESTERN_TO_EASTERN_ELEMENT: Record<string, FiveElementEn> = {
  fire: 'fire',
  earth: 'earth',
  air: 'wood', // 공기는 나무로 매핑 (움직임, 성장)
  water: 'water',
}

// ============================================================
// 사주 궁합 계산
// ============================================================

function calculateSajuCompatibility(
  person1: SajuProfile,
  person2: SajuProfile
): SajuCompatibilityAnalysis {
  const insights: string[] = []

  // 1. 일간(Day Master) 조화도 (40점)
  const dayMasterHarmony = calculateDayMasterHarmony(person1.dayMaster, person2.dayMaster, insights)

  // 2. 오행 균형도 (30점)
  const elementBalance = calculateElementBalance(person1.elements, person2.elements, insights)

  // 3. 음양 균형 (15점)
  const yinYangBalance = calculateYinYangBalance(
    person1.dayMaster.yin_yang,
    person2.dayMaster.yin_yang,
    insights
  )

  // 4. 사주 기둥 시너지 (15점)
  const pillarSynergy = calculatePillarSynergy(person1.pillars, person2.pillars, insights)

  const score = Math.round(
    dayMasterHarmony * 0.4 + elementBalance * 0.3 + yinYangBalance * 0.15 + pillarSynergy * 0.15
  )

  return {
    score,
    dayMasterHarmony,
    elementBalance,
    yinYangBalance,
    pillarSynergy,
    insights,
  }
}

function calculateDayMasterHarmony(
  dm1: SajuProfile['dayMaster'],
  dm2: SajuProfile['dayMaster'],
  insights: string[]
): number {
  const el1 = dm1.element
  const el2 = dm2.element
  const el1En = toEnElement(el1)
  const el2En = toEnElement(el2)

  // 같은 오행: 70점
  if (el1 === el2) {
    insights.push(`🌟 일간이 같은 ${el1} 오행으로 서로를 잘 이해합니다`)
    return 70
  }

  // 상생 관계: 90점
  if (ELEMENT_RELATIONS.generates[el1En] === el2En) {
    insights.push(`✨ ${el1}${iga(el1)} ${el2}${eulReul(el2)} 생해주는 상생 관계입니다`)
    return 90
  }
  if (ELEMENT_RELATIONS.generates[el2En] === el1En) {
    insights.push(`✨ ${el2}${iga(el2)} ${el1}${eulReul(el1)} 생해주는 상생 관계입니다`)
    return 90
  }

  // 상극 관계: 40점
  if (ELEMENT_RELATIONS.controls[el1En] === el2En) {
    insights.push(`⚠️ ${el1}${iga(el1)} ${el2}${eulReul(el2)} 극하는 관계로 조율이 필요합니다`)
    return 40
  }
  if (ELEMENT_RELATIONS.controls[el2En] === el1En) {
    insights.push(`⚠️ ${el2}${iga(el2)} ${el1}${eulReul(el1)} 극하는 관계로 조율이 필요합니다`)
    return 40
  }

  // 중립: 60점
  insights.push(`중립적인 오행 관계입니다`)
  return 60
}

function calculateElementBalance(
  elements1: SajuProfile['elements'],
  elements2: SajuProfile['elements'],
  insights: string[]
): number {
  let score = 0
  const elements = ['wood', 'fire', 'earth', 'metal', 'water'] as const

  // 서로 부족한 오행을 채워주는지 체크
  for (const el of elements) {
    const count1 = elements1[el]
    const count2 = elements2[el]

    // 한 쪽이 부족하고 다른 쪽이 많으면 보완 관계
    if ((count1 === 0 && count2 >= 2) || (count2 === 0 && count1 >= 2)) {
      score += 20
      insights.push(`💫 ${el} 오행을 서로 보완해줍니다`)
    }

    // 둘 다 많으면 약간 감점
    if (count1 >= 3 && count2 >= 3) {
      score -= 5
    }
  }

  return Math.max(0, Math.min(100, 50 + score))
}

function calculateYinYangBalance(
  yy1: 'yin' | 'yang',
  yy2: 'yin' | 'yang',
  insights: string[]
): number {
  if (yy1 !== yy2) {
    insights.push(`☯️ 음양이 조화를 이루어 균형잡힌 관계입니다`)
    return 100
  } else {
    insights.push(`음양이 같아 한쪽으로 치우칠 수 있습니다`)
    return 60
  }
}

function calculatePillarSynergy(
  pillars1: SajuProfile['pillars'],
  pillars2: SajuProfile['pillars'],
  insights: string[]
): number {
  let matches = 0

  // 지지 육합, 삼합, 방합 등은 복잡하므로 간단히 같은 지지 체크
  if (pillars1.year.branch === pillars2.year.branch) {
    matches++
  }
  if (pillars1.month.branch === pillars2.month.branch) {
    matches++
  }
  if (pillars1.day.branch === pillars2.day.branch) {
    matches++
  }
  if (pillars1.time.branch === pillars2.time.branch) {
    matches++
  }

  const score = matches * 25

  if (matches >= 2) {
    insights.push(`🎯 사주 기둥에서 ${matches}개의 지지가 일치합니다`)
  }

  return score
}

// ============================================================
// 점성학 궁합 계산
// ============================================================

function calculateAstrologyCompatibility(
  person1: AstrologyProfile,
  person2: AstrologyProfile
): AstrologyCompatibilityAnalysis {
  const insights: string[] = []

  // 1. Sun-Moon 조화 (40점)
  const sunMoonHarmony = calculateSunMoonHarmony(person1, person2, insights)

  // 2. Venus-Mars 시너지 (35점)
  const venusMarsSynergy = calculateVenusMarsSynergy(person1, person2, insights)

  // 3. 원소 정렬 (25점)
  const elementalAlignment = calculateElementalAlignment(person1, person2, insights)

  const score = Math.round(
    sunMoonHarmony * 0.4 + venusMarsSynergy * 0.35 + elementalAlignment * 0.25
  )

  return {
    score,
    sunMoonHarmony,
    venusMarsSynergy,
    elementalAlignment,
    insights,
  }
}

function calculateSunMoonHarmony(
  p1: AstrologyProfile,
  p2: AstrologyProfile,
  insights: string[]
): number {
  let score = 50

  const sun1Element = ZODIAC_ELEMENTS[p1.sun.sign]
  const sun2Element = ZODIAC_ELEMENTS[p2.sun.sign]
  const moon1Element = ZODIAC_ELEMENTS[p1.moon.sign]
  const moon2Element = ZODIAC_ELEMENTS[p2.moon.sign]

  // 태양-태양 조화
  if (sun1Element === sun2Element) {
    score += 15
    insights.push(`☀️ 태양이 같은 원소(${sun1Element})로 가치관이 유사합니다`)
  }

  // 달-달 조화
  if (moon1Element === moon2Element) {
    score += 15
    insights.push(`🌙 달이 같은 원소(${moon1Element})로 감정적 교감이 좋습니다`)
  }

  // 태양-달 교차 조화
  if (sun1Element === moon2Element || sun2Element === moon1Element) {
    score += 20
    insights.push(`💫 태양과 달이 조화를 이루어 깊은 이해가 가능합니다`)
  }

  return Math.min(100, score)
}

function calculateVenusMarsSynergy(
  p1: AstrologyProfile,
  p2: AstrologyProfile,
  insights: string[]
): number {
  let score = 50

  const venus1Element = ZODIAC_ELEMENTS[p1.venus.sign]
  const venus2Element = ZODIAC_ELEMENTS[p2.venus.sign]
  const mars1Element = ZODIAC_ELEMENTS[p1.mars.sign]
  const mars2Element = ZODIAC_ELEMENTS[p2.mars.sign]

  // Venus-Mars 극성 (전통적 궁합)
  if (venus1Element === mars2Element) {
    score += 25
    insights.push(`💕 금성-화성 조화로 로맨틱한 인력이 강합니다`)
  }
  if (venus2Element === mars1Element) {
    score += 25
    insights.push(`💕 금성-화성 조화로 로맨틱한 인력이 강합니다`)
  }

  // 같은 원소
  if (venus1Element === venus2Element) {
    score += 10
  }

  return Math.min(100, score)
}

function calculateElementalAlignment(
  p1: AstrologyProfile,
  p2: AstrologyProfile,
  insights: string[]
): number {
  const elements1 = [
    ZODIAC_ELEMENTS[p1.sun.sign],
    ZODIAC_ELEMENTS[p1.moon.sign],
    ZODIAC_ELEMENTS[p1.venus.sign],
    ZODIAC_ELEMENTS[p1.mars.sign],
  ]

  const elements2 = [
    ZODIAC_ELEMENTS[p2.sun.sign],
    ZODIAC_ELEMENTS[p2.moon.sign],
    ZODIAC_ELEMENTS[p2.venus.sign],
    ZODIAC_ELEMENTS[p2.mars.sign],
  ]

  // 원소 매칭 카운트
  let matches = 0
  for (const el1 of elements1) {
    for (const el2 of elements2) {
      if (el1 === el2) {
        matches++
      }
    }
  }

  const score = Math.min(100, matches * 15)

  if (matches >= 3) {
    insights.push(`🌟 천궁도의 원소가 ${matches}개 일치해 조화롭습니다`)
  }

  return score
}

// ============================================================
// 종합 궁합 계산 (메인 함수)
// ============================================================

export function calculateCosmicCompatibility(
  person1Saju: SajuProfile,
  person1Astrology: AstrologyProfile,
  person2Saju: SajuProfile,
  person2Astrology: AstrologyProfile
): CompatibilityResult {
  // 1. 사주 궁합 분석
  const sajuAnalysis = calculateSajuCompatibility(person1Saju, person2Saju)

  // 2. 점성학 궁합 분석
  const astrologyAnalysis = calculateAstrologyCompatibility(person1Astrology, person2Astrology)

  // 3. 동서양 오행 조화도 계산
  const elementalHarmony = calculateCrossElementalHarmony(
    person1Saju,
    person2Saju,
    person1Astrology,
    person2Astrology
  )

  // 4. 음양 균형 (사주 기반)
  const yinYangBalance = sajuAnalysis.yinYangBalance

  // 5. 종합 점수 계산 (가중 평균)
  const overallScore = Math.round(
    sajuAnalysis.score * 0.45 + // 사주 45%
      astrologyAnalysis.score * 0.35 + // 점성학 35%
      elementalHarmony * 0.2 // 오행 조화 20%
  )

  // 6. 강점과 과제 도출
  const { strengths, challenges } = deriveStrengthsAndChallenges(
    sajuAnalysis,
    astrologyAnalysis,
    overallScore
  )

  // 7. 조언 생성
  const advice = generateAdvice(overallScore, strengths, challenges)

  return {
    overallScore,
    breakdown: {
      saju: sajuAnalysis.score,
      astrology: astrologyAnalysis.score,
      elementalHarmony,
      yinYangBalance,
    },
    strengths,
    challenges,
    advice,
    details: {
      sajuAnalysis,
      astrologyAnalysis,
    },
  }
}

function calculateCrossElementalHarmony(
  p1Saju: SajuProfile,
  p2Saju: SajuProfile,
  p1Astro: AstrologyProfile,
  p2Astro: AstrologyProfile
): number {
  // 사주의 일간 오행과 점성학의 주요 원소 비교
  const saju1Element = p1Saju.dayMaster.element
  const saju2Element = p2Saju.dayMaster.element
  const saju1En = toEnElement(saju1Element)
  const saju2En = toEnElement(saju2Element)

  const astro1MainElement = WESTERN_TO_EASTERN_ELEMENT[ZODIAC_ELEMENTS[p1Astro.sun.sign]]
  const astro2MainElement = WESTERN_TO_EASTERN_ELEMENT[ZODIAC_ELEMENTS[p2Astro.sun.sign]]

  let score = 50

  // 사주-점성학 교차 조화 (영어 오행으로 비교)
  if (saju1En === astro2MainElement) {
    score += 15
  }
  if (saju2En === astro1MainElement) {
    score += 15
  }

  // 상생 관계 체크 (astro는 이미 영어 오행이므로 직접 비교)
  if (astro2MainElement && ELEMENT_RELATIONS.generates[saju1En] === astro2MainElement) {
    score += 10
  }
  if (astro1MainElement && ELEMENT_RELATIONS.generates[saju2En] === astro1MainElement) {
    score += 10
  }

  return Math.min(100, score)
}

function deriveStrengthsAndChallenges(
  sajuAnalysis: SajuCompatibilityAnalysis,
  astrologyAnalysis: AstrologyCompatibilityAnalysis,
  overallScore: number
): { strengths: string[]; challenges: string[] } {
  const strengths: string[] = []
  const challenges: string[] = []

  // 강점 도출
  if (sajuAnalysis.dayMasterHarmony >= 80) {
    strengths.push('사주 일간의 조화가 뛰어나 서로를 잘 이해합니다')
  }
  if (sajuAnalysis.yinYangBalance >= 90) {
    strengths.push('음양의 균형이 완벽해 조화로운 관계입니다')
  }
  if (astrologyAnalysis.sunMoonHarmony >= 80) {
    strengths.push('태양과 달의 조화로 가치관과 감정이 잘 맞습니다')
  }
  if (astrologyAnalysis.venusMarsSynergy >= 80) {
    strengths.push('금성-화성 시너지로 로맨틱한 케미가 좋습니다')
  }

  // 과제 도출
  if (sajuAnalysis.dayMasterHarmony < 50) {
    challenges.push('일간의 상극 관계로 서로에 대한 이해와 배려가 필요합니다')
  }
  if (sajuAnalysis.elementBalance < 50) {
    challenges.push('오행의 불균형이 있어 서로 보완하려는 노력이 필요합니다')
  }
  if (astrologyAnalysis.sunMoonHarmony < 50) {
    challenges.push('가치관과 감정적 욕구의 차이를 인정하고 존중해야 합니다')
  }

  // 기본 메시지
  if (strengths.length === 0) {
    strengths.push('서로 다른 점을 배우며 성장할 수 있는 관계입니다')
  }
  if (challenges.length === 0 && overallScore < 70) {
    challenges.push('지속적인 소통과 이해가 관계를 더욱 발전시킬 것입니다')
  }

  return { strengths, challenges }
}

function generateAdvice(score: number, _strengths: string[], _challenges: string[]): string {
  if (score >= 85) {
    return '천생연분입니다! 사주와 점성학 모두에서 뛰어난 궁합을 보입니다. 서로를 믿고 함께 성장하세요.'
  } else if (score >= 70) {
    return '매우 좋은 궁합입니다. 서로의 강점을 살리고 약점을 보완하며 조화로운 관계를 만들어가세요.'
  } else if (score >= 55) {
    return '노력하면 좋은 관계를 만들 수 있습니다. 서로의 차이를 인정하고 소통하며 이해를 넓혀가세요.'
  } else {
    return '차이가 있지만 그것이 배움의 기회가 될 수 있습니다. 서로를 존중하고 인내심을 가지고 관계를 가꿔가세요.'
  }
}

// ============================================================
// 간단한 궁합 계산 (사주만 또는 점성학만)
// ============================================================

export function calculateSajuCompatibilityOnly(
  person1: SajuProfile,
  person2: SajuProfile
): { score: number; insights: string[] } {
  const analysis = calculateSajuCompatibility(person1, person2)
  return {
    score: analysis.score,
    insights: analysis.insights,
  }
}

export function calculateAstrologyCompatibilityOnly(
  person1: AstrologyProfile,
  person2: AstrologyProfile
): { score: number; insights: string[] } {
  const analysis = calculateAstrologyCompatibility(person1, person2)
  return {
    score: analysis.score,
    insights: analysis.insights,
  }
}
