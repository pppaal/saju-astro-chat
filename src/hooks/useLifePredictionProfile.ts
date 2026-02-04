/**
 * useLifePredictionProfile Hook
 *
 * Manages user profile and birth information for the life prediction page.
 * Handles both authenticated users (profile from DB) and guest users (local state).
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'

/**
 * User profile structure from API
 */
export interface UserProfile {
  name?: string
  birthDate?: string
  birthTime?: string
  birthCity?: string
  gender?: 'M' | 'F'
  latitude?: number
  longitude?: number
  timezone?: string
}

/**
 * Guest birth information structure
 */
export interface GuestBirthInfo {
  birthDate: string
  birthTime: string
  gender: 'M' | 'F'
  birthCity?: string
}

/**
 * Return type for useLifePredictionProfile hook
 */
export interface UseLifePredictionProfileReturn {
  /** User profile (authenticated users) */
  userProfile: UserProfile | null
  /** Guest birth info (non-authenticated users) */
  guestBirthInfo: GuestBirthInfo | null
  /** Loading state */
  profileLoading: boolean
  /** Show profile creation prompt */
  showProfilePrompt: boolean
  /** Error message for profile load/save failures */
  profileError: string | null
  /** Handler for birth info submission */
  handleBirthInfoSubmit: (birthInfo: GuestBirthInfo) => Promise<void>
  /** Reset birth info and go back to input */
  handleChangeBirthInfo: () => void
}

/**
 * Hook to manage user profile and birth information for life prediction
 *
 * @param status - NextAuth session status
 * @returns Profile state and handlers
 *
 * @example
 * ```tsx
 * const { userProfile, guestBirthInfo, profileLoading, handleBirthInfoSubmit } =
 *   useLifePredictionProfile(status);
 * ```
 */
export function useLifePredictionProfile(
  status: 'authenticated' | 'loading' | 'unauthenticated'
): UseLifePredictionProfileReturn {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [guestBirthInfo, setGuestBirthInfo] = useState<GuestBirthInfo | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Load user profile for authenticated users
  useEffect(() => {
    const loadProfile = async () => {
      if (status === 'loading') {
        return
      }

      if (status !== 'authenticated') {
        setProfileLoading(false)
        return
      }

      setProfileLoading(true)
      setShowProfilePrompt(false)
      setProfileError(null)
      try {
        const res = await fetch('/api/me/profile', { cache: 'no-store' })
        if (res.ok) {
          const { user } = await res.json()
          if (user?.birthDate) {
            setUserProfile({
              name: user.name,
              birthDate: user.birthDate,
              birthTime: user.birthTime,
              birthCity: user.birthCity,
              gender: user.gender,
              latitude: user.latitude,
              longitude: user.longitude,
              timezone: user.tzId,
            })
          } else {
            // User is authenticated but has no profile saved
            setShowProfilePrompt(true)
          }
        } else {
          setProfileError('Failed to load profile')
          logger.error('Failed to load profile: HTTP', res.status)
        }
      } catch (err) {
        logger.error('Failed to load profile:', err)
        setProfileError('Failed to load profile')
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [status])

  // Handler for birth info submission
  const handleBirthInfoSubmit = useCallback(
    async (birthInfo: GuestBirthInfo) => {
      // If authenticated, save to user profile
      if (status === 'authenticated') {
        setProfileError(null)
        try {
          const res = await fetch('/api/user/update-birth-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              birthDate: birthInfo.birthDate,
              birthTime: birthInfo.birthTime,
              gender: birthInfo.gender,
              birthCity: birthInfo.birthCity,
            }),
          })

          if (res.ok) {
            const data = await res.json().catch(() => ({}))
            if (data.cacheCleared) {
              const { invalidateClientCaches } = await import('@/lib/cache/invalidateClientCaches')
              await invalidateClientCaches()
            }
            // Update profile state
            setUserProfile({
              birthDate: birthInfo.birthDate,
              birthTime: birthInfo.birthTime,
              gender: birthInfo.gender,
              birthCity: birthInfo.birthCity,
            })
          } else {
            setProfileError('Failed to save birth info')
            logger.error('Failed to save birth info: HTTP', res.status)
          }
        } catch (err) {
          logger.error('Failed to save birth info:', err)
          setProfileError('Failed to save birth info')
        }
      } else {
        // Guest user: save to local state only
        setGuestBirthInfo(birthInfo)
      }
    },
    [status]
  )

  // Reset birth info
  const handleChangeBirthInfo = useCallback(() => {
    setGuestBirthInfo(null)
    setUserProfile(null)
  }, [])

  return {
    userProfile,
    guestBirthInfo,
    profileLoading,
    showProfilePrompt,
    profileError,
    handleBirthInfoSubmit,
    handleChangeBirthInfo,
  }
}
