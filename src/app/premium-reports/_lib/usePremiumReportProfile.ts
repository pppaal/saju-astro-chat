'use client'

import { useEffect, useRef, useState } from 'react'
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
 *   4. nothing → bounce to /?openBirth=1&next=<path> so the home modal
 *      collects birth info once and the user returns to the report.
 *
 * Step 4 only fires after `profileLoading` settles to false; otherwise
 * we'd redirect authenticated users away from their own report mid-fetch.
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
  initialProfileInput: ReportProfileInput | null = null,
  /**
   * Pass `true` while the upstream server profile is still loading.
   * Prevents the redirect from firing on first render before
   * `useUserProfile` has had a chance to populate the profile.
   */
  profileLoading: boolean = false,
) {
  const [profileInput, setProfileInput] = useState<ReportProfileInput | null>(initialProfileInput)
  const router = useRouter()
  const pathname = usePathname()
  const redirectedRef = useRef(false)

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
    // No source has data. Wait for profileLoading to settle before
    // bouncing to the home modal — otherwise we redirect during the
    // first paint while useUserProfile is still mid-fetch.
    if (profileLoading) return
    if (redirectedRef.current) return
    if (!pathname) return
    redirectedRef.current = true
    router.replace(`/?openBirth=1&next=${encodeURIComponent(pathname)}`)
  }, [initialProfileInput, profile, profileInput, profileLoading, router, pathname])

  return { profileInput, setProfileInput }
}
