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

import { NextRequest, NextResponse } from 'next/server'
import { initializeApiContext, createPublicStreamGuard, extractLocale } from '@/lib/api/middleware'
import { createSSEEvent, createSSEDoneEvent } from '@/lib/streaming'
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
import { tarotCreditCostFor } from '@/lib/tarot/tarot-spreads-data'
import { createDrawNonceStore, drawNonceOwnerKey } from '@/lib/api/idempotency'
import { loadDrawCards } from '@/lib/tarot/drawCardsCache'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'
import { refundCreditsOnce } from '@/lib/credits/refundOnce'
import { getUserDisplayName } from '@/lib/user/displayName'
import { cacheSet } from '@/lib/cache/redis-cache'

// 단일 Claude 호출의 최대 wall-clock — Sonnet 4.5 + 7장 streaming 기준
// Haiku 보다 응답 길어 통상 15-30s. 여유 있게 60s.
const CLAUDE_TIMEOUT_MS = 60000

// 끊긴 턴의 완성 리딩(raw JSON 문자열)을 잠깐 보관하는 캐시 키 — result
// 엔드포인트가 같은 키로 읽음. userId 를 키에 포함해 ownership 검증 (다른
// 사용자가 turnId 알아도 조회 불가). 게스트는 복구 미지원 (turnId 보관 안 함).
// counselor/realtime 의 counselorTurnResultKey 패턴과 동일.
export const tarotTurnResultKey = (userId: string, turnId: string) =>
  `tarot:turn-result:${userId}:${turnId}`

// 돌아와서 받아갈 시간을 충분히 (30분) — 크레딧 충전하러 갔다 오는 왕복도
// 커버. 받아가면 그만이고 TTL 로 자동 소멸.
const TURN_RESULT_TTL_SEC = 1800

// 카드 수 차등 가격은 tarot-spreads-data.ts 의 tarotCreditCostFor 가 SSOT.

// 무료 재해석(free replay) 누수 차단: 차감 면제 판정을 클라이언트가 보내는
// x-idempotency-key 가 아니라 draw 라우트가 발급한 서버 nonce 의 단일-사용
// 소비에 묶는다. 같은 nonce 의 진짜 재진입(새로고침/뒤로가기)만 차감을
// 건너뛰고, 위조/미발급 nonce 는 면제 없이 정상 차감.
// createDrawNonceStore — src/lib/api/idempotency.ts 참조. routeName 은 draw
// 라우트와 동일해야 scopedKey 가 일치한다.
const drawNonceStore = createDrawNonceStore('tarot-draw')

// 차감 후 Claude 호출이 실패해 사용자가 가치를 못 받은 경우 호출.
// 로그인 사용자는 refundCredits, 게스트는 호출자가 응답 cookie 증가를
// 스킵 (creditResult.guestReadingAccess 를 undefined 로 비워서 전달) 하면
// counter 가 원상 복귀 — 무료 횟수 한 번 날아가는 손해 안 봄.
async function refundOnFailure(
  creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null,
  reason: string,
  amount: number,
  errorMessage?: string,
  idempotencyKey?: string | null
) {
  if (!creditResult?.userId || !creditResult.chargedAs) return
  try {
    // Idempotent: every failure path may call this, but a turn refunds once.
    await refundCreditsOnce(idempotencyKey ?? null, {
      userId: creditResult.userId,
      creditType: creditResult.chargedAs,
      amount,
      reason,
      apiRoute: '/api/tarot/interpret-stream',
      errorMessage,
    })
  } catch (refundErr) {
    logger.error('[interpret-stream] refund failed', {
      refundErr: refundErr instanceof Error ? refundErr.message : String(refundErr),
      reason,
      userId: creditResult.userId,
    })
  }
}

// 실패 시 응답에 guest counter 증가 cookie 가 안 붙도록 creditResult 의
// guestReadingAccess 를 비운 사본 반환. authed 사용자는 영향 없음.
function clearGuestAccessOnFailure(
  creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null
): Awaited<ReturnType<typeof checkAndConsumeCredits>> | null {
  if (!creditResult) return creditResult
  return { ...creditResult, guestReadingAccess: undefined }
}

function withCreditCookies(
  response: Response,
  creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null
): Response {
  if (!creditResult?.guestReadingAccess) return response
  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
  return applyCreditResultCookies(nextResponse, creditResult)
}

function streamJsonPayload(
  payload: {
    overall: string
    cards: { position: string; interpretation: string }[]
    advice: string
  },
  extraHeaders?: Record<string, string>
): Response {
  const encoder = new TextEncoder()
  const jsonText = JSON.stringify(payload)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(createSSEEvent({ content: jsonText })))
      controller.enqueue(encoder.encode(createSSEDoneEvent()))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...(extraHeaders || {}),
    },
  })
}

