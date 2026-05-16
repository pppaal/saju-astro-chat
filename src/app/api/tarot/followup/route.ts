// src/app/api/tarot/followup/route.ts
// Follow-up Q&A on a finished tarot reading. The user can ask a more
// specific question about the cards they just drew; this route gives
// them a tight, in-character answer that re-uses the same 4-step
// method as the original interpretation, but scoped to the follow-up.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { captureServerError } from '@/lib/telemetry'
import { enforceBodySize } from '@/lib/http'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { callClaude, isClaudeAvailable } from '@/lib/llm/claude'

const followupCardSchema = z.object({
  position: z.string().max(120),
  positionKo: z.string().max(120).optional(),
  name: z.string().max(120),
  nameKo: z.string().max(120).optional(),
  isReversed: z.boolean(),
})

const followupTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
})

const followupRequestSchema = z.object({
  spreadTitle: z.string().min(1).max(200),
  originalQuestion: z.string().max(600).optional(),
  overallMessage: z.string().max(4000).optional(),
  cards: z.array(followupCardSchema).min(1).max(15),
  history: z.array(followupTurnSchema).max(20).optional(),
  question: z.string().min(1).max(600),
  language: z.enum(['ko', 'en']).default('ko'),
})

export const POST = withApiMiddleware(
  async (req: NextRequest) => {
    let creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null = null

    try {
      const oversized = enforceBodySize(req, 64 * 1024)
      if (oversized) return oversized

      let raw: unknown
      try {
        raw = await req.json()
      } catch {
        return NextResponse.json({ error: 'invalid_json_body' }, { status: HTTP_STATUS.BAD_REQUEST })
      }

      const validated = followupRequestSchema.safeParse(raw)
      if (!validated.success) {
        return NextResponse.json(
          {
            error: 'validation_failed',
            details: validated.error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const { spreadTitle, originalQuestion, overallMessage, cards, history, question, language } =
        validated.data

      // follow-up 도 reading 호출과 동일하게 reading 크레딧 1회 차감 (가격 모델 단순화).
      // 가격 별도 분리하려면 'reading_followup' 같은 별도 type 신설 가능.
      creditResult = await checkAndConsumeCredits('reading', 1, req)
      if (!creditResult.allowed) return creditErrorResponse(creditResult)

      const isKo = language === 'ko'

      const cardList = cards
        .map((c, i) => {
          const name = isKo && c.nameKo ? c.nameKo : c.name
          const pos = isKo && c.positionKo ? c.positionKo : c.position
          return `${i + 1}. [${pos}] ${name}${c.isReversed ? (isKo ? ' (역방향)' : ' (reversed)') : ''}`
        })
        .join('\n')

      const historyBlock = (history || [])
        .map((t) => `[${t.role}] ${t.content}`)
        .join('\n')

      const systemPrompt = isKo
        ? `이미 펼친 카드 안에서 후속 질문에 답한다. 새 카드 X.

규칙:
- 3-6 문장 (200-360자), 마크다운/코드펜스 X.
- 결말: 구체 행동 1개 + 시간 앵커.
- 한 카드 질문이면 그 카드만, 흐름 질문이면 카드 간 관계.
- AI/모델 정체 노출 금지.`
        : `Answer the follow-up using only the cards already on the table. No new cards.

Rules:
- 3-6 sentences (120-200 words). No markdown / code fences.
- Close with 1 concrete action + a time anchor.
- One-card question → stay on it; flow question → address card relationships.
- Never reveal you're an AI / model.`

      const userPrompt = isKo
        ? `# 원래 리딩
스프레드: ${spreadTitle}
원래 질문: ${originalQuestion || '-'}

## 펼친 카드
${cardList}

${
  overallMessage
    ? `## 전체 해석 (참고)
${overallMessage}
`
    : ''
}${
  historyBlock
    ? `## 이전 대화
${historyBlock}
`
    : ''
}
# 후속 질문
${question}

# 답변`
        : `# Original Reading
Spread: ${spreadTitle}
Original Question: ${originalQuestion || '-'}

## Cards on the table
${cardList}

${
  overallMessage
    ? `## Overall reading (reference)
${overallMessage}
`
    : ''
}${
  historyBlock
    ? `## Previous turns
${historyBlock}
`
    : ''
}
# Follow-up question
${question}

# Answer`

      if (!isClaudeAvailable()) {
        return NextResponse.json(
          { error: 'llm_unavailable' },
          { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        )
      }

      const result = await callClaude({
        systemPrompt,
        userPrompt,
        maxTokens: 700,
        temperature: 0.7,
        timeoutMs: 30000,
        label: 'tarot-followup',
      })

      const response = NextResponse.json({ answer: result.text.trim() })
      return applyCreditResultCookies(response, creditResult)
    } catch (err: unknown) {
      captureServerError(err as Error, { route: '/api/tarot/followup' })
      logger.error('Tarot followup error:', err)
      return NextResponse.json(
        { error: 'followup_failed', message: err instanceof Error ? err.message : 'Unknown error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createPublicStreamGuard({
    route: 'tarot/followup',
    limit: 20,
    windowSeconds: 60,
  })
)
