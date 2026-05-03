'use client'

import React from 'react'

import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { getGradeLabel as getGradeLabelFromConst, type CalendarLocale } from './constants'

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
  sajuFactors?: string[]
  astroFactors?: string[]
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
  const { locale } = useI18n()
  const effectiveGrade = dateInfo?.displayGrade ?? dateInfo?.grade ?? 2

  const labels = React.useMemo(
    () => ({
      caution: locale === 'ko' ? '⚠ 주의' : '⚠ Caution',
      timing: locale === 'ko' ? '⏱ 타이밍' : '⏱ Timing',
      categories: {
        wealth: locale === 'ko' ? '💰 돈' : '💰 Money',
        career: locale === 'ko' ? '💼 일' : '💼 Work',
        love: locale === 'ko' ? '💞 관계' : '💞 Love',
        travel: locale === 'ko' ? '🧭 이동' : '🧭 Move',
        health: locale === 'ko' ? '💪 건강' : '💪 Health',
        study: locale === 'ko' ? '📘 학업' : '📘 Study',
      } as const satisfies Record<Exclude<EventCategory, 'general'>, string>,
      daySuffix: locale === 'ko' ? '일' : '',
      noInfo: locale === 'ko' ? '정보 없음' : 'No info',
      today: locale === 'ko' ? '오늘' : 'Today',
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

  const getGradeLabel = React.useCallback(
    (grade: number) => getGradeLabelFromConst(grade, locale as CalendarLocale).full,
    [locale]
  )

  // Tooltip — score + 핵심 사주·점성 신호 미리보기
  const cellTooltip = React.useMemo(() => {
    if (!dateInfo) return undefined
    const parts: string[] = [
      `${getGradeLabel(effectiveGrade)} (${dateInfo.score}점)`,
    ]
    const saju = (dateInfo.sajuFactors || [])[0]
    const astro = (dateInfo.astroFactors || [])[0]
    if (saju) parts.push(locale === 'ko' ? `사주: ${saju}` : `Saju: ${saju}`)
    if (astro) parts.push(locale === 'ko' ? `점성: ${astro}` : `Astro: ${astro}`)
    return parts.join('\n')
  }, [dateInfo, effectiveGrade, locale, getGradeLabel])

  const ariaLabel = date
    ? `${date.getDate()}${labels.daySuffix}, ${typeof effectiveGrade === 'number' ? getGradeLabel(effectiveGrade) : labels.noInfo}${dateInfo?.score != null ? `, ${dateInfo.score}점` : ''}${isToday ? `, ${labels.today}` : ''}`
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
      title={cellTooltip}
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
