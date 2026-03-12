'use client'

import React from 'react'

import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'

type EventCategory = 'wealth' | 'career' | 'love' | 'health' | 'travel' | 'study' | 'general'
type ImportanceGrade = 0 | 1 | 2 | 3 | 4

interface ImportantDate {
  date: string
  grade: ImportanceGrade
  originalGrade?: ImportanceGrade
  displayGrade?: ImportanceGrade
  score: number
  categories: EventCategory[]
  title: string
  description: string
  warnings?: string[]
  timingSignals?: string[]
}

interface DayCellProps {
  date: Date | null
  dateInfo?: ImportantDate
  isToday: boolean
  isSelected: boolean
  onClick: (date: Date | null) => void
  className: string
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
  const effectiveGrade = dateInfo?.displayGrade ?? dateInfo?.grade ?? 2

  const labels = React.useMemo(
    () => ({
      caution: locale === 'ko' ? '\u26A0 \uC8FC\uC758' : '\u26A0 Caution',
      timing: locale === 'ko' ? '\u23F1 \uD0C0\uC774\uBC0D' : '\u23F1 Timing',
      categories: {
        wealth: locale === 'ko' ? '\u{1F4B0} \uB3C8' : '\u{1F4B0} Money',
        career: locale === 'ko' ? '\u{1F4BC} \uC77C' : '\u{1F4BC} Work',
        love: locale === 'ko' ? '\u{1F495} \uC5F0\uC560' : '\u{1F495} Love',
        travel: locale === 'ko' ? '\u{1F9ED} \uC774\uB3D9' : '\u{1F9ED} Move',
        health: locale === 'ko' ? '\u{1F4AA} \uAC74\uAC15' : '\u{1F4AA} Health',
        study: locale === 'ko' ? '\u{1F4D8} \uD559\uC5C5' : '\u{1F4D8} Study',
      } as const satisfies Record<Exclude<EventCategory, 'general'>, string>,
      daySuffix: locale === 'ko' ? '\uC77C' : '',
      noInfo: locale === 'ko' ? '\uC815\uBCF4 \uC5C6\uC74C' : 'No info',
      today: locale === 'ko' ? '\uC624\uB298' : 'Today',
    }),
    [locale]
  )

  const miniTags = React.useMemo(() => {
    if (!dateInfo) return []

    const tags: Array<{ label: string; warning?: boolean }> = []
    const isCaution = effectiveGrade >= 3 || (dateInfo.warnings?.length || 0) > 0
    if (isCaution) {
      tags.push({ label: labels.caution, warning: true })
    }

    for (const category of dateInfo.categories || []) {
      if (category === 'general') continue
      const tag = labels.categories[category]
      if (!tag) continue
      tags.push({ label: tag })
      if (tags.length >= 2) break
    }

    if (tags.length < 2 && (dateInfo.timingSignals?.length || 0) > 0) {
      tags.push({ label: labels.timing })
    }

    return tags.slice(0, 2)
  }, [dateInfo, effectiveGrade, labels])

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
    ? `${date.getDate()}${labels.daySuffix}, ${
        typeof effectiveGrade === 'number' ? getGradeLabel(effectiveGrade) : labels.noInfo
      }${isToday ? `, ${labels.today}` : ''}`
    : undefined

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
              <span
                className={`${styles.gradeIndicator} ${styles[`gradeIndicator${effectiveGrade}`]}`}
              />
            </div>
          )}
          {miniTags.length > 0 && (
            <div className={styles.dayMiniTags} aria-hidden="true">
              {miniTags.map((tag) => (
                <span
                  key={tag.label}
                  className={`${styles.dayMiniTag} ${tag.warning ? styles.dayMiniTagWarning : ''}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
})

export default DayCell
