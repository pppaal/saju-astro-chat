import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, type ApiContext } from '@/lib/api/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { LIMITS } from '@/lib/validation'
import { sanitizeString } from '@/lib/api/sanitizers'
import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/Saju/saju'
import {
  calculateAstrologyCompatibilityOnly,
  calculateSajuCompatibilityOnly,
  type AstrologyProfile,
  type SajuProfile,
} from '@/lib/compatibility/cosmicCompatibility'
import {
  calculateFusionCompatibility,
  type FusionCompatibilityResult,
} from '@/lib/compatibility/compatibilityFusion'
import { performCrossSystemAnalysis } from '@/lib/compatibility/crossSystemAnalysis'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import {
  performExtendedAstrologyAnalysis,
  type ExtendedAstrologyProfile,
} from '@/lib/compatibility/astrology/comprehensive'
import {
  calculateNatalChart,
  toChart,
  type NatalChartData,
} from '@/lib/astrology/foundation/astrologyService'
import { calculateSynastry } from '@/lib/astrology/foundation/synastry'
import type { Chart, AspectType } from '@/lib/astrology/foundation/types'
import type { Relation, PersonInput } from './types'
import { compatibilityRequestSchema } from '@/lib/api/zodValidation'
import { normalizeMojibakePayload } from '@/lib/text/mojibake'

const MAX_NOTE = LIMITS.NOTE
const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const

const SIGN_TO_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
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

type LocaleCode = 'ko' | 'en'

const SIGN_LABEL_KO: Record<string, string> = {
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

const ASPECT_LABEL_EN: Record<AspectType, string> = {
  conjunction: 'Conjunction',
  sextile: 'Sextile',
  square: 'Square',
  trine: 'Trine',
  opposition: 'Opposition',
  semisextile: 'Semi-sextile',
  quincunx: 'Quincunx',
  quintile: 'Quintile',
  biquintile: 'Bi-quintile',
}

const ASPECT_LABEL_KO: Record<AspectType, string> = {
  conjunction: '합',
  sextile: '섹스타일',
  square: '스퀘어',
  trine: '트라인',
  opposition: '대립',
  semisextile: '세미섹스타일',
  quincunx: '퀸컹스',
  quintile: '퀸타일',
  biquintile: '바이퀸타일',
}

type PairScore = {
  pair: [number, number]
  score: number
}

type PairAnalysis = {
  pair: [number, number]
  pairLabel: string
  relationLabel: string
  rawScore: number
  weightedScore: number
  sajuScore: number | null
  astrologyScore: number | null
  fusionScore: number | null
  crossScore: number | null
  strengths: string[]
  challenges: string[]
  advice: string[]
  topAspects: string[]
  topHouseOverlays: string[]
  fusionInsights: PairFusionInsights | null
}

type PairFusionInsights = {
  deepAnalysis: string
  dayMasterHarmony: number | null
  sunMoonHarmony: number | null
  venusMarsSynergy: number | null
  emotionalIntensity: number | null
  intellectualAlignment: number | null
  spiritualConnection: number | null
  conflictResolutionStyle: string | null
  shortTerm: string | null
  mediumTerm: string | null
  longTerm: string | null
  recommendedActions: string[]
}

type PersonAnalysis = {
  sajuProfile: SajuProfile | null
  astroProfile: AstrologyProfile | null
  extendedAstroProfile: ExtendedAstrologyProfile | null
  natalChart: NatalChartData | null
  synastryChart: Chart | null
  errors: string[]
}

function relationWeight(relation?: Relation) {
  if (!relation) {
    return 1.0
  }
  if (relation === 'lover') {
    return 1.0
  }
  if (relation === 'friend') {
    return 0.95
  }
  return 0.9
}

function normalizeLocale(locale?: string): LocaleCode {
  return String(locale || '')
    .toLowerCase()
    .startsWith('ko')
    ? 'ko'
    : 'en'
}

function relationLabel(locale: LocaleCode, relation?: Relation, note?: string) {
  const isKo = locale === 'ko'
  if (relation === 'lover') {
    return isKo ? '연인' : 'lover'
  }
  if (relation === 'friend') {
    return isKo ? '친구' : 'friend'
  }
  if (relation === 'other') {
    return note?.trim() || (isKo ? '기타' : 'other')
  }
  return isKo ? '관계' : 'related'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))]
}

function normalizeSign(rawSign: string) {
  const clean = String(rawSign || '')
    .trim()
    .toLowerCase()
  const found = SIGN_ORDER.find((s) => s.toLowerCase() === clean)
  return found || 'Aries'
}

function oppositeSign(sign: string) {
  const normalized = normalizeSign(sign)
  const index = SIGN_ORDER.findIndex((s) => s === normalized)
  if (index < 0) {
    return 'Libra'
  }
  return SIGN_ORDER[(index + 6) % 12]
}

function elementFromSign(sign: string): 'fire' | 'earth' | 'air' | 'water' {
  return SIGN_TO_ELEMENT[normalizeSign(sign)] || 'fire'
}

function elementEnFromSaju(value: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === '목' || normalized === 'wood') {
    return 'wood'
  }
  if (normalized === '화' || normalized === 'fire') {
    return 'fire'
  }
  if (normalized === '토' || normalized === 'earth') {
    return 'earth'
  }
  if (normalized === '금' || normalized === 'metal') {
    return 'metal'
  }
  if (normalized === '수' || normalized === 'water') {
    return 'water'
  }
  return normalized || 'earth'
}

function elementKo(value: string) {
  if (value === 'wood') return '목(木)'
  if (value === 'fire') return '화(火)'
  if (value === 'earth') return '토(土)'
  if (value === 'metal') return '금(金)'
  if (value === 'water') return '수(水)'
  return value
}

function elementLabel(locale: LocaleCode, value: string) {
  const normalized = elementEnFromSaju(value)
  if (locale === 'ko') {
    return elementKo(normalized)
  }
  if (normalized === 'wood') return 'Wood'
  if (normalized === 'fire') return 'Fire'
  if (normalized === 'earth') return 'Earth'
  if (normalized === 'metal') return 'Metal'
  if (normalized === 'water') return 'Water'
  return normalized
}

function signLabel(locale: LocaleCode, sign: string) {
  const normalized = normalizeSign(sign)
  if (locale === 'ko') {
    return `${SIGN_LABEL_KO[normalized] || normalized}(${normalized})`
  }
  return normalized
}

function parseBirthParts(date: string, time: string) {
  const [year, month, day] = date.split('-').map((v) => Number(v))
  const [hourText = '0', minuteText = '0'] = String(time).split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null
  }

  return { year, month, day, hour, minute }
}

function ageFromDate(date: string) {
  const [year, month, day] = date.split('-').map((v) => Number(v))
  if (!year || !month || !day) return 30

  const now = new Date()
  let age = now.getFullYear() - year
  const birthdayNotPassed =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)

  if (birthdayNotPassed) {
    age -= 1
  }
  return clamp(age, 1, 120)
}

function buildSajuProfileFromBirth(
  date: string,
  time: string,
  timezone: string
): SajuProfile | null {
  try {
    const result = calculateSajuData(date, time, 'male', 'solar', timezone)
    return {
      dayMaster: {
        name: result.dayMaster.name,
        element: result.dayMaster.element,
        yin_yang: result.dayMaster.yin_yang === '양' ? 'yang' : 'yin',
      },
      pillars: {
        year: {
          stem: result.yearPillar.heavenlyStem.name,
          branch: result.yearPillar.earthlyBranch.name,
        },
        month: {
          stem: result.monthPillar.heavenlyStem.name,
          branch: result.monthPillar.earthlyBranch.name,
        },
        day: {
          stem: result.dayPillar.heavenlyStem.name,
          branch: result.dayPillar.earthlyBranch.name,
        },
        time: {
          stem: result.timePillar.heavenlyStem.name,
          branch: result.timePillar.earthlyBranch.name,
        },
      },
      elements: result.fiveElements,
    }
  } catch (error) {
    logger.warn('[Compatibility] Failed to build Saju profile', { error })
    return null
  }
}

