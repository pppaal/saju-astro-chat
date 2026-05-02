/**
 * Couple Multi-Facet Report
 *
 * Premium-tier analysis that breaks the relationship down across 8
 * concrete life dimensions — dating flow, intimacy, communication,
 * conflict, values, commitment, daily life, growth — instead of
 * relying on the narrative to cover them in passing.
 *
 * Each facet has:
 *  - score (0-100) derived from the right chart factors
 *  - headline (1-line core dynamic)
 *  - strengths[] (1-3 specific natural advantages)
 *  - minds[] (1-3 things to be mindful of)
 *  - tip (1 actionable suggestion)
 */

import type { SajuProfile, AstrologyProfile } from './cosmicCompatibility'
import type { ExtendedAstrologyProfile } from './astrology/comprehensive'
import {
  signDistance,
  aspectFromDistance,
  ASPECT_SCORE,
  elementRel,
  COMPATIBLE_ASTRO_ELEMENT as COMPATIBLE_ELEMENT,
  type Aspect,
} from './_shared/signMath'

export type FacetKey =
  | 'dating'
  | 'intimacy'
  | 'communication'
  | 'conflict'
  | 'values'
  | 'commitment'
  | 'daily'
  | 'growth'

export interface FacetReport {
  key: FacetKey
  label: string
  emoji: string
  score: number // 0-100
  band: 'great' | 'good' | 'mixed' | 'caution'
  headline: string // 1-line core dynamic
  strengths: string[]
  minds: string[]
  tip: string
  /** Book-style flowing paragraph combining headline + strengths + minds + tip.
   *  Always present on the public output (added by buildMultiFacetReport). */
  prose?: string
}

interface FusionInput {
  dayMasterHarmony?: number | null
  sunMoonHarmony?: number | null
  venusMarsSynergy?: number | null
  intellectualAlignment?: number | null
  spiritualConnection?: number | null
  emotionalIntensity?: number | null
}

interface MultiFacetInput {
  p1Saju: SajuProfile
  p2Saju: SajuProfile
  p1Astro: AstrologyProfile | ExtendedAstrologyProfile
  p2Astro: AstrologyProfile | ExtendedAstrologyProfile
  fusion: FusionInput
}

function bandFor(score: number): FacetReport['band'] {
  if (score >= 78) return 'great'
  if (score >= 65) return 'good'
  if (score >= 50) return 'mixed'
  return 'caution'
}

/**
 * Stitch the structured analysis into a single book-style paragraph.
 * Reads naturally end-to-end without bullets.
 */
function weaveProse(parts: {
  headline: string
  strengths: string[]
  minds: string[]
  tip: string
}): string {
  const segments: string[] = [parts.headline]

  if (parts.strengths.length > 0) {
    if (parts.strengths.length === 1) {
      segments.push(parts.strengths[0])
    } else if (parts.strengths.length === 2) {
      segments.push(`${parts.strengths[0]} ${parts.strengths[1]}`)
    } else {
      segments.push(
        `${parts.strengths[0]} 그리고 ${parts.strengths[1]} ${parts.strengths.slice(2).join(' ')}`
      )
    }
  }

  if (parts.minds.length > 0) {
    const opener = parts.strengths.length > 0 ? '다만 ' : ''
    segments.push(`${opener}${parts.minds.join(' ')}`)
  }

  if (parts.tip) {
    segments.push(parts.tip)
  }

  return segments.join(' ').replace(/\s+/g, ' ').trim()
}

function blendScore(...vals: Array<number | null | undefined>): number {
  const ns = vals.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (ns.length === 0) return 60
  return Math.round(ns.reduce((a, b) => a + b, 0) / ns.length)
}

