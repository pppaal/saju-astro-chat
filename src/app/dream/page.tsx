'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { AnimatePresence } from 'framer-motion'
import { useI18n } from '@/i18n/I18nProvider'
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
  const handleBirthInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
              setBirthDate={birthInfo.setBirthDate}
              birthTime={birthInfo.birthTime}
              setBirthTime={birthInfo.setBirthTime}
              gender={birthInfo.gender}
              setGender={birthInfo.setGender}
              birthCity={birthInfo.birthCity}
              setBirthCity={birthInfo.setBirthCity}
              showTimeInput={birthInfo.showTimeInput}
              setShowTimeInput={birthInfo.setShowTimeInput}
              showCityInput={birthInfo.showCityInput}
              setShowCityInput={birthInfo.setShowCityInput}
              loadingProfileBtn={birthInfo.loadingProfileBtn}
              profileLoadedMsg={birthInfo.profileLoadedMsg}
              profileLoadError={birthInfo.profileLoadError}
              showProfilePrompt={birthInfo.showProfilePrompt}
              onLoadProfile={birthInfo.loadProfile}
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
