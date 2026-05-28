import { useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { tryNormalizeTime } from '@/lib/saju/normalizer'
import { toLongGender } from '@/lib/utils/gender'
import type { CityHit, FormState, FormAction } from './useDestinyForm'
import { loadCitiesModule, resolveCityTimezone } from './useDestinyForm'

export function useDestinyProfile(
  status: string,
  dispatch: React.Dispatch<FormAction>,
  t: (key: string, fallback?: string) => string,
  profileLoaded: boolean,
  loadingProfile: boolean
) {
  const handleLoadProfile = useCallback(async () => {
    if (status !== 'authenticated') {
      return
    }

    dispatch({ type: 'SET_FIELDS', fields: { loadingProfile: true, cityErr: null } })

    try {
      const res = await fetch('/api/me/profile', { cache: 'no-store' })
      if (!res.ok) {
        dispatch({
          type: 'SET_FIELDS',
          fields: {
            cityErr: t('error.profileLoadFailed') || 'Failed to load profile. Please try again.',
            loadingProfile: false,
          },
        })
        return
      }

      const { user } = await res.json()
      if (!user || !user.birthDate) {
        dispatch({
          type: 'SET_FIELDS',
          fields: {
            cityErr:
              t('error.noProfileData') ||
              'No saved profile data found. Please save your info in MyJourney first.',
            loadingProfile: false,
          },
        })
        return
      }

      const fields: Partial<FormState> = {}
      if (user.name) {
        fields.name = user.name
      }
      if (user.birthDate) {
        fields.birthDate = user.birthDate
      }
      if (user.birthTime) {
        fields.birthTime = tryNormalizeTime(user.birthTime)?.time ?? user.birthTime
      }
      if (user.birthCity) {
        fields.city = user.birthCity
        const cityName = user.birthCity.split(',')[0]?.trim()
        if (cityName) {
          try {
            const { searchCities } = await loadCitiesModule()
            const hits = (await searchCities(cityName, { limit: 1 })) as CityHit[]
            if (hits && hits[0]) {
              const hit = hits[0]
              const timezone = await resolveCityTimezone(hit, user.tzId)
              fields.selectedCity = { ...hit, timezone }
            }
          } catch {
            logger.warn('City search failed for:', cityName)
            if (typeof user.latitude === 'number' && typeof user.longitude === 'number') {
              fields.selectedCity = {
                name: cityName,
                country: 'KR',
                lat: user.latitude,
                lon: user.longitude,
                timezone: user.tzId || 'Asia/Seoul',
                displayKr: user.birthCity,
                displayEn: user.birthCity,
              }
            }
          }
        }
      }
      // Server may return 'M'/'F' (legacy) or 'male'/'female' (post-zod
      // normalization). Treat both as the same value so the destiny form
      // doesn't silently fall back to the default for users saved after
      // the schema was changed.
      const longGender = toLongGender(user.gender)
      if (longGender) {
        fields.gender = longGender
      }

      fields.profileLoaded = true
      fields.loadingProfile = false
      dispatch({ type: 'SET_FIELDS', fields })
    } catch (err) {
      logger.error('Failed to load profile:', err)
      dispatch({
        type: 'SET_FIELDS',
        fields: {
          cityErr: t('error.profileLoadFailed') || 'Failed to load profile. Please try again.',
          loadingProfile: false,
        },
      })
    }
  }, [status, t, dispatch])

  // Auto-load profile on mount for authenticated users
  useEffect(() => {
    if (status === 'authenticated' && !profileLoaded && !loadingProfile) {
      handleLoadProfile()
    }
  }, [status, profileLoaded, loadingProfile, handleLoadProfile])

  return { handleLoadProfile }
}
