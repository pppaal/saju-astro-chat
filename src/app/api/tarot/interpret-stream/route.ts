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
    creditResult = await checkAndConsumeCredits('reading', creditCost, req)
    if (!creditResult.allowed) return creditErrorResponse(creditResult)

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

    const { systemPrompt, userPrompt } = buildInterpretStreamPrompts({
      language,
      spreadTitle,
      cards: rawCards,
      userQuestion,
    })

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

    // 카드당 ~650 tokens + overall/advice 여유 1500. Haiku 4.5 default
    // max output 8192 안에서 동작하도록 8000 cap.
    // 현재 모든 스프레드 ≤7장이라 ~6050 tokens 로 여유 충분.
    const maxTokens = Math.min(8000, 1500 + rawCards.length * 650)
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
      recordExternalCall(
        'anthropic',
        DEFAULT_CLAUDE_MODEL,
        'error',
        Date.now() - claudeStartTime
      )
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
        let receivedAny = false
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) {
              receivedAny = true
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
          })
          // 토큰이 한 번도 안 도착했다면 사용자가 받은 가치 0 → 전액 환불 +
          // 정적 fallback 을 단일 청크로 emit 해 클라가 깔끔히 렌더.
          if (!receivedAny) {
            await refundOnFailure(
              creditResult,
              'tarot_claude_stream_no_content',
              creditCost,
              streamErr instanceof Error ? streamErr.message : String(streamErr)
            )
            const fallback = buildFallbackPayload(rawCards, language)
            controller.enqueue(
              encoder.encode(createSSEEvent({ content: JSON.stringify(fallback) }))
            )
          } else {
            // 부분 텍스트가 이미 클라이언트에 전달됨 — error 이벤트로 끊김 알림.
            // 클라이언트는 누적 텍스트로 partial JSON 복구 시도.
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
