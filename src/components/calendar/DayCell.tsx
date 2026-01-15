"use client";

// src/components/calendar/DayCell.tsx
import React from 'react';
import { useI18n } from '@/i18n/I18nProvider';
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
}

interface DayCellProps {
  date: Date | null;
  dateInfo?: ImportantDate;
  isToday: boolean;
  isSelected: boolean;
  onClick: (date: Date | null) => void;
  className: string;
}

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  wealth: "💰",
  career: "💼",
  love: "💕",
  health: "💪",
  travel: "✈️",
  study: "📚",
  general: "⭐",
};

function getGradeEmoji(grade: number): string {
  switch (grade) {
    case 0: return "🌟"; // 최고의 날
    case 1: return "✨"; // 좋은 날
    case 2: return "⭐"; // 보통 날
    case 3: return "⚠️"; // 안좋은 날
    case 4: return "☠️"; // 최악의 날
    default: return "⭐";
  }
}

const DayCell = React.memo(function DayCell({
  date,
  dateInfo,
  isToday,
  isSelected,
  onClick,
  className,
}: DayCellProps) {
  const { locale } = useI18n();

  const getGradeLabel = (grade: number) => {
    const labels = {
      0: locale === "ko" ? "최고의 날" : "Best Day",
      1: locale === "ko" ? "좋은 날" : "Good Day",
      2: locale === "ko" ? "보통 날" : "Normal Day",
      3: locale === "ko" ? "안좋은 날" : "Bad Day",
      4: locale === "ko" ? "최악의 날" : "Worst Day",
    };
    return labels[grade as keyof typeof labels] || labels[2];
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
              {dateInfo.categories.slice(0, 2).map((cat, i) => (
                <span key={i} className={styles.dayEmoji}>{CATEGORY_EMOJI[cat]}</span>
              ))}
              <span className={styles.gradeIndicator}>
                {getGradeEmoji(dateInfo.grade)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default DayCell;
