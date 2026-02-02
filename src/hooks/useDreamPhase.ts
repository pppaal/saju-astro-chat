import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { Phase, UserProfile } from '@/lib/dream/types'
import { logger } from '@/lib/logger'

export function useDreamPhase() {
  const { status } = useSession()
  // Start directly at dream-input for immediate usability
  const [phase, setPhase] = useState<Phase>('dream-input')
  const [profileLoading, setProfileLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // Load user profile on mount - always go to dream-input regardless
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
          }
        }
      } catch (err) {
        logger.error('Failed to load profile:', err)
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [status]);

  return {
    phase,
    setPhase,
    profileLoading,
    userProfile,
    setUserProfile,
  }
}
