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
import { logger } from '@/lib/logger'

import { contentAccessSchema, contentAccessGetQuerySchema } from '@/lib/api/zodValidation'
export const dynamic = 'force-dynamic'

type PremiumContentAccessRecord = {
  id: string
  createdAt: Date
  service: string
  contentType: string
  contentId: string | null
  locale: string
  creditUsed: number
}

type PremiumContentAccessDelegate = {
  create: (args: {
    data: {
      userId: string
      service: string
      contentType: string
      contentId: string | null
      locale: string
      metadata: unknown
      creditUsed: number
    }
  }) => Promise<PremiumContentAccessRecord>
  findMany: (args: {
    where: { userId: string; service?: string }
    orderBy: { createdAt: 'desc' | 'asc' }
    take: number
    skip: number
    select: {
      id: boolean
      service: boolean
      contentType: boolean
      contentId: boolean
      createdAt: boolean
      locale: boolean
      creditUsed: boolean
    }
  }) => Promise<PremiumContentAccessRecord[]>
  count: (args: { where: { userId: string; service?: string } }) => Promise<number>
}

function getPremiumContentAccess(): PremiumContentAccessDelegate {
  return (prisma as unknown as { premiumContentAccess: PremiumContentAccessDelegate })
    .premiumContentAccess
}

const VALID_SERVICES = [
  'astrology',
  'saju',
  'tarot',
  'dream',
  'destiny-map',
  'numerology',
  'iching',
  'compatibility',
] as const

// POST: 프리미엄 콘텐츠 열람 기록 저장
export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object') {
      return apiError(ErrorCodes.BAD_REQUEST, 'Invalid request body')
    }

    const validationResult = contentAccessSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[ContentAccess POST] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const {
      service,
      contentType,
      contentId,
      locale = 'ko',
      metadata,
      creditUsed = 0,
    } = validationResult.data

    if (!VALID_SERVICES.includes(service as (typeof VALID_SERVICES)[number])) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}`
      )
    }

    try {
      const premiumContentAccess = getPremiumContentAccess()
      const accessLog = await premiumContentAccess.create({
        data: {
          userId: context.userId!,
          service,
          contentType,
          contentId: contentId || null,
          locale,
          metadata: metadata || null,
          creditUsed,
        },
      })

      return apiSuccess({
        id: accessLog.id,
        createdAt: accessLog.createdAt,
      })
    } catch (err) {
      logger.error('[ContentAccess POST] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save content access log')
    }
  },
  createAuthenticatedGuard({
    route: '/api/content-access',
    limit: 60,
    windowSeconds: 60,
  })
)

// GET: 내 콘텐츠 열람 기록 조회
export const GET = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(request.url)
    const queryValidation = contentAccessGetQuerySchema.safeParse({
      service: searchParams.get('service') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    })
    if (!queryValidation.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${queryValidation.error.issues.map((e) => e.message).join(', ')}`
      )
    }
    const { service, limit, offset } = queryValidation.data

    try {
      const premiumContentAccess = getPremiumContentAccess()
      const where: { userId: string; service?: string } = { userId: context.userId! }
      if (service) {
        where.service = service
      }

      const [accessLogs, total] = await Promise.all([
        premiumContentAccess.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            service: true,
            contentType: true,
            contentId: true,
            createdAt: true,
            locale: true,
            creditUsed: true,
          },
        }),
        premiumContentAccess.count({ where }),
      ])

      return apiSuccess({
        data: accessLogs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + accessLogs.length < total,
        },
      })
    } catch (err) {
      logger.error('[ContentAccess GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch content access logs')
    }
  },
  createAuthenticatedGuard({
    route: '/api/content-access',
    limit: 60,
    windowSeconds: 60,
  })
)
