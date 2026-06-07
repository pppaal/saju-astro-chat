'use client'

/**
 * useTarotGame Hook
 * 타로 게임 상태 및 카드 선택 로직 관리
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import { findCardBySavedName } from '@/lib/tarot/findCardByName'
import {
  loadQuestionAnalysisSnapshot,
  type TarotQuestionAnalysisSnapshot,
} from '@/lib/tarot/questionFlow'
import { Spread, DeckStyle, type DrawnCard } from '@/lib/tarot/tarot.types'
import {
  loadReadingRestorePayload,
  storeReadingRestorePayload,
  formatReadingForSave,
  type SavedTarotReading,
} from '@/lib/tarot/tarot-storage'
import { flattenTarotGuidance } from '@/lib/tarot/tarot-save-request'
import { apiFetch } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import type { GameState, ReadingResponse, InterpretationResult } from '../types'
import { CARD_COLORS, CardColor } from '../constants'
import { classifyTarotDrawError, type TarotDrawError } from '../../../utils/errorHandling'
import { useCreditModal } from '@/contexts/CreditModalContext'

const TAROT_PERSONALIZATION_KEY = 'tarot_personalization_options'
const TAROT_DECK_PREF_KEY = 'tarot_preferred_deck'

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
  /** "이 리딩 다시 열기" 복원 시 채워짐 — 저장된 followup 대화 turn. */
  initialFollowupTurns: Array<{ role: 'user' | 'assistant'; content: string }> | null
  /** 복원하는 리딩이 이미 보충 카드를 뽑았는지 — 클래리파이어 버튼 초기 잠금. */
  initialClarifierUsed: boolean

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
  handleRetryDraw: () => void
  isCardRevealed: (index: number) => boolean
  canRevealCard: (index: number) => boolean
}

// 카드 매칭 로직은 lib/tarot/findCardByName.ts 로 분리 — 히스토리 모달
// (TarotHistoryClient) 가 카드 이미지 렌더링에 같은 매칭을 쓰도록 공유.

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
    // 라이브 새로고침 복원이면 원본 draw nonce 를 그대로 실어, 재해석 호출이
    // 서버에서 'replay' 로 환불되게 한다(새로고침 중복 과금 차단). 히스토리
    // 복원엔 nonce 가 없지만 해석이 채워져 재호출 자체가 없어 무관.
    drawNonce: reading.drawNonce,
  }
}

