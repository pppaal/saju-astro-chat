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
import { calculateDailyPillar, generateHourlyAdvice } from '@/lib/prediction/ultra-precision-daily'
import { STEM_ELEMENTS } from '@/lib/destiny-map/config/specialDays.data'
import { getHourlyRecommendation } from '@/lib/destiny-map/calendar/specialDays-analysis'
import { getFactorTranslation } from '../lib'

type TimelineTone = 'best' | 'caution' | 'neutral'

type TimelineSlot = {
  hour: number
  minute?: number
  label?: string
  note: string
  tone?: TimelineTone
}

const actionPlanTimelineRequestSchema = z.object({
  date: dateSchema,
  locale: z.enum(['ko', 'en']).optional(),
  timezone: z.string().max(TEXT_LIMITS.MAX_TIMEZONE).optional(),
  intervalMinutes: z.union([z.literal(30), z.literal(60)]).optional(),
  calendar: z
    .object({
      grade: z.number().min(0).max(5).optional(),
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

const HOUR_BRANCH_KEYS = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']

const getHourBranchKey = (hour: number) => {
  const index = Math.floor(((hour + 1) % 24) / 2)
  return HOUR_BRANCH_KEYS[index] ?? '자'
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

const buildRuleBasedTimeline = (input: {
  date: string
  locale: 'ko' | 'en'
  intervalMinutes: 30 | 60
  calendar?: {
    grade?: number
    bestTimes?: string[]
    warnings?: string[]
  } | null
}): TimelineSlot[] => {
  const { date, locale, intervalMinutes, calendar } = input
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

      const branchKey = getHourBranchKey(hour)
      const energyText =
        getFactorTranslation(`hourlyEnergy_${branchKey}`, locale) ??
        (locale === 'ko' ? '시간대 운세' : 'Hourly guidance')

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

      let detailLine = ''
      if (locale === 'ko') {
        const best = hourlyRec.bestActivities.slice(0, 2).join(', ')
        const avoid = hourlyRec.avoidActivities.slice(0, 2).join(', ')
        detailLine =
          tone === 'caution' ? `주의: ${avoid || '무리한 결정'}` : `추천: ${best || '핵심 업무'}`
      } else {
        detailLine =
          tone === 'caution'
            ? 'Go light and avoid big decisions.'
            : 'Good for focused work or planning.'
      }

      const note = `${energyText} ${detailLine}`.trim()
      slots.push({ hour, minute, label, note, tone })
    }
  }

  return slots
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

    const timeline = buildRuleBasedTimeline({
      date,
      locale: lang,
      intervalMinutes: safeInterval,
      calendar: calendar
        ? {
            grade: calendar.grade,
            bestTimes: trimList(calendar.bestTimes, 4),
            warnings: trimList(calendar.warnings, 3),
          }
        : null,
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

    logger.info('[ActionPlanTimeline] Rule-based timeline generated', {
      date,
      intervalMinutes: safeInterval,
      timezone,
      hasIcp: Boolean(icp),
      hasPersona: Boolean(persona),
    })

    return apiSuccess({
      timeline,
      summary: summaryParts.join(' · ') || undefined,
      intervalMinutes: safeInterval,
    })
  },
  createPublicStreamGuard({
    route: 'calendar-action-plan',
    limit: 5,
    windowSeconds: 60,
  })
)
