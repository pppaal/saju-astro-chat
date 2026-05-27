// src/app/api/tarot/interpret-stream/route.ts
// Tarot streaming interpretation — Claude Haiku 4.5 token-by-token forward.
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
import { callClaudeStream, isClaudeAvailable, DEFAULT_CLAUDE_MODEL } from '@/lib/llm/claude'
import { buildFallbackPayload, buildInterpretStreamPrompts } from '@/lib/tarot/promptBuild'
import { isDangerousQuestion, buildCrisisPayload } from '@/lib/tarot/safety'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'
import { refundCredits } from '@/lib/credits/creditRefund'
import { getUserDisplayName } from '@/lib/user/displayName'

// 단일 Claude 호출의 최대 wall-clock — Haiku 4.5 + 7장 streaming 기준
// 통상 8-20s, 여유 있게.
const CLAUDE_TIMEOUT_MS = 60000

// 8장+ 스프레드는 토큰·연산 부담이 2배라 2 크레딧 (UI 표시와 일치).
// 현재 데이터상 최대 7장이라 large 경로는 실효 dead path 이지만,
// 추후 큰 스프레드 추가 시 가격 책정 일관성 유지 위해 남김.
const LARGE_SPREAD_THRESHOLD = 8

function readingCreditCost(cardCount: number): number {
  return cardCount >= LARGE_SPREAD_THRESHOLD ? 2 : 1
}

// 새로고침/뒤로가기 시 같은 리딩에 대해 크레딧이 또 차감되던 문제 방어.
// 클라이언트가 보내는 x-idempotency-key (보통 readingSignature = 스프레드+카드 조합)
// 를 (userId|ip) 와 함께 모듈 스코프 Map 에 6시간 TTL 로 기억해 두고, 같은 키가
// 다시 오면 크레딧 차감만 건너뛴다. Vercel serverless 의 인스턴스 lifespan 한정
// 효과이지만 1차 방어는 클라이언트 sessionStorage 가 담당하므로, 여기는 그걸
// 뚫고 들어온 케이스(다른 탭/네트워크 재시도/캐시 무력화)만 잡으면 충분.
const IDEMPOTENCY_TTL_MS = 6 * 60 * 60 * 1000
const IDEMPOTENCY_MAX_ENTRIES = 500
const IDEMPOTENCY_PROCESSED = new Map<string, number>()

function idempotencyKeyFor(req: NextRequest, ownerKey: string): string | null {
  const raw = req.headers.get('x-idempotency-key')?.trim()
  if (!raw) return null
  // 길이 가드 — 비정상 헤더 거부.
  if (raw.length > 256) return null
  return `${ownerKey}:${raw}`
}

function isIdempotentReplay(scopedKey: string): boolean {
  const expiresAt = IDEMPOTENCY_PROCESSED.get(scopedKey)
  if (!expiresAt) return false
  if (Date.now() > expiresAt) {
    IDEMPOTENCY_PROCESSED.delete(scopedKey)
    return false
  }
  return true
}

function markIdempotent(scopedKey: string): void {
  // size 가 너무 커지면 만료된 항목부터 청소. 만료 없이도 한계 넘으면 가장
  // 오래된 것 일부를 절단 — 메모리 무한 증가 방지.
  if (IDEMPOTENCY_PROCESSED.size > IDEMPOTENCY_MAX_ENTRIES) {
    const now = Date.now()
    for (const [k, exp] of IDEMPOTENCY_PROCESSED.entries()) {
      if (now > exp) IDEMPOTENCY_PROCESSED.delete(k)
    }
    if (IDEMPOTENCY_PROCESSED.size > IDEMPOTENCY_MAX_ENTRIES) {
      const dropCount = IDEMPOTENCY_PROCESSED.size - IDEMPOTENCY_MAX_ENTRIES
      const it = IDEMPOTENCY_PROCESSED.keys()
      for (let i = 0; i < dropCount; i += 1) {
        const k = it.next().value
        if (k !== undefined) IDEMPOTENCY_PROCESSED.delete(k)
      }
    }
  }
  IDEMPOTENCY_PROCESSED.set(scopedKey, Date.now() + IDEMPOTENCY_TTL_MS)
}

