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
import { localizeMessage } from '@/lib/api/i18n-error'

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
        { error: localizeMessage(req, { ko: '자기 자신을 신고할 수 없습니다', en: "You can't report yourself" }) },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 같은 유저를 24시간 내에 중복 신고 방지
    const recentReport = await prisma.userReport.findFirst({
      where: {
        reporterId: userId,
        reportedId: reportedUserId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    if (recentReport) {
      return NextResponse.json(
        { error: localizeMessage(req, { ko: '이미 신고한 사용자입니다. 24시간 후 다시 시도해주세요.', en: 'You already reported this user. Try again in 24 hours.' }) },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 신고 생성
    await prisma.userReport.create({
      data: {
        reporterId: userId,
        reportedId: reportedUserId,
        category,
        description: description?.slice(0, 500) || null,
      },
    })

    logger.info('[destiny-match/report] User reported', {
      reporterId: userId,
      reportedId: reportedUserId,
      category,
    })

    return NextResponse.json({ success: true, message: localizeMessage(req, { ko: '신고가 접수되었습니다.', en: 'Report received.' }) })
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/report',
    limit: 10,
    windowSeconds: 60,
  })
)
