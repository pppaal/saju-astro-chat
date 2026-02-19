'use client'

// src/components/calendar/DayCell.tsx
import React from 'react'

import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'

type EventCategory = 'wealth' | 'career' | 'love' | 'health' | 'travel' | 'study' | 'general'
type ImportanceGrade = 0 | 1 | 2 | 3 | 4

interface ImportantDate {
  date: string
  grade: ImportanceGrade
  score: number
  categories: EventCategory[]
  title: string
  description: string
}

interface DayCellProps {
  date: Date | null
  dateInfo?: ImportantDate
  isToday: boolean
  isSelected: boolean
  onClick: (date: Date | null) => void
  className: string
}

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  wealth: 'W',
  career: 'C',
  love: 'L',
  health: 'H',
  travel: 'T',
  study: 'S',
  general: 'G',
}

function getGradeEmoji(grade: number): string {
  switch (grade) {
    case 0:
      return 'A' // 최고의 날
    case 1:
      return 'B' // 좋은 날
    case 2:
      return 'C' // 보통 날
    case 3:
      return 'D' // 안좋은 날
    case 4:
      return 'E' // 최악의 날
    default:
      return 'C'
  }
}

const DayCell = React.memo(function DayCell({
  date,
  dateInfo,
  isToday,
  isSelected,
  onClick,
  className,
}: DayCellProps) {
  const { locale, t } = useI18n()

  const getGradeLabel = (grade: number) => {
    const key = `calendar.grades.${grade}`
    return t(
      key,
      grade === 0
        ? 'Best Day'
        : grade === 1
          ? 'Good Day'
          : grade === 2
            ? 'Normal Day'
            : grade === 3
              ? 'Bad Day'
              : 'Worst Day'
    )
  }

  const ariaLabel = date
    ? `${date.getDate()}${locale === 'ko' ? '일' : ''}, ${
        dateInfo ? getGradeLabel(dateInfo.grade) : locale === 'ko' ? '정보 없음' : 'No info'
      }${isToday ? (locale === 'ko' ? ', 오늘' : ', Today') : ''}`
    : undefined

  // 디버깅: dateInfo 확인
  if (date && !dateInfo) {
    // logger.info(`No dateInfo for ${date.toISOString().split('T')[0]}`);
  }

  return (
    <div
      className={className}
      onClick={() => onClick(date)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(date)
        }
      }}
      role="gridcell"
      tabIndex={date ? 0 : -1}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      aria-current={isToday ? 'date' : undefined}
    >
      {date && (
        <>
          <span className={styles.dayNumber}>{date.getDate()}</span>
          {dateInfo && (
            <div className={styles.dayIndicators} aria-hidden="true">
              {dateInfo.categories &&
                dateInfo.categories.length > 0 &&
                dateInfo.categories.slice(0, 2).map((cat, i) => (
                  <span key={i} className={styles.dayEmoji}>
                    {CATEGORY_EMOJI[cat]}
                  </span>
                ))}
              <span className={styles.gradeIndicator}>{getGradeEmoji(dateInfo.grade)}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
})

export default DayCell
