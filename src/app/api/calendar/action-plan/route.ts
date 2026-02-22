import { z } from 'zod'
import {
  apiError,
  apiSuccess,
  createPublicStreamGuard,
  ErrorCodes,
  extractLocale,
  withApiMiddleware,
} from '@/lib/api/middleware'
import { createValidationErrorResponse, dateSchema } from '@/lib/api/zodValidation'
import { LIST_LIMITS, TEXT_LIMITS } from '@/lib/constants/api-limits'
import { logger } from '@/lib/logger'
import { normalizeMojibakePayload, repairMojibakeText } from '@/lib/text/mojibake'
import { calculateDailyPillar, generateHourlyAdvice } from '@/lib/prediction/ultra-precision-daily'
import { STEM_ELEMENTS } from '@/lib/destiny-map/config/specialDays.data'
import { getHourlyRecommendation } from '@/lib/destiny-map/calendar/specialDays-analysis'
import { apiClient } from '@/lib/api/ApiClient'
import { checkPremiumFromDatabase } from '@/lib/stripe/premiumCache'

type TimelineTone = 'best' | 'caution' | 'neutral'

type TimelineSlot = {
  hour: number
  minute?: number
  label?: string
  note: string
  tone?: TimelineTone
  evidenceSummary?: string[]
  source?: 'rule' | 'rag' | 'hybrid'
}

type CalendarEvidence = {
  matrix?: {
    domain?: 'career' | 'love' | 'money' | 'health' | 'move' | 'general'
    finalScoreAdjusted?: number
    overlapStrength?: number
    peakLevel?: 'peak' | 'high' | 'normal'
    monthKey?: string
  }
  cross?: {
    sajuEvidence?: string
    astroEvidence?: string
    sajuDetails?: string[]
    astroDetails?: string[]
    bridges?: string[]
  }
  confidence?: number
  source?: 'rule' | 'rag' | 'hybrid'
}

type RagContextResponse = {
  rag_context?: {
    sipsin?: string
    timing?: string
    query_result?: string
    insights?: string[]
  }
}

const CALENDAR_AI_PREMIUM_ONLY = false
const CALENDAR_AI_CREDIT_COST = 0