function buildRestoredInterpretation(reading: SavedTarotReading): InterpretationResult {
  // 저장된 해석이 비어 있으면(카드만 먼저 저장된 미완성 — 예: 게스트 한도로 해석
  // 중단) fallback:true 로 표시해, 복원 직후 페이지의 해석 effect 가 다시 fetch
  // 하게 한다. 완성본(overallMessage 있음)은 fallback:false 라 즉시 그대로 표시.
  const hasRealInterpretation = Boolean(reading.interpretation.overallMessage?.trim())
  return {
    overall_message: reading.interpretation.overallMessage || '',
    guidance: reading.interpretation.guidance || '',
    affirmation: '',
    fallback: !hasRealInterpretation,
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
  const router = useRouter()
  const pathname = usePathname()
  const { showDepleted } = useCreditModal()
  const categoryName = params?.categoryName as string | undefined
  const spreadId = params?.spreadId as string | undefined
  const questionFromUrl = searchParams?.get('question') || ''
  const analysisKeyFromUrl = searchParams?.get('analysisKey') || ''
  const restoreKeyFromUrl = searchParams?.get('restoreKey') || ''
  const deckFromUrl = searchParams?.get('deck') || ''
  const sajuFromUrl = searchParams?.get('saju')
  const astroFromUrl = searchParams?.get('astro')

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
  // "이 리딩 다시 열기" 복원 시 함께 복원할 followup 채팅 turn / 보충 카드 사용
  // 여부. FollowupChat 이 채팅창을 시드하고, 이미 보충 카드를 뽑은 리딩이면
  // 클래리파이어 버튼을 처음부터 잠가 한 리딩당 한 장 정책을 유지한다.
  const [restoredFollowupTurns, setRestoredFollowupTurns] = useState<Array<{
    role: 'user' | 'assistant'
    content: string
  }> | null>(null)
  const [restoredClarifierUsed, setRestoredClarifierUsed] = useState(false)
  const [drawError, setDrawError] = useState<TarotDrawError | null>(null)
  const [revealedCards, setRevealedCards] = useState<number[]>([])
  const [isSpreading, setIsSpreading] = useState(false)
  const [personalizationOptions, setPersonalizationOptions] = useState<TarotPersonalizationOptions>(
    () => {
      // URL ?saju=0&astro=0 가 명시되면 URL 우선; 아니면 localStorage; 둘 다 없으면 기본 ON.
      // Tarot is pure now — no saju / astrology cross. Force off so
      // neither the (now-removed) toggle UI nor the URL params nor a
      // persisted localStorage value can re-enable cross-mode at the
      // interpret routes.
      void sajuFromUrl
      void astroFromUrl
      return { includeSaju: false, includeAstrology: false }
      // Unused but kept compiling so the surrounding signature stays
      // identical for the storage-write effect a few lines down.

      try {
        return { includeSaju: false, includeAstrology: false }
      } catch {
        return { includeSaju: false, includeAstrology: false }
      }
    }
  )
  const fetchTriggeredRef = useRef(false)
  const restoredReadingKeyRef = useRef<string | null>(null)
  // Track mount lifecycle so post-await setStates inside fetchReading
  // bail out cleanly when the user navigates away mid-reading.
  const mountedRef = useRef(true)
  // In-flight reading fetch AbortController. Unmount aborts it so the
  // network request and SSE reader don't keep running for a dead tree.
  const readingAbortRef = useRef<AbortController | null>(null)
  // The "→ results" transition is delayed by 1s so the card reveal
  // animation can finish. Tracking the timer in a ref means unmount can
  // clear it (otherwise setGameState fires on a torn-down tree).
  const resultsTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (readingAbortRef.current) {
        try {
          readingAbortRef.current.abort()
        } catch {
          // already aborted — ignore
        }
        readingAbortRef.current = null
      }
      if (resultsTransitionTimerRef.current) {
        clearTimeout(resultsTransitionTimerRef.current)
        resultsTransitionTimerRef.current = null
      }
    }
  }, [])

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
      // 우선순위: URL ?deck= > localStorage 저장값
      let preferred: DeckStyle | null = null
      if (deckFromUrl && CARD_COLORS.some((c) => c.id === deckFromUrl)) {
        preferred = deckFromUrl as DeckStyle
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(TAROT_DECK_PREF_KEY, deckFromUrl)
          } catch {
            // ignore
          }
        }
      } else if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem(TAROT_DECK_PREF_KEY) as DeckStyle | null
          if (saved && CARD_COLORS.some((c) => c.id === saved)) {
            preferred = saved
          }
        } catch {
          // ignore
        }
      }
      if (preferred) {
        const matched = CARD_COLORS.find((c) => c.id === preferred) || CARD_COLORS[0]
        setSelectedColor(matched)
        setSelectedDeckStyle(preferred)
        setIsSpreading(true)
        setGameState('picking')
      } else {
        setGameState('color-select')
      }
    } else {
      setGameState('error')
    }
  }, [categoryName, spreadId, spreadInfo?.id, deckFromUrl])

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
    setRestoredFollowupTurns(restoredReading.followupTurns ?? null)
    // 보충 카드 사용 판정: 전용 컬럼(clarifierCard) 우선, 없으면 followup
    // turn 의 보충카드 마커(🃏 — buildClarifierUserMessage 가 항상 prefix)로도
    // 인정. 자동저장 경합으로 clarifierCard 컬럼만 비는 케이스에도 잠금 유지.
    const turnsHaveClarifier =
      Array.isArray(restoredReading.followupTurns) &&
      restoredReading.followupTurns.some((t) => t.role === 'user' && t.content.includes('🃏'))
    setRestoredClarifierUsed(!!restoredReading.clarifierCard || turnsHaveClarifier)
    setRevealedCards(restoredResult.drawnCards.map((_, index) => index))
    setDrawError(null)
    setIsSpreading(false)
    setGameState('results')
  }, [spreadInfo, restoreKeyFromUrl, categoryName])

  // 리딩을 sessionStorage 에 저장하고 URL 에 restoreKey 를 심어, 리로드(모바일
  // 백그라운드 복귀)나 비로그인→로그인/크레딧 구매 왕복 후에도 위의 복원 effect 가
  // 결과창을 그대로 재구성하게 한다.
  //  - 카드가 뽑히면(readingResult) "즉시" 카드만이라도 저장해 restoreKey 를 URL 에
  //    확보한다 → 해석 도중 게스트 한도가 터져 로그인하러 가도 카드가 살아남고,
  //    복원 시 buildRestoredInterpretation(빈 해석→fallback:true)이 재fetch 를 부른다.
  //  - 해석이 완성되면(overall_message && !fallback) 같은 키로 payload 를 업그레이드
  //    해, 완성본은 복원 즉시 그대로(재fetch 없이) 표시되게 한다.
  const restorePersistKeyRef = useRef<string | null>(null)
  const restorePersistCompleteRef = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!readingResult || !spreadInfo) return
    // 우리가 심지 않은 restoreKey(히스토리 등 외부 복원 진입) 는 건드리지 않는다.
    if (restoreKeyFromUrl && restorePersistKeyRef.current !== restoreKeyFromUrl) return
    if (restorePersistCompleteRef.current) return // 완성본 저장 끝 — 더 안 함

    const isComplete = Boolean(
      interpretation && interpretation.overall_message && !interpretation.fallback
    )
    // guidance 는 string | AdviceItem[] 라 저장 포맷(string)으로 평탄화.
    const saveInterpretation = isComplete
      ? {
          overall_message: interpretation!.overall_message,
          guidance: flattenTarotGuidance(interpretation!.guidance),
          card_insights: interpretation!.card_insights,
        }
      : { overall_message: '', guidance: '', card_insights: [] }

    // FollowupChat 이 같은 슬롯에 써둔 대화/보충카드는 본문 재저장 시에도
    // 보존한다 — 안 그러면 이 effect 가 다시 돌 때 followupTurns 가 날아가
    // 새로고침 후 대화가 사라지는 회귀(클로버).
    const existingPayload = restorePersistKeyRef.current
      ? loadReadingRestorePayload(restorePersistKeyRef.current)
      : null
    const reading: SavedTarotReading = {
      ...formatReadingForSave(
        userTopic,
        spreadInfo,
        readingResult.drawnCards,
        saveInterpretation,
        categoryName || '',
        spreadId || '',
        selectedDeckStyle,
        questionAnalysis
      ),
      id: `restore_${Date.now().toString(36)}`,
      timestamp: Date.now(),
      // 새로고침 시 재해석이 'replay' 환불을 받도록 원본 nonce 동봉.
      drawNonce: readingResult.drawNonce,
      followupTurns: existingPayload?.followupTurns ?? undefined,
      clarifierCard: existingPayload?.clarifierCard ?? undefined,
    }
    const key = storeReadingRestorePayload(reading, restorePersistKeyRef.current || undefined)
    if (!key) return

    if (!restorePersistKeyRef.current) {
      // 첫 저장(카드 확보) — URL 에 restoreKey 심기. 라이브 세션에서 복원 effect 가
      // 현재 상태를 덮어쓰지 않도록 ref 도 함께 마킹.
      restorePersistKeyRef.current = key
      restoredReadingKeyRef.current = key
      const nextParams = new URLSearchParams(searchParams?.toString() || '')
      nextParams.set('restoreKey', key)
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
    }
    if (isComplete) restorePersistCompleteRef.current = true
  }, [
    readingResult,
    interpretation,
    spreadInfo,
    restoreKeyFromUrl,
    userTopic,
    categoryName,
    spreadId,
    selectedDeckStyle,
    questionAnalysis,
    searchParams,
    router,
    pathname,
  ])

  const handleColorSelect = useCallback((color: CardColor) => {
    setSelectedColor(color)
    setSelectedDeckStyle(color.id as DeckStyle)
  }, [])

  const handleStartReading = useCallback(async () => {
    setDrawError(null)
    // 크레딧 사전 체크 + RAG prefetch 겸용. 한도 초과/비로그인이면 apiFetch 가
    // 전역 크레딧(402)/로그인(401) 모달을 띄우므로, 여기서는 단계 전환을 막아
    // 질문 화면에 그대로 머무른다. 즉 카드 선택까지 진행시킨 뒤 결과에서
    // 알리던 동작을 "시작 즉시 차단"으로 교정.
    let allowed = true
    try {
      const res = await apiFetch('/api/tarot/prefetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: categoryName, spreadId }),
      })
      allowed = res.ok
    } catch {
      // prefetch 네트워크 오류는 차단 사유가 아니다 — 실제 draw 단계에서 다시
      // 게이팅되므로 결제 사용자 흐름을 끊지 않도록 그대로 진행시킨다.
      allowed = true
    }
    if (!allowed) return
    setGameState('picking')
    setIsSpreading(true)
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
    // 이전 리딩의 잔존 상태를 모두 지운다 — 안 지우면 새 카드 위에 옛 해석
    // (overall_message, card_insights) 이 그대로 떠있어 "왜 카드는 비었는데
    // 해석은 나와있냐" 회귀가 발생. fetchTriggeredRef 도 reset (다음 셀렉션
    // 완료 시 새 fetch 트리거 되도록).
    setSelectedIndices([])
    setSelectionOrderMap(new Map())
    selectionOrderRef.current = new Map()
    setRevealedCards([])
    setReadingResult(null)
    setInterpretation(null)
    setDrawError(null)
    fetchTriggeredRef.current = false
    setIsSpreading(true)
  }, [])

  // 일시적(네트워크/서버) 드로우 실패에서 *같은 선택 카드 그대로* 재시도.
  // selectedIndices 는 에러 시에도 그대로 차 있으므로, drawError 를 지우고
  // fetchTriggeredRef 를 풀어 gameState 를 'picking' 으로 되돌리면 위 fetch
  // effect 가 같은 선택으로 다시 트리거된다. (크레딧/게스트/인증 에러는 재시도
  // 해도 또 실패하므로 PageContent 에서 이 핸들러를 전달하지 않는다.)
  const handleRetryDraw = useCallback(() => {
    setDrawError(null)
    fetchTriggeredRef.current = false
    setGameState('picking')
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

    // 모든 guard 통과:
    // - spreadInfo 로드됐고 cardCount > 0 (cardCount=0 spreadInfo 가 잠깐 로드되는
    //   경우에 fetchReading(cardCount:0) 으로 잘못 호출되던 edge case 차단)
    // - 선택 카운트가 정확히 targetCount (length === target)
    // - 게임 상태가 picking (revealing/result 단계로 넘어갔으면 재호출 안 함)
    // - ref 가 not-yet-triggered (React 배칭/리렌더 동안 두 번 트리거 방지)
    if (
      !spreadInfo ||
      targetCardCount <= 0 ||
      selectedIndices.length !== targetCardCount ||
      gameState !== 'picking'
    ) {
      return
    }
    if (fetchTriggeredRef.current) {
      return
    }
    fetchTriggeredRef.current = true

    const fetchReading = async () => {
      // Abort any previous in-flight fetch before starting a new one.
      // Redraw can re-trigger this effect while a stale request is still
      // pending; without abort, the stale response would land later and
      // overwrite the new reading.
      if (readingAbortRef.current) {
        try {
          readingAbortRef.current.abort()
        } catch {
          /* already aborted — ignore */
        }
      }
      const controller = new AbortController()
      readingAbortRef.current = controller
      if (mountedRef.current) setGameState('revealing')
      let handledApiError = false
      let creditExhausted = false
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
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          const isKoLocale =
            typeof document !== 'undefined'
              ? document.documentElement.lang.toLowerCase().startsWith('ko')
              : true
          handledApiError = true
          tarotLogger.error('Tarot API error', { status: response.status, errorData })
          // 크레딧 소진(402) → 인라인 에러 화면 대신 전역 크레딧 안내 모달.
          if (response.status === 402) {
            if (mountedRef.current) showDepleted()
            creditExhausted = true
          } else if (mountedRef.current) {
            setDrawError(classifyTarotDrawError(response.status, errorData, isKoLocale))
          }
          throw new Error(`Failed to fetch reading: ${errorData.error || response.statusText}`)
        }

        const data = await response.json()
        if (!mountedRef.current) return
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

        // Auto-reveal every card on entry. Previously revealedCards
        // stayed empty so every card landed face-down with a "Click
        // to reveal" prompt — the user had to click each one of the
        // five (or twelve) before seeing any actual card art.
        // HorizontalCardsGrid's animationDelay (index * 0.15s) still
        // staggers the flip so the cascade feels intentional.
        setRevealedCards(data.drawnCards.map((_: unknown, i: number) => i))
        if (resultsTransitionTimerRef.current) {
          clearTimeout(resultsTransitionTimerRef.current)
        }
        resultsTransitionTimerRef.current = setTimeout(() => {
          resultsTransitionTimerRef.current = null
          if (!mountedRef.current) return
          setGameState('results')
        }, 1000)
      } catch (error) {
        // Aborted via unmount or redraw — not a real failure.
        const errName = (error as Error & { name?: string })?.name
        if (errName === 'AbortError' || !mountedRef.current) {
          return
        }
        // 크레딧 소진은 모달로 안내했으므로 에러 화면으로 전환하지 않고
        // 카드 선택 화면을 유지한다(재선택으로 재시도 가능, 재요청 루프 없음).
        if (creditExhausted) {
          tarotLogger.warn('Tarot reading blocked: insufficient credits')
          setGameState('picking')
          return
        }
        if (!handledApiError) {
          const isKoLocale =
            typeof document !== 'undefined'
              ? document.documentElement.lang.toLowerCase().startsWith('ko')
              : true
          setDrawError(classifyTarotDrawError(500, { error: 'Network error' }, isKoLocale))
        }
        tarotLogger.error('Failed to fetch reading', error instanceof Error ? error : undefined)
        setGameState('error')
      } finally {
        if (readingAbortRef.current === controller) {
          readingAbortRef.current = null
        }
      }
    }

    const timeoutId = setTimeout(fetchReading, 500)
    return () => clearTimeout(timeoutId)
  }, [
    selectedIndices,
    spreadInfo,
    categoryName,
    spreadId,
    gameState,
    userTopic,
    questionAnalysis,
    showDepleted,
  ])

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
    initialFollowupTurns: restoredFollowupTurns,
    initialClarifierUsed: restoredClarifierUsed,
    setGameState,
    setInterpretation,
    handlePersonalizationChange,
    handleColorSelect,
    handleStartReading,
    handleCardClick,
    handleCardReveal,
    handleRedraw,
    handleRetryDraw,
    isCardRevealed,
    canRevealCard,
  }
}
