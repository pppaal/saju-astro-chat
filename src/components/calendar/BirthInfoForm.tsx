'use client'

// src/components/calendar/BirthInfoForm.tsx
// Consolidated BirthInfoForm component with optional canvas support
import React, { memo, RefObject, useState } from 'react'
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
  const [isQuickMode, setIsQuickMode] = useState(true)

  const handleFormSubmit = async (formData: UnifiedBirthInfo) => {
    // Convert form data to parent's expected format
    const genderValue = formData.gender || 'M'
    const normalizedBirthInfo: BirthInfo = {
      birthDate: formData.birthDate,
      birthTime: formData.birthTime,
      birthPlace: formData.birthCity || 'Seoul',
      gender: genderValue === 'M' ? 'Male' : genderValue === 'F' ? 'Female' : genderValue,
      latitude: formData.latitude,
      longitude: formData.longitude,
      timezone: formData.timezone,
    }

    await onSubmit(normalizedBirthInfo)
  }

  return (
    <div className={styles.introContainer}>
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
              ? '생년월일 기반으로 월별 좋은 날/주의할 날을 정리해 드립니다'
              : 'Find your monthly best days and caution days from your birth data.'}
          </p>
        </div>

        <div className={styles.birthFormCard}>
          <div className={styles.viewTabs} role="tablist" aria-label="calendar input mode">
            <button
              type="button"
              role="tab"
              aria-selected={isQuickMode}
              className={`${styles.viewTab} ${isQuickMode ? styles.viewTabActive : ''}`}
              onClick={() => setIsQuickMode(true)}
            >
              {locale === 'ko' ? '퀵 모드' : 'Quick'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isQuickMode}
              className={`${styles.viewTab} ${!isQuickMode ? styles.viewTabActive : ''}`}
              onClick={() => setIsQuickMode(false)}
            >
              {locale === 'ko' ? '상세 모드' : 'Detailed'}
            </button>
          </div>
          <p className={styles.tabHelperText}>
            {isQuickMode
              ? locale === 'ko'
                ? '퀵 모드: 생년월일만 입력해도 결과를 바로 확인할 수 있어요.'
                : 'Quick mode: analysis with birth date only.'
              : locale === 'ko'
                ? '상세 모드: 태어난 시간/도시/성별까지 입력하면 정확도가 올라가요.'
                : 'Detailed mode: add time, city, and gender for precision.'}
          </p>

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
            includeCity={!isQuickMode}
            includeTime={!isQuickMode}
            includeGender={!isQuickMode}
            allowTimeUnknown={true}
            genderFormat="long"
            submitButtonText={locale === 'ko' ? '운명의 날 찾기' : 'Find Your Destiny Days'}
            submitButtonIcon="✨"
            loadingButtonText={locale === 'ko' ? '분석 중...' : 'Analyzing...'}
            showHeader={true}
            headerIcon="🎂"
            headerTitle={locale === 'ko' ? '생년월일을 입력해주세요' : 'Enter Your Birth Info'}
            headerSubtitle={
              locale === 'ko'
                ? '생년월일만으로 시작 가능, 상세 입력 시 정확도 향상'
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
          <h4>{locale === 'ko' ? '💡 결과 해석 가이드' : '💡 How to read the result'}</h4>
          <ul>
            <li>
              {locale === 'ko'
                ? '초록/파랑 계열 날짜: 실행·미팅·발표 일정 추천'
                : 'Blue/green days: better for execution, meetings, launches'}
            </li>
            <li>
              {locale === 'ko'
                ? '주황/빨강 계열 날짜: 과로·충돌 가능성 점검 후 일정 조정'
                : 'Orange/red days: check risk and reduce overload or conflict'}
            </li>
            <li>
              {locale === 'ko'
                ? '선택한 날짜를 클릭하면 상세 설명·추천 행동을 바로 확인'
                : 'Click a date to view detailed reasons and action guidance'}
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
