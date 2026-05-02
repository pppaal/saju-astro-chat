/**
 * Couple Astro Timing
 *
 * Light astrology layer to complement the saju monthly outlook:
 * - Current Saturn / Jupiter "era" cards (slow planets define life-stage feel)
 * - Per-person life-stage transits derived from age (Saturn return, Jupiter
 *   return, Chiron return) — no ephem call needed
 * - Cross-system fusion narrative when saju activation period coincides
 *   with a major astro transit
 */

import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types'

export interface AstroEraCard {
  planet: 'Saturn' | 'Jupiter'
  sign: string
  signKo: string
  themeKo: string
  bothImpact: string
}

export interface LifeStageEvent {
  person: 1 | 2
  label: string
  timing: string
  description: string
}

export interface CoupleAstroTimingResult {
  saturnEra: AstroEraCard | null
  jupiterEra: AstroEraCard | null
  lifeStages: LifeStageEvent[]
  crossNarrative: string | null
}

const SIGN_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

const SATURN_THEMES: Record<string, string> = {
  Aries: '독립·자기 책임 정의',
  Taurus: '안정·자원 재구축',
  Gemini: '소통·정보 정리',
  Cancer: '가정·뿌리 재정의',
  Leo: '자기표현·창작 책임',
  Virgo: '루틴·실용성 다지기',
  Libra: '관계·계약 책임',
  Scorpio: '깊이·신뢰 재구축',
  Sagittarius: '신념·확장 정리',
  Capricorn: '커리어·구조 빌드',
  Aquarius: '비전·공동체 책임',
  Pisces: '경계·놓아주기',
}

const JUPITER_THEMES: Record<string, string> = {
  Aries: '용기·새 시작 확장',
  Taurus: '자원·안정 확장',
  Gemini: '학습·소통 확장',
  Cancer: '가정·정서 풍요',
  Leo: '표현·인정 확장',
  Virgo: '실무·건강 확장',
  Libra: '관계·파트너십 확장',
  Scorpio: '깊이·변용 확장',
  Sagittarius: '신념·여행 확장',
  Capricorn: '커리어·권위 확장',
  Aquarius: '비전·네트워크 확장',
  Pisces: '직관·영성 확장',
}

function findPlanet(chart: Chart | null | undefined, name: string): PlanetBase | undefined {
  if (!chart) return undefined
  return chart.planets.find((p) => p.name === name)
}

/** Return the absolute orb (degrees) between two longitudes, taking the shortest arc. */
function angleSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return Math.min(diff, 360 - diff)
}

/**
 * Score how a transit planet's current position aspects a natal planet.
 * Returns a small integer signal: +2 trine/sextile, +3 conjunction (Jupiter)
 * or -2 conjunction (Saturn hard), -1 square/opposition, 0 otherwise.
 */
function aspectInfluence(
  transitLon: number,
  natalLon: number,
  transitName: 'Jupiter' | 'Saturn'
): number {
  const sep = angleSeparation(transitLon, natalLon)
  const ORB = 8

  const isConjunction = sep <= ORB
  const isOpposition = Math.abs(sep - 180) <= ORB
  const isTrine = Math.abs(sep - 120) <= ORB
  const isSquare = Math.abs(sep - 90) <= ORB
  const isSextile = Math.abs(sep - 60) <= ORB

  if (transitName === 'Jupiter') {
    if (isConjunction || isTrine) return 3
    if (isSextile) return 2
    if (isOpposition || isSquare) return -1
    return 0
  }
  // Saturn — generally weighty, conjunction often heavy
  if (isConjunction) return -1
  if (isTrine || isSextile) return 2
  if (isSquare || isOpposition) return -2
  return 0
}

function ageOnDate(birthIso: string, target: Date): number {
  const b = new Date(birthIso)
  if (isNaN(b.getTime())) return 0
  let age = target.getFullYear() - b.getFullYear()
  const m = target.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && target.getDate() < b.getDate())) age -= 1
  return age
}

