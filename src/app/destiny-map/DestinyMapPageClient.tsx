'use client'

import React, { useEffect, useCallback, useReducer } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import {
  getPathValue,
  isPlaceholderTranslation,
  toSafeFallbackText,
  type I18nMessages,
} from '@/i18n/utils'
import { normalizeGender } from '@/lib/utils/gender'
import styles from './destiny-map.module.css'
import { logger } from '@/lib/logger'
import DateTimePicker from '@/components/ui/DateTimePicker'
import {
  type CityHit,
  formReducer,
  initialFormState,
  loadCitiesModule,
  loadTimezoneModule,
  extractCityPart,
  resolveCityTimezone,
} from './useDestinyForm'
import { useDestinyProfile } from './useDestinyProfile'

const CreditBadge = dynamic(() => import('@/components/ui/CreditBadge'), { ssr: false })
const BackButton = dynamic(() => import('@/components/ui/BackButton'), { ssr: false })
const ParticleBackground = dynamic(() => import('@/components/destiny-map/ParticleBackground'), {
  ssr: false,
})

type Locale = 'en' | 'ko'

interface DestinyMapPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
}

export default function DestinyMapPageClient({
  initialLocale,
  initialMessages,
}: DestinyMapPageClientProps) {
  return <DestinyMapContent initialLocale={initialLocale} initialMessages={initialMessages} />
}

