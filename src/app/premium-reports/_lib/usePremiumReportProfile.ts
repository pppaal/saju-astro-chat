'use client'

import { useEffect, useState } from 'react'
import type { UserProfile } from '@/lib/userProfile'
import type { ReportProfileInput } from './types'
import { buildReportProfileInputFromUserProfile } from './shared'

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
    }
  }, [initialProfileInput, profile, profileInput])

  return { profileInput, setProfileInput }
}
