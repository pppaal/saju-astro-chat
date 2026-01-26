"use client";

// src/components/calendar/FortuneGraph.tsx
import React from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './DestinyCalendar.module.css';

interface FortuneDataPoint {
  day: number;
  grade: number;
  score: number;
}

interface FortuneGraphProps {
  fortuneData: FortuneDataPoint[];
  year: number;
  month: number;
  selectedDay: Date | null;
  onDayClick: (date: Date) => void;
}

export default function FortuneGraph({
  fortuneData,
  year,
  month,
  selectedDay,
  onDayClick,
}: FortuneGraphProps) {
  const { locale } = useI18n();

  if (fortuneData.length === 0) {return null;}

  return (
    <div className={styles.fortuneGraph}>
      <div className={styles.graphHeader}>
        <span className={styles.graphTitle}>
          📊 {locale === "ko" ? "월간 운세 흐름" : "Monthly Fortune Flow"}
        </span>
      </div>
      <div className={styles.sparkline}>
        {fortuneData.map((d, idx) => {
          const isSelected = selectedDay && selectedDay.getDate() === d.day && selectedDay.getMonth() === month;
          const height = Math.max(10, (100 - d.grade * 20)) + '%';
          return (
            <div
              key={idx}
              className={`${styles.sparkBar} ${styles[`grade${d.grade}`]} ${isSelected ? styles.active : ''}`}
              style={{ height }}
              onClick={() => {
                const clickedDate = new Date(year, month, d.day);
                onDayClick(clickedDate);
              }}
              title={`${d.day}${locale === "ko" ? "일" : ""}: ${d.score}점`}
            />
          );
        })}
      </div>
    </div>
  );
}
