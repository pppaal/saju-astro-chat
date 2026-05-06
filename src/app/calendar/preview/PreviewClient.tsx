'use client'

import { useCallback, useState } from 'react'
import BirthInfoForm from '@/components/calendar/BirthInfoForm'
import DestinyMatrixPlanner from '@/components/calendar/DestinyMatrixPlanner'
import type { BirthInfo, CalendarData } from '@/components/calendar/types'
import { normalizeGender } from '@/lib/utils/gender'
import { logger } from '@/lib/logger'

/**
 * Preview-only orchestrator for the new DestinyMatrixPlanner UI.
 *
 * Step 2a: handles the BirthInfoForm gate and fetches /api/calendar so the
 * planner receives real `CalendarData`. The planner itself still renders
 * mock UI — only the small green "engine connected" banner reflects the
 * payload. Visual mapping comes in subsequent steps.
 */
export default function PreviewClient() {
  const [birthInfo, setBirthInfo] = useState<BirthInfo | null>(null)
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (submitted: BirthInfo) => {
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
    setLoading(true)
    setError(null)

    try {
      const year = new Date().getFullYear()
      const params = new URLSearchParams({
        year: String(year),
        locale: 'ko',
        birthDate: normalized.birthDate,
        birthTime: normalized.birthTime,
        birthPlace: normalized.birthPlace,
      })
      const apiGender = normalizeGender(normalized.gender)
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

  if (!birthInfo) {
    return (
      <BirthInfoForm
        birthInfo={{ birthDate: '', birthTime: '', birthPlace: '', gender: 'Male' }}
        onSubmit={handleSubmit}
      />
    )
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
          onClick={() => setBirthInfo(null)}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-200 text-sm"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return <DestinyMatrixPlanner data={data} birthInfo={birthInfo} />
}
