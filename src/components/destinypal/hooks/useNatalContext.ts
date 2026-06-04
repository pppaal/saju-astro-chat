/**
 * @file useNatalContext.ts
 * Hook: fetches user's *natal* context (사주 본명 + 점성 본명).
 *
 * Combines /api/saju (POST) and /api/astrology (POST) in parallel.
 * This is the Life-tier root — every other tier (Decade, Year, Month,
 * Day) is interpreted *relative to* this context.
 *
 * Birth info resolution priority (high → low):
 *   1. `birthInfo` prop (explicit caller wins)
 *   2. next-auth session profile (logged-in user's stored chart)
 *
 * If neither is usable → hook stays idle. UI should redirect to
 * birth-info entry (mirrors DestinyMatrixPlannerClient gating).
 */

'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import type { BirthInfoInput, HookResult, MockOption, RawNatalContextResponse } from './types'
import {
  buildNatalPostBody,
  isUsableBirth,
  postJson,
  shouldUseMock,
  useAsyncResource,
} from './internal'
import { natalKey } from './cache'
import { mockNatal } from './mock'

export interface UseNatalContextOptions extends MockOption {
  /** Override birth info — if omitted, hook tries session profile. */
  birthInfo?: BirthInfoInput
  /** UI locale for response text. Default 'ko'. */
  locale?: 'ko' | 'en'
  /** Suspend fetch (e.g. waiting for parent to hydrate). Default true. */
  enabled?: boolean
}

interface SessionProfile {
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  gender?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

interface SessionUserShape {
  user?: SessionProfile & { profile?: SessionProfile }
}

/**
 * Tries to pull a usable BirthInfo out of the next-auth session.
 * Defensive: not every session shape has profile fields, and not every
 * caller is logged in (anonymous users just won't get session data).
 */
function birthFromSession(session: unknown): BirthInfoInput | null {
  if (!session || typeof session !== 'object') return null
  const s = session as SessionUserShape
  const profile = s.user?.profile ?? s.user
  if (!profile?.birthDate) return null
  // birthDate narrowed to string via the guard; other fields stay
  // optional in BirthInfoInput so passing through is safe.
  return {
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    birthPlace: profile.birthPlace,
    gender: profile.gender,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
  }
}

export function useNatalContext(
  options: UseNatalContextOptions = {}
): HookResult<RawNatalContextResponse> {
  const { birthInfo, locale = 'ko', enabled = true, mock } = options
  const { data: session } = useSession()

  // Resolve birth — prop wins, then session profile.
  const resolvedBirth: BirthInfoInput | null = useMemo(() => {
    if (isUsableBirth(birthInfo)) return birthInfo
    return birthFromSession(session)
  }, [birthInfo, session])

  const useMock = shouldUseMock(mock)

  // Mock branch: bypass the resource entirely. Same envelope shape so
  // downstream components don't have to special-case mock mode.
  const mockResult = useMemo<HookResult<RawNatalContextResponse> | null>(() => {
    if (!useMock) return null
    return {
      data: mockNatal(),
      isLoading: false,
      error: null,
      status: 'ready',
      refetch: () => {
        /* mock has nothing to refetch */
      },
    }
  }, [useMock])

  // Live branch — POST to /api/saju and /api/astrology in parallel.
  const key = useMemo(() => {
    if (useMock) return 'dp:mock:natal'
    if (!resolvedBirth) return null
    return natalKey({
      birthDate: resolvedBirth.birthDate,
      birthTime: resolvedBirth.birthTime,
      birthPlace: resolvedBirth.birthPlace,
      gender: resolvedBirth.gender,
      locale,
    })
  }, [useMock, resolvedBirth, locale])

  const fetcher = useMemo(
    () =>
      async (signal: AbortSignal): Promise<RawNatalContextResponse> => {
        if (!resolvedBirth) throw new Error('birthInfo not resolved')
        const body = buildNatalPostBody(resolvedBirth, locale)
        const [saju, astrology] = await Promise.all([
          postJson('/api/saju', body.saju, signal),
          postJson('/api/astrology', body.astrology, signal),
        ])
        return {
          saju: saju as RawNatalContextResponse['saju'],
          astrology: astrology as RawNatalContextResponse['astrology'],
        }
      },
    [resolvedBirth, locale]
  )

  const live = useAsyncResource<RawNatalContextResponse>({
    key,
    fetcher,
    enabled: enabled && !useMock && !!resolvedBirth,
  })

  return mockResult ?? live
}
