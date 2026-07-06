'use client'

/* ============================================================
   /calendar/preview — client wrapper.
   서버에서 빌드한 4 tier 데이터를 받아 Shell + Tiers render-prop 와
   결합. Shell 자체가 'use client' 라 render-prop 도 같이 클라이언트
   에서 만들어야 한다 (RSC 가 함수 prop 직렬화 불가).

   일(日) 티어는 상태로 든다 — 서버가 준 '오늘' day 가 기본값이고, 월
   그리드에서 다른 날을 골라 줌인하면 /api/calendar/day 로 그 날짜의
   day 를 받아 갈아끼운다(같은 assembleDayTier 경로라 월↔일 내용 일치).
   예전엔 어떤 날을 골라도 일 티어가 항상 '오늘'이라 월에서 본 날과
   줌인한 날이 어긋났다.
   ============================================================ */

import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DestinypalShell } from '@/components/calendar/shell'
import { LifetimeTier } from '@/components/calendar/tiers/LifetimeTier'
import { MonthTier } from '@/components/calendar/tiers/MonthTier'
import { DayTier } from '@/components/calendar/tiers/DayTier'
import { useI18n } from '@/i18n/I18nProvider'

import type {
  DestinyUserSummary,
  DestinyLifetime,
  DestinyMonth,
  DestinyDay,
} from '@/types/calendar'

export interface PreviewClientProps {
  topbar: {
    whoBirthLine: string
    place: string
    ilganHanja: string
  }
  user: DestinyUserSummary & { gyeokgukStatus?: string; rootStatus?: string }
  lifetime: DestinyLifetime
  month: DestinyMonth
  day: DestinyDay
  /**
   * 일 티어 재빌드 fetch(/api/calendar/day)에 강제로 실을 생일 override 쿼리.
   * 세션/URL 과 다른 고정 본명을 쓰는 surface(/calendar/preview)용 — 미지정 시
   * 현재 URL 쿼리(override 규약) 또는 세션 본명이 그대로 쓰인다.
   */
  dayFetchParams?: Record<string, string>
}

export default function PreviewClient({
  topbar,
  user,
  lifetime,
  month,
  day,
  dayFetchParams,
}: PreviewClientProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const searchParams = useSearchParams()

  // 일 티어 데이터 — 기본은 서버가 빌드한 '오늘'. 다른 날 선택 시 교체.
  const [dayData, setDayData] = useState<DestinyDay>(day)
  const [dayLoading, setDayLoading] = useState(false)
  const [dayError, setDayError] = useState(false)
  // 받아온 날짜 캐시(세션 내) + 늦게 도착한 응답이 최신 선택을 덮지 않게 seq 가드.
  const dayCacheRef = useRef<Map<string, DestinyDay>>(new Map())
  const reqSeqRef = useRef(0)
  const lastIsoRef = useRef(day.date)

  const loadDay = useCallback(
    async (iso: string) => {
      lastIsoRef.current = iso
      const seq = ++reqSeqRef.current
      setDayError(false)

      // 오늘(서버 빌드분) 또는 이미 받아둔 날짜 — 네트워크 없이 즉시.
      const cached = iso === day.date ? day : dayCacheRef.current.get(iso)
      if (cached) {
        setDayData(cached)
        setDayLoading(false)
        return
      }

      setDayLoading(true)
      try {
        // 익명 override(?date=&lat=…) 규약 보존 — 현재 쿼리를 그대로 넘긴다.
        const qs = new URLSearchParams(searchParams?.toString() ?? '')
        for (const [k, v] of Object.entries(dayFetchParams ?? {})) qs.set(k, v)
        qs.set('day', iso)
        const res = await fetch(`/api/calendar/day?${qs.toString()}`)
        if (!res.ok) throw new Error(`day fetch ${res.status}`)
        const json = (await res.json()) as { data?: { day?: DestinyDay } }
        const fetched = json?.data?.day
        if (!fetched) throw new Error('empty day payload')
        dayCacheRef.current.set(iso, fetched)
        if (seq !== reqSeqRef.current) return // 더 최신 선택이 있음 — 버린다.
        setDayData(fetched)
        setDayLoading(false)
      } catch {
        if (seq !== reqSeqRef.current) return
        setDayLoading(false)
        setDayError(true)
      }
    },
    [day, searchParams, dayFetchParams]
  )

  // 월 그리드 선택일 → 'YYYY-MM-DD'.
  const isoOfDay = (d: number) => `${month.ym}-${String(d).padStart(2, '0')}`
  const isToday = dayData.date === day.date

  // 셀 선택 시 디바운스 프리로드 — CTA 없이 스와이프/레일/키보드로 줌인해도
  // 고른 날이 이미 준비돼 있게. 연타 스캔이 rate limit 을 치지 않게 400ms.
  const selectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSelectDay = useCallback(
    (d: number) => {
      if (selectTimerRef.current) clearTimeout(selectTimerRef.current)
      selectTimerRef.current = setTimeout(() => void loadDay(isoOfDay(d)), 400)
    },
    // isoOfDay 는 month.ym 에만 의존.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadDay, month.ym]
  )

  return (
    <DestinypalShell
      topbar={topbar}
      renderLife={({ onDive }) => <LifetimeTier user={user} lifetime={lifetime} onDive={onDive} />}
      renderMonth={({ onRise, onFocusDay, canRise }) => (
        <MonthTier
          month={month}
          onRise={onRise}
          onSelectDay={handleSelectDay}
          onDive={(d) => {
            if (selectTimerRef.current) clearTimeout(selectTimerRef.current)
            void loadDay(isoOfDay(d))
            onFocusDay()
          }}
          showRise={canRise}
        />
      )}
      renderDay={({ onRise }) => (
        <div style={{ position: 'relative' }}>
          <DayTier day={dayData} onRise={onRise} sex={user.sex} isToday={isToday} />
          {(dayLoading || dayError) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 30,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'rgba(10, 12, 24, 0.66)',
                backdropFilter: 'blur(3px)',
                borderRadius: 18,
              }}
              role="status"
              aria-live="polite"
            >
              {dayLoading ? (
                <span style={{ color: '#fff', fontSize: 14 }}>
                  {ko ? '그날의 운을 계산하고 있어요…' : 'Reading that day…'}
                </span>
              ) : (
                <>
                  <span style={{ color: '#fff', fontSize: 14 }}>
                    {ko ? '그날 운을 불러오지 못했어요.' : "Couldn't load that day."}
                  </span>
                  <button
                    type="button"
                    onClick={() => void loadDay(lastIsoRef.current)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.4)',
                      background: 'transparent',
                      color: '#fff',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {ko ? '다시 시도' : 'Retry'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    />
  )
}