// "전달됨(delivered)" 판정 — 스트림이 정상 종료(done)했더라도, 누적된
// fullText 가 *쓸 수 있는* 리딩으로 파싱되는지 검증한다. 빈 cards 배열,
// 파싱 불가 JSON, 필수 필드 누락 등 "과금했지만 가치 없음" 케이스를
// 전달 실패로 처리하기 위함. 파싱은 스트리밍 도중 잘린 부분 JSON 이 아니라
// *완성된* JSON 을 가정 (success path 에서만 호출). 관대하게: 끝의 트레일링
// 잡음/코드펜스 등 LLM 잡티는 첫 `{` ~ 마지막 `}` 구간만 떼어 파싱 시도.
function isUsableReading(fullText: string, expectedCardCount: number): boolean {
  const text = (fullText || '').trim()
  if (text === '') return false
  // LLM 이 ```json 펜스나 앞뒤 잡담을 붙였을 수 있어 첫 `{`~마지막 `}` 만 추출.
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return false
  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    return false
  }
  if (typeof parsed !== 'object' || parsed === null) return false
  const reading = parsed as { overall?: unknown; cards?: unknown }
  // overall 은 비어있지 않은 문자열.
  if (typeof reading.overall !== 'string' || reading.overall.trim() === '') return false
  // cards 는 비어있지 않은 배열이고, 각 항목이 비어있지 않은 interpretation 을 가진다.
  if (!Array.isArray(reading.cards) || reading.cards.length === 0) return false
  // 카드 수 = 실제 뽑힌 카드 수와 정확히 일치해야 한다. 클라이언트는 카드와
  // 해석을 *배열 순서로만* 매핑하므로(card_insights = drawnCards.map((dc,i) =>
  // parsedCards[i])), 모델이 카드를 적게/많게 emit 하면 뒤쪽 카드가 엉뚱한
  // 해석(또는 정적 폴백 의미)에 묶여 *조용히 잘못된 리딩* 이 된다. 개수가
  // 다르면 "전달 실패" 로 보고 환불 + 폴백 처리 — 깨진 매핑을 과금하지 않는다.
  if (reading.cards.length !== expectedCardCount) {
    logger.warn('[tarot-stream] card count mismatch — treating as unusable', {
      got: reading.cards.length,
      expected: expectedCardCount,
    })
    return false
  }
  const everyCardUsable = reading.cards.every((c) => {
    if (typeof c !== 'object' || c === null) return false
    const card = c as { position?: unknown; interpretation?: unknown }
    return (
      typeof card.position === 'string' &&
      card.position.trim() !== '' &&
      typeof card.interpretation === 'string' &&
      card.interpretation.trim() !== ''
    )
  })
  if (!everyCardUsable) return false

  // 자리(position) 라벨 중복은 *표시 품질* 이슈일 뿐, "가치 없음" 이 아니다.
  // 사용자는 overall + 모든 카드 해석이 든 완성 리딩을 이미 스트림으로 받았다.
  // 이걸 이유로 환불(=delivered 실패)하면 정상 리딩을 공짜로 주는 매출 누수가
  // 된다. 따라서 환불 게이트에서는 중복을 실패로 보지 않고 경고만 남긴다.
  const positions = (reading.cards as Array<{ position: string }>).map((c) =>
    c.position.trim().toLowerCase()
  )
  if (new Set(positions).size !== positions.length) {
    logger.warn('[tarot-stream] duplicate card positions in delivered reading (not refunding)', {
      positions,
    })
  }

  return true
}

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
    const guardOptions = createPublicStreamGuard({
      route: 'tarot-interpret-stream',
      limit: 10,
      windowSeconds: 60,
    })

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

    const cardCountForCost = serverCards
      ? serverCards.length
      : Array.isArray(body.cards)
        ? body.cards.length
        : 1
    creditCost = tarotCreditCostFor(cardCountForCost)

    // T1 fix: 옛 코드는 nonce.consume() 이 credit check 전에 호출됐다. credit
    // 부족 시 402 반환되는데 nonce 는 이미 burn. 사용자가 충전 후 같은 nonce
    // 로 재시도 → consume='replay' → creditResult=null → 무료 reading.
    //
    // 순서 변경: 먼저 credit check 후 nonce consume. credit 충분할 때만 nonce
    // burn → 차감 fail 시 nonce 보존되어 같은 free-pass 흐름 재진입 가능.

    // 1) credit 먼저 — nonce 는 peek 만 (consume 안 함).
    // peek 가 없으면 보수적으로: credit 확인 후 consume.
    creditResult = await checkAndConsumeCredits('reading', creditCost, req)
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
      return withCreditCookies(
        streamJsonPayload(fallback, { 'X-Fallback': '1' }),
        clearGuestAccessOnFailure(creditResult)
      )
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
      return withCreditCookies(
        streamJsonPayload(fallback, { 'X-Fallback': '1' }),
        clearGuestAccessOnFailure(creditResult)
      )
    }

    // Claude SDK stream → SSE 형식으로 forward. 각 token delta 가 도착하는
    // 즉시 클라에 emit 되어 progressive 렌더링 가능.
    // 클라이언트의 consumeSSEStream 이 각 청크마다 onChunk 호출 →
    // extractPartialOverall / extractPartialCardTexts 가 부분 JSON 파싱.
    const encoder = new TextEncoder()
    const reader = claudeStream.getReader()
    // 복구 가능 턴에서 클라가 사라졌는지(enqueue 실패로 감지). true 여도 생성은
    // 계속 읽고(아래 while), 화면 전송(enqueue)만 건너뛴다.
    let clientGone = false
    // 전체 누적 텍스트(raw JSON 리딩). 끝까지 생성되면 cacheSet 으로 저장해
    // 끊긴 사용자가 result 엔드포인트로 복원한다.
    let fullText = ''
    const sseStream = new ReadableStream({
      async start(controller) {
        // 클라가 사라졌을 때(복구 턴) 화면 전송은 건너뛰되 생성은 계속하기 위한
        // 안전 enqueue. enqueue 실패 = 연결 끊김 → clientGone 표시.
        // 복구 불가 턴은 enqueue 실패를 그대로 throw 해 기존 catch/환불 경로로.
        const safeEnqueue = (line: Uint8Array): void => {
          if (clientGone) return
          try {
            controller.enqueue(line)
          } catch (enqueueErr) {
            clientGone = true
            if (!isRecoverable) throw enqueueErr
          }
        }
        // 끝까지 생성된 완성 리딩을 캐시에 저장 — 끊겼다가 돌아온 로그인 사용자가
        // /api/tarot/interpret-stream/result?turnId=… 로 받아간다. 캐시 실패는
        // 무시(복원만 안 될 뿐 스트림엔 영향 없음).
        const persistIfRecoverable = async () => {
          if (!isRecoverable || fullText.trim() === '') return
          try {
            await cacheSet(
              tarotTurnResultKey(recoverableUserId, turnId),
              fullText,
              TURN_RESULT_TTL_SEC
            )
          } catch {
            /* 캐시 실패 무시 */
          }
        }
        // Claude 첫 토큰까지 시간이 걸려도 SSE 자체가 살아있음을 확인할 수
        // 있게 즉시 빈 content 이벤트 emit — Vercel/네트워크 buffering 도
        // 깨우는 효과. (한 줄 emit 이라 클라 parser 는 무시 가능 — 빈 content
        // 는 accumulated 에 안 더해짐.)
        safeEnqueue(encoder.encode(createSSEEvent({ content: '' })))
        // SSE heartbeat — emit a comment line periodically so NAT/edge idle
        // timeouts don't kill a long (e.g. 7-card) read while Claude is still
        // generating. Client parsers act only on `data:` lines, so `: hb` is
        // safely ignored. (counselor routes get this via streamClaudeAsSSE.)
        const heartbeat = setInterval(() => {
          safeEnqueue(encoder.encode(': hb\n\n'))
        }, 15000)
        let receivedAny = false
        let bytesEmitted = 0
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) {
              receivedAny = true
              bytesEmitted += typeof value === 'string' ? value.length : 0
              fullText += value
              safeEnqueue(encoder.encode(createSSEEvent({ content: value })))
            }
          }
          recordExternalCall(
            'anthropic',
            PREMIUM_CLAUDE_MODEL,
            'success',
            Date.now() - claudeStartTime
          )
          // "delivered" 정의 강화: 스트림이 정상 종료했어도 fullText 가 쓸 수
          // 있는 리딩(비어있지 않은 cards 의 유효 JSON)으로 파싱되지 않으면 —
          // 예: 빈 cards 배열 / 파싱 불가 JSON / 필수 필드 누락 — "과금했지만
          // 가치 없음" 이므로 전달 실패로 처리한다. partial/empty 환불 경로와
          // 동일하게 환불(refundKey 로 idempotent — 이중 환불 없음) 후 정적
          // fallback 을 emit. 쓸 수 없는 리딩은 캐시에 저장하지 않는다
          // (persistIfRecoverable 스킵) — 돌아온 사용자에게 쓰레기 복원 방지.
          if (!isUsableReading(fullText, rawCards.length)) {
            logger.warn('[tarot-stream] empty/unusable reading after normal completion', {
              bytesEmitted,
              fullTextLen: fullText.length,
              isRecoverable,
            })
            await refundOnFailure(
              creditResult,
              'tarot_empty_reading',
              creditCost,
              `unusable reading (bytes=${bytesEmitted}, len=${fullText.length})`,
              refundKey
            )
            const fallback = buildFallbackPayload(rawCards, language)
            // 복구 턴에서 클라가 사라졌어도 enqueue 는 안전하게 무시되어야 하므로
            // safeEnqueue 사용 (기존 success path 와 동일 동작).
            safeEnqueue(encoder.encode(createSSEEvent({ content: JSON.stringify(fallback) })))
            safeEnqueue(encoder.encode(createSSEDoneEvent()))
          } else {
            // 정상 완료 → 복구 가능 턴이면 완성 리딩 캐시 저장. (클라 연결 여부 무관.)
            await persistIfRecoverable()
            safeEnqueue(encoder.encode(createSSEDoneEvent()))
          }
        } catch (streamErr) {
          recordExternalCall(
            'anthropic',
            PREMIUM_CLAUDE_MODEL,
            'error',
            Date.now() - claudeStartTime
          )
          logger.error('[tarot-stream] Claude stream interrupted', {
            error: streamErr instanceof Error ? streamErr.message : String(streamErr),
            receivedAny,
            bytesEmitted,
          })
          // 받은 가치 기준 환불 판단:
          //   - 0 byte: 사용자가 본 게 없음 → 전액 환불 + 정적 fallback emit
          //   - <600 byte (대략 한국어 overall 도 못 끝낸 수준): "사용자가 받은
          //     게 너무 적다" 판단 → 환불 (악용 우려보다 사용자 신뢰가 우선)
          //   - ≥600 byte: 부분이지만 의미있는 텍스트가 갔다 — error 알림만,
          //     클라가 partial JSON 으로 복원 시도. 환불 X.
          const PARTIAL_REFUND_THRESHOLD = 600
          if (!receivedAny || bytesEmitted < PARTIAL_REFUND_THRESHOLD) {
            await refundOnFailure(
              creditResult,
              receivedAny ? 'tarot_claude_stream_partial' : 'tarot_claude_stream_no_content',
              creditCost,
              `${streamErr instanceof Error ? streamErr.message : String(streamErr)} (bytes=${bytesEmitted})`,
              refundKey
            )
            if (!receivedAny) {
              const fallback = buildFallbackPayload(rawCards, language)
              controller.enqueue(
                encoder.encode(createSSEEvent({ content: JSON.stringify(fallback) }))
              )
            } else {
              // 부분이지만 환불 처리 — error 이벤트로 알리고 클라가 partial
              // 텍스트로 복원 + 사용자에겐 "이번 리딩은 환불됐어요" UX 가능.
              try {
                controller.enqueue(
                  encoder.encode(createSSEEvent({ error: 'Stream interrupted (refunded)' }))
                )
              } catch {
                /* may already be closed */
              }
            }
          } else {
            // 부분 텍스트가 이미 클라이언트에 전달됨 (≥ threshold) — error
            // 이벤트로 끊김 알림. 클라이언트는 누적 텍스트로 partial JSON
            // 복구 시도. 의미 있는 양의 텍스트가 갔으므로 환불 X.
            try {
              controller.enqueue(encoder.encode(createSSEEvent({ error: 'Stream interrupted' })))
            } catch {
              /* may already be closed */
            }
          }
          controller.enqueue(encoder.encode(createSSEDoneEvent()))
        } finally {
          clearInterval(heartbeat)
          try {
            controller.close()
          } catch {
            /* already closed */
          }
        }
      },
      // Framework calls cancel() when the outgoing Response is dropped
      // (client disconnect).
      // 복구 불가 턴: inner reader 를 취소해 upstream Anthropic fetch (req.signal
      // abort-aware) 가 매달려 있지 않고 정리되게 한다.
      // 복구 가능 턴: reader 를 취소하지 않는다 — 취소하면 upstream 생성이
      // 중단돼 cacheSet(persistIfRecoverable) 로 저장할 완성 리딩이 사라진다.
      // 대신 start() 의 while 루프가 enqueue 실패(clientGone)를 잡고 끝까지
      // 읽어 저장한다 (counselor 의 keep-generating-on-disconnect 와 동일).
      cancel() {
        clientGone = true
        if (isRecoverable) return
        try {
          void reader.cancel()
        } catch {
          /* reader may already be done */
        }
      },
    })

    return withCreditCookies(
      new NextResponse(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
          'X-Provider': 'claude',
          'X-Tarot-Strategy': 'streaming',
        },
      }),
      creditResult
    )
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
    return withCreditCookies(
      createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        route: 'tarot/interpret-stream',
        originalError: err instanceof Error ? err : new Error(String(err)),
      }),
      clearGuestAccessOnFailure(creditResult)
    )
  }
}