/** Detect "approaching" or "active" major life-stage events for a person. */
function detectLifeStages(
  person: 1 | 2,
  birthIso: string,
  now: Date
): LifeStageEvent[] {
  const age = ageOnDate(birthIso, now)
  const events: LifeStageEvent[] = []

  // Saturn return — age 28-30 (1st), 58-60 (2nd)
  if (age >= 27 && age <= 31) {
    events.push({
      person,
      label: '첫 새턴 리턴',
      timing: `${age}세 — 활성 중`,
      description: '구조·책임·인생 큰 정리 — 어른의 첫 큰 결단기. 관계 약속도 무겁게 의미화됨.',
    })
  } else if (age >= 25 && age <= 27) {
    events.push({
      person,
      label: '첫 새턴 리턴 직전',
      timing: `${age}세 — 1~3년 안 도래`,
      description: '인생 구조 정리 시기 진입 중 — 진지한 약속·결혼·이직 등 큰 결정 리듬에 들어감.',
    })
  } else if (age >= 57 && age <= 61) {
    events.push({
      person,
      label: '두번째 새턴 리턴',
      timing: `${age}세 — 활성 중`,
      description: '인생 후반 구조 재정의 — 관계의 본질·우선순위 재정렬기.',
    })
  }

  // Chiron return — age ~50 (49-51)
  if (age >= 49 && age <= 51) {
    events.push({
      person,
      label: '카이런 리턴',
      timing: `${age}세 — 활성 중`,
      description: '오래된 상처 통합기 — 관계에서도 깊은 화해와 치유 가능.',
    })
  }

  // Jupiter return — every 12 years
  const jupiterMod = age % 12
  if (age >= 23 && (jupiterMod === 0 || jupiterMod === 11 || jupiterMod === 1)) {
    events.push({
      person,
      label: '주피터 리턴',
      timing: `${age}세 ${jupiterMod === 11 ? '직전' : jupiterMod === 1 ? '직후' : '진행'}`,
      description: '확장·기회·관계 확장기 — 새 단계 진입에 좋은 흐름.',
    })
  }

  return events
}