async function buildAstrologyProfileFromBirth(person: PersonInput): Promise<PersonAnalysis> {
  const errors: string[] = []
  const parts = parseBirthParts(person.date, person.time)

  if (!parts) {
    return {
      sajuProfile: null,
      astroProfile: null,
      extendedAstroProfile: null,
      natalChart: null,
      synastryChart: null,
      errors: ['Invalid birth date/time format'],
    }
  }

  try {
    const natal = await calculateNatalChart({
      year: parts.year,
      month: parts.month,
      date: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      latitude: person.latitude,
      longitude: person.longitude,
      timeZone: person.timeZone,
    })

    const planetMap = new Map(
      natal.planets.map((planet) => [String(planet.name).toLowerCase(), planet] as const)
    )

    const buildPlanet = (name: string, includeDegree = false) => {
      const planet = planetMap.get(name.toLowerCase())
      if (!planet) return undefined
      const sign = normalizeSign(String(planet.sign))
      const base = {
        sign,
        element: elementFromSign(sign),
      }
      return includeDegree ? { ...base, degree: planet.degree } : base
    }

    const sun = buildPlanet('Sun')
    const moon = buildPlanet('Moon')
    const venus = buildPlanet('Venus')
    const mars = buildPlanet('Mars')

    if (!sun || !moon || !venus || !mars) {
      errors.push('Missing required planets (Sun/Moon/Venus/Mars)')
      return {
        sajuProfile: null,
        astroProfile: null,
        extendedAstroProfile: null,
        natalChart: natal,
        synastryChart: null,
        errors,
      }
    }

    const ascSign = normalizeSign(String(natal.ascendant.sign))
    const northNode = buildPlanet('True Node')

    const extended: ExtendedAstrologyProfile = {
      sun,
      moon,
      venus,
      mars,
      ascendant: {
        sign: ascSign,
        element: elementFromSign(ascSign),
      },
      mercury: buildPlanet('Mercury', true),
      jupiter: buildPlanet('Jupiter'),
      saturn: buildPlanet('Saturn'),
      uranus: buildPlanet('Uranus'),
      neptune: buildPlanet('Neptune'),
      pluto: buildPlanet('Pluto'),
      northNode,
      southNode: northNode
        ? {
            sign: oppositeSign(northNode.sign),
            element: elementFromSign(oppositeSign(northNode.sign)),
          }
        : undefined,
    }

    return {
      sajuProfile: null,
      astroProfile: extended,
      extendedAstroProfile: extended,
      natalChart: natal,
      synastryChart: toChart(natal),
      errors,
    }
  } catch (error) {
    logger.warn('[Compatibility] Failed to build astrology profile', { error })
    return {
      sajuProfile: null,
      astroProfile: null,
      extendedAstroProfile: null,
      natalChart: null,
      synastryChart: null,
      errors: ['Astrology chart calculation failed'],
    }
  }
}

function formatAspectLine(
  aspect: {
    from: { name: string }
    to: { name: string }
    type: AspectType
    orb: number
  },
  locale: LocaleCode
) {
  const label =
    locale === 'ko'
      ? ASPECT_LABEL_KO[aspect.type] || aspect.type
      : ASPECT_LABEL_EN[aspect.type] || aspect.type
  return locale === 'ko'
    ? `${aspect.from.name} ${label} ${aspect.to.name} (오브 ${aspect.orb.toFixed(2)}°)`
    : `${aspect.from.name} ${label} ${aspect.to.name} (orb ${aspect.orb.toFixed(2)}°)`
}

function describeScoreBand(score: number, locale: LocaleCode) {
  if (locale === 'ko') {
    if (score >= 85) return '매우 우수'
    if (score >= 75) return '우수'
    if (score >= 65) return '양호'
    if (score >= 55) return '조율 가능'
    return '주의 필요'
  }
  if (score >= 85) return 'Excellent'
  if (score >= 75) return 'Very Good'
  if (score >= 65) return 'Good'
  if (score >= 55) return 'Workable'
  return 'Challenging'
}

type PlainThemeKind = 'personality' | 'emotional' | 'intimacy' | 'home' | 'communication'

function plainThemeLabel(locale: LocaleCode, theme: PlainThemeKind) {
  if (locale === 'ko') {
    if (theme === 'personality') return '성격 궁합'
    if (theme === 'emotional') return '감정 궁합'
    if (theme === 'intimacy') return '친밀·속궁합'
    if (theme === 'home') return '생활·가정 궁합'
    return '소통 궁합'
  }

  if (theme === 'personality') return 'Personality fit'
  if (theme === 'emotional') return 'Emotional fit'
  if (theme === 'intimacy') return 'Intimacy chemistry'
  if (theme === 'home') return 'Home/Family fit'
  return 'Communication fit'
}

function plainThemeComment(locale: LocaleCode, theme: PlainThemeKind, score: number) {
  const isKo = locale === 'ko'
  const high = score >= 75
  const mid = score >= 60

  if (theme === 'personality') {
    if (high)
      return isKo
        ? '기본 성향과 생활 리듬이 비슷해 마찰이 적습니다.'
        : 'Your baseline traits and daily rhythm align well.'
    if (mid)
      return isKo
        ? '성향 차이가 있어 역할 분담을 정하면 더 편해집니다.'
        : 'Some trait differences exist; role clarity will help.'
    return isKo
      ? '기본 성향 차이가 커서 갈등 규칙을 먼저 합의하는 것이 좋습니다.'
      : 'Trait gaps are larger; agree on conflict rules early.'
  }

  if (theme === 'emotional') {
    if (high)
      return isKo
        ? '감정 표현과 공감 타이밍이 잘 맞습니다.'
        : 'Your emotional expression and empathy timing match well.'
    if (mid)
      return isKo
        ? '감정 온도 차이가 있어 확인 질문이 필요합니다.'
        : 'Emotional temperature differs; check-in questions help.'
    return isKo
      ? '감정 해석 방식이 달라 오해가 누적되기 쉽습니다.'
      : 'Different emotional interpretation can create repeated misunderstandings.'
  }

  if (theme === 'intimacy') {
    if (high)
      return isKo
        ? '애정 표현 템포와 친밀도 기대치가 잘 맞는 편입니다.'
        : 'Affection tempo and intimacy expectations are well aligned.'
    if (mid)
      return isKo
        ? '끌림은 있으나 속도 조절과 배려 신호가 중요합니다.'
        : 'Attraction exists, but pacing and reassurance signals matter.'
    return isKo
      ? '친밀도 기대치 차이가 커서 경계와 합의가 먼저 필요합니다.'
      : 'Intimacy expectations differ; boundaries and consent-first alignment are needed.'
  }

  if (theme === 'home') {
    if (high)
      return isKo
        ? '생활 루틴, 책임 분담, 현실 감각이 잘 맞습니다.'
        : 'Routine, responsibilities, and practical cadence fit well.'
    if (mid)
      return isKo
        ? '가사·재정 같은 현실 영역에서 기준 맞추기가 필요합니다.'
        : 'Home and money expectations need explicit alignment.'
    return isKo
      ? '실생활 운영 방식이 달라 규칙 없는 동거/협업은 피하는 게 좋습니다.'
      : 'Daily-life operating styles differ; define rules before close co-living/collaboration.'
  }

  if (high)
    return isKo
      ? '대화 리듬과 문제 해결 방식이 안정적입니다.'
      : 'Conversation rhythm and problem-solving style are stable.'
  if (mid)
    return isKo
      ? '핵심 주제는 서면/체크리스트로 합의하면 효과적입니다.'
      : 'For important topics, written checklists improve alignment.'
  return isKo
    ? '말의 의도 해석이 자주 엇갈려 구조화된 대화가 필요합니다.'
    : 'Intent interpretation often diverges; structured dialogue is required.'
}

