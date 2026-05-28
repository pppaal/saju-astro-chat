/**
 * useInlineTarotAPI - API calls for InlineTarotModal
 *
 * Handles all API interactions: draw cards, interpret, save.
 * AI 자동 추천(question-engine-v2)은 제거 — 사용자가 직접 스프레드 선택.
 */

import { useCallback, useEffect, useRef } from 'react'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import type { DrawnCard, CardInsight } from '@/lib/tarot/tarot.types'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/api'
import { useCreditModal } from '@/contexts/CreditModalContext'
import { extractPartialOverall, extractPartialCardTexts } from '@/lib/tarot/partialJsonParse'
import type { UseInlineTarotStateReturn } from './useInlineTarotState'

type LangKey = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'ru'

// Bumped 35→70s in lockstep with the server's 60s Claude timeout (after
// Haiku→Sonnet 4.5 promotion). 35s was firing before Sonnet could finish for
// 3–5 card spreads, looping the user on "예상보다 오래 걸리고 있어요".
const INTERPRET_TIMEOUT_MS = 70000

interface Profile {
  name?: string
  birthDate?: string
  birthTime?: string
  city?: string
  gender?: string
}

interface UseInlineTarotAPIOptions {
  stateManager: UseInlineTarotStateReturn
  lang: LangKey
  profile: Profile
}

