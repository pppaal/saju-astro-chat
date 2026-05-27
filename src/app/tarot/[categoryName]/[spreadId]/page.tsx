'use client'

import React, { Suspense, useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { useTarotGame, useTarotInterpretation } from './hooks'
import { smoothScrollTo } from './utils'
import { PageContent } from './components/PageContent'
import BrandSplash from '@/components/branding/BrandSplash'

export default function TarotReadingPageWrapper() {
  return (
    <Suspense fallback={<BrandSplash />}>
      <TarotReadingPage />
    </Suspense>
  )
}

function TarotReadingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const { translate, language } = useI18n()

  const categoryName = params?.categoryName as string | undefined
  const spreadId = params?.spreadId as string | undefined
  const search = searchParams?.toString()
  const basePath = categoryName && spreadId ? `/tarot/${categoryName}/${spreadId}` : '/tarot'
  const callbackUrl = search ? `${basePath}?${search}` : basePath
  const signInUrl = buildSignInUrl(callbackUrl)
  const isGuestUser = status === 'unauthenticated'

  // Local state
  const detailedSectionRef = useRef<HTMLDivElement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [interpretationFailed, setInterpretationFailed] = useState(false)
  const requestedInterpretationKeyRef = useRef<string | null>(null)
  const isInterpretationFetchingRef = useRef(false)

  // Custom hooks
  const gameHook = useTarotGame()
  const interpretationHook = useTarotInterpretation({
    categoryName,
    spreadId,
    userTopic: gameHook.userTopic,
    questionAnalysis: gameHook.questionAnalysis,
    selectedDeckStyle: gameHook.selectedDeckStyle,
    personalizationOptions: gameHook.personalizationOptions,
  })
  const readingResult = gameHook.readingResult
  const interpretationFallback = gameHook.interpretation?.fallback
  const setInterpretation = gameHook.setInterpretation
  const fetchInterpretation = interpretationHook.fetchInterpretation

  const readingSignature = useMemo(() => {
    if (!readingResult) {
      return ''
    }
    const spreadKey = readingResult.spread?.id || spreadId || 'spread'
    const cardsKey = readingResult.drawnCards
      .map((dc) => `${dc.card.id}:${dc.isReversed ? 'r' : 'u'}`)
      .join('|')
    return `${spreadKey}:${cardsKey}`
  }, [readingResult, spreadId])

  // 새로고침 시 크레딧이 또 차감되던 회귀 — 같은 리딩에 대해선 해석 결과를
  // sessionStorage 에 캐시해 두고 우선 그걸 본다. 캐시 hit 이면 API 호출 자체를
  // 건너뛰어 토큰 차감이 없고, miss 면 정상 호출하되 idempotencyKey 헤더로
  // 서버 측 2차 dedup 까지 동시에 끼운다.
  const cacheKeyFor = useCallback(
    (sig: string) => `tarot:interp:${sig}:${language}`,
    [language]
  )

  // Fetch interpretation once per reading result (prevents re-fetch loop/rewrite)
  useEffect(() => {
    if (!readingSignature) {
      requestedInterpretationKeyRef.current = null
      isInterpretationFetchingRef.current = false
      return
    }

    if (!readingResult || !interpretationFallback) {
      return
    }

    if (
      requestedInterpretationKeyRef.current === readingSignature ||
      isInterpretationFetchingRef.current
    ) {
      return
    }

    // sessionStorage 캐시 hit — 네트워크 호출 없이 즉시 적용.
    if (typeof window !== 'undefined') {
      try {
        const cached = window.sessionStorage.getItem(cacheKeyFor(readingSignature))
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed && typeof parsed === 'object' && parsed.overall_message) {
            requestedInterpretationKeyRef.current = readingSignature
            setInterpretation(parsed)
            setInterpretationFailed(false)
            return
          }
        }
      } catch {
        // 캐시 손상 — 무시하고 정상 fetch.
      }
    }

    requestedInterpretationKeyRef.current = readingSignature
    isInterpretationFetchingRef.current = true
    let cancelled = false

    fetchInterpretation(readingResult, {
      idempotencyKey: readingSignature,
      // 스트리밍 도중 overall 텍스트 누적분을 받아 즉시 UI 반영 (fallback=true 로 유지).
      onProgress: (snapshot) => {
        if (cancelled) return
        setInterpretation(snapshot)
      },
    })
      .then((result) => {
        if (cancelled) return
        if (result) {
          setInterpretation(result)
        }
        // LLM 이 완전 실패해 정적 fallback 으로 떨어진 경우 → 사용자에게 재시도 옵션 제공.
        const failedToLLM =
          !result ||
          result.interpretation_source === 'local_personalized_fallback' ||
          result.interpretation_source === 'emergency_fallback' ||
          (result.fallback === true && (!result.overall_message || result.overall_message.length < 40))
        setInterpretationFailed(failedToLLM)

        // 성공적인 LLM 결과만 캐시 — fallback/실패는 다음에 다시 시도하도록 저장 X.
        if (result && !failedToLLM && typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(cacheKeyFor(readingSignature), JSON.stringify(result))
          } catch {
            // quota exceeded 등은 무시.
          }
        }
      })
      .catch(() => {
        if (cancelled) return
        setInterpretationFailed(true)
      })
      .finally(() => {
        if (!cancelled) {
          isInterpretationFetchingRef.current = false
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    readingSignature,
    readingResult,
    interpretationFallback,
    setInterpretation,
    fetchInterpretation,
    cacheKeyFor,
  ])

  // Card reveal with auto-scroll
  const handleCardReveal = useCallback(
    (index: number) => {
      gameHook.handleCardReveal(index)
      // Auto-scroll after last card
      if (
        index === (gameHook.readingResult?.drawnCards.length || 0) - 1 &&
        detailedSectionRef.current
      ) {
        setTimeout(() => {
          smoothScrollTo(detailedSectionRef.current!, 1200)
        }, 800)
      }
    },
    [gameHook, detailedSectionRef]
  )

  const handleSaveReading = useCallback(async () => {
    if (isSaving || interpretationHook.isSaved) return
    setIsSaving(true)
    try {
      await interpretationHook.handleSaveReading(
        gameHook.readingResult,
        gameHook.spreadInfo,
        gameHook.interpretation
      )
    } finally {
      setIsSaving(false)
    }
  }, [interpretationHook, gameHook, isSaving])

  const handleReset = () => router.push('/tarot')

  // 재시도: ref 를 비워서 useEffect 가 다시 fetchInterpretation 트리거.
  // 캐시는 fallback/실패는 저장 안 했지만, 사용자가 의도적으로 retry 한
  // 이상 혹시 모를 잔여 캐시도 함께 지워서 항상 새 호출이 가도록 한다.
  const handleRetryInterpretation = useCallback(() => {
    if (!gameHook.readingResult) return
    setInterpretationFailed(false)
    requestedInterpretationKeyRef.current = null
    isInterpretationFetchingRef.current = false
    if (typeof window !== 'undefined' && readingSignature) {
      try {
        window.sessionStorage.removeItem(cacheKeyFor(readingSignature))
      } catch {
        // ignore
      }
    }
    // basicInterpretation(fallback=true) 로 되돌려 useEffect 조건 만족시킴.
    setInterpretation({
      overall_message: '',
      card_insights: gameHook.readingResult.drawnCards.map((dc, i) => ({
        position: gameHook.readingResult!.spread.positions[i]?.title || `Card ${i + 1}`,
        card_name: dc.card.name,
        is_reversed: dc.isReversed,
        interpretation: '',
      })),
      guidance: '',
      affirmation: '',
      fallback: true,
    })
  }, [gameHook.readingResult, setInterpretation, readingSignature, cacheKeyFor])

  // Session loading state
  if (status === 'loading') {
    return <BrandSplash />
  }
  return (
    <PageContent
      {...gameHook}
      {...interpretationHook}
      detailedSectionRef={detailedSectionRef}
      isSaving={isSaving}
      isGuestUser={isGuestUser}
      signInUrl={signInUrl}
      handleCardReveal={handleCardReveal}
      handleSaveReading={handleSaveReading}
      handleReset={handleReset}
      interpretationFailed={interpretationFailed}
      handleRetryInterpretation={handleRetryInterpretation}
      language={language}
      translate={translate}
    />
  )
}
