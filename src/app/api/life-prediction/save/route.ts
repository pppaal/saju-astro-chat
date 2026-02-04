// src/app/api/life-prediction/save/route.ts
// Life Prediction 결과 저장 API

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { saveConsultation } from '@/lib/consultation/saveConsultation'
import { logger } from '@/lib/logger'
import { lifePredictionMultiYearSaveSchema } from '@/lib/api/zodValidation'

interface SaveLifePredictionRequest {
  multiYearTrend: {
    startYear: number
    endYear: number
    overallTrend: string
    peakYears: number[]
    lowYears: number[]
    summary: string
    yearlyScores?: Array<{
      year: number
      score: number
      grade: string
      themes?: string[]
    }>
    daeunTransitions?: Array<{
      year: number
      description: string
    }>
  }
  saju?: Record<string, unknown>
  astro?: Record<string, unknown>
  locale?: 'ko' | 'en'
}

export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json()

    const validationResult = lifePredictionMultiYearSaveSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[LifePredictionSave] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const body = validationResult.data
    const { multiYearTrend, saju, astro, locale = 'ko' } = body

    try {
      const summary = multiYearTrend.summary || generateSummary(multiYearTrend, locale)
      const fullReport = generateFullReport(multiYearTrend, locale)

      const result = await saveConsultation({
        userId: context.userId!,
        theme: 'life-prediction',
        summary,
        fullReport,
        signals: {
          saju: saju || null,
          astro: astro || null,
          multiYearTrend: {
            startYear: multiYearTrend.startYear,
            endYear: multiYearTrend.endYear,
            overallTrend: multiYearTrend.overallTrend,
            peakYears: multiYearTrend.peakYears,
            lowYears: multiYearTrend.lowYears,
          },
        },
        locale,
      })

      if (result.success) {
        return apiSuccess({
          consultationId: result.consultationId,
          message: locale === 'ko' ? '예측 결과가 저장되었습니다' : 'Prediction saved successfully',
        })
      } else {
        return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save prediction')
      }
    } catch (err) {
      logger.error('[life-prediction/save API error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/life-prediction/save',
    limit: 20,
    windowSeconds: 60,
  })
)

function generateSummary(
  trend: SaveLifePredictionRequest['multiYearTrend'],
  locale: 'ko' | 'en'
): string {
  const trendLabel =
    {
      ascending: locale === 'ko' ? '상승세' : 'ascending',
      descending: locale === 'ko' ? '하락세' : 'descending',
      stable: locale === 'ko' ? '안정세' : 'stable',
      volatile: locale === 'ko' ? '변동적' : 'volatile',
    }[trend.overallTrend] || trend.overallTrend

  if (locale === 'ko') {
    return `${trend.startYear}~${trend.endYear}년 인생 예측: ${trendLabel}. 최고의 해: ${trend.peakYears.join(', ')}년`
  } else {
    return `${trend.startYear}-${trend.endYear} Life Prediction: ${trendLabel}. Peak years: ${trend.peakYears.join(', ')}`
  }
}

function generateFullReport(
  trend: SaveLifePredictionRequest['multiYearTrend'],
  locale: 'ko' | 'en'
): string {
  const lines: string[] = []

  if (locale === 'ko') {
    lines.push(`📈 ${trend.startYear}~${trend.endYear}년 인생 예측 분석`)
    lines.push('')
    lines.push(`전체 흐름: ${trend.overallTrend}`)
    lines.push(`최고의 해: ${trend.peakYears.join(', ')}년`)
    if (trend.lowYears.length > 0) {
      lines.push(`주의가 필요한 해: ${trend.lowYears.join(', ')}년`)
    }
    lines.push('')
    lines.push(trend.summary)
  } else {
    lines.push(`📈 ${trend.startYear}-${trend.endYear} Life Prediction Analysis`)
    lines.push('')
    lines.push(`Overall Trend: ${trend.overallTrend}`)
    lines.push(`Peak Years: ${trend.peakYears.join(', ')}`)
    if (trend.lowYears.length > 0) {
      lines.push(`Years to Watch: ${trend.lowYears.join(', ')}`)
    }
    lines.push('')
    lines.push(trend.summary)
  }

  if (trend.yearlyScores && trend.yearlyScores.length > 0) {
    lines.push('')
    lines.push(locale === 'ko' ? '--- 연도별 상세 ---' : '--- Yearly Details ---')
    trend.yearlyScores.forEach((y) => {
      lines.push(
        `${y.year}: ${y.grade} (${y.score}점)${y.themes?.length ? ` - ${y.themes.join(', ')}` : ''}`
      )
    })
  }

  return lines.join('\n')
}
