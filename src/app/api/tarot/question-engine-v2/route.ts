import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createTarotGuard } from '@/lib/api/middleware'
import { tarotAnalyzeQuestionSchema } from '@/lib/api/zodValidation'
import { HTTP_STATUS } from '@/lib/constants/http'
import { logger } from '@/lib/logger'
import { analyzeTarotQuestionV2 } from '@/lib/Tarot/questionEngineV2'

export const POST = withApiMiddleware(
  async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = tarotAnalyzeQuestionSchema.safeParse(body)

      if (!validation.success) {
        const errors = validation.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ')

        logger.warn('[tarot/question-engine-v2] Validation failed', {
          errors: validation.error.issues,
        })

        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const result = await analyzeTarotQuestionV2(validation.data)
      return NextResponse.json(result)
    } catch (error) {
      logger.error('[tarot/question-engine-v2] Failed to analyze question', error)
      return NextResponse.json(
        { error: 'Failed to analyze question' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createTarotGuard({
    route: '/api/tarot/question-engine-v2',
    limit: 10,
    windowSeconds: 60,
  })
)
