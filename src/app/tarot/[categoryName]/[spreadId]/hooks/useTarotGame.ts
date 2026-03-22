'use client'

/**
 * useTarotGame Hook
 * 타로 게임 상태 및 카드 선택 로직 관리
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data'
import { tarotDeck } from '@/lib/Tarot/tarot-data'
import {
  loadQuestionAnalysisSnapshot,
  type TarotQuestionAnalysisSnapshot,
} from '@/lib/Tarot/questionFlow'
import {
  Spread,
  DeckStyle,
  type Card,
  type DrawnCard,
} from '@/lib/Tarot/tarot.types'
import {
  loadReadingRestorePayload,
  type SavedTarotReading,
} from '@/lib/Tarot/tarot-storage'
import { apiFetch } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import type { GameState, ReadingResponse, InterpretationResult } from '../types'
import { CARD_COLORS, CardColor } from '../constants'
import { classifyTarotDrawError, type TarotDrawError } from '../../../utils/errorHandling'

const TAROT_PERSONALIZATION_KEY = 'tarot_personalization_options'

export interface TarotPersonalizationOptions {
  includeSaju: boolean
  includeAstrology: boolean
}

interface UseTarotGameReturn {
  // State
  gameState: GameState
  spreadInfo: Spread | null
  selectedDeckStyle: DeckStyle
  selectedColor: CardColor
  selectedIndices: number[]
  selectionOrderMap: Map<number, number>
  readingResult: ReadingResponse | null
  interpretation: InterpretationResult | null
  drawError: TarotDrawError | null
  revealedCards: number[]
  isSpreading: boolean
  userTopic: string
  questionAnalysis: TarotQuestionAnalysisSnapshot | null
  personalizationOptions: TarotPersonalizationOptions

  // Setters
  setGameState: (state: GameState) => void
  setInterpretation: (result: InterpretationResult | null) => void
  handlePersonalizationChange: (key: keyof TarotPersonalizationOptions, value: boolean) => void

  // Actions
  handleColorSelect: (color: CardColor) => void
  handleStartReading: () => void
  handleCardClick: (index: number) => void
  handleCardReveal: (index: number) => void
  handleRedraw: () => void
  isCardRevealed: (index: number) => boolean
  canRevealCard: (index: number) => boolean
}

function findCardBySavedName(savedCard: SavedTarotReading['cards'][number], index: number): Card {
  const normalizedName = savedCard.name.trim().toLowerCase()
  const normalizedNameKo = (savedCard.nameKo || '').trim().toLowerCase()

  const matchedCard = tarotDeck.find((card) => {
    const englishName = card.name.trim().toLowerCase()
    const koreanName = card.nameKo.trim().toLowerCase()
    return (
      englishName === normalizedName ||
      englishName === normalizedNameKo ||
      koreanName === normalizedName ||
      koreanName === normalizedNameKo
    )
  })

  if (matchedCard) {
    return matchedCard
  }

  const fallback = tarotDeck[0]
  return {
    ...fallback,
    id: -1 - index,
    name: savedCard.name,
    nameKo: savedCard.nameKo || savedCard.name,
    image: '/images/tarot/card-back.webp',
  }
}

function buildRestoredReadingResult(
  reading: SavedTarotReading,
  spread: Spread,
  categoryName: string | undefined
): ReadingResponse {
  const drawnCards: DrawnCard[] = reading.cards.map((savedCard, index) => ({
    card: findCardBySavedName(savedCard, index),
    isReversed: savedCard.isReversed,
  }))

  return {
    category: categoryName || reading.categoryId,
    spread,
    drawnCards,
    questionContext: reading.questionAnalysis || null,
  }
}

function buildRestoredInterpretation(reading: SavedTarotReading): InterpretationResult {
  return {
    overall_message: reading.interpretation.overallMessage || '',
    guidance: reading.interpretation.guidance || '',
    affirmation: '',
    fallback: false,
    card_insights: reading.interpretation.cardInsights.map((insight) => {
      const matchedCard = reading.cards.find(
        (card) => card.position === insight.position || card.name === insight.cardName
      )
      return {
        position: insight.position,
        card_name: insight.cardName,
        is_reversed: Boolean(matchedCard?.isReversed),
        interpretation: insight.interpretation,
      }
    }),
  }
}

export function useTarotGame(): UseTarotGameReturn {
  const params = useParams()
  const searchParams = useSearchParams()
  const categoryName = params?.categoryName as string | undefined
  const spreadId = params?.spreadId as string | undefined
  const questionFromUrl = searchParams?.get('question') || ''
  const analysisKeyFromUrl = searchParams?.get('analysisKey') || ''
  const restoreKeyFromUrl = searchParams?.get('restoreKey') || ''

  // Game state
  const [gameState, setGameState] = useState<GameState>('loading')
  const [spreadInfo, setSpreadInfo] = useState<Spread | null>(null)
  const [selectedDeckStyle, setSelectedDeckStyle] = useState<DeckStyle>('celestial')
  const [selectedColor, setSelectedColor] = useState<CardColor>(CARD_COLORS[0])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [userTopic] = useState<string>(questionFromUrl)
  const [questionAnalysis, setQuestionAnalysis] = useState<TarotQuestionAnalysisSnapshot | null>(
    () => loadQuestionAnalysisSnapshot(analysisKeyFromUrl, questionFromUrl)
  )
  const [selectionOrderMap, setSelectionOrderMap] = useState<Map<number, number>>(new Map())
  const selectionOrderRef = useRef<Map<number, number>>(new Map())
  const [readingResult, setReadingResult] = useState<ReadingResponse | null>(null)
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null)
  const [drawError, setDrawError] = useState<TarotDrawError | null>(null)
  const [revealedCards, setRevealedCards] = useState<number[]>([])
  const [isSpreading, setIsSpreading] = useState(false)
  const [personalizationOptions, setPersonalizationOptions] = useState<TarotPersonalizationOptions>(
    () => {
      if (typeof window === 'undefined') {
        return { includeSaju: true, includeAstrology: true }
      }

      try {
        const raw = localStorage.getItem(TAROT_PERSONALIZATION_KEY)
        if (!raw) {
          return { includeSaju: true, includeAstrology: true }
        }
        const parsed = JSON.parse(raw) as Partial<TarotPersonalizationOptions>
        return {
          includeSaju: parsed.includeSaju !== false,
          includeAstrology: parsed.includeAstrology !== false,
        }
      } catch {
        return { includeSaju: true, includeAstrology: true }
      }
    }
  )
  const fetchTriggeredRef = useRef(false)
  const restoredReadingKeyRef = useRef<string | null>(null)

  // Initialize spread info
  useEffect(() => {
    if (!categoryName || !spreadId) {
      return
    }
    if (spreadInfo?.id === spreadId) {
      return
    }

    const theme = tarotThemes.find((t) => t.id === categoryName)
    const spread = theme?.spreads.find((s) => s.id === spreadId)

    if (spread) {
      setSpreadInfo(spread)
      setGameState('color-select')
    } else {
      setGameState('error')
    }
  }, [categoryName, spreadId, spreadInfo?.id])

  // Stop spreading animation
  useEffect(() => {
    if (gameState === 'picking' && isSpreading) {
      const timer = setTimeout(() => {
        setIsSpreading(false)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [gameState, isSpreading])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      localStorage.setItem(TAROT_PERSONALIZATION_KEY, JSON.stringify(personalizationOptions))
    } catch {
      // Ignore storage errors
    }
  }, [personalizationOptions])

  useEffect(() => {
    if (restoreKeyFromUrl) {
      return
    }
    setQuestionAnalysis(loadQuestionAnalysisSnapshot(analysisKeyFromUrl, questionFromUrl))
  }, [analysisKeyFromUrl, questionFromUrl, restoreKeyFromUrl])

  useEffect(() => {
    if (!spreadInfo || !restoreKeyFromUrl) {
      return
    }
    if (restoredReadingKeyRef.current === restoreKeyFromUrl) {
      return
    }

    const restoredReading = loadReadingRestorePayload(restoreKeyFromUrl)
    if (!restoredReading) {
      return
    }

    restoredReadingKeyRef.current = restoreKeyFromUrl
    fetchTriggeredRef.current = true
    selectionOrderRef.current = new Map()

    const restoredResult = buildRestoredReadingResult(restoredReading, spreadInfo, categoryName)
    const restoredInterpretation = buildRestoredInterpretation(restoredReading)

    setSelectedDeckStyle((restoredReading.deckStyle as DeckStyle) || 'celestial')
    setSelectedColor(
      CARD_COLORS.find((color) => color.id === restoredReading.deckStyle) || CARD_COLORS[0]
    )
    setSelectedIndices([])
    setSelectionOrderMap(new Map())
    setReadingResult(restoredResult)
    setInterpretation(restoredInterpretation)
    setQuestionAnalysis(restoredReading.questionAnalysis || null)
    setRevealedCards(restoredResult.drawnCards.map((_, index) => index))
    setDrawError(null)
    setIsSpreading(false)
    setGameState('results')
  }, [spreadInfo, restoreKeyFromUrl, categoryName])

  const handleColorSelect = useCallback((color: CardColor) => {
    setSelectedColor(color)
    setSelectedDeckStyle(color.id as DeckStyle)
  }, [])

  const handleStartReading = useCallback(async () => {
    setGameState('picking')
    setDrawError(null)
    setIsSpreading(true)
    // Prefetch RAG context (non-blocking)
    apiFetch('/api/tarot/prefetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: categoryName, spreadId }),
    }).catch(() => {})
  }, [categoryName, spreadId])

  const handleCardClick = useCallback(
    (index: number) => {
      const currentMap = selectionOrderRef.current

      if (gameState !== 'picking') {
        return
      }
      if (currentMap.size >= (spreadInfo?.cardCount ?? 0)) {
        return
      }
      if (currentMap.has(index)) {
        return
      }

      const newOrder = currentMap.size + 1
      const newMap = new Map(currentMap).set(index, newOrder)
      selectionOrderRef.current = newMap

      setSelectionOrderMap(newMap)
      setSelectedIndices((prev) => [...prev, index])
    },
    [gameState, spreadInfo?.cardCount]
  )

  const handleCardReveal = useCallback(
    (index: number) => {
      const nextToReveal = revealedCards.length
      if (index === nextToReveal && !revealedCards.includes(index)) {
        setRevealedCards((prev) => [...prev, index])
      }
    },
    [revealedCards]
  )

  const handlePersonalizationChange = useCallback(
    (key: keyof TarotPersonalizationOptions, value: boolean) => {
      setPersonalizationOptions((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleRedraw = useCallback(() => {
    setSelectedIndices([])
    setSelectionOrderMap(new Map())
    selectionOrderRef.current = new Map()
    setDrawError(null)
    setIsSpreading(true)
  }, [])

  const isCardRevealed = useCallback(
    (index: number) => revealedCards.includes(index),
    [revealedCards]
  )
  const canRevealCard = useCallback(
    (index: number) => index === revealedCards.length,
    [revealedCards.length]
  )

  // Fetch reading when all cards selected
  useEffect(() => {
    const targetCardCount = spreadInfo?.cardCount || 0
    if (gameState === 'picking' && selectedIndices.length < targetCardCount) {
      fetchTriggeredRef.current = false
    }

    if (!spreadInfo || selectedIndices.length !== targetCardCount || gameState !== 'picking') {
      return
    }
    if (fetchTriggeredRef.current) {
      return
    }
    fetchTriggeredRef.current = true

    const fetchReading = async () => {
      setGameState('revealing')
      let handledApiError = false
      try {
        const response = await apiFetch('/api/tarot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: categoryName,
            spreadId,
            cardCount: targetCardCount,
            userTopic,
            questionContext: questionAnalysis || undefined,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          const isKoLocale =
            typeof document !== 'undefined'
              ? document.documentElement.lang.toLowerCase().startsWith('ko')
              : true
          setDrawError(classifyTarotDrawError(response.status, errorData, isKoLocale))
          handledApiError = true
          tarotLogger.error('Tarot API error', { status: response.status, errorData })
          throw new Error(`Failed to fetch reading: ${errorData.error || response.statusText}`)
        }

        const data = await response.json()
        setDrawError(null)
        setReadingResult(data)

        // Basic interpretation while waiting for AI
        const basicInterpretation: InterpretationResult = {
          overall_message: '',
          card_insights: data.drawnCards.map(
            (dc: { card: { name: string }; isReversed: boolean }, idx: number) => ({
              position: data.spread.positions[idx]?.title || `Card ${idx + 1}`,
              card_name: dc.card.name,
              is_reversed: dc.isReversed,
              interpretation: '',
            })
          ),
          guidance: '',
          affirmation: '',
          fallback: true,
        }
        setInterpretation(basicInterpretation)

        setTimeout(() => {
          setGameState('results')
        }, 1000)
      } catch (error) {
        if (!handledApiError) {
          const isKoLocale =
            typeof document !== 'undefined'
              ? document.documentElement.lang.toLowerCase().startsWith('ko')
              : true
          setDrawError(classifyTarotDrawError(500, { error: 'Network error' }, isKoLocale))
        }
        tarotLogger.error('Failed to fetch reading', error instanceof Error ? error : undefined)
        setGameState('error')
      }
    }

    const timeoutId = setTimeout(fetchReading, 500)
    return () => clearTimeout(timeoutId)
  }, [selectedIndices, spreadInfo, categoryName, spreadId, gameState, userTopic, questionAnalysis])

  return {
    gameState,
    spreadInfo,
    selectedDeckStyle,
    selectedColor,
    selectedIndices,
    selectionOrderMap,
    readingResult,
    interpretation,
    drawError,
    revealedCards,
    isSpreading,
    userTopic,
    questionAnalysis,
    personalizationOptions,
    setGameState,
    setInterpretation,
    handlePersonalizationChange,
    handleColorSelect,
    handleStartReading,
    handleCardClick,
    handleCardReveal,
    handleRedraw,
    isCardRevealed,
    canRevealCard,
  }
}
