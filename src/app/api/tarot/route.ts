// src/app/api/tarot/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data'
import { Card, DrawnCard } from '@/lib/Tarot/tarot.types'
import { tarotDeck } from '@/lib/Tarot/tarot-data'
import { checkCreditsOnly, creditErrorResponse } from '@/lib/credits/withCredits'

import { parseRequestBody } from '@/lib/api/requestParser'
import { recordApiRequest } from '@/lib/metrics/index'
import { tarotDrawSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'
type TarotBody = {
  categoryId?: string
  spreadId?: string
}

function drawCards(count: number): DrawnCard[] {
  // Partial Fisher-Yates: 필요한 카드 수만큼만 셔플 (O(count) vs O(deck.length))
  const deck = [...tarotDeck]
  const n = Math.min(count, deck.length)
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (deck.length - i))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck.slice(0, n).map((card: Card) => ({
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
        return createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          message: 'Invalid request body',
          locale: extractLocale(req),
          route: 'tarot',
        })
      }

      // Validate with Zod
      const validationResult = tarotDrawSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[Tarot] validation failed', { errors: validationResult.error.issues })
        recordApiRequest('tarot', 'generate', 'validation_error')
        return createValidationErrorResponse(validationResult.error, {
          locale: extractLocale(req),
          route: 'tarot',
        })
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
        return createErrorResponse({
          code: ErrorCodes.NOT_FOUND,
          message: 'Invalid category',
          locale: extractLocale(req),
          route: 'tarot',
        })
      }

      const spread = theme.spreads.find((s) => s.id === spreadId)
      if (!spread) {
        recordApiRequest('tarot', 'generate', 'error')
        return createErrorResponse({
          code: ErrorCodes.NOT_FOUND,
          message: 'Invalid spread',
          locale: extractLocale(req),
          route: 'tarot',
        })
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
