'use client'

import React, { useState, useMemo } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { parseLocalDate } from './utils'
import type { ImportantDate, EventCategory } from './types'

interface ActivityFinderProps {
  allDates: ImportantDate[]
  onDateSelect: (date: Date, info: ImportantDate) => void
}

interface ActivityDef {
  key: string
  emoji: string
  labelKo: string
  labelEn: string
  cat: EventCategory
}

const ACTIVITIES: ActivityDef[] = [
  { key: 'marriage', emoji: '💍', labelKo: '결혼', labelEn: 'Marriage', cat: 'love' },
  { key: 'career', emoji: '💼', labelKo: '면접·계약', labelEn: 'Interview', cat: 'career' },
  { key: 'investment', emoji: '📈', labelKo: '투자', labelEn: 'Invest', cat: 'wealth' },
  { key: 'moving', emoji: '🚚', labelKo: '이사', labelEn: 'Move', cat: 'travel' },
  { key: 'study', emoji: '📚', labelKo: '학업', labelEn: 'Study', cat: 'study' },
  { key: 'travel', emoji: '✈️', labelKo: '여행', labelEn: 'Travel', cat: 'travel' },
]

/**
 * "X 하고 싶은데 언제가 좋아?" — pick an activity, see top 5 dates in
 * the next 60 days. Splits by axis when scoreBreakdown is available so
 * users can see "사주만 좋은 날" / "점성만 좋은 날" / "둘 다 좋은 날"
 * separately and pick by their own preference.
 */
export default function ActivityFinder({ allDates, onDateSelect }: ActivityFinderProps) {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [selected, setSelected] = useState<ActivityDef | null>(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const matches = useMemo(() => {
    if (!selected) return []
    const horizon = new Date(today)
    horizon.setDate(today.getDate() + 60)
    return allDates
      .filter((d) => {
        const dt = parseLocalDate(d.date)
        return (
          dt.getTime() >= today.getTime() &&
          dt.getTime() <= horizon.getTime() &&
          d.grade <= 1 &&
          d.categories?.includes(selected.cat)
        )
      })
      .sort((a, b) => a.grade - b.grade || b.score - a.score)
      .slice(0, 5)
  }, [allDates, selected, today])

  return (
    <section
      style={{
        margin: '0 16px 20px',
        padding: '14px 16px',
        border: '1px solid rgba(167,139,250,0.22)',
        borderRadius: 14,
        background: 'rgba(28,22,52,0.45)',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '0.98em', fontWeight: 700 }}>
        🎯 {isKo ? '뭘 하고 싶어요?' : 'What do you want to do?'}
        <span style={{ marginLeft: 8, fontWeight: 400, fontSize: '0.85em', opacity: 0.7 }}>
          {isKo ? '향후 60일 중 좋은 날 찾기' : 'Find best days in next 60 days'}
        </span>
      </h3>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 10,
        }}
      >
        {ACTIVITIES.map((a) => {
          const active = selected?.key === a.key
          return (
            <button
              key={a.key}
              onClick={() => setSelected(active ? null : a)}
              style={{
                padding: '6px 12px',
                border: `1px solid ${active ? 'rgba(167,139,250,0.6)' : 'rgba(167,139,250,0.25)'}`,
                borderRadius: 999,
                background: active ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
                color: active ? '#c4b5fd' : 'rgba(255,255,255,0.85)',
                cursor: 'pointer',
                fontSize: '0.9em',
              }}
            >
              {a.emoji} {isKo ? a.labelKo : a.labelEn}
            </button>
          )
        })}
      </div>
      {selected && (
        <div style={{ marginTop: 12 }}>
          {matches.length === 0 ? (
            <p style={{ fontSize: '0.9em', opacity: 0.78 }}>
              {isKo
                ? `다음 60일 중 ${selected.labelKo}에 강하게 받쳐주는 날이 잘 안 보여요. 단단하게 계획만 세우는 데 집중해 보세요.`
                : `No clearly favorable ${selected.labelEn} days in the next 60 days.`}
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {matches.map((d) => {
                const dt = parseLocalDate(d.date)
                const sajuV = d.scoreBreakdown?.sajuAxis
                const astroV = d.scoreBreakdown?.astroAxis
                return (
                  <li
                    key={d.date}
                    onClick={() => onDateSelect(dt, d)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onDateSelect(dt, d)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      padding: '8px 10px',
                      marginTop: 4,
                      border: '1px solid rgba(167,139,250,0.18)',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      fontSize: '0.92em',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span>
                      ⭐ <strong>{dt.getMonth() + 1}/{dt.getDate()}일</strong>{' '}
                      <span style={{ opacity: 0.7 }}>(점수 {d.score})</span>
                    </span>
                    {typeof sajuV === 'number' && typeof astroV === 'number' && (
                      <span style={{ fontSize: '0.85em', opacity: 0.78 }}>
                        사주 {sajuV} · 점성 {astroV}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
