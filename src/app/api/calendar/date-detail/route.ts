/**
 * Calendar date-detail route — v2 (calendar-engine 기반).
 *
 * GET /api/calendar/date-detail
 * Query: birthDate, birthTime?, gender?, date (YYYY-MM-DD), timezone?
 *
 * v2 엔진(buildNatalContext + buildCalendar)에서 하루 24h cells를 만들고,
 * dateDetail adapter로 클라이언트가 기대하는 형태(dayCross, transit, natalContext,
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
import { buildCalendar } from '@/lib/calendar-engine'
import { buildDateDetailResponse } from '@/lib/calendar-engine/adapters/dateDetail'
import { LOCATION_COORDS } from '../lib/helpers'
import { LIMITS } from '@/lib/validation/patterns'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  birthDate: dateSchema,
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  gender: z.enum(['male', 'female']).optional(),
  birthPlace: z.string().max(LIMITS.PLACE).optional(),
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
      birthPlace: searchParams.get('birthPlace') || undefined,
      date: searchParams.get('date'),
      timezone: searchParams.get('timezone') || undefined,
    })
    if (!validation.success) {
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(request),
        route: 'calendar-date-detail',
      })
    }

    const { birthDate, birthTime, gender, birthPlace, date, timezone } = validation.data

    // 메인 캘린더와 동일한 본명 좌표를 써야 클릭 상세(dayCross) 점수가 grid·월 점수와
    // 같은 v2 엔진 위에서 일치한다. 출생지 미전달/미상이면 서울 폴백.
    const coords = (birthPlace && LOCATION_COORDS[birthPlace]) || LOCATION_COORDS['Seoul']

    try {
      // Redis → DB NatalContextCache → 재계산 cascade — 메인 캘린더 라우트와
      // 같은 캐시 키 공유, 사용자가 캘린더 → date-detail 진입 시 두 번째 호출은
      // ~1ms (Redis hit) 또는 ~5ms (DB hit).
      const { getOrBuildNatalContext } = await import('@/lib/calendar-engine/context/cache')
      const { context: natal } = await getOrBuildNatalContext({
        birthDate,
        birthTime: birthTime || '00:00',
        gender: (gender === 'female' ? 'female' : 'male') as 'male' | 'female',
        latitude: coords.lat,
        longitude: coords.lng,
        timeZone: timezone || coords.tz,
      })

      // 하루치 24h cells — saju-hour 등이 시간대별 신호 생성
      const dayStart = `${date}T00:00:00.000Z`
      const dayEnd = `${date}T23:00:00.000Z`
      const hourlyCells = await buildCalendar(
        natal,
        {
          start: dayStart,
          end: dayEnd,
          granularity: 'hour',
        },
        { includeEvidence: true }
      )

      // day-level aggregate cell — 같은 신호로 day granularity 한 번 더
      const [dayCell] = await buildCalendar(
        natal,
        {
          start: dayStart,
          end: dayStart,
          granularity: 'day',
        },
        { includeEvidence: true }
      )

      const birthYear = parseInt(birthDate.slice(0, 4), 10)
      const reqLocale = extractLocale(request)
      const response = buildDateDetailResponse({
        natal,
        dayCell: dayCell ?? hourlyCells[0],
        hourlyCells,
        date,
        birthYear,
        lang: reqLocale === 'en' ? 'en' : 'ko',
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
  })
)
