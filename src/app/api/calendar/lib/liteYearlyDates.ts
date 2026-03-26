import type {
  DomainKey,
  MonthlyOverlapPoint,
  TimingCalibrationSummary,
} from '@/lib/destiny-matrix/types'
import type { EventCategory, ImportanceGrade } from '@/lib/destiny-map/calendar/types'
import type { UserAstroProfile, UserSajuProfile } from '@/lib/destiny-map/calendar/types'

type CalendarLocale = 'ko' | 'en'

type LiteMatrixCalendarContext = {
  overlapTimeline?: MonthlyOverlapPoint[]
  overlapTimelineByDomain?: Partial<Record<DomainKey, MonthlyOverlapPoint[]>>
  timingCalibration?: TimingCalibrationSummary
  domainScores?: Partial<
    Record<
      DomainKey,
      {
        finalScoreAdjusted?: number
      }
    >
  >
}

export interface LiteImportantDate {
  date: string
  grade: ImportanceGrade
  score: number
  rawScore?: number
  adjustedScore?: number
  displayScore?: number
  categories: EventCategory[]
  titleKey: string
  descKey: string
  ganzhi: string
  crossVerified: boolean
  transitSunSign: string
  sajuFactorKeys: string[]
  astroFactorKeys: string[]
  recommendationKeys: string[]
  warningKeys: string[]
  confidence?: number
  confidenceNote?: string
  crossAgreementPercent?: number
}

type LiteOptions = {
  category?: EventCategory
  limit?: number
  minGrade?: ImportanceGrade
  locale?: CalendarLocale
  matrixContext?: LiteMatrixCalendarContext | null
}

const DOMAIN_TO_CATEGORY: Record<DomainKey, EventCategory> = {
  career: 'career',
  love: 'love',
  money: 'wealth',
  health: 'health',
  move: 'travel',
}