export function useInlineTarotAPI({ stateManager, lang }: UseInlineTarotAPIOptions) {
  const { state, actions } = stateManager
  const { showDepleted } = useCreditModal()
  const {
    selectedSpread,
    selectedCategory,
    concern,
    drawnCards,
    overallMessage,
    cardInsights,
    guidance,
    affirmation,
    isSaving,
    isSaved,
  } = state
  const abortControllerRef = useRef<AbortController | null>(null)
  // 한 번 저장 시도해서 실패하면 자동 저장 useEffect 가 같은 리딩에 대해
  // 무한 재시도하던 회귀(콘솔에 [InlineTarot] save error 가 수십 줄씩 쌓이던 케이스)
  // 차단용 — 서버가 500 을 반환해도 사용자가 '다시 뽑기' 로 카드를 새로 뽑기 전까진
  // 같은 리딩으로 자동 재시도하지 않는다. 새 draw 가 시작될 때 drawCards 안에서
  // 다시 false 로 초기화한다.
  const saveAttemptedRef = useRef(false)
  const defaultOverallMessage =
    lang === 'ko'
      ? '카드가 보여준 흐름을 기준으로 현재 상황의 핵심을 정리했습니다.'
      : 'I summarized the core of your current situation based on the cards.'
  const defaultGuidance =
    lang === 'ko'
      ? '오늘은 큰 결론보다, 바로 실행 가능한 한 가지 행동부터 시작해 보세요.'
      : 'Today, start with one practical action rather than forcing a big conclusion.'

  // Fetch streaming interpretation
  const fetchInterpretation = useCallback(
    async (cards: DrawnCard[]) => {
      if (!selectedSpread) {
        return
      }

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller
      let timedOut = false
      const timeoutId = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, INTERPRET_TIMEOUT_MS)
      actions.setInterpretFailed(false)

      // Static per-card meaning — shown when the AI text is missing so cards are
      // never blank (also the failure fallback below).
      const staticCardMeaning = (dc: DrawnCard): string => {
        const m = dc.isReversed ? dc.card.reversed : dc.card.upright
        return (lang === 'ko' ? m.meaningKo || m.meaning : m.meaning) || ''
      }

      // Mirror the *exact* request the main tarot reading makes (that one works;
      // the inline one was hanging). Minimal payload + apiFetch (adds the public
      // token conditionally + credentials:'include') — no extra fields the route
      // ignores, no always-empty x-api-token header.
      const payload = {
        categoryId: selectedCategory,
        spreadId: selectedSpread.id,
        spreadTitle: selectedSpread.title,
        cards: cards.map((dc) => {
          const meaning = dc.isReversed ? dc.card.reversed : dc.card.upright
          return {
            name: dc.card.name,
            nameKo: dc.card.nameKo,
            isReversed: dc.isReversed,
            keywords: (meaning.keywords || []).slice(0, 8),
            keywordsKo: (meaning.keywordsKo || []).slice(0, 8),
          }
        }),
        userQuestion: concern,
        language: lang,
      }

      try {
        const res = await apiFetch('/api/tarot/interpret-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        if (!res.ok) {
          // Credit exhaustion → global modal (consistent with draw + main tarot)
          // instead of a silent generic failure. Status is kept in the error so
          // it shows up in logs for diagnosis.
          if (res.status === 402) {
            showDepleted()
          }
          throw new Error(`Interpretation failed (${res.status})`)
        }

        // SSE: 토큰 delta 가 도착할 때마다 progressive 로 부분 JSON 을
        // 파싱해 overallMessage / cardInsights 를 갱신한다 (메인 타로 페이지의
        // useTarotInterpretation 과 동일한 패턴). 이러면 사용자는 모달이
        // 멈춘 게 아니라 텍스트가 흐르는 걸 본다 — '예상보다 오래 걸리고
        // 있어요' 안 띄움.
        const reader = res.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }
        const decoder = new TextDecoder()
        let accumulated = ''
        let buf = ''
        let lastOverallEmit = ''
        let lastCardCount = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''
          let changed = false
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const ev = JSON.parse(data) as { content?: string }
              if (ev.content) {
                accumulated += ev.content
                changed = true
              }
            } catch {
              // ignore partial chunks
            }
          }
          if (changed) {
            // overall 부분 streaming → UI 즉시 갱신.
            const partialOverall = extractPartialOverall(accumulated)
            if (partialOverall && partialOverall !== lastOverallEmit) {
              lastOverallEmit = partialOverall
              actions.setOverallMessage(partialOverall)
            }
            // 카드별 해석도 progressive — 새 카드 도착마다 insights 갱신.
            const partialCards = extractPartialCardTexts(accumulated)
            if (partialCards.length !== lastCardCount) {
              lastCardCount = partialCards.length
              const progressiveInsights: CardInsight[] = cards.map((dc, idx) => ({
                position:
                  (lang === 'ko'
                    ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
                    : selectedSpread.positions[idx]?.title) || `${idx + 1}`,
                card_name: lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
                is_reversed: dc.isReversed,
                interpretation: partialCards[idx] || staticCardMeaning(dc),
              }))
              actions.setCardInsights(progressiveInsights)
            }
          }
        }

        let parsed: Record<string, unknown> | null = null
        try {
          const match = accumulated.match(/\{[\s\S]*\}/)
          if (match) parsed = JSON.parse(match[0]) as Record<string, unknown>
        } catch {
          parsed = null
        }

        const overallRaw = parsed && typeof parsed.overall === 'string' ? parsed.overall : ''
        const adviceRaw = parsed && typeof parsed.advice === 'string' ? parsed.advice : ''
        const streamedCards = Array.isArray(parsed?.cards)
          ? (parsed.cards as Array<{ position?: string; interpretation?: string }>)
          : []

        const nextOverall = overallRaw.trim() || defaultOverallMessage
        const nextGuidance = adviceRaw.trim() || defaultGuidance
        // interpret-stream emits `{ position, interpretation }`. Pair each
        // streamed entry with the drawn card we already have to fill the
        // card_name / is_reversed columns the consumer expects.
        const nextInsights: CardInsight[] = cards.map((dc, idx) => {
          const streamed = streamedCards[idx] || {}
          return {
            position:
              streamed.position ||
              (lang === 'ko'
                ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
                : selectedSpread.positions[idx]?.title) ||
              `${idx + 1}`,
            card_name: lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
            is_reversed: dc.isReversed,
            interpretation: streamed.interpretation || staticCardMeaning(dc),
          }
        })

        actions.setOverallMessage(nextOverall)
        actions.setCardInsights(nextInsights)
        actions.setGuidance(nextGuidance)
        // interpret-stream doesn't emit a dedicated `affirmation`. Leave
        // whatever the previous reading left in state untouched.

        actions.setStep('result')
      } catch (err) {
        // A fresh fetchInterpretation aborted this one — let the newer call own
        // the state instead of flashing a failure.
        const isSupersede = err instanceof Error && err.name === 'AbortError' && !timedOut
        if (isSupersede) {
          return
        }
        if (err instanceof Error && err.name !== 'AbortError') {
          logger.error('[InlineTarot] interpret error:', err)
        }
        // Visible, recoverable failure: fill each card with its static meaning
        // so nothing is blank, and flag interpretFailed so the result view shows
        // a retry button (covers timeout / credit-exhaustion / network).
        actions.setOverallMessage(overallMessage.trim() || defaultOverallMessage)
        actions.setGuidance(guidance.trim() || defaultGuidance)
        actions.setCardInsights(
          cards.map((dc, idx) => ({
            position:
              (lang === 'ko'
                ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
                : selectedSpread.positions[idx]?.title) || `${idx + 1}`,
            card_name: lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
            is_reversed: dc.isReversed,
            interpretation: staticCardMeaning(dc),
          }))
        )
        actions.setInterpretFailed(true)
        actions.setStep('result')
      } finally {
        clearTimeout(timeoutId)
      }
    },
    [
      selectedSpread,
      selectedCategory,
      concern,
      lang,
      actions,
      overallMessage,
      guidance,
      defaultOverallMessage,
      defaultGuidance,
      showDepleted,
    ]
  )

  // Draw cards from API
  const drawCards = useCallback(async () => {
    if (!selectedSpread) {
      return
    }

    actions.setIsDrawing(true)
    // 새 카드를 뽑으면 직전 리딩에 대한 저장 시도 플래그를 해제 — 새 리딩은
    // 자동 저장이 다시 한 번 시도해야 한다.
    saveAttemptedRef.current = false
    try {
      // /api/tarot 는 categoryId 로 테마를 찾고(못 찾으면 에러) 그 안에서
      // spreadId 를 찾는다. selectedCategory 가 스프레드의 실제 테마와
      // 어긋나면 draw 가 실패하므로, 선택된 스프레드를 실제로 담고 있는
      // 테마에서 categoryId 를 도출해 보낸다.
      const owningTheme = tarotThemes.find((t) => t.spreads.some((s) => s.id === selectedSpread.id))
      const categoryId = owningTheme?.id || selectedCategory

      const res = await fetch('/api/tarot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
        },
        body: JSON.stringify({
          categoryId,
          spreadId: selectedSpread.id,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        logger.error('[InlineTarot] API error:', { status: res.status, errorData })
        // 크레딧 소진(402) → 조용한 실패 대신 전역 크레딧 안내 모달.
        if (res.status === 402) {
          showDepleted()
        }
        throw new Error(`Failed to draw cards: ${res.status}`)
      }

      const data = await res.json()
      actions.setDrawnCards(data.drawnCards)

      // Reveal the whole spread at once. The old one-by-one flip (500ms each)
      // made the screen "keep changing" before the result settled.
      actions.setRevealedCount(data.drawnCards.length)

      // Start interpretation
      actions.setStep('interpreting')
      await fetchInterpretation(data.drawnCards)
    } catch (err) {
      logger.error('[InlineTarot] draw error:', err)
      // 카드 뽑기 실패 시 화면이 '뽑는 중'에서 그대로 멈추지 않도록 스프레드
      // 선택 단계로 되돌려 사용자가 다시 시도할 수 있게 한다.
      actions.setStep('spread-select')
    } finally {
      actions.setIsDrawing(false)
    }
  }, [selectedSpread, selectedCategory, actions, fetchInterpretation, showDepleted])

  // Save tarot reading to database
  const saveReading = useCallback(async () => {
    if (isSaving || isSaved || !selectedSpread) {
      return
    }
    if (saveAttemptedRef.current) {
      return
    }
    saveAttemptedRef.current = true

    actions.setIsSaving(true)
    try {
      const res = await fetch('/api/tarot/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: concern,
          theme: selectedCategory,
          spreadId: selectedSpread.id,
          spreadTitle:
            lang === 'ko' ? selectedSpread.titleKo || selectedSpread.title : selectedSpread.title,
          cards: drawnCards.map((dc, idx) => ({
            cardId: String(dc.card.id),
            name: lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
            image: dc.card.image,
            isReversed: dc.isReversed,
            // 저장 스키마는 position 을 필수(min 1)로 요구한다. 스프레드 데이터
            // 개편 이후 selectedSpread.positions 는 비어 있어 undefined 가 되므로,
            // 실제 화면에 쓰인 LLM 명명 position(cardInsights)을 우선 사용하고
            // 마지막엔 순번으로 폴백해 검증 실패(=저장 안 됨)를 막는다.
            position:
              cardInsights[idx]?.position ||
              (lang === 'ko'
                ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
                : selectedSpread.positions[idx]?.title) ||
              `${idx + 1}`,
          })),
          overallMessage,
          cardInsights,
          guidance,
          affirmation,
          source: 'counselor',
          locale: lang,
        }),
      })

      if (res.ok) {
        // 서버가 부여한 readingId 회수 — followup 채팅 / 클래리파이어 카드
        // PATCH 에서 사용. 응답 wrap 형태(`{data:{readingId}}` vs `{readingId}`)
        // 둘 다 흡수해서 메인 페이지(useTarotInterpretation) 와 같은 동선.
        const savedJson = (await res.json().catch(() => null)) as {
          readingId?: string
          data?: { readingId?: string }
        } | null
        const newReadingId = savedJson?.readingId ?? savedJson?.data?.readingId ?? null
        if (newReadingId) actions.setReadingId(newReadingId)
        actions.setIsSaved(true)
      } else {
        const err = await res.json().catch(() => ({}))
        logger.error('[InlineTarot] save error:', err)
      }
    } catch (err) {
      logger.error('[InlineTarot] save error:', err)
    } finally {
      actions.setIsSaving(false)
    }
  }, [
    selectedSpread,
    drawnCards,
    overallMessage,
    cardInsights,
    guidance,
    affirmation,
    isSaving,
    isSaved,
    concern,
    selectedCategory,
    lang,
    actions,
  ])

  // Retry the AI interpretation for the cards already on screen (used by the
  // result view's "다시 시도" button after a failed interpret).
  const retryInterpretation = useCallback(() => {
    if (drawnCards.length === 0) {
      return
    }
    actions.setStep('interpreting')
    void fetchInterpretation(drawnCards)
  }, [drawnCards, actions, fetchInterpretation])

  // 자동 저장 — interpretation 이 정상 결과로 끝나면 (interpretFailed=false)
  // 사용자가 "저장" 버튼 클릭 없이 자동으로 saveReading 한 번 호출. 단독
  // 타로 페이지(useTarotInterpretation) 와 동일 결. saveReading 자체가
  // isSaved/isSaving 가드를 갖고 있어 중복 호출 안전. session 체크는
  // 서버 측에서 (게스트는 401 → 조용히 무시).
  useEffect(() => {
    if (state.step !== 'result') return
    if (state.interpretFailed) return
    if (state.isSaved || state.isSaving) return
    if (drawnCards.length === 0) return
    if (!overallMessage?.trim()) return
    void saveReading()
  }, [
    state.step,
    state.interpretFailed,
    state.isSaved,
    state.isSaving,
    drawnCards.length,
    overallMessage,
    saveReading,
  ])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    drawCards,
    saveReading,
    retryInterpretation,
    cleanup,
  }
}

export type UseInlineTarotAPIReturn = ReturnType<typeof useInlineTarotAPI>