// ============================================================
// 1. 연애 (Dating) — Venus-Mars + Sun-Moon early flow
// ============================================================
function analyzeDating(input: MultiFacetInput): FacetReport {
  const { p1Astro, p2Astro, fusion } = input
  const vmDist = Math.min(
    signDistance(p1Astro.venus.sign, p2Astro.mars.sign),
    signDistance(p2Astro.venus.sign, p1Astro.mars.sign)
  )
  const vmAspect = aspectFromDistance(vmDist)
  const smDist = Math.min(
    signDistance(p1Astro.sun.sign, p2Astro.moon.sign),
    signDistance(p2Astro.sun.sign, p1Astro.moon.sign)
  )
  const smAspect = aspectFromDistance(smDist)

  let score = 60
  if (vmAspect) score += (ASPECT_SCORE[vmAspect] - 60) * 0.4
  if (smAspect) score += (ASPECT_SCORE[smAspect] - 60) * 0.2
  if ((fusion.venusMarsSynergy ?? 0) >= 70) score += 5
  if ((fusion.emotionalIntensity ?? 0) >= 70) score += 4
  score = Math.max(20, Math.min(95, Math.round(score)))

  const strengths: string[] = []
  const minds: string[] = []

  if (vmAspect === 'conjunction' || vmAspect === 'trine') {
    strengths.push('첫인상부터 자연스러운 케미가 흘러요. 데이트 신청이 어색하지 않은 결입니다.')
  }
  if (vmAspect === 'opposition') {
    strengths.push('정반대로 끌리는 클래식한 매력 — 호기심이 강하게 발동합니다.')
  }
  if (smAspect === 'conjunction' || smAspect === 'trine') {
    strengths.push('마음이 같은 곳을 향해 첫 데이트부터 편안한 자리예요.')
  }
  if ((fusion.emotionalIntensity ?? 0) >= 70) {
    strengths.push('감정의 강도가 강해 짧은 시간에 깊이 빠질 수 있어요.')
  }

  if (vmAspect === 'square') {
    minds.push('끌림은 강하지만 데이트 후 마찰이 자주 생길 수 있어요. 솔직한 피드백이 도움됩니다.')
  }
  if (smAspect === 'square' || smAspect === 'opposition') {
    minds.push('초반엔 감정이 엇갈리는 순간이 있어요. 너무 빨리 결론짓지 마세요.')
  }
  if (strengths.length === 0) {
    strengths.push('느리게 시작해서 천천히 깊어지는 결이에요.')
  }
  if (minds.length === 0) {
    minds.push('서로의 페이스를 존중하면 자연스러운 흐름이 만들어져요.')
  }

  let headline = '편안하게 알아가는 흐름이에요.'
  if (score >= 80) headline = '첫 만남부터 케미가 강한 흐름이에요.'
  else if (score >= 65) headline = '자연스러운 끌림으로 시작되는 결입니다.'
  else if (score < 50) headline = '서로 다른 페이스를 인정하며 시작하는 자리예요.'

  return {
    key: 'dating',
    label: '연애 흐름',
    emoji: '💕',
    score,
    band: bandFor(score),
    headline,
    strengths: strengths.slice(0, 3),
    minds: minds.slice(0, 3),
    tip:
      score >= 70
        ? '초반 케미를 활용해 함께하는 작은 의식(주말 카페, 산책 코스)을 만드세요.'
        : '서두르지 말고 짧은 만남을 자주 가지면서 결을 익혀가세요.',
  }
}

