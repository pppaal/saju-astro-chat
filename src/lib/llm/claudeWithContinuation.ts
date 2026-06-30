/**
 * Claude streaming + auto-continuation wrapper.
 *
 * Anthropic API 는 `max_tokens` 도달 시 stop_reason='max_tokens' 로 응답 종료.
 * 그대로 두면 답이 문장 중간에 잘림 — 사용자한테 "왜 끊기냐" 피드백.
 *
 * 이 wrapper:
 *   1. callClaudeStream 호출 → 토큰 stream 시작
 *   2. stream 끝났을 때 stop_reason === 'max_tokens' 면
 *   3. 누적 텍스트를 prefillAssistant 로 넘기고 같은 옵션으로 다시 호출
 *      → LLM 이 partial 이어서 작성 (Anthropic prefill 패턴, preamble 없음)
 *   4. 새 토큰들을 같은 stream 에 enqueue → 사용자한테는 *하나의 답변* 으로 보임
 *   5. 또 잘리면 반복 (maxContinuations 까지)
 *
 * 안전장치:
 *   - maxContinuations: 무한 루프 방지 (기본 2 회)
 *   - maxTotalOutputChars: 누적 텍스트 absolute cap (기본 24,000자 ≈ 12k tokens)
 *   - 한 회차라도 throw 발생 시 partial 까지 보내고 종료 (현재 동작 보장)
 *   - 콜백 error 는 swallow (stream 안 깨지게)
 *
 * 사용:
 *   const stream = await streamClaudeWithContinuation({ ...옵션 })
 *   // ReadableStream<string> — callClaudeStream 과 동일 interface.
 */

import { callClaudeStream, type CallClaudeOptions } from '@/lib/llm/claude'
import { logger } from '@/lib/logger'
import { resolveLlmPolicy } from '@/lib/config/llm-policy'

export interface ContinuationOptions extends CallClaudeOptions {
  /** 최대 자동 이어쓰기 횟수 (기본 2 — 즉 총 최대 3 회차). */
  maxContinuations?: number
  /** 누적 출력 절대 cap (chars). 비용 폭주 방지. 기본 24000 (~12k tokens). */
  maxTotalOutputChars?: number
  /**
   * 최종 출력이 *잘린 채* 종료됐을 때(이어쓰기 소진으로 stop_reason 이 여전히
   * max_tokens, 또는 maxTotalOutputChars cap 도달, 또는 이어쓰기 중 에러/abort)
   * 스트림 close 직전에 정확히 한 번 호출. 자연 종료(end_turn/stop_sequence)면
   * 호출되지 않는다. 소비자(claudeSSE)가 이 신호로 "완성본인 척 영속·과금"되는
   * 잘린 답을 미완으로 표시하는 데 쓴다. 던진 예외는 swallow(스트림 보호).
   */
  onTruncated?: () => void
}

