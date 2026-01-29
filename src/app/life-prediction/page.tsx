'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { AnimatePresence } from 'framer-motion'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import type { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector'

// Hooks
import { useLifePredictionProfile } from '@/hooks/useLifePredictionProfile'
import { useLifePredictionPhase } from '@/hooks/useLifePredictionPhase'
import { useLifePredictionState } from '@/hooks/useLifePredictionState'
import { useLifePredictionAnimation } from '@/hooks/useLifePredictionAnimation'
import { useLifePredictionAPI } from '@/hooks/useLifePredictionAPI'

// Phase Components
import {
  BirthInputPhase,
  QuestionInputPhase,
  AnalyzingPhase,
  ResultsPhase,
} from '@/components/life-prediction/phases'

// UI Components
import BackButton from '@/components/ui/BackButton'
import CreditBadge from '@/components/ui/CreditBadge'
import styles from './life-prediction.module.css'

export default function LifePredictionPage() {
  return <LifePredictionContent />
}

function LifePredictionContent() {
  const { locale } = useI18n()
  const { status } = useSession()
  const signInUrl = buildSignInUrl()

  // Background animation
  const canvasRef = useLifePredictionAnimation()

  // Profile management
  const {
    userProfile,
    guestBirthInfo,
    profileLoading,
    handleBirthInfoSubmit,
    handleChangeBirthInfo: resetBirthInfo,
  } = useLifePredictionProfile(status)

  // Prediction state
  const {
    currentQuestion,
    setCurrentQuestion,
    currentEventType,
    setCurrentEventType,
    results,
    setResults,
    error,
    setError,
    generalAdvice,
    setGeneralAdvice,
    resetAll,
  } = useLifePredictionState()

  // Phase navigation
  const { phase, setPhase, handleAskAgain, handleChangeBirthInfo } = useLifePredictionPhase(
    'birth-input',
    resetAll,
    resetBirthInfo
  )

  // API handler
  const { handleSubmit: submitPrediction } = useLifePredictionAPI(
    userProfile,
    guestBirthInfo,
    locale,
    setError
  )

  // Update phase based on profile
  React.useEffect(() => {
    if (profileLoading) {
      return
    }

    if (userProfile?.birthDate || guestBirthInfo?.birthDate) {
      if (phase === 'birth-input') {
        setPhase('input')
      }
    } else {
      setPhase('birth-input')
    }
  }, [profileLoading, userProfile, guestBirthInfo, phase, setPhase])

  // Handle birth info submission
  const onBirthInfoSubmit = React.useCallback(
    async (birthInfo: {
      birthDate: string
      birthTime: string
      gender: 'M' | 'F'
      birthCity?: string
    }) => {
      await handleBirthInfoSubmit(birthInfo)
      setPhase('input')
    },
    [handleBirthInfoSubmit, setPhase]
  )

  // Handle prediction submission
  const onPredictionSubmit = React.useCallback(
    async (question: string, eventType: EventType | null) => {
      setCurrentQuestion(question)
      setCurrentEventType(eventType)
      setPhase('analyzing')
      setError(null)
      setGeneralAdvice('')

      const result = await submitPrediction(question, eventType)

      if (result) {
        setResults(result.periods)
        setGeneralAdvice(result.generalAdvice)
        setPhase('result')
      } else {
        setPhase('input')
      }
    },
    [
      setCurrentQuestion,
      setCurrentEventType,
      setPhase,
      setError,
      setGeneralAdvice,
      submitPrediction,
      setResults,
    ]
  )

  // Get birth info for display
  const birthDate = userProfile?.birthDate || guestBirthInfo?.birthDate
  const gender = userProfile?.gender || guestBirthInfo?.gender

  // Loading state
  if (profileLoading) {
    return (
      <div className={styles.container}>
        <canvas ref={canvasRef} className={styles.backgroundCanvas} />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>{locale === 'ko' ? '...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.backgroundCanvas} />
      <BackButton />

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          {/* Phase 1: Birth input */}
          {phase === 'birth-input' && (
            <BirthInputPhase
              locale={locale as 'ko' | 'en'}
              status={status}
              signInUrl={signInUrl}
              onSubmit={onBirthInfoSubmit}
            />
          )}

          {/* Phase 2: Question input */}
          {phase === 'input' && (
            <QuestionInputPhase
              birthDate={birthDate}
              gender={gender}
              locale={locale}
              error={error}
              onChangeBirthInfo={handleChangeBirthInfo}
              onSubmit={onPredictionSubmit}
            />
          )}

          {/* Phase 3: Analyzing */}
          {phase === 'analyzing' && <AnalyzingPhase eventType={currentEventType} />}

          {/* Phase 4: Results */}
          {phase === 'result' && (
            <ResultsPhase
              birthDate={birthDate}
              gender={gender}
              currentQuestion={currentQuestion}
              currentEventType={currentEventType}
              results={results}
              locale={locale as 'ko' | 'en'}
              isAuthenticated={status === 'authenticated'}
              onChangeBirthInfo={handleChangeBirthInfo}
              onSubmit={onPredictionSubmit}
              onAskAgain={handleAskAgain}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