// ============================================================
// 2. 친밀감 (Intimacy) — Moon-Moon + Venus-Mars + emotional intensity
// ============================================================
function analyzeIntimacy(input: MultiFacetInput): FacetReport {
  const { p1Astro, p2Astro, p1Saju, p2Saju, fusion } = input
  const moonDist = signDistance(p1Astro.moon.sign, p2Astro.moon.sign)
  const moonAspect = aspectFromDistance(moonDist)

  let score = 60
  if (moonAspect) score += (ASPECT_SCORE[moonAspect] - 60) * 0.35
  if ((fusion.venusMarsSynergy ?? 0) >= 70) score += 6
  if ((fusion.sunMoonHarmony ?? 0) >= 70) score += 5
  if (p1Saju.dayMaster.yin_yang !== p2Saju.dayMaster.yin_yang) score += 4
  score = Math.max(20, Math.min(95, Math.round(score)))

  const strengths: string[] = []
  const minds: string[] = []

  if (moonAspect === 'conjunction' || moonAspect === 'trine') {
    strengths.push('정서 결이 비슷해 깊은 감정 공유가 자연스러워요.')
  }
  if ((fusion.venusMarsSynergy ?? 0) >= 70) {
    strengths.push('금성과 화성의 결이 잘 흘러 신체적·정서적 친밀감이 단단합니다.')
  }
  if (p1Astro.moon.element === p2Astro.moon.element) {
    strengths.push(`같은 ${p1Astro.moon.element === 'water' ? '물' : p1Astro.moon.element === 'fire' ? '불' : p1Astro.moon.element === 'air' ? '공기' : '땅'} 원소의 정서라 안전감이 있어요.`)
  }

  if (moonAspect === 'square' || moonAspect === 'opposition') {
    minds.push('정서 표현 방식이 달라 서로의 신호를 놓치기 쉬워요. 의식적인 표현이 필요합니다.')
  }
  if ((fusion.venusMarsSynergy ?? 50) < 50) {
    minds.push('초기 끌림이 약할 수 있어 친밀감 빌드에 시간이 걸려요.')
  }
  if (strengths.length === 0) strengths.push('시간이 지나며 천천히 깊어지는 친밀감이에요.')
  if (minds.length === 0) minds.push('일상의 작은 스킨십과 표현으로 친밀감이 단단해져요.')

  let headline = '시간이 만드는 깊이가 있는 결이에요.'
  if (score >= 78) headline = '정서·신체 친밀감이 자연스럽게 흐르는 결입니다.'
  else if (score < 50) headline = '서로의 친밀감 언어가 달라 의식적인 표현이 필요해요.'

  return {
    key: 'intimacy',
    label: '친밀감',
    emoji: '🫶',
    score,
    band: bandFor(score),
    headline,
    strengths: strengths.slice(0, 3),
    minds: minds.slice(0, 3),
    tip:
      score >= 70
        ? '하루 한 번 진심 어린 포옹과 "오늘 어땠어?" 같은 짧은 점검이 친밀감을 단단하게 해요.'
        : '서로의 친밀감 표현 방식을 말로 풀어보세요. "이럴 때 사랑받는 느낌이야"라는 표현이 핵심.',
  }
}

// ============================================================
// 3. 소통 (Communication) — Mercury + Sun-Mercury cross
// ============================================================
function analyzeCommunication(input: MultiFacetInput): FacetReport {
  const { p1Astro, p2Astro, fusion } = input
  const m1 = (p1Astro as ExtendedAstrologyProfile).mercury
  const m2 = (p2Astro as ExtendedAstrologyProfile).mercury

  let score = 60
  if (m1 && m2) {
    const md = signDistance(m1.sign, m2.sign)
    const ma = aspectFromDistance(md)
    if (ma) score += (ASPECT_SCORE[ma] - 60) * 0.4
    if (m1.element === m2.element) score += 6
  } else {
    // Fallback: use Sun-Sun element
    if (p1Astro.sun.element === p2Astro.sun.element) score += 8
    else if (COMPATIBLE_ELEMENT[p1Astro.sun.element] === p2Astro.sun.element) score += 4
  }
  if ((fusion.intellectualAlignment ?? 0) >= 65) score += 6
  score = Math.max(20, Math.min(95, Math.round(score)))

  const strengths: string[] = []
  const minds: string[] = []

  if (m1 && m2 && m1.element === m2.element) {
    strengths.push('수성 결이 같아 같은 주제에 자연스럽게 끌립니다.')
  }
  if ((fusion.intellectualAlignment ?? 0) >= 70) {
    strengths.push('대화 패턴이 비슷해 같은 말도 같은 의미로 받아들여요.')
  }
  if (p1Astro.sun.element === p2Astro.sun.element) {
    strengths.push('관점의 토대가 같아 깊은 토론이 자연스럽게 흘러요.')
  }

  if (m1 && m2) {
    const md = signDistance(m1.sign, m2.sign)
    if (md === 3 || md === 6) {
      minds.push('수성이 팽팽한 결이라 같은 말도 다르게 해석되기 쉬워요. "내가 들은 건 ___야"라는 확인 습관이 도움됩니다.')
    }
  }
  if ((fusion.intellectualAlignment ?? 50) < 45) {
    minds.push('소통 스타일이 달라 사소한 오해가 누적될 수 있어요.')
  }
  if (strengths.length === 0) strengths.push('서로 다른 관점이 새로운 시각을 만들어요.')
  if (minds.length === 0) minds.push('정기적인 대화 시간을 정해두면 흐름이 단단해져요.')

  let headline = '대화의 결을 맞춰가는 자리예요.'
  if (score >= 78) headline = '대화가 자연스럽게 통하는 결입니다.'
  else if (score < 50) headline = '소통 방식 차이를 의식적으로 다뤄야 하는 결이에요.'

  return {
    key: 'communication',
    label: '소통',
    emoji: '💬',
    score,
    band: bandFor(score),
    headline,
    strengths: strengths.slice(0, 3),
    minds: minds.slice(0, 3),
    tip:
      score >= 70
        ? '깊은 대화 시간을 주 1회 정도 의식적으로 만들면 관계가 더 단단해져요.'
        : '갈등이 생기면 "내가 들은 건 ___이야, 맞아?" 식의 확인 질문으로 시작하세요.',
  }
}

