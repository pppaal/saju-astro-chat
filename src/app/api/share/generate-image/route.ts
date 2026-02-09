import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createPublicStreamGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { shareResultRequestSchema } from '@/lib/api/zodValidation'

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      // Allow sharing without login, but track userId if available
      const session = await getServerSession(authOptions)
      const userId = session?.user?.id || null

      const rawBody = await req.json().catch(() => null)
      if (!rawBody || typeof rawBody !== 'object') {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body')
      }

      const validationResult = shareResultRequestSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[Share generate-image] validation failed', {
          errors: validationResult.error.issues,
        })
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
        )
      }

      const { title, description, resultData, resultType } = validationResult.data

      const sharedResult = await prisma.sharedResult.create({
        data: {
          userId,
          resultType,
          title,
          description: description || null,
          resultData: resultData ? (resultData as Prisma.InputJsonValue) : Prisma.DbNull,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://destinypal.com'
      const imageUrl = `/api/share/og-image?shareId=${sharedResult.id}&title=${encodeURIComponent(title)}&type=${resultType}`

      return apiSuccess({
        success: true,
        shareId: sharedResult.id,
        imageUrl,
        shareUrl: `${baseUrl}/shared/${sharedResult.id}`,
      })
    } catch (error) {
      logger.error('Share image generation error:', { error: error })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to generate share image')
    }
  },
  createPublicStreamGuard({
    route: 'share-generate-image',
    limit: 10,
    windowSeconds: 60,
  })
)
