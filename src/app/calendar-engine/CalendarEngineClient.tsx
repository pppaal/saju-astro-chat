'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadSharedBirthInfo } from '@/components/calendar/sharedBirthInfo'
import { LOCATION_COORDS } from './lookupCoords'
import CalendarEngineMonthly from './CalendarEngineMonthly'
import CalendarEngineDaily from './CalendarEngineDaily'
import { ScrollText, Activity, Cpu, Sun, Moon, Calendar as CalendarIcon } from 'lucide-react'
import type { BirthInfo } from '@/components/calendar/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'
import { logger } from '@/lib/logger'

type ViewMode = 'monthly' | 'daily' | 'stats'

interface EngineResponse {
  cells: CalendarCell[]
  meta: {
    elapsedMs: number
    cellCount: number
    signalCount: number
    natal: {
      dayMaster: string
      yongsin: string
      strength: 'strong' | 'medium' | 'weak'
      sect: 'day' | 'night'
    }
  }
}

/**
 * /calendar-engine — 신호 기반 캘린더 프리뷰.
 *
 * 기존 /calendar (DestinyMatrixPlanner)와 동일한 모바일 + 다크 톤 유지하면서
 * 데이터 소스만 새 엔진(/api/calendar-engine)으로 교체.
 *
 * 헤더 뱃지 톤·monthly/daily/stats 토글 구조 그대로.
 * daily 뷰만 새 엔진의 ActiveSignal[] + matchedPatterns + themeScores를 노출.
 */
export default function CalendarEngineClient() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [birthInfo, setBirthInfo] = useState<BirthInfo | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [resp, setResp] = useState<EngineResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const [currentDay, setCurrentDay] = useState(today.getDate())
  const viewYear = today.getFullYear()
  const viewMonth = today.getMonth()   // 0-indexed

  // ── 1) 출생정보 hydrate ──
  useEffect(() => {
    const shared = loadSharedBirthInfo()
    if (shared?.birthDate && shared.birthTime && shared.birthPlace) {
      setBirthInfo(shared)
    }
    setHydrated(true)
  }, [])

  // ── 2) 엔진 호출 ──
  const buildCalendar = useCallback(async (info: BirthInfo) => {
    const coords = resolveCoords(info)
    if (!coords) {
      setError(`알 수 없는 도시: ${info.birthPlace}`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const start = new Date(viewYear, 0, 1).toISOString()
      const end = new Date(viewYear, 11, 31, 23, 59).toISOString()
      const res = await fetch('/api/calendar-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: info.birthDate,
          birthTime: info.birthTime,
          gender: info.gender === 'Female' ? 'female' : 'male',
          latitude: coords.lat,
          longitude: coords.lng,
          timeZone: coords.tz,
          range: { start, end, granularity: 'day' },
          options: { includeEvidence: true, enablePatterns: true },
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text.slice(0, 200))
      }
      const json = (await res.json()) as EngineResponse
      setResp(json)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.error?.('[calendar-engine] fetch failed:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [viewYear])

  // ── 3) hydrate 직후 자동 호출 ──
  useEffect(() => {
    if (hydrated && birthInfo) {
      void buildCalendar(birthInfo)
    }
  }, [hydrated, birthInfo, buildCalendar])

  // ── Gate: 출생정보 없으면 입력 페이지로 ──
  if (hydrated && !birthInfo) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-zinc-400 mb-4">출생 정보가 필요합니다.</p>
        <button
          onClick={() => router.push('/calendar')}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-lg text-white text-sm font-bold"
        >
          기존 캘린더에서 입력하기
        </button>
      </div>
    )
  }

  if (!hydrated) return null

  const cells = resp?.cells ?? []
  const monthCells = cells.filter((c) => {
    const d = new Date(c.datetime)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth
  })
  const selectedCell = cells.find((c) => {
    const d = new Date(c.datetime)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === currentDay
  }) ?? null

  const natalBadge = resp?.meta.natal
  const monthLabel = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][viewMonth] + ` ${viewYear}`

  return (
    <div className="w-full max-w-md mx-auto h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col shadow-2xl overflow-hidden relative border-x border-zinc-900">
      {/* 인디고 글로우 — 기존과 동일 */}
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-900/20 blur-3xl rounded-full pointer-events-none -translate-y-1/2" />

      {/* 헤더 */}
      <header className="px-6 pt-12 pb-4 shrink-0 relative z-20 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-zinc-900 bg-amber-500 px-2.5 py-1 rounded-md tracking-wide flex items-center gap-1.5">
              <Sun className="w-3 h-3" /> {natalBadge?.dayMaster ?? '辛'} 일주
            </span>
            <span className="text-xs font-bold text-zinc-900 bg-cyan-400 px-2.5 py-1 rounded-md tracking-wide flex items-center gap-1.5">
              <Moon className="w-3 h-3" /> {natalBadge?.sect === 'day' ? 'Day' : 'Night'} 차트
            </span>
            <span className="text-[10px] font-bold text-indigo-200 bg-indigo-500/30 border border-indigo-400/40 px-2 py-1 rounded-md">
              ENGINE v2
            </span>
          </div>
          <button
            onClick={() => router.push('/calendar')}
            className="p-3 bg-zinc-900/80 rounded-xl border border-white/10 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800 hover:border-indigo-500/50 transition-all shadow-lg"
            title="기존 캘린더로"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex bg-zinc-900/50 rounded-xl p-1.5 border border-white/5 backdrop-blur-sm">
          {(['monthly', 'daily', 'stats'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize flex items-center justify-center gap-2 ${
                viewMode === mode
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {mode === 'monthly' && <ScrollText className="w-4 h-4" />}
              {mode === 'daily' && <Activity className="w-4 h-4" />}
              {mode === 'stats' && <Cpu className="w-4 h-4" />}
              {mode}
            </button>
          ))}
        </div>
      </header>

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto relative z-10 pb-10">
        {loading && (
          <div className="p-8 text-center text-zinc-500 text-sm">엔진 빌드 중…</div>
        )}
        {error && (
          <div className="p-6 mx-6 mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
            엔진 오류: {error}
          </div>
        )}

        {!loading && !error && viewMode === 'monthly' && (
          <CalendarEngineMonthly
            monthLabel={monthLabel}
            viewYear={viewYear}
            viewMonth={viewMonth}
            cells={monthCells}
            currentDay={currentDay}
            onDayClick={(d) => { setCurrentDay(d); setViewMode('daily') }}
            meta={resp?.meta}
          />
        )}

        {!loading && !error && viewMode === 'daily' && (
          <CalendarEngineDaily
            cell={selectedCell}
            currentDay={currentDay}
            onPrev={() => setCurrentDay((d) => Math.max(1, d - 1))}
            onNext={() => setCurrentDay((d) => d + 1)}
          />
        )}

        {!loading && !error && viewMode === 'stats' && (
          <div className="p-6 text-zinc-500 text-sm text-center">
            stats 뷰는 다음 wave — 우선 monthly/daily 검증.
          </div>
        )}
      </main>
    </div>
  )
}

function resolveCoords(info: BirthInfo): { lat: number; lng: number; tz: string } | null {
  if (typeof info.latitude === 'number' && typeof info.longitude === 'number' && info.timezone) {
    return { lat: info.latitude, lng: info.longitude, tz: info.timezone }
  }
  const key = info.birthPlace
  const hit = LOCATION_COORDS[key]
  if (hit) return { lat: hit.lat, lng: hit.lng, tz: hit.tz }
  return null
}
