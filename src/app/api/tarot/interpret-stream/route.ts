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
import { streamClaudeWithContinuation } from '@/lib/llm/claudeWithContinuation'
import { buildFallbackPayload, buildInterpretStreamPrompts } from '@/lib/tarot/promptBuild'
import { isDangerousQuestion, buildCrisisPayload } from '@/lib/tarot/safety'
import { tarotCreditCostFor } from '@/lib/tarot/tarot-spreads-data'
import { createIdempotencyStore } from '@/lib/api/idempotency'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'
import { refundCredits } from '@/lib/credits/creditRefund'
import { getUserDisplayName } from '@/lib/user/displayName'

// 단일 Claude 호출의 최대 wall-clock — Sonnet 4.5 + 7장 streaming 기준
// Haiku 보다 응답 길어 통상 15-30s. 여유 있게 60s.
const CLAUDE_TIMEOUT_MS = 60000

// 카드 수 차등 가격은 tarot-spreads-data.ts 의 tarotCreditCostFor 가 SSOT.

// 새로고침/뒤로가기/다른 탭 등으로 같은 리딩이 재진입할 때 크레딧 중복
// 차감 방지. createIdempotencyStore — src/lib/api/idempotency.ts 참조.
const idemStore = createIdempotencyStore('tarot-interpret-stream')

// 차감 후 Claude 호출이 실패해 사용자가 가치를 못 받은 경우 호출.
// 로그인 사용자는 refundCredits, 게스트는 호출자가 응답 cookie 증가를
// 스킵 (creditResult.guestReadingAccess 를 undefined 로 비워서 전달) 하면
// counter 가 원상 복귀 — 무료 횟수 한 번 날아가는 손해 안 봄.
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

    const cardCountForCost = Array.isArray(body.cards) ? body.cards.length : 1
    creditCost = tarotCreditCostFor(cardCountForCost)
    const ownerKey = context.userId || `ip:${context.ip || 'unknown'}`
    const scopedIdemKey = idemStore.keyFor(req, ownerKey)
    const idempotentReplay = scopedIdemKey ? await idemStore.isReplay(scopedIdemKey) : false

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
        await idemStore.mark(scopedIdemKey)
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

    let claudeStream: ReadableStream<string>
    try {
      // streamClaudeWithContinuation — maxTokens 도달해도 자동 이어쓰기
      // 라 카드 7장 같은 깊은 해석도 중간에 안 잘림.
      claudeStream = await streamClaudeWithContinuation({
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
        claudeErr instanceof Error ? claudeErr.message : String(claudeErr)
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
            PREMIUM_CLAUDE_MODEL,
            'success',
            Date.now() - claudeStartTime
          )
          controller.enqueue(encoder.encode(createSSEDoneEvent()))
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
