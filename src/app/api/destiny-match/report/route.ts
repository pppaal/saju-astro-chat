/**
 * Destiny Match Report API
 * 유저 신고
 */
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { destinyMatchReportSchema } from '@/lib/api/zodValidation'

// 동일 신고자→피신고자 중복 신고 방지 window. 같은 사람을 24시간 안에
// 다시 신고하지 못하게 막는다 (validation max 1000 이지만 DB 컬럼 보호 차원
// 에서 저장 시 500 자로 truncate).
const REPORT_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000
const DESCRIPTION_MAX_STORED = 500

// POST - 유저 신고
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!
    const rawBody = await req.json()

    // Validate with Zod
    const validationResult = destinyMatchReportSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Destiny match report] validation failed', {
        errors: validationResult.error.issues,
      })
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

    const { reportedUserId, category, description } = validationResult.data

    if (reportedUserId === userId) {
      return NextResponse.json(
        { error: '자기 자신을 신고할 수 없습니다' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 최근 24시간 내 동일 대상 신고가 있으면 중복으로 막는다.
    const recentReport = await prisma.userReport.findFirst({
      where: {
        reporterId: userId,
        reportedId: reportedUserId,
        createdAt: { gte: new Date(Date.now() - REPORT_DEDUPE_WINDOW_MS) },
      },
    })

    if (recentReport) {
      return NextResponse.json(
        { error: '이미 신고한 사용자입니다. 24시간 후 다시 시도해주세요.' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    await prisma.userReport.create({
      data: {
        reporterId: userId,
        reportedId: reportedUserId,
        category,
        description: description ? description.slice(0, DESCRIPTION_MAX_STORED) : null,
      },
    })

    logger.info('[destiny-match/report] User reported', {
      reporterId: userId,
      reportedId: reportedUserId,
      category,
    })

    return NextResponse.json({ success: true, message: '신고가 접수되었습니다.' })
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/report',
    limit: 20,
    windowSeconds: 60,
  })
)