// ============================================================
// 4. 갈등 (Conflict) — Mars + Sun-Sun + day master + yin-yang
// ============================================================
function analyzeConflict(input: MultiFacetInput): FacetReport {
  const { p1Astro, p2Astro, p1Saju, p2Saju } = input
  const marsDist = signDistance(p1Astro.mars.sign, p2Astro.mars.sign)
  const sunDist = signDistance(p1Astro.sun.sign, p2Astro.sun.sign)

  let score = 65
  // Mars same/sextile/trine → smoother conflict resolution
  if (marsDist === 0 || marsDist === 4) score += 10
  else if (marsDist === 2) score += 5
  else if (marsDist === 3) score -= 8
  else if (marsDist === 6) score -= 5

  // Sun square → big-decision clashes
  if (sunDist === 3) score -= 6

  // Yin-yang complement = smoother roles
  if (p1Saju.dayMaster.yin_yang !== p2Saju.dayMaster.yin_yang) score += 6
  else score -= 3

  // Day master 상극 = harder conflict
  const dmRel = elementRel(p1Saju.dayMaster.element, p2Saju.dayMaster.element)
  if (dmRel === 'control' || dmRel === 'controlled') score -= 8

  score = Math.max(20, Math.min(95, Math.round(score)))

  const strengths: string[] = []
  const minds: string[] = []

  if (marsDist === 0 || marsDist === 4) {
    strengths.push('갈등을 다루는 방식이 비슷해 회복이 빨라요.')
  }
  if (p1Saju.dayMaster.yin_yang !== p2Saju.dayMaster.yin_yang) {
    strengths.push('한쪽이 격할 때 다른쪽이 받쳐주는 자연스러운 균형이 있어요.')
  }
  if (sunDist === 0) strengths.push('큰 가치관이 같아 본질적인 충돌이 적어요.')

  if (marsDist === 3) {
    minds.push('갈등 처리 방식이 달라 한쪽은 빠른 해결, 다른쪽은 시간이 필요할 수 있어요.')
  }
  if (marsDist === 6) {
    minds.push('한쪽이 직진할 때 다른쪽이 멈추는 패턴이라 속도 조절이 핵심이에요.')
  }
  if (dmRel === 'control' || dmRel === 'controlled') {
    minds.push('사주에서 한쪽이 다른쪽을 누르는 결이라 위축되는 감정을 의식해야 해요.')
  }
  if (p1Saju.dayMaster.yin_yang === p2Saju.dayMaster.yin_yang) {
    minds.push('같은 음양이라 둘 다 격해지거나 둘 다 미루는 패턴이 생길 수 있어요.')
  }
  if (strengths.length === 0) strengths.push('서로의 갈등 패턴을 알면 회복 방법도 명확해져요.')
  if (minds.length === 0) minds.push('큰 결정 전엔 잠시 멈추고 다시 보는 시간을 가지세요.')

  let headline = '서로의 갈등 결을 익혀가는 자리예요.'
  if (score >= 78) headline = '갈등 회복이 자연스러운 결입니다.'
  else if (score < 50) headline = '갈등 패턴이 다르니 의식적인 조율이 핵심이에요.'

  return {
    key: 'conflict',
    label: '갈등 해결',
    emoji: '🌋',
    score,
    band: bandFor(score),
    headline,
    strengths: strengths.slice(0, 3),
    minds: minds.slice(0, 3),
    tip:
      score >= 70
        ? '갈등이 생겨도 24시간 안에 풀 수 있는 결 — "오늘 끝내자"는 작은 약속이 도움돼요.'
        : '갈등 시 "한 시간만 멈췄다가 다시 보자" 같은 작은 룰을 만들어 두세요.',
  }
}

