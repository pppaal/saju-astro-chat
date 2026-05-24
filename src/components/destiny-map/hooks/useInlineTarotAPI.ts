/**
 * useInlineTarotAPI - API calls for InlineTarotModal
 *
 * Handles all API interactions: analyze question, draw cards, interpret, save
 */

import { useCallback, useRef } from 'react'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import type { DrawnCard, CardInsight } from '@/lib/tarot/tarot.types'
import {
  resolveStableTarotEntry,
  toAnalysisSnapshot,
  type TarotQuestionAnalysisResult,
} from '@/lib/tarot/questionFlow'
import { logger } from '@/lib/logger'
import type { UseInlineTarotStateReturn } from './useInlineTarotState'

type LangKey = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'ru'

// Mirror the main tarot reading's interpret timeout so a slow/stuck stream
// doesn't leave the inline reading hanging forever with no interpretation.
const INTERPRET_TIMEOUT_MS = 35000

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

export function useInlineTarotAPI({ stateManager, lang, profile }: UseInlineTarotAPIOptions) {
  const { state, actions, recommendedSpreads } = stateManager
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
    questionAnalysis,
  } = state
  const abortControllerRef = useRef<AbortController | null>(null)
  const defaultOverallMessage =
    lang === 'ko'
      ? '카드가 보여준 흐름을 기준으로 현재 상황의 핵심을 정리했습니다.'
      : 'I summarized the core of your current situation based on the cards.'
  const defaultGuidance =
    lang === 'ko'
      ? '오늘은 큰 결론보다, 바로 실행 가능한 한 가지 행동부터 시작해 보세요.'
      : 'Today, start with one practical action rather than forcing a big conclusion.'

  const findSpreadByIds = useCallback((themeId: string, spreadId: string) => {
    const theme = tarotThemes.find((item) => item.id === themeId)
    const spread = theme?.spreads.find((item) => item.id === spreadId)
    return { theme, spread }
  }, [])

  // AI auto-select spread based on question
  const analyzeQuestion = useCallback(async () => {
    if (!concern.trim()) {
      return
    }

    actions.setIsAnalyzing(true)
    try {
      const res = await fetch('/api/tarot/question-engine-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
        },
        body: JSON.stringify({
          question: concern,
          language: lang,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to analyze question')
      }

      const data = (await res.json()) as TarotQuestionAnalysisResult

      // Handle dangerous questions
      if (data.isDangerous) {
        alert(data.message)
        actions.setIsAnalyzing(false)
        return
      }

      const questionSnapshot = toAnalysisSnapshot(data)
      actions.setQuestionAnalysis(questionSnapshot)

      const stableEntry = resolveStableTarotEntry(concern.trim(), questionSnapshot)
      const suggestedSpreads = (data.recommended_spreads || [])
        .map((item) => findSpreadByIds(item.themeId, item.spreadId).spread)
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
      actions.setSuggestedSpreads(suggestedSpreads)

      const stableSpreadResult = findSpreadByIds(stableEntry.themeId, stableEntry.spreadId)
      const engineSpreadResult = findSpreadByIds(data.themeId, data.spreadId)
      const spread =
        stableSpreadResult.spread ||
        engineSpreadResult.spread ||
        suggestedSpreads[0] ||
        recommendedSpreads[0]

      const nextCategory =
        stableSpreadResult.theme?.id ||
        engineSpreadResult.theme?.id ||
        stableEntry.themeId ||
        selectedCategory

      const reason = [
        (data as { reason?: string }).reason,
        data.direct_answer,
        data.userFriendlyExplanation,
      ]
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .join(' ')

      if (spread) {
        actions.setSelectedCategory(nextCategory)
        actions.selectSpreadAndProceed(spread, reason)
      } else {
        actions.setStep('spread-select')
      }
    } catch (err) {
      logger.error('[InlineTarot] auto-select error:', err)
      actions.setStep('spread-select')
    } finally {
      actions.setIsAnalyzing(false)
    }
  }, [concern, selectedCategory, lang, recommendedSpreads, actions, findSpreadByIds])

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

      const payload = {
        category: selectedCategory,
        categoryId: selectedCategory,
        spreadId: selectedSpread.id,
        spreadTitle:
          lang === 'ko' ? selectedSpread.titleKo || selectedSpread.title : selectedSpread.title,
        cards: cards.map((dc, idx) => ({
          name: lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
          isReversed: dc.isReversed,
          position:
            lang === 'ko'
              ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
              : selectedSpread.positions[idx]?.title,
          keywords: dc.isReversed
            ? lang === 'ko'
              ? dc.card.reversed.keywordsKo || dc.card.reversed.keywords
              : dc.card.reversed.keywords
            : lang === 'ko'
              ? dc.card.upright.keywordsKo || dc.card.upright.keywords
              : dc.card.upright.keywords,
        })),
        language: lang,
        userQuestion: concern,
        birthdate: profile.birthDate,
        questionContext: questionAnalysis || undefined,
      }

      try {
        const res = await fetch('/api/tarot/interpret-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error('Interpretation failed')
        }

        // SSE: accumulate `data: { content: "..." }` events into a single
        // JSON blob, then parse once at the end. interpret-stream returns
        // `{ overall, cards: [{ position, interpretation }], advice }`.
        const reader = res.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }
        const decoder = new TextDecoder()
        let accumulated = ''
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const ev = JSON.parse(data) as { content?: string }
              if (ev.content) accumulated += ev.content
            } catch {
              // ignore partial chunks
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
      profile.birthDate,
      actions,
      overallMessage,
      guidance,
      defaultOverallMessage,
      defaultGuidance,
      questionAnalysis,
    ]
  )

  // Draw cards from API
  const drawCards = useCallback(async () => {
    if (!selectedSpread) {
      return
    }

    actions.setIsDrawing(true)
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
          questionContext: questionAnalysis || undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        logger.error('[InlineTarot] API error:', { status: res.status, errorData })
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
  }, [selectedSpread, selectedCategory, actions, fetchInterpretation, questionAnalysis])

  // Save tarot reading to database
  const saveReading = useCallback(async () => {
    if (isSaving || isSaved || !selectedSpread) {
      return
    }

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
            position:
              lang === 'ko'
                ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
                : selectedSpread.positions[idx]?.title,
          })),
          overallMessage,
          cardInsights,
          guidance,
          affirmation,
          source: 'counselor',
          locale: lang,
          questionContext: questionAnalysis || undefined,
        }),
      })

      if (res.ok) {
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
    questionAnalysis,
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

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    analyzeQuestion,
    drawCards,
    saveReading,
    retryInterpretation,
    cleanup,
  }
}

export type UseInlineTarotAPIReturn = ReturnType<typeof useInlineTarotAPI>
