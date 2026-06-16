// src/lib/tarot/interpretStreamResponse.ts
// Tarot interpret-stream SSE response assembly + credit-refund helpers,
// extracted from the route handler so the route stays a thin orchestrator
// (middleware → validate → safety → credits → build prompts → stream).
//
// Pure-ish: no `req`/`context` access. Every IO concern (credit consume,
// nonce, caller-name lookup, prompt building) stays in the route and the
// resolved values are passed in. This module owns only the token-forwarding
// SSE stream, its delivery verification (isUsableReading), and the refund
// wiring that the stream + route share.

import { NextResponse } from 'next/server'
import { createSSEEvent, createSSEDoneEvent } from '@/lib/streaming'
import { logger } from '@/lib/logger'
import { recordExternalCall } from '@/lib/metrics/index'
import { PREMIUM_CLAUDE_MODEL } from '@/lib/llm/claude'
import { buildFallbackPayload, type PromptCardInput } from '@/lib/tarot/promptBuild'
import { refundCreditsOnce } from '@/lib/credits/refundOnce'
import type { checkAndConsumeCredits } from '@/lib/credits/withCredits'
import { cacheSet } from '@/lib/cache/redis-cache'

type CreditResult = Awaited<ReturnType<typeof checkAndConsumeCredits>>

// 끊긴 턴의 완성 리딩(raw JSON 문자열)을 잠깐 보관하는 캐시 키 — result
// 엔드포인트가 같은 키로 읽음. userId 를 키에 포함해 ownership 검증 (다른
// 사용자가 turnId 알아도 조회 불가). 게스트는 복구 미지원 (turnId 보관 안 함).
// counselor/realtime 의 counselorTurnResultKey 패턴과 동일.
export const tarotTurnResultKey = (userId: string, turnId: string) =>
  `tarot:turn-result:${userId}:${turnId}`

// 돌아와서 받아갈 시간을 충분히 (30분) — 크레딧 충전하러 갔다 오는 왕복도
// 커버. 받아가면 그만이고 TTL 로 자동 소멸.
const TURN_RESULT_TTL_SEC = 1800

// 차감 후 Claude 호출이 실패해 사용자가 가치를 못 받은 경우 호출 — refundCredits.
export async function refundOnFailure(
  creditResult: CreditResult | null,
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

export function streamJsonPayload(
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

export interface TarotInterpretStreamResponseInput {
  /** Live Claude token stream (already started by the route). */
  claudeStream: ReadableStream<string>
  /** Consumed-credit handle (null when a replay refunded it → no charge). */
  creditResult: CreditResult | null
  /** Credits charged this turn (card-count tiered). */
  creditCost: number
  /** Per-turn idempotent refund key shared with the route's pre-stream paths. */
  refundKey: string | null
  /** Authoritative cards (server-stored or sanitized client cards). */
  rawCards: PromptCardInput[]
  language: 'ko' | 'en'
  /** Login user + turnId present → keep generating on disconnect + cache. */
  isRecoverable: boolean
  recoverableUserId: string
  turnId: string
  /** When the Claude call started (for external-call latency metrics). */
  claudeStartTime: number
}

/**
 * Forward the Claude token stream to the client as SSE, verifying delivery
 * (isUsableReading), refunding the credit on empty/partial/unusable readings,
 * and persisting the completed reading for disconnect recovery. Returns the
 * streaming NextResponse.
 */
export function buildTarotInterpretStreamResponse(
  input: TarotInterpretStreamResponseInput
): NextResponse {
  const {
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
  } = input

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
        recordExternalCall('anthropic', PREMIUM_CLAUDE_MODEL, 'error', Date.now() - claudeStartTime)
        logger.error('[tarot-stream] Claude stream interrupted', {
          error: streamErr instanceof Error ? streamErr.message : String(streamErr),
          receivedAny,
          bytesEmitted,
        })
        // 환불 판단을 raw byte 임계치(임의의 600 — JSON scaffold 바이트라
        // 실제 읽을 거리와 무관)가 아니라 success 경로와 *동일한*
        // isUsableReading 으로 한다: "사용자가 실제로 쓸 수 있는 리딩이
        // 전달됐는가". 끊긴 partial JSON 은 보통 파싱 불가 → 미사용 → 환불.
        // 이로써 옛 코드의 "유용한 부분 리딩을 받고도 환불받는(공짜)" 창이
        // 닫힌다 — 쓸 수 있으면 과금 유지, 못 쓰면 환불(그 partial 은 어차피
        // 클라가 렌더 못 함).
        const deliveredUsable = receivedAny && isUsableReading(fullText, rawCards.length)
        if (!deliveredUsable) {
          await refundOnFailure(
            creditResult,
            receivedAny ? 'tarot_claude_stream_partial' : 'tarot_claude_stream_no_content',
            creditCost,
            `${streamErr instanceof Error ? streamErr.message : String(streamErr)} (bytes=${bytesEmitted}, len=${fullText.length})`,
            refundKey
          )
          if (!receivedAny) {
            const fallback = buildFallbackPayload(rawCards, language)
            controller.enqueue(
              encoder.encode(createSSEEvent({ content: JSON.stringify(fallback) }))
            )
          } else {
            // 부분이지만 쓸 수 없어 환불 — error 이벤트로 알리고 클라가
            // 사용자에겐 "이번 리딩은 환불됐어요" UX 표시.
            try {
              controller.enqueue(
                encoder.encode(createSSEEvent({ error: 'Stream interrupted (refunded)' }))
              )
            } catch {
              /* may already be closed */
            }
          }
        } else {
          // 쓸 수 있는 리딩이 실제로 전달됨 — 끊김만 알리고(클라가 누적
          // 텍스트로 복원) 과금 유지.
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

  return new NextResponse(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Provider': 'claude',
      'X-Tarot-Strategy': 'streaming',
    },
  })
}
