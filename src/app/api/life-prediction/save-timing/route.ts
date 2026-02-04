// src/app/api/life-prediction/save-timing/route.ts
// Life Prediction 타이밍 결과 저장 API

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { lifePredictionSaveTimingSchema } from '@/lib/api/zodValidation'

interface TimingResult {
  startDate: string
  endDate: string
  score: number
  grade: string
  reasons: string[]
}

export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json()

    const validationResult = lifePredictionSaveTimingSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[life-prediction/save-timing] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { question, eventType, results, birthDate, gender, locale = 'ko' } = validationResult.data

    try {
      const topResult = results[0]

      const summary =
        locale === 'ko'
          ? `"${question}" - ${topResult.grade}등급 (${topResult.score}점)`
          : `"${question}" - Grade ${topResult.grade} (${topResult.score}pts)`

      const fullReport = generateFullReport(question, eventType, results, locale as 'ko' | 'en')

      const signals = {
        question,
        eventType,
        birthDate,
        gender,
        topResult: {
          startDate: topResult.startDate,
          endDate: topResult.endDate,
          score: topResult.score,
          grade: topResult.grade,
          reasons: topResult.reasons,
        },
        totalResults: results.length,
        allResults: results.slice(0, 5).map((r) => ({
          startDate: r.startDate,
          endDate: r.endDate,
          score: r.score,
          grade: r.grade,
          reasons: r.reasons,
        })),
      }

      const consultation = await prisma.consultationHistory.create({
        data: {
          userId: context.userId!,
          theme: 'life-prediction-timing',
          summary,
          fullReport,
          signals: signals as Prisma.InputJsonValue,
          locale,
        },
      })

      return apiSuccess({
        consultationId: consultation.id,
        message: locale === 'ko' ? '예측 결과가 저장되었습니다' : 'Prediction saved successfully',
      })
    } catch (err) {
      logger.error('[life-prediction/save-timing API error]', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/life-prediction/save-timing',
    limit: 30,
    windowSeconds: 60,
  })
)

function generateFullReport(
  question: string,
  eventType: string,
  results: TimingResult[],
  locale: 'ko' | 'en'
): string {
  const lines: string[] = []

  const eventTypeLabels: Record<string, { ko: string; en: string }> = {
    marriage: { ko: '결혼', en: 'Marriage' },
    career: { ko: '취업/이직', en: 'Career' },
    investment: { ko: '투자', en: 'Investment' },
    move: { ko: '이사', en: 'Moving' },
    study: { ko: '시험/학업', en: 'Study' },
    health: { ko: '건강', en: 'Health' },
    relationship: { ko: '연애', en: 'Relationship' },
    general: { ko: '일반', en: 'General' },
  }

  const eventLabel = eventTypeLabels[eventType]?.[locale] || eventType

  if (locale === 'ko') {
    lines.push(`🔮 인생 예측 결과`)
    lines.push('')
    lines.push(`질문: "${question}"`)
    lines.push(`카테고리: ${eventLabel}`)
    lines.push('')
    lines.push(`📊 추천 시기 (총 ${results.length}개)`)
    lines.push('')

    results.slice(0, 5).forEach((r, i) => {
      const start = new Date(r.startDate).toLocaleDateString('ko-KR')
      const end = new Date(r.endDate).toLocaleDateString('ko-KR')
      lines.push(`${i + 1}. ${start} ~ ${end}`)
      lines.push(`   등급: ${r.grade} (${r.score}점)`)
      if (r.reasons.length > 0) {
        lines.push(`   분석: ${r.reasons.slice(0, 2).join(' / ')}`)
      }
      lines.push('')
    })
  } else {
    lines.push(`🔮 Life Prediction Result`)
    lines.push('')
    lines.push(`Question: "${question}"`)
    lines.push(`Category: ${eventLabel}`)
    lines.push('')
    lines.push(`📊 Recommended Periods (${results.length} total)`)
    lines.push('')

    results.slice(0, 5).forEach((r, i) => {
      const start = new Date(r.startDate).toLocaleDateString('en-US')
      const end = new Date(r.endDate).toLocaleDateString('en-US')
      lines.push(`${i + 1}. ${start} ~ ${end}`)
      lines.push(`   Grade: ${r.grade} (${r.score} pts)`)
      if (r.reasons.length > 0) {
        lines.push(`   Analysis: ${r.reasons.slice(0, 2).join(' / ')}`)
      }
      lines.push('')
    })
  }

  return lines.join('\n')
}
