'use client'

import { useMemo } from 'react'
import styles from './CalendarV2.module.css'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import {
  buildHourlyEnergyCurve,
  buildHourlyEvents,
  overallDailyEnergyPercent,
  type HourlyEvent,
} from './hourlyEventBuilder'

interface DailyViewProps {
  selectedDate: string // YYYY-MM-DD
  signals: NormalizedSignal[]
  onPrevDay: () => void
  onNextDay: () => void
}

const POLARITY_ICON: Record<HourlyEvent['polarity'], string> = {
  strength: '☀',
  caution: '⚠',
  balance: '◐',
}

const POLARITY_GLYPH_CLASS: Record<HourlyEvent['polarity'], string> = {
  strength: styles.eventIconStrength,
  caution: styles.eventIconCaution,
  balance: styles.eventIconBalance,
}

const POLARITY_TIME_CLASS: Record<HourlyEvent['polarity'], string> = {
  strength: styles.eventTimeStrength,
  caution: styles.eventTimeCaution,
  balance: '',
}

function formatKDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}월 ${parseInt(d)}일`
}

function EnergyRing({ value, label }: { value: number; label: string }) {
  const radius = 38
  const stroke = 5
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - value / 100)
  return (
    <div className={styles.energyRing}>
      <svg width={88} height={88} viewBox="0 0 88 88" aria-hidden="true">
        <circle
          cx={44}
          cy={44}
          r={radius}
          stroke="rgba(167, 139, 250, 0.18)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={44}
          cy={44}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className={styles.energyRingValue}>
        <span className={styles.energyRingPercent}>{value}%</span>
        <span className={styles.energyRingLabel}>{label}</span>
      </div>
    </div>
  )
}

function Waveform({ values }: { values: number[] }) {
  // Build a smooth-ish path from 24 hourly values.
  const w = 280
  const h = 70
  const step = w / (values.length - 1)
  const points = values.map((v, i) => `${i * step},${h - (v / 100) * h * 0.85 - 4}`)
  const path = `M ${points[0]} L ${points.slice(1).join(' L ')}`
  const fill = `${path} L ${w},${h} L 0,${h} Z`

  return (
    <svg
      className={styles.waveform}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(139, 92, 246, 0.45)" />
          <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#waveFill)" />
      <path d={path} stroke="#a78bfa" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function DailyView({ selectedDate, signals, onPrevDay, onNextDay }: DailyViewProps) {
  const events = useMemo(() => buildHourlyEvents(signals, 5), [signals])
  const curve = useMemo(() => buildHourlyEnergyCurve(events), [events])
  const energyPercent = useMemo(() => overallDailyEnergyPercent(curve), [curve])

  return (
    <>
      <div className={styles.dateNav}>
        <button
          type="button"
          className={styles.dateNavBtn}
          onClick={onPrevDay}
          aria-label="이전 날"
        >
          ‹
        </button>
        <span className={styles.dateNavLabel}>{formatKDate(selectedDate)}</span>
        <button
          type="button"
          className={styles.dateNavBtn}
          onClick={onNextDay}
          aria-label="다음 날"
        >
          ›
        </button>
      </div>

      <div className={styles.energyCard}>
        <EnergyRing value={energyPercent} label="종합 에너지" />
        <Waveform values={curve} />
      </div>

      <div className={styles.eventList}>
        {events.length === 0 ? (
          <div className={styles.emptyState}>
            이 날짜의 활성 신호가 부족해요. 사주 정보를 확인해주세요.
          </div>
        ) : (
          events.map((event, idx) => (
            <div key={`${event.signalId}-${idx}`} className={styles.eventCard}>
              <div className={`${styles.eventIcon} ${POLARITY_GLYPH_CLASS[event.polarity]}`}>
                {POLARITY_ICON[event.polarity]}
              </div>
              <div className={styles.eventBody}>
                <div className={styles.eventHeaderRow}>
                  <span className={styles.eventTitle}>{event.title}</span>
                  <span className={`${styles.eventTime} ${POLARITY_TIME_CLASS[event.polarity]}`}>
                    🕐 {event.time}
                  </span>
                </div>
                <p className={styles.eventProse}>{event.prose}</p>
                <span className={styles.eventLayerBadge}>L{event.layer}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