// 차감 후 Claude 호출이 실패해 사용자가 가치를 못 받은 경우 호출.
// 로그인 사용자만 환불 (guest 는 cookie 카운터라 후속에서 별도 정책).
async function refundOnFailure(
  creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null,
  reason: string,
  amount: number,
  errorMessage?: string
) {
  if (!creditResult?.userId || !creditResult.chargedAs) return
  try {
    await refundCredits({
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

// Vercel 런타임 설정 — 누락되면 default 10s 함수 timeout 에 걸려 Claude
// 응답 받기 전에 함수가 죽는다 (운영에서 "카드를 해석하고 있어요..." 무한
// 루프의 원인이었음). counselor/realtime 과 동일하게 nodejs runtime,
// force-dynamic, 60s maxDuration 으로 통일.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// 60→90s 상향 — Haiku 4.5 가 5+ 카드 스프레드에서 6000+ 토큰 생성 시
// 60s 한계 직전까지 가는 케이스가 있어 "예상보다 오래 걸리고 있어요"
// 무한 루프로 보이던 회귀. compatibility/counselor (90s) 와 통일.
export const maxDuration = 90

export async function POST(req: NextRequest) {
  let creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null = null
  let creditCost = 1

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
    // 즉시 응답하고 크레딧도 차감하지 않는다. questionEngineV2 추천 단계의
    // 가드와 동일 키워드 셋을 공유 (src/lib/tarot/safety.ts).
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

    creditCost = readingCreditCost(Array.isArray(body.cards) ? body.cards.length : 0)
    const ownerKey = context.userId || `ip:${context.ip || 'unknown'}`
    const scopedIdemKey = idempotencyKeyFor(req, ownerKey)
    const idempotentReplay = scopedIdemKey ? isIdempotentReplay(scopedIdemKey) : false

    if (idempotentReplay) {
      // 같은 리딩이 짧은 시간 안에 다시 들어옴(새로고침/뒤로가기/탭 복제 등).
      // 크레딧 차감만 건너뛰고 Claude 호출은 정상 진행 — 사용자는 해석을
      // 다시 받지만 토큰은 안 먹는다.
      logger.info('[tarot-stream] idempotent replay, skip credit consume', {
        ownerKey,
      })
      creditResult = null
    } else {
      creditResult = await checkAndConsumeCredits('reading', creditCost, req)
      if (!creditResult.allowed) return creditErrorResponse(creditResult)
      if (scopedIdemKey) {
        markIdempotent(scopedIdemKey)
      }
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
    const rawCards = body.cards
    const userQuestion = (body.userQuestion || '').trim()

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
        'ANTHROPIC_API_KEY missing'
      )
      const fallback = buildFallbackPayload(rawCards, language)
      return withCreditCookies(streamJsonPayload(fallback, { 'X-Fallback': '1' }), creditResult)
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

    let claudeStream: ReadableStream<string>
    try {
      claudeStream = await callClaudeStream({
        systemPrompt,
        userPrompt,
        model: DEFAULT_CLAUDE_MODEL,
        maxTokens,
        temperature: 0.7,
        timeoutMs: CLAUDE_TIMEOUT_MS,
        label: 'tarot-stream',
      })
    } catch (claudeErr) {
      recordExternalCall('anthropic', DEFAULT_CLAUDE_MODEL, 'error', Date.now() - claudeStartTime)
      logger.error('[tarot-stream] Claude initial call failed', {
        error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
      })
      await refundOnFailure(
        creditResult,
        'tarot_claude_error',
        creditCost,
        claudeErr instanceof Error ? claudeErr.message : String(claudeErr)
      )
      const fallback = buildFallbackPayload(rawCards, language)
      return withCreditCookies(streamJsonPayload(fallback, { 'X-Fallback': '1' }), creditResult)
    }

    // Claude SDK stream → SSE 형식으로 forward. 각 token delta 가 도착하는
    // 즉시 클라에 emit 되어 progressive 렌더링 가능.
    // 클라이언트의 consumeSSEStream 이 각 청크마다 onChunk 호출 →
    // extractPartialOverall / extractPartialCardTexts 가 부분 JSON 파싱.
    const encoder = new TextEncoder()
    const reader = claudeStream.getReader()
    const sseStream = new ReadableStream({
      async start(controller) {
        // Claude 첫 토큰까지 시간이 걸려도 SSE 자체가 살아있음을 확인할 수
        // 있게 즉시 빈 content 이벤트 emit — Vercel/네트워크 buffering 도
        // 깨우는 효과. (한 줄 emit 이라 클라 parser 는 무시 가능 — 빈 content
        // 는 accumulated 에 안 더해짐.)
        controller.enqueue(encoder.encode(createSSEEvent({ content: '' })))
        let receivedAny = false
        let bytesEmitted = 0
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) {
              receivedAny = true
              bytesEmitted += typeof value === 'string' ? value.length : 0
              controller.enqueue(encoder.encode(createSSEEvent({ content: value })))
            }
          }
          recordExternalCall(
            'anthropic',
            DEFAULT_CLAUDE_MODEL,
            'success',
            Date.now() - claudeStartTime
          )
          controller.enqueue(encoder.encode(createSSEDoneEvent()))
        } catch (streamErr) {
          recordExternalCall(
            'anthropic',
            DEFAULT_CLAUDE_MODEL,
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
              `${streamErr instanceof Error ? streamErr.message : String(streamErr)} (bytes=${bytesEmitted})`
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
          try {
            controller.close()
          } catch {
            /* already closed */
          }
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
    logger.error('Tarot stream error:', { error: err })
    return withCreditCookies(
      createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        route: 'tarot/interpret-stream',
        originalError: err instanceof Error ? err : new Error(String(err)),
      }),
      creditResult
    )
  }
}
