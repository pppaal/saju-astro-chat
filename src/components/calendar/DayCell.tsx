"use client";

import React from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import styles from './DestinyCalendar.module.css';

type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";
type ImportanceGrade = 0 | 1 | 2 | 3 | 4;

interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  originalGrade?: ImportanceGrade;
  displayGrade?: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
}

interface DayCellProps {
  date: Date | null;
  dateInfo?: ImportantDate;
  isToday: boolean;
  isSelected: boolean;
  onClick: (date: Date | null) => void;
  className: string;
}

const DayCell = React.memo(function DayCell({
  date,
  dateInfo,
  isToday,
  isSelected,
  onClick,
  className,
}: DayCellProps) {
  const { locale, t } = useI18n();

  const getGradeLabel = (grade: number) => {
    const key = `calendar.grades.${grade}`;
    return t(
      key,
      grade === 0
        ? "Best Day"
        : grade === 1
          ? "Good Day"
          : grade === 2
            ? "Normal Day"
            : grade === 3
              ? "Bad Day"
              : "Worst Day"
    );
  };

  const ariaLabel = date
    ? `${date.getDate()}${locale === "ko" ? "일" : ""}, ${
        dateInfo ? getGradeLabel(dateInfo.grade) : locale === "ko" ? "정보 없음" : "No info"
      }${isToday ? (locale === "ko" ? ", 오늘" : ", Today") : ""}`
    : undefined;

  return (
    <div
      className={className}
      onClick={() => onClick(date)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(date);
        }
      }}
      role="gridcell"
      tabIndex={date ? 0 : -1}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      aria-current={isToday ? "date" : undefined}
    >
      {date && (
        <>
          <span className={styles.dayNumber}>{date.getDate()}</span>
          {dateInfo && (
            <div className={styles.dayIndicators} aria-hidden="true">
              <span
                className={`${styles.gradeIndicator} ${styles[`gradeIndicator${dateInfo.grade}`]}`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default DayCell;
