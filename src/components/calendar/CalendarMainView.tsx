'use client'

// src/components/calendar/CalendarMainView.tsx
import React, { memo, useCallback, useMemo } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { CATEGORY_EMOJI, WEEKDAYS_KO, WEEKDAYS_EN } from './constants'
import { getGradeEmoji, getCategoryLabel, getScoreClass } from './utils'
import SelectedDatePanel from './SelectedDatePanel'
import MonthHighlights from './MonthHighlights'
import type { CalendarData, ImportantDate, EventCategory, BirthInfo } from './types'

interface CalendarMainViewProps {
  data: CalendarData
  birthInfo: BirthInfo
  currentDate: Date
  selectedDay: Date | null
  selectedDate: ImportantDate | null
  activeCategory: EventCategory | 'all'
  isDarkTheme: boolean
  slideDirection: 'left' | 'right' | null
  savedDates: Set<string>
  saving: boolean
  saveMsg: string | null
  onCategoryChange: (category: EventCategory | 'all') => void
  onDayClick: (date: Date | null) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToToday: () => void
  onSaveDate: () => void
  onUnsaveDate: () => void
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
const CATEGORIES: EventCategory[] = ['wealth', 'career', 'love', 'health', 'travel', 'study']

const CalendarMainView = memo(function CalendarMainView({
  data,
  currentDate,
  selectedDay,
  selectedDate,
  activeCategory,
  isDarkTheme,
  slideDirection,
  savedDates,
  saving,
  saveMsg,
  onCategoryChange,
  onDayClick,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  onSaveDate,
  onUnsaveDate,
}: CalendarMainViewProps) {
  const { locale } = useI18n()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = useMemo(() => new Date(), [])

  const WEEKDAYS = locale === 'ko' ? WEEKDAYS_KO : WEEKDAYS_EN
  const MONTHS = locale === 'ko' ? MONTHS_KO : MONTHS_EN

  // Year summary calculation
  const yearSummary = useMemo(() => {
    if (!data?.allDates) {
      return null
    }

    const result = { total: 0, grade0: 0, grade1: 0, grade2: 0, grade3: 0, grade4: 0 }
    for (const d of data.allDates) {
      const dateYear = new Date(d.date).getFullYear()
      if (dateYear === year) {
        result.total++
        if (d.grade === 0) {
          result.grade0++
        } else if (d.grade === 1) {
          result.grade1++
        } else if (d.grade === 2) {
          result.grade2++
        } else if (d.grade === 3) {
          result.grade3++
        } else if (d.grade === 4) {
          result.grade4++
        }
      }
    }
    return result.total > 0 ? result : null
  }, [data, year])

  // Monthly fortune data for graph
  const fortuneData = useMemo(() => {
    if (!data?.allDates) {
      return []
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const monthData: { day: number; grade: number; score: number }[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dateInfo = data.allDates.find((d) => d.date === dateStr)
      monthData.push({
        day,
        grade: dateInfo?.grade ?? 3,
        score: dateInfo?.score ?? 50,
      })
    }
    return monthData
  }, [data, year, month])

  // Generate month days array
  const getMonthDays = useCallback(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: (Date | null)[] = []

    // Empty cells for previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }, [year, month])

  const getDateInfo = useCallback(
    (date: Date): ImportantDate | undefined => {
      if (!data?.allDates) {
        return undefined
      }
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      return data.allDates.find((item) => item.date === dateStr)
    },
    [data]
  )

  const getDayClassName = useCallback(
    (date: Date | null): string => {
      if (!date) {
        return styles.emptyDay
      }

      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()

      const isSelected =
        selectedDay &&
        date.getDate() === selectedDay.getDate() &&
        date.getMonth() === selectedDay.getMonth() &&
        date.getFullYear() === selectedDay.getFullYear()

      const dateInfo = getDateInfo(date)

      let className = styles.day
      if (isToday) {
        className += ` ${styles.today}`
      }
      if (isSelected) {
        className += ` ${styles.selected}`
      }
      if (dateInfo) {
        className += ` ${styles[`dayGrade${dateInfo.grade}`]}`
      }
      if (date.getDay() === 0) {
        className += ` ${styles.sunday}`
      }
      if (date.getDay() === 6) {
        className += ` ${styles.saturday}`
      }

      return className
    },
    [today, selectedDay, getDateInfo]
  )

  const handleDayClick = useCallback(
    (date: Date | null) => {
      if (!date) {
        return
      }
      onDayClick(date)
    },
    [onDayClick]
  )

  const handleDateSelect = useCallback(
    (date: Date, _info: ImportantDate) => {
      onDayClick(date)
    },
    [onDayClick]
  )

  const days = getMonthDays()

  const getGradeLabel = (grade: number) => {
    const labels = {
      0: locale === 'ko' ? '최고의 날' : 'Best Day',
      1: locale === 'ko' ? '아주 좋은 날' : 'Very Good Day',
      2: locale === 'ko' ? '좋은 날' : 'Good Day',
      3: locale === 'ko' ? '보통 날' : 'Normal Day',
      4: locale === 'ko' ? '안좋은 날' : 'Bad Day',
      5: locale === 'ko' ? '최악의 날' : 'Worst Day',
    }
    return labels[grade as keyof typeof labels] || labels[3]
  }

  return (
    <div className={`${styles.container} ${!isDarkTheme ? styles.lightTheme : ''}`}>
      {/* Header */}
      <div className={styles.calendarHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={() => window.history.back()}>
              <span>←</span>
            </button>
          </div>
          <div className={styles.headerTitleSection}>
            <div className={styles.calendarIconWrapper}>
              <span className={styles.calendarIcon}>📅</span>
            </div>
            <div className={styles.titleGroup}>
              <h1 className={styles.calendarTitle}>
                {locale === 'ko' ? '운명 캘린더' : 'Destiny Calendar'}
              </h1>
              <p className={styles.calendarSubtitle}>
                {locale === 'ko'
                  ? `${year}년 당신만의 특별한 날들`
                  : `Your special days in ${year}`}
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>{/* Placeholder for symmetry */}</div>
        </div>

        {/* Year Summary Badges */}
        {yearSummary && (
          <div className={styles.summaryBadges}>
            <span
              className={styles.summaryBadge}
              title={locale === 'ko' ? '최고의 날 (68점 이상)' : 'Best Days (68+ points)'}
            >
              <span className={styles.badgeEmoji}>🌟</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '최고' : 'Best'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade0}일` : `${yearSummary.grade0}d`}
              </span>
            </span>
            <span
              className={styles.summaryBadge}
              title={locale === 'ko' ? '좋은 날 (62-67점)' : 'Good Days (62-67 points)'}
            >
              <span className={styles.badgeEmoji}>✨</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '좋음' : 'Good'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade1}일` : `${yearSummary.grade1}d`}
              </span>
            </span>
            <span
              className={styles.summaryBadge}
              title={locale === 'ko' ? '보통 날 (42-61점)' : 'Normal Days (42-61 points)'}
            >
              <span className={styles.badgeEmoji}>◆</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '보통' : 'Normal'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade2}일` : `${yearSummary.grade2}d`}
              </span>
            </span>
            <span
              className={`${styles.summaryBadge} ${styles.cautionBadge}`}
              title={locale === 'ko' ? '안좋은 날 (28-41점)' : 'Bad Days (28-41 points)'}
            >
              <span className={styles.badgeEmoji}>⚠️</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '안좋음' : 'Bad'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade3}일` : `${yearSummary.grade3}d`}
              </span>
            </span>
            <span
              className={`${styles.summaryBadge} ${styles.worstBadge}`}
              title={locale === 'ko' ? '최악의 날 (28점 미만)' : 'Worst Days (under 28 points)'}
            >
              <span className={styles.badgeEmoji}>☠️</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '최악' : 'Worst'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade4}일` : `${yearSummary.grade4}d`}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className={styles.monthNav}>
        <button
          className={styles.navBtn}
          onClick={onPrevMonth}
          aria-label={locale === 'ko' ? '이전 달' : 'Previous month'}
        >
          ◀
        </button>
        <div className={styles.monthDisplay}>
          <span className={styles.monthYear}>{year}</span>
          <span className={styles.monthName}>{MONTHS[month]}</span>
        </div>
        <button
          className={styles.navBtn}
          onClick={onNextMonth}
          aria-label={locale === 'ko' ? '다음 달' : 'Next month'}
        >
          ▶
        </button>
        <button className={styles.todayBtn} onClick={onGoToToday}>
          {locale === 'ko' ? '오늘' : 'Today'}
        </button>
      </div>

      {/* Category Filter */}
      <div className={styles.filtersSection}>
        <span className={styles.filtersLabel}>{locale === 'ko' ? '테마별' : 'By Theme'}</span>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${activeCategory === 'all' ? styles.active : ''}`}
            onClick={() => onCategoryChange('all')}
          >
            {locale === 'ko' ? '전체' : 'All'}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${activeCategory === cat ? styles.active : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              {CATEGORY_EMOJI[cat]} {getCategoryLabel(cat, locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendarWrapper}>
        {/* Weekday Header */}
        <div className={styles.weekdaysHeader}>
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className={`${styles.weekdayCell} ${idx === 0 ? styles.sunday : ''} ${idx === 6 ? styles.saturday : ''}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div
          className={`${styles.daysGrid} ${slideDirection === 'left' ? styles.slideLeft : ''} ${slideDirection === 'right' ? styles.slideRight : ''}`}
          role="grid"
          aria-label={
            locale === 'ko'
              ? `${year}년 ${month + 1}월 캘린더`
              : `Calendar for ${MONTHS[month]} ${year}`
          }
        >
          {days.map((date, idx) => {
            const dateInfo = date ? getDateInfo(date) : undefined
            const isToday =
              date &&
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear()

            return (
              <div
                key={idx}
                className={getDayClassName(date)}
                onClick={() => handleDayClick(date)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleDayClick(date)
                  }
                }}
                role="gridcell"
                tabIndex={date ? 0 : -1}
                aria-label={
                  date
                    ? `${date.getDate()}${locale === 'ko' ? '일' : ''}, ${dateInfo ? getGradeLabel(dateInfo.grade) : locale === 'ko' ? '정보 없음' : 'No info'}${isToday ? (locale === 'ko' ? ', 오늘' : ', Today') : ''}`
                    : undefined
                }
                aria-selected={
                  !!(
                    selectedDay &&
                    date &&
                    date.getDate() === selectedDay.getDate() &&
                    date.getMonth() === selectedDay.getMonth() &&
                    date.getFullYear() === selectedDay.getFullYear()
                  )
                }
                aria-current={isToday ? 'date' : undefined}
              >
                {date && (
                  <>
                    <span className={styles.dayNumber}>{date.getDate()}</span>
                    {dateInfo && (
                      <div className={styles.dayIndicators} aria-hidden="true">
                        {dateInfo.categories.slice(0, 2).map((cat, i) => (
                          <span key={i} className={styles.dayEmoji}>
                            {CATEGORY_EMOJI[cat]}
                          </span>
                        ))}
                        <span className={styles.gradeIndicator}>
                          {getGradeEmoji(dateInfo.grade)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        className={styles.legend}
        role="list"
        aria-label={locale === 'ko' ? '등급 범례' : 'Grade Legend'}
      >
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade0Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>★</span>
          </span>
          <span>{locale === 'ko' ? '최고 (72+)' : 'Best (72+)'}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade1Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>●</span>
          </span>
          <span>{locale === 'ko' ? '좋음 (65-71)' : 'Good (65-71)'}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade2Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>◆</span>
          </span>
          <span>{locale === 'ko' ? '보통 (45-64)' : 'Normal (45-64)'}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade3Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>▲</span>
          </span>
          <span>{locale === 'ko' ? '안좋음 (30-44)' : 'Bad (30-44)'}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade4Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>✕</span>
          </span>
          <span>{locale === 'ko' ? '최악 (<30)' : 'Worst (<30)'}</span>
        </div>
      </div>

      {/* Monthly Fortune Graph */}
      {fortuneData.length > 0 && (
        <div className={styles.fortuneGraph}>
          <div className={styles.graphHeader}>
            <span className={styles.graphTitle}>
              📊 {locale === 'ko' ? '월간 운세 흐름' : 'Monthly Fortune Flow'}
            </span>
          </div>
          <div className={styles.sparkline}>
            {fortuneData.map((d, idx) => {
              const isSelected =
                selectedDay && selectedDay.getDate() === d.day && selectedDay.getMonth() === month
              const height = Math.max(10, 100 - d.grade * 20) + '%'
              return (
                <div
                  key={idx}
                  className={`${styles.sparkBar} ${styles[`grade${d.grade}`]} ${isSelected ? styles.active : ''}`}
                  style={{ height }}
                  onClick={() => {
                    const clickedDate = new Date(year, month, d.day)
                    handleDayClick(clickedDate)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleDayClick(new Date(year, month, d.day))
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${d.day}${locale === 'ko' ? '일' : ''}: ${locale === 'ko' ? '점수' : 'score'} ${d.score}`}
                  title={`${d.day}${locale === 'ko' ? '일' : ''}: ${d.score}${locale === 'ko' ? '점' : ''}`}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Date Panel */}
      <SelectedDatePanel
        selectedDay={selectedDay}
        selectedDate={selectedDate}
        savedDates={savedDates}
        saving={saving}
        saveMsg={saveMsg}
        onSave={onSaveDate}
        onUnsave={onUnsaveDate}
        getGradeEmoji={getGradeEmoji}
        getScoreClass={getScoreClass}
      />

      {/* Month Highlights */}
      {data?.allDates && data.allDates.length > 0 && (
        <MonthHighlights
          allDates={data.allDates}
          year={year}
          month={month}
          onDateSelect={handleDateSelect}
        />
      )}
    </div>
  )
})

export default CalendarMainView
