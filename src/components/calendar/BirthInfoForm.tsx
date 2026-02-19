'use client'

// src/components/calendar/BirthInfoForm.tsx
// Consolidated BirthInfoForm component with optional canvas support
import React, { memo, RefObject } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { UnifiedBirthForm, BirthInfo as UnifiedBirthInfo } from '@/components/common/BirthForm'
import styles from './DestinyCalendar.module.css'
import { ICONS } from './constants'
import type { BirthInfo } from './types'

interface BirthInfoFormProps {
  /** Optional canvas ref for particle animation */
  canvasRef?: RefObject<HTMLCanvasElement | null>
  birthInfo: BirthInfo
  onSubmit: (birthInfo: BirthInfo) => void | Promise<void>
}

const BirthInfoForm = memo(function BirthInfoForm({
  canvasRef,
  birthInfo,
  onSubmit,
}: BirthInfoFormProps) {
  const { locale } = useI18n()
  const { status } = useSession()
  const signInUrl = buildSignInUrl()

  const handleFormSubmit = async (formData: UnifiedBirthInfo) => {
    // Convert form data to parent's expected format
    const genderValue = formData.gender || 'M'
    const normalizedBirthInfo: BirthInfo = {
      birthDate: formData.birthDate,
      birthTime: formData.birthTime,
      birthPlace: formData.birthCity || '',
      gender: genderValue === 'M' ? 'Male' : genderValue === 'F' ? 'Female' : genderValue,
      latitude: formData.latitude,
      longitude: formData.longitude,
      timezone: formData.timezone,
    }

    await onSubmit(normalizedBirthInfo)
  }

  return (
    <div className={`${styles.introContainer} ${styles.largeTextMode}`}>
      {canvasRef && <canvas ref={canvasRef} className={styles.particleCanvas} />}
      <BackButton />

      <main className={styles.introMain}>
        <div className={styles.pageHeader}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>{ICONS.calendar}</span>
          </div>
          <h1 className={styles.pageTitle}>
            {locale === 'ko' ? '운명 캘린더' : 'Destiny Calendar'}
          </h1>
          <p className={styles.pageSubtitle}>
            {locale === 'ko'
              ? '동서양 운세를 교차 분석하여 당신만의 중요한 날짜를 찾아드립니다'
              : 'Cross-analyze Eastern and Western fortune to find your important dates'}
          </p>
        </div>

        <div className={styles.birthFormCard}>
          <UnifiedBirthForm
            onSubmit={handleFormSubmit}
            locale={locale as 'ko' | 'en'}
            initialData={{
              birthDate: birthInfo.birthDate,
              birthTime: birthInfo.birthTime,
              gender: birthInfo.gender,
              birthCity: birthInfo.birthPlace,
              latitude: birthInfo.latitude,
              longitude: birthInfo.longitude,
              timezone: birthInfo.timezone,
            }}
            includeProfileLoader={true}
            includeCity={true}
            allowTimeUnknown={true}
            genderFormat="long"
            submitButtonText={locale === 'ko' ? '운명의 날 찾기' : 'Find Your Destiny Days'}
            submitButtonIcon=">"
            loadingButtonText={locale === 'ko' ? '분석 중...' : 'Analyzing...'}
            showHeader={true}
            headerIcon="Info"
            headerTitle={locale === 'ko' ? '생년월일을 입력해주세요' : 'Enter Your Birth Info'}
            headerSubtitle={
              locale === 'ko'
                ? '정확한 분석을 위해 필요한 정보입니다'
                : 'Required for accurate analysis'
            }
          />

          {status === 'unauthenticated' && (
            <div className={styles.loginHint}>
              <p>
                {locale === 'ko'
                  ? '로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요'
                  : 'Log in to save your info for a better experience'}
              </p>
              <a href={signInUrl} className={styles.loginLink}>
                {locale === 'ko' ? '로그인하기' : 'Log in'}
              </a>
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className={styles.quickTips}>
          <h4>{locale === 'ko' ? '이런 분들께 추천해요' : 'Recommended for'}</h4>
          <ul>
            <li>{locale === 'ko' ? '중요한 일정을 잡아야 할 때' : 'Planning important events'}</li>
            <li>
              {locale === 'ko'
                ? '좋은 날과 조심할 날을 알고 싶을 때'
                : 'Know your best and caution days'}
            </li>
            <li>
              {locale === 'ko'
                ? '사주와 점성술을 함께 참고하고 싶을 때'
                : 'Want both Saju and Astrology insights'}
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
})

export default BirthInfoForm

// Backward compatibility alias
export { BirthInfoForm as BirthInfoFormInline }
