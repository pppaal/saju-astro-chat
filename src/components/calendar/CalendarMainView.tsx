'use client'

// src/components/calendar/CalendarMainView.tsx
import React, { memo, useCallback, useMemo, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { CATEGORY_EMOJI, WEEKDAYS_KO, WEEKDAYS_EN } from './constants'
import { getGradeEmoji, getCategoryLabel, getScoreClass } from './utils'
import SelectedDatePanel from './SelectedDatePanel'
import MonthHighlights from './MonthHighlights'
import CalendarActionPlanView from './CalendarActionPlanView'
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
  onYearChange: (year: number) => void
  onGoToToday: () => void
  onSaveDate: () => void
  onUnsaveDate: () => void
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
  onYearChange,
  onGoToToday,
  onSaveDate,
  onUnsaveDate,
}: CalendarMainViewProps) {
  const { locale } = useI18n()
  const [activeView, setActiveView] = useState<'calendar' | 'action'>('calendar')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = useMemo(() => new Date(), [])

  const WEEKDAYS = locale === 'ko' ? WEEKDAYS_KO : WEEKDAYS_EN
  const MONTHS = locale === 'ko' ? MONTHS_KO : MONTHS_EN
  const currentSystemYear = useMemo(() => new Date().getFullYear(), [])
  const yearOptions = useMemo(() => {
    const start = currentSystemYear - 20
    const end = currentSystemYear + 20
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [currentSystemYear])

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
        const effectiveGrade = d.displayGrade ?? d.grade
        if (effectiveGrade === 0) {
          result.grade0++
        } else if (effectiveGrade === 1) {
          result.grade1++
        } else if (effectiveGrade === 2) {
          result.grade2++
        } else if (effectiveGrade === 3) {
          result.grade3++
        } else if (effectiveGrade === 4) {
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
        grade: dateInfo?.displayGrade ?? dateInfo?.grade ?? 3,
        score: dateInfo?.displayScore ?? dateInfo?.score ?? 50,
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
      const effectiveGrade = dateInfo?.displayGrade ?? dateInfo?.grade

      let className = styles.day
      if (isToday) {
        className += ` ${styles.today}`
      }
      if (isSelected) {
        className += ` ${styles.selected}`
      }
      if (typeof effectiveGrade === 'number') {
        className += ` ${styles[`dayGrade${effectiveGrade}`]}`
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
      0: locale === 'ko' ? '실행 우선' : 'Execute-first',
      1: locale === 'ko' ? '활용 우선' : 'Leverage-first',
      2: locale === 'ko' ? '운영 우선' : 'Operate-first',
      3: locale === 'ko' ? '검토 우선' : 'Review-first',
      4: locale === 'ko' ? '조정 우선' : 'Adjust-first',
      5: locale === 'ko' ? '조정 우선' : 'Adjust-first',
    }
    return labels[grade as keyof typeof labels] || labels[3]
  }

  return (
    <div
      className={`${styles.container} ${styles.largeTextMode} ${!isDarkTheme ? styles.lightTheme : ''}`}
    >
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
          <div className={styles.headerRight} />
        </div>

        {/* Year Summary Badges */}
        {yearSummary && (
          <>
            <div className={styles.summaryBadges}>
            <span className={styles.summaryTotal}>
              {locale === 'ko'
                ? `엔진 계산 ${yearSummary.total}일`
                : `Engine-calculated ${yearSummary.total}d`}
            </span>
            <span className={styles.badgeDivider} />
            <span
              className={styles.summaryBadge}
              title={locale === 'ko' ? '실행 우선' : 'Execute-first'}
            >
              <span className={styles.badgeEmoji}>🌟</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '실행' : 'Execute'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade0}일` : `${yearSummary.grade0}d`}
              </span>
            </span>
            <span
              className={styles.summaryBadge}
              title={locale === 'ko' ? '활용 우선' : 'Leverage-first'}
            >
              <span className={styles.badgeEmoji}>✨</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '활용' : 'Leverage'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade1}일` : `${yearSummary.grade1}d`}
              </span>
            </span>
            <span
              className={styles.summaryBadge}
              title={locale === 'ko' ? '운영 우선' : 'Operate-first'}
            >
              <span className={styles.badgeEmoji}>◆</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '운영' : 'Operate'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade2}일` : `${yearSummary.grade2}d`}
              </span>
            </span>
            <span
              className={`${styles.summaryBadge} ${styles.cautionBadge}`}
              title={locale === 'ko' ? '검토 우선' : 'Review-first'}
            >
              <span className={styles.badgeEmoji}>⚠️</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '검토' : 'Review'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade3}일` : `${yearSummary.grade3}d`}
              </span>
            </span>
            <span
              className={`${styles.summaryBadge} ${styles.worstBadge}`}
              title={locale === 'ko' ? '조정 우선' : 'Adjust-first'}
            >
              <span className={styles.badgeEmoji}>☠️</span>
              <span className={styles.badgeLabel}>{locale === 'ko' ? '조정' : 'Adjust'}</span>
              <span className={styles.badgeCount}>
                {locale === 'ko' ? `${yearSummary.grade4}일` : `${yearSummary.grade4}d`}
              </span>
            </span>
          </div>
          <p className={styles.summaryEngineNote}>
            {locale === 'ko'
              ? '사주·점성 100점 스코어와 교차 근거를 합쳐 좋은 날부터 조정일까지 자동 분류합니다.'
              : 'Days are auto-ranked from execute-first to adjust-first using the combined Saju/Astrology score and cross-evidence.'}
          </p>
          </>
        )}
      </div>

      {/* View Tabs */}
      <div
        className={styles.viewTabs}
        role="tablist"
        aria-label={locale === 'ko' ? '진행 모드' : 'View tabs'}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'calendar'}
          className={`${styles.viewTab} ${activeView === 'calendar' ? styles.viewTabActive : ''}`}
          onClick={() => setActiveView('calendar')}
        >
          📅 {locale === 'ko' ? '캘린더' : 'Calendar'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'action'}
          className={`${styles.viewTab} ${activeView === 'action' ? styles.viewTabActive : ''}`}
          onClick={() => setActiveView('action')}
        >
          ✅ {locale === 'ko' ? '행동 플랜' : 'Action Plan'}
        </button>
      </div>

      {activeView === 'calendar' ? (
        <>
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
              <div className={styles.yearNav}>
                <span className={styles.yearPickerLabel}>{locale === 'ko' ? '연도' : 'Year'}</span>
                <button
                  className={styles.yearBtn}
                  onClick={() => onYearChange(year - 1)}
                  aria-label={locale === 'ko' ? '이전 연도' : 'Previous year'}
                >
                  -
                </button>
                <div className={styles.yearSelectWrap}>
                  <select
                    className={styles.yearDisplay}
                    value={year}
                    onChange={(event) => onYearChange(Number(event.target.value))}
                    aria-label={locale === 'ko' ? '연도 선택' : 'Select year'}
                  >
                    {yearOptions.map((yearOption) => (
                      <option key={yearOption} value={yearOption}>
                        {yearOption}
                      </option>
                    ))}
                  </select>
                  <span className={styles.yearSelectChevron} aria-hidden="true">
                    ▾
                  </span>
                </div>
                <button
                  className={styles.yearBtn}
                  onClick={() => onYearChange(year + 1)}
                  aria-label={locale === 'ko' ? '다음 연도' : 'Next year'}
                >
                  +
                </button>
              </div>
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
                const effectiveGrade = dateInfo?.displayGrade ?? dateInfo?.grade
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
                        ? `${date.getDate()}${locale === 'ko' ? '일' : ''}, ${typeof effectiveGrade === 'number' ? getGradeLabel(effectiveGrade) : locale === 'ko' ? '정보 없음' : 'No info'}${isToday ? (locale === 'ko' ? ', 오늘' : ', Today') : ''}`
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
                            <span
                              className={`${styles.gradeIndicator} ${styles[`gradeIndicator${effectiveGrade}`]}`}
                            />
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
                <span className={styles.legendPattern}>{'\u2605'}</span>
              </span>
              <span>{locale === 'ko' ? '실행' : 'Execute'}</span>
            </div>
            <div className={styles.legendItem} role="listitem">
              <span className={`${styles.legendDot} ${styles.grade1Dot}`} aria-hidden="true">
                <span className={styles.legendPattern}>{'\u25CF'}</span>
              </span>
              <span>{locale === 'ko' ? '활용' : 'Leverage'}</span>
            </div>
            <div className={styles.legendItem} role="listitem">
              <span className={`${styles.legendDot} ${styles.grade2Dot}`} aria-hidden="true">
                <span className={styles.legendPattern}>{'\u25C6'}</span>
              </span>
              <span>{locale === 'ko' ? '운영' : 'Operate'}</span>
            </div>
            <div className={styles.legendItem} role="listitem">
              <span className={`${styles.legendDot} ${styles.grade3Dot}`} aria-hidden="true">
                <span className={styles.legendPattern}>{'\u25B2'}</span>
              </span>
              <span>{locale === 'ko' ? '검토' : 'Review'}</span>
            </div>
            <div className={styles.legendItem} role="listitem">
              <span className={`${styles.legendDot} ${styles.grade4Dot}`} aria-hidden="true">
                <span className={styles.legendPattern}>{'\u2715'}</span>
              </span>
              <span>{locale === 'ko' ? '조정' : 'Adjust'}</span>
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
                    selectedDay &&
                    selectedDay.getDate() === d.day &&
                    selectedDay.getMonth() === month
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
            canonicalCore={data?.canonicalCore}
            presentation={
              data
                ? {
                    daySummary: data.daySummary,
                    weekSummary: data.weekSummary,
                    monthSummary: data.monthSummary,
                    topDomains: data.topDomains,
                    timingSignals: data.timingSignals,
                    cautions: data.cautions,
                    recommendedActions: data.recommendedActions,
                    relationshipWeather: data.relationshipWeather,
                    workMoneyWeather: data.workMoneyWeather,
                  }
                : undefined
            }
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
        </>
      ) : (
        <CalendarActionPlanView
          data={data}
          selectedDay={selectedDay}
          selectedDate={selectedDate}
          onSelectDate={onDayClick}
        />
      )}
    </div>
  )
})

export default CalendarMainView
