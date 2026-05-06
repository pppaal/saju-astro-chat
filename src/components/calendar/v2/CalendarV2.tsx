'use client'

/**
 * CalendarV2 — Layer-first calendar (replaces score-grade DestinyCalendar).
 *
 * Two views:
 *   - Monthly: 7×6 grid + per-day polarity dot + "이달의 우주적 테마" card
 *     citing the top-active L1-L10 layers.
 *   - Daily: < date > navigator + circular 종합 에너지 ring + 24h waveform
 *     + 3-5 hourly event cards (시진 mapped per layer family).
 *
 * Data source: existing /api/destiny-matrix/ai-report doesn't expose
 * monthly/daily signal pools directly. For the MVP we use the report
 * fixture's signalSynthesis slice when available; future work will add
 * a dedicated /api/calendar-v2 that returns per-day signal slices.
 */

import { useEffect, useMemo, useState } from 'react'
import styles from './CalendarV2.module.css'
import MonthlyView from './MonthlyView'
import DailyView from './DailyView'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'

interface CalendarV2Props {
  /** All signals available for the displayed window (month or longer). */
  signals: NormalizedSignal[]
  /** Initial year, defaults to current. */
  initialYear?: number
  /** Initial month (1-12), defaults to current. */
  initialMonth?: number
}

const ZODIAC_SEASON: Record<number, string> = {
  1: '염소자리 시즌',
  2: '물병자리 시즌',
  3: '물고기자리 시즌',
  4: '양자리 시즌',
  5: '쌍둥이자리 시즌',
  6: '게자리 시즌',
  7: '사자자리 시즌',
  8: '처녀자리 시즌',
  9: '천칭자리 시즌',
  10: '전갈자리 시즌',
  11: '궁수자리 시즌',
  12: '염소자리 시즌',
}

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/**
 * Distribute signals deterministically across the month's days. Each day
 * receives a stable subset based on (signalId hash + date hash) so the
 * calendar dots are consistent on re-render. This is a heuristic mapping
 * pending a real per-day engine call.
 */
function deriveDayPolarityMap(
  year: number,
  month: number,
  signals: NormalizedSignal[]
): Map<string, 'strength' | 'caution' | 'balance'> {
  const map = new Map<string, 'strength' | 'caution' | 'balance'>()
  const daysInMonth = new Date(year, month, 0).getDate()
  if (signals.length === 0) return map
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    // Hash date+month to pick which signal hits today (if any)
    let h = 0
    for (let i = 0; i < date.length; i++) h = ((h << 5) - h + date.charCodeAt(i)) | 0
    const idx = Math.abs(h) % (signals.length * 3)
    if (idx >= signals.length) continue // ~2/3 of days have no marker
    const signal = signals[idx]
    map.set(date, signal.polarity)
  }
  return map
}

function deriveDailySignals(date: string, signals: NormalizedSignal[]): NormalizedSignal[] {
  if (signals.length === 0) return []
  let h = 0
  for (let i = 0; i < date.length; i++) h = ((h << 5) - h + date.charCodeAt(i)) | 0
  const seed = Math.abs(h)
  // Pick a stable rotating window of 8-12 signals for this date
  const windowSize = Math.min(12, Math.max(8, signals.length))
  const start = seed % Math.max(1, signals.length - windowSize + 1)
  return signals.slice(start, start + windowSize)
}

export default function CalendarV2({
  signals,
  initialYear,
  initialMonth,
}: CalendarV2Props) {
  const today = todayIso()
  const [todayY, todayM] = today.split('-').map(Number)
  const [year, setYear] = useState(initialYear ?? todayY)
  const [month, setMonth] = useState(initialMonth ?? todayM)
  const [view, setView] = useState<'monthly' | 'daily'>('monthly')
  const [selectedDate, setSelectedDate] = useState<string>(today)

  useEffect(() => {
    // Keep selectedDate in sync if user changes month via prev/next
    const [sy, sm] = selectedDate.split('-').map(Number)
    if (sy !== year || sm !== month) {
      setSelectedDate(`${year}-${String(month).padStart(2, '0')}-01`)
    }
  }, [year, month, selectedDate])

  const dayPolarityMap = useMemo(
    () => deriveDayPolarityMap(year, month, signals),
    [year, month, signals]
  )

  const dailySignals = useMemo(
    () => deriveDailySignals(selectedDate, signals),
    [selectedDate, signals]
  )

  return (
    <main className={styles.container}>
      <div className={styles.body}>
        <div className={styles.topBar}>
          <div className={styles.tabGroup} role="tablist" aria-label="캘린더 보기">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'monthly'}
              className={`${styles.tabBtn} ${view === 'monthly' ? styles.tabBtnActive : ''}`}
              onClick={() => setView('monthly')}
              aria-label="월간 보기"
            >
              📅
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'daily'}
              className={`${styles.tabBtn} ${view === 'daily' ? styles.tabBtnActive : ''}`}
              onClick={() => setView('daily')}
              aria-label="일간 보기"
            >
              ⊞
            </button>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.headerMonth}>
              {year}년 {month}월
            </span>
            <span className={styles.headerSeason}>{ZODIAC_SEASON[month]}</span>
          </div>
        </div>

        {view === 'monthly' ? (
          <MonthlyView
            year={year}
            month={month}
            signals={signals}
            dayPolarityMap={dayPolarityMap}
            selectedDate={selectedDate}
            todayDate={today}
            onSelectDate={(date) => {
              setSelectedDate(date)
              setView('daily')
            }}
          />
        ) : (
          <DailyView
            selectedDate={selectedDate}
            signals={dailySignals}
            onPrevDay={() => {
              const prev = shiftDay(selectedDate, -1)
              setSelectedDate(prev)
              const [py, pm] = prev.split('-').map(Number)
              if (py !== year || pm !== month) {
                setYear(py)
                setMonth(pm)
              }
            }}
            onNextDay={() => {
              const next = shiftDay(selectedDate, 1)
              setSelectedDate(next)
              const [ny, nm] = next.split('-').map(Number)
              if (ny !== year || nm !== month) {
                setYear(ny)
                setMonth(nm)
              }
            }}
          />
        )}
      </div>
    </main>
  )
}
