'use client'

/**
 * useTarotInterpretation Hook
 * 타로 해석 가져오기 및 저장 로직 (스트리밍 지원)
 */

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'
import { Spread, DrawnCard, DeckStyle } from '@/lib/tarot/tarot.types'
import { buildTarotSaveRequest, flattenTarotGuidance } from '@/lib/tarot/tarot-save-request'
import { saveReading, formatReadingForSave } from '@/lib/tarot/tarot-storage'
import { apiFetch, type ApiFetchOptions } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import { extractPartialOverall, extractPartialCardTexts } from '@/lib/tarot/partialJsonParse'
import type { InterpretationResult, ReadingResponse } from '../types'
import type { TarotPersonalizationOptions } from './useTarotGame'

interface UseTarotInterpretationParams {
  categoryName: string | undefined
  spreadId: string | undefined
  userTopic: string
  questionAnalysis: TarotQuestionAnalysisSnapshot | null
  selectedDeckStyle: DeckStyle
  personalizationOptions: TarotPersonalizationOptions
}

export interface FetchInterpretationOptions {
  // 스트리밍 중간 진행 상황을 받아서 UI 에 progressive 하게 반영하기 위한 콜백.
  // overall_message 가 토큰 단위로 누적될 때마다 호출된다.
  onProgress?: (snapshot: InterpretationResult) => void
  // 새로고침 시 같은 리딩이 두 번 차감되지 않도록 서버에 보낼 idempotency 키.
  // 보통 페이지 단의 readingSignature(스프레드+카드 조합 해시)를 그대로 사용.
  idempotencyKey?: string
}

interface UseTarotInterpretationReturn {
  isSaved: boolean
  saveMessage: string
  fetchInterpretation: (
    result: ReadingResponse,
    options?: FetchInterpretationOptions
  ) => Promise<InterpretationResult | null>
  handleSaveReading: (
    readingResult: ReadingResponse | null,
    spreadInfo: Spread | null,
    interpretation: InterpretationResult | null
  ) => Promise<void>
}

// Bumped 35→70s in lockstep with the server's 60s Claude timeout (after
// Haiku→Sonnet 4.5 promotion). Sonnet generating the full tarot JSON for
// 3–5 cards regularly exceeded 35s under normal load.
const STREAM_INTERPRET_TIMEOUT_MS = 70000

class RequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'RequestTimeoutError'
  }
}

async function apiFetchWithTimeout(
  url: string,
  init: ApiFetchOptions,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const externalSignal = init.signal

  const onExternalAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  timeoutId = setTimeout(() => {
    timedOut = true
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }, timeoutMs)

  try {
    return await apiFetch(url, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (timedOut) {
      throw new RequestTimeoutError(timeoutMs)
    }
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort)
    }
  }
}

/**
 * SSE 스트림에서 JSON 텍스트를 누적 수집하여 파싱
 */
async function consumeSSEStream(
  response: Response,
  onChunk?: (accumulated: string) => void
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let accumulated = ''
  let lineBuffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    lineBuffer += decoder.decode(value, { stream: true })
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() || ''

    let changed = false
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            accumulated += parsed.content
            changed = true
          }
        } catch {
          // 불완전한 청크 무시
        }
      }
    }
    if (changed && onChunk) onChunk(accumulated)
  }

  lineBuffer += decoder.decode()
  if (lineBuffer.startsWith('data: ')) {
    const data = lineBuffer.slice(6)
    if (data && data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data)
        if (parsed.content) {
          accumulated += parsed.content
          onChunk?.(accumulated)
        }
      } catch {
        // 무시 가능한 마지막 청크
      }
    }
  }

  return accumulated
}

/**
 * 스트리밍 JSON 응답을 InterpretationResult로 변환
 */
