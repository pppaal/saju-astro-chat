// src/hooks/calendar/useProfileLoader.ts
import { useState, useCallback, useEffect } from 'react'
import { getUserProfile } from '@/lib/userProfile'
import { logger } from '@/lib/logger'

interface BirthInfo {
  birthDate: string
  birthTime: string
  birthPlace: string
  gender: 'Male' | 'Female'
  latitude?: number
  longitude?: number
  timezone?: string
}

interface CityHit {
  name: string
  country: string
  lat: number
  lon: number
  timezone?: string
}

interface UseProfileLoaderReturn {
  loadingProfile: boolean
  profileLoaded: boolean
  showProfilePrompt: boolean
  profileError: string | null
  loadProfile: (
    userId: string,
    onSuccess: (info: BirthInfo, city: CityHit) => void,
    isAutoLoad?: boolean
  ) => Promise<void>
}

/**
 * Hook for loading user profile data
 */
export function useProfileLoader(
  userId?: string,
  onSuccess?: (info: BirthInfo, city: CityHit) => void
): UseProfileLoaderReturn {
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const loadProfile = useCallback(
    async (
      userId: string,
      onSuccess: (info: BirthInfo, city: CityHit) => void,
      isAutoLoad = false
    ) => {
      if (profileLoaded) {
        logger.info('[useProfileLoader] Profile already loaded')
        return
      }

      setLoadingProfile(true)
      setShowProfilePrompt(false)
      setProfileError(null)

      try {
        // First try to fetch from API
        const res = await fetch('/api/me/profile', { cache: 'no-store' })

        if (res.ok) {
          const { user } = await res.json()

          if (user?.birthDate) {
            const birthInfo: BirthInfo = {
              birthDate: user.birthDate,
              birthTime: user.birthTime || '12:00',
              birthPlace: user.birthCity || '',
              gender: user.gender === 'F' ? 'Female' : 'Male',
              latitude: user.latitude,
              longitude: user.longitude,
              timezone: user.tzId || 'UTC',
            }

            const cityHit: CityHit = {
              name: user.birthCity || 'Unknown',
              country: '',
              lat: user.latitude || 0,
              lon: user.longitude || 0,
              timezone: user.tzId || 'UTC',
            }

            onSuccess(birthInfo, cityHit)
            setProfileLoaded(true)

            logger.info('[useProfileLoader] Profile loaded from API', {
              birthDate: user.birthDate,
              hasTime: !!user.birthTime,
            })
            return
          }
        }

        // If API fails or no profile, try localStorage as fallback
        const profile = getUserProfile()

        if (
          profile?.birthDate &&
          profile?.latitude !== undefined &&
          profile?.longitude !== undefined
        ) {
          const birthInfo: BirthInfo = {
            birthDate: profile.birthDate,
            birthTime: profile.birthTime || '12:00',
            birthPlace: profile.birthCity || '',
            gender: profile.gender === 'Female' ? 'Female' : 'Male',
            latitude: profile.latitude,
            longitude: profile.longitude,
            timezone: profile.timezone || 'UTC',
          }

          const cityHit: CityHit = {
            name: profile.birthCity || 'Unknown',
            country: '',
            lat: profile.latitude,
            lon: profile.longitude,
            timezone: profile.timezone || 'UTC',
          }

          onSuccess(birthInfo, cityHit)
          setProfileLoaded(true)

          logger.info('[useProfileLoader] Profile loaded from localStorage', {
            birthDate: profile.birthDate,
            hasTime: !!profile.birthTime,
          })
        } else {
          // No profile found anywhere
          if (isAutoLoad) {
            setShowProfilePrompt(true)
          }
          logger.warn('[useProfileLoader] No profile data found')
        }
      } catch (err) {
        logger.error('[useProfileLoader] Failed to load profile', {
          error: err instanceof Error ? err.message : 'Unknown',
        })
        setProfileError('Failed to load profile')
      } finally {
        setLoadingProfile(false)
      }
    },
    [profileLoaded]
  )

  // Auto-load profile when userId is provided and user is authenticated
  useEffect(() => {
    if (userId && !autoLoadAttempted && !profileLoaded && onSuccess) {
      setAutoLoadAttempted(true)
      loadProfile(userId, onSuccess, true)
    }
  }, [userId, autoLoadAttempted, profileLoaded, onSuccess, loadProfile])

  return { loadingProfile, profileLoaded, showProfilePrompt, profileError, loadProfile }
}
