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
import Stripe from 'stripe'
import { logger } from '@/lib/logger'

import { consultationSaveSchema, consultationGetQuerySchema } from '@/lib/api/zodValidation'
export const dynamic = 'force-dynamic'

const STRIPE_API_VERSION = '2025-10-29.clover' as Stripe.LatestApiVersion

// 이메일 형식 검증 (Stripe 쿼리 인젝션 방지)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

// Stripe 구독 확인 (프리미엄 체크)
async function checkStripeActive(email?: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !email || !isValidEmail(email)) {
    return false
  }

  const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION })
  // Use parameterized API to prevent query injection
  const customers = await stripe.customers.list({
    email: email.toLowerCase(),
    limit: 3,
  })

  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: 'all',
      limit: 5,
    })
    const active = subs.data.find((s) => ['active', 'trialing', 'past_due'].includes(s.status))
    if (active) {
      return true
    }
  }
  return false
}

// POST: 상담 기록 저장 (프리미엄 전용)
export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const userEmail = context.session?.user?.email
    if (!userEmail) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'not_authenticated')
    }

    const isPremium = await checkStripeActive(userEmail)
    if (!isPremium) {
      return apiError(ErrorCodes.FORBIDDEN, '상담 기록 저장은 프리미엄 구독자 전용입니다.')
    }

    const rawBody = await request.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object') {
      return apiError(ErrorCodes.BAD_REQUEST, 'Invalid request body')
    }

    const validationResult = consultationSaveSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Consultation POST] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const {
      theme,
      summary,
      fullReport,
      jungQuotes,
      signals,
      userQuestion,
      locale = 'ko',
    } = validationResult.data

    if (!theme || !summary || !fullReport) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: theme, summary, fullReport'
      )
    }

    try {
      const consultation = await prisma.consultationHistory.create({
        data: {
          userId: context.userId!,
          theme,
          summary,
          fullReport,
          jungQuotes: jungQuotes || undefined,
          signals: signals || undefined,
          userQuestion: userQuestion || undefined,
          locale,
        },
      })

      await updatePersonaMemory(context.userId!, theme)

      return apiSuccess({
        id: consultation.id,
        createdAt: consultation.createdAt,
      })
    } catch (err) {
      logger.error('[Consultation POST] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save consultation')
    }
  },
  createAuthenticatedGuard({
    route: '/api/consultation',
    limit: 30,
    windowSeconds: 60,
  })
)

// GET: 상담 기록 목록 조회 (프리미엄 전용)
export const GET = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const userEmail = context.session?.user?.email
    if (!userEmail) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'not_authenticated')
    }

    const isPremium = await checkStripeActive(userEmail)
    if (!isPremium) {
      return apiError(ErrorCodes.FORBIDDEN, '상담 기록 열람은 프리미엄 구독자 전용입니다.')
    }

    const { searchParams } = new URL(request.url)
    const queryValidation = consultationGetQuerySchema.safeParse({
      theme: searchParams.get('theme') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    })
    if (!queryValidation.success) {
      logger.warn('[Consultation GET] query validation failed', {
        errors: queryValidation.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${queryValidation.error.issues.map((e) => e.message).join(', ')}`
      )
    }
    const { theme, limit, offset } = queryValidation.data

    try {
      const where: { userId: string; theme?: string } = { userId: context.userId! }
      if (theme) {
        where.theme = theme
      }

      const [consultations, total] = await Promise.all([
        prisma.consultationHistory.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            theme: true,
            summary: true,
            createdAt: true,
            locale: true,
            userQuestion: true,
          },
        }),
        prisma.consultationHistory.count({ where }),
      ])

      return apiSuccess({
        data: consultations,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + consultations.length < total,
        },
      })
    } catch (err) {
      logger.error('[Consultation GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch consultations')
    }
  },
  createAuthenticatedGuard({
    route: '/api/consultation',
    limit: 60,
    windowSeconds: 60,
  })
)

// 페르소나 메모리 업데이트 헬퍼
async function updatePersonaMemory(userId: string, theme: string) {
  try {
    const existing = await prisma.personaMemory.findUnique({
      where: { userId },
    })

    if (existing) {
      // 기존 메모리 업데이트
      const currentThemes = (existing.dominantThemes as string[]) || []
      const lastTopics = (existing.lastTopics as string[]) || []

      // 테마 빈도 업데이트
      if (!currentThemes.includes(theme)) {
        currentThemes.push(theme)
      }

      // 최근 토픽 업데이트 (최대 10개)
      const updatedLastTopics = [theme, ...lastTopics.filter((t) => t !== theme)].slice(0, 10)

      await prisma.personaMemory.update({
        where: { userId },
        data: {
          dominantThemes: currentThemes,
          lastTopics: updatedLastTopics,
          sessionCount: existing.sessionCount + 1,
        },
      })
    } else {
      // 새 메모리 생성
      await prisma.personaMemory.create({
        data: {
          userId,
          dominantThemes: [theme],
          lastTopics: [theme],
          sessionCount: 1,
        },
      })
    }
  } catch (err) {
    logger.error('[updatePersonaMemory error]', err)
    // 메모리 업데이트 실패해도 상담 저장은 성공으로 처리
  }
}