export async function streamClaudeWithContinuation(
  opts: ContinuationOptions
): Promise<ReadableStream<string>> {
  const {
    maxContinuations: explicitMaxContinuations,
    maxTotalOutputChars: explicitMaxTotalOutputChars,
    label = 'claude-stream',
    abortSignal,
    onTruncated,
    ...baseOpts
  } = opts

  // 이어쓰기 횟수·누적 cap 도 비용 정책(SSOT)이 기본값을 정한다. 명시값이 있으면
  // 우선(호환), 없으면 feature 의 정책. feature 미지정이면 기본 정책(2회/24000자).
  const policy = resolveLlmPolicy(baseOpts.feature)
  const maxContinuations = explicitMaxContinuations ?? policy.maxContinuations
  const maxTotalOutputChars = explicitMaxTotalOutputChars ?? policy.maxTotalOutputChars

  return new ReadableStream<string>({
    async start(controller) {
      let accumulated = ''
      let attempt = 0
      let lastStopReason: string | null = null
      // 자연 종료(end_turn/stop_sequence)로 끝났는가. false 로 끝나면 잘린 것.
      let naturalEnd = false
      let truncationNotified = false
      const notifyTruncated = () => {
        if (truncationNotified) return
        truncationNotified = true
        try {
          onTruncated?.()
        } catch {
          /* 콜백 에러가 스트림을 깨지 않게 */
        }
      }

      while (attempt <= maxContinuations) {
        // Client already gave up — don't start the next round; we'd just be
        // burning Anthropic output tokens for nobody. Same check repeats at
        // every loop entry because abort can land between rounds too.
        if (abortSignal?.aborted) {
          logger.info(`[${label}] aborted by caller — stopping continuation loop`, {
            attempts: attempt,
            accumulatedChars: accumulated.length,
          })
          break
        }
        let stopReason: string | null = null

        // 1차: 원래 옵션 그대로. 2차+: prefillAssistant = 지금까지 누적 텍스트.
        // ★ Anthropic API 제약: prefill assistant content 는 trailing
        //   whitespace 금지 (위반 시 "Assistant content cannot end with
        //   trailing whitespace" 에러). max_tokens 잘림이 token 경계에서
        //   일어나면 마지막 chunk 가 \n / space 로 끝나는 케이스 빈번 →
        //   반드시 trim. trim 후 빈 string 이면 prefill 의미 없음 → undefined.
        let prefill: string | undefined
        if (attempt > 0) {
          const trimmed = accumulated.replace(/\s+$/, '')
          prefill = trimmed.length > 0 ? trimmed : undefined
        }
        const callOpts: CallClaudeOptions = {
          ...baseOpts,
          label: attempt === 0 ? label : `${label}:cont${attempt}`,
          prefillAssistant: prefill,
          abortSignal,
          onStreamComplete: (info) => {
            stopReason = info.stopReason
          },
        }

        let inner: ReadableStream<string>
        try {
          inner = await callClaudeStream(callOpts)
        } catch (err) {
          // 호출 자체 실패 — 1차면 그대로 throw, 2차+면 partial 까지 살림.
          if (attempt === 0) {
            controller.error(err)
            return
          }
          logger.warn(`[${label}] continuation ${attempt} 호출 실패, partial 까지 종료`, {
            err: err instanceof Error ? err.message : String(err),
            accumulatedChars: accumulated.length,
          })
          break
        }

        const reader = inner.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            accumulated += value
            controller.enqueue(value)
            // absolute cap 도달 — 무조건 종료.
            if (accumulated.length >= maxTotalOutputChars) {
              logger.warn(`[${label}] maxTotalOutputChars 도달 ${maxTotalOutputChars}자 — 종료`)
              // await 해야 업스트림 Anthropic fetch 취소가 close 전에 전파된다
              // (미-await 면 함수가 먼저 반환돼 abort 가 한 박자 늦었다).
              await reader.cancel().catch(() => {})
              // cap 도달 = 잘린 종료. 소비자가 미완으로 표시하도록 신호.
              notifyTruncated()
              controller.close()
              return
            }
          }
        } catch (err) {
          // 스트림 중 에러 — partial 까지 살리고 종료.
          if (attempt === 0 && accumulated.length === 0) {
            controller.error(err)
            return
          }
          logger.warn(`[${label}] continuation stream err — partial 종료`, {
            err: err instanceof Error ? err.message : String(err),
          })
          break
        }

        lastStopReason = stopReason

        // 이어쓰기 결정: max_tokens 일 때만, 그리고 절대 cap 미만일 때.
        if (
          stopReason === 'max_tokens' &&
          attempt < maxContinuations &&
          accumulated.length < maxTotalOutputChars
        ) {
          attempt++
          logger.info(`[${label}] max_tokens hit — continuation ${attempt} 시작`, {
            accumulatedChars: accumulated.length,
          })
          continue
        }
        // 여기 도달 = 이어쓰기 안 함. stop_reason 이 max_tokens 가 아니면 자연
        // 종료(end_turn/stop_sequence), max_tokens 면 이어쓰기 소진으로 잘린 종료.
        naturalEnd = stopReason !== 'max_tokens'
        break
      }

      // 자연 종료가 아니면(이어쓰기 소진/cap/이어쓰기 에러/abort) 잘린 것 → 신호.
      if (!naturalEnd) notifyTruncated()

      logger.info(`[${label}] 종료`, {
        attempts: attempt + 1,
        totalChars: accumulated.length,
        finalStopReason: lastStopReason,
        truncated: !naturalEnd,
      })
      controller.close()
    },
  })
}
