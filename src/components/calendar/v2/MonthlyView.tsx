'use client'

import { useMemo } from 'react'
import styles from './CalendarV2.module.css'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import { buildMonthlyTheme } from './monthlyThemeBuilder'

interface MonthlyViewProps {
  year: number
  month: number // 1-12
  /** Signals computed for this month (engine output). */
  signals: NormalizedSignal[]
  /** Map of date (YYYY-MM-DD) → top polarity for that day. */
  dayPolarityMap: Map<string, 'strength' | 'caution' | 'balance'>
  selectedDate: string | null
  todayDate: string
  onSelectDate: (date: string) => void
}

const DAY_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토']

export default function MonthlyView({
  year,
  month,
  signals,
  dayPolarityMap,
  selectedDate,
  todayDate,
  onSelectDate,
}: MonthlyViewProps) {
  const theme = useMemo(() => buildMonthlyTheme(signals), [signals])

  const cells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const startWeekday = firstDay.getDay() // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(year, month, 0).getDate()
    const arr: Array<{ day: number | null; date: string | null }> = []
    for (let i = 0; i < startWeekday; i++) {
      arr.push({ day: null, date: null })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      arr.push({ day: d, date })
    }
    while (arr.length % 7 !== 0) arr.push({ day: null, date: null })
    return arr
  }, [year, month])

  return (
    <>
      <div className={styles.monthCard}>
        <div className={styles.weekRow}>
          {DAY_OF_WEEK.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className={styles.dayGrid}>
          {cells.map((cell, idx) => {
            if (!cell.date) {
              return <div key={`empty-${idx}`} className={`${styles.dayCell} ${styles.dayCellEmpty}`} />
            }
            const polarity = dayPolarityMap.get(cell.date)
            const isToday = cell.date === todayDate
            const isSelected = cell.date === selectedDate
            const cellClass = [
              styles.dayCell,
              isToday ? styles.dayCellToday : '',
              isSelected && !isToday ? styles.dayCellSelected : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={cell.date}
                type="button"
                className={cellClass}
                onClick={() => onSelectDate(cell.date as string)}
              >
                <span>{cell.day}</span>
                {polarity && (
                  <span className={styles.dotRow}>
                    <span
                      className={`${styles.dot} ${
                        polarity === 'strength'
                          ? styles.dotStrength
                          : polarity === 'caution'
                            ? styles.dotCaution
                            : styles.dotBalance
                      }`}
                    />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {theme.topLayers.length > 0 && (
        <>
          <p className={styles.themeLabel}>이달의 우주적 테마 ({theme.layerLabel})</p>
          <div className={styles.themeCard}>
            <div className={styles.themeHeader}>
              <span className={styles.themeIcon} aria-hidden="true">
                ✦
              </span>
              <h3 className={styles.themeTitle}>{theme.title}</h3>
            </div>
            <p className={styles.themeProse}>{theme.prose}</p>
          </div>
        </>
      )}
    </>
  )
}
