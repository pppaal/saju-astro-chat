import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { UserProfile, GuestBirthInfo } from '@/lib/dream/types'
import { logger } from '@/lib/logger'

export function useBirthInfo(locale: string) {
  const { status } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [guestBirthInfo, setGuestBirthInfo] = useState<GuestBirthInfo | null>(null)

  // Form state
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('12:00')
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [birthCity, setBirthCity] = useState('')
  const [showTimeInput, setShowTimeInput] = useState(false)
  const [showCityInput, setShowCityInput] = useState(false)

  // Loading state
  const [loadingProfileBtn, setLoadingProfileBtn] = useState(false)
  const [profileLoadedMsg, setProfileLoadedMsg] = useState(false)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false)
  const [birthSaveError, setSaveError] = useState<string | null>(null)

  const hasBirthInfo = Boolean(userProfile?.birthDate || guestBirthInfo?.birthDate)

  const loadProfile = useCallback(
    async (isAutoLoad = false) => {
      if (status !== 'authenticated') {
        return
      }

      setLoadingProfileBtn(true)
      setProfileLoadError(null)
      setShowProfilePrompt(false)

      try {
        const res = await fetch('/api/me/profile', { cache: 'no-store' })
        if (!res.ok) {
          if (!isAutoLoad) {
            setProfileLoadError(
              locale === 'ko' ? '프로필을 불러올 수 없습니다' : 'Failed to load profile'
            )
          }
          setLoadingProfileBtn(false)
          return false
        }

        const { user } = await res.json()

        if (!user || !user.birthDate) {
          if (isAutoLoad) {
            // Auto-load found no profile - show prompt
            setShowProfilePrompt(true)
          } else {
            // Manual load found no profile - show error
            setProfileLoadError(
              locale === 'ko'
                ? '저장된 프로필이 없습니다. My Journey에서 먼저 정보를 저장해주세요.'
                : 'No saved profile. Please save your info in My Journey first.'
            )
          }
          setLoadingProfileBtn(false)
          return false
        }

        // Set form fields from DB data
        if (user.birthDate) {
          setBirthDate(user.birthDate)
        }
        if (user.birthTime) {
          setBirthTime(user.birthTime)
          setShowTimeInput(true)
        }
        if (user.gender) {
          setGender(user.gender)
        }
        if (user.birthCity) {
          setBirthCity(user.birthCity)
          setShowCityInput(true)
        }
        setUserProfile({
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthCity: user.birthCity,
          gender: user.gender,
          latitude: user.latitude,
          longitude: user.longitude,
          timezone: user.tzId,
        })
        setProfileLoadedMsg(true)
        return true
      } catch (err) {
        logger.error('Failed to load profile:', err)
        if (!isAutoLoad) {
          setProfileLoadError(locale === 'ko' ? '프로필 로드 실패' : 'Profile load failed')
        }
        return false
      } finally {
        setLoadingProfileBtn(false)
      }
    },
    [status, locale]
  )

  // Auto-load profile when user becomes authenticated
  useEffect(() => {
    if (status === 'authenticated' && !autoLoadAttempted && !userProfile) {
      setAutoLoadAttempted(true)
      loadProfile(true)
    }
  }, [status, autoLoadAttempted, userProfile, loadProfile])

  const saveBirthInfo = useCallback(async () => {
    if (!birthDate) {
      return false
    }

    setSaveError(null)
    const birthInfo: GuestBirthInfo = {
      birthDate,
      birthTime: showTimeInput ? birthTime : '12:00',
      gender,
      birthCity: showCityInput ? birthCity : undefined,
    }

    if (status === 'authenticated') {
      try {
        const res = await fetch('/api/user/update-birth-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(birthInfo),
        })

        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          if (data.cacheCleared) {
            const { invalidateClientCaches } = await import('@/lib/cache/invalidateClientCaches')
            await invalidateClientCaches()
          }
          setUserProfile({
            birthDate: birthInfo.birthDate,
            birthTime: birthInfo.birthTime,
            gender: birthInfo.gender,
            birthCity: birthInfo.birthCity,
          })
        } else {
          const msg = locale === 'ko' ? '생년월일 저장에 실패했습니다' : 'Failed to save birth info'
          setSaveError(msg)
          logger.error('Failed to save birth info: HTTP', res.status)
          return false
        }
      } catch (err) {
        logger.error('Failed to save birth info:', err)
        setSaveError(
          locale === 'ko' ? '네트워크 오류. 다시 시도해주세요.' : 'Network error. Please try again.'
        )
        return false
      }
    } else {
      setGuestBirthInfo(birthInfo)
    }

    return true
  }, [birthDate, birthTime, gender, birthCity, showTimeInput, showCityInput, status, locale])

  const resetBirthInfo = useCallback(() => {
    setGuestBirthInfo(null)
    setUserProfile(null)
    setProfileLoadedMsg(false)
    setProfileLoadError(null)
  }, [])

  const skipBirthInfo = useCallback(() => {
    setGuestBirthInfo(null)
  }, [])

  return {
    // State
    userProfile,
    guestBirthInfo,
    hasBirthInfo,

    // Form state
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    gender,
    setGender,
    birthCity,
    setBirthCity,
    showTimeInput,
    setShowTimeInput,
    showCityInput,
    setShowCityInput,

    // Loading state
    loadingProfileBtn,
    profileLoadedMsg,
    profileLoadError,
    showProfilePrompt,
    saveError: birthSaveError,

    // Actions
    loadProfile,
    saveBirthInfo,
    resetBirthInfo,
    skipBirthInfo,
  }
}
