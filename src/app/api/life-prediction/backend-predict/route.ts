// src/app/api/life-prediction/backend-predict/route.ts
// 백엔드 Flask prediction API 프록시 - RAG 기반 예측 시스템 사용

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { scoreToGrade as standardScoreToGrade, type PredictionGrade } from '@/lib/prediction'
import { logger } from '@/lib/logger'
import { getBackendUrl } from '@/lib/backend-url'
import { HTTP_STATUS } from '@/lib/constants/http'
import { withCircuitBreaker } from '@/lib/circuitBreaker'
import { lifePredictionBackendPredictSchema } from '@/lib/api/zodValidation'

// ============================================================
// 타입 정의
// ============================================================
interface BackendResponse {
  status: 'success' | 'error'
  message?: string
  // timing 응답
  question?: string
  event_type?: string
  search_period?: {
    start: string
    end: string
  }
  recommendations?: Array<{
    start_date: string
    end_date: string
    quality: string
    quality_display: string
    score: number
    reasons: {
      astro: string[]
      saju: string[]
    }
    advice: string
  }>
  avoid_dates?: Array<{
    date: string
    reason: string
    factors: string[]
  }>
  general_advice?: string
  natural_answer?: string
  // forecast 응답
  predictions?: {
    current_daeun?: Record<string, unknown>
    current_seun?: Record<string, unknown>
    five_year_outlook?: Array<Record<string, unknown>>
    timing_recommendation?: Record<string, unknown>
  }
  ai_interpretation?: string
}

// ============================================================
// 환경 변수
// ============================================================
const BACKEND_URL = getBackendUrl()

