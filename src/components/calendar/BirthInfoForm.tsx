'use client'

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
          <h1 className={styles.pageTitle}>{locale === 'ko' ? '운명 캘린더' : 'Destiny Calendar'}</h1>
          <p className={styles.pageSubtitle}>
            {locale === 'ko'
              ? '생년월일 기준으로 월별 실행·검토 포인트를 정리해 드립니다'
              : 'Find your monthly execution and review windows from your birth data.'}
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
                ? '퀵 모드: 생년월일만으로 기본 흐름을 바로 확인할 수 있습니다.'
                : 'Quick mode: analysis with birth date only.'
              : locale === 'ko'
                ? '상세 모드: 태어난 시간·도시·성별까지 넣으면 타이밍 정확도가 올라갑니다.'
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
            submitButtonText={locale === 'ko' ? '월간 흐름 보기' : 'View Monthly Flow'}
            submitButtonIcon="✨"
            loadingButtonText={locale === 'ko' ? '분석 중...' : 'Analyzing...'}
            showHeader={false}
          />

          {status === 'unauthenticated' && (
            <div className={styles.loginHint}>
              <p>
                {locale === 'ko'
                  ? '로그인하면 입력 정보가 저장되어 다음 분석을 더 빠르게 이어갈 수 있습니다'
                  : 'Log in to save your info for a better experience'}
              </p>
              <a href={signInUrl} className={styles.loginLink}>
                {locale === 'ko' ? '로그인하기' : 'Log in'}
              </a>
            </div>
          )}
        </div>

        <div className={styles.quickTips}>
          <h4>{locale === 'ko' ? '💡 결과 해석 가이드' : '💡 How to read the result'}</h4>
          <ul>
            <li>
              {locale === 'ko'
                ? '🌟 최고 · ✨ 아주 좋음 — 실행·결정·발표를 앞세우기 좋은 날'
                : '🌟 Peak · ✨ Excellent — best days for execution, meetings, launches'}
            </li>
            <li>
              {locale === 'ko'
                ? '🌿 평범 — 평소 흐름 유지, 무리하지 않는 일상에 적합'
                : '🌿 Normal — steady flow days, good for routine work'}
            </li>
            <li>
              {locale === 'ko'
                ? '⚠ 조심 · 🛡 지키기 — 과로·충돌 점검, 큰 결정은 미루기 권장'
                : '⚠ Caution · 🛡 Hold — review risk, postpone major decisions'}
            </li>
            <li>
              {locale === 'ko'
                ? '날짜를 클릭하면 사주·점성 근거와 추천 행동을 바로 확인할 수 있어요'
                : 'Click any date to view Saju + Astrology evidence and action guidance'}
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
})

export default BirthInfoForm
