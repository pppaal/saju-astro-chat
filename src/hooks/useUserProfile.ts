/**
 * useUserProfile Hook
 *
 * React hook for loading user profile data.
 * Automatically syncs profile from DB for authenticated users.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { logger } from '@/lib/logger'
import { getUserProfile, fetchAndSyncUserProfile, type UserProfile } from '@/lib/userProfile'

interface UseUserProfileOptions {
  /** Skip API fetch even if authenticated */
  skipFetch?: boolean
  /** Skip auto-load on mount (for manual trigger) */
  skipAutoLoad?: boolean
}

interface UseUserProfileReturn {
  profile: UserProfile
  isLoading: boolean
  isAuthenticated: boolean
  refetch: () => Promise<void>

  // Manual load button states
  loadingProfileBtn: boolean
  profileLoadedMsg: boolean
  profileLoadError: string | null
  showProfilePrompt: boolean
  loadProfile: (locale?: string) => Promise<boolean>
  resetLoadState: () => void
}

/**
 * Hook to get user profile with automatic sync for authenticated users
 *
 * @example
 * const { profile, isLoading, loadProfile, loadingProfileBtn } = useUserProfile();
 *
 * useEffect(() => {
 *   if (profile.birthDate) setBirthDate(profile.birthDate);
 *   if (profile.birthTime) setBirthTime(profile.birthTime);
 * }, [profile]);
 */
export function useUserProfile(options: UseUserProfileOptions = {}): UseUserProfileReturn {
  const { status } = useSession()
  const [profile, setProfile] = useState<UserProfile>({})
  const [isLoading, setIsLoading] = useState(true)

  // Manual load button states
  const [loadingProfileBtn, setLoadingProfileBtn] = useState(false)
  const [profileLoadedMsg, setProfileLoadedMsg] = useState(false)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false)

  const isAuthenticated = status === 'authenticated'

  const internalLoadProfile = async () => {
    setIsLoading(true)
    try {
      if (isAuthenticated && !options.skipFetch) {
        // Authenticated: fetch from API and sync
        const fetched = await fetchAndSyncUserProfile()
        setProfile(fetched)
      } else {
        // Not authenticated: use localStorage only
        setProfile(getUserProfile())
      }
    } catch {
      setProfile(getUserProfile())
    } finally {
      setIsLoading(false)
    }
  }

  // Manual load profile with UI feedback
  const loadProfile = useCallback(
    async (locale = 'ko'): Promise<boolean> => {
      if (!isAuthenticated) {
        return false
      }

      setLoadingProfileBtn(true)
      setProfileLoadError(null)
      setShowProfilePrompt(false)

      try {
        const res = await fetch('/api/me/profile', { cache: 'no-store' })
        if (!res.ok) {
          setProfileLoadError(
            locale === 'ko' ? '프로필을 불러올 수 없습니다' : 'Failed to load profile'
          )
          setLoadingProfileBtn(false)
          return false
        }

        const { user } = await res.json()

        if (!user || !user.birthDate) {
          setProfileLoadError(
            locale === 'ko'
              ? '저장된 프로필이 없습니다. My Journey에서 먼저 정보를 저장해주세요.'
              : 'No saved profile. Please save your info in My Journey first.'
          )
          setLoadingProfileBtn(false)
          return false
        }

        // Update profile state
        const newProfile: UserProfile = {
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthCity: user.birthCity,
          gender: user.gender,
          timezone: user.tzId,
        }
        setProfile(newProfile)
        setProfileLoadedMsg(true)

        // Auto-hide success message after 3 seconds
        setTimeout(() => setProfileLoadedMsg(false), 3000)

        return true
      } catch (err) {
        logger.error('Failed to load profile:', err instanceof Error ? err : new Error(String(err)))
        setProfileLoadError(locale === 'ko' ? '프로필 로드 실패' : 'Profile load failed')
        return false
      } finally {
        setLoadingProfileBtn(false)
      }
    },
    [isAuthenticated]
  )

  const resetLoadState = useCallback(() => {
    setProfileLoadedMsg(false)
    setProfileLoadError(null)
    setShowProfilePrompt(false)
  }, [])

  // Auto-load on mount
  useEffect(() => {
    if (status === 'loading') {
      return
    }
    if (options.skipAutoLoad) {
      setIsLoading(false)
      return
    }

    if (isAuthenticated && !autoLoadAttempted) {
      setAutoLoadAttempted(true)
    }

    internalLoadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAuthenticated])

  return {
    profile,
    isLoading: status === 'loading' || isLoading,
    isAuthenticated,
    refetch: internalLoadProfile,

    // Manual load states
    loadingProfileBtn,
    profileLoadedMsg,
    profileLoadError,
    showProfilePrompt,
    loadProfile,
    resetLoadState,
  }
}

export default useUserProfile
