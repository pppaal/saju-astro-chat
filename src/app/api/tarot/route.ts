// src/app/api/tarot/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createPublicStreamGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { tarotThemes, tarotCreditCostFor } from '@/lib/tarot/tarot-spreads-data'
import { Card, DrawnCard } from '@/lib/tarot/tarot.types'
import { tarotDeck } from '@/lib/tarot/data'
import { checkCreditsOnly, creditErrorResponse } from '@/lib/credits/withCredits'
import { createDrawNonceStore, drawNonceOwnerKey } from '@/lib/api/idempotency'
import { storeDrawCards, type StoredDrawCard } from '@/lib/tarot/drawCardsCache'
import { randomUUID } from 'crypto'

import { parseRequestBody } from '@/lib/api/requestParser'
import { recordApiRequest } from '@/lib/metrics/index'
import { tarotDrawSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'
type TarotBody = {
  categoryId?: string
  spreadId?: string
  questionContext?: unknown
}

// draw 가 발급하고 interpret-stream 이 소비하는 단일-사용 nonce 스토어.
// 두 라우트가 같은 routeName 을 써야 scopedKey 가 일치한다.
const drawNonceStore = createDrawNonceStore('tarot-draw')

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
    // 역방향 30% — 50% 는 부정적 카드가 너무 자주 나와 부담된다는
    // 피드백 반영. 정통 셔플도 물리 셔플 패턴상 ~25-30% 가 일반적.
    isReversed: Math.random() < 0.3,
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

      const { categoryId, spreadId, questionContext } = validationResult.data

      // 스프레드를 먼저 resolve — 카드 수에 따라 사전 크레딧 게이트 비용이
      // 달라지므로 (≥5 장 = 2 크레딧). 게이트 비용은 interpret 단계의 실제
      // 차감(tarotCreditCostFor)과 일치해야 가격 표시 불일치(1 이라 통과시켜
      // 놓고 해석 단계에서 402)를 막는다.
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

      const creditCost = tarotCreditCostFor(spread.cardCount)
      const creditResult = await checkCreditsOnly('reading', creditCost)
      if (!creditResult.allowed) {
        recordApiRequest('tarot', 'generate', 'error')
        return creditErrorResponse(creditResult)
      }

      const drawnCards = drawCards(spread.cardCount)

      // 서버 발급 단일-사용 nonce. interpret-stream 이 이 nonce 를 정확히 한
      // 번 소비해 "무료 재해석" 면제 판정을 클라이언트 헤더가 아닌 서버 발급
      // 토큰에 묶는다. (src/lib/api/idempotency.ts createDrawNonceStore)
      const drawNonce = randomUUID()
      const ownerKey = drawNonceOwnerKey(req, creditResult.userId)
      await drawNonceStore.issue(drawNonce, ownerKey)

      // 권위 있는 뽑힌 카드를 nonce 로 보관 → interpret-stream 이 클라이언트가
      // 올려보낸 cards 대신 이걸 써서 "뽑힌 카드 = 해석된 카드" 무결성 보장.
      // 프롬프트가 쓰는 최소 필드만 저장(키워드는 정/역 의미에서 8개까지).
      const storedCards: StoredDrawCard[] = drawnCards.map((dc) => {
        const meaning = dc.isReversed ? dc.card.reversed : dc.card.upright
        return {
          name: dc.card.name,
          nameKo: dc.card.nameKo,
          isReversed: dc.isReversed,
          keywords: (meaning.keywords || []).slice(0, 8),
          keywordsKo: (meaning.keywordsKo || []).slice(0, 8),
        }
      })
      await storeDrawCards(ownerKey, drawNonce, storedCards)

      recordApiRequest('tarot', 'generate', 'success', Date.now() - startTime)
      const response = NextResponse.json({
        category: theme.category,
        spread,
        drawnCards,
        questionContext: questionContext || null,
        drawNonce,
      })
      return response
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
