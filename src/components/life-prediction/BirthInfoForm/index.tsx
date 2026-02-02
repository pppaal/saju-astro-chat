'use client'

import React, { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import DateTimePicker from '@/components/ui/DateTimePicker'
import TimePicker from '@/components/ui/TimePicker'
import styles from './BirthInfoForm.module.css'
import { logger } from '@/lib/logger'

interface BirthInfo {
  birthDate: string
  birthTime: string
  gender: 'M' | 'F'
  birthCity?: string
}

interface BirthInfoFormProps {
  onSubmit: (birthInfo: BirthInfo) => void
  locale?: 'ko' | 'en'
  initialData?: Partial<BirthInfo>
}

// 12시진 (Korean traditional time periods)
const TIME_PERIODS = [
  { id: 'unknown', label: '모름', labelEn: "Don't know", time: '12:00' },
  { id: 'ja', label: '자시 (23:00-01:00)', labelEn: 'Ja (23:00-01:00)', time: '00:00' },
  { id: 'chuk', label: '축시 (01:00-03:00)', labelEn: 'Chuk (01:00-03:00)', time: '02:00' },
  { id: 'in', label: '인시 (03:00-05:00)', labelEn: 'In (03:00-05:00)', time: '04:00' },
  { id: 'myo', label: '묘시 (05:00-07:00)', labelEn: 'Myo (05:00-07:00)', time: '06:00' },
  { id: 'jin', label: '진시 (07:00-09:00)', labelEn: 'Jin (07:00-09:00)', time: '08:00' },
  { id: 'sa', label: '사시 (09:00-11:00)', labelEn: 'Sa (09:00-11:00)', time: '10:00' },
  { id: 'o', label: '오시 (11:00-13:00)', labelEn: 'O (11:00-13:00)', time: '12:00' },
  { id: 'mi', label: '미시 (13:00-15:00)', labelEn: 'Mi (13:00-15:00)', time: '14:00' },
  { id: 'sin', label: '신시 (15:00-17:00)', labelEn: 'Sin (15:00-17:00)', time: '16:00' },
  { id: 'yu', label: '유시 (17:00-19:00)', labelEn: 'Yu (17:00-19:00)', time: '18:00' },
  { id: 'sul', label: '술시 (19:00-21:00)', labelEn: 'Sul (19:00-21:00)', time: '20:00' },
  { id: 'hae', label: '해시 (21:00-23:00)', labelEn: 'Hae (21:00-23:00)', time: '22:00' },
]

// Helper to parse initial date
function parseInitialDate(dateStr?: string) {
  if (!dateStr) {
    return { year: '', month: '', day: '' }
  }
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return { year: parts[0], month: parts[1], day: parts[2] }
  }
  return { year: '', month: '', day: '' }
}

// Helper to find time period from time string
function findTimePeriodFromTime(timeStr?: string): string {
  if (!timeStr) {
    return 'unknown'
  }
  const [hours] = timeStr.split(':').map(Number)
  if (hours >= 23 || hours < 1) {
    return 'ja'
  }
  if (hours >= 1 && hours < 3) {
    return 'chuk'
  }
  if (hours >= 3 && hours < 5) {
    return 'in'
  }
  if (hours >= 5 && hours < 7) {
    return 'myo'
  }
  if (hours >= 7 && hours < 9) {
    return 'jin'
  }
  if (hours >= 9 && hours < 11) {
    return 'sa'
  }
  if (hours >= 11 && hours < 13) {
    return 'o'
  }
  if (hours >= 13 && hours < 15) {
    return 'mi'
  }
  if (hours >= 15 && hours < 17) {
    return 'sin'
  }
  if (hours >= 17 && hours < 19) {
    return 'yu'
  }
  if (hours >= 19 && hours < 21) {
    return 'sul'
  }
  if (hours >= 21 && hours < 23) {
    return 'hae'
  }
  return 'unknown'
}

// Generate year options (1920 to current year)
function generateYearOptions() {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= 1920; y--) {
    years.push(y)
  }
  return years
}

// Generate month options (1-12)
function generateMonthOptions() {
  return Array.from({ length: 12 }, (_, i) => i + 1)
}