const actionPlanTimelineRequestSchema = z.object({
  date: dateSchema,
  locale: z.enum(['ko', 'en']).optional(),
  timezone: z.string().max(TEXT_LIMITS.MAX_TIMEZONE).optional(),
  intervalMinutes: z.union([z.literal(30), z.literal(60)]).optional(),
  calendar: z
    .object({
      grade: z.number().min(0).max(4).optional(),
      score: z.number().min(0).max(100).optional(),
      categories: z
        .array(z.string().max(TEXT_LIMITS.MAX_TITLE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      bestTimes: z
        .array(z.string().max(TEXT_LIMITS.MAX_TITLE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      warnings: z
        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      recommendations: z
        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      sajuFactors: z
        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      astroFactors: z
        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      title: z.string().max(TEXT_LIMITS.MAX_TITLE).optional(),
      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
      ganzhi: z.string().max(TEXT_LIMITS.MAX_TITLE).optional(),
      transitSunSign: z.string().max(TEXT_LIMITS.MAX_TITLE).optional(),
      evidence: z
        .object({
          matrix: z
            .object({
              domain: z.enum(['career', 'love', 'money', 'health', 'move', 'general']).optional(),
              finalScoreAdjusted: z.number().min(0).max(10).optional(),
              overlapStrength: z.number().min(0).max(1).optional(),
              peakLevel: z.enum(['peak', 'high', 'normal']).optional(),
              monthKey: z.string().max(20).optional(),
            })
            .optional(),
          cross: z
            .object({
              sajuEvidence: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              astroEvidence: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              sajuDetails: z
                .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                .max(LIST_LIMITS.MAX_LIST_ITEMS)
                .optional(),
              astroDetails: z
                .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                .max(LIST_LIMITS.MAX_LIST_ITEMS)
                .optional(),
              bridges: z
                .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                .max(LIST_LIMITS.MAX_LIST_ITEMS)
                .optional(),
            })
            .optional(),
          confidence: z.number().min(0).max(100).optional(),
          source: z.enum(['rule', 'rag', 'hybrid']).optional(),
        })
        .optional(),
    })
    .nullable()
    .optional(),
  icp: z
    .object({
      primaryStyle: z.string().max(10).optional(),
      secondaryStyle: z.string().max(10).optional().nullable(),
      dominanceScore: z.number().min(0).max(100).optional(),
      affiliationScore: z.number().min(0).max(100).optional(),
      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
      traits: z
        .array(z.string().max(TEXT_LIMITS.MAX_KEYWORD))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
    })
    .nullable()
    .optional(),
  persona: z
    .object({
      typeCode: z.string().max(20).optional(),
      personaName: z.string().max(TEXT_LIMITS.MAX_NAME).optional(),
      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
      strengths: z
        .array(z.string().max(TEXT_LIMITS.MAX_KEYWORD))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      challenges: z
        .array(z.string().max(TEXT_LIMITS.MAX_KEYWORD))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      guidance: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
      motivations: z
        .array(z.string().max(TEXT_LIMITS.MAX_KEYWORD))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      axes: z
        .record(
          z.string().max(20),
          z.object({
            pole: z.string().max(TEXT_LIMITS.MAX_KEYWORD),
            score: z.number().min(0).max(100),
          })
        )
        .optional(),
    })
    .nullable()
    .optional(),
})

const trimList = <T>(items: T[] | undefined, max: number): T[] | undefined => {
  if (!items || items.length === 0) return undefined
  return items.slice(0, max)
}

const extractHoursFromText = (value: string) => {
  if (!value || /년|월/.test(value)) return [] as number[]
  const normalized = value.replace(/\s+/g, '')
  const rangeMatch = normalized.match(/(\d{1,2})(?::\d{2})?[-~](\d{1,2})/)
  if (rangeMatch) {
    const start = Number(rangeMatch[1])
    const end = Number(rangeMatch[2])
    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > 23) return []
    const safeEnd = Math.min(24, Math.max(0, end))
    if (safeEnd <= start) return [start]
    return Array.from({ length: safeEnd - start }, (_, idx) => start + idx)
  }
  const singleMatch = normalized.match(/(\d{1,2})(?::\d{2})?/)
  if (!singleMatch) return []
  const hour = Number(singleMatch[1])
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return []
  return [hour]
}

const cleanGuidanceText = (value: string, maxLength = 96): string => {
  const normalized = repairMojibakeText(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return ''

  const noEvidenceTail = normalized.replace(/\s*(근거|evidence)\s*:.*/i, '').trim()
  const noHype = noEvidenceTail
    .replace(
      /\b(자시|축시|인시|묘시|진시|사시|오시|미시|신시|유시|술시|해시)\s*\(([^)]*)\)\s*:?/g,
      ''
    )
    .replace(/\b(자시|축시|인시|묘시|진시|사시|오시|미시|신시|유시|술시|해시)\b/g, '')
    .replace(/\b(?:Ja|Chuk|In|Myo|Jin|Sa|O|Mi|Shin|Yu|Sul|Hae)-si\b[^:]*:?/gi, '')
    .replace(/인생을 바꿀[^.!\n]*/g, '')
    .replace(/완벽한 날[^.!\n]*/g, '')
    .replace(/1년에 몇 번[^.!\n]*/g, '')
    .replace(/에너지가 도와줘요!?/g, '')
    .replace(/청첩장[^.!\n]*/g, '')
    .replace(/예식장 예약[^.!\n]*/g, '')
    .replace(/핵심 1~2개[^.!\n]*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const cleaned = noHype.replace(/(?:\.\.\.|…|~)+$/g, '').trim()
  if (cleaned.includes('\uFFFD')) return ''
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, Math.max(20, maxLength - 3)).trimEnd()}...`
}

const pickCrossLineByTone = (lines: string[] | undefined, tone: TimelineTone): string => {
  const list = (lines || []).map((line) => cleanGuidanceText(line, 120)).filter(Boolean)
  if (list.length === 0) return ''

  const hardPattern = /(square|opposition|긴장|충돌|압박|friction|caution|\u26a0)/i
  const softPattern = /(trine|sextile|지원|기회|흐름|support|flow|\u2705)/i

  if (tone === 'caution') {
    return list.find((line) => hardPattern.test(line)) || list[0]
  }
  if (tone === 'best') {
    return list.find((line) => softPattern.test(line)) || list[0]
  }
  return list[0]
}

const buildCrossReasonText = (
  cross:
    | {
        sajuEvidence?: string
        astroEvidence?: string
        sajuDetails?: string[]
        astroDetails?: string[]
        bridges?: string[]
      }
    | undefined,
  tone: TimelineTone,
  locale: 'ko' | 'en'
): string => {
  if (!cross) return ''
  const astro =
    pickCrossLineByTone(cross.astroDetails, tone) ||
    cleanGuidanceText(cross.astroEvidence || '', 92)
  const saju =
    pickCrossLineByTone(cross.sajuDetails, tone) || cleanGuidanceText(cross.sajuEvidence || '', 80)
  if (!astro && !saju) return ''
  const merged = [astro, saju].filter(Boolean).join(' + ')
  const prefix = locale === 'ko' ? '근거: ' : 'Evidence: '
  return cleanGuidanceText(`${prefix}${merged}`, 132)
}

const CATEGORY_FOCUS_HINTS: Record<
  string,
  {
    ko: { morning: string; day: string; evening: string }
    en: { morning: string; day: string; evening: string }
  }
> = {
  career: {
    ko: {
      morning: '중요 업무 1건을 먼저 밀어붙이세요',
      day: '협업/보고는 핵심만 짧게 정리하세요',
      evening: '내일 우선순위를 3개로 압축하세요',
    },
    en: {
      morning: 'Push one high-impact work item first',
      day: 'Keep collaboration and updates concise',
      evening: 'Compress tomorrow into 3 priorities',
    },
  },
  wealth: {
    ko: {
      morning: '지출/투자 기준선을 먼저 확정하세요',
      day: '금전 의사결정은 수치 재확인 후 진행하세요',
      evening: '현금흐름 메모를 5분만 정리하세요',
    },
    en: {
      morning: 'Lock spending and investment guardrails first',
      day: 'Confirm numbers before money decisions',
      evening: 'Do a quick 5-minute cash-flow review',
    },
  },
  love: {
    ko: {
      morning: '감정 표현보다 의도를 먼저 명확히 하세요',
      day: '민감한 대화는 사실 확인부터 시작하세요',
      evening: '관계 대화 20분을 확보하세요',
    },
    en: {
      morning: 'Clarify intent before emotional messaging',
      day: 'Start sensitive talks with facts first',
      evening: 'Reserve 20 minutes for relationship conversation',
    },
  },
  health: {
    ko: {
      morning: '가벼운 운동으로 몸을 먼저 깨우세요',
      day: '과부하를 줄이고 수분/호흡을 챙기세요',
      evening: '수면 준비 루틴을 앞당기세요',
    },
    en: {
      morning: 'Wake your body with light movement',
      day: 'Reduce overload and protect hydration/breathing',
      evening: 'Start your sleep routine earlier',
    },
  },
  travel: {
    ko: {
      morning: '동선과 출발시간을 먼저 재점검하세요',
      day: '이동 중 변수 대비책을 준비하세요',
      evening: '내일 일정 버퍼를 확보하세요',
    },
    en: {
      morning: 'Re-check route and departure timing',
      day: 'Prepare a contingency for travel variables',
      evening: 'Add time buffer for tomorrow',
    },
  },
  study: {
    ko: {
      morning: '집중 학습 블록을 먼저 실행하세요',
      day: '핵심 개념 3개만 고정해서 복습하세요',
      evening: '요약 노트를 짧게 마무리하세요',
    },
    en: {
      morning: 'Run a focused study block first',
      day: 'Review only 3 core concepts',
      evening: 'Close with a short summary note',
    },
  },
}

function getTimeBucket(hour: number): 'morning' | 'day' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
}

function getCategoryFocusHint(
  category: string | undefined,
  hour: number,
  locale: 'ko' | 'en'
): string {
  const normalized = category || 'career'
  const hint = CATEGORY_FOCUS_HINTS[normalized]
  if (!hint) return locale === 'ko' ? '핵심 1가지에 집중하세요' : 'Focus on one core action'
  const bucket = getTimeBucket(hour)
  return hint[locale][bucket]
}

function pickByHour(items: string[] | undefined, hour: number): string | null {
  if (!items || items.length === 0) return null
  const index =
    hour < 10 ? 0 : hour < 16 ? Math.min(1, items.length - 1) : Math.min(2, items.length - 1)
  const value = items[index]
  return value ? value.trim() : null
}

function pickCategoryByHour(categories: string[] | undefined, hour: number): string {
  if (!categories || categories.length === 0) return 'career'
  const index =
    hour < 10
      ? 0
      : hour < 16
        ? Math.min(1, categories.length - 1)
        : Math.min(2, categories.length - 1)
  return (categories[index] || categories[0] || 'career').trim().toLowerCase()
}

type ActionPlanIcpProfile =
  | {
      primaryStyle?: string
      secondaryStyle?: string | null
      dominanceScore?: number
      affiliationScore?: number
      summary?: string
      traits?: string[]
    }
  | null
  | undefined

type ActionPlanPersonaProfile =
  | {
      typeCode?: string
      personaName?: string
      summary?: string
      strengths?: string[]
      challenges?: string[]
      guidance?: string
      motivations?: string[]
      axes?: Record<string, { pole: string; score: number }>
    }
  | null
  | undefined

function getHourlyWindowLabel(hour: number, locale: 'ko' | 'en'): string {
  if (locale === 'ko') {
    if (hour < 6) return '심야 저소음 구간: 정리·휴식 중심으로 운용하세요'
    if (hour < 9) return '아침 시동 구간: 워밍업 후 핵심 업무를 시작하세요'
    if (hour < 12) return '오전 집중 구간: 복잡한 판단/실행을 우선 배치하세요'
    if (hour < 15) return '점심 이후 조정 구간: 협업·정리에 유리합니다'
    if (hour < 18) return '오후 실행 구간: 결과물 마감 속도를 올리세요'
    if (hour < 21) return '저녁 관계 구간: 소통·관계 관리의 효율이 높습니다'
    return '야간 회복 구간: 과부하를 줄이고 다음 날을 준비하세요'
  }

  if (hour < 6) return 'Late-night low-noise window: favor cleanup and recovery'
  if (hour < 9) return 'Morning ramp-up window: start with one core task'
  if (hour < 12) return 'AM focus window: prioritize complex decisions and execution'
  if (hour < 15) return 'Post-lunch adjustment window: good for collaboration and review'
  if (hour < 18) return 'PM execution window: raise closure speed on deliverables'
  if (hour < 21) return 'Evening relationship window: communication quality tends to improve'
  return 'Night recovery window: reduce load and prep for tomorrow'
}

function buildPersonalizationHint(input: {
  locale: 'ko' | 'en'
  tone: TimelineTone
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
}): string {
  const { locale, tone, icp, persona } = input
  const hints: string[] = []

  const dominance = icp?.dominanceScore
  const affiliation = icp?.affiliationScore

  if (typeof dominance === 'number') {
    if (dominance >= 70) {
      hints.push(
        locale === 'ko'
          ? tone === 'caution'
            ? '결론을 미루고 체크리스트 3개부터 검증하세요'
            : '1차 결론을 빠르게 내고 후속 보완으로 마무리하세요'
          : tone === 'caution'
            ? 'Delay final decision and validate 3 checklist items first'
            : 'Lock a first decision quickly, then close with follow-up refinement'
      )
    } else if (dominance <= 35) {
      hints.push(
        locale === 'ko'
          ? '의사결정 전에 기준 2~3개를 먼저 고정하세요'
          : 'Fix 2-3 decision criteria before taking action'
      )
    }
  }

  if (typeof affiliation === 'number') {
    if (affiliation >= 70) {
      hints.push(
        locale === 'ko'
          ? '핵심 관계자 1명에게 먼저 공유해 오해를 줄이세요'
          : 'Pre-brief one key stakeholder to reduce misunderstanding'
      )
    } else if (affiliation <= 30) {
      hints.push(
        locale === 'ko'
          ? '알림을 끄고 40분 단독 집중 블록을 확보하세요'
          : 'Silence notifications and secure a 40-minute solo focus block'
      )
    }
  }

  const decisionPole = persona?.axes?.decision?.pole
  if (decisionPole === 'logic') {
    hints.push(
      locale === 'ko'
        ? '판단은 감각보다 수치/근거 2개를 기준으로 두세요'
        : 'Anchor decisions on two concrete metrics over intuition'
    )
  } else if (decisionPole === 'empathic') {
    hints.push(
      locale === 'ko'
        ? '결정 전에 상대 영향 1가지를 먼저 확인하세요'
        : 'Before deciding, check one human-impact factor first'
    )
  }

  const rhythmPole = persona?.axes?.rhythm?.pole
  if (rhythmPole === 'flow') {
    hints.push(
      locale === 'ko'
        ? '짧은 스프린트 2회로 추진력을 유지하세요'
        : 'Use two short sprints to maintain momentum'
    )
  } else if (rhythmPole === 'anchor') {
    hints.push(
      locale === 'ko'
        ? '정해진 순서 3단계로 진행하면 흔들림이 줄어듭니다'
        : 'Follow a fixed 3-step sequence to reduce drift'
    )
  }

  return cleanGuidanceText(hints[0] || '', 84)
}

function buildPersonalSummaryTag(input: {
  locale: 'ko' | 'en'
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
}): string | null {
  const { locale, icp, persona } = input
  const tokens: string[] = []

  if (icp?.primaryStyle)
    tokens.push(locale === 'ko' ? `ICP ${icp.primaryStyle}` : `ICP ${icp.primaryStyle}`)
  if (persona?.personaName) {
    tokens.push(
      locale === 'ko' ? `페르소나 ${persona.personaName}` : `Persona ${persona.personaName}`
    )
  } else if (persona?.typeCode) {
    tokens.push(locale === 'ko' ? `페르소나 ${persona.typeCode}` : `Persona ${persona.typeCode}`)
  }

  if (tokens.length === 0) return null
  return locale === 'ko' ? `개인화: ${tokens.join(', ')}` : `Personalization: ${tokens.join(', ')}`
}

const buildRuleBasedTimeline = (input: {
  date: string
  locale: 'ko' | 'en'
  intervalMinutes: 30 | 60
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
  calendar?: {
    grade?: number
    categories?: string[]
    bestTimes?: string[]
    recommendations?: string[]
    warnings?: string[]
    summary?: string
    sajuFactors?: string[]
    astroFactors?: string[]
    evidence?: CalendarEvidence
  } | null
}): TimelineSlot[] => {
  const { date, locale, intervalMinutes, calendar, icp, persona } = input
  const [year, month, day] = date.split('-').map(Number)
  const dateValue = new Date(Date.UTC(year, month - 1, day))
  const weekdayIndex = Number.isNaN(dateValue.getTime()) ? 1 : dateValue.getUTCDay()

  const daily = calculateDailyPillar(dateValue)
  const dayMasterElement = STEM_ELEMENTS[daily.stem] || 'wood'

  const bestHours = new Set<number>()
  calendar?.bestTimes?.forEach((time) => {
    extractHoursFromText(time).forEach((hour) => bestHours.add(hour))
  })

  const cautionHours = new Set<number>()
  calendar?.warnings?.forEach((warning) => {
    extractHoursFromText(warning).forEach((hour) => cautionHours.add(hour))
  })
  if ((calendar?.grade ?? 2) >= 3) {
    cautionHours.add(13)
    cautionHours.add(21)
  }

  const hourlyAdvice = generateHourlyAdvice(daily.stem, daily.branch)
  const slots: TimelineSlot[] = []
  const slotsPerHour = intervalMinutes === 30 ? 2 : 1

  for (let hour = 0; hour < 24; hour++) {
    for (let slotIdx = 0; slotIdx < slotsPerHour; slotIdx++) {
      const minute = slotIdx === 0 ? 0 : 30
      const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

      const energyText = getHourlyWindowLabel(hour, locale)

      const hourlyRec = getHourlyRecommendation(hour, weekdayIndex, dayMasterElement)
      const advice = hourlyAdvice[hour]
      let tone: TimelineTone =
        advice?.quality === 'excellent'
          ? 'best'
          : advice?.quality === 'caution'
            ? 'caution'
            : 'neutral'

      if (bestHours.has(hour)) {
        tone = 'best'
      }
      if (cautionHours.has(hour)) {
        tone = 'caution'
      }

      const category = pickCategoryByHour(calendar?.categories, hour)
      const focusHint = getCategoryFocusHint(category, hour, locale)
      const recHint = cleanGuidanceText(pickByHour(calendar?.recommendations, hour) || '', 78)
      const warningHint = cleanGuidanceText(pickByHour(calendar?.warnings, hour) || '', 78)
      const matrixSummary =
        typeof calendar?.evidence?.confidence === 'number'
          ? `Signals: confidence ${calendar.evidence.confidence}%`
          : null
      const primaryAstroLine =
        pickCrossLineByTone(calendar?.evidence?.cross?.astroDetails, tone) ||
        cleanGuidanceText(calendar?.evidence?.cross?.astroEvidence || '', 112)
      const primaryBridgeLine =
        pickCrossLineByTone(calendar?.evidence?.cross?.bridges, tone) ||
        [calendar?.sajuFactors?.[0], calendar?.astroFactors?.[0]]
          .map((line) => cleanGuidanceText(line || '', 96))
          .filter(Boolean)
          .join(' / ')
      const crossReason = buildCrossReasonText(calendar?.evidence?.cross, tone, locale)
      const crossSummary =
        primaryAstroLine ||
        primaryBridgeLine ||
        cleanGuidanceText(calendar?.evidence?.cross?.sajuDetails?.[0] || '', 112)
      const personalHint = buildPersonalizationHint({ locale, tone, icp, persona })

      const best = hourlyRec.bestActivities.slice(0, 2).join(', ')
      const avoid = hourlyRec.avoidActivities.slice(0, 2).join(', ')

      let detailLine = ''
      if (locale === 'ko') {
        if (tone === 'caution') {
          detailLine = `${focusHint}. ${
            warningHint ? `주의 포인트: ${warningHint}` : `주의: ${avoid || '무리한 결정'}`
          }`
        } else {
          detailLine = `${focusHint}. ${
            recHint ? `실행: ${recHint}` : `추천: ${best || '핵심 업무'}`
          }`
        }
        if (personalHint) {
          detailLine = `${detailLine}. 개인화: ${personalHint}`
        }
      } else {
        if (tone === 'caution') {
          detailLine = `${focusHint}. ${
            warningHint ? `Watch-out: ${warningHint}` : 'Avoid high-risk decisions right now'
          }.`
        } else {
          detailLine = `${focusHint}. ${recHint ? `Action: ${recHint}` : 'Action: do one focused task'}.`
        }
        if (personalHint) {
          detailLine = `${detailLine} Personalized: ${personalHint}.`
        }
      }

      const noteParts = [
        cleanGuidanceText(energyText, 54),
        cleanGuidanceText(detailLine, 108),
        crossReason,
      ]
        .filter(Boolean)
        .slice(0, 3)
      const note = repairMojibakeText(noteParts.join(' \u00b7 ').trim())
      const evidenceSummary = Array.from(
        new Set(
          [
            cleanGuidanceText(matrixSummary || 'Matrix baseline evidence', 90),
            cleanGuidanceText(crossSummary || 'Cross evidence: baseline saju/astro flow', 124),
            cleanGuidanceText(
              personalHint
                ? locale === 'ko'
                  ? `개인화 근거: ${personalHint}`
                  : `Personalized basis: ${personalHint}`
                : primaryBridgeLine || '',
              124
            ),
          ].filter(Boolean)
        )
      ).slice(0, 3)
      slots.push({ hour, minute, label, note, tone, evidenceSummary, source: 'rule' })
    }
  }

  return slots
}

const sanitizeTimelineForInterval = (raw: unknown, intervalMinutes: 30 | 60): TimelineSlot[] => {
  if (!Array.isArray(raw)) return []
  const cleaned: TimelineSlot[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const hour = Number((item as { hour?: unknown }).hour)
    const minuteRaw = (item as { minute?: unknown }).minute
    const minute = minuteRaw === undefined ? 0 : Number(minuteRaw)
    const noteRaw = (item as { note?: unknown }).note
    const note = typeof noteRaw === 'string' ? repairMojibakeText(noteRaw.trim()) : ''
    const toneRaw = (item as { tone?: unknown }).tone
    const tone =
      toneRaw === 'best' || toneRaw === 'caution' || toneRaw === 'neutral' ? toneRaw : undefined
    const evidenceRaw = (item as { evidenceSummary?: unknown }).evidenceSummary
    const evidenceSummary = Array.isArray(evidenceRaw)
      ? evidenceRaw
          .map((line) => (typeof line === 'string' ? repairMojibakeText(line.trim()) : ''))
          .filter(Boolean)
          .slice(0, 3)
      : undefined

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue
    if (!Number.isInteger(minute) || (minute !== 0 && minute !== 30)) continue
    if (intervalMinutes === 60 && minute !== 0) continue
    if (!note) continue

    cleaned.push({ hour, minute, note, tone, evidenceSummary, source: 'rag' })
  }
  return cleaned
}

async function fetchCalendarRagContext(input: {
  locale: 'ko' | 'en'
  category?: string
  recommendations?: string[]
  warnings?: string[]
  sajuFactors?: string[]
  astroFactors?: string[]
}): Promise<string> {
  const firstSaju = input.sajuFactors?.[0]
  const firstAstro = input.astroFactors?.[0]
  const eventType = input.category || 'general'
  const query = [
    firstSaju,
    firstAstro,
    ...(input.recommendations || []).slice(0, 1),
    ...(input.warnings || []).slice(0, 1),
  ]
    .filter(Boolean)
    .join(' / ')

  try {
    const response = await apiClient.post(
      '/api/prediction/rag-context',
      {
        sipsin: firstSaju,
        event_type: eventType,
        query,
        locale: input.locale,
      },
      { timeout: 8000 }
    )
    if (!response.ok) return ''
    const data = response.data as RagContextResponse
    const rag = data.rag_context
    if (!rag) return ''
    return [rag.sipsin, rag.timing, rag.query_result, ...(rag.insights || []).slice(0, 2)]
      .filter(Boolean)
      .join('\n')
      .slice(0, 1200)
  } catch {
    return ''
  }
}

async function generatePrecisionTimelineWithRag(input: {
  date: string
  locale: 'ko' | 'en'
  intervalMinutes: 30 | 60
  baseTimeline: TimelineSlot[]
  calendar?: {
    grade?: number
    score?: number
    categories?: string[]
    bestTimes?: string[]
    warnings?: string[]
    recommendations?: string[]
    sajuFactors?: string[]
    astroFactors?: string[]
    summary?: string
    evidence?: CalendarEvidence
  } | null
}): Promise<{ timeline: TimelineSlot[]; summary?: string } | null> {
  const openAiKey = process.env.OPENAI_API_KEY
  if (!openAiKey) return null

  const bestHours = new Set<number>()
  input.calendar?.bestTimes?.forEach((time) => {
    extractHoursFromText(time).forEach((hour) => bestHours.add(hour))
  })
  const cautionHours = new Set<number>()
  input.calendar?.warnings?.forEach((warning) => {
    extractHoursFromText(warning).forEach((hour) => cautionHours.add(hour))
  })
  if ((input.calendar?.grade ?? 2) >= 3) {
    cautionHours.add(13)
    cautionHours.add(21)
  }
  const coreSlots: Array<{ hour: number; minute: number }> = []
  const seenCore = new Set<string>()
  for (const slot of input.baseTimeline) {
    const isCore = bestHours.has(slot.hour) || cautionHours.has(slot.hour)
    if (!isCore) continue
    const key = `${slot.hour}:${slot.minute ?? 0}`
    if (seenCore.has(key)) continue
    seenCore.add(key)
    coreSlots.push({ hour: slot.hour, minute: slot.minute ?? 0 })
    if (coreSlots.length >= 5) break
  }
  if (coreSlots.length === 0) return null

  const ragContext = await fetchCalendarRagContext({
    locale: input.locale,
    category: input.calendar?.categories?.[0],
    recommendations: input.calendar?.recommendations,
    warnings: input.calendar?.warnings,
    sajuFactors: input.calendar?.sajuFactors,
    astroFactors: input.calendar?.astroFactors,
  })

  const systemPrompt =
    input.locale === 'ko'
      ? `너는 일정 최적화 코치다. 주어진 베이스 타임라인을 유지하면서 더 정밀하게 보정하라.
출력은 반드시 JSON:
{"timeline":[{"hour":0-23,"minute":0|30,"note":"짧은 문장","tone":"best|caution|neutral"}],"summary":"짧은 한줄"}
규칙:
1) note는 140자 이하.
2) 과장 금지, 실행 가능한 행동 1개 + 짧은 근거 1개를 포함.
3) 위험 시간은 tone=caution, 집중 시간은 tone=best.
4) intervalMinutes=60이면 minute=0만 사용.`
      : `You are a schedule optimization coach. Refine the base timeline with higher precision.
