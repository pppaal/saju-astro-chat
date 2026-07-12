// src/app/api/tarot/prefetch/route.ts
// Prefetch RAG context while user is selecting cards

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createTarotGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { TarotPrefetchSchema } from '@/lib/api/validator'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import { checkCreditsOnly, creditErrorResponse } from '@/lib/credits/withCredits'
import { tarotCreditCostFor, tarotThemes } from '@/lib/tarot/tarot-spreads-data'

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const body = await req.json().catch(() => null)
    if (!body) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'tarot/prefetch',
      })
    }

    const parsed = TarotPrefetchSchema.safeParse(body)
    if (!parsed.success) {
      return createValidationErrorResponse(parsed.error, {
        locale: extractLocale(req),
        route: 'tarot/prefetch',
      })
    }

    const { categoryId, spreadId } = parsed.data

    // 크레딧 사전 체크. 질문 화면에서 "리딩 시작"을 누르는 즉시 막기 위함 —
    // 카드 선택까지 진행시킨 뒤 결과 화면에서 알리던 동작을 교정한다.
    // 여기서는 소비하지 않는다(실제 차감은 /api/tarot draw 성공 시).
    // 비용은 draw 라우트와 동일하게 스프레드 카드 수 기준(SSOT) — 직전엔 1 로
    // 고정돼, 잔액 1 인 사용자가 2크레딧짜리 5·7장 스프레드를 카드 선택까지
    // 다 마친 뒤에야 402 를 받는 사전체크 무력화가 있었다.
    const spreadCardCount = tarotThemes
      .find((t) => t.id === categoryId)
      ?.spreads.find((s) => s.id === spreadId)?.cardCount
    const creditResult = await checkCreditsOnly('reading', tarotCreditCostFor(spreadCardCount ?? 1))
    if (!creditResult.allowed) {
      return creditErrorResponse(creditResult)
    }

    // 예전엔 여기서 apiClient.post('/api/tarot/prefetch', …) 로 *자기 자신* 경로에
    // fire-and-forget 요청을 보냈다. Python AI 백엔드가 제거돼 apiClient 는
    // baseUrl 이 없으므로(''), Node fetch 가 root-relative URL 을 파싱 못 해 매번
    // 즉시 실패 → debug 로그만 남기는 보장된 no-op 이었다(RAG 프리페치는 실질
    // 미동작). 죽은 자기호출을 제거하고 크레딧 사전체크만 남긴다 — 그게 이 라우트의
    // 실제 기능(질문 화면에서 잔액 부족을 즉시 막기)이다.
    return NextResponse.json({ status: 'ok' })
  },
  {
    ...createTarotGuard({
      route: 'tarot-prefetch',
      limit: 30,
      windowSeconds: 60,
    }),
    // 게스트 제거 — 로그인 필수. 비로그인은 401.
    requireAuth: true,
  }
)
