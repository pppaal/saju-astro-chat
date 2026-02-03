'use client'

// src/components/calendar/BirthInfoForm.tsx
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { UnifiedBirthForm } from '@/components/common/BirthForm'
import styles from './DestinyCalendar.module.css'

interface BirthInfo {
  birthDate: string
  birthTime: string
  birthPlace: string
  gender: 'Male' | 'Female'
  latitude?: number
  longitude?: number
  timezone?: string
}

interface BirthInfoFormProps {
  birthInfo: BirthInfo
  setBirthInfo: (info: BirthInfo) => void
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  timeUnknown: boolean
  setTimeUnknown: (value: boolean) => void
}

const ICONS = {
  calendar: '📅',
} as const

export default function BirthInfoForm({
  birthInfo,
  setBirthInfo,
  onSubmit,
  submitting,
  timeUnknown,
  setTimeUnknown,
}: BirthInfoFormProps) {
  const { locale, t } = useI18n()
  const { status } = useSession()
  const signInUrl = buildSignInUrl()

  // Track if form is being submitted
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFormSubmit = async (formData: {
    birthDate: string
    birthTime: string
    gender: 'M' | 'F' | 'Male' | 'Female'
    birthCity?: string
    latitude?: number
    longitude?: number
    timezone?: string
  }) => {
    // Convert form data to parent's expected format
    setBirthInfo({
      birthDate: formData.birthDate,
      birthTime: formData.birthTime,
      birthPlace: formData.birthCity || '',
      gender:
        formData.gender === 'M' ? 'Male' : formData.gender === 'F' ? 'Female' : formData.gender,
      latitude: formData.latitude,
      longitude: formData.longitude,
      timezone: formData.timezone,
    })

    // Trigger parent's submit handler after a brief delay to ensure state is updated
    setTimeout(() => {
      const fakeEvent = new Event('submit') as unknown as React.FormEvent
      onSubmit(fakeEvent)
    }, 0)
  }

  return (
    <div className={styles.introContainer}>
      <BackButton />

      <main className={styles.introMain}>
        <div className={styles.pageHeader}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>{ICONS.calendar}</span>
          </div>
          <h1 className={styles.pageTitle}>{t('calendar.pageTitle', 'Destiny Calendar')}</h1>
          <p className={styles.pageSubtitle}>
            {t(
              'calendar.pageSubtitle',
              'Cross-analyze Eastern and Western fortune to find your important dates'
            )}
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
            submitButtonText={t('calendar.analyzeButton', 'View Destiny Calendar')}
            submitButtonIcon="✨"
            loadingButtonText={t('calendar.analyzingButton', 'Analyzing...')}
            showHeader={true}
            headerIcon="🎂"
            headerTitle={t('calendar.formTitle', 'Enter Your Birth Info')}
            headerSubtitle={t('calendar.formSubtitle', 'Required for accurate analysis')}
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
          <h4>{locale === 'ko' ? '💡 이런 분들께 추천해요' : '💡 Recommended for'}</h4>
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
}
