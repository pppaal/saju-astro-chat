/**
 * Calendar — Yearly Convergence (lazy)
 *
 * "올해 큰 날"(연간 수렴)은 1년 365일 풀빌드라 비싸다(~1.7s). 메인 /api/calendar
 * 응답을 빠르게 띄우기 위해 이 계산만 따로 떼어 클라가 지연 로드한다.
 * 본명·연도별 인메모리 캐시(getYearConvergence)로 재호출은 즉시.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createSimpleGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { logger } from '@/lib/logger'
import { calendarMainQuerySchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { LOCATION_COORDS, parseBirthDate } from '../lib/helpers'
import { LIMITS } from '@/lib/validation/patterns'
import { normalizeGender } from '@/lib/utils/gender'
import { nowInTimezone } from '@/lib/utils/timezone'
import { translateSignalLabel } from '@/lib/calendar-engine/derivers/signalI18n'

export const dynamic = 'force-dynamic'

const MAX_PLACE_LEN = LIMITS.PLACE

export const GET = withApiMiddleware(
  async (request: NextRequest, _context: ApiContext) => {
    const { searchParams } = new URL(request.url)

    const queryValidation = calendarMainQuerySchema.safeParse({
      birthDate: searchParams.get('birthDate'),
      birthTime: searchParams.get('birthTime') || undefined,
      birthPlace: searchParams.get('birthPlace') || undefined,
      year: searchParams.get('year') || undefined,
      gender: searchParams.get('gender') || undefined,
      locale: searchParams.get('locale') || undefined,
    })
    if (!queryValidation.success) {
      return createValidationErrorResponse(queryValidation.error, {
        locale: extractLocale(request),
        route: 'calendar-convergence',
      })
    }

    const {
      birthDate: birthDateParam,
      birthTime: birthTimeParam,
      birthPlace: birthPlaceRaw,
      year: yearFromZod,
      gender,
      locale,
    } = queryValidation.data
    const birthPlace =
      birthPlaceRaw.length > 0 && birthPlaceRaw.length <= MAX_PLACE_LEN ? birthPlaceRaw : 'Seoul'

    if (!parseBirthDate(birthDateParam)) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_DATE,
        locale: extractLocale(request),
        route: 'calendar-convergence',
      })
    }

    const coords = LOCATION_COORDS[birthPlace] || LOCATION_COORDS['Seoul']
    const timezone = coords.tz
    // Default to user's local year (see calendar/route.ts for the same
    // reasoning — UTC server flips at midnight UTC, not user-local).
    const year = yearFromZod ?? nowInTimezone(timezone).getUTCFullYear()

    // 메인 캘린더와 동일 규칙: ?month=YYYY-MM 있으면 그 연도, 없으면 year.
    const monthParam = searchParams.get('month')
    const monthMatch = monthParam?.match(/^(\d{4})-(\d{1,2})$/)
    const targetYear = monthMatch ? Number(monthMatch[1]) : year
    const interpLang: 'ko' | 'en' = locale === 'en' ? 'en' : 'ko'

    try {
      // 'F' 한 글자도 처리 — 기존 패턴은 'F'→'f' 매칭 실패로 여자 사용자의
      // 대운 방향이 거꾸로 가던 회귀.
      const sajuGender: 'male' | 'female' = normalizeGender(gender) === 'female' ? 'female' : 'male'
      const { calculateSajuData } = await import('@/lib/saju/saju')
      const sajuResult = calculateSajuData(
        birthDateParam,
        birthTimeParam,
        sajuGender,
        'solar',
        timezone
      )

      const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
      const natal = await buildNatalContext(
        {
          birthDate: birthDateParam,
          birthTime: birthTimeParam || '12:00',
          gender: sajuGender,
          latitude: coords.lat,
          longitude: coords.lng,
          timeZone: timezone,
        },
        { saju: sajuResult }
      )

      const { makeBirthKey } = await import('@/lib/calendar-engine/cell-cache')
      const birthKey = makeBirthKey({
        birthDate: birthDateParam,
        birthTime: birthTimeParam || '12:00',
        birthPlace,
        gender: gender || 'Male',
      })

      const { getYearInsights } = await import('@/lib/calendar-engine/year-convergence')
      const { convergence, monthly } = await getYearInsights({
        birthKey,
        year: targetYear,
        natal,
        lang: interpLang,
      })

      // daily 배열은 더 이상 응답에 포함하지 않는다 — 메인 /api/calendar 응답이 이미
      // 365일 v2 점수를 score/displayScore에 담고 있어서 client 백필이 필요 없다.
      // 페이로드 ~30KB 절약.
      // EN 모드면 convergence.keyDays 의 astro/saju 신호명 번역.
      const localizedConvergence =
        interpLang === 'en' && convergence?.keyDays
          ? {
              ...convergence,
              keyDays: convergence.keyDays.map((d) => ({
                ...d,
                astro: d.astro.map((sig) => translateSignalLabel(sig, 'en')),
                saju: d.saju.map((sig) => translateSignalLabel(sig, 'en')),
              })),
            }
          : convergence
      const res = NextResponse.json({
        success: true,
        convergence: localizedConvergence,
        monthly,
      })
      // 같은 본명·연도면 결정적 — 캐시 적극 활용.
      res.headers.set('Cache-Control', 'private, max-age=3600, stale-while-revalidate=1800')
      return res
    } catch (err) {
      logger.warn?.(
        '[calendar-convergence] failed:',
        err instanceof Error ? err.message : String(err)
      )
      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to compute yearly convergence',
        locale: extractLocale(request),
        route: 'calendar-convergence',
        originalError: err instanceof Error ? err : new Error(String(err)),
      })
    }
  },
  // /api/calendar 와 동일 정책 — rate limit 만, token gate 없음 (회귀 방지).
  createSimpleGuard({
    route: 'calendar-convergence',
    limit: 8,
    windowSeconds: 60,
  })
)
