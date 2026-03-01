'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import DateTimePicker from '@/components/ui/DateTimePicker'
import TimePicker from '@/components/ui/TimePicker'
import { GenderSelector } from './GenderSelector'
import { ProfileLoader } from './ProfileLoader'
import { CitySearchField } from './CitySearchField'
import { formatCityForDropdown, localizeStoredCity } from '@/lib/cities/formatter'
import { logger } from '@/lib/logger'
import styles from './UnifiedBirthForm.module.css'

export interface BirthInfo {
  birthDate: string
  birthTime: string
  gender?: 'M' | 'F' | 'Male' | 'Female'
  birthCity?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

interface UnifiedBirthFormProps {
  onSubmit: (birthInfo: BirthInfo) => void
  onProfileLoaded?: (birthInfo: BirthInfo) => void
  onChange?: (birthInfo: BirthInfo) => void
  locale?: 'ko' | 'en'
  initialData?: Partial<BirthInfo>

  // Configuration options
  includeProfileLoader?: boolean
  includeCity?: boolean
  includeCityToggle?: boolean
  allowTimeUnknown?: boolean
  includeTime?: boolean
  includeGender?: boolean
  genderFormat?: 'short' | 'long' // 'M'/'F' or 'Male'/'Female'

  // Custom labels and texts
  submitButtonText?: string
  submitButtonIcon?: string
  loadingButtonText?: string

  // Custom styling
  showHeader?: boolean
  headerIcon?: string
  headerTitle?: string
  headerSubtitle?: string
}

export function UnifiedBirthForm({
  onSubmit,
  onProfileLoaded,
  onChange,
  locale = 'ko',
  initialData,
  includeProfileLoader = true,
  includeCity = true,
  includeCityToggle = false,
  allowTimeUnknown = true,
  includeTime = true,
  includeGender = true,
  genderFormat = 'short',
  submitButtonText,
  submitButtonIcon = '✨',
  loadingButtonText,
  showHeader = true,
  headerIcon = '🎂',
  headerTitle,
  headerSubtitle,
}: UnifiedBirthFormProps) {
  const { status } = useSession()
  const localizeCityForUI = useCallback(
    (city: string | null | undefined) => localizeStoredCity(city, locale),
    [locale]
  )

  // Form state
  const [birthDate, setBirthDate] = useState(initialData?.birthDate || '')
  const [birthTime, setBirthTime] = useState(initialData?.birthTime || '')
  const [timeUnknown, setTimeUnknown] = useState(
    includeTime ? !initialData?.birthTime && allowTimeUnknown : true
  )
  const [gender, setGender] = useState<'M' | 'F' | 'Male' | 'Female'>(
    initialData?.gender || (genderFormat === 'long' ? 'Male' : 'M')
  )
  const [birthCity, setBirthCity] = useState(() => localizeCityForUI(initialData?.birthCity))
  const [showCityInput, setShowCityInput] = useState(
    includeCityToggle ? !!initialData?.birthCity : includeCity
  )
  const [cityData, setCityData] = useState<{
    latitude?: number
    longitude?: number
    timezone?: string
  }>({
    latitude: initialData?.latitude,
    longitude: initialData?.longitude,
    timezone: initialData?.timezone,
  })

  // Profile loading states
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false)