// ============================================================
// 5. 가치관 (Values) — Sun + spiritual + Saturn
// ============================================================
function analyzeValues(input: MultiFacetInput): FacetReport {
  const { p1Astro, p2Astro, fusion } = input
  let score = 60
  if (p1Astro.sun.element === p2Astro.sun.element) score += 10
  else if (COMPATIBLE_ELEMENT[p1Astro.sun.element] === p2Astro.sun.element) score += 5
  if ((fusion.spiritualConnection ?? 0) >= 65) score += 8
  if ((fusion.spiritualConnection ?? 0) >= 75) score += 5
  score = Math.max(20, Math.min(95, Math.round(score)))

  const strengths: string[] = []
  const minds: string[] = []

  if (p1Astro.sun.element === p2Astro.sun.element) {
    strengths.push('인생을 보는 큰 결이 같아 깊은 토론이 자연스러워요.')
  }
  if ((fusion.spiritualConnection ?? 0) >= 70) {
    strengths.push('가치관과 세계관이 같은 방향이라 큰 결정에서 마찰이 적어요.')
  }
  if ((fusion.spiritualConnection ?? 50) < 45) {
    minds.push('삶을 보는 방향이 다른 부분이 있어 큰 결정 전 충분한 대화가 필요해요.')
  }
  if (strengths.length === 0) strengths.push('서로 다른 가치관이 시야를 넓혀줍니다.')
  if (minds.length === 0) minds.push('큰 결정 전엔 각자의 가치를 명확히 표현해보세요.')

  let headline = '가치관을 맞춰가는 결이에요.'
  if (score >= 78) headline = '같은 방향을 보는 가치관이에요.'
  else if (score < 50) headline = '서로 다른 결을 통해 배우는 자리입니다.'

  return {
    key: 'values',
    label: '가치관',
    emoji: '🧭',
    score,
    band: bandFor(score),
    headline,
    strengths: strengths.slice(0, 3),
    minds: minds.slice(0, 3),
    tip:
      score >= 70
        ? '인생의 큰 그림에 대해 정기적으로 대화하면 자연스럽게 더 깊어져요.'
        : '큰 결정 전 "이걸 왜 중요하게 생각해?"라는 질문으로 시작해보세요.',
  }
}

