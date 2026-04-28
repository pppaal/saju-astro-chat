'use client'

import React, { useEffect, useState } from 'react'
import CrossAugmentCard from './CrossAugmentCard'
import type { CalendarCrossAugment } from '@/lib/destiny-map/destinyCalendar'
import type { BirthInfo } from './types'

interface DailyAugmentCardProps {
  /** 클릭된 날짜 (YYYY-MM-DD). null이면 fetch 안 함. */
  selectedDateIso: string | null
  birthInfo: BirthInfo
}

/**
 * 사용자가 캘린더에서 특정 날짜를 클릭하면 그 날짜의 daily augment를 fetch해
 * SelectedDatePanel 위에 미니 카드로 표시.
 *
 * - selectedDate 변경 시마다 한 번 fetch (debounce 없음 — 클릭 빈도 낮음)
 * - 실패는 조용히 숨김 (보조 데이터)
 * - 기존 SelectedDatePanel은 무수정
 */
export default function DailyAugmentCard({
  selectedDateIso,
  birthInfo,
}: DailyAugmentCardProps) {
  const [augment, setAugment] = useState<CalendarCrossAugment | null>(null)

  useEffect(() => {
    if (!selectedDateIso) {
      setAugment(null)
      return
    }
    const lat = birthInfo.latitude
    const lng = birthInfo.longitude
    if (lat == null || lng == null) return
    let cancelled = false
    setAugment(null) // 새 날짜 클릭 시 즉시 클리어 (이전 데이터 깜박임 방지)
    fetch('/api/calendar/cross-augment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        birth: {
          birthDate: birthInfo.birthDate,
          birthTime: birthInfo.birthTime,
          gender: birthInfo.gender.toLowerCase(),
          timezone: birthInfo.timezone ?? 'Asia/Seoul',
          latitude: lat,
          longitude: lng,
        },
        scope: 'daily',
        queryDate: new Date(selectedDateIso + 'T12:00:00+09:00').toISOString(),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.data) setAugment(j.data) })
      .catch(() => { /* 보조 데이터 — 조용히 무시 */ })
    return () => { cancelled = true }
  }, [selectedDateIso, birthInfo.birthDate, birthInfo.birthTime, birthInfo.gender, birthInfo.timezone, birthInfo.latitude, birthInfo.longitude])

  if (!augment) return null
  return (
    <CrossAugmentCard
      augment={augment}
      scope="daily"
      scopeLabel={`${selectedDateIso} 흐름`}
    />
  )
}
