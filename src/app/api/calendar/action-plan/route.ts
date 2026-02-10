import { z } from 'zod'
import { callAIBackendGeneric } from '@/lib/destiny-matrix/ai-report/aiBackend'
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

type TimelineTone = 'best' | 'caution' | 'neutral'

type TimelineSlot = {
  hour: number
  label?: string
  note: string
  tone?: TimelineTone
}

type ActionPlanTimelineResponse = {
  timeline: TimelineSlot[]
  summary?: string
}

const actionPlanTimelineRequestSchema = z.object({
  date: dateSchema,
  locale: z.enum(['ko', 'en']).optional(),
  timezone: z.string().max(TEXT_LIMITS.MAX_TIMEZONE).optional(),
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

const trimText = (value: string | undefined, max: number): string | undefined => {
  if (!value) return undefined
  return value.slice(0, max)
}

const buildActionPlanPrompt = (
  lang: 'ko' | 'en',
  date: string,
  context: Record<string, unknown>
) => {
  const languageLabel = lang === 'ko' ? 'Korean' : 'English'

  return [
    `Create a 24-hour action plan for ${date} with 1-hour slots.`,
    'Return JSON only with this schema:',
    '{"timeline":[{"hour":0,"label":"00:00","note":"...", "tone":"neutral"}],"summary":"..."}',
    'Rules:',
    '- Provide exactly 24 items, hours 0-23 in order.',
    '- label must be in HH:00 format.',
    '- Each entry represents a distinct 1-hour block.',
    '- note is a short, actionable line (max 18 words).',
    '- Avoid repeating the same note more than twice.',
    '- tone is one of: "best", "caution", "neutral".',
    '- Use bestTimes as best hours and warnings as caution hours.',
    '- Align tasks with categories, recommendations, and personality/ICP traits.',
    '- Include realistic anchors: sleep/wind-down late night, a morning start, and a midday reset.',
    '- Avoid medical, legal, or financial directives.',
    `Language: ${languageLabel}.`,
    'Context JSON:',
    JSON.stringify(context),
  ].join('\n')
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

    const { date, locale, timezone, calendar, icp, persona } = validation.data
    const lang = locale || (context.locale === 'ko' ? 'ko' : 'en')

    const [year, month, day] = date.split('-').map(Number)
    const dateValue = new Date(Date.UTC(year, month - 1, day))
    const weekdayIndex = Number.isNaN(dateValue.getTime()) ? null : dateValue.getUTCDay()
    const isWeekend = weekdayIndex === 0 || weekdayIndex === 6

    const contextPayload = {
      date,
      weekdayIndex,
      isWeekend,
      timezone,
      calendar: calendar
        ? {
            grade: calendar.grade,
            score: calendar.score,
            categories: trimList(calendar.categories, 4),
            bestTimes: trimList(calendar.bestTimes, 4),
            warnings: trimList(calendar.warnings, 3),
            recommendations: trimList(calendar.recommendations, 3),
            sajuFactors: trimList(calendar.sajuFactors, 3),
            astroFactors: trimList(calendar.astroFactors, 3),
            title: trimText(calendar.title, TEXT_LIMITS.MAX_TITLE),
            summary: trimText(calendar.summary, TEXT_LIMITS.MAX_GUIDANCE),
            ganzhi: trimText(calendar.ganzhi, TEXT_LIMITS.MAX_TITLE),
            transitSunSign: trimText(calendar.transitSunSign, TEXT_LIMITS.MAX_TITLE),
          }
        : null,
      icp: icp
        ? {
            primaryStyle: icp.primaryStyle,
            secondaryStyle: icp.secondaryStyle ?? undefined,
            dominanceScore: icp.dominanceScore,
            affiliationScore: icp.affiliationScore,
            summary: trimText(icp.summary, TEXT_LIMITS.MAX_GUIDANCE),
            traits: trimList(icp.traits, 4),
          }
        : null,
      persona: persona
        ? {
            typeCode: persona.typeCode,
            personaName: trimText(persona.personaName, TEXT_LIMITS.MAX_NAME),
            summary: trimText(persona.summary, TEXT_LIMITS.MAX_GUIDANCE),
            strengths: trimList(persona.strengths, 4),
            challenges: trimList(persona.challenges, 4),
            guidance: trimText(persona.guidance, TEXT_LIMITS.MAX_GUIDANCE),
            motivations: trimList(persona.motivations, 4),
            axes: persona.axes,
          }
        : null,
    }

    const prompt = buildActionPlanPrompt(lang, date, contextPayload)

    try {
      const { sections, model, tokensUsed } =
        await callAIBackendGeneric<ActionPlanTimelineResponse>(prompt, lang)

      if (!sections?.timeline || !Array.isArray(sections.timeline)) {
        logger.warn('[ActionPlanTimeline] AI response missing timeline', { date, model })
        return apiError(ErrorCodes.BACKEND_ERROR, 'AI response missing timeline')
      }

      return apiSuccess({
        timeline: sections.timeline,
        summary: sections.summary,
        model,
        tokensUsed,
      })
    } catch (error) {
      logger.error('[ActionPlanTimeline] AI generation failed', {
        date,
        error: error instanceof Error ? error.message : String(error),
      })
      return apiError(ErrorCodes.BACKEND_ERROR, 'AI generation failed')
    }
  },
  createPublicStreamGuard({
    route: 'calendar-action-plan',
    limit: 5,
    windowSeconds: 60,
  })
)