// Generate day options based on year and month
function generateDayOptions(year: number, month: number) {
  if (!year || !month) {
    return Array.from({ length: 31 }, (_, i) => i + 1)
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
}

export function BirthInfoForm({ onSubmit, locale = 'ko', initialData }: BirthInfoFormProps) {
  const { status } = useSession()

  const [birthDate, setBirthDate] = useState(initialData?.birthDate || '')
  const [birthTime, setBirthTime] = useState(initialData?.birthTime || '')
  const [timeUnknown, setTimeUnknown] = useState(!initialData?.birthTime)
  const [gender, setGender] = useState<'M' | 'F'>(initialData?.gender || 'M')
  const [birthCity, setBirthCity] = useState(initialData?.birthCity || '')
  const [showCityInput, setShowCityInput] = useState(!!initialData?.birthCity)

  // Profile loading states
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false)

  // Check if date is valid
  const isDateValid = !!birthDate

  // Load profile from API
  const handleLoadProfile = useCallback(
    async (isAutoLoad = false) => {
      if (status !== 'authenticated') {
        return
      }

      setLoadingProfile(true)
      setLoadError(null)
      setShowProfilePrompt(false)

      try {
        const res = await fetch('/api/me/profile', { cache: 'no-store' })
        if (!res.ok) {
          if (!isAutoLoad) {
            setLoadError(locale === 'ko' ? '프로필을 불러올 수 없습니다' : 'Failed to load profile')
          }
          setLoadingProfile(false)
          return
        }

        const { user } = await res.json()
        logger.info('[BirthInfoForm] Loaded profile:', {
          birthDate: user?.birthDate,
          birthTime: user?.birthTime,
          gender: user?.gender,
        })

        if (!user || !user.birthDate) {
          if (isAutoLoad) {
            setShowProfilePrompt(true)
          } else {
            setLoadError(
              locale === 'ko'
                ? '저장된 프로필이 없습니다. My Journey에서 먼저 정보를 저장해주세요.'
                : 'No saved profile. Please save your info in My Journey first.'
            )
          }
          setLoadingProfile(false)
          return
        }

        // Set date
        setBirthDate(user.birthDate)

        // Set time
        if (user.birthTime && user.birthTime.trim() !== '') {
          logger.debug('[BirthInfoForm] Setting birthTime:', user.birthTime)
          setBirthTime(user.birthTime)
          setTimeUnknown(false)
        } else {
          setTimeUnknown(true)
        }

        if (user.gender) {
          setGender(user.gender === 'M' || user.gender === 'F' ? user.gender : 'M')
        }

        // Set birth city
        if (user.birthCity && user.birthCity.trim() !== '') {
          logger.debug('[BirthInfoForm] Setting birthCity:', user.birthCity)
          setBirthCity(user.birthCity)
          setShowCityInput(true)
        }

        setProfileLoaded(true);
      } catch (err) {
        logger.error('[BirthInfoForm] Failed to load profile:', err)
        if (!isAutoLoad) {
          setLoadError(locale === 'ko' ? '프로필 로드 실패' : 'Profile load failed')
        }
      } finally {
        setLoadingProfile(false)
      }
    },
    [status, locale]
  )

  // Auto-load profile when user is authenticated
  React.useEffect(() => {
    if (
      status === 'authenticated' &&
      !autoLoadAttempted &&
      !profileLoaded &&
      !initialData?.birthDate
    ) {
      setAutoLoadAttempted(true)
      handleLoadProfile(true)
    }
  }, [status, autoLoadAttempted, profileLoaded, initialData, handleLoadProfile])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDateValid) {
      return
    }

    onSubmit({
      birthDate,
      birthTime: timeUnknown ? '12:00' : birthTime || '12:00',
      gender,
      birthCity: showCityInput ? birthCity : undefined,
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>🎂</span>
        <h3 className={styles.title}>
          {locale === 'ko' ? '생년월일을 입력해주세요' : 'Enter Your Birth Info'}
        </h3>
        <p className={styles.subtitle}>
          {locale === 'ko'
            ? '정확한 예측을 위해 필요한 정보입니다'
            : 'Required for accurate predictions'}
        </p>
      </div>

      {/* Profile Prompt - No saved profile found */}
      {status === 'authenticated' && showProfilePrompt && !profileLoaded && (
        <div className={styles.profilePromptMsg}>
          <span className={styles.profilePromptIcon}>💡</span>
          <div className={styles.profilePromptText}>
            <strong>
              {locale === 'ko' ? '저장된 프로필이 없습니다.' : 'No saved profile found.'}
            </strong>
            <br />
            {locale === 'ko' ? (
              <>
                <a href="/myjourney" style={{ color: '#6366f1', textDecoration: 'underline' }}>
                  My Journey 프로필
                </a>
                에서 생년월일을 먼저 저장하면 다음부터 자동으로 입력됩니다.
              </>
            ) : (
              <>
                Save your birth info in{' '}
                <a href="/myjourney" style={{ color: '#6366f1', textDecoration: 'underline' }}>
                  My Journey Profile
                </a>{' '}
                to auto-fill next time.
              </>
            )}
          </div>
        </div>
      )}

      {/* Load Profile Button - Only for authenticated users */}
      {status === 'authenticated' && !profileLoaded && !showProfilePrompt && (
        <button
          type="button"
          className={styles.loadProfileBtn}
          onClick={() => handleLoadProfile(false)}
          disabled={loadingProfile}
        >
          <span className={styles.loadProfileIcon}>{loadingProfile ? '⏳' : '👤'}</span>
          <span className={styles.loadProfileText}>
            {loadingProfile
              ? locale === 'ko'
                ? '불러오는 중...'
                : 'Loading...'
              : locale === 'ko'
                ? '내 프로필 불러오기'
                : 'Load My Profile'}
          </span>
          <span className={styles.loadProfileArrow}>→</span>
        </button>
      )}

      {/* Profile loaded success message */}
      {status === 'authenticated' && profileLoaded && (
        <div className={styles.profileLoadedMsg}>
          <span className={styles.profileLoadedIcon}>✓</span>
          <span className={styles.profileLoadedText}>
            {locale === 'ko' ? '프로필 불러오기 완료!' : 'Profile loaded!'}
          </span>
        </div>
      )}

      {/* Error message */}
      {loadError && (
        <div className={styles.loadErrorMsg}>
          <span className={styles.loadErrorIcon}>⚠️</span>
          <span className={styles.loadErrorText}>{loadError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Birth Date */}
        <div className={styles.fieldGroup}>
          <DateTimePicker
            value={birthDate}
            onChange={setBirthDate}
            label={locale === 'ko' ? '생년월일' : 'Birth Date'}
            required
            locale={locale}
          />
        </div>

        {/* Gender */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {locale === 'ko' ? '성별' : 'Gender'}
            <span className={styles.required}>*</span>
          </label>
          <div className={styles.genderButtons}>
            <button
              type="button"
              className={`${styles.genderBtn} ${gender === 'M' ? styles.active : ''}`}
              onClick={() => setGender('M')}
            >
              <span>👨</span>
              <span>{locale === 'ko' ? '남성' : 'Male'}</span>
            </button>
            <button
              type="button"
              className={`${styles.genderBtn} ${gender === 'F' ? styles.active : ''}`}
              onClick={() => setGender('F')}
            >
              <span>👩</span>
              <span>{locale === 'ko' ? '여성' : 'Female'}</span>
            </button>
          </div>
        </div>

        {/* Birth Time */}
        <div className={styles.fieldGroup}>
          <TimePicker
            value={birthTime}
            onChange={setBirthTime}
            label={locale === 'ko' ? '태어난 시간' : 'Birth Time'}
            disabled={timeUnknown}
            locale={locale}
          />
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => {
                setTimeUnknown(e.target.checked)
                if (e.target.checked) {
                  setBirthTime('')
                }
              }}
              className={styles.checkbox}
            />
            <span>
              {locale === 'ko'
                ? '출생 시간을 모름 (정오 12:00으로 설정됩니다)'
                : 'Time unknown (will use 12:00 noon)'}
            </span>
          </label>
        </div>

        {/* Birth City Toggle */}
        <div className={styles.fieldGroup}>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowCityInput(!showCityInput)}
          >
            <span className={styles.toggleIcon}>{showCityInput ? '▼' : '▶'}</span>
            <span>{locale === 'ko' ? '태어난 도시 입력 (선택)' : 'Birth City (Optional)'}</span>
          </button>

          {showCityInput && (
            <div className={styles.timeInputWrapper}>
              <input
                type="text"
                value={birthCity}
                onChange={(e) => setBirthCity(e.target.value)}
                className={styles.input}
                placeholder={locale === 'ko' ? '예: 서울, 부산, Seoul' : 'e.g., Seoul, New York'}
              />
              <p className={styles.timeHint}>
                {locale === 'ko'
                  ? '더 정확한 분석을 위해 입력해주세요'
                  : 'For more accurate analysis'}
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button type="submit" className={styles.submitBtn} disabled={!isDateValid}>
          <span>✨</span>
          <span>{locale === 'ko' ? '시작하기' : 'Get Started'}</span>
        </button>
      </form>

      <p className={styles.privacyNote}>
        🔒{' '}
        {locale === 'ko'
          ? '입력하신 정보는 예측 분석에만 사용되며 저장되지 않습니다'
          : 'Your information is only used for analysis and is not stored'}
      </p>
    </div>
  )
}

export default BirthInfoForm
