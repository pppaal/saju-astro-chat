import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { csrfGuard } from '@/lib/security/csrf'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'

import { HTTP_STATUS } from '@/lib/constants/http'
import { contentAccessSchema } from '@/lib/api/zodValidation'
export const dynamic = 'force-dynamic'

type ContentAccessBody = {
  service?: string
  contentType?: string
  contentId?: string
  locale?: string
  metadata?: unknown
  creditUsed?: number
}

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

const premiumContentAccess = (
  prisma as unknown as { premiumContentAccess: PremiumContentAccessDelegate }
).premiumContentAccess

// POST: 프리미엄 콘텐츠 열람 기록 저장
export async function POST(request: Request) {
  try {
    // CSRF Protection
    const csrfError = csrfGuard(request.headers)
    if (csrfError) {
      logger.warn('[ContentAccess] CSRF validation failed')
      return csrfError
    }

    // Rate Limiting
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`content-access:${ip}`, { limit: 60, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const rawBody = (await request.json().catch(() => null)) as ContentAccessBody | null
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    // Validate with Zod
    const validationResult = contentAccessSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Content access] validation failed', { errors: validationResult.error.issues })
      return NextResponse.json(
        {
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
      service,
      contentType,
      contentId,
      locale = 'ko',
      metadata,
      creditUsed = 0,
    } = validationResult.data

    // 유효한 서비스 검증
    const validServices = [
      'astrology',
      'saju',
      'tarot',
      'dream',
      'destiny-map',
      'numerology',
      'iching',
      'compatibility',
    ]
    if (!validServices.includes(service)) {
      return NextResponse.json(
        { error: `Invalid service. Must be one of: ${validServices.join(', ')}` },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 열람 기록 저장
    const accessLog = await premiumContentAccess.create({
      data: {
        userId: session.user.id,
        service,
        contentType,
        contentId: contentId || null,
        locale,
        metadata: metadata || null,
        creditUsed,
      },
    })

    return NextResponse.json({
      success: true,
      id: accessLog.id,
      createdAt: accessLog.createdAt,
    })
  } catch (err: unknown) {
    logger.error('[ContentAccess POST error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

// GET: 내 콘텐츠 열람 기록 조회
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 쿼리 빌드
    const where: { userId: string; service?: string } = { userId: session.user.id }
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

    return NextResponse.json({
      success: true,
      data: accessLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + accessLogs.length < total,
      },
    })
  } catch (err: unknown) {
    logger.error('[ContentAccess GET error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
