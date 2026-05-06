'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import BirthInfoForm from '@/components/calendar/BirthInfoForm'
import DestinyMatrixPlanner from '@/components/calendar/DestinyMatrixPlanner'
import {
  loadSharedBirthInfo,
  saveSharedBirthInfo,
} from '@/components/calendar/sharedBirthInfo'
import type { BirthInfo, CalendarData } from '@/components/calendar/types'
import { getUserProfile } from '@/lib/userProfile'
import { localizeStoredCity } from '@/lib/cities/formatter'
import { normalizeGender, toLongGender } from '@/lib/utils/gender'
import { logger } from '@/lib/logger'

/**
 * Preview-only orchestrator for the new DestinyMatrixPlanner UI.
 *
 * Mirrors the auto-hydration logic of the legacy DestinyCalendar so a
 * user who has already submitted birth info elsewhere in the app does
 * not see the form again.
 */
export default function PreviewClient() {
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    gender: 'Male',
  })
  const [hasBirthInfo, setHasBirthInfo] = useState(false)
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendar = useCallback(async (info: BirthInfo) => {
    setLoading(true)
    setError(null)
    try {
      const year = new Date().getFullYear()
      const params = new URLSearchParams({
        year: String(year),
        locale: 'ko',
        birthDate: info.birthDate,
        birthTime: info.birthTime,
        birthPlace: info.birthPlace,
      })
      const apiGender = normalizeGender(info.gender)
      if (apiGender) params.set('gender', apiGender)

      const res = await fetch(`/api/calendar?${params}`, {
        headers: { 'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '' },
      })
      if (!res.ok) {
        setError(`API ${res.status}`)
        return
      }
      const json = (await res.json()) as CalendarData
      setData(json)
      logger.debug('[CalendarPreview] payload received', {
        year: json.year,
        total: json.summary?.total,
        phase: json.matrixContract?.overallPhaseLabel,
      })
    } catch (err) {
      logger.error('[CalendarPreview] fetch failed', err)
      setError(err instanceof Error ? err.message : 'fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  // Hydrate from shared storage / user profile / URL params
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    let next: BirthInfo = {
      birthDate: '',
      birthTime: '',
      birthPlace: '',
      gender: 'Male',
    }

    const shared = loadSharedBirthInfo()
    if (shared) next = { ...next, ...shared }

    const profile = getUserProfile()
    if (profile.birthDate) next.birthDate = profile.birthDate
    if (profile.birthTime) next.birthTime = profile.birthTime
    if (profile.gender) {
      const long = toLongGender(profile.gender)
      if (long) next.gender = long
    }
    if (profile.birthCity) {
      next.birthPlace = localizeStoredCity(profile.birthCity, 'ko')
    }

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      const qBirthDate = sp.get('birthDate')
      const qBirthTime = sp.get('birthTime')
      const qGender = sp.get('gender')
      const qBirthCity = sp.get('birthCity') || sp.get('city')
      if (qBirthDate) next.birthDate = qBirthDate
      if (qBirthTime) next.birthTime = qBirthTime
      if (qGender) {
        const long = toLongGender(qGender)
        if (long) next.gender = long
      }
      if (qBirthCity) next.birthPlace = localizeStoredCity(qBirthCity, 'ko')
    }

    setBirthInfo(next)

    // Auto-submit when we already have a usable birth date — skip the form.
    if (next.birthDate) {
      const hasCoords =
        typeof next.latitude === 'number' && typeof next.longitude === 'number'
      const normalized: BirthInfo = {
        ...next,
        birthTime: next.birthTime || '12:00',
        birthPlace: next.birthPlace || 'Seoul',
        latitude: hasCoords ? next.latitude : 37.5665,
        longitude: hasCoords ? next.longitude : 126.978,
        timezone: next.timezone || 'Asia/Seoul',
      }
      setBirthInfo(normalized)
      setHasBirthInfo(true)
      void fetchCalendar(normalized)
    }
  }, [fetchCalendar])

  const handleSubmit = useCallback(
    async (submitted: BirthInfo) => {
      const hasCoords =
        typeof submitted.latitude === 'number' && typeof submitted.longitude === 'number'
      const normalized: BirthInfo = {
        ...submitted,
        birthTime: submitted.birthTime || '12:00',
        birthPlace: submitted.birthPlace || 'Seoul',
        latitude: hasCoords ? submitted.latitude : 37.5665,
        longitude: hasCoords ? submitted.longitude : 126.978,
        timezone: submitted.timezone || 'Asia/Seoul',
      }

      setBirthInfo(normalized)
      saveSharedBirthInfo(normalized)
      setHasBirthInfo(true)
      await fetchCalendar(normalized)
    },
    [fetchCalendar],
  )

  const handleRetry = useCallback(() => {
    setHasBirthInfo(false)
    setError(null)
    setData(null)
  }, [])

  if (!hasBirthInfo) {
    return <BirthInfoForm birthInfo={birthInfo} onSubmit={handleSubmit} />
  }

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        엔진 호출 중…
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto h-screen bg-zinc-950 text-rose-400 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm">엔진 호출 실패: {error}</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-200 text-sm"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return <DestinyMatrixPlanner data={data} birthInfo={birthInfo} />
}
