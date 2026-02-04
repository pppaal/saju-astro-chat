// src/app/api/feedback/route.ts

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createPublicStreamGuard,
  createSimpleGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { guardText, cleanText } from '@/lib/textGuards'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { sectionFeedbackRequestSchema, feedbackGetQuerySchema } from '@/lib/api/zodValidation'

import { parseRequestBody } from '@/lib/api/requestParser'
type RlhfResponse = {
  feedback_id?: string
  new_badges?: string[]
}
type SectionGroup = {
  sectionId: string
  _count: { _all: number }
}

function trimValue(value: unknown, max = 120) {
  return String(value ?? '')
    .trim()
    .slice(0, max)
}

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const rawBody = await parseRequestBody(req, { context: 'Feedback' })

    if (!rawBody || typeof rawBody !== 'object') {
      return apiError(ErrorCodes.BAD_REQUEST, 'Invalid request body')
    }

    const validationResult = sectionFeedbackRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Feedback POST] validation failed', { errors: validationResult.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const body = validationResult.data
    const safeLocale = body.locale || 'ko'
    const safeUserHash = body.userHash || null
    const safeRecordId = body.recordId || null
    const safeFeedbackText = body.feedbackText ? guardText(body.feedbackText, 600) : null
    const safeUserQuestion = body.userQuestion ? guardText(body.userQuestion, 600) : null
    const safeConsultationSummary = body.consultationSummary
      ? guardText(body.consultationSummary, 600)
      : null
    const safeContextUsed = body.contextUsed ? guardText(body.contextUsed, 600) : null
    const safeDayMaster = body.dayMaster || null
    const safeSunSign = body.sunSign || null
    const normalizedRating = body.rating || null

    // Save to local database
    const feedback = await prisma.sectionFeedback.create({
      data: {
        service: body.service,
        theme: body.theme,
        sectionId: body.sectionId,
        helpful: body.helpful,
        dayMaster: safeDayMaster,
        sunSign: safeSunSign,
        locale: safeLocale,
        userHash: safeUserHash,
      },
    })

    // Also send to backend RLHF system for AI improvement
    let rlhfResult: RlhfResponse | null = null
    try {
      const rlhfRating = normalizedRating ?? (body.helpful ? 5 : 1) // Convert boolean to rating if not provided
      const rlhfPayload = {
        consultation_data: {
          record_id: safeRecordId || feedback.id,
          theme: body.theme,
          locale: safeLocale,
          user_prompt: safeUserQuestion || '',
          consultation_summary: safeConsultationSummary || body.sectionId,
          context_used: safeContextUsed || '',
        },
        rating: rlhfRating,
        feedback: cleanText(safeFeedbackText || (body.helpful ? 'Helpful' : 'Not helpful'), 500),
        user_id: safeUserHash || 'anonymous',
      }

      const result = await apiClient.post<RlhfResponse>('/rlhf/feedback', rlhfPayload, {
        timeout: 8000,
      })

      if (result.ok && result.data) {
        rlhfResult = result.data
        logger.warn('[Feedback] RLHF recorded:', rlhfResult.feedback_id)
      }
    } catch (rlhfErr) {
      // RLHF is optional - don't fail the whole request
      logger.warn('[Feedback] RLHF backend not available:', rlhfErr)
    }

    const res = NextResponse.json({
      success: true,
      id: feedback.id,
      rlhfId: rlhfResult?.feedback_id,
      badges: rlhfResult?.new_badges || [],
    })
    res.headers.set('Cache-Control', 'no-store')
    return res
  },
  createPublicStreamGuard({
    route: '/api/feedback',
    limit: 20,
    windowSeconds: 60,
  })
)

// GET: Fetch feedback stats (for admin/analytics)
export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const queryValidation = feedbackGetQuerySchema.safeParse({
      service: searchParams.get('service') || undefined,
      theme: searchParams.get('theme') || undefined,
    })
    if (!queryValidation.success) {
      logger.warn('[Feedback GET] query validation failed', {
        errors: queryValidation.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${queryValidation.error.issues.map((e) => e.message).join(', ')}`
      )
    }
    const { service, theme } = queryValidation.data

    const where: { service?: string; theme?: string } = {}
    if (service) {
      where.service = service
    }
    if (theme) {
      where.theme = theme
    }

    // Get aggregated stats
    const [total, positive, bySectionTotals, bySectionPositives] = (await Promise.all([
      prisma.sectionFeedback.count({ where }),
      prisma.sectionFeedback.count({ where: { ...where, helpful: true } }),
      prisma.sectionFeedback.groupBy({
        by: ['sectionId'],
        where,
        _count: { _all: true },
      }),
      prisma.sectionFeedback.groupBy({
        by: ['sectionId'],
        where: { ...where, helpful: true },
        _count: { _all: true },
      }),
    ])) as [number, number, SectionGroup[], SectionGroup[]]

    const satisfactionRate = total > 0 ? Math.round((positive / total) * 100) : 0

    // Format section stats
    const positiveMap = new Map<string, number>()
    bySectionPositives.forEach((s) => {
      positiveMap.set(s.sectionId, s._count._all || 0)
    })

    const sectionStats = bySectionTotals.map((s) => {
      const pos = positiveMap.get(s.sectionId) || 0
      const totalCount = s._count._all
      return {
        sectionId: s.sectionId,
        total: totalCount,
        positive: pos,
        rate: totalCount > 0 ? Math.round((pos / totalCount) * 100) : 0,
      }
    })

    return NextResponse.json({
      total,
      positive,
      negative: total - positive,
      satisfactionRate,
      bySection: sectionStats,
    })
  },
  createSimpleGuard({
    route: '/api/feedback',
    limit: 60,
    windowSeconds: 60,
  })
)