function parseStreamedInterpretation(
  jsonText: string,
  cards: DrawnCard[],
  _positions: ReadingResponse['spread']['positions'],
  isKorean: boolean
): InterpretationResult {
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found')

  // 현재 스키마는 { overall, cards: [{ position, interpretation }], advice } 만 emit.
  // 자리(position) 는 LLM 이 질문 맥락에 맞춰 직접 명명 — spread.positions 무시.
  const parsed = JSON.parse(jsonMatch[0]) as {
    overall?: string
    advice?: string
    cards?: Array<{ position?: string; interpretation?: string }>
  }
  const parsedCards = Array.isArray(parsed.cards) ? parsed.cards : []

  return {
    overall_message: parsed.overall || '',
    card_insights: cards.map((dc, i) => {
      const cardData = parsedCards[i]
      const fallbackMeaning = dc.isReversed
        ? isKorean
          ? dc.card.reversed.meaningKo || dc.card.reversed.meaning
          : dc.card.reversed.meaning
        : isKorean
          ? dc.card.upright.meaningKo || dc.card.upright.meaning
          : dc.card.upright.meaning
      return {
        position:
          (cardData?.position || '').trim() || (isKorean ? `${i + 1}번 카드` : `Card ${i + 1}`),
        card_name: dc.card.name,
        is_reversed: dc.isReversed,
        interpretation: (cardData?.interpretation || '').trim() || fallbackMeaning || '',
      }
    }),
    guidance:
      parsed.advice || (isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.'),
    affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
    fallback: false,
    interpretation_source: 'stream_sse_fallback',
  }
}

function detectFocusKeyword(question: string, isKorean: boolean): string {
  const q = question.toLowerCase()

  if (isKorean) {
    if (/(흐름|전반|전체|방향|큰 ?그림)/.test(q)) return '\uD604\uC7AC \uD750\uB984'
    if (/(연애|사랑|결혼|썸|관계)/.test(q)) return '관계'
    if (/(이직|취업|승진|커리어|직장|면접)/.test(q)) return '커리어'
    if (/(돈|재정|투자|매출|수입|지출)/.test(q)) return '재정'
    if (/(건강|몸|컨디션|휴식|스트레스)/.test(q)) return '건강'
    return '핵심 이슈'
  }

  if (/(overall|general).*(flow|direction)|big picture|current flow/.test(q)) return 'overall flow'
  if (/(love|relationship|marriage|dating)/.test(q)) return 'relationships'
  if (/(career|job|promotion|interview|work)/.test(q)) return 'career'
  if (/(money|finance|income|budget|invest)/.test(q)) return 'finance'
  if (/(health|wellness|stress|rest|energy)/.test(q)) return 'health'
  return 'current flow'
}

function buildPersonalizedFallback(
  result: ReadingResponse,
  userTopic: string,
  isKorean: boolean,
  personalizationOptions: TarotPersonalizationOptions
): InterpretationResult {
  const fallbackCardNames = result.drawnCards
    .map((dc) => (isKorean ? dc.card.nameKo || dc.card.name : dc.card.name))
    .slice(0, 3)
    .join(', ')
  const focus = detectFocusKeyword(userTopic, isKorean)
  const perspectiveHints = [
    personalizationOptions.includeSaju ? (isKorean ? '사주 관점 포함' : 'Saju lens included') : '',
    personalizationOptions.includeAstrology
      ? isKorean
        ? '점성술 관점 포함'
        : 'Astrology lens included'
      : '',
  ].filter(Boolean)

  return {
    overall_message: isKorean
      ? `질문 주제(${focus}) 기준으로 ${fallbackCardNames} 카드가 공통적으로 말하는 방향은 '속도보다 기준 정렬'입니다. 지금은 결론을 서두르기보다 핵심 조건 1개를 정해 실행 가능한 단위로 쪼개는 것이 유리합니다.`
      : `For your ${focus} question, the shared direction from ${fallbackCardNames} is to prioritize clear criteria over speed. Instead of forcing a fast answer, define one key condition and break it into executable steps.`,
    card_insights: result.drawnCards.map((dc, idx) => {
      const positionTitle = isKorean ? `${idx + 1}번 카드` : `Card ${idx + 1}`
      const cardName = isKorean ? dc.card.nameKo || dc.card.name : dc.card.name

      return {
        position: positionTitle,
        card_name: dc.card.name,
        is_reversed: dc.isReversed,
        interpretation: isKorean
          ? dc.isReversed
            ? `${positionTitle}의 ${cardName}(역방향)은 '${focus}'에서 누락된 조건을 먼저 점검하라는 신호입니다. 지금 당장 결정하기보다 체크리스트 3개를 만든 뒤 재판단하세요.`
            : `${positionTitle}의 ${cardName}는 '${focus}'에서 우선순위를 분명히 하라는 신호입니다. 오늘 바로 실행할 1단계 행동을 확정하면 흐름이 좋아집니다.`
          : dc.isReversed
            ? `${cardName} reversed at ${positionTitle} suggests reviewing missing conditions in your ${focus} before committing. Build a 3-item checklist, then decide.`
            : `${cardName} at ${positionTitle} highlights priority clarity for your ${focus}. Lock one immediate next step today to improve momentum.`,
      }
    }),
    guidance: isKorean
      ? [
          {
            title: '오늘 20분 액션',
            detail: `'${focus}' 관련 핵심 조건 1개를 정하고, 20분 내 실행 가능한 행동 1개로 전환하세요.`,
          },
          {
            title: '리스크 차단',
            detail: '결정 전에 실패 시나리오 1개와 대응책 1개를 미리 적어두세요.',
          },
          {
            title: '재확인 포인트',
            detail:
              perspectiveHints.length > 0
                ? `${perspectiveHints.join(', ')} 기준으로 48시간 내 한 번 더 리딩을 비교해보세요.`
                : '48시간 내 같은 질문으로 다시 리딩해 변화 흐름을 비교해보세요.',
          },
        ]
      : [
          {
            title: '20-minute action',
            detail: `Choose one key condition for your ${focus} and convert it into one task you can execute within 20 minutes.`,
          },
          {
            title: 'Risk guardrail',
            detail:
              'Write one failure scenario and one response plan before finalizing your decision.',
          },
          {
            title: 'Re-check point',
            detail:
              perspectiveHints.length > 0
                ? `Re-run and compare within 48 hours with ${perspectiveHints.join(', ')}.`
                : 'Re-run the same question within 48 hours and compare pattern changes.',
          },
        ],
    affirmation: isKorean
      ? '깊은 해석은 작은 실행에서 시작됩니다.'
      : 'Deep clarity starts from one concrete step.',
    fallback: true,
    interpretation_source: 'local_personalized_fallback',
  }
}

export function useTarotInterpretation({
  categoryName,
  spreadId,
  userTopic,
  questionAnalysis,
  selectedDeckStyle,
  personalizationOptions,
}: UseTarotInterpretationParams): UseTarotInterpretationReturn {
  const { data: session } = useSession()
  const { language } = useI18n()
  const [isSaved, setIsSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string>('')

  const fetchInterpretation = useCallback(
    async (
      result: ReadingResponse,
      options?: FetchInterpretationOptions
    ): Promise<InterpretationResult | null> => {
      const isKorean = (language || 'ko') === 'ko'

      const cardPayload = result.drawnCards.map((dc) => {
        const meaning = dc.isReversed ? dc.card.reversed : dc.card.upright
        // position / positionKo / positionMeaning 은 더 이상 클라이언트에서
        // 보내지 않는다 — LLM 이 사용자 질문 맥락에 맞춰 직접 명명한다.
        return {
          name: dc.card.name,
          nameKo: dc.card.nameKo,
          isReversed: dc.isReversed,
          // Payload slimming for high-card spreads to reduce timeout pressure.
          keywords: (meaning.keywords || []).slice(0, 8),
          keywordsKo: (meaning.keywordsKo || []).slice(0, 8),
        }
      })

      // questionMeta / questionContext 메타라벨은 system prompt 의 0단계 가 동일 정보를
      // LLM 이 직접 추출하므로 중복. 보내지 않는다 (50-100 tokens / call 절감).
      const requestBody = {
        categoryId: categoryName,
        spreadId,
        spreadTitle: result.spread.title,
        cards: cardPayload,
        userQuestion: userTopic,
        language: language || 'ko',
      }

      // 1) 스트리밍 엔드포인트 우선 — 깨끗한 LLM 출력 (post-processor 템플릿 없음)
      const interpretHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (options?.idempotencyKey) {
        interpretHeaders['x-idempotency-key'] = options.idempotencyKey
      }

      try {
        const response = await apiFetchWithTimeout(
          '/api/tarot/interpret-stream',
          {
            method: 'POST',
            headers: interpretHeaders,
            body: JSON.stringify(requestBody),
          },
          STREAM_INTERPRET_TIMEOUT_MS
        )

        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''

          if (contentType.includes('text/event-stream') && response.body) {
            // SSE 스트림 처리 — 청크마다 overall 부분만 progressive 하게 UI 에 흘려보냄.
            const baseSnapshot: InterpretationResult = {
              overall_message: '',
              card_insights: result.drawnCards.map((dc, i) => ({
                position: isKorean ? `${i + 1}번 카드` : `Card ${i + 1}`,
                card_name: dc.card.name,
                is_reversed: dc.isReversed,
                interpretation: '',
              })),
              guidance: '',
              affirmation: '',
              fallback: true,
              interpretation_source: 'stream_sse_fallback',
            }
            const jsonText = await consumeSSEStream(response, (accumulated) => {
              if (!options?.onProgress) return
              const partialOverall = extractPartialOverall(accumulated) || ''
              const partialCards = extractPartialCardTexts(accumulated)
              // 카드별 해석을 baseSnapshot.card_insights 위에 덮어쓴다 — 아직 안 온 카드는 빈 문자열 유지.
              const updatedInsights = baseSnapshot.card_insights.map((ci, i) => {
                const text = partialCards[i]
                if (!text) return ci
                return { ...ci, interpretation: text }
              })
              if (partialOverall.length > 0 || partialCards.length > 0) {
                options.onProgress({
                  ...baseSnapshot,
                  overall_message: partialOverall,
                  card_insights: updatedInsights,
                })
              }
            })
            return parseStreamedInterpretation(
              jsonText,
              result.drawnCards,
              result.spread.positions,
              isKorean
            )
          }

          // JSON 응답 (스트림이 죽고 non-stream JSON 으로 내려온 경우)
          const data = await response.json()
          if (data.overall || data.overall_message) {
            const sourceInsights = Array.isArray(data.card_insights)
              ? (data.card_insights as Record<string, unknown>[])
              : Array.isArray(data.cards)
                ? (data.cards as Record<string, unknown>[])
                : []

            const normalizedInsights = result.drawnCards.map((drawnCard, i) => {
              const ci = sourceInsights[i] || {}
              const fallbackInterpretation = drawnCard.isReversed
                ? language === 'ko'
                  ? drawnCard.card.reversed.meaningKo || drawnCard.card.reversed.meaning
                  : drawnCard.card.reversed.meaning
                : language === 'ko'
                  ? drawnCard.card.upright.meaningKo || drawnCard.card.upright.meaning
                  : drawnCard.card.upright.meaning

              return {
                position:
                  (ci.position as string) ||
                  (language === 'ko' ? `${i + 1}번 카드` : `Card ${i + 1}`),
                card_name: drawnCard.card.name,
                is_reversed: drawnCard.isReversed,
                interpretation:
                  ((ci.interpretation as string) || '').trim() ||
                  fallbackInterpretation ||
                  (language === 'ko'
                    ? '카드 메시지를 읽고 현재 상황과 연결해보세요.'
                    : 'Connect this card message to your current situation.'),
              }
            })

            return {
              overall_message: data.overall_message || data.overall || '',
              card_insights: normalizedInsights,
              guidance:
                data.guidance ||
                data.advice ||
                (isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.'),
              affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
              fallback: false,
              interpretation_source: 'stream_json_fallback',
            }
          }
        }

        throw new Error('Stream interpretation failed')
      } catch (streamError) {
        tarotLogger.error(
          'Streaming interpretation failed, falling back to local copy',
          streamError instanceof Error ? streamError : undefined
        )
      }

      // 2) Final fallback with personalized renderable copy. The legacy
      // non-stream `/api/tarot/interpret` route was a second LLM round-trip
      // through Claude — same model, different transport. The interpret-
      // stream path above already retries once internally; if both fail we
      // fall straight to the deterministic local copy below.
      return buildPersonalizedFallback(result, userTopic, isKorean, personalizationOptions)
    },
    [categoryName, spreadId, language, userTopic, personalizationOptions]
  )

  const handleSaveReading = useCallback(
    async (
      _readingResult: ReadingResponse | null,
      _spreadInfo: Spread | null,
      interpretation: InterpretationResult | null
    ) => {
      if (!_readingResult || !_spreadInfo || isSaved) {
        return
      }

      const readingResult = _readingResult
      const spreadInfo = _spreadInfo

      try {
        const resolvedSpreadId = spreadId || spreadInfo.id

        if (!resolvedSpreadId) {
          throw new Error('Missing spreadId for tarot save request')
        }

        const guidanceText = flattenTarotGuidance(interpretation?.guidance)
        const saveInterpretation = interpretation
          ? {
              overall_message: interpretation.overall_message,
              guidance: guidanceText,
              card_insights: interpretation.card_insights,
            }
          : null

        if (session?.user) {
          const savePayload = buildTarotSaveRequest({
            question: userTopic,
            spreadInfo,
            readingResult,
            interpretation,
            categoryName: categoryName || undefined,
            spreadId: resolvedSpreadId,
            selectedDeckStyle,
            language: language || 'ko',
            questionAnalysis,
          })

          const preferredSaveResponse = await apiFetch('/api/tarot/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savePayload),
          })

          if (!preferredSaveResponse.ok) {
            const errorPayload = (await preferredSaveResponse.json().catch(() => null)) as {
              error?: { message?: string }
              message?: string
            } | null
            const errorMessage =
              errorPayload?.error?.message ||
              errorPayload?.message ||
              `Save failed (${preferredSaveResponse.status})`
            throw new Error(errorMessage)
          }

          setIsSaved(true)
          setSaveMessage(language === 'ko' ? '저장되었습니다!' : 'Saved!')
          setTimeout(() => setSaveMessage(''), 3000)
          return
        } else {
          const formattedReading = formatReadingForSave(
            userTopic,
            spreadInfo,
            readingResult.drawnCards,
            saveInterpretation,
            categoryName || '',
            resolvedSpreadId,
            selectedDeckStyle,
            questionAnalysis
          )
          saveReading(formattedReading)
        }

        setIsSaved(true)
        setSaveMessage(language === 'ko' ? '저장되었습니다!' : 'Saved!')
        setTimeout(() => setSaveMessage(''), 3000)
      } catch (error) {
        tarotLogger.error('Failed to save reading', error instanceof Error ? error : undefined)
        setSaveMessage(language === 'ko' ? '저장 실패' : 'Save failed')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    },
    [
      categoryName,
      spreadId,
      selectedDeckStyle,
      language,
      isSaved,
      session,
      userTopic,
      questionAnalysis,
    ]
  )

  return {
    isSaved,
    saveMessage,
    fetchInterpretation,
    handleSaveReading,
  }
}
