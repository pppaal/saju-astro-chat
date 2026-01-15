"use client";

// src/components/calendar/MonthNavigation.tsx
import React from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './DestinyCalendar.module.css';

interface MonthNavigationProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS_KO = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월"
];

export default function MonthNavigation({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
}: MonthNavigationProps) {
  const { locale } = useI18n();
  const monthNames = locale === "ko" ? MONTHS_KO : MONTHS;

  return (
    <div className={styles.monthNavigation}>
      <button
        className={styles.navBtn}
        onClick={onPrevMonth}
        aria-label={locale === "ko" ? "이전 달" : "Previous month"}
      >
        ‹
      </button>
      <div className={styles.monthYearDisplay}>
        <span className={styles.displayYear}>{year}</span>
        <span className={styles.displayMonth}>{monthNames[month]}</span>
      </div>
      <button
        className={styles.navBtn}
        onClick={onNextMonth}
        aria-label={locale === "ko" ? "다음 달" : "Next month"}
      >
        ›
      </button>
      <button
        className={styles.todayBtn}
        onClick={onToday}
        aria-label={locale === "ko" ? "오늘로 이동" : "Go to today"}
      >
        {locale === "ko" ? "오늘" : "Today"}
      </button>
    </div>
  );
}