// ============================================================
// 6. 약속·결혼 (Commitment) — DM + Sun-Moon + Spiritual + cross
// ============================================================
function analyzeCommitment(input: MultiFacetInput): FacetReport {
  const { p1Saju, p2Saju, fusion } = input
  let score = 60
  if ((fusion.dayMasterHarmony ?? 0) >= 65) score += 10
  if ((fusion.sunMoonHarmony ?? 0) >= 65) score += 8
  if ((fusion.spiritualConnection ?? 0) >= 60) score += 6
  if (p1Saju.dayMaster.yin_yang !== p2Saju.dayMaster.yin_yang) score += 5
  score = Math.max(20, Math.min(95, Math.round(score)))

  const strengths: string[] = []
  const minds: string[] = []

  if ((fusion.dayMasterHarmony ?? 0) >= 70) strengths.push('본성이 잘 맞아 장기 약속의 토대가 단단해요.')
  if ((fusion.sunMoonHarmony ?? 0) >= 70) strengths.push('마음의 결이 정렬돼 결혼·동거 결정이 자연스러워요.')
  if (p1Saju.dayMaster.yin_yang !== p2Saju.dayMaster.yin_yang) {
    strengths.push('음양 보완이 있어 일상의 역할 분담이 자연스럽습니다.')
  }
  if ((fusion.dayMasterHarmony ?? 50) < 50) {
    minds.push('본성 차이가 있어 큰 약속 전 1-2년의 깊은 동행이 안전해요.')
  }
  if ((fusion.sunMoonHarmony ?? 50) < 45) {
    minds.push('정서 결이 다른 부분이 있으니 약속 전 솔직한 점검이 필수예요.')
  }
  if (strengths.length === 0) strengths.push('시간을 두고 신뢰를 쌓으면 단단해지는 결이에요.')
  if (minds.length === 0) minds.push('큰 약속 전 함께하는 1년의 깊은 시간을 권합니다.')

  let headline = '시간을 두고 단단해지는 약속의 결이에요.'
  if (score >= 78) headline = '결혼·약속의 토대가 자연스럽게 만들어지는 결입니다.'
  else if (score < 50) headline = '약속 전 점검해야 할 결이 있어 천천히 보는 편이 안전해요.'

  return {
    key: 'commitment',
    label: '약속·결혼',
    emoji: '💍',
    score,
    band: bandFor(score),
    headline,
    strengths: strengths.slice(0, 3),
    minds: minds.slice(0, 3),
    tip:
      score >= 70
        ? '약속을 단계적으로 — 동거 → 약혼 → 결혼 — 자연스럽게 진행하면 좋아요.'
        : '큰 약속 전 1년 이상 함께 살아보거나 깊은 대화 단계를 거치세요.',
  }
}

// ============================================================
// 7. 일상 (Daily Life) — Moon + Mars + Venus elements
// ============================================================
function analyzeDaily(input: MultiFacetInput): FacetReport {
  const { p1Astro, p2Astro } = input
  let score = 60
  if (p1Astro.moon.element === p2Astro.moon.element) score += 10
  if (p1Astro.mars.element === p2Astro.mars.element) score += 6
  if (p1Astro.venus.element === p2Astro.venus.element) score += 6
  if (COMPATIBLE_ELEMENT[p1Astro.moon.element] === p2Astro.moon.element) score += 4
  score = Math.max(20, Math.min(95, Math.round(score)))

  const strengths: string[] = []
  const minds: string[] = []

  if (p1Astro.moon.element === p2Astro.moon.element) {
    strengths.push('일상의 정서 리듬이 비슷해 함께 사는 결이 자연스러워요.')
  }
  if (p1Astro.venus.element === p2Astro.venus.element) {
    strengths.push('취향이 비슷해 음식·공간·소비가 잘 맞아요.')
  }
  if (p1Astro.mars.element === p2Astro.mars.element) {
    strengths.push('활동 페이스가 비슷해 주말 계획이 충돌 없이 흐릅니다.')
  }
  if (p1Astro.moon.element !== p2Astro.moon.element &&
      COMPATIBLE_ELEMENT[p1Astro.moon.element] !== p2Astro.moon.element) {
    minds.push('일상의 정서 리듬이 달라 한쪽이 활발할 때 다른쪽은 차분할 수 있어요.')
  }
  if (p1Astro.venus.element !== p2Astro.venus.element) {
    minds.push('취향 차이가 있어 함께 결정 시 솔직히 말하는 게 중요해요.')
  }
  if (strengths.length === 0) strengths.push('서로 다른 일상 결이 새로운 자극을 줘요.')
  if (minds.length === 0) minds.push('함께하는 시간과 각자의 시간 균형을 정해두세요.')

  let headline = '서로의 일상 결을 맞춰가는 자리예요.'
  if (score >= 78) headline = '일상의 결이 자연스럽게 맞아떨어져요.'
  else if (score < 50) headline = '일상 리듬이 달라 의식적인 조율이 필요해요.'

  return {
    key: 'daily',
    label: '일상 함께하기',
    emoji: '🏡',
    score,
    band: bandFor(score),
    headline,
    strengths: strengths.slice(0, 3),
    minds: minds.slice(0, 3),
    tip:
      score >= 70
        ? '함께하는 작은 의식(아침 커피, 주말 산책)을 만들면 일상이 더 풍요로워져요.'
        : '서로의 페이스를 존중하는 작은 약속(나만의 시간, 함께 시간)을 정해두세요.',
  }
}

