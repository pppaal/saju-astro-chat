'use client'

// src/components/calendar/MonthHighlights.tsx
import React from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { CATEGORY_EMOJI } from './constants'
import { parseLocalDate } from './utils'
import type { ImportantDate } from './types'
import { getPeakLabel, resolvePeakLevel } from './peakUtils'

interface MonthHighlightsProps {
  allDates: ImportantDate[]
  year: number
  month: number
  onDateSelect: (date: Date, info: ImportantDate) => void
}

const MONTHS_KO = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
]
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

const truncate = (text: string, len = 58) => {
  if (!text) return ''
  return text.length > len ? `${text.slice(0, len)}...` : text
}

const hasMojibake = (value: string) => /[ìëêðâÃÂ]/.test(value)

const repairMojibakeText = (value: string): string => {
  if (!value || !hasMojibake(value)) return value
  try {
    const bytes = Uint8Array.from([...value].map((ch) => ch.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8').decode(bytes)
    if (decoded && !decoded.includes('�')) return decoded
  } catch {
    // Keep original if conversion fails
  }
  return value
}

export default function MonthHighlights({
  allDates,
  year,
  month,
  onDateSelect,
}: MonthHighlightsProps) {
  const { locale } = useI18n()
  const MONTHS = locale === 'ko' ? MONTHS_KO : MONTHS_EN

  // Filter dates for current month
  const monthDates = allDates.filter((d) => parseLocalDate(d.date).getMonth() === month)

  // Good days (grade 0, 1, 2) - top 3 by score
  const goodDates = monthDates
    .filter((d) => d.grade <= 2)
    .sort((a, b) => a.grade - b.grade || b.score - a.score)
    .slice(0, 3)

  // Bad days (grade 3, 4) - bottom 2 by score
  const badDates = monthDates
    .filter((d) => d.grade >= 3)
    .sort((a, b) => b.grade - a.grade || a.score - b.score)
    .slice(0, 2)

  // Combine and sort by date
  const highlightDates = [...goodDates, ...badDates].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  )

  if (highlightDates.length === 0) {
    return null
  }

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

  const getGradeTitle = (grade: number) => {
    const titles = {
      0: locale === 'ko' ? '최고의 날' : 'Best Day',
      1: locale === 'ko' ? '좋은 날' : 'Good Day',
      2: locale === 'ko' ? '보통 날' : 'Normal Day',
      3: locale === 'ko' ? '안좋은 날' : 'Bad Day',
      4: locale === 'ko' ? '나쁜 날' : 'Bad Day',
      5: locale === 'ko' ? '최악의 날' : 'Worst Day',
    }
    return titles[grade as keyof typeof titles] || titles[2]
  }

  return (
    <div className={styles.monthHighlights}>
      <h2 className={styles.highlightsTitle}>
        🌟 {year} {MONTHS[month]} {locale === 'ko' ? '주요 날짜' : 'Highlights'}
      </h2>
      <div className={styles.highlightsList}>
        {highlightDates.map((d, i) =>
          (() => {
            const peakLevel = resolvePeakLevel(d.evidence?.matrix?.peakLevel, d.score)
            const reason =
              d.summary ||
              d.evidence?.cross?.sajuEvidence ||
              d.sajuFactors?.[0] ||
              d.astroFactors?.[0] ||
              ''
            const action =
              d.grade >= 3
                ? d.warnings?.[0] ||
                  (locale === 'ko'
                    ? '속도를 낮추고 점검 중심으로 가세요.'
                    : 'Slow down and prioritize checks.')
                : d.recommendations?.[0] ||
                  (locale === 'ko'
                    ? '핵심 과제 1~2개에 집중하세요.'
                    : 'Focus on one or two key tasks.')
            return (
              <div
                key={i}
                className={`${styles.highlightCard} ${getGradeClass(d.grade)}`}
                onClick={() => onDateSelect(parseLocalDate(d.date), d)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onDateSelect(parseLocalDate(d.date), d)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${parseLocalDate(d.date).getDate()}${locale === 'ko' ? '일' : ''} - ${repairMojibakeText(d.title || getGradeTitle(d.grade))}, ${locale === 'ko' ? '점수' : 'score'}: ${d.score}`}
              >
                <div className={styles.highlightHeader}>
                  <span className={styles.highlightDate}>
                    {parseLocalDate(d.date).getDate()}
                    {locale === 'ko' ? '일' : ''}
                  </span>
                  <div className={styles.highlightBadges}>
                    {peakLevel && (
                      <span className={styles.highlightPeakBadge}>
                        {locale === 'ko'
                          ? getPeakLabel(peakLevel, 'ko')
                          : getPeakLabel(peakLevel, 'en')}
                      </span>
                    )}
                    {((d.sajuFactors && d.sajuFactors.length > 0) ||
                      (d.astroFactors && d.astroFactors.length > 0)) && (
                      <span
                        className={styles.highlightBadge}
                        title={locale === 'ko' ? '분석 완료' : 'Analyzed'}
                      >
                        ✨
                      </span>
                    )}
                  </div>
                </div>
                <span className={styles.highlightTitle}>
                  {repairMojibakeText(d.title || getGradeTitle(d.grade))}
                </span>
                {d.categories && d.categories.length > 0 && (
                  <span className={styles.highlightEmojis}>
                    {d.categories
                      .slice(0, 2)
                      .map((c) => CATEGORY_EMOJI[c] || '')
                      .join(' ')}
                  </span>
                )}
                <span className={styles.highlightScore}>
                  {locale === 'ko' ? '점수' : 'Score'}: {d.score}
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
          })()
        )}
      </div>
    </div>
  )
}