function plainThemeLine(locale: LocaleCode, theme: PlainThemeKind, score: number) {
  const safeScore = clamp(Math.round(score), 0, 100)
  return `- ${plainThemeLabel(locale, theme)}: ${safeScore}/100 (${describeScoreBand(safeScore, locale)}) - ${plainThemeComment(locale, theme, safeScore)}`
}

function buildPairInsights(input: {
  sajuScore: number | null
  astrologyScore: number | null
  crossScore: number | null
  finalScore: number
  harmonyAspectCount: number
  tensionAspectCount: number
  locale: LocaleCode
}) {
  const isKo = input.locale === 'ko'
  const strengths: string[] = []
  const challenges: string[] = []
  const advice: string[] = []

  if (input.sajuScore !== null) {
    if (input.sajuScore >= 75) {
      strengths.push(
        isKo
          ? '사주 일간과 오행 흐름이 잘 맞아 장기 안정성에 유리합니다.'
          : 'Saju day-master and elemental flow support long-term stability.'
      )
    } else if (input.sajuScore < 55) {
      challenges.push(
        isKo
          ? '사주 구조의 생활 리듬 차이가 커서 의식적인 조율이 필요합니다.'
          : 'Saju pattern shows different life rhythm and needs active adjustment.'
      )
    }
  }

  if (input.astrologyScore !== null) {
    if (input.astrologyScore >= 75) {
      strengths.push(
        isKo
          ? '점성 시너스트리에서 감정 교감과 연애 케미 신호가 좋습니다.'
          : 'Astrology synastry supports emotional and romantic chemistry.'
      )
    } else if (input.astrologyScore < 55) {
      challenges.push(
        isKo
          ? '점성 기준에서 소통 방식 또는 감정 표현 스타일 차이가 보입니다.'
          : 'Astrology shows communication or emotional style mismatch.'
      )
    }
  }

  if (input.crossScore !== null) {
    if (input.crossScore >= 70) {
      strengths.push(
        isKo
          ? '사주와 점성의 교차 신호가 같은 방향으로 정합적입니다.'
          : 'Cross-system signal (Saju x Astrology) is consistent and coherent.'
      )
    } else if (input.crossScore < 50) {
      challenges.push(
        isKo
          ? '사주·점성 신호가 엇갈려 해석과 의사결정에 추가 확인이 필요합니다.'
          : 'Cross-system signal diverges, so interpretation must be handled carefully.'
      )
    }
  }

  if (input.harmonyAspectCount >= input.tensionAspectCount) {
    strengths.push(
      isKo
        ? '긴장 어스펙트보다 조화 어스펙트가 더 많습니다.'
        : 'More harmonious synastry aspects than tense aspects.'
    )
  } else {
    challenges.push(
      isKo
        ? '현재 차트 비교에서 긴장 어스펙트 비중이 더 큽니다.'
        : 'Tense synastry aspects are dominant in current chart comparison.'
    )
  }

  if (input.finalScore >= 80) {
    advice.push(
      isKo
        ? '정기적으로 감정 상태를 체크해 현재 강점을 유지하세요.'
        : 'Protect the current strengths with regular emotional check-ins.'
    )
    advice.push(
      isKo
        ? '상승 흐름일 때 중장기 공동 목표를 구체화하세요.'
        : 'Plan shared long-term goals while momentum is strong.'
    )
  } else if (input.finalScore >= 65) {
    advice.push(
      isKo
        ? '주간 소통 루틴을 정해 오해를 누적시키지 마세요.'
        : 'Set a weekly communication ritual to reduce misunderstandings.'
    )
    advice.push(
      isKo
        ? '실무 역할을 분담해 일상 마찰을 줄이세요.'
        : 'Use role-sharing in practical matters to reduce friction.'
    )
  } else {
    advice.push(
      isKo
        ? '큰 결정을 하기 전 경계와 기대치를 문장으로 명확히 합의하세요.'
        : 'Define boundaries and expectations explicitly before major commitments.'
    )
    advice.push(
      isKo
        ? '갈등 해결을 일회성이 아닌 반복 가능한 프로세스로 설계하세요.'
        : 'Treat conflict resolution as a repeatable process, not a one-time fix.'
    )
  }

  if (input.tensionAspectCount > input.harmonyAspectCount) {
    advice.push(
      isKo
        ? '충돌이 커질수록 즉시 결론 내리기보다 멈춘 뒤 구조화된 대화로 재접근하세요.'
        : 'When conflict rises, pause first and revisit with structured dialogue.'
    )
  }

  return {
    strengths: unique(strengths).slice(0, 4),
    challenges: unique(challenges).slice(0, 4),
    advice: unique(advice).slice(0, 5),
  }
}

function scoreText(value: number | null, locale: LocaleCode) {
  return value === null ? (locale === 'ko' ? '정보 없음' : 'N/A') : `${value}/100`
}

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
}

function weekdayInTimeZone(date: Date, timeZone: string): number {
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone })
    .format(date)
    .toLowerCase()
    .slice(0, 3)
  return WEEKDAY_INDEX[short] ?? date.getDay()
}

function formatDateBadge(date: Date, timeZone: string, locale: LocaleCode): string {
  const formatter = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone,
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  return formatter.format(date)
}

function parseWeekdayIndexes(label: string): number[] {
  const tokens = String(label || '')
    .split(/[,\s/]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)

  const indexes = tokens
    .map((token) => WEEKDAY_INDEX[token] ?? WEEKDAY_INDEX[token.slice(0, 3)] ?? -1)
    .filter((value) => value >= 0)

  return [...new Set(indexes)]
}

function buildUpcomingDates(
  weekdayLabel: string,
  timeZone: string,
  locale: LocaleCode,
  limit = 3
): string[] {
  const targetWeekdays = parseWeekdayIndexes(weekdayLabel)
  if (targetWeekdays.length === 0) {
    return []
  }

  const matches: string[] = []
  const now = new Date()
  for (let offset = 0; offset < 28 && matches.length < limit; offset++) {
    const candidate = new Date(now)
    candidate.setDate(now.getDate() + offset)
    const candidateWeekday = weekdayInTimeZone(candidate, timeZone)
    if (targetWeekdays.includes(candidateWeekday)) {
      matches.push(formatDateBadge(candidate, timeZone, locale))
    }
  }
  return matches
}

