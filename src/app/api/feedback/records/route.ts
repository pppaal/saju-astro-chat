import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { feedbackRecordsQuerySchema as FeedbackRecordsQuerySchema } from '@/lib/api/zodValidation'

export const GET = withApiMiddleware(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url)

      // Validate query parameters with Zod
      const validation = FeedbackRecordsQuerySchema.safeParse({
        service: searchParams.get('service'),
        theme: searchParams.get('theme'),
        helpful: searchParams.get('helpful'),
        limit: searchParams.get('limit'),
      })

      if (!validation.success) {
        const errors = validation.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')
        logger.warn('[feedback/records] Validation failed', { errors: validation.error.issues })
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const { service, theme, helpful, limit } = validation.data

      const where: { service?: string; theme?: string; helpful?: boolean } = {}
      if (service) {
        where.service = service
      }
      if (theme) {
        where.theme = theme
      }
      if (helpful !== undefined) {
        where.helpful = helpful
      }

      const records = await prisma.sectionFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          service: true,
          theme: true,
          sectionId: true,
          helpful: true,
          dayMaster: true,
          sunSign: true,
          locale: true,
          userHash: true,
          createdAt: true,
        },
      })

      return NextResponse.json({ records })
    } catch (error: unknown) {
      logger.error('[Feedback Records Error]:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createSimpleGuard({ route: 'feedback/records', limit: 60, windowSeconds: 60 })
)
