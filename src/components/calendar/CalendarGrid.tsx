"use client";

// src/components/calendar/CalendarGrid.tsx
import React, { useMemo, useCallback } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import DayCell from './DayCell';
import styles from './DestinyCalendar.module.css';

type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";
type ImportanceGrade = 0 | 1 | 2 | 3 | 4;

interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
  summary?: string;
  bestTimes?: string[];
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
}

interface CalendarGridProps {
  year: number;
  month: number;
  days: (Date | null)[];
  allDates?: ImportantDate[];
  selectedDay: Date | null;
  slideDirection: 'left' | 'right' | null;
  onDayClick: (date: Date | null) => void;
  getDayClassName: (date: Date | null) => string;
}

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarGrid({
  year,
  month,
  days,
  allDates = [],
  selectedDay,
  slideDirection,
  onDayClick,
  getDayClassName,
}: CalendarGridProps) {
  const { locale } = useI18n();
  const WEEKDAYS = locale === "ko" ? WEEKDAYS_KO : WEEKDAYS_EN;

  // Memoize date info lookup to prevent recalculation on every render
  const getDateInfo = useCallback((date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return allDates.find(d => d.date === dateStr);
  }, [allDates]);

  // Memoize today check with stable today value
  const today = useMemo(() => new Date(), []);
  const isToday = useCallback((date: Date | null) => {
    if (!date) return false;
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, [today]);

  // Memoize selection check
  const isSelected = useCallback((date: Date | null) => {
    if (!date || !selectedDay) return false;
    return (
      date.getDate() === selectedDay.getDate() &&
      date.getMonth() === selectedDay.getMonth() &&
      date.getFullYear() === selectedDay.getFullYear()
    );
  }, [selectedDay]);

  return (
    <div className={styles.calendarWrapper}>
      {/* Weekday Header */}
      <div className={styles.weekdaysHeader}>
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`${styles.weekdayCell} ${idx === 0 ? styles.sunday : ""} ${idx === 6 ? styles.saturday : ""}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div
        className={`${styles.daysGrid} ${slideDirection === 'left' ? styles.slideLeft : ''} ${slideDirection === 'right' ? styles.slideRight : ''}`}
        role="grid"
        aria-label={locale === "ko" ? `${year}년 ${month + 1}월 캘린더` : `Calendar for ${MONTHS[month]} ${year}`}
      >
        {days.map((date, idx) => (
          <DayCell
            key={idx}
            date={date}
            dateInfo={date ? getDateInfo(date) : undefined}
            isToday={isToday(date)}
            isSelected={isSelected(date)}
            onClick={onDayClick}
            className={getDayClassName(date)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend} role="list" aria-label={locale === "ko" ? "등급 범례" : "Grade Legend"}>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade0Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>★</span>
          </span>
          <span>{locale === "ko" ? "최고 (72+)" : "Best (72+)"}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade1Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>●</span>
          </span>
          <span>{locale === "ko" ? "좋음 (65-71)" : "Good (65-71)"}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade2Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>◆</span>
          </span>
          <span>{locale === "ko" ? "보통 (45-64)" : "Normal (45-64)"}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade3Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>▲</span>
          </span>
          <span>{locale === "ko" ? "안좋음 (30-44)" : "Bad (30-44)"}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade4Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>✕</span>
          </span>
          <span>{locale === "ko" ? "최악 (<30)" : "Worst (<30)"}</span>
        </div>
      </div>
    </div>
  );
}
