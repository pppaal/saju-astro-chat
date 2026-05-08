/**
 * useInlineTarotAPI - API calls for InlineTarotModal
 *
 * Handles all API interactions: analyze question, draw cards, interpret, save
 */

import { useCallback, useRef } from 'react'
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data'
import type { DrawnCard, CardInsight } from '@/lib/Tarot/tarot.types'
import {
  resolveStableTarotEntry,
  toAnalysisSnapshot,
  type TarotQuestionAnalysisResult,
} from '@/lib/Tarot/questionFlow'
import { logger } from '@/lib/logger'
import type { UseInlineTarotStateReturn } from './useInlineTarotState'

type LangKey = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'ru'

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

      const reason = [(data as { reason?: string }).reason, data.direct_answer, data.userFriendlyExplanation]
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
      abortControllerRef.current = new AbortController()

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
        const res = await fetch('/api/tarot/interpret', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
          },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        })

        if (!res.ok) {
          throw new Error('Interpretation failed')
        }

        const data = await res.json()
        const nextOverall =
          typeof data.overall_message === 'string' && data.overall_message.trim()
            ? data.overall_message
            : defaultOverallMessage
        const nextGuidance =
          typeof data.guidance === 'string' && data.guidance.trim()
            ? data.guidance
            : defaultGuidance
        const nextAffirmation =
          typeof data.affirmation === 'string' && data.affirmation.trim() ? data.affirmation : ''
        const nextInsights = Array.isArray(data.card_insights)
          ? (data.card_insights as CardInsight[])
          : []

        actions.setOverallMessage(nextOverall)
        actions.setCardInsights(nextInsights)
        actions.setGuidance(nextGuidance)
        if (nextAffirmation) {
          actions.setAffirmation(nextAffirmation)
        }

        actions.setStep('result')
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          logger.error('[InlineTarot] interpret error:', err)
        }
        if (!overallMessage.trim()) {
          actions.setOverallMessage(defaultOverallMessage)
        }
        if (!guidance.trim()) {
          actions.setGuidance(defaultGuidance)
        }
        actions.setStep('result')
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
      const res = await fetch('/api/tarot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
        },
        body: JSON.stringify({
          categoryId: selectedCategory,
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

      // Animate card reveals
      for (let i = 0; i < data.drawnCards.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        actions.incrementRevealedCount()
      }

      // Start interpretation
      actions.setStep('interpreting')
      await fetchInterpretation(data.drawnCards)
    } catch (err) {
      logger.error('[InlineTarot] draw error:', err)
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
    cleanup,
  }
}

export type UseInlineTarotAPIReturn = ReturnType<typeof useInlineTarotAPI>
