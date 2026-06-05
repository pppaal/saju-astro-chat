/**
 * @file useDay.ts
 * Hook: Day tier (일 — 일진 + 그날 점성 + 시간별 fusion).
 *
 * Wraps /api/calendar/date-detail — the heaviest per-request engine
 * call (fusion: 18 themes × 24 slots + hourly best/worst + planetary
 * hours + shinsal hits). That's why this hook lives separate from
 * useMonth: the date-detail payload is shaped for a single day, and
 * the calendar-engine month payload only has the "lite" daily summary.
 *
 * Date format expected: 'YYYY-MM-DD' (ISO date, no time component).
 * If you pass a Date object, callers must format it themselves — we
 * intentionally don't accept Date here to make caching keys exact-
 * matched (Date objects with different ms but same calendar day would
 * generate different keys otherwise).
 */

'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import type { BirthInfoInput, HookResult, MockOption, RawDayPayload } from './types'
import {
  buildBirthParams,
  fetchJson,
  isUsableBirth,
  shouldUseMock,
  useAsyncResource,
} from './internal'
import { dayKey } from './cache'
import { mockDay } from './mock'

export interface UseDayOptions extends MockOption {
  /** 'YYYY-MM-DD' */
  date: string
  birthInfo?: BirthInfoInput
  locale?: 'ko' | 'en'
  enabled?: boolean
}

interface SessionLite {
  user?: { profile?: { birthDate?: string }; birthDate?: string }
}

function pickBirth(prop: BirthInfoInput | undefined, session: unknown): BirthInfoInput | null {
  if (isUsableBirth(prop)) return prop
  if (!session || typeof session !== 'object') return null
  const s = session as SessionLite
  const p = s.user?.profile ?? s.user
  if (!p?.birthDate) return null
  return p as BirthInfoInput
}

// Loose ISO date check — server validates strictly, we just want to
// avoid sending obviously-invalid strings.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function useDay(options: UseDayOptions): HookResult<RawDayPayload> {
  const { date, birthInfo, locale = 'ko', enabled = true, mock } = options
  const { data: session } = useSession()
  const useMock = shouldUseMock(mock)
  const birth = useMemo(() => pickBirth(birthInfo, session), [birthInfo, session])

  const dateValid = ISO_DATE.test(date)

  const key = useMemo(() => {
    if (useMock) return `dp:mock:day:${date}`
    if (!birth || !dateValid) return null
    return dayKey(
      {
        birthDate: birth.birthDate,
        birthTime: birth.birthTime,
        birthPlace: birth.birthPlace,
        gender: birth.gender,
        locale,
      },
      date
    )
  }, [useMock, birth, date, dateValid, locale])

  const fetcher = useMemo(
    () =>
      async (signal: AbortSignal): Promise<RawDayPayload> => {
        if (!birth) throw new Error('birthInfo not resolved')
        const params = buildBirthParams(birth, locale)
        params.set('date', date)
        return fetchJson<RawDayPayload>(
          `/api/calendar/date-detail?${params.toString()}`,
          { signal }
        )
      },
    [birth, date, locale]
  )

  const live = useAsyncResource<RawDayPayload>({
    key,
    fetcher,
    enabled: enabled && !useMock && !!birth && dateValid,
  })

  if (useMock) {
    return {
      data: mockDay(date),
      isLoading: false,
      error: null,
      status: 'ready',
      refetch: () => {},
    }
  }
  return live
}