const DOMAIN_LABELS: Record<CalendarLocale, Record<DomainKey, string>> = {
  ko: {
    career: '커리어',
    love: '관계',
    money: '재정',
    health: '건강',
    move: '이동',
  },
  en: {
    career: 'career',
    love: 'relationship',
    money: 'finance',
    health: 'health',
    move: 'movement',
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`
}

function categoryMatchesFilter(categories: EventCategory[], filter?: EventCategory): boolean {
  return !filter || categories.includes(filter)
}

function scoreToGrade(score: number): ImportanceGrade {
  if (score >= 86) return 0
  if (score >= 72) return 1
  if (score >= 58) return 2
  if (score >= 43) return 3
  return 4
}

function getMonthStrength(rows: MonthlyOverlapPoint[] | undefined, month: string): number {
  if (!rows?.length) return 0
  return rows
    .filter((item) => item.month === month)
    .reduce((max, item) => Math.max(max, item.overlapStrength || 0), 0)
}

function getDomainBase(
  matrixContext: LiteMatrixCalendarContext | null | undefined,
  domain: DomainKey
): number {
  const raw = matrixContext?.domainScores?.[domain]?.finalScoreAdjusted
  if (!Number.isFinite(raw)) return 0.52
  return clamp(Number(raw) / 10, 0, 1)
}

function pickTopDomains(
  matrixContext: LiteMatrixCalendarContext | null | undefined,
  currentMonthKey: string
): Array<{ domain: DomainKey; score: number }> {
  const domains: DomainKey[] = ['career', 'love', 'money', 'health', 'move']
  return domains
    .map((domain) => {
      const monthStrength = getMonthStrength(
        matrixContext?.overlapTimelineByDomain?.[domain],
        currentMonthKey
      )
      const score = getDomainBase(matrixContext, domain) * 0.55 + monthStrength * 0.45
      return { domain, score: clamp(score, 0, 1) }
    })
    .sort((left, right) => right.score - left.score)
}

function buildTitle(locale: CalendarLocale, domain: DomainKey, grade: ImportanceGrade): string {
  const label = DOMAIN_LABELS[locale][domain]
  if (locale === 'ko') {
    if (grade <= 1) return `${label} 활용 흐름이 좋은 날`
    if (grade === 2) return `${label} 점검이 필요한 날`
    return `${label} 보수 운영이 필요한 날`
  }
  if (grade <= 1) return `Strong ${label} day`
  if (grade === 2) return `${label} review day`
  return `Conservative ${label} day`
}

function buildDescription(
  locale: CalendarLocale,
  domain: DomainKey,
  grade: ImportanceGrade,
  _primaryStrength: number,
  _crossAgreementPercent: number
): string {
  const label = DOMAIN_LABELS[locale][domain]
  if (locale === 'ko') {
    if (grade <= 1) {
      return `${label} 축이 앞에 서는 날입니다. 월간 흐름과 현재 신호가 같은 방향을 가리켜, 중요한 일은 우선순위를 좁혀 실행하는 편이 좋습니다.`
    }
    if (grade === 2) {
      return `${label} 축은 살아 있지만 확신을 크게 싣기엔 이른 날입니다. 실행보다 조건 확인과 범위 조정이 결과를 더 안정시킵니다.`
    }
    return `${label} 축은 보이지만 추진력보다 제약이 더 큰 날입니다. 무리하게 확정하지 말고 리스크를 줄이는 쪽으로 운영하는 편이 안전합니다.`
  }
  if (grade <= 1) {
    return `${label} stands in front today. Monthly structure and current signals point in the same direction, so narrow the priority and execute cleanly.`
  }
  if (grade === 2) {
    return `${label} is active, but not clean enough for a hard commitment. Reviewing conditions and reducing scope will stabilize the outcome.`
  }
  return `${label} is visible, but constraints are stronger than momentum today. Avoid locking things in and operate on the risk-reduction side.`
}

function buildSajuFactors(
  locale: CalendarLocale,
  profile: UserSajuProfile,
  domain: DomainKey
): string[] {
  const label = DOMAIN_LABELS[locale][domain]
  if (locale === 'ko') {
    return [
      `${profile.dayMaster || '일간'} 기준으로 이번 흐름은 ${label} 축의 우선순위를 올립니다.`,
      `대운·세운의 기본 구조는 ${label} 관련 판단을 성급히 넓히기보다 순서 있게 다루는 편을 지지합니다.`,
    ]
  }
  return [
    `From the day-master frame, the current cycle lifts ${label} as a priority axis.`,
    `The long-cycle structure supports handling ${label} in sequence rather than expanding too fast.`,
  ]
}

function buildAstroFactors(
  locale: CalendarLocale,
  astroProfile: UserAstroProfile,
  domain: DomainKey
): string[] {
  const label = DOMAIN_LABELS[locale][domain]
  const sunSign = astroProfile.sunSign || 'current solar'
  if (locale === 'ko') {
    return [
      `${sunSign} 기준 점성 신호는 ${label} 쪽 점화를 보탭니다.`,
      `단기 트리거는 살아 있어도 지속성은 따로 확인해야 하므로, 작은 검증 단계를 먼저 거는 편이 좋습니다.`,
    ]
  }
  return [
    `Astrology signals around ${sunSign} add trigger pressure to ${label}.`,
    `Even when short-term triggers are alive, sustainability still needs a check, so keep a small verification step first.`,
  ]
}

function buildRecommendations(grade: ImportanceGrade): string[] {
  if (grade <= 1) return ['confidence']
  if (grade === 2) return ['planning']
  return []
}

function buildWarnings(grade: ImportanceGrade, crossAgreementPercent: number): string[] {
  if (grade >= 3 || crossAgreementPercent < 58) return ['confusion']
  return []
}

export function calculateYearlyImportantDatesLite(
  year: number,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile,
  options?: LiteOptions
): LiteImportantDate[] {
  const locale = options?.locale || 'ko'
  const results: LiteImportantDate[] = []
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const reliability = clamp(
    options?.matrixContext?.timingCalibration?.reliabilityScore || 0.58,
    0,
    1
  )

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const currentMonthKey = monthKey(year, month)
    const domainRanking = pickTopDomains(options?.matrixContext, currentMonthKey)
    const primary = domainRanking[0] || { domain: 'career' as DomainKey, score: 0.52 }
    const secondary = domainRanking[1] || { domain: 'love' as DomainKey, score: 0.48 }
    const seasonalPulse = (Math.sin((day / 31) * Math.PI) + 1) / 2
    const weekday = date.getDay()
    const weekdayBoost =
      weekday === 1 || weekday === 4 ? 0.04 : weekday === 0 || weekday === 6 ? -0.03 : 0
    const primaryStrength = clamp(
      primary.score * 0.68 + seasonalPulse * 0.22 + reliability * 0.1 + weekdayBoost,
      0,
      1
    )
    const crossAgreementPercent = Math.round(
      clamp(primary.score * 55 + secondary.score * 20 + reliability * 25, 0, 1) * 100
    )
    const score = Math.round(clamp(38 + primaryStrength * 48 + secondary.score * 9, 15, 96))
    const grade = scoreToGrade(score)
    if (typeof options?.minGrade === 'number' && grade > options.minGrade) {
      continue
    }

    const categories: EventCategory[] = [DOMAIN_TO_CATEGORY[primary.domain], 'general']
    if (secondary.score >= 0.62) {
      const secondaryCategory = DOMAIN_TO_CATEGORY[secondary.domain]
      if (!categories.includes(secondaryCategory)) categories.unshift(secondaryCategory)
    }
    if (!categoryMatchesFilter(categories, options?.category)) {
      continue
    }

    results.push({
      date: isoDate(year, month, day),
      grade,
      score,
      rawScore: score,
      adjustedScore: score,
      displayScore: score,
      categories,
      titleKey: buildTitle(locale, primary.domain, grade),
      descKey: buildDescription(
        locale,
        primary.domain,
        grade,
        primaryStrength,
        crossAgreementPercent
      ),
      ganzhi: '',
      crossVerified: crossAgreementPercent >= 60,
      transitSunSign: astroProfile.sunSign || '',
      sajuFactorKeys: buildSajuFactors(locale, sajuProfile, primary.domain),
      astroFactorKeys: buildAstroFactors(locale, astroProfile, primary.domain),
      recommendationKeys: buildRecommendations(grade),
      warningKeys: buildWarnings(grade, crossAgreementPercent),
      confidence: Math.round(clamp(primaryStrength * 100, 0, 100)),
      confidenceNote:
        locale === 'ko' ? '캘린더 경량 스코어링 기준' : 'Calendar lite scoring baseline',
      crossAgreementPercent,
    })
  }

  results.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade
    return (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
  })

  if (options?.limit) {
    return results.slice(0, options.limit)
  }
  return results
}
