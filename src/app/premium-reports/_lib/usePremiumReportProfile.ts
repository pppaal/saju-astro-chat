'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/userProfile'
import type { ReportProfileInput } from './types'
import { buildReportProfileInputFromUserProfile } from './shared'
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage'

/**
 * Hydrate the report profile in this priority:
 *   1. explicit initialProfileInput (caller-provided)
 *   2. authenticated server profile (UserProfile)
 *   3. home page localStorage birth info (destinypal:birthInfo:v1)
 *
 * Step 3 covers the "guest filled birth on home → opened a report"
 * flow where the report page can't see the server profile yet but the
 * birth info is already on the device.
 */
export function usePremiumReportProfile(
  profile: Pick<
    UserProfile,
    | 'name'
    | 'birthDate'
    | 'birthTime'
    | 'birthCity'
    | 'gender'
    | 'timezone'
    | 'latitude'
    | 'longitude'
  >,
  initialProfileInput: ReportProfileInput | null = null
) {
  const [profileInput, setProfileInput] = useState<ReportProfileInput | null>(initialProfileInput)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (initialProfileInput && !profileInput) {
      setProfileInput(initialProfileInput)
      return
    }
    if (profileInput) {
      return
    }
    const seeded = buildReportProfileInputFromUserProfile(profile)
    if (seeded) {
      setProfileInput(seeded)
      return
    }
    // Fallback: pull from home page localStorage if the server profile
    // is empty (guest flow or not-yet-synced login).
    const local = getStoredBirthInfo()
    if (local?.birthDate) {
      setProfileInput({
        name: '사용자',
        birthDate: local.birthDate,
        birthTime: local.birthTime || '12:00',
        birthCity: local.city || '',
        gender: local.gender === 'female' ? 'F' : 'M',
        timezone: 'Asia/Seoul',
      })
      return
    }
    // No birth info anywhere — bounce to the home modal so the user
    // fills it once and gets returned here. Matches calendar/counselor.
    if (pathname) {
      router.replace(`/?openBirth=1&next=${encodeURIComponent(pathname)}`)
    }
  }, [initialProfileInput, profile, profileInput, router, pathname])

  return { profileInput, setProfileInput }
}
