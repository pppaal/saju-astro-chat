'use client'

import React, { Suspense, useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import AuthGate from '@/components/auth/AuthGate'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { useTarotGame, useTarotInterpretation } from './hooks'
import { smoothScrollTo } from './utils'
import { PageContent } from './components/PageContent'
import LoginPrompt from './components/LoginPrompt'
import styles from './tarot-reading.module.css'

export default function TarotReadingPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <div className={styles.loadingOrb}></div>
          <p>✨ Loading...</p>
        </div>
      }
    >
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

  // Setup URLs
  const categoryName = params?.categoryName as string | undefined
  const spreadId = params?.spreadId as string | undefined
  const search = searchParams?.toString()
  const basePath = categoryName && spreadId ? `/tarot/${categoryName}/${spreadId}` : '/tarot'
  const callbackUrl = search ? `${basePath}?${search}` : basePath
  const signInUrl = buildSignInUrl(callbackUrl)

  // Local state
  const detailedSectionRef = useRef<HTMLDivElement | null>(null)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const requestedInterpretationKeyRef = useRef<string | null>(null)
  const isInterpretationFetchingRef = useRef(false)

  // Custom hooks
  const gameHook = useTarotGame()
  const interpretationHook = useTarotInterpretation({
    categoryName,
    spreadId,
    userTopic: gameHook.userTopic,
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

    requestedInterpretationKeyRef.current = readingSignature
    isInterpretationFetchingRef.current = true
    let cancelled = false

    fetchInterpretation(readingResult)
      .then((result) => {
        if (!cancelled && result) {
          setInterpretation(result)
        }
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

  const scrollToDetails = useCallback(() => {
    if (detailedSectionRef.current) {
      smoothScrollTo(detailedSectionRef.current, 800)
    }
  }, [])

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
  const toggleCardExpand = (index: number) => setExpandedCard(expandedCard === index ? null : index)

  // Session loading state
  if (status === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingOrb}></div>
        <p>✨ {translate('common.loading', 'Loading...')}</p>
      </div>
    )
  }

  // Login fallback
  const loginFallback = <LoginPrompt signInUrl={signInUrl} language={language} />

  return (
    <AuthGate statusOverride={status} callbackUrl={callbackUrl} fallback={loginFallback}>
      <PageContent
        {...gameHook}
        {...interpretationHook}
        detailedSectionRef={detailedSectionRef}
        expandedCard={expandedCard}
        isSaving={isSaving}
        handleCardReveal={handleCardReveal}
        scrollToDetails={scrollToDetails}
        handleSaveReading={handleSaveReading}
        handleReset={handleReset}
        toggleCardExpand={toggleCardExpand}
        language={language}
        translate={translate}
      />
    </AuthGate>
  )
}
