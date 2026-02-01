/**
 * Destiny Match Report API
 * 유저 신고
 */
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'

const VALID_CATEGORIES = ['inappropriate', 'spam', 'fake', 'harassment', 'other'] as const

// POST - 유저 신고
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!
      const { reportedUserId, category, description } = await req.json()

      if (!reportedUserId) {
        return NextResponse.json(
          { error: 'reportedUserId is required' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      if (!category || !VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      if (reportedUserId === userId) {
        return NextResponse.json(
          { error: '자기 자신을 신고할 수 없습니다' },
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
          { error: '이미 신고한 사용자입니다. 24시간 후 다시 시도해주세요.' },
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

      return NextResponse.json({ success: true, message: '신고가 접수되었습니다.' })
    } catch (error) {
      logger.error('[destiny-match/report] POST error:', { error })
      return NextResponse.json({ error: 'Failed to submit report' }, { status: HTTP_STATUS.SERVER_ERROR })
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/report',
    limit: 10,
    windowSeconds: 60,
  })
)
