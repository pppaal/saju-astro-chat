'use client'

import React from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { CATEGORY_EMOJI } from './constants'
import { parseLocalDate } from './utils'
import type { ImportantDate } from './types'
import { getPeakLabel, resolvePeakLevel } from './peakUtils'
import { repairMojibakeText } from '@/lib/text/mojibake'

interface MonthHighlightsProps {
  allDates: ImportantDate[]
  year: number
  month: number
  onDateSelect: (date: Date, info: ImportantDate) => void
}

const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const truncate = (text: string, len = 58) =>
  !text ? '' : text.length > len ? `${text.slice(0, len)}...` : text

const getStrategicGradeTitle = (grade: number, locale: 'ko' | 'en') => {
  const titles = {
    0: locale === 'ko' ? '실행 우선' : 'Execute-first',
    1: locale === 'ko' ? '활용 우선' : 'Leverage-first',
    2: locale === 'ko' ? '운영 우선' : 'Operate-first',
    3: locale === 'ko' ? '검토 우선' : 'Review-first',
    4: locale === 'ko' ? '방어 우선' : 'Protect-first',
  } as const
  return titles[Math.min(Math.max(grade, 0), 4) as keyof typeof titles]
}

export default function MonthHighlights({
  allDates,
  year,
  month,
  onDateSelect,
}: MonthHighlightsProps) {
  const { locale } = useI18n()
  const activeLocale = locale === 'ko' ? 'ko' : 'en'
  const months = activeLocale === 'ko' ? MONTHS_KO : MONTHS_EN

  const monthDates = allDates.filter((d) => parseLocalDate(d.date).getMonth() === month)
  const strongDates = monthDates
    .filter((d) => d.grade <= 2)
    .sort((a, b) => a.grade - b.grade || b.score - a.score)
    .slice(0, 3)
  const guardedDates = monthDates
    .filter((d) => d.grade >= 3)
    .sort((a, b) => b.grade - a.grade || a.score - b.score)
    .slice(0, 2)

  const highlightDates = [...strongDates, ...guardedDates].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  )

  if (highlightDates.length === 0) return null

  const getGradeClass = (grade: number) => {
    switch (grade) {
      case 0:
        return styles.grade0
      case 1:
        return styles.grade1
      case 2:
        return styles.grade2
      case 3:
        return styles.grade3
      case 4:
        return styles.grade4
      default:
        return styles.grade5
    }
  }

  return (
    <div className={styles.monthHighlights}>
      <h2 className={styles.highlightsTitle}>
        🌟 {year} {months[month]} {activeLocale === 'ko' ? '운영 포인트' : 'Operating Highlights'}
      </h2>
      <div className={styles.highlightsList}>
        {highlightDates.map((dateInfo, index) => {
          const peakLevel = resolvePeakLevel(dateInfo.evidence?.matrix?.peakLevel, dateInfo.score)
          const reason =
            dateInfo.summary ||
            dateInfo.evidence?.cross?.sajuEvidence ||
            dateInfo.sajuFactors?.[0] ||
            dateInfo.astroFactors?.[0] ||
            ''
          const action =
            dateInfo.grade >= 3
              ? dateInfo.warnings?.[0] ||
                (activeLocale === 'ko'
                  ? '속도를 낮추고 확인 절차를 먼저 거치세요.'
                  : 'Slow down and run checks first.')
              : dateInfo.recommendations?.[0] ||
                (activeLocale === 'ko'
                  ? '핵심 과제 1~2개를 앞단에 배치하세요.'
                  : 'Front-load one or two key tasks.')

          return (
            <div
              key={index}
              className={`${styles.highlightCard} ${getGradeClass(dateInfo.grade)}`}
              onClick={() => onDateSelect(parseLocalDate(dateInfo.date), dateInfo)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onDateSelect(parseLocalDate(dateInfo.date), dateInfo)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${parseLocalDate(dateInfo.date).getDate()}${activeLocale === 'ko' ? '일' : ''} - ${repairMojibakeText(dateInfo.title || getStrategicGradeTitle(dateInfo.grade, activeLocale))}, ${activeLocale === 'ko' ? '점수' : 'score'}: ${dateInfo.score}`}
            >
              <div className={styles.highlightHeader}>
                <span className={styles.highlightDate}>
                  {parseLocalDate(dateInfo.date).getDate()}
                  {activeLocale === 'ko' ? '일' : ''}
                </span>
                <div className={styles.highlightBadges}>
                  {peakLevel && (
                    <span className={styles.highlightPeakBadge}>
                      {getPeakLabel(peakLevel, activeLocale)}
                    </span>
                  )}
                  {((dateInfo.sajuFactors && dateInfo.sajuFactors.length > 0) ||
                    (dateInfo.astroFactors && dateInfo.astroFactors.length > 0)) && (
                    <span
                      className={styles.highlightBadge}
                      title={activeLocale === 'ko' ? '근거 반영됨' : 'Evidence included'}
                    >
                      ✨
                    </span>
                  )}
                </div>
              </div>
              <span className={styles.highlightTitle}>
                {repairMojibakeText(
                  dateInfo.title || getStrategicGradeTitle(dateInfo.grade, activeLocale)
                )}
              </span>
              {dateInfo.categories && dateInfo.categories.length > 0 && (
                <span className={styles.highlightEmojis}>
                  {dateInfo.categories
                    .slice(0, 2)
                    .map((category) => CATEGORY_EMOJI[category] || '')
                    .join(' ')}
                </span>
              )}
              <span className={styles.highlightScore}>
                {activeLocale === 'ko' ? '점수' : 'Score'}: {dateInfo.score}
              </span>
              {reason && (
                <div className={styles.highlightReason}>
                  {truncate(repairMojibakeText(reason), 52)}
                </div>
              )}
              {action && (
                <div className={styles.highlightAction}>
                  {truncate(repairMojibakeText(action), 52)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