// ============================================================
// POST 핸들러
// ============================================================
export const POST = withApiMiddleware(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const rawBody = await request.json()

      // Validate with Zod
      const validationResult = lifePredictionBackendPredictSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[backend-predict] validation failed', {
          errors: validationResult.error.issues,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'validation_failed',
            details: validationResult.error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const {
        question,
        birthYear,
        birthMonth,
        birthDay = 15,
        birthHour = 12,
        gender = 'unknown',
        type = 'timing',
      } = validationResult.data

      // 백엔드 API 엔드포인트 선택
      let endpoint: string
      let requestBody: Record<string, unknown>
      const apiKey = process.env.ADMIN_API_TOKEN || ''

      switch (type) {
        case 'timing':
          endpoint = `${BACKEND_URL}/api/prediction/timing`
          requestBody = {
            question,
            year: birthYear,
            month: birthMonth,
            day: birthDay,
            hour: birthHour,
            gender,
          }
          break

        case 'forecast':
          endpoint = `${BACKEND_URL}/api/prediction/forecast`
          requestBody = {
            question,
            year: birthYear,
            month: birthMonth,
            day: birthDay,
            hour: birthHour,
            gender,
            include_timing: true,
          }
          break

        case 'luck':
          endpoint = `${BACKEND_URL}/api/prediction/luck`
          requestBody = {
            year: birthYear,
            month: birthMonth,
            day: birthDay,
            hour: birthHour,
            gender,
            years_ahead: 5,
          }
          break

        default:
          endpoint = `${BACKEND_URL}/api/prediction/timing`
          requestBody = { question, year: birthYear, month: birthMonth }
      }

      // Validate backend URL and API key
      if (!BACKEND_URL || BACKEND_URL === 'http://localhost:5000') {
        logger.warn('[Backend Predict] Backend URL not configured or using localhost')
      }

      if (!apiKey) {
        logger.warn('[Backend Predict] ADMIN_API_TOKEN not configured')
      }

      logger.info(`[Backend Predict] Calling ${endpoint}`, {
        type,
        hasApiKey: !!apiKey,
        backendUrl: BACKEND_URL,
      })

      const { result: backendData, fromFallback } =
        await withCircuitBreaker<BackendResponse | null>(
          'backend-predict',
          async () => {
            try {
              const backendRes = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-API-KEY': apiKey,
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(55000), // 55s timeout (Vercel Hobby 60s limit)
              })

              if (!backendRes.ok) {
                const errorText = await backendRes.text()
                logger.error('[Backend Predict] Backend error:', {
                  status: backendRes.status,
                  statusText: backendRes.statusText,
                  endpoint,
                  type,
                  error: errorText.substring(0, 500), // Limit log size
                })

                // Provide more specific error messages based on status code
                if (backendRes.status === HTTP_STATUS.UNAUTHORIZED) {
                  throw new Error('Backend authentication failed - check ADMIN_API_TOKEN')
                } else if (backendRes.status === HTTP_STATUS.BAD_REQUEST) {
                  throw new Error(`Backend validation error: ${errorText}`)
                } else if (backendRes.status === HTTP_STATUS.SERVICE_UNAVAILABLE) {
                  throw new Error('Backend service temporarily unavailable')
                } else if (backendRes.status >= 500) {
                  throw new Error(`Backend server error: ${backendRes.status}`)
                }

                throw new Error(
                  `Backend request failed: ${backendRes.status} ${backendRes.statusText}`
                )
              }

              return backendRes.json()
            } catch (error) {
              // Log network-level errors with more context
              if (error instanceof Error) {
                logger.error('[Backend Predict] Network error:', {
                  message: error.message,
                  name: error.name,
                  endpoint,
                  type,
                })
              }
              throw error
            }
          },
          null, // fallback value
          { failureThreshold: 3, resetTimeoutMs: 60000 }
        )

      // Circuit breaker triggered or backend returned null
      if (fromFallback || !backendData) {
        logger.warn('[Backend Predict] Using fallback:', {
          fromFallback,
          backendData: backendData === null ? 'null' : 'undefined',
          endpoint,
          type,
        })
        return NextResponse.json(
          {
            success: false,
            error: '예측 서버가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.',
            fallback: true,
          },
          { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        )
      }

      if (backendData.status === 'error') {
        return NextResponse.json(
          { success: false, error: backendData.message || '예측 실패' },
          { status: HTTP_STATUS.SERVER_ERROR }
        )
      }

      // 프론트엔드 형식으로 변환
      const response = transformBackendResponse(backendData, type)

      const res = NextResponse.json({
        success: true,
        data: response,
      })
      return res
    } catch (error) {
      logger.error('[Backend Predict] Error:', error)

      // 백엔드 연결 실패 시 에러 반환
      const rawErrorMessage = error instanceof Error ? error.message : ''

      const isTimeout =
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.name === 'TimeoutError' ||
          rawErrorMessage.includes('timeout'))
      if (isTimeout) {
        return NextResponse.json(
          {
            success: false,
            error: '예측 서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
            fallback: true,
          },
          { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        )
      }

      if (rawErrorMessage.includes('ECONNREFUSED') || rawErrorMessage.includes('fetch failed')) {
        return NextResponse.json(
          {
            success: false,
            error: '예측 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
            fallback: true,
          },
          { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        )
      }

      return NextResponse.json(
        { success: false, error: '예측 처리 중 오류가 발생했습니다.' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createPublicStreamGuard({
    route: '/api/life-prediction/backend-predict',
    limit: 10,
    windowSeconds: 60,
  })
)

// ============================================================
// 백엔드 응답 변환
// ============================================================
function transformBackendResponse(data: BackendResponse, type: string): Record<string, unknown> {
  if (type === 'timing' && data.recommendations) {
    // timing 응답을 프론트엔드 형식으로 변환
    const optimalPeriods = data.recommendations
      .map((rec, index) => ({
        startDate: rec.start_date,
        endDate: rec.end_date,
        score: rec.score,
        grade: scoreToGrade(rec.score),
        reasons: formatReasons(rec.reasons, rec.advice),
        specificDays: [], // 백엔드에서 제공되지 않으면 빈 배열
        rank: index + 1,
      }))
      // Sort by score descending to ensure best periods first
      .sort((a, b) => b.score - a.score)
      // Take top 5 results
      .slice(0, 5)

    return {
      eventType: data.event_type || 'general',
      optimalPeriods,
      generalAdvice: data.general_advice || '',
      naturalAnswer: data.natural_answer || '',
      avoidDates: data.avoid_dates || [],
      searchPeriod: data.search_period,
    }
  }

  if (type === 'forecast' && data.predictions) {
    return {
      predictions: data.predictions,
      aiInterpretation: data.ai_interpretation || '',
    }
  }

  // 기본 반환
  return data as unknown as Record<string, unknown>
}

// ============================================================
// 헬퍼 함수
// ============================================================
function scoreToGrade(score: number): PredictionGrade {
  return standardScoreToGrade(score)
}

function formatReasons(reasons: { astro: string[]; saju: string[] }, advice: string): string[] {
  const result: string[] = []

  // 점성술 이유
  if (reasons.astro && reasons.astro.length > 0) {
    reasons.astro.forEach((r) => {
      result.push(`🌟 ${r}`)
    })
  }

  // 사주 이유
  if (reasons.saju && reasons.saju.length > 0) {
    reasons.saju.forEach((r) => {
      result.push(`🔮 ${r}`)
    })
  }

  // 조언 추가
  if (advice && !result.some((r) => r.includes(advice))) {
    result.push(`💡 ${advice}`)
  }

  return result.length > 0 ? result : ['✨ 좋은 시기입니다']
}
