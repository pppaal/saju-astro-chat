// src/app/api/tarot/interpret-stream/route.ts
// Tarot streaming interpretation — Claude Sonnet 4.5 token-by-token forward.
// 전체해석(overall) → 카드 1 → 카드 2 ... 순으로 클라이언트에서 점진적으로
// 렌더된다. (서버는 Claude token delta 를 SSE 로 그대로 forward 만 하고,
// 부분 JSON 안의 "overall" / cards[].interpretation 추출은 클라이언트
// `consumeSSEStream` + `extractPartialOverall` / `extractPartialCardTexts`
// 가 담당.)
//
// OpenAI fallback 은 제거됨 (Claude-only). Claude unavailable 또는 호출
// 실패 시 정적 fallback payload 를 단일 청크로 emit + 크레딧 환불.

import { NextRequest } from 'next/server'
import { initializeApiContext, createPublicStreamGuard, extractLocale } from '@/lib/api/middleware'
import { enforceBodySize } from '@/lib/http'
import { logger } from '@/lib/logger'
import { recordExternalCall } from '@/lib/metrics/index'
import { tarotInterpretStreamSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { isClaudeAvailable, PREMIUM_CLAUDE_MODEL } from '@/lib/llm/claude'
import { sanitizeForXmlTagBoundary } from '@/lib/llm/promptSafety'
import { streamClaudeWithContinuation } from '@/lib/llm/claudeWithContinuation'
import {
  buildFallbackPayload,
  buildInterpretStreamPrompts,
  type PromptCardInput,
} from '@/lib/tarot/promptBuild'
import { isDangerousQuestion, buildCrisisPayload } from '@/lib/tarot/safety'
import { tarotCreditCostFor, tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import { createDrawNonceStore, drawNonceOwnerKey } from '@/lib/api/idempotency'
import { loadDrawCards } from '@/lib/tarot/drawCardsCache'
import { checkAndConsumeCredits, creditErrorResponse } from '@/lib/credits/withCredits'
import { getUserDisplayName } from '@/lib/user/displayName'
import {
  buildTarotInterpretStreamResponse,
  refundOnFailure,
  streamJsonPayload,
  tarotTurnResultKey,
} from '@/lib/tarot/interpretStreamResponse'

// 끊긴 턴 복원 키는 result 엔드포인트가 '../route' 에서 import 하므로 re-export
// (SSOT 는 interpretStreamResponse.ts).
export { tarotTurnResultKey }

// 단일 Claude 호출의 최대 wall-clock — Sonnet 4.5 + 7장 streaming 기준
// Haiku 보다 응답 길어 통상 15-30s. 여유 있게 60s.
const CLAUDE_TIMEOUT_MS = 60000

// 카드 수 차등 가격은 tarot-spreads-data.ts 의 tarotCreditCostFor 가 SSOT.

// 무료 재해석(free replay) 누수 차단: 차감 면제 판정을 클라이언트가 보내는
// x-idempotency-key 가 아니라 draw 라우트가 발급한 서버 nonce 의 단일-사용
// 소비에 묶는다. 같은 nonce 의 진짜 재진입(새로고침/뒤로가기)만 차감을
// 건너뛰고, 위조/미발급 nonce 는 면제 없이 정상 차감.
// createDrawNonceStore — src/lib/api/idempotency.ts 참조. routeName 은 draw
// 라우트와 동일해야 scopedKey 가 일치한다.
const drawNonceStore = createDrawNonceStore('tarot-draw')

// Vercel 런타임 설정 — 누락되면 default 10s 함수 timeout 에 걸려 Claude
// 응답 받기 전에 함수가 죽는다 (운영에서 "카드를 해석하고 있어요..." 무한
// 루프의 원인이었음). counselor/realtime 과 동일하게 nodejs runtime,
// force-dynamic, 60s maxDuration 으로 통일.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// 90s — Sonnet 4.5 가 5+ 카드 스프레드에서 6000+ 토큰 생성 시 시간이
// 길어질 수 있어 충분히 여유. compatibility/counselor (90s) 와 통일.
export const maxDuration = 90

export async function POST(req: NextRequest) {
  let creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null = null
  let creditCost = 1
  // Hoisted so the outer catch can pass the same per-turn idempotent refund key.
  let refundKey: string | null = null

  try {
    const guardOptions = {
      ...createPublicStreamGuard({
        route: 'tarot-interpret-stream',
        limit: 10,
        windowSeconds: 60,
      }),
      // 게스트 제거 — 로그인 필수. 비로그인은 401.
      requireAuth: true,
    }

    const { context, error } = await initializeApiContext(req, guardOptions)
    if (error) return error

    logger.info('Tarot stream request', { ip: context.ip })

    const oversized = enforceBodySize(req, 256 * 1024)
    if (oversized) return oversized

    const rawBody = await req.json()

    const validationResult = tarotInterpretStreamSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Tarot interpret-stream] validation failed', {
        errors: validationResult.error.issues,
      })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(req),
        route: 'tarot/interpret-stream',
      })
    }

    const body = validationResult.data

    // 안전 가드 — 자살/자해 등 위험 질문이 들어오면 AI 호출 없이 위기 페이로드만
    // 즉시 응답하고 크레딧도 차감하지 않는다 (src/lib/tarot/safety.ts).
    const safetyQuestion = (body.userQuestion || '').trim()
    const safetyLanguage: 'ko' | 'en' = body.language === 'en' ? 'en' : 'ko'
    if (safetyQuestion && isDangerousQuestion(safetyQuestion)) {
      logger.info('Tarot stream blocked by safety guard', {
        route: 'interpret-stream',
        cards: Array.isArray(body.cards) ? body.cards.length : 0,
      })
      const crisisPayload = buildCrisisPayload({
        language: safetyLanguage,
        cardCount: Array.isArray(body.cards) ? body.cards.length : 1,
      })
      return streamJsonPayload(crisisPayload, { 'X-Tarot-Safety': '1' })
    }

    const ownerKey = drawNonceOwnerKey(req, context.userId)
    const drawNonce = (body.drawNonce || req.headers.get('x-draw-nonce') || '').trim()

    // 권위 있는 카드: draw 가 nonce 로 저장해 둔 서버 보관 카드를 *차감 전에*
    // peek(consume 아님)한다. 캐시에 있으면 그게 draw 가 실제로 뽑은 카드 —
    // 클라이언트가 올려보낸 cards 대신 이걸 써서 "뽑힌 카드 = 해석된 카드"
    // 무결성을 보장한다. 또 카드 수 기반 비용도 이 권위 값으로 산정해, 클라가
    // 카드를 적게 보내 2→1 크레딧으로 깎는 비용 회피까지 막는다. miss(만료/
    // redis 다운/위조·미발급 nonce/레거시·인라인 경로)면 null → body.cards 폴백.
    // (캐시 존재 자체가 정당한 발급+드로우의 증거 — 위조 nonce 는 항상 miss.)
    const serverCards = drawNonce ? await loadDrawCards(ownerKey, drawNonce) : null
    if (serverCards) {
      logger.info('[tarot-stream] using server-stored draw cards (authoritative)', {
        count: serverCards.length,
      })
    }

    // 비용 산정 — 클라이언트가 카드를 적게 보내 2→1 크레딧으로 깎는 회피 차단.
    // 1) serverCards(드로우 시 nonce 로 보관한 권위 카드)가 있으면 그 개수가 진짜.
    // 2) 없으면(Redis 다운/미발급 nonce/레거시) 클라 배열 길이만 믿지 않고,
    //    서버 스프레드 정의(spreadId→cardCount, in-memory·Redis 무관)와 클라
    //    카드 수 중 *큰 값* 으로 매긴다. 가격을 깎으려면 spreadId 와 cards 를
    //    모두 줄여야 하는데, 그러면 실제 받는 리딩도 같이 줄어 이득이 없다.
    const spreadCardCount = tarotThemes
      .find((t) => t.id === body.categoryId)
      ?.spreads.find((s) => s.id === body.spreadId)?.cardCount
    const clientCardCount = Array.isArray(body.cards) ? body.cards.length : 1
    const cardCountForCost = serverCards
      ? serverCards.length
      : Math.max(spreadCardCount ?? 0, clientCardCount, 1)
    creditCost = tarotCreditCostFor(cardCountForCost)

    // T1 fix: 옛 코드는 nonce.consume() 이 credit check 전에 호출됐다. credit
    // 부족 시 402 반환되는데 nonce 는 이미 burn. 사용자가 충전 후 같은 nonce
    // 로 재시도 → consume='replay' → creditResult=null → 무료 reading.
    //
    // 순서 변경: 먼저 credit check 후 nonce consume. credit 충분할 때만 nonce
    // burn → 차감 fail 시 nonce 보존되어 같은 free-pass 흐름 재진입 가능.

    // 1) credit 먼저 — nonce 는 peek 만 (consume 안 함).
    // peek 가 없으면 보수적으로: credit 확인 후 consume.
    creditResult = await checkAndConsumeCredits('reading', creditCost)
    if (!creditResult.allowed) {
      // nonce 아직 burn 안 됨. 사용자가 충전 후 재시도 가능.
      return creditErrorResponse(creditResult)
    }

    // 2) credit 차감 성공 후에야 nonce 소비. replay 면 차감 환불.
    const consumeResult = drawNonce ? await drawNonceStore.consume(drawNonce, ownerKey) : 'unknown'
    if (consumeResult === 'replay') {
      // 진짜 재진입 — 첫 호출 때 이미 차감 + reading 받음. 방금 차감한 credit
      // refund 후 free pass.
      logger.info('[tarot-stream] draw-nonce replay, refunding credit', { ownerKey })
      try {
        const { refundCredits } = await import('@/lib/credits/creditRefund')
        if (context.userId) {
          await refundCredits({
            userId: context.userId,
            creditType: 'reading',
            amount: creditCost,
            reason: 'tarot_nonce_replay',
            apiRoute: '/api/tarot/interpret-stream',
          })
        }
      } catch (refundErr) {
        logger.warn('[tarot-stream] replay refund failed', { refundErr })
      }
      creditResult = null
    } else if (consumeResult === 'unknown' && drawNonce) {
      logger.info('[tarot-stream] unknown/forged draw-nonce, charging normally', { ownerKey })
    }

    const categoryId = body.categoryId
    const spreadId = body.spreadId || ''
    const spreadTitle = body.spreadTitle || ''
    const language: 'ko' | 'en' =
      body.language === 'en'
        ? 'en'
        : body.language === 'ko'
          ? 'ko'
          : context.locale === 'en'
            ? 'en'
            : 'ko'
    // sanitizeForXmlTagBoundary strips `<`/`>` from attacker-controlled
    // question text so it can't fake server tags. The current tarot
    // prompt template uses markdown headers (no XML wrappers), but this
    // matches the rest of the LLM routes — defense in depth.
    const userQuestion = sanitizeForXmlTagBoundary((body.userQuestion || '').trim())

    // 서버 보관 카드가 있으면 그게 권위(우리 덱 데이터라 sanitize 불필요).
    // 없으면(폴백) 클라이언트가 보낸 카드를 쓰되 — 카드 필드도 공격자 제어
    // 값이므로 userQuestion 과 동일하게 sanitize 한다. 직전엔 question 만 걸러서
    // 카드 name/keywords/position 에 프롬프트 인젝션 텍스트를 넣으면 그대로 LLM
    // 에 박히던 구멍이 있었다(followup 라우트는 이미 sanitize). isReversed 는
    // boolean 이라 안전. 아래 buildInterpretStreamPrompts / buildFallbackPayload
    // 둘 다 이 배열을 사용한다.
    const sani = (s?: string) => (s ? sanitizeForXmlTagBoundary(s) : s)
    const rawCards: PromptCardInput[] = serverCards
      ? serverCards
      : body.cards.map((c) => ({
          ...c,
          name: sanitizeForXmlTagBoundary(c.name),
          nameKo: sani(c.nameKo),
          position: sani(c.position),
          positionKo: sani(c.positionKo),
          positionMeaning: sani(c.positionMeaning),
          positionMeaningKo: sani(c.positionMeaningKo),
          keywords: c.keywords?.map((k) => sanitizeForXmlTagBoundary(k)),
          keywordsKo: c.keywordsKo?.map((k) => sanitizeForXmlTagBoundary(k)),
        }))

    // 끊김 복구용 turnId. 로그인 사용자(context.userId) + turnId 가 둘 다
    // 있을 때만 "복구 가능한 턴". counselor 와 동일하게 slice(0,80).
    // 게스트는 복구 미지원 — turnId 가 있어도 무시(아래 recoverable=false).
    const turnId = typeof body.turnId === 'string' ? body.turnId.slice(0, 80) : ''
    const recoverableUserId = context.userId || ''
    const isRecoverable = Boolean(turnId && recoverableUserId)
    // Per-turn key so every refund path (fallback / claude error / stream error
    // / outer catch) refunds this turn at most once. (declared at fn scope above)
    // turnId 가 없으면 draw nonce(서버 발급, draw 마다 고유)로 대체 — 둘 다
    // 없을 때만 null. null 이면 refundCreditsOnce 가 시간대 버킷으로 합성 키를
    // 만드는데, 같은 유저·같은 시간·같은 사유의 서로 다른 두 실패가 한 키로
    // 뭉쳐 두 번째 진짜 실패가 "이미 환불됨" 으로 누락되던 충돌이 있었다.
    refundKey = turnId
      ? `tarot-interpret:${turnId}`
      : drawNonce
        ? `tarot-interpret:nonce:${drawNonce}`
        : null

    logger.info('Tarot stream payload', {
      categoryId,
      spreadId,
      language,
      cards: rawCards.length,
      hasQuestion: Boolean(userQuestion),
    })

    const { systemPrompt, userPrompt: rawUserPrompt } = buildInterpretStreamPrompts({
      language,
      spreadTitle,
      cards: rawCards,
      userQuestion,
    })

    // 로그인 사용자면 메인페이지 저장 이름으로 호명. context.userId 가
    // 인증 세션을 통과한 유저 ID — 게스트는 null 이라 헬퍼가 자동 null 반환.
    const callerName = await getUserDisplayName(context.userId)
    const callerHeader = callerName
      ? language === 'ko'
        ? `[호출자] ${callerName} — '${callerName}님'으로 정중히 호명하라.\n\n`
        : `[Caller] ${callerName} — address as 'Hi ${callerName},' naturally.\n\n`
      : ''
    const userPrompt = callerHeader + rawUserPrompt

    // Claude 없으면 정적 fallback 으로 즉시 응답 + 크레딧 환불.
    if (!isClaudeAvailable()) {
      logger.warn('Tarot stream missing ANTHROPIC_API_KEY, using fallback')
      await refundOnFailure(
        creditResult,
        'tarot_llm_unavailable',
        creditCost,
        'ANTHROPIC_API_KEY missing',
        refundKey
      )
      const fallback = buildFallbackPayload(rawCards, language)
      return streamJsonPayload(fallback, { 'X-Fallback': '1' })
    }

    // 카드당 ~500 tokens + overall/advice 여유 1200. 7장에서 ~4700 tokens
    // → Haiku 4.5 ~30-45s 안 완료 (이전 6050 tokens 는 60s 한계 직전까지
    // 가서 "예상보다 오래 걸리고 있어요" 무한 루프 회귀의 한 원인).
    const maxTokens = Math.min(6000, 1200 + rawCards.length * 500)
    const claudeStartTime = Date.now()

    logger.info('Tarot stream Claude streaming request', {
      cards: rawCards.length,
      maxTokens,
      systemLen: systemPrompt.length,
      userLen: userPrompt.length,
    })

    // 복구 가능한 턴(로그인 + turnId)이면 업스트림 생성을 req.signal 에 묶지
    // 않는다 — 클라가 끊겨도 끝까지 생성해 cacheSet 으로 저장(아래)해야 돌아온
    // 사용자가 result 엔드포인트로 복원할 수 있기 때문(counselor 식 keep-
    // generating-on-disconnect). 대신 별도 AbortController 를 만들어 넘긴다.
    // 이 컨트롤러는 req.signal 로 abort 되지 않으므로, 끊겨도 timeoutMs(아래
    // CLAUDE_TIMEOUT_MS) 가 만료 보호선으로 동작한다.
    // 복구 불가(게스트 / turnId 없음)면 기존대로 req.signal 을 그대로 넘겨,
    // 받아갈 사람도 없는데 토큰만 태우는 일을 막는다.
    const upstreamAbort = new AbortController()
    const upstreamSignal = isRecoverable ? upstreamAbort.signal : req.signal
    let claudeStream: ReadableStream<string>
    try {
      // streamClaudeWithContinuation — maxTokens 도달해도 자동 이어쓰기
      // 라 카드 7장 같은 깊은 해석도 중간에 안 잘림.
      claudeStream = await streamClaudeWithContinuation({
        // 복구 불가 턴: client disconnect → upstream Anthropic fetch aborts.
        // 복구 가능 턴: 끊겨도 끝까지 생성(별도 컨트롤러). 위 주석 참조.
        abortSignal: upstreamSignal,
        systemPrompt,
        userPrompt,
        model: PREMIUM_CLAUDE_MODEL,
        maxTokens,
        temperature: 0.7,
        timeoutMs: CLAUDE_TIMEOUT_MS,
        label: 'tarot-stream',
      })
    } catch (claudeErr) {
      recordExternalCall('anthropic', PREMIUM_CLAUDE_MODEL, 'error', Date.now() - claudeStartTime)
      logger.error('[tarot-stream] Claude initial call failed', {
        error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
      })
      await refundOnFailure(
        creditResult,
        'tarot_claude_error',
        creditCost,
        claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
        refundKey
      )
      const fallback = buildFallbackPayload(rawCards, language)
      return streamJsonPayload(fallback, { 'X-Fallback': '1' })
    }

    // Forward the Claude token stream to the client as SSE, with delivery
    // verification (isUsableReading), refund-on-failure, and disconnect-recovery
    // caching. All of that lives in buildTarotInterpretStreamResponse so this
    // route stays a thin orchestrator.
    return buildTarotInterpretStreamResponse({
      claudeStream,
      creditResult,
      creditCost,
      refundKey,
      rawCards,
      language,
      isRecoverable,
      recoverableUserId,
      turnId,
      claudeStartTime,
    })
  } catch (err) {
    // Charge-without-delivery guard: refund a consumed credit if we threw
    // before the stream started. The inner fallback paths refund-and-return,
    // so this only fires for un-refunded pre-stream failures (no double refund).
    await refundOnFailure(
      creditResult,
      'tarot_handler_error',
      creditCost,
      err instanceof Error ? err.message : String(err),
      refundKey
    )
    logger.error('Tarot stream error:', { error: err })
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'tarot/interpret-stream',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}