export function analyzeCoupleAstroTiming(
  p1NatalChart: Chart | null | undefined,
  p2NatalChart: Chart | null | undefined,
  p1BirthIso: string,
  p2BirthIso: string,
  transitChart: Chart | null | undefined,
  sajuActivationWhen?: string | null
): CoupleAstroTimingResult {
  const now = new Date()

  // ── Saturn era card ──
  let saturnEra: AstroEraCard | null = null
  const saturnT = findPlanet(transitChart, 'Saturn')
  if (saturnT) {
    const sign = saturnT.sign
    const p1Sun = findPlanet(p1NatalChart, 'Sun')
    const p2Sun = findPlanet(p2NatalChart, 'Sun')
    const i1 = p1Sun ? aspectInfluence(saturnT.longitude, p1Sun.longitude, 'Saturn') : 0
    const i2 = p2Sun ? aspectInfluence(saturnT.longitude, p2Sun.longitude, 'Saturn') : 0
    const total = i1 + i2

    let bothImpact = ''
    if (total >= 3) {
      bothImpact = '둘 다 새턴이 안정적으로 받쳐줘 — 구조와 약속을 단단히 빌드하기 좋음'
    } else if (total <= -3) {
      bothImpact = '둘 다 새턴 압박 시기 — 큰 결정·약속은 압박감과 함께 옴, 의도적 속도 조절'
    } else if (total >= 1) {
      bothImpact = '한쪽에 새턴 도움 — 그 사람이 안정 축으로 작용'
    } else if (total <= -1) {
      bothImpact = '한쪽에 새턴 압박 — 그 사람의 무게를 함께 들어주는 시기'
    } else {
      bothImpact = '새턴이 직접 영향은 약함 — 큰 구조 변동보다 일상의 다지기'
    }

    saturnEra = {
      planet: 'Saturn',
      sign,
      signKo: SIGN_KO[sign] || sign,
      themeKo: SATURN_THEMES[sign] || '구조·책임',
      bothImpact,
    }
  }

  // ── Jupiter era card ──
  let jupiterEra: AstroEraCard | null = null
  const jupiterT = findPlanet(transitChart, 'Jupiter')
  if (jupiterT) {
    const sign = jupiterT.sign
    const p1Sun = findPlanet(p1NatalChart, 'Sun')
    const p2Sun = findPlanet(p2NatalChart, 'Sun')
    const i1 = p1Sun ? aspectInfluence(jupiterT.longitude, p1Sun.longitude, 'Jupiter') : 0
    const i2 = p2Sun ? aspectInfluence(jupiterT.longitude, p2Sun.longitude, 'Jupiter') : 0
    const total = i1 + i2

    let bothImpact = ''
    if (total >= 4) {
      bothImpact = '둘 다 주피터의 확장 흐름 — 관계가 확장·외부 기회로 풍성해지는 시기'
    } else if (total >= 2) {
      bothImpact = '한쪽에 강한 주피터 도움 — 그 사람의 확장이 관계도 함께 끌어올림'
    } else if (total <= -2) {
      bothImpact = '주피터가 약간 빗겨 — 큰 확장보다 내실 다지기'
    } else {
      bothImpact = '주피터 영향 보통 — 자연스러운 흐름 유지'
    }

    jupiterEra = {
      planet: 'Jupiter',
      sign,
      signKo: SIGN_KO[sign] || sign,
      themeKo: JUPITER_THEMES[sign] || '확장·기회',
      bothImpact,
    }
  }

  // ── Per-person life stages ──
  const lifeStages: LifeStageEvent[] = [
    ...detectLifeStages(1, p1BirthIso, now),
    ...detectLifeStages(2, p2BirthIso, now),
  ]

  // ── Cross-system narrative ──
  let crossNarrative: string | null = null
  const hasJupiterBoost = jupiterEra?.bothImpact.includes('확장')
  const hasSaturnPressure = saturnEra?.bothImpact.includes('압박')
  const hasSaturnSupport = saturnEra?.bothImpact.includes('받쳐')
  const hasLifeStage = lifeStages.length > 0

  if (sajuActivationWhen && hasJupiterBoost) {
    crossNarrative = `사주 활성기 (${sajuActivationWhen}) 와 점성 주피터 확장 흐름이 겹쳐 — 이 시기에 큰 결정이나 만남을 미루지 마세요. 두 시스템이 같은 신호를 보내는 강한 시기예요.`
  } else if (sajuActivationWhen && hasSaturnSupport) {
    crossNarrative = `사주 활성기 (${sajuActivationWhen}) 위에 새턴의 안정 흐름이 더해져 — 빠르게 펼치기보단 단단히 빌드하는 시기. 약속·동거·결혼 등 장기 약속에 적합.`
  } else if (hasSaturnPressure && hasLifeStage) {
    crossNarrative = `점성 새턴 압박 + 인생 단계 전환점이 겹친 시기 — 관계 본질을 정직하게 점검하는 흐름. 어려워도 솔직한 대화가 관계를 다음 단계로 옮김.`
  } else if (hasJupiterBoost && !hasSaturnPressure) {
    crossNarrative = `점성 주피터 확장 흐름이 두 분에게 들어와 — 새 경험·여행·공동 프로젝트 같은 외부 활동이 관계를 풍성하게 함.`
  } else if (hasSaturnPressure) {
    crossNarrative = `새턴 압박 시기엔 관계의 본질만 남음 — 형식보다 신뢰의 깊이가 검증되는 흐름. 통과하면 단단해짐.`
  }

  return {
    saturnEra,
    jupiterEra,
    lifeStages,
    crossNarrative,
  }
}
