'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/i18n/I18nProvider'

// Dynamic import for framer-motion to reduce bundle size
const AnimatePresence = dynamic(() => import('framer-motion').then((mod) => mod.AnimatePresence), {
  ssr: false,
})
import BackButton from '@/components/ui/BackButton'
import CreditBadge from '@/components/ui/CreditBadge'
import { useDreamPhase } from '@/hooks/useDreamPhase'
import { useBirthInfo } from '@/hooks/useBirthInfo'
import { useDreamAnalysis } from '@/hooks/useDreamAnalysis'
import { useDreamChat } from '@/hooks/useDreamChat'
import { DreamBackground } from '@/components/dream/DreamBackground'
import { BirthInputPhase } from '@/components/dream/phases/BirthInputPhase'
import { DreamInputPhase } from '@/components/dream/phases/DreamInputPhase'
import { AnalyzingPhase } from '@/components/dream/phases/AnalyzingPhase'
import { DreamResultPhase } from '@/components/dream/result/DreamResultPhase'
import styles from './Dream.module.css'

export default function DreamPage() {
  return <DreamContent />
}

function DreamContent() {
  const { locale } = useI18n()
  const { status } = useSession()

  // Phase management - starts directly at dream-input
  const { phase, setPhase, profileLoading, userProfile, setUserProfile } = useDreamPhase()

  // Birth info management
  const birthInfo = useBirthInfo(locale)

  // Dream analysis
  const analysis = useDreamAnalysis(
    locale,
    userProfile || birthInfo.userProfile,
    birthInfo.guestBirthInfo
  )

  // Chat functionality
  const chat = useDreamChat(
    locale,
    analysis.dreamText,
    analysis.result,
    userProfile || birthInfo.userProfile,
    birthInfo.guestBirthInfo
  )

  // Sync userProfile from birthInfo to phase
  React.useEffect(() => {
    if (birthInfo.userProfile && !userProfile) {
      setUserProfile(birthInfo.userProfile)
    }
  }, [birthInfo.userProfile, userProfile, setUserProfile])

  // Handlers
  const handleBirthInfoSubmit = async (birthData: {
    birthDate: string
    birthTime: string
    gender: 'M' | 'F' | 'Male' | 'Female'
    birthCity?: string
  }) => {
    // Normalize gender to 'M' | 'F' format
    const normalizedGender =
      birthData.gender === 'Male' ? 'M' : birthData.gender === 'Female' ? 'F' : birthData.gender

    // Update birthInfo hook state
    birthInfo.setBirthDate(birthData.birthDate)
    birthInfo.setBirthTime(birthData.birthTime)
    birthInfo.setGender(normalizedGender)
    if (birthData.birthCity) {
      birthInfo.setBirthCity(birthData.birthCity)
    }

    const success = await birthInfo.saveBirthInfo()
    if (success) {
      setPhase('dream-input')
    }
  }

  const handleSkipBirthInfo = () => {
    birthInfo.skipBirthInfo()
    analysis.setError(null)
    setPhase('dream-input')
  }

  const handleDreamSubmit = async () => {
    setPhase('analyzing')
    const success = await analysis.analyzeDream()
    if (success) {
      setPhase('result')
    } else {
      setPhase('dream-input')
    }
  }

  const handleReset = () => {
    analysis.resetAnalysis()
    chat.resetChat()
    setPhase('dream-input')
  }

  const handleChangeBirthInfo = () => {
    birthInfo.resetBirthInfo()
    setUserProfile(null)
    setPhase('birth-input')
  }

  // Get current birth date for moon phase
  const currentBirthDate =
    userProfile?.birthDate ||
    birthInfo.userProfile?.birthDate ||
    birthInfo.guestBirthInfo?.birthDate ||
    birthInfo.birthDate

  // Loading state
  if (profileLoading) {
    return (
      <div className={styles.container}>
        <DreamBackground birthDate={currentBirthDate} />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>{locale === 'ko' ? '로딩 중...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <DreamBackground birthDate={currentBirthDate} />
      <BackButton />

      <main className={styles.main}>
        <div className={styles.creditBadgeWrapper}>
          <CreditBadge variant="compact" />
        </div>

        <AnimatePresence mode="wait">
          {phase === 'birth-input' && (
            <BirthInputPhase
              locale={locale}
              status={status}
              birthDate={birthInfo.birthDate}
              birthTime={birthInfo.birthTime}
              gender={birthInfo.gender}
              birthCity={birthInfo.birthCity}
              showTimeInput={birthInfo.showTimeInput}
              showCityInput={birthInfo.showCityInput}
              onSubmit={handleBirthInfoSubmit}
              onSkip={handleSkipBirthInfo}
            />
          )}

          {phase === 'dream-input' && (
            <DreamInputPhase
              locale={locale}
              userProfile={userProfile || birthInfo.userProfile}
              guestBirthInfo={birthInfo.guestBirthInfo}
              dreamText={analysis.dreamText}
              setDreamText={analysis.setDreamText}
              isLoading={analysis.isLoading}
              error={analysis.error}
              onChangeBirthInfo={handleChangeBirthInfo}
              onSubmit={handleDreamSubmit}
            />
          )}

          {phase === 'analyzing' && (
            <AnalyzingPhase locale={locale} hasBirthInfo={birthInfo.hasBirthInfo} />
          )}

          {phase === 'result' && analysis.result && (
            <DreamResultPhase
              locale={locale}
              result={analysis.result}
              dreamText={analysis.dreamText}
              chatMessages={chat.chatMessages}
              chatInput={chat.chatInput}
              setChatInput={chat.setChatInput}
              isChatLoading={chat.isChatLoading}
              chatMessagesRef={chat.chatMessagesRef}
              onSendMessage={chat.sendMessage}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