function DestinyMapContent({
  initialLocale,
  initialMessages,
}: {
  initialLocale: Locale
  initialMessages: I18nMessages
}) {
  const router = useRouter()
  const { t, locale: activeLocale } = useI18n()
  const locale = activeLocale || initialLocale
  const isKo = locale === 'ko'
  const { status } = useSession()
  const safeT = useCallback(
    (path: string, fallback?: string) => {
      const translated = t(path, fallback)
      if (isPlaceholderTranslation(translated, path)) {
        const serverValue = getPathValue(initialMessages, path)
        if (typeof serverValue === 'string' && !isPlaceholderTranslation(serverValue, path)) {
          return serverValue
        }
        return fallback || toSafeFallbackText(path)
      }
      return translated
    },
    [t, initialMessages]
  )

  const [form, dispatch] = useReducer(formReducer, initialFormState)

  useEffect(() => {
    let active = true
    const resolveTimezone = async () => {
      try {
        const { getUserTimezone } = await loadTimezoneModule()
        if (active) {
          dispatch({
            type: 'SET_FIELD',
            field: 'userTimezone',
            value: getUserTimezone() || 'Asia/Seoul',
          })
        }
      } catch {
        if (active) {
          dispatch({ type: 'SET_FIELD', field: 'userTimezone', value: 'Asia/Seoul' })
        }
      }
    }
    // Detect timezone on client side only (SSRì—ì„œ ì„œë²„ íƒ€ìž„ì¡´ ë°©ì§€)
    resolveTimezone()
    return () => {
      active = false
    }
  }, [])

  const { handleLoadProfile } = useDestinyProfile(
    status,
    dispatch,
    safeT,
    form.profileLoaded,
    form.loadingProfile
  )

  // City search with debounce
  useEffect(() => {
    const raw = form.city.trim()
    const q = extractCityPart(raw)
    if (q.length < 1) {
      dispatch({ type: 'SET_FIELD', field: 'suggestions', value: [] })
      return
    }
    const timer = setTimeout(async () => {
      try {
        logger.info('[DestinyMap] Searching cities for:', q)
        const { searchCities } = await loadCitiesModule()
        const hits = (await searchCities(q, { limit: 8 })) as CityHit[]
        logger.info('[DestinyMap] City search results:', hits)
        dispatch({ type: 'SET_FIELD', field: 'suggestions', value: hits })
        // Only open dropdown if user is actively typing
        if (form.isUserTyping) {
          dispatch({ type: 'SET_FIELD', field: 'openSug', value: hits.length > 0 })
        }
      } catch (err) {
        logger.error('[DestinyMap] City search error:', err)
        dispatch({ type: 'SET_FIELD', field: 'suggestions', value: [] })
      }
    }, 120)
    return () => clearTimeout(timer)
  }, [form.city, form.isUserTyping])

  // City lookup for coordinates
  useEffect(() => {
    const tryFindCity = async () => {
      const q = extractCityPart(form.city)
      if (!q) {
        return
      }
      try {
        const { searchCities } = await loadCitiesModule()
        const hits = (await searchCities(q, { limit: 1 })) as CityHit[]
        if (hits && hits[0]) {
          const hit = hits[0]
          const timezone = await resolveCityTimezone(hit)
          dispatch({ type: 'SET_FIELD', field: 'selectedCity', value: { ...hit, timezone } })
        }
      } catch (err) {
        logger.warn('[DestinyMap] city lookup failed', err)
      }
    }
    tryFindCity()
  }, [form.city])

  const onPick = useCallback((hit: CityHit) => {
    dispatch({
      type: 'PICK_CITY',
      city: `${hit.name}, ${hit.country}`,
      selectedCity: { ...hit, timezone: hit.timezone },
    })
    resolveCityTimezone(hit)
      .then((timezone) => {
        dispatch({
          type: 'UPDATE_SELECTED_CITY_TZ',
          name: hit.name,
          country: hit.country,
          timezone,
        })
      })
      .catch(() => {})
  }, [])

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      dispatch({ type: 'SET_FIELD', field: 'cityErr', value: null })

      const lat = form.selectedCity?.lat?.toString() ?? ''
      const lon = form.selectedCity?.lon?.toString() ?? ''
      let tz = form.selectedCity?.timezone ?? 'Asia/Seoul'
      if (form.selectedCity && !form.selectedCity.timezone) {
        try {
          tz = await resolveCityTimezone(form.selectedCity)
        } catch {}
      }

      if (!form.birthDate || !form.birthTime || !form.city) {
        dispatch({
          type: 'SET_FIELD',
          field: 'cityErr',
          value: safeT('error.allFieldsRequired', 'All fields are required'),
        })
        return
      }
      if (!form.selectedCity || !form.selectedCity.lat || !form.selectedCity.lon) {
        dispatch({
          type: 'SET_FIELD',
          field: 'cityErr',
          value: safeT('error.selectValidCity', 'Please select a valid city from the list'),
        })
        return
      }

      const params = new URLSearchParams()
      params.set('name', form.name || '')
      params.set('birthDate', form.birthDate || '')
      params.set('birthTime', form.birthTime || '')
      params.set('city', form.city || '')
      const apiGender = normalizeGender(form.gender)
      params.set('gender', apiGender || '')
      params.set('lang', locale || 'ko')
      params.set('latitude', lat)
      params.set('longitude', lon)
      if (tz) {
        params.set('tz', tz)
      }
      params.set('userTz', form.userTimezone) // ì‚¬ìš©ìž í˜„ìž¬ íƒ€ìž„ì¡´ (ìš´ì„¸ ë‚ ì§œìš©)

      // Save user profile for reuse across services
      const { saveUserProfile } = await import('@/lib/userProfile')
      saveUserProfile({
        name: form.name || undefined,
        birthDate: form.birthDate || undefined,
        birthTime: form.birthTime || undefined,
        birthCity: form.city || undefined,
        gender: form.gender as 'Male' | 'Female' | 'Other' | 'Prefer not to say',
        timezone: tz || undefined,
        latitude: form.selectedCity?.lat,
        longitude: form.selectedCity?.lon,
      })

      // í…Œë§ˆ ì„ íƒ ê±´ë„ˆë›°ê³  ë°”ë¡œ ì¸ìƒì´ìš´(life_path)ìœ¼ë¡œ ì´ë™
      params.set('theme', 'focus_overall')
      router.push(`/destiny-map/result?${params.toString()}`)
    },
    [form, safeT, locale, router]
  )

  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'SET_FIELDS',
      fields: { city: e.target.value, isUserTyping: true, openSug: true },
    })
  }, [])

  const handleCityFocus = useCallback(() => {
    loadCitiesModule().catch(() => {})
  }, [])

  const handleCityBlur = useCallback(() => {
    setTimeout(() => dispatch({ type: 'SET_FIELD', field: 'openSug', value: false }), 150)
    dispatch({ type: 'SET_FIELD', field: 'isUserTyping', value: false })
  }, [])

  const handleGenderToggle = useCallback(() => {
    dispatch({ type: 'SET_FIELD', field: 'genderOpen', value: !form.genderOpen })
  }, [form.genderOpen])

  const handleGenderBlur = useCallback(() => {
    setTimeout(() => dispatch({ type: 'SET_FIELD', field: 'genderOpen', value: false }), 150)
  }, [])

  const handleSelectMale = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dispatch({ type: 'SET_FIELDS', fields: { gender: 'Male', genderOpen: false } })
  }, [])

  const handleSelectFemale = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dispatch({ type: 'SET_FIELDS', fields: { gender: 'Female', genderOpen: false } })
  }, [])

  return (
    <div className={styles.container}>
      <ParticleBackground className={styles.particleCanvas} />
      <BackButton />

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.creditBadgeWrapper}>
            <CreditBadge variant="compact" />
          </div>
          <div className={styles.header}>
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>MAP</span>
            </div>
            <h1 className={styles.title}>{safeT('menu.destinyMap', 'Destiny Map')}</h1>
            <p className={styles.subtitle}>
              {safeT(
                'app.subtitle',
                'Discover your cosmic blueprint through AI-powered fusion of Saju, Astrology, and Tarot'
              )}
            </p>
          </div>

          <form onSubmit={onSubmit} className={styles.form}>
            {/* Load My Profile Button - only for authenticated users */}
            {status === 'authenticated' && (
              <>
                <button
                  type="button"
                  className={`${styles.loadProfileButton} ${form.profileLoaded ? styles.loadProfileSuccess : ''}`}
                  onClick={handleLoadProfile}
                  disabled={form.loadingProfile}
                >
                  <span className={styles.loadProfileIcon}>
                    {form.loadingProfile ? '...' : form.profileLoaded ? 'OK' : 'ME'}
                  </span>
                  <span className={styles.loadProfileText}>
                    {form.loadingProfile
                      ? safeT('app.loadingProfile') || 'Loading...'
                      : form.profileLoaded
                        ? safeT('app.profileLoaded') || 'Profile Loaded!'
                        : safeT('app.loadMyProfile') || 'Load My Profile'}
                  </span>
                </button>
                {form.profileLoaded && (
                  <div className={styles.successBanner}>
                    <span className={styles.successIcon}>OK</span>
                    <span className={styles.successText}>
                      {safeT(
                        'app.profileLoadedSuccess',
                        isKo ? '프로필을 성공적으로 불러왔습니다.' : 'Profile loaded successfully.'
                      )}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className={styles.field}>
              <label className={styles.label}>{safeT('app.name') || 'Name'}</label>
              <input
                className={styles.input}
                placeholder={safeT('app.namePh') || 'Your name (optional)'}
                value={form.name}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })
                }
              />
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <DateTimePicker
                  value={form.birthDate}
                  onChange={(value) => dispatch({ type: 'SET_FIELD', field: 'birthDate', value })}
                  label={safeT('app.birthDate') || 'Birth Date'}
                  required
                  locale={locale as 'ko' | 'en'}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  {safeT('app.birthTime') || 'Birth Time'}
                  <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="time"
                  value={form.birthTime}
                  onChange={(e) =>
                    dispatch({ type: 'SET_FIELD', field: 'birthTime', value: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field} style={{ position: 'relative' }}>
                <label className={styles.label}>
                  {safeT('app.birthCity') || 'Birth City'}
                  <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder={safeT('app.cityPh') || 'Enter your city'}
                  value={form.city}
                  onChange={handleCityChange}
                  onFocus={handleCityFocus}
                  onBlur={handleCityBlur}
                  autoComplete="off"
                  required
                />
                {form.openSug && form.suggestions.length > 0 && (
                  <ul className={styles.dropdown}>
                    {form.suggestions.map((s: CityHit, idx: number) => (
                      <li
                        key={`${s.name}-${s.country}-${idx}`}
                        className={styles.dropdownItem}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          onPick(s)
                        }}
                      >
                        <span className={styles.cityName}>{s.name}</span>
                        <span className={styles.country}>{s.country}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {form.cityErr && <div className={styles.error}>{form.cityErr}</div>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{safeT('app.gender') || 'Gender'}</label>
                <div className={styles.genderSelectWrapper}>
                  <button
                    type="button"
                    className={`${styles.genderSelect} ${form.genderOpen ? styles.genderSelectOpen : ''}`}
                    onClick={handleGenderToggle}
                    onBlur={handleGenderBlur}
                  >
                    <span className={styles.genderText}>
                      {form.gender === 'Male'
                        ? safeT('app.male') || (isKo ? '남성' : 'Male')
                        : safeT('app.female') || (isKo ? '여성' : 'Female')}
                    </span>
                    <span
                      className={`${styles.genderArrow} ${form.genderOpen ? styles.genderArrowOpen : ''}`}
                    >
                      v
                    </span>
                  </button>
                  {form.genderOpen && (
                    <div className={styles.genderDropdown}>
                      <button
                        type="button"
                        className={`${styles.genderOption} ${form.gender === 'Male' ? styles.genderOptionActive : ''}`}
                        onMouseDown={handleSelectMale}
                      >
                        <span className={styles.genderOptionText}>
                          {safeT('app.male') || (isKo ? '남성' : 'Male')}
                        </span>
                        {form.gender === 'Male' && <span className={styles.genderCheck}>OK</span>}
                      </button>
                      <button
                        type="button"
                        className={`${styles.genderOption} ${form.gender === 'Female' ? styles.genderOptionActive : ''}`}
                        onMouseDown={handleSelectFemale}
                      >
                        <span className={styles.genderOptionText}>
                          {safeT('app.female') || (isKo ? '여성' : 'Female')}
                        </span>
                        {form.gender === 'Female' && <span className={styles.genderCheck}>OK</span>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button className={styles.submitButton} type="submit">
              <span className={styles.buttonText}>
                {safeT('app.analyze') || 'Begin Your Journey'}
              </span>
              <span className={styles.buttonIcon}>{'->'}</span>
            </button>
          </form>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>E</span>
              <span className={styles.featureText}>{isKo ? '동양 운세' : 'Eastern Fortune'}</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>W</span>
              <span className={styles.featureText}>{isKo ? '서양 운세' : 'Western Fortune'}</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>T</span>
              <span className={styles.featureText}>{isKo ? '타로 인사이트' : 'Tarot Insight'}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