function pickFusionInsights(fusion: FusionCompatibilityResult): PairFusionInsights {
  return {
    deepAnalysis: fusion.aiInsights.deepAnalysis,
    dayMasterHarmony: fusion.details.sajuAnalysis?.dayMasterHarmony ?? null,
    sunMoonHarmony: fusion.details.astrologyAnalysis?.sunMoonHarmony ?? null,
    venusMarsSynergy: fusion.details.astrologyAnalysis?.venusMarsSynergy ?? null,
    emotionalIntensity: fusion.relationshipDynamics?.emotionalIntensity ?? null,
    intellectualAlignment: fusion.relationshipDynamics?.intellectualAlignment ?? null,
    spiritualConnection: fusion.relationshipDynamics?.spiritualConnection ?? null,
    conflictResolutionStyle: fusion.relationshipDynamics?.conflictResolutionStyle ?? null,
    shortTerm: fusion.futureGuidance?.shortTerm ?? null,
    mediumTerm: fusion.futureGuidance?.mediumTerm ?? null,
    longTerm: fusion.futureGuidance?.longTerm ?? null,
    recommendedActions: fusion.recommendedActions.map((item) => item.action).slice(0, 6),
  }
}

function buildTimingPayload(
  pair: PairAnalysis | null,
  persons: PersonInput[],
  analyses: PersonAnalysis[],
  isGroup: boolean,
  locale: LocaleCode
) {
  if (!pair) return null
  const baseTimeZone = persons[pair.pair[0]]?.timeZone || 'Asia/Seoul'

  const monthLabel = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'long',
  }).format(new Date())
  const firstPersonElement = analyses[0]?.sajuProfile
    ? elementLabel(locale, analyses[0].sajuProfile.dayMaster.element)
    : locale === 'ko'
      ? '혼합'
      : 'Mixed'

  const base = {
    current_month: {
      branch: monthLabel,
      element: firstPersonElement,
      analysis:
        pair.weightedScore >= 75
          ? locale === 'ko'
            ? '투명한 소통과 공동 계획 수립에 유리한 달입니다.'
            : 'Good month for transparent communication and shared plans.'
          : locale === 'ko'
            ? '속도 조절과 경계 설정, 신뢰 회복에 집중해야 하는 달입니다.'
            : 'Use this month for pacing, boundary setting, and trust recovery.',
    },
  }

  if (isGroup) {
    const groupActivities = [
      {
        type: 'collaboration',
        days: locale === 'ko' ? '화, 목' : 'Tue, Thu',
        activities:
          locale === 'ko'
            ? ['계획 회의', '창의 워크숍']
            : ['Planning sessions', 'Creative workshops'],
        reason:
          locale === 'ko'
            ? '그룹 내 전략적 참여와 감정적 참여의 균형을 맞춰줍니다.'
            : 'Balances strategic and emotional participation in group dynamics.',
      },
      {
        type: 'bonding',
        days: locale === 'ko' ? '토' : 'Sat',
        activities:
          locale === 'ko'
            ? ['깊은 대화', '팀 여가 활동']
            : ['Long-form conversation', 'Team leisure activity'],
        reason:
          locale === 'ko'
            ? '과한 압박 없이 약한 페어 연결을 보완합니다.'
            : 'Improves weaker pair links without high pressure.',
      },
    ] as const

    return {
      ...base,
      group_activities: groupActivities.map((activity) => ({
        ...activity,
        next_dates: buildUpcomingDates(activity.days, baseTimeZone, locale),
      })),
    }
  }

  const firstName =
    persons[pair.pair[0]]?.name ||
    (locale === 'ko' ? `사람 ${pair.pair[0] + 1}` : `Person ${pair.pair[0] + 1}`)
  const secondName =
    persons[pair.pair[1]]?.name ||
    (locale === 'ko' ? `사람 ${pair.pair[1] + 1}` : `Person ${pair.pair[1] + 1}`)

  const goodDays = [
    {
      type: 'connection',
      days: locale === 'ko' ? '월, 금' : 'Mon, Fri',
      activities: locale === 'ko' ? ['깊은 대화', '데이트'] : ['Deep talk', 'Date night'],
      reason:
        locale === 'ko'
          ? `${firstName}와 ${secondName}는 이 날짜에 감정 표현의 명확성이 높아질 수 있습니다.`
          : `${firstName} and ${secondName} can improve emotional clarity on these days.`,
    },
    {
      type: 'planning',
      days: locale === 'ko' ? '수' : 'Wed',
      activities:
        locale === 'ko'
          ? ['재정 계획', '생활 루틴 정렬']
          : ['Financial planning', 'Routine alignment'],
      reason:
        locale === 'ko'
          ? '현실적 마찰과 기대치 불일치를 줄이기 좋은 타이밍입니다.'
          : 'Best for reducing practical friction and expectation mismatch.',
    },
  ] as const

  return {
    ...base,
    good_days: goodDays.map((day) => ({
      ...day,
      next_dates: buildUpcomingDates(day.days, baseTimeZone, locale),
    })),
  }
}

