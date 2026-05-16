/**
 * Calendar date-detail route — v2 (calendar-engine 기반).
 *
 * GET /api/calendar/date-detail
 * Query: birthDate, birthTime?, gender?, date (YYYY-MM-DD), timezone?
 *
 * v2 엔진(buildNatalContext + buildCalendar)에서 하루 24h cells를 만들고,
 * dateDetail adapter로 클라이언트가 기대하는 형태(fusion, transit, natalContext,
 * sajuExtras, shinsalActive, gongmangStatus, …)로 변환해 반환.
 *
 * 옛 timing/·destiny-map analyzers·fusion adapter 체인 의존 없음.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  apiError,
  apiSuccess,
  createPublicStreamGuard,
  ErrorCodes,
  extractLocale,
  withApiMiddleware,
} from '@/lib/api/middleware'
import { dateSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildDateDetailResponse } from '@/lib/calendar-engine/adapters/dateDetail'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  birthDate: dateSchema,
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  gender: z.enum(['male', 'female']).optional(),
  date: dateSchema,
  timezone: z.string().max(64).optional(),
})

export const GET = withApiMiddleware(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const validation = querySchema.safeParse({
      birthDate: searchParams.get('birthDate'),
      birthTime: searchParams.get('birthTime') || undefined,
      gender: searchParams.get('gender') || undefined,
      date: searchParams.get('date'),
      timezone: searchParams.get('timezone') || undefined,
    })
    if (!validation.success) {
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(request),
        route: 'calendar-date-detail',
      })
    }

    const { birthDate, birthTime, gender, date, timezone } = validation.data

    try {
      const natal = await buildNatalContext({
        birthDate,
        birthTime: birthTime || '12:00',
        gender: gender || 'male',
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: timezone || 'Asia/Seoul',
      })

      // 하루치 24h cells — saju-hour 등이 시간대별 신호 생성
      const dayStart = `${date}T00:00:00.000Z`
      const dayEnd = `${date}T23:00:00.000Z`
      const hourlyCells = await buildCalendar(natal, {
        start: dayStart,
        end: dayEnd,
        granularity: 'hour',
      }, { includeEvidence: true })

      // day-level aggregate cell — 같은 신호로 day granularity 한 번 더
      const [dayCell] = await buildCalendar(natal, {
        start: dayStart,
        end: dayStart,
        granularity: 'day',
      }, { includeEvidence: true })

      const birthYear = parseInt(birthDate.slice(0, 4), 10)
      const response = buildDateDetailResponse({
        natal,
        dayCell: dayCell ?? hourlyCells[0],
        hourlyCells,
        date,
        birthYear,
      })

      return apiSuccess(response)
    } catch (error) {
      logger.warn('[calendar/date-detail] v2 build failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'date-detail build failed')
    }
  },
  createPublicStreamGuard({
    route: 'calendar-date-detail',
    limit: 30,
    windowSeconds: 60,
  }),
)
