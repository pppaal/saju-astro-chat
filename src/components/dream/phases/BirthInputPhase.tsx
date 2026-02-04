import React from 'react'
import { motion } from 'framer-motion'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { UnifiedBirthForm, type BirthInfo } from '@/components/common/BirthForm'
import styles from './BirthInputPhase.module.css'

interface BirthInputPhaseProps {
  locale: string
  status: string
  birthDate: string
  birthTime: string
  gender: 'M' | 'F'
  birthCity: string
  showTimeInput: boolean
  showCityInput: boolean
  onSubmit: (birthInfo: BirthInfo) => void
  onSkip: () => void
}

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
}

export function BirthInputPhase({
  locale,
  status,
  birthDate,
  birthTime,
  gender,
  birthCity,
  showTimeInput: _showTimeInput,
  showCityInput: _showCityInput,
  onSubmit,
  onSkip,
}: BirthInputPhaseProps) {
  const signInUrl = buildSignInUrl()
  const isKo = locale === 'ko'

  const handleFormSubmit = (birthInfo: BirthInfo) => {
    onSubmit(birthInfo)
  }

  return (
    <motion.div
      key="birth-input"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={styles.phaseContainer}
    >
      <div className={styles.pageHeader}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>🌙</span>
        </div>
        <h1 className={styles.pageTitle}>{isKo ? '꿈 해몽' : 'Dream Interpretation'}</h1>
        <p className={styles.pageSubtitle}>
          {isKo
            ? '당신의 꿈에 담긴 메시지를 해석해드립니다'
            : 'Discover the hidden messages in your dreams'}
        </p>
      </div>

      <div className={styles.birthFormCard}>
        {/* UnifiedBirthForm with Dream-specific configuration */}
        <UnifiedBirthForm
          onSubmit={handleFormSubmit}
          locale={locale as 'ko' | 'en'}
          initialData={{
            birthDate,
            birthTime,
            gender,
            birthCity,
          }}
          includeProfileLoader={true}
          includeCity={false}
          includeCityToggle={true}
          allowTimeUnknown={true}
          genderFormat="short"
          submitButtonText={isKo ? '다음으로' : 'Continue'}
          submitButtonIcon="✨"
          showHeader={true}
          headerIcon="🎂"
          headerTitle={isKo ? '생년월일을 입력해주세요' : 'Enter Your Birth Info'}
          headerSubtitle={
            isKo ? '정확한 해석을 위해 필요한 정보입니다' : 'Optional, but improves accuracy'
          }
        />

        {/* Skip button - Dream-specific feature */}
        <div className={styles.skipBirthRow}>
          <button type="button" className={styles.skipBirthButton} onClick={onSkip}>
            {isKo ? '생년월일 없이 진행' : 'Skip for now'}
          </button>
          <p className={styles.skipBirthHint}>
            {isKo
              ? '생년월일 없이도 기본적인 해석은 가능합니다'
              : 'You can continue without birth info, but accuracy may drop.'}
          </p>
        </div>

        {/* Login hint - Dream-specific feature */}
        {status === 'unauthenticated' && (
          <div className={styles.loginHint}>
            <p>
              {isKo
                ? '로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요'
                : 'Log in to save your info for a better experience'}
            </p>
            <a href={signInUrl} className={styles.loginLink}>
              {isKo ? '로그인하기' : 'Log in'}
            </a>
          </div>
        )}
      </div>
    </motion.div>
  )
}