function buildGroupPayload(
  names: string[],
  analyses: PersonAnalysis[],
  pairAnalyses: PairAnalysis[],
  locale: LocaleCode
): {
  groupAnalysis: Record<string, unknown> | null
  synergyBreakdown: Record<string, unknown> | null
} {
  if (names.length <= 2) {
    return { groupAnalysis: null, synergyBreakdown: null }
  }

  const oheng = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const astro = { fire: 0, earth: 0, air: 0, water: 0 }

  analyses.forEach((analysis) => {
    if (analysis.sajuProfile) {
      const key = elementEnFromSaju(analysis.sajuProfile.dayMaster.element)
      if (key in oheng) {
        oheng[key as keyof typeof oheng] += 1
      }
    }
    if (analysis.astroProfile) {
      const key = analysis.astroProfile.sun.element
      if (key in astro) {
        astro[key as keyof typeof astro] += 1
      }
    }
  })

  const dominantOheng = Object.entries(oheng).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const dominantAstro = Object.entries(astro).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const lackingOheng = Object.entries(oheng).find(([, v]) => v === 0)?.[0] ?? null
  const lackingAstro = Object.entries(astro).find(([, v]) => v === 0)?.[0] ?? null

  const roles = {
    leader: [] as string[],
    mediator: [] as string[],
    catalyst: [] as string[],
    stabilizer: [] as string[],
    creative: [] as string[],
    emotional: [] as string[],
  }

  analyses.forEach((analysis, idx) => {
    const name = names[idx]
    const sunElement = analysis.astroProfile?.sun.element
    const sajuElement = analysis.sajuProfile
      ? elementEnFromSaju(analysis.sajuProfile.dayMaster.element)
      : null

    if (sunElement === 'fire') roles.leader.push(name)
    if (sunElement === 'water') roles.emotional.push(name)
    if (sunElement === 'air') roles.catalyst.push(name)
    if (sunElement === 'earth' || sajuElement === 'metal') roles.stabilizer.push(name)
    if (sunElement === 'water' || sajuElement === 'water') roles.mediator.push(name)
    if (sunElement === 'air' || sajuElement === 'wood') roles.creative.push(name)
  })

  const pairwiseMatrix = pairAnalyses.map((pair) => ({
    pair: pair.pairLabel,
    index: pair.pair,
    saju: scoreText(pair.sajuScore, locale),
    astro: scoreText(pair.astrologyScore, locale),
    score: pair.weightedScore,
    summary:
      locale === 'ko'
        ? `관계 가중치를 반영한 ${describeScoreBand(pair.weightedScore, locale)} 조합입니다.`
        : `${describeScoreBand(pair.weightedScore, locale)} fit with relation weight applied.`,
    saju_details: pair.sajuScore
      ? [locale === 'ko' ? `사주 점수 ${pair.sajuScore}/100` : `Saju score ${pair.sajuScore}/100`]
      : [],
    astro_details: pair.astrologyScore
      ? [
          locale === 'ko'
            ? `점성 점수 ${pair.astrologyScore}/100`
            : `Astrology score ${pair.astrologyScore}/100`,
        ]
      : [],
    fusion_insights: pair.strengths.slice(0, 2),
  }))

  const rawAverage = Math.round(
    pairAnalyses.reduce((sum, pair) => sum + pair.rawScore, 0) / Math.max(pairAnalyses.length, 1)
  )
  const ohengBonus = lackingOheng ? 0 : 4
  const astroBonus = lackingAstro ? 1 : 4
  const roleBonus = Object.values(roles).filter((list) => list.length > 0).length >= 4 ? 3 : 1
  const samhapBonus =
    pairAnalyses.filter((pair) => pair.crossScore !== null && (pair.crossScore || 0) >= 70)
      .length >= 2
      ? 3
      : 0
  const sizeAdjustment = names.length === 4 ? -2 : 0
  const totalScore = clamp(
    rawAverage + ohengBonus + astroBonus + roleBonus + samhapBonus + sizeAdjustment,
    0,
    100
  )

  const sortedPairs = [...pairAnalyses].sort((a, b) => b.weightedScore - a.weightedScore)
  const best = sortedPairs[0] || null
  const weakest = sortedPairs[sortedPairs.length - 1] || null

  const specialFormations: string[] = []
  if (!lackingOheng) {
    specialFormations.push(locale === 'ko' ? '오행 균형 분포' : 'Balanced five-element coverage')
  }
  if (!lackingAstro) {
    specialFormations.push(
      locale === 'ko' ? '점성 원소 균형 분포' : 'Balanced astro element coverage'
    )
  }
  if (pairAnalyses.some((p) => (p.crossScore || 0) >= 80)) {
    specialFormations.push(
      locale === 'ko' ? '강한 교차 시스템 공명' : 'Strong cross-system resonance'
    )
  }

  return {
    groupAnalysis: {
      element_distribution: {
        oheng,
        astro,
        dominant_oheng: dominantOheng,
        lacking_oheng: lackingOheng,
        dominant_astro: dominantAstro,
        lacking_astro: lackingAstro,
      },
      pairwise_matrix: pairwiseMatrix,
      group_roles: Object.fromEntries(
        Object.entries(roles).map(([key, value]) => [key, unique(value)])
      ),
    },
    synergyBreakdown: {
      total_score: totalScore,
      overall_score: totalScore,
      avg_pair_score: rawAverage,
      oheng_bonus: ohengBonus,
      astro_bonus: astroBonus,
      role_bonus: roleBonus,
      samhap_bonus: samhapBonus,
      size_adjustment: sizeAdjustment,
      special_formations: specialFormations,
      best_pair: {
        pair: best?.pairLabel || (locale === 'ko' ? '정보 없음' : 'N/A'),
        score: best?.weightedScore || 0,
        summary: best?.strengths?.[0] || (locale === 'ko' ? '데이터 없음' : 'No data'),
      },
      weakest_pair: {
        pair: weakest?.pairLabel || (locale === 'ko' ? '정보 없음' : 'N/A'),
        score: weakest?.weightedScore || 0,
        summary: weakest?.challenges?.[0] || (locale === 'ko' ? '데이터 없음' : 'No data'),
      },
    },
  }
}

