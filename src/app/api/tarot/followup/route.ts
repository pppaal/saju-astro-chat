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
import { refundCredits } from '@/lib/credits/creditRefund'
import { logger } from '@/lib/logger'
import { createIdempotencyStore } from '@/lib/api/idempotency'

// 새로고침/뒤로가기/다른 탭 등으로 같은 follow-up 질문이 재진입할 때
// 크레딧 중복 차감 방지. 클라이언트가 x-idempotency-key 헤더로 messageId
// UUID 를 보내면 (userId|ip):key 로 6 시간 기억. 재진입 시 차감만 스킵.
const idemStore = createIdempotencyStore('tarot-followup')

function ownerKeyFromReq(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return `ip:${ip}`
}
import { HTTP_STATUS } from '@/lib/constants/http'
import { callClaude, isClaudeAvailable, PREMIUM_CLAUDE_MODEL } from '@/lib/llm/claude'
import { sanitizeForXmlTagBoundary, sanitizePriorTurns } from '@/lib/llm/promptSafety'
import { pickTarotFollowupRules } from '@/lib/tarot/promptShared'
import { getUserDisplayName } from '@/lib/user/displayName'

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

// 차감 후 LLM 호출이 실패해서 사용자가 의미있는 답변을 받지 못한 경우 호출.
// 로그인 사용자만 환불 (guest 는 cookie 카운터라 후속에서 별도 정책 필요).
async function refundOnLlmFailure(
  creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null,
  reason: string,
  errorMessage?: string
) {
  if (!creditResult?.userId || !creditResult.chargedAs) return
  try {
    await refundCredits({
      userId: creditResult.userId,
      creditType: creditResult.chargedAs,
      amount: 1,
      reason,
      apiRoute: '/api/tarot/followup',
      errorMessage,
    })
  } catch (refundErr) {
    logger.error('[followup] refund failed', {
      refundErr: refundErr instanceof Error ? refundErr.message : String(refundErr),
      reason,
      userId: creditResult.userId,
    })
  }
}

