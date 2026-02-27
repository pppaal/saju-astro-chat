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

function normalizeSajuGender(value?: PersonInput['gender']): 'male' | 'female' {
  if (!value) return 'male'
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'f' || normalized === 'female') return 'female'
  return 'male'
}

function buildSajuProfileFromBirth(
  date: string,
  time: string,
  timezone: string,
  gender?: PersonInput['gender']
): SajuProfile | null {
  try {
    const result = calculateSajuData(date, time, normalizeSajuGender(gender), 'solar', timezone)
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

function ensureMinLength(text: string, min: number, filler: string) {
  let out = text.trim()
  while (out.length < min) {
    out = `${out} ${filler}`.trim()
  }
  return out
}

function plainThemeNarrative(locale: LocaleCode, theme: PlainThemeKind, score: number) {
  const isKo = locale === 'ko'
  const high = score >= 75
  const mid = score >= 60
  const band = describeScoreBand(score, locale)

  if (isKo) {
    const intro = `${plainThemeLabel(locale, theme)} 점수는 ${score}/100(${band})입니다. 이 수치는 단순히 좋고 나쁨을 판정하기 위한 값이 아니라, 두 사람의 관계에서 마찰이 생기기 쉬운 지점과 쉽게 맞물리는 지점을 구분하기 위한 실무 지표로 보시면 됩니다.`
    let body = ''

    if (theme === 'personality') {
      body = high
        ? '성향 구조가 비교적 잘 맞아 기본 생활 리듬, 우선순위 배치, 관계 내 역할 분담에서 충돌 확률이 낮은 편입니다. 다만 점수가 높아도 서로의 장점을 당연하게 여기면 오히려 배려가 줄어드는 문제가 생길 수 있으므로, 주 1회 정도는 이번 주에 서로에게 도움이 되었던 행동을 명시적으로 확인하는 루틴을 권장합니다. 또한 의사결정 방식이 유사한 시기에는 빠르게 합의가 되지만, 장기 계획에서는 세부 기준이 달라질 수 있으니 기준표를 미리 정리하는 것이 안정적입니다.'
        : mid
          ? '기본 성향은 맞는 부분과 다른 부분이 뚜렷하게 섞여 있는 구조입니다. 일상에서는 큰 문제 없이 지나가지만 피로가 누적되거나 일정이 촉박해지면 말투, 속도, 기대치의 차이가 빠르게 갈등으로 번질 수 있습니다. 따라서 역할을 유연하게 바꾸기보다, 책임 범위와 결정 권한을 사전에 분명히 정하는 방식이 더 효과적입니다. 특히 의견이 갈릴 때는 누가 맞는지보다 어떤 기준으로 판단할지를 먼저 합의하면 감정 소모를 크게 줄일 수 있습니다.'
          : '기본 성향 차이가 커서 같은 상황을 해석하는 방식이 자주 엇갈릴 가능성이 높습니다. 이런 구간에서는 즉흥적 대화나 분위기 중심 합의가 반복적으로 실패할 수 있으므로, 갈등 발생 전부터 합의 절차를 문장으로 정의해 두는 것이 중요합니다. 예를 들어, 이슈 제기-상대 요약-대안 2개 제시-선택의 순서를 고정하면 감정적 소모를 줄일 수 있습니다. 점수가 낮더라도 절차가 안정되면 관계 만족도는 충분히 개선될 수 있으니, 규칙 기반 운영을 먼저 구축하는 접근이 필요합니다.'
    } else if (theme === 'emotional') {
      body = high
        ? '감정 표현의 타이밍과 공감의 방향이 잘 맞는 편이라, 상대가 원하는 정서적 반응을 비교적 빠르게 주고받을 수 있습니다. 이런 구간에서는 사소한 불편이 커지기 전에 자연스럽게 해소되는 장점이 있습니다. 다만 친밀도가 높을수록 “말 안 해도 알겠지”라는 기대가 생기기 쉬우므로, 감정 상태를 추측으로 처리하지 말고 짧은 확인 질문으로 명확히 하는 습관이 필요합니다. 특히 피곤한 날이나 외부 스트레스가 큰 날에는 감정 언어를 단순화해 전달해야 오해가 줄고 회복 속도가 빨라집니다.'
        : mid
          ? '감정 온도는 맞는 순간과 어긋나는 순간이 번갈아 나타나는 패턴입니다. 한쪽은 공감을 원할 때 다른 쪽이 해결책을 먼저 제시하거나, 반대로 실무적 대안이 필요한데 정서적 위로가 먼저 나와 답답함이 생길 수 있습니다. 이 경우 “지금은 공감이 먼저 필요한지, 해결이 먼저 필요한지”를 대화 시작 문장에 포함시키면 오해를 줄일 수 있습니다. 또한 감정이 커진 직후 결론을 내리기보다 20~30분 냉각 시간을 둔 뒤 재논의하면, 같은 주제도 훨씬 부드럽게 정리되는 경향이 있습니다.'
          : '감정 해석 방식의 차이가 커서 작은 표현도 다르게 받아들일 가능성이 높습니다. 이런 조합에서는 의도와 전달 방식이 자주 분리되어, 실제 메시지보다 말투나 타이밍이 갈등의 핵심이 되기 쉽습니다. 따라서 감정 대화에는 즉답보다 구조가 필요합니다. 예를 들어 사실-느낌-요청 순서로 말하고, 상대는 반박보다 요약 확인을 먼저 하는 규칙을 두면 충돌 강도를 크게 낮출 수 있습니다. 핵심은 감정을 참는 것이 아니라, 감정을 안전하게 다루는 절차를 합의하는 데 있습니다.'
    } else if (theme === 'intimacy') {
      body = high
        ? '친밀감 형성 속도와 애정 표현 방식이 비교적 잘 맞아 관계 만족도를 끌어올리기 좋은 구간입니다. 서로가 안정감을 느끼는 신호를 빠르게 파악할 수 있어 신뢰 회복도 비교적 빠른 편입니다. 다만 높은 끌림이 곧 지속 가능한 친밀도로 자동 전환되지는 않으므로, 생활 리듬과 감정 회복 방식까지 함께 맞추는 관리가 필요합니다. 특히 바쁜 시기에는 짧더라도 정해진 연결 시간을 유지해야 친밀도가 급격히 흔들리지 않습니다. 끌림을 유지하려면 배려의 일관성이 핵심입니다.'
        : mid
          ? '끌림은 분명하지만 친밀도 유지 방식이 완전히 같지는 않은 구조입니다. 한쪽은 빈도와 즉시성을 중요하게 보고, 다른 쪽은 안정감과 예측 가능성을 더 중시할 수 있습니다. 이 차이를 무시하면 “관심이 줄었다” 또는 “압박을 받는다”는 해석으로 번질 수 있으니, 관계 리듬을 주간 단위로 합의하는 것이 효과적입니다. 예를 들어 연락/만남/휴식의 최소 기준을 정해 두면 기대치 충돌을 줄일 수 있습니다. 친밀도는 감정의 크기보다 관리의 반복성에서 안정됩니다.'
          : '친밀도 기대치와 경계 설정 방식의 차이가 큰 구간입니다. 이런 경우에는 감정 강도만으로 관계를 운영하면 피로가 빠르게 누적되고, 한쪽은 과잉 부담을 느끼며 다른 쪽은 정서적 방치를 느낄 수 있습니다. 따라서 우선순위는 끌림 강화가 아니라 안전한 합의 구조를 만드는 것입니다. 경계, 동의, 휴식 규칙을 명확히 합의하고, 불편 신호가 나왔을 때 즉시 조정할 수 있는 프로토콜을 마련해야 관계 손상을 줄일 수 있습니다. 명확한 합의는 친밀도를 떨어뜨리는 것이 아니라 오래 가게 만듭니다.'
    } else if (theme === 'home') {
      body = high
        ? '생활·가정 영역에서는 루틴, 책임 분배, 현실 감각이 비교적 잘 맞는 편입니다. 함께 시간을 보낼 때 누가 무엇을 맡아야 하는지 빠르게 정리되고, 예상치 못한 변수에도 협력적으로 대응할 가능성이 큽니다. 다만 안정 구간에서도 가사·재정·가족 일정은 자동으로 굴러가지 않으므로 월간 점검 루틴을 유지해야 합니다. 특히 비용 분담과 휴식 시간 기준을 문서화해 두면 장기적으로 신뢰가 더 단단해집니다. 생활 합은 감정보다 운영 구조에서 만들어진다는 점을 기억하는 것이 좋습니다.'
        : mid
          ? '생활 영역에서 기본 합은 있으나 세부 기준이 자주 엇갈릴 수 있습니다. 예를 들어 정리 습관, 지출 우선순위, 휴식 방식에서 작은 차이가 누적되면 감정 갈등으로 전이될 수 있습니다. 이 구간에서는 대화로만 맞추기보다 체크리스트 기반 운영이 훨씬 효과적입니다. 주간 할 일 분담표, 고정비/변동비 원칙, 개인 시간 보장 규칙을 정해두면 불필요한 소모가 줄어듭니다. 생활 합은 거창한 이벤트보다 반복 가능한 작은 약속을 지키는 데서 올라갑니다.'
          : '생활·가정 운영 방식이 크게 달라 즉흥 조율만으로는 안정성을 만들기 어려운 구간입니다. 이때 가장 위험한 패턴은 문제 발생 후 감정적으로 수습하는 방식이 반복되는 것입니다. 따라서 사전 규칙이 필수입니다. 시간 관리, 금전 사용, 집안 역할, 가족 이슈 대응 절차를 구체적으로 합의해야 하며, 합의 내용은 말로 끝내지 말고 기록으로 남겨야 재충돌을 줄일 수 있습니다. 점수가 낮더라도 운영 체계를 먼저 세우면 관계 만족도는 충분히 회복 가능합니다.'
    } else {
      body = high
        ? '소통 궁합이 높아 핵심 의도 전달과 피드백 순환이 비교적 안정적입니다. 중요한 의사결정에서도 감정적 방어보다 문제 해결 대화로 전환되는 속도가 빠를 가능성이 큽니다. 이런 조합은 신뢰를 빠르게 쌓을 수 있지만, 익숙함 때문에 확인 과정을 생략하면 오히려 오해가 커질 수 있습니다. 따라서 중요한 주제는 결론만 공유하지 말고 근거와 기대 행동까지 함께 정리해야 합니다. 잘 되는 대화일수록 구조를 유지하면 장기 안정성이 크게 올라갑니다.'
        : mid
          ? '소통은 가능한데 전달 방식의 차이로 효율이 떨어지는 구간입니다. 같은 말을 해도 한쪽은 요약형, 다른 쪽은 맥락형을 선호해 핵심 누락이 생길 수 있습니다. 이 경우 회의·약속·갈등 대화의 형식을 분리하면 효과가 좋아집니다. 예를 들어 갈등 대화는 짧게, 실행 대화는 체크리스트로, 감정 대화는 시간 제한 없이 운영하는 식으로 룰을 나누는 방법이 유용합니다. 소통의 질은 말의 양이 아니라 합의된 형식의 일관성에서 올라갑니다.'
          : '소통 과정에서 의도 오해와 반응 지연이 자주 발생할 수 있는 구간입니다. 특히 민감한 이슈는 한 번의 대화로 해결하려 할수록 방어가 커지고 결론이 흐려질 가능성이 큽니다. 따라서 즉흥 토론보다 단계형 대화가 필요합니다. 이슈 정의-상대 요약-선택지 제시-재확인 순서를 고정하고, 감정이 높은 상태에서는 결정 자체를 미루는 원칙을 두는 것이 좋습니다. 구조화된 소통은 차가운 방식이 아니라, 관계 손상을 막기 위한 안전장치입니다.'
    }

    return ensureMinLength(
      `${intro} ${body}`,
      400,
      '추가로, 서로의 기준을 명확히 말하고 합의 사항을 반복 확인하면 실제 체감 궁합은 점수보다 더 빠르게 좋아질 수 있습니다.'
    )
  }

  const english = `${plainThemeLabel(locale, theme)} is ${score}/100 (${band}). Treat this as an operating guide rather than a fixed verdict. When alignment is high, protect consistency through weekly check-ins; when it is mid, improve role clarity and explicit expectations; when it is low, use structured dialogue and written agreements before major decisions. Long-term outcomes depend less on one-time chemistry and more on repeatable routines for communication, conflict recovery, and responsibility sharing.`
  return ensureMinLength(
    english,
    260,
    'Consistency, explicit agreements, and calm review loops usually improve practical compatibility over time.'
  )
}

function plainThemeLines(locale: LocaleCode, theme: PlainThemeKind, score: number) {
  const safeScore = clamp(Math.round(score), 0, 100)
  const header = `- ${plainThemeLabel(locale, theme)}: ${safeScore}/100 (${describeScoreBand(safeScore, locale)})`
  const narrative = plainThemeNarrative(locale, theme, safeScore)
  return [header, narrative]
}

type ScenarioKind = 'dating' | 'marriage' | 'reunion' | 'cohabitation'

function scenarioLabel(locale: LocaleCode, scenario: ScenarioKind) {
  if (locale === 'ko') {
    if (scenario === 'dating') return '연애 모드'
    if (scenario === 'marriage') return '결혼 모드'
    if (scenario === 'reunion') return '재회 모드'
    return '동거 모드'
  }
  if (scenario === 'dating') return 'Dating mode'
  if (scenario === 'marriage') return 'Marriage mode'
  if (scenario === 'reunion') return 'Reunion mode'
  return 'Cohabitation mode'
}

function scenarioNarrative(locale: LocaleCode, scenario: ScenarioKind, score: number) {
  const isKo = locale === 'ko'
  const high = score >= 75
  const mid = score >= 60
  const band = describeScoreBand(score, locale)

  if (!isKo) {
    const shortGuide = `${scenarioLabel(locale, scenario)} is ${score}/100 (${band}). Focus on clear expectations, practical routines, and predictable repair loops after friction.`
    return ensureMinLength(
      shortGuide,
      220,
      'When the framework is explicit, outcomes usually improve even if raw chemistry fluctuates.'
    )
  }

  let body = ''
  if (scenario === 'dating') {
    body = high
      ? '현재 연애 모드는 끌림과 정서적 반응이 잘 맞아 빠르게 안정감을 만들 수 있는 구간입니다. 다만 점수가 높을수록 오히려 확인 과정이 생략되어 “알아서 이해하겠지”라는 착각이 생기기 쉽습니다. 관계 초반일수록 연락 빈도, 만남 리듬, 갈등 시 대화 규칙을 가볍게라도 합의해 두면 초반 좋은 흐름을 오래 유지할 수 있습니다. 특히 감정이 큰 날에는 결론을 서두르기보다, 요약 확인 문장 한 번을 넣는 것만으로도 오해 확률이 크게 줄어듭니다.'
      : mid
        ? '연애 모드에서는 호감과 매력은 충분하지만, 기대치의 속도 차이가 문제로 떠오를 가능성이 있습니다. 한쪽은 빠른 확신을 원하고 다른 쪽은 단계적 확인을 원할 수 있어, 말의 무게가 엇갈리면 피로가 생깁니다. 이 구간에서는 감정 표현의 양보다 규칙의 명확성이 중요합니다. 예를 들어 바쁜 주간 연락 기준, 약속 변경 기준, 불편 신호 전달 문장을 미리 정해 두면 갈등의 강도를 낮출 수 있습니다. 연애 지속성은 감정 강도보다 운영 리듬에서 결정됩니다.'
        : '연애 모드 점수가 낮은 경우, 끌림 자체가 없다는 의미보다 관계 운영 방식이 불안정할 확률이 높다는 신호에 가깝습니다. 특히 확인되지 않은 기대를 상대에게 투영하면 반복 충돌이 생기기 쉽습니다. 따라서 “관계 정의-경계-연락 리듬-갈등 복구 방식”을 먼저 합의하고, 합의 없는 해석은 보류하는 원칙이 필요합니다. 감정이 앞설수록 대화 구조를 더 단단하게 잡아야 하며, 즉흥적 결론 대신 짧은 쿨다운 후 재논의를 기본 프로토콜로 두는 것이 안전합니다.'
  } else if (scenario === 'marriage') {
    body = high
      ? '결혼 모드에서는 감정 합뿐 아니라 생활 운영 합이 함께 받쳐주는 상태입니다. 장기 파트너십에서 중요한 가사·재정·가족 일정·건강 관리 같은 현실 의제가 비교적 부드럽게 굴러갈 가능성이 큽니다. 다만 점수가 높더라도 자동 운영은 없습니다. 월 1회는 비용/일정/역할을 점검하고, 분기마다 장기 목표를 업데이트해야 안정 구간이 유지됩니다. 결혼 모드에서 신뢰는 사랑의 크기만으로 유지되지 않고, 반복 가능한 운영 시스템이 있을 때 더 단단해집니다.'
      : mid
        ? '결혼 모드는 가능한데, 세부 생활 기준에서 자주 이견이 생길 수 있는 패턴입니다. 특히 돈·시간·가족 이슈는 감정 문제로 번지기 쉬워 “누가 맞는가” 싸움으로 가면 장기 피로가 누적됩니다. 이 단계에서는 역할표와 의사결정 권한을 문장으로 고정하는 것이 핵심입니다. 고정비/변동비 원칙, 휴식 시간 보장, 갈등 시 의사결정 유예 규칙을 마련하면 체감 갈등이 크게 줄어듭니다. 결혼 모드는 낭만보다 운영력에서 점수가 실제로 올라갑니다.'
        : '결혼 모드 점수가 낮다면 지금 당장 불가능하다는 뜻이 아니라, 준비 없이 진행할 경우 마찰 비용이 매우 커질 수 있다는 경고 신호입니다. 정서적 애착만으로 생활 시스템을 대신할 수는 없습니다. 따라서 결혼 전 단계에서 반드시 점검해야 할 것은 가치관 선언이 아니라 운영 계약입니다. 시간·재정·가사·가족 경계·갈등 복구 절차를 문서로 합의하고, 시범 운영 기간을 두어 실제 작동 여부를 확인해야 합니다. 구조가 준비되면 낮은 점수도 현실적으로 개선 가능합니다.'
  } else if (scenario === 'reunion') {
    body = high
      ? '재회 모드 점수가 높은 경우는 감정 회복 가능성과 소통 복구 가능성이 동시에 살아 있다는 뜻입니다. 다만 재회에서 가장 중요한 것은 “다시 만난다”보다 “같은 패턴을 반복하지 않게 설계한다”입니다. 과거 갈등 원인을 사건 중심이 아니라 구조 중심으로 정리해야 하며, 특히 불편 신호를 어떻게 전달하고 어떻게 복구할지 절차를 새로 합의해야 합니다. 재회 직후에는 감정이 과열되기 쉬우므로 관계 속도를 단계적으로 올리고, 2~4주 단위 점검 루틴을 운영하는 것이 재이탈을 막는 핵심입니다.'
      : mid
        ? '재회 가능성은 있으나 과거 패턴의 재발 위험도 함께 존재하는 구간입니다. 이 경우 감정 확인만으로는 충분하지 않고, 이별로 이어졌던 트리거를 구체적으로 재정의해야 합니다. 특히 의도 오해, 응답 속도, 책임 분배, 경계 침범 같은 반복 포인트를 체크리스트로 만들고, 재회 후 첫 달에 실행 점검을 해야 합니다. 말로는 “달라지겠다”가 쉽지만, 행동 기준이 없으면 과거 루프로 돌아가기 쉽습니다. 재회 성공률은 진정성보다 복구 프로토콜의 완성도에서 갈립니다.'
        : '재회 모드 점수가 낮다면 미련의 강도와 관계 지속 가능성을 분리해서 봐야 한다는 의미입니다. 감정이 남아 있어도 운영 체계가 바뀌지 않으면 같은 문제를 더 빠르게 반복할 수 있습니다. 따라서 재회를 검토하더라도 즉시 결합보다 평가 단계를 두는 것이 안전합니다. 일정 기간 연락 규칙, 갈등 대화 규칙, 경계 준수 여부를 관찰하고 기준을 충족할 때만 관계 단계를 올리는 방식이 필요합니다. 재회는 감정의 재시작이 아니라 시스템의 재설계라는 관점으로 접근해야 손상을 줄일 수 있습니다.'
  } else {
    body = high
      ? '동거 모드가 높다는 것은 정서적 친밀감과 생활 운영력이 함께 작동할 가능성이 높다는 뜻입니다. 동거는 연애보다 운영 밀도가 높아 작은 습관 차이도 빠르게 체감되기 때문에, 시작 전 합의가 매우 중요합니다. 취침/청소/식사/지출/개인 시간 같은 기본 루틴을 먼저 합의하면 불필요한 감정 소모를 크게 줄일 수 있습니다. 또한 개인 공간과 공동 공간의 경계를 명확히 해야 친밀감이 유지됩니다. 동거 안정성은 사랑의 강도보다 경계와 규칙의 선명도에서 결정됩니다.'
      : mid
        ? '동거 모드는 가능하지만 초기 마찰 관리가 핵심인 구간입니다. 한쪽은 편의 중심, 다른 쪽은 규칙 중심일 수 있어 사소한 습관이 반복 갈등으로 확대될 수 있습니다. 따라서 동거 전 시범 운영(주말 동선, 생활비 분담, 집안일 분배)을 통해 현실 적합도를 확인하는 절차가 필요합니다. 특히 피로가 쌓이는 평일 기준으로 루틴을 맞춰야 실제 유지력이 올라갑니다. 감정이 좋을 때 시작하는 것보다, 갈등이 생겼을 때도 굴러가는 구조를 먼저 만드는 것이 동거 성공에 더 중요합니다.'
        : '동거 모드 점수가 낮으면 동거 자체를 금지해야 한다는 뜻이 아니라, 준비 없이 시작하면 감정 손실이 커질 가능성이 높다는 뜻입니다. 동거는 관계의 시험장이 아니라 생활 시스템의 실전 운영입니다. 규칙 없는 동거는 친밀감을 높이기보다 피로와 실망을 키울 수 있으므로, 최소한 비용 원칙·역할 분담·갈등 중단 신호·개인 시간 보장 규칙을 합의한 뒤 시작해야 합니다. 가능하다면 단계형 전환(부분 동선 공유 → 단기 동거 → 정식 동거)으로 리스크를 분산하는 접근이 안전합니다.'
  }

  const intro = `${scenarioLabel(locale, scenario)} 점수는 ${score}/100(${band})입니다. 아래 내용은 감정적 위로가 아니라 실제 관계 운영에서 바로 적용할 수 있도록 정리한 실행형 가이드입니다.`
  return ensureMinLength(
    `${intro} ${body}`,
    400,
    '핵심은 감정의 크기를 증명하는 것이 아니라, 합의된 규칙을 반복 실행해 신뢰를 축적하는 것입니다.'
  )
}

function scenarioGuideLines(locale: LocaleCode, scenario: ScenarioKind, score: number) {
  const safeScore = clamp(Math.round(score), 0, 100)
  const header = `- ${scenarioLabel(locale, scenario)}: ${safeScore}/100 (${describeScoreBand(safeScore, locale)})`
  const narrative = scenarioNarrative(locale, scenario, safeScore)
  return [header, narrative]
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

function weekdayInTimeZone(date: Date, tz: string = 'Asia/Seoul'): number {
  const safeTz = typeof tz === 'string' && tz.trim() ? tz.trim() : 'Asia/Seoul'
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: safeTz })
    .format(date)
    .toLowerCase()
    .slice(0, 3)
  return WEEKDAY_INDEX[short] ?? date.getDay()
}

function formatDateBadge(date: Date, tz: string = 'Asia/Seoul', locale: LocaleCode): string {
  const safeTz = typeof tz === 'string' && tz.trim() ? tz.trim() : 'Asia/Seoul'
  const formatter = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: safeTz,
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
  tz: string = 'Asia/Seoul',
  locale: LocaleCode,
  limit = 3
): string[] {
  const safeTz = typeof tz === 'string' && tz.trim() ? tz.trim() : 'Asia/Seoul'
  const targetWeekdays = parseWeekdayIndexes(weekdayLabel)
  if (targetWeekdays.length === 0) {
    return []
  }

  const matches: string[] = []
  const now = new Date()
  for (let offset = 0; offset < 28 && matches.length < limit; offset++) {
    const candidate = new Date(now)
    candidate.setDate(now.getDate() + offset)
    const candidateWeekday = weekdayInTimeZone(candidate, safeTz)
    if (targetWeekdays.includes(candidateWeekday)) {
      matches.push(formatDateBadge(candidate, safeTz, locale))
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
  const datingScore = clamp(
    Math.round(emotionalScore * 0.4 + intimacyScore * 0.4 + communicationScore * 0.2),
    0,
    100
  )
  const marriageScore = clamp(
    Math.round(homeScore * 0.45 + personalityScore * 0.25 + communicationScore * 0.3),
    0,
    100
  )
  const reunionScore = clamp(
    Math.round(
      communicationScore * 0.35 +
        emotionalScore * 0.35 +
        (primaryPair.crossScore ?? primaryPair.weightedScore) * 0.3
    ),
    0,
    100
  )
  const cohabitationScore = clamp(
    Math.round(homeScore * 0.5 + communicationScore * 0.3 + emotionalScore * 0.2),
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
  lines.push(...plainThemeLines(locale, 'personality', personalityScore))
  lines.push(...plainThemeLines(locale, 'emotional', emotionalScore))
  lines.push(...plainThemeLines(locale, 'intimacy', intimacyScore))
  lines.push(...plainThemeLines(locale, 'home', homeScore))
  lines.push(...plainThemeLines(locale, 'communication', communicationScore))
  lines.push('')

  lines.push(isKo ? '## 상황별 관계 운영 가이드' : '## Scenario-Based Relationship Guide')
  lines.push('')
  lines.push(...scenarioGuideLines(locale, 'dating', datingScore))
  lines.push(...scenarioGuideLines(locale, 'marriage', marriageScore))
  lines.push(...scenarioGuideLines(locale, 'reunion', reunionScore))
  lines.push(...scenarioGuideLines(locale, 'cohabitation', cohabitationScore))
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
          gender: person.gender,
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
        const sajuProfile = buildSajuProfileFromBirth(
          person.date,
          person.time,
          person.timeZone,
          person.gender
        )
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