  // Submission state
  const [submitting, setSubmitting] = useState(false)

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
        logger.info('[UnifiedBirthForm] Loaded profile:', {
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
          setBirthTime(user.birthTime)
          setTimeUnknown(false)
        } else if (allowTimeUnknown) {
          setTimeUnknown(true)
        }

        // Set gender with proper format (only if gender is included)
        if (includeGender && user.gender) {
          if (genderFormat === 'long') {
            setGender(user.gender === 'M' ? 'Male' : user.gender === 'F' ? 'Female' : 'Male')
          } else {
            setGender(user.gender === 'M' || user.gender === 'F' ? user.gender : 'M')
          }
        }

        // Set birth city
        if ((includeCity || includeCityToggle) && user.birthCity && user.birthCity.trim() !== '') {
          setBirthCity(localizeCityForUI(user.birthCity))
          if (includeCityToggle) {
            setShowCityInput(true)
          }

          // Set city coordinates if available
          if (user.latitude && user.longitude) {
            setCityData({
              latitude: user.latitude,
              longitude: user.longitude,
              timezone: user.tzId,
            })
          }
        }

        setProfileLoaded(true)

        if (onProfileLoaded) {
          const loadedBirthInfo: BirthInfo = {
            birthDate: user.birthDate,
            birthTime:
              includeTime && user.birthTime && user.birthTime.trim() !== ''
                ? user.birthTime
                : '12:00',
            ...(includeGender
              ? {
                  gender:
                    genderFormat === 'long'
                      ? user.gender === 'F'
                        ? 'Female'
                        : 'Male'
                      : user.gender === 'F'
                        ? 'F'
                        : 'M',
                }
              : {}),
            ...(includeCity || includeCityToggle
              ? {
                  birthCity: user.birthCity ? localizeCityForUI(user.birthCity) : undefined,
                  latitude: typeof user.latitude === 'number' ? Number(user.latitude) : undefined,
                  longitude:
                    typeof user.longitude === 'number' ? Number(user.longitude) : undefined,
                  timezone: user.tzId || undefined,
                }
              : {}),
          }
          onProfileLoaded(loadedBirthInfo)
        }
      } catch (err) {
        logger.error('[UnifiedBirthForm] Failed to load profile:', err)
        if (!isAutoLoad) {
          setLoadError(locale === 'ko' ? '프로필 로드 실패' : 'Profile load failed')
        }
      } finally {
        setLoadingProfile(false)
      }
    },
    [
      status,
      onProfileLoaded,
      locale,
      allowTimeUnknown,
      includeTime,
      includeGender,
      genderFormat,
      includeCity,
      includeCityToggle,
      localizeCityForUI,
    ]
  )

  // Auto-load profile when user is authenticated
  useEffect(() => {
    if (
      includeProfileLoader &&
      status === 'authenticated' &&
      !autoLoadAttempted &&
      !profileLoaded &&
      !initialData?.birthDate
    ) {
      setAutoLoadAttempted(true)
      handleLoadProfile(true)
    }
  }, [
    includeProfileLoader,
    status,
    autoLoadAttempted,
    profileLoaded,
    initialData,
    handleLoadProfile,
  ])

  const handleCitySelect = (city: {
    name: string
    country: string
    lat: number
    lon: number
    timezone?: string
    displayKr?: string
    displayEn?: string
  }) => {
    const displayName =
      locale === 'ko'
        ? city.displayKr || formatCityForDropdown(city.name, city.country, 'ko')
        : city.displayEn || formatCityForDropdown(city.name, city.country, 'en')
    setBirthCity(displayName)
    setCityData({
      latitude: city.lat,
      longitude: city.lon,
      timezone: city.timezone,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!birthDate) {
      return
    }

    setSubmitting(true)

    const birthInfo: BirthInfo = {
      birthDate,
      birthTime: includeTime ? (timeUnknown ? '12:00' : birthTime || '12:00') : '12:00',
      ...(includeGender ? { gender } : {}),
      ...(includeCity || includeCityToggle
        ? {
            birthCity: showCityInput ? birthCity : undefined,
            latitude: showCityInput ? cityData.latitude : undefined,
            longitude: showCityInput ? cityData.longitude : undefined,
            timezone: showCityInput ? cityData.timezone : undefined,
          }
        : {}),
    }

    try {
      await onSubmit(birthInfo)
    } finally {
      setSubmitting(false)
    }
  }

  const defaultSubmitText = locale === 'ko' ? '시작하기' : 'Get Started'
  const defaultLoadingText = locale === 'ko' ? '처리 중...' : 'Processing...'
  const defaultHeaderTitle = locale === 'ko' ? '생년월일을 입력해주세요' : 'Enter Your Birth Info'
  const defaultHeaderSubtitle =
    locale === 'ko' ? '정확한 예측을 위해 필요한 정보입니다' : 'Required for accurate predictions'

  const isFormValid =
    birthDate &&
    (!includeTime || timeUnknown || birthTime) &&
    (!includeCity || !showCityInput || birthCity)

  useEffect(() => {
    if (!onChange || !birthDate) return

    const birthInfo: BirthInfo = {
      birthDate,
      birthTime: includeTime ? (timeUnknown ? '12:00' : birthTime || '12:00') : '12:00',
      ...(includeGender ? { gender } : {}),
      ...(includeCity || includeCityToggle
        ? {
            birthCity: showCityInput ? birthCity : undefined,
            latitude: showCityInput ? cityData.latitude : undefined,
            longitude: showCityInput ? cityData.longitude : undefined,
            timezone: showCityInput ? cityData.timezone : undefined,
          }
        : {}),
    }
    onChange(birthInfo)
  }, [
    onChange,
    birthDate,
    birthTime,
    timeUnknown,
    includeTime,
    includeGender,
    gender,
    includeCity,
    includeCityToggle,
    showCityInput,
    birthCity,
    cityData.latitude,
    cityData.longitude,
    cityData.timezone,
  ])

  return (
    <div className={styles.container}>
      {showHeader && (
        <div className={styles.header}>
          <span className={styles.icon}>{headerIcon}</span>
          <h3 className={styles.title}>{headerTitle || defaultHeaderTitle}</h3>
          <p className={styles.subtitle}>{headerSubtitle || defaultHeaderSubtitle}</p>
        </div>
      )}

      {includeProfileLoader && (
        <ProfileLoader
          status={status}
          onLoadClick={() => handleLoadProfile(false)}
          onReloadClick={() => handleLoadProfile(false)}
          isLoading={loadingProfile}
          isLoaded={profileLoaded}
          error={loadError}
          showPrompt={showProfilePrompt}
          locale={locale}
        />
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
        {includeGender && (
          <div className={styles.fieldGroup}>
            <GenderSelector
              value={gender}
              onChange={setGender}
              locale={locale}
              outputFormat={genderFormat}
            />
          </div>
        )}

        {/* Birth Time */}
        {includeTime && (
          <div className={styles.fieldGroup}>
            <TimePicker
              value={birthTime}
              onChange={setBirthTime}
              label={locale === 'ko' ? '태어난 시간' : 'Birth Time'}
              disabled={timeUnknown}
              required={!allowTimeUnknown}
              locale={locale}
            />
            {allowTimeUnknown && (
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
            )}
          </div>
        )}

        {/* Birth City */}
        {includeCityToggle && (
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
              <div className={styles.cityInputWrapper}>
                <CitySearchField
                  value={birthCity}
                  onChange={setBirthCity}
                  onCitySelect={handleCitySelect}
                  locale={locale}
                  required={false}
                />
              </div>
            )}
          </div>
        )}

        {includeCity && !includeCityToggle && (
          <div className={styles.fieldGroup}>
            <CitySearchField
              value={birthCity}
              onChange={setBirthCity}
              onCitySelect={handleCitySelect}
              locale={locale}
              required={true}
            />
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className={styles.submitBtn} disabled={!isFormValid || submitting}>
          {submitting ? (
            <>
              <div className={styles.buttonSpinner} />
              <span>{loadingButtonText || defaultLoadingText}</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">{submitButtonIcon}</span>
              <span>{submitButtonText || defaultSubmitText}</span>
            </>
          )}
        </button>

        {!submitting && !isFormValid && (
          <p className={styles.submitHint} role="status">
            {locale === 'ko'
              ? '* 필수 항목을 모두 입력해주세요'
              : '* Please fill in all required fields'}
          </p>
        )}
      </form>
    </div>
  )
}
