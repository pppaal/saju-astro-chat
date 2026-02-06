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
import { idParamSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

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

// GET: 개별 상담 기록 조회 (프리미엄 전용)
export async function GET(request: Request, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'consultation/[id]',
    })
  }
  const { id } = paramValidation.data

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      const userEmail = context.session?.user?.email
      if (!userEmail) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'not_authenticated')
      }

      const isPremium = await checkStripeActive(userEmail)
      if (!isPremium) {
        return apiError(ErrorCodes.FORBIDDEN, '상담 기록 열람은 프리미엄 구독자 전용입니다.')
      }

      try {
        const consultation = await prisma.consultationHistory.findFirst({
          where: {
            id,
            userId: context.userId!,
          },
        })

        if (!consultation) {
          return apiError(ErrorCodes.NOT_FOUND, '상담 기록을 찾을 수 없습니다.')
        }

        return apiSuccess({ data: consultation })
      } catch (err) {
        logger.error('[Consultation GET by ID error]', err)
        return apiError(ErrorCodes.DATABASE_ERROR, 'Internal Server Error')
      }
    },
    createAuthenticatedGuard({
      route: '/api/consultation/[id]',
      limit: 60,
      windowSeconds: 60,
    })
  )

  return handler(request as unknown as NextRequest)
}

// DELETE: 상담 기록 삭제 (본인 기록만)
export async function DELETE(request: NextRequest, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'consultation/[id]',
    })
  }
  const { id } = paramValidation.data

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const result = await prisma.consultationHistory.deleteMany({
          where: {
            id,
            userId: context.userId!,
          },
        })

        if (result.count === 0) {
          return apiError(ErrorCodes.NOT_FOUND, '상담 기록을 찾을 수 없습니다.')
        }

        return apiSuccess({ message: '상담 기록이 삭제되었습니다.' })
      } catch (err) {
        logger.error('[Consultation DELETE error]', err)
        return apiError(ErrorCodes.DATABASE_ERROR, 'Internal Server Error')
      }
    },
    createAuthenticatedGuard({
      route: '/api/consultation/[id]',
      limit: 20,
      windowSeconds: 60,
    })
  )

  return handler(request)
}