Output must be valid JSON:
{"timeline":[{"hour":0-23,"minute":0|30,"note":"short sentence","tone":"best|caution|neutral"}],"summary":"one line"}
Rules:
1) note <= 140 chars.
2) No hype, include one concrete action plus a short reason.
3) caution for risk windows, best for focus windows.
4) If intervalMinutes=60, use minute=0 only.`

  const userPrompt = JSON.stringify({
    date: input.date,
    locale: input.locale,
    intervalMinutes: input.intervalMinutes,
    coreSlots,
    calendar: {
      grade: input.calendar?.grade,
      score: input.calendar?.score,
      categories: input.calendar?.categories?.slice(0, 2),
      bestTimes: input.calendar?.bestTimes?.slice(0, 2),
      warnings: input.calendar?.warnings?.slice(0, 2),
      recommendations: input.calendar?.recommendations?.slice(0, 2),
      summary: input.calendar?.summary,
      evidence: input.calendar?.evidence,
    },
    ragContext,
    baseTimeline: input.baseTimeline
      .filter((slot) =>
        coreSlots.some((core) => core.hour === slot.hour && core.minute === (slot.minute ?? 0))
      )
      .map((slot) => ({
        hour: slot.hour,
        minute: slot.minute ?? 0,
        note: slot.note,
        tone: slot.tone ?? 'neutral',
        evidenceSummary: slot.evidenceSummary?.slice(0, 2),
      })),
  })

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 1600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) return null
    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') return null

    const parsed = JSON.parse(content) as { timeline?: unknown; summary?: unknown }
    const timeline = sanitizeTimelineForInterval(parsed.timeline, input.intervalMinutes)
    if (timeline.length === 0) return null
    const coreKeySet = new Set(coreSlots.map((slot) => `${slot.hour}:${slot.minute}`))
    const patchMap = new Map<string, TimelineSlot>()
    timeline.forEach((slot) => {
      const key = `${slot.hour}:${slot.minute ?? 0}`
      if (coreKeySet.has(key)) {
        patchMap.set(key, slot)
      }
    })
    const merged = input.baseTimeline.map((slot) => {
      const patch = patchMap.get(`${slot.hour}:${slot.minute ?? 0}`)
      if (!patch) return slot
      return {
        ...slot,
        note: patch.note,
        tone: patch.tone || slot.tone,
        evidenceSummary:
          patch.evidenceSummary && patch.evidenceSummary.length > 0
            ? patch.evidenceSummary.slice(0, 2)
            : slot.evidenceSummary,
        source: 'hybrid' as const,
      }
    })
    const summary = typeof parsed.summary === 'string' ? parsed.summary.slice(0, 240) : undefined
    return { timeline: merged, summary }
  } catch {
    return null
  }
}

export const POST = withApiMiddleware(
  async (request, context) => {
    const rawBody = await request.json().catch(() => null)
    if (!rawBody) {
      return apiError(ErrorCodes.BAD_REQUEST, 'Invalid JSON body')
    }

    const validation = actionPlanTimelineRequestSchema.safeParse(rawBody)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(request),
        route: 'calendar-action-plan',
      })
    }

    const { date, locale, timezone, calendar, icp, persona, intervalMinutes } = validation.data
    const lang = locale || (context.locale === 'ko' ? 'ko' : 'en')
    const safeInterval = intervalMinutes ?? 60
    let isPremiumUser = context.isPremium
    if (context.userId && !isPremiumUser) {
      try {
        const premiumStatus = await checkPremiumFromDatabase(context.userId)
        isPremiumUser = premiumStatus.isPremium
      } catch (error) {
        logger.warn('[ActionPlanTimeline] Premium check fallback to context', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    const canUseAiPrecision = !CALENDAR_AI_PREMIUM_ONLY || isPremiumUser

    const baseTimeline = buildRuleBasedTimeline({
      date,
      locale: lang,
      intervalMinutes: safeInterval,
      icp: icp
        ? {
            primaryStyle: icp.primaryStyle,
            secondaryStyle: icp.secondaryStyle ?? null,
            dominanceScore: icp.dominanceScore,
            affiliationScore: icp.affiliationScore,
            summary: icp.summary,
            traits: trimList(icp.traits, 4),
          }
        : null,
      persona: persona
        ? {
            typeCode: persona.typeCode,
            personaName: persona.personaName,
            summary: persona.summary,
            strengths: trimList(persona.strengths, 4),
            challenges: trimList(persona.challenges, 4),
            guidance: persona.guidance,
            motivations: trimList(persona.motivations, 4),
            axes: persona.axes,
          }
        : null,
      calendar: calendar
        ? {
            grade: calendar.grade,
            categories: trimList(calendar.categories, 3),
            bestTimes: trimList(calendar.bestTimes, 4),
            recommendations: trimList(calendar.recommendations, 3),
            warnings: trimList(calendar.warnings, 3),
            summary: calendar.summary,
            sajuFactors: trimList(calendar.sajuFactors, 3),
            astroFactors: trimList(calendar.astroFactors, 3),
            evidence: calendar.evidence,
          }
        : null,
    })

    const aiRefined = canUseAiPrecision
      ? await generatePrecisionTimelineWithRag({
          date,
          locale: lang,
          intervalMinutes: safeInterval,
          baseTimeline,
          calendar: calendar
            ? {
                grade: calendar.grade,
                score: calendar.score,
                categories: trimList(calendar.categories, 3),
                bestTimes: trimList(calendar.bestTimes, 3),
                warnings: trimList(calendar.warnings, 3),
                recommendations: trimList(calendar.recommendations, 3),
                sajuFactors: trimList(calendar.sajuFactors, 3),
                astroFactors: trimList(calendar.astroFactors, 3),
                summary: calendar.summary,
                evidence: calendar.evidence,
              }
            : null,
        })
      : null
    const usingAiRefinement = Boolean(
      canUseAiPrecision && aiRefined && aiRefined.timeline && aiRefined.timeline.length > 0
    )
    const sourceTimeline = usingAiRefinement ? aiRefined!.timeline : baseTimeline

    const timeline = sourceTimeline.map((slot) => {
      const baseEvidence = (slot.evidenceSummary || []).filter(Boolean)
      const tone = slot.tone ?? 'neutral'
      const personalHint = buildPersonalizationHint({ locale: lang, tone, icp, persona })
      const personalLine = personalHint
        ? lang === 'ko'
          ? `개인화 포인트: ${personalHint}`
          : `Personalization point: ${personalHint}`
        : null
      const note =
        personalHint && !slot.note.includes(personalHint)
          ? cleanGuidanceText(
              `${slot.note} · ${lang === 'ko' ? `개인화: ${personalHint}` : `Personalized: ${personalHint}`}`,
              180
            )
          : slot.note

      if (isPremiumUser) {
        const alternativeLine =
          lang === 'ko'
            ? `대안 행동: ${slot.tone === 'caution' ? '결정 보류 후 체크리스트 점검' : '핵심 행동 1개 완료 후 결과 기록'}`
            : `Alternative: ${slot.tone === 'caution' ? 'pause decision and run checklist' : 'complete one key action and log result'}`
        return {
          ...slot,
          note,
          evidenceSummary: [
            ...baseEvidence.slice(0, 2),
            ...(personalLine ? [personalLine] : []),
            alternativeLine,
          ].slice(0, 4),
        }
      }
      return {
        ...slot,
        note,
        evidenceSummary: [
          ...baseEvidence.slice(0, 2),
          ...(personalLine ? [personalLine] : []),
        ].slice(0, 3),
      }
    })

    const summaryParts: string[] = []
    if (calendar?.bestTimes?.length) {
      summaryParts.push(
        lang === 'ko'
          ? `좋은 시간: ${calendar.bestTimes.slice(0, 2).join(', ')}`
          : `Best times: ${calendar.bestTimes.slice(0, 2).join(', ')}`
      )
    }
    if (calendar?.warnings?.length) {
      summaryParts.push(
        lang === 'ko'
          ? `주의: ${calendar.warnings.slice(0, 1).join(', ')}`
          : `Caution: ${calendar.warnings.slice(0, 1).join(', ')}`
      )
    }
    const personalizationTag = buildPersonalSummaryTag({ locale: lang, icp, persona })
    if (personalizationTag) {
      summaryParts.push(personalizationTag)
    }
    if (usingAiRefinement && aiRefined?.summary) {
      summaryParts.push(aiRefined.summary)
    }
    if (!canUseAiPrecision) {
      summaryParts.push(
        lang === 'ko'
          ? '정밀 AI 비활성화: 사주+점성 규칙 타임라인으로 제공'
          : 'AI precision disabled: serving rule-based Saju+Astrology timeline'
      )
    } else if (!usingAiRefinement) {
      summaryParts.push(
        lang === 'ko'
          ? '정밀 생성 실패: 사주+점성 규칙 타임라인으로 자동 전환'
          : 'Precision generation failed: automatically switched to rule-based Saju+Astrology timeline'
      )
    }

    logger.info('[ActionPlanTimeline] timeline generated', {
      date,
      intervalMinutes: safeInterval,
      timezone,
      hasIcp: Boolean(icp),
      hasPersona: Boolean(persona),
      aiRefined: Boolean(aiRefined),
      usingAiRefinement,
      canUseAiPrecision,
      isPremiumUser,
      aiCreditCost: CALENDAR_AI_CREDIT_COST,
    })

    return apiSuccess(
      normalizeMojibakePayload({
        timeline,
        summary: repairMojibakeText(summaryParts.join(' · ')) || undefined,
        intervalMinutes: safeInterval,
        precisionMode: usingAiRefinement ? 'ai-graphrag' : 'rule-fallback',
        aiAccess: {
          premiumOnly: CALENDAR_AI_PREMIUM_ONLY,
          allowed: canUseAiPrecision,
          applied: usingAiRefinement,
          isPremiumUser,
          creditCost: CALENDAR_AI_CREDIT_COST,
        },
      })
    )
  },
  createPublicStreamGuard({
    route: 'calendar-action-plan',
    limit: 5,
    windowSeconds: 60,
  })
)