function buildInterpretationMarkdown(params: {
  locale: LocaleCode
  names: string[]
  persons: PersonInput[]
  analyses: PersonAnalysis[]
  pairAnalyses: PairAnalysis[]
  finalScore: number
  timing: ReturnType<typeof buildTimingPayload> | null
}) {
  const { locale, names, persons, analyses, pairAnalyses, finalScore, timing } = params
  const isKo = locale === 'ko'
  const primaryPair = pairAnalyses[0]

  if (!primaryPair) {
    return [
      isKo ? '## 종합 점수' : '## Overall Score',
      '',
      isKo
        ? '입력값으로부터 페어 결과를 생성하지 못했습니다.'
        : 'No pair result could be generated from the input.',
      '',
      isKo ? '## 조언' : '## Advice',
      '',
      isKo
        ? '- 모든 사람의 생년월일, 출생시간, 위도/경도, 시간대를 다시 확인해주세요.'
        : '- Please verify date, time, latitude/longitude, and timezone for all people.',
    ].join('\n')
  }

  const [aIndex, bIndex] = primaryPair.pair
  const p1Name = names[aIndex]
  const p2Name = names[bIndex]
  const p1Saju = analyses[aIndex]?.sajuProfile
  const p2Saju = analyses[bIndex]?.sajuProfile
  const p1Astro = analyses[aIndex]?.astroProfile
  const p2Astro = analyses[bIndex]?.astroProfile
  const fusion = primaryPair.fusionInsights

  const personalityScore = clamp(
    Math.round(
      (primaryPair.sajuScore ?? primaryPair.weightedScore) * 0.65 +
        (primaryPair.crossScore ?? primaryPair.weightedScore) * 0.35
    ),
    0,
    100
  )
  const emotionalScore = clamp(
    Math.round(
      (fusion?.sunMoonHarmony ?? primaryPair.astrologyScore ?? primaryPair.weightedScore) * 0.7 +
        (fusion?.emotionalIntensity ?? primaryPair.weightedScore) * 0.3
    ),
    0,
    100
  )
  const intimacyScore = clamp(
    Math.round(
      (fusion?.venusMarsSynergy ?? primaryPair.astrologyScore ?? primaryPair.weightedScore) * 0.75 +
        (fusion?.emotionalIntensity ?? primaryPair.weightedScore) * 0.25
    ),
    0,
    100
  )
  const homeScore = clamp(
    Math.round(
      (primaryPair.sajuScore ?? primaryPair.weightedScore) * 0.7 + primaryPair.weightedScore * 0.3
    ),
    0,
    100
  )
  const communicationScore = clamp(
    Math.round(
      (fusion?.intellectualAlignment ?? primaryPair.crossScore ?? primaryPair.weightedScore) * 0.7 +
        primaryPair.weightedScore * 0.3
    ),
    0,
    100
  )

  const lines: string[] = []
  lines.push(isKo ? '## 종합 점수' : '## Overall Score')
  lines.push('')
  lines.push(
    `${primaryPair.pairLabel}: ${primaryPair.weightedScore}/100 (${describeScoreBand(primaryPair.weightedScore, locale)})`
  )
  lines.push(
    isKo
      ? `전체 ${pairAnalyses.length}개 페어 평균: ${finalScore}/100`
      : `Global average across ${pairAnalyses.length} pair(s): ${finalScore}/100`
  )
  lines.push(
    isKo
      ? '이 결과는 사주 + 점성 + 교차 시스템 점수를 기반으로 계산되었습니다.'
      : 'This result is computed locally from Saju + Astrology + cross-system scoring.'
  )
  lines.push('')

  lines.push(isKo ? '## 관계 분석' : '## Relationship Analysis')
  lines.push('')
  for (let i = 1; i < persons.length; i++) {
    lines.push(
      `${names[0]} ↔ ${names[i]}: ${relationLabel(locale, persons[i].relationToP1, persons[i].relationNoteToP1)}`
    )
  }
  lines.push('')

  lines.push(isKo ? '## 상세 점수' : '## Detailed Scores')
  lines.push('')
  pairAnalyses.forEach((pair) => {
    lines.push(
      locale === 'ko'
        ? `${pair.pairLabel}: ${pair.weightedScore}/100 (사주 ${scoreText(pair.sajuScore, locale)}, 점성 ${scoreText(pair.astrologyScore, locale)}, 교차 ${scoreText(pair.crossScore, locale)})`
        : `${pair.pairLabel}: ${pair.weightedScore}/100 (Saju ${scoreText(pair.sajuScore, locale)}, Astrology ${scoreText(pair.astrologyScore, locale)}, Cross ${scoreText(pair.crossScore, locale)})`
    )
  })
  lines.push('')

  lines.push(isKo ? '## 한눈에 보는 궁합 해설' : '## Plain-Language Compatibility Guide')
  lines.push('')
  lines.push(plainThemeLine(locale, 'personality', personalityScore))
  lines.push(plainThemeLine(locale, 'emotional', emotionalScore))
  lines.push(plainThemeLine(locale, 'intimacy', intimacyScore))
  lines.push(plainThemeLine(locale, 'home', homeScore))
  lines.push(plainThemeLine(locale, 'communication', communicationScore))
  lines.push('')

  lines.push(isKo ? '## 사주 분석' : '## Saju Analysis')
  lines.push('')
  if (p1Saju && p2Saju) {
    lines.push(
      isKo
        ? `일간 비교: ${p1Name} ${p1Saju.dayMaster.name} (${elementLabel(locale, p1Saju.dayMaster.element)}) vs ${p2Name} ${p2Saju.dayMaster.name} (${elementLabel(locale, p2Saju.dayMaster.element)})`
        : `Day Master: ${p1Name} ${p1Saju.dayMaster.name} (${elementLabel(locale, p1Saju.dayMaster.element)}) vs ${p2Name} ${p2Saju.dayMaster.name} (${elementLabel(locale, p2Saju.dayMaster.element)})`
    )
    lines.push(
      isKo
        ? `사주 궁합 점수: ${scoreText(primaryPair.sajuScore, locale)}`
        : `Saju compatibility score: ${scoreText(primaryPair.sajuScore, locale)}`
    )
    lines.push(
      isKo
        ? `월지 상호작용: ${p1Saju.pillars.month.branch} ↔ ${p2Saju.pillars.month.branch}`
        : `Month branch interaction: ${p1Saju.pillars.month.branch} ↔ ${p2Saju.pillars.month.branch}`
    )
  } else {
    lines.push(
      isKo
        ? '이 페어의 사주 프로필을 완전히 계산하지 못했습니다.'
        : 'Saju profile could not be fully computed for this pair.'
    )
  }
  lines.push('')

  lines.push(isKo ? '## 점성 분석' : '## Astrology Analysis')
  lines.push('')
  if (p1Astro && p2Astro) {
    lines.push(
      isKo
        ? `${p1Name}: 태양 ${signLabel(locale, p1Astro.sun.sign)}, 달 ${signLabel(locale, p1Astro.moon.sign)}, 금성 ${signLabel(locale, p1Astro.venus.sign)}, 화성 ${signLabel(locale, p1Astro.mars.sign)}`
        : `${p1Name}: Sun ${signLabel(locale, p1Astro.sun.sign)}, Moon ${signLabel(locale, p1Astro.moon.sign)}, Venus ${signLabel(locale, p1Astro.venus.sign)}, Mars ${signLabel(locale, p1Astro.mars.sign)}`
    )
    lines.push(
      isKo
        ? `${p2Name}: 태양 ${signLabel(locale, p2Astro.sun.sign)}, 달 ${signLabel(locale, p2Astro.moon.sign)}, 금성 ${signLabel(locale, p2Astro.venus.sign)}, 화성 ${signLabel(locale, p2Astro.mars.sign)}`
        : `${p2Name}: Sun ${signLabel(locale, p2Astro.sun.sign)}, Moon ${signLabel(locale, p2Astro.moon.sign)}, Venus ${signLabel(locale, p2Astro.venus.sign)}, Mars ${signLabel(locale, p2Astro.mars.sign)}`
    )
    lines.push(
      isKo
        ? `점성 궁합 점수: ${scoreText(primaryPair.astrologyScore, locale)}`
        : `Astrology compatibility score: ${scoreText(primaryPair.astrologyScore, locale)}`
    )

    if (primaryPair.topAspects.length > 0) {
      lines.push(isKo ? '주요 시너스트리 어스펙트:' : 'Top synastry aspects:')
      primaryPair.topAspects.slice(0, 6).forEach((aspect) => lines.push(`- ${aspect}`))
    }
    if (primaryPair.topHouseOverlays.length > 0) {
      lines.push(isKo ? '핵심 하우스 오버레이:' : 'Key house overlays:')
      primaryPair.topHouseOverlays.slice(0, 4).forEach((overlay) => lines.push(`- ${overlay}`))
    }
  } else {
    lines.push(
      isKo
        ? '이 페어의 점성 프로필을 완전히 계산하지 못했습니다.'
        : 'Astrology profile could not be fully computed for this pair.'
    )
  }
  lines.push('')

  lines.push(isKo ? '## 교차 시스템 분석' : '## Cross-System Analysis')
  lines.push('')
  lines.push(
    isKo
      ? `융합 점수(사주 + 점성): ${scoreText(primaryPair.fusionScore, locale)}`
      : `Fusion score (Saju + Astrology): ${scoreText(primaryPair.fusionScore, locale)}`
  )
  lines.push(
    isKo
      ? `교차 시스템 일관성 점수: ${scoreText(primaryPair.crossScore, locale)}`
      : `Cross-system consistency score: ${scoreText(primaryPair.crossScore, locale)}`
  )
  if (primaryPair.crossScore !== null) {
    if (primaryPair.crossScore >= 75) {
      lines.push(
        isKo
          ? '사주와 점성이 비슷한 방향을 가리키고 있습니다.'
          : 'Saju and Astrology are pointing in a similar direction.'
      )
    } else if (primaryPair.crossScore >= 55) {
      lines.push(
        isKo
          ? '사주와 점성이 부분적으로 맞습니다. 실무적인 조율이 중요합니다.'
          : 'Saju and Astrology are partially aligned; practical tuning is important.'
      )
    } else {
      lines.push(
        isKo
          ? '사주와 점성의 강조점이 다릅니다. 소통 품질이 핵심입니다.'
          : 'Saju and Astrology show different emphasis; communication quality is critical.'
      )
    }
  }
  lines.push('')

  lines.push(isKo ? '## 성격/감정 궁합' : '## Personality & Emotional Fit')
  lines.push('')
  if (fusion) {
    if (fusion.dayMasterHarmony !== null) {
      lines.push(
        isKo
          ? `사주 성향 조화(일간): ${fusion.dayMasterHarmony}/100`
          : `Saju personality alignment (Day Master): ${fusion.dayMasterHarmony}/100`
      )
    }
    if (fusion.sunMoonHarmony !== null) {
      lines.push(
        isKo
          ? `감정/가치관 조화(태양·달): ${fusion.sunMoonHarmony}/100`
          : `Emotional/value harmony (Sun-Moon): ${fusion.sunMoonHarmony}/100`
      )
    }
    if (fusion.intellectualAlignment !== null) {
      lines.push(
        isKo
          ? `대화/사고 결(지적 정렬): ${fusion.intellectualAlignment}/100`
          : `Conversation/thinking alignment: ${fusion.intellectualAlignment}/100`
      )
    }
    if (fusion.conflictResolutionStyle) {
      lines.push(
        isKo
          ? `갈등 해결 스타일: ${fusion.conflictResolutionStyle}`
          : `Conflict resolution style: ${fusion.conflictResolutionStyle}`
      )
    }
  } else {
    lines.push(
      isKo
        ? '성향/감정 조화 지표를 일부 계산하지 못해 핵심 점수 위주로 해석했습니다.'
        : 'Some personality/emotion indicators were unavailable, so this section uses core scores.'
    )
  }
  lines.push('')

  lines.push(isKo ? '## 속궁합 & 친밀도' : '## Intimacy Chemistry')
  lines.push('')
  if (fusion?.venusMarsSynergy !== null && fusion?.venusMarsSynergy !== undefined) {
    lines.push(
      isKo
        ? `로맨스/끌림 지수(금성·화성): ${fusion.venusMarsSynergy}/100`
        : `Romance/attraction index (Venus-Mars): ${fusion.venusMarsSynergy}/100`
    )
  } else {
    lines.push(
      isKo
        ? `점성 기반 친밀도: ${scoreText(primaryPair.astrologyScore, locale)}`
        : `Astrology-based intimacy score: ${scoreText(primaryPair.astrologyScore, locale)}`
    )
  }
  if (fusion?.emotionalIntensity !== null && fusion?.emotionalIntensity !== undefined) {
    lines.push(
      isKo
        ? `감정 몰입도: ${fusion.emotionalIntensity}/100`
        : `Emotional intensity: ${fusion.emotionalIntensity}/100`
    )
  }
  lines.push(
    isKo
      ? '핵심: 속궁합은 끌림 강도만이 아니라 감정 안정성과 소통 품질이 함께 맞을 때 오래 갑니다.'
      : 'Key point: Intimacy lasts when attraction and communication/emotional stability rise together.'
  )
  lines.push('')

  lines.push(isKo ? '## 미래 흐름 & 만남 타이밍' : '## Future Flow & Best Meeting Windows')
  lines.push('')
  if (fusion?.shortTerm) {
    lines.push(
      isKo ? `단기(1~6개월): ${fusion.shortTerm}` : `Short term (1-6 months): ${fusion.shortTerm}`
    )
  }
  if (fusion?.mediumTerm) {
    lines.push(
      isKo
        ? `중기(6개월~2년): ${fusion.mediumTerm}`
        : `Mid term (6 months-2 years): ${fusion.mediumTerm}`
    )
  }
  if (fusion?.longTerm) {
    lines.push(isKo ? `장기(2년+): ${fusion.longTerm}` : `Long term (2+ years): ${fusion.longTerm}`)
  }
  if (
    timing &&
    'good_days' in timing &&
    Array.isArray(timing.good_days) &&
    timing.good_days.length
  ) {
    timing.good_days.forEach((day: { days: string; next_dates?: string[] }) => {
      const nextDates =
        Array.isArray((day as { next_dates?: unknown }).next_dates) &&
        (day as { next_dates?: unknown[] }).next_dates?.length
          ? (day as { next_dates: string[] }).next_dates.join(', ')
          : null
      if (nextDates) {
        lines.push(
          isKo
            ? `추천 만남일(${day.days}) 다음 일정: ${nextDates}`
            : `Recommended meeting days (${day.days}) next windows: ${nextDates}`
        )
      }
    })
  }
  lines.push('')

  lines.push(isKo ? '## 강점' : '## Strengths')
  lines.push('')
  primaryPair.strengths.forEach((item) => lines.push(`- ${item}`))
  lines.push('')

  lines.push(isKo ? '## 과제' : '## Challenges')
  lines.push('')
  if (primaryPair.challenges.length === 0) {
    lines.push(
      isKo
        ? '- 현재 계산 기준에서 큰 위험 신호는 감지되지 않았습니다.'
        : '- No major challenge signal detected from current calculations.'
    )
  } else {
    primaryPair.challenges.forEach((item) => lines.push(`- ${item}`))
  }
  lines.push('')

  lines.push(isKo ? '## 조언' : '## Advice')
  lines.push('')
  primaryPair.advice.forEach((item) => lines.push(`- ${item}`))
  lines.push('')

  lines.push(isKo ? '## 요약' : '## Summary')
  lines.push('')
  lines.push(
    isKo
      ? `${p1Name} & ${p2Name} 현재 점수는 ${primaryPair.weightedScore}/100입니다. 장기 궁합을 높이려면 일관된 소통과 역할 명확화에 집중하세요.`
      : `${p1Name} & ${p2Name} currently rate ${primaryPair.weightedScore}/100. Focus on consistent communication and role clarity to improve long-term compatibility.`
  )

  return lines.join('\n')
}

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const rawBody = await req.json()
    const validationResult = compatibilityRequestSchema.safeParse(rawBody)

    if (!validationResult.success) {
      logger.warn('[Compatibility] validation failed', { errors: validationResult.error.issues })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const body = validationResult.data
    const locale = normalizeLocale(body.locale || 'en')
    const persons: PersonInput[] = body.persons.map(
      (person, index) =>
        ({
          name: sanitizeString(person.name, LIMITS.NAME),
          date: person.date,
          time: person.time,
          latitude: person.latitude,
          longitude: person.longitude,
          timeZone: person.timeZone,
          city: sanitizeString(person.city, LIMITS.CITY),
          relationToP1: index > 0 ? person.relationToP1 : undefined,
          relationNoteToP1: sanitizeString(person.relationNoteToP1, MAX_NOTE),
        }) as PersonInput
    )

    const names = persons.map(
      (person, index) =>
        person.name?.trim() || (locale === 'ko' ? `사람 ${index + 1}` : `Person ${index + 1}`)
    )
    const pairs: [number, number][] = []

    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        pairs.push([i, j])
      }
    }

    const personAnalyses: PersonAnalysis[] = await Promise.all(
      persons.map(async (person) => {
        const sajuProfile = buildSajuProfileFromBirth(person.date, person.time, person.timeZone)
        const astroBundle = await buildAstrologyProfileFromBirth(person)
        return {
          sajuProfile,
          astroProfile: astroBundle.astroProfile,
          extendedAstroProfile: astroBundle.extendedAstroProfile,
          natalChart: astroBundle.natalChart,
          synastryChart: astroBundle.synastryChart,
          errors: [
            ...(sajuProfile ? [] : ['Saju calculation failed']),
            ...(astroBundle.errors || []),
          ],
        }
      })
    )

    const pairAnalyses: PairAnalysis[] = []
    const pairScores: PairScore[] = []

    for (const [a, b] of pairs) {
      const analysisA = personAnalyses[a]
      const analysisB = personAnalyses[b]

      const sajuA = analysisA.sajuProfile
      const sajuB = analysisB.sajuProfile
      const astroA = analysisA.astroProfile
      const astroB = analysisB.astroProfile
      const extAstroA = analysisA.extendedAstroProfile
      const extAstroB = analysisB.extendedAstroProfile
      const chartA = analysisA.synastryChart
      const chartB = analysisB.synastryChart

      let sajuScore: number | null = null
      let astrologyScore: number | null = null
      let fusionScore: number | null = null
      let crossScore: number | null = null
      let fusionInsights: PairFusionInsights | null = null

      if (sajuA && sajuB) {
        try {
          const ageA = ageFromDate(persons[a].date)
          const ageB = ageFromDate(persons[b].date)
          const sajuAnalysis = performExtendedSajuAnalysis(
            sajuA,
            sajuB,
            ageA,
            ageB,
            new Date().getFullYear()
          )
          sajuScore = Math.round(sajuAnalysis.overallScore)
        } catch (error) {
          logger.warn('[Compatibility] Extended Saju analysis failed', { pair: [a, b], error })
          const fallback = calculateSajuCompatibilityOnly(sajuA, sajuB)
          sajuScore = fallback.score
        }
      }

      if (extAstroA && extAstroB) {
        try {
          const astroAnalysis = performExtendedAstrologyAnalysis(extAstroA, extAstroB, 0)
          astrologyScore = Math.round(astroAnalysis.extendedScore)
        } catch (error) {
          logger.warn('[Compatibility] Extended Astrology analysis failed', { pair: [a, b], error })
          const fallback = calculateAstrologyCompatibilityOnly(extAstroA, extAstroB)
          astrologyScore = fallback.score
        }
      }

      if (sajuA && sajuB && astroA && astroB) {
        try {
          const fusion = calculateFusionCompatibility(sajuA, astroA, sajuB, astroB)
          fusionScore = Math.round(fusion.overallScore)
          fusionInsights = pickFusionInsights(fusion)
        } catch (error) {
          logger.warn('[Compatibility] Fusion analysis failed', { pair: [a, b], error })
        }

        try {
          const cross = performCrossSystemAnalysis(sajuA, sajuB, astroA, astroB)
          crossScore = cross ? Math.round(cross.crossSystemScore) : null
        } catch (error) {
          logger.warn('[Compatibility] Cross-system analysis failed', { pair: [a, b], error })
        }
      }

      let rawScore = 65
      if (fusionScore !== null) {
        rawScore = fusionScore
      } else if (sajuScore !== null && astrologyScore !== null) {
        rawScore = Math.round(sajuScore * 0.55 + astrologyScore * 0.45)
      } else if (sajuScore !== null) {
        rawScore = sajuScore
      } else if (astrologyScore !== null) {
        rawScore = astrologyScore
      }

      let relationFactor = 1.0
      if (a === 0) {
        relationFactor = relationWeight(persons[b].relationToP1)
      } else if (b === 0) {
        relationFactor = relationWeight(persons[a].relationToP1)
      } else {
        relationFactor =
          (relationWeight(persons[a].relationToP1) + relationWeight(persons[b].relationToP1)) / 2
      }

      const weightedScore = Math.round(rawScore * relationFactor)
      const relation = a === 0 ? persons[b].relationToP1 : persons[a].relationToP1
      const relationNote = a === 0 ? persons[b].relationNoteToP1 : persons[a].relationNoteToP1

      const topAspects: string[] = []
      const topHouseOverlays: string[] = []
      let harmonyAspectCount = 0
      let tensionAspectCount = 0

      if (chartA && chartB) {
        try {
          const synastry = calculateSynastry({ chartA, chartB })
          const top = synastry.aspects.slice(0, 8)
          top.forEach((aspect) => topAspects.push(formatAspectLine(aspect, locale)))

          harmonyAspectCount = synastry.aspects.filter((aspect) =>
            ['conjunction', 'trine', 'sextile'].includes(aspect.type)
          ).length
          tensionAspectCount = synastry.aspects.filter((aspect) =>
            ['square', 'opposition', 'quincunx'].includes(aspect.type)
          ).length

          synastry.houseOverlaysAtoB.slice(0, 2).forEach((overlay) => {
            topHouseOverlays.push(
              locale === 'ko'
                ? `${names[a]}의 ${overlay.planet} → ${names[b]} 하우스 ${overlay.inHouse}`
                : `${names[a]}'s ${overlay.planet} in ${names[b]}'s House ${overlay.inHouse}`
            )
          })
          synastry.houseOverlaysBtoA.slice(0, 2).forEach((overlay) => {
            topHouseOverlays.push(
              locale === 'ko'
                ? `${names[b]}의 ${overlay.planet} → ${names[a]} 하우스 ${overlay.inHouse}`
                : `${names[b]}'s ${overlay.planet} in ${names[a]}'s House ${overlay.inHouse}`
            )
          })
        } catch (error) {
          logger.warn('[Compatibility] Synastry failed', { pair: [a, b], error })
        }
      }

      const insight = buildPairInsights({
        sajuScore,
        astrologyScore,
        crossScore,
        finalScore: weightedScore,
        harmonyAspectCount,
        tensionAspectCount,
        locale,
      })

      const pairLabel = `${names[a]} & ${names[b]}`
      pairAnalyses.push({
        pair: [a, b],
        pairLabel,
        relationLabel: relationLabel(locale, relation, relationNote),
        rawScore,
        weightedScore,
        sajuScore,
        astrologyScore,
        fusionScore,
        crossScore,
        strengths: insight.strengths,
        challenges: insight.challenges,
        advice: insight.advice,
        topAspects,
        topHouseOverlays,
        fusionInsights,
      })

      pairScores.push({
        pair: [a, b],
        score: weightedScore,
      })
    }

    const finalScore = pairScores.length
      ? Math.round(pairScores.reduce((sum, row) => sum + row.score, 0) / pairScores.length)
      : 0

    const primaryPair = pairAnalyses[0] || null
    const isGroup = persons.length > 2
    const { groupAnalysis, synergyBreakdown } = buildGroupPayload(
      names,
      personAnalyses,
      pairAnalyses,
      locale
    )
    const timing = buildTimingPayload(primaryPair, persons, personAnalyses, isGroup, locale)
    const interpretation = buildInterpretationMarkdown({
      locale,
      names,
      persons,
      analyses: personAnalyses,
      pairAnalyses,
      finalScore,
      timing,
    })
    const actionItems = unique(
      pairAnalyses.flatMap((pair) => [
        ...pair.advice,
        ...(pair.fusionInsights?.recommendedActions || []),
      ])
    ).slice(0, 10)
    const fusionEnabled = pairAnalyses.some((pair) => pair.fusionScore !== null)

    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      try {
        await prisma.reading.create({
          data: {
            userId: session.user.id,
            type: 'compatibility',
            title: `${names.slice(0, 2).join(' & ')} Compatibility (${finalScore})`,
            content: JSON.stringify({
              score: finalScore,
              pairScores,
              interpretation: interpretation.substring(0, 1200),
              personLabels: names.map((name, index) => ({
                label: name,
                relation: index > 0 ? persons[index].relationToP1 : 'self',
              })),
            }),
          },
        })
      } catch (saveError) {
        logger.warn('[Compatibility API] Failed to save reading', { saveError })
      }
    }

    const responsePayload = normalizeMojibakePayload({
      interpretation,
      aiInterpretation: interpretation,
      aiModelUsed: 'local-fusion-v2',
      pairs: pairScores,
      pair_details: pairAnalyses,
      average: finalScore,
      overall_score: finalScore,
      relationship_dynamics: primaryPair?.fusionInsights
        ? {
            emotionalIntensity: primaryPair.fusionInsights.emotionalIntensity,
            intellectualAlignment: primaryPair.fusionInsights.intellectualAlignment,
            spiritualConnection: primaryPair.fusionInsights.spiritualConnection,
            conflictResolutionStyle: primaryPair.fusionInsights.conflictResolutionStyle,
          }
        : null,
      future_guidance: primaryPair?.fusionInsights
        ? {
            shortTerm: primaryPair.fusionInsights.shortTerm,
            mediumTerm: primaryPair.fusionInsights.mediumTerm,
            longTerm: primaryPair.fusionInsights.longTerm,
          }
        : null,
      timing,
      action_items: actionItems,
      fusion_enabled: fusionEnabled,
      is_group: isGroup,
      group_analysis: isGroup ? groupAnalysis : null,
      synergy_breakdown: isGroup ? synergyBreakdown : null,
    })
    const response = NextResponse.json(responsePayload)

    response.headers.set('Cache-Control', 'no-store')
    return response
  },
  createPublicStreamGuard({
    route: 'compatibility',
    limit: 30,
    windowSeconds: 60,
  })
)
