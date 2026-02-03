// src/app/api/tarot/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, type ApiContext } from '@/lib/api/middleware'
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data'
import { Card, DrawnCard } from '@/lib/Tarot/tarot.types'
import { tarotDeck } from '@/lib/Tarot/tarot-data'
import { checkCreditsOnly, creditErrorResponse } from '@/lib/credits/withCredits'

import { parseRequestBody } from '@/lib/api/requestParser'
import { LIMITS } from '@/lib/validation/patterns'
import { HTTP_STATUS } from '@/lib/constants/http'
import { recordApiRequest } from '@/lib/metrics/index'
import { tarotDrawSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'
const MAX_ID_LEN = LIMITS.ID
type TarotBody = {
  categoryId?: string
  spreadId?: string
}

function drawCards(count: number): DrawnCard[] {
  const deck = [...tarotDeck]
  // Fisher-Yates 셔플 - 완벽한 랜덤 분포
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck.slice(0, count).map((card: Card) => ({
    card,
    isReversed: Math.random() < 0.5,
  }))
}

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const startTime = Date.now()
    try {
      const rawBody = await parseRequestBody<TarotBody>(req, { context: 'Tarot' })
      if (!rawBody || typeof rawBody !== 'object') {
        recordApiRequest('tarot', 'generate', 'validation_error')
        return NextResponse.json({ error: 'invalid_body' }, { status: HTTP_STATUS.BAD_REQUEST })
      }

      // Validate with Zod
      const validationResult = tarotDrawSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[Tarot] validation failed', { errors: validationResult.error.issues })
        recordApiRequest('tarot', 'generate', 'validation_error')
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

      const { categoryId, spreadId } = validationResult.data

      const creditResult = await checkCreditsOnly('reading', 1)
      if (!creditResult.allowed) {
        recordApiRequest('tarot', 'generate', 'error')
        return creditErrorResponse(creditResult)
      }

      const theme = tarotThemes.find((t) => t.id === categoryId)
      if (!theme) {
        recordApiRequest('tarot', 'generate', 'error')
        return NextResponse.json({ error: 'Invalid category' }, { status: HTTP_STATUS.NOT_FOUND })
      }

      const spread = theme.spreads.find((s) => s.id === spreadId)
      if (!spread) {
        recordApiRequest('tarot', 'generate', 'error')
        return NextResponse.json({ error: 'Invalid spread' }, { status: HTTP_STATUS.NOT_FOUND })
      }

      const drawnCards = drawCards(spread.cardCount)

      recordApiRequest('tarot', 'generate', 'success', Date.now() - startTime)
      return NextResponse.json({
        category: theme.category,
        spread,
        drawnCards,
      })
    } catch (error) {
      recordApiRequest('tarot', 'generate', 'error', Date.now() - startTime)
      throw error
    }
  },
  createPublicStreamGuard({
    route: '/api/tarot',
    limit: 40,
    windowSeconds: 60,
  })
)
