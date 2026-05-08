/**
 * useUnifiedSlice — 6 서비스 공통 훅.
 * birthInput 받아서 /api/unified-engine 호출하고 UnifiedSlice 반환.
 *
 * 사용:
 *   const { slice, isLoading, error } = useUnifiedSlice({
 *     birthDate: '1995-02-09',
 *     birthTime: '06:40',
 *     gender: 'male',
 *   })
 *
 *   if (slice) {
 *     // slice.life, slice.themeMatrix.career, slice.axes 등 사용
 *   }
 */
'use client'

import { useEffect, useState, useRef } from 'react'
import type { UnifiedSlice, UnifiedBirthInput } from '@/lib/engine/unifiedAdapter'

interface State {
  slice: UnifiedSlice | null
  isLoading: boolean
  error: string | null
}

const cache = new Map<string, UnifiedSlice>()

function cacheKey(input: UnifiedBirthInput): string {
  return JSON.stringify({
    d: input.birthDate,
    t: input.birthTime,
    g: input.gender,
    lat: input.latitude,
    lng: input.longitude,
    tz: input.timezone,
    seg: input.segment,
  })
}

export function useUnifiedSlice(input: UnifiedBirthInput | null): State {
  const [state, setState] = useState<State>({ slice: null, isLoading: false, error: null })
  const lastKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!input || !input.birthDate || !input.birthTime || !input.gender) {
      setState({ slice: null, isLoading: false, error: null })
      return
    }
    const key = cacheKey(input)
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key

    const cached = cache.get(key)
    if (cached) {
      setState({ slice: cached, isLoading: false, error: null })
      return
    }

    setState((s) => ({ ...s, isLoading: true, error: null }))
    let cancelled = false

    fetch('/api/unified-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`engine ${res.status}`)
        return (await res.json()) as UnifiedSlice
      })
      .then((slice) => {
        if (cancelled) return
        cache.set(key, slice)
        setState({ slice, isLoading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ slice: null, isLoading: false, error: err instanceof Error ? err.message : 'failed' })
      })

    return () => {
      cancelled = true
    }
  }, [input])

  return state
}