// ============================================================
// 8. 성장 (Growth) — Sun + Saturn + day master support
// ============================================================
function analyzeGrowth(input: MultiFacetInput): FacetReport {
  const { p1Saju, p2Saju, p1Astro, p2Astro, fusion } = input
  let score = 60
  const dmRel = elementRel(p1Saju.dayMaster.element, p2Saju.dayMaster.element)
  if (dmRel === 'support' || dmRel === 'drain') score += 12
  if ((fusion.dayMasterHarmony ?? 0) >= 65) score += 6
  // Sun trine Sun → mutual inspiration
  const sunDist = signDistance(p1Astro.sun.sign, p2Astro.sun.sign)
  if (sunDist === 4) score += 8
  if (sunDist === 0) score += 5
  score = Math.max(20, Math.min(95, Math.round(score)))

  const strengths: string[] = []
  const minds: string[] = []

  if (dmRel === 'support' || dmRel === 'drain') {
    strengths.push('한쪽이 다른쪽의 잠재력을 끌어내주는 결이에요.')
  }
  if (sunDist === 4) strengths.push('서로의 본질을 자극하는 영감의 결입니다.')
  if (sunDist === 0) strengths.push('같은 결의 본성이라 함께 같은 방향으로 자라요.')

  if (dmRel === 'control' || dmRel === 'controlled') {
    minds.push('한쪽이 다른쪽의 잠재력을 누르지 않도록 의식적인 응원이 필요해요.')
  }
  if (strengths.length === 0) strengths.push('서로 다른 결이 새로운 시각을 만들어요.')
  if (minds.length === 0) minds.push('각자의 성장 목표를 정기적으로 공유하면 좋아요.')

  let headline = '함께 성장할 수 있는 결이에요.'
  if (score >= 78) headline = '서로를 자극하고 끌어올리는 결이에요.'
  else if (score < 50) headline = '서로의 페이스를 존중하면서 성장해야 하는 결이에요.'

  return {
    key: 'growth',
    label: '성장과 변화',
    emoji: '🌱',
    score,
    band: bandFor(score),
    headline,
    strengths: strengths.slice(0, 3),
    minds: minds.slice(0, 3),
    tip:
      score >= 70
        ? '서로의 새 도전을 응원하는 작은 의식(첫날 축하, 진행 점검)을 만드세요.'
        : '각자의 성장 영역을 인정하고 강요하지 않는 거리감이 핵심이에요.',
  }
}

// ============================================================
// Public builder
// ============================================================

export function buildMultiFacetReport(input: MultiFacetInput): FacetReport[] {
  const facets = [
    analyzeDating(input),
    analyzeIntimacy(input),
    analyzeCommunication(input),
    analyzeConflict(input),
    analyzeValues(input),
    analyzeCommitment(input),
    analyzeDaily(input),
    analyzeGrowth(input),
  ]

  // Add book-style prose paragraph to each facet (single source of truth
  // built from headline + strengths + minds + tip — UI prefers this over
  // bullet lists for a natural reading flow).
  return facets.map((f) => ({
    ...f,
    prose: weaveProse({
      headline: f.headline,
      strengths: f.strengths,
      minds: f.minds,
      tip: f.tip,
    }),
  }))
}

/** Free tier — 4 most important facets only */
export const FREE_TIER_FACETS: FacetKey[] = ['dating', 'intimacy', 'communication', 'commitment']

export function filterFacetsByTier(
  facets: FacetReport[],
  tier: 'free' | 'premium'
): FacetReport[] {
  if (tier === 'premium') return facets
  return facets.filter((f) => FREE_TIER_FACETS.includes(f.key))
}