// Vercel 런타임 설정 — interpret-stream 과 동일한 누락 버그(default 10s
// function timeout 에 걸려 Claude 응답 전 죽음) 방지. clarifier card 한 장
// 더 뽑기 + 후속 질문 모두 Claude 호출이 들어가므로 같은 처리.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

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
        return NextResponse.json(
          { error: 'invalid_json_body' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
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

      const rawData = validated.data
      // Sanitize every client-supplied free-text field before it gets
      // concatenated into the prompt. Even though the current readingContext
      // template uses markdown (not XML tags), the model still pays attention
      // to `<...>`-shaped sequences and routes elsewhere DO wrap content in
      // tags — so we normalize at the boundary. See src/lib/llm/promptSafety.ts.
      const spreadTitle = sanitizeForXmlTagBoundary(rawData.spreadTitle)
      const originalQuestion = rawData.originalQuestion
        ? sanitizeForXmlTagBoundary(rawData.originalQuestion)
        : undefined
      const overallMessage = rawData.overallMessage
        ? sanitizeForXmlTagBoundary(rawData.overallMessage)
        : undefined
      const cards = rawData.cards.map((c) => ({
        ...c,
        position: sanitizeForXmlTagBoundary(c.position),
        positionKo: c.positionKo ? sanitizeForXmlTagBoundary(c.positionKo) : undefined,
        name: sanitizeForXmlTagBoundary(c.name),
        nameKo: c.nameKo ? sanitizeForXmlTagBoundary(c.nameKo) : undefined,
      }))
      const history = rawData.history
      const question = sanitizeForXmlTagBoundary(rawData.question)
      const language = rawData.language

      // follow-up 도 reading 호출과 동일하게 reading 크레딧 1회 차감. 가격
      // 모델은 "질문 1개 = 1 credit" 으로 단순; 팩 크레딧 자체가 2배라서
      // 사용자 가치는 동일.
      // 새로고침/탭 복제 등으로 같은 messageId 가 재진입하면 차감만 스킵.
      const ownerKey = ownerKeyFromReq(req)
      const scopedIdemKey = idemStore.keyFor(req, ownerKey)
      const idempotentReplay = scopedIdemKey ? await idemStore.isReplay(scopedIdemKey) : false

      if (idempotentReplay) {
        logger.info('[tarot/followup] idempotent replay, skip credit consume', { ownerKey })
        creditResult = null
      } else {
        creditResult = await checkAndConsumeCredits('reading', 1, req)
        if (!creditResult.allowed) return creditErrorResponse(creditResult)
        if (scopedIdemKey) await idemStore.mark(scopedIdemKey)
      }

      const isKo = language === 'ko'

      const cardList = cards
        .map((c, i) => {
          const name = isKo && c.nameKo ? c.nameKo : c.name
          const pos = isKo && c.positionKo ? c.positionKo : c.position
          return `${i + 1}. [${pos}] ${name}${c.isReversed ? (isKo ? ' (역방향)' : ' (reversed)') : ''}`
        })
        .join('\n')

      const systemPrompt = pickTarotFollowupRules(isKo ? 'ko' : 'en')

      // 카드·원래 리딩 정보 = 세션 내 안정 컨텍스트 (cached). question_by_question
      // 동작 위해 history는 진짜 multi-turn (priorTurns)으로 전송.
      // 호출자 이름은 cachedUserContext 밖 (userPrompt prefix) 에 둠 —
      // 캐시된 prefix 에 이름이 박히면 유저별로 prompt cache 가 분리되고
      // 이름 변경시 무효화돼서 hit ratio 가 낮아지는 문제.
      const readingContext = isKo
        ? `# 원래 리딩
스프레드: ${spreadTitle}
원래 질문: ${originalQuestion || '-'}

## 펼친 카드
${cardList}
${overallMessage ? `\n## 전체 해석 (참고)\n${overallMessage}` : ''}`
        : `# Original Reading
Spread: ${spreadTitle}
Original Question: ${originalQuestion || '-'}

## Cards on the table
${cardList}
${overallMessage ? `\n## Overall reading (reference)\n${overallMessage}` : ''}`

      // 메인페이지 저장 이름을 DB 에서 직접 조회. creditResult.userId 는
      // checkAndConsumeCredits 에서 인증된 userId (게스트면 undefined).
      const callerName = await getUserDisplayName(creditResult?.userId)
      const callerLine = callerName
        ? isKo
          ? `[호출자] ${callerName} — 한국어로 답할 때 '${callerName}님'으로 정중히 호명.\n\n`
          : `[Caller] ${callerName} — address as 'Hi ${callerName},' naturally.\n\n`
        : ''

      // sanitizePriorTurns rejects forged `system` roles, caps content,
      // and strips `<`/`>` so replayed turns can't smuggle tag-close
      // sequences into the prompt window. See src/lib/llm/promptSafety.ts.
      const priorTurns = sanitizePriorTurns(history || [])
      const userPrompt = isKo
        ? `${callerLine}# 후속 질문\n${question}\n\n# 답변`
        : `${callerLine}# Follow-up question\n${question}\n\n# Answer`

      if (!isClaudeAvailable()) {
        await refundOnLlmFailure(creditResult, 'tarot_llm_unavailable', 'ANTHROPIC_API_KEY missing')
        return NextResponse.json(
          { error: 'llm_unavailable' },
          { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        )
      }

      const result = await callClaude({
        systemPrompt,
        userPrompt,
        cachedUserContext: readingContext,
        priorTurns,
        // Haiku → Sonnet 4.5 — followup 답변 깊이·맥락 연결 품질 위해
        // 통일. 1h 캐시로 컨텍스트 토큰 비용 회수.
        model: PREMIUM_CLAUDE_MODEL,
        maxTokens: 700,
        temperature: 0.7,
        timeoutMs: 30000,
        label: 'tarot-followup',
      })

      const response = NextResponse.json({ answer: result.text.trim() })
      return applyCreditResultCookies(response, creditResult)
    } catch (err: unknown) {
      // 차감 *후* 발생한 모든 실패 (LLM 호출 throw 포함) 에서 환불.
      // creditResult 가 null 이면 아직 차감 전이라 환불 대상 아님.
      if (creditResult) {
        await refundOnLlmFailure(
          creditResult,
          'tarot_followup_error',
          err instanceof Error ? err.message : String(err)
        )
      }
      captureServerError(err as Error, { route: '/api/tarot/followup' })
      logger.error('Tarot followup error:', err)
      // 클라이언트에는 일반화된 에러만 노출. 원본 err.message 는 위 로그/
      // sentry 에서만 확인 (DB 에러·내부 경로·스택 힌트 누출 방지).
      return NextResponse.json({ error: 'followup_failed' }, { status: HTTP_STATUS.SERVER_ERROR })
    }
  },
  createPublicStreamGuard({
    route: 'tarot/followup',
    limit: 20,
    windowSeconds: 60,
  })
)
