"use client";

// src/components/calendar/SelectedDatePanel.tsx
import React, { useCallback, memo } from 'react';
import { useSession } from 'next-auth/react';
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
  summary?: string;
  bestTimes?: string[];
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
  ganzhi?: string;
  transitSunSign?: string;
  crossVerified?: boolean;
}

interface SelectedDatePanelProps {
  selectedDay: Date | null;
  selectedDate: ImportantDate | null;
  savedDates: Set<string>;
  saving: boolean;
  saveMsg: string | null;
  onSave: () => void;
  onUnsave: () => void;
  getGradeEmoji: (grade: number) => string;
  getScoreClass: (score: number) => string;
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

// 등급별 스타일 클래스
const GRADE_STYLES: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: 'bg-gradient-to-r from-yellow-100 to-amber-100', border: 'border-yellow-400', text: 'text-yellow-800' },
  1: { bg: 'bg-gradient-to-r from-green-50 to-emerald-50', border: 'border-green-400', text: 'text-green-800' },
  2: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' },
  3: { bg: 'bg-gradient-to-r from-orange-50 to-amber-50', border: 'border-orange-400', text: 'text-orange-800' },
  4: { bg: 'bg-gradient-to-r from-red-50 to-rose-50', border: 'border-red-400', text: 'text-red-800' },
};

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SelectedDatePanel = memo(function SelectedDatePanel({
  selectedDay,
  selectedDate,
  savedDates,
  saving,
  saveMsg,
  onSave,
  onUnsave,
  getGradeEmoji,
  getScoreClass,
}: SelectedDatePanelProps) {
  const { locale } = useI18n();
  const { status } = useSession();
  const WEEKDAYS = locale === "ko" ? WEEKDAYS_KO : WEEKDAYS_EN;

  if (!selectedDay) {return null;}

  const getCategoryLabel = (cat: EventCategory) => {
    const labels: Record<EventCategory, { ko: string; en: string }> = {
      wealth: { ko: "재물운", en: "Wealth" },
      career: { ko: "커리어", en: "Career" },
      love: { ko: "연애운", en: "Love" },
      health: { ko: "건강운", en: "Health" },
      travel: { ko: "여행운", en: "Travel" },
      study: { ko: "학업운", en: "Study" },
      general: { ko: "전체운", en: "General" },
    };
    return locale === "ko" ? labels[cat].ko : labels[cat].en;
  };

  const isSaved = selectedDate ? savedDates.has(selectedDate.date) : false;

  const handleAddToCalendar = useCallback(() => {
    if (!selectedDate || !selectedDay) return;

    const dateStr = selectedDate.date.replace(/-/g, '');
    // All-day event DTEND must be the NEXT day (exclusive end per RFC 5545)
    const nextDay = new Date(selectedDay);
    nextDay.setDate(nextDay.getDate() + 1);
    const endStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;

    const title = selectedDate.title;
    const catLabels: Record<EventCategory, string> = {
      wealth: locale === 'ko' ? '재물운' : 'Wealth',
      career: locale === 'ko' ? '커리어' : 'Career',
      love: locale === 'ko' ? '연애운' : 'Love',
      health: locale === 'ko' ? '건강운' : 'Health',
      travel: locale === 'ko' ? '여행운' : 'Travel',
      study: locale === 'ko' ? '학업운' : 'Study',
      general: locale === 'ko' ? '전체운' : 'General',
    };
    const categories = selectedDate.categories
      .map(cat => catLabels[cat])
      .join(', ');
    const descParts = [
      selectedDate.description,
      categories ? `${locale === 'ko' ? '카테고리' : 'Categories'}: ${categories}` : '',
      `${locale === 'ko' ? '점수' : 'Score'}: ${selectedDate.score}/100`,
    ];
    if (selectedDate.recommendations.length > 0) {
      descParts.push(`${locale === 'ko' ? '추천' : 'Recommendations'}:`);
      selectedDate.recommendations.forEach(r => descParts.push(`- ${r}`));
    }
    if (selectedDate.warnings.length > 0) {
      descParts.push(`${locale === 'ko' ? '주의' : 'Warnings'}:`);
      selectedDate.warnings.forEach(w => descParts.push(`- ${w}`));
    }
    const description = descParts.filter(Boolean).join('\n');

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const escapeICS = (text: string) =>
      text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SajuAstroChat//DestinyCalendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `DTSTAMP:${stamp}`,
      `UID:destiny-${dateStr}@sajuastrochat`,
      `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    // iOS Safari doesn't support Blob URL + <a download>.
    // Use data URI which works across iOS Safari, Android Chrome, and desktop.
    const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);
    window.open(dataUri, '_blank');
  }, [selectedDate, selectedDay, locale]);

  return (
    <div className={styles.selectedDayInfo}>
      <div className={styles.selectedDayHeader}>
        <span className={styles.selectedDayDate}>
          {selectedDay.getMonth() + 1}/{selectedDay.getDate()}
          {locale === "ko" && ` (${WEEKDAYS[selectedDay.getDay()]})`}
        </span>
        <div className={styles.headerActions}>
          {selectedDate && (
            <span className={styles.selectedGrade}>{getGradeEmoji(selectedDate.grade)}</span>
          )}
          {/* Save button - authenticated users only */}
          {status === 'authenticated' && selectedDate && (
            <button
              className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
              onClick={isSaved ? onUnsave : onSave}
              disabled={saving}
              aria-label={isSaved
                ? (locale === 'ko' ? '저장됨 (클릭하여 삭제)' : 'Saved (click to remove)')
                : (locale === 'ko' ? '이 날짜 저장하기' : 'Save this date')}
              title={isSaved
                ? (locale === 'ko' ? '저장됨 (클릭하여 삭제)' : 'Saved (click to remove)')
                : (locale === 'ko' ? '이 날짜 저장하기' : 'Save this date')}
            >
              {saving ? '...' : isSaved ? '★' : '☆'}
            </button>
          )}
        </div>
      </div>

      {/* Save message */}
      {saveMsg && (
        <div className={styles.saveMsg}>{saveMsg}</div>
      )}

      {selectedDate ? (
        <div className={styles.selectedDayContent}>
          <h3 className={styles.selectedTitle}>{selectedDate.title}</h3>

          {/* Grade 3, 4 (나쁜 날): 경고를 상단에 강조 표시 */}
          {selectedDate.grade >= 3 && selectedDate.warnings.length > 0 && (
            <div className={`${styles.urgentWarningBox} ${selectedDate.grade === 4 ? styles.worstDay : ''}`}>
              <div className={styles.urgentWarningHeader}>
                <span className={styles.urgentWarningIcon}>
                  {selectedDate.grade === 4 ? '🚨' : '⚠️'}
                </span>
                <span className={styles.urgentWarningTitle}>
                  {locale === "ko"
                    ? (selectedDate.grade === 4 ? "오늘 주의해야 할 점!" : "오늘의 주의사항")
                    : (selectedDate.grade === 4 ? "Critical Warnings!" : "Today's Cautions")}
                </span>
              </div>
              <ul className={styles.urgentWarningList}>
                {selectedDate.warnings.slice(0, 3).map((w, i) => (
                  <li key={i} className={styles.urgentWarningItem}>
                    <span className={styles.urgentWarningDot}>•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cross-verified badge - 좋은 날에만 표시 */}
          {selectedDate.crossVerified && selectedDate.grade <= 1 && (
            <div className={styles.crossVerifiedBadge}>
              <span className={styles.crossVerifiedIcon}>🔮</span>
              <span className={styles.crossVerifiedText}>
                {locale === "ko" ? "사주 + 점성술 교차 검증 완료" : "Saju + Astrology Cross-verified"}
              </span>
            </div>
          )}

          {/* Summary */}
          {selectedDate.summary && (
            <div className={`${styles.summaryBox} ${selectedDate.grade >= 3 ? styles.summaryWarning : ''}`}>
              <p className={styles.summaryText}>{selectedDate.summary}</p>
            </div>
          )}

          <p className={styles.selectedDesc}>{selectedDate.description}</p>

          {/* Ganzhi info */}
          {selectedDate.ganzhi && (
            <div className={styles.ganzhiBox}>
              <span className={styles.ganzhiLabel}>
                {locale === "ko" ? "일주" : "Day Pillar"}
              </span>
              <span className={styles.ganzhiValue}>{selectedDate.ganzhi}</span>
              {selectedDate.transitSunSign && (
                <>
                  <span className={styles.ganzhiDivider}>|</span>
                  <span className={styles.ganzhiLabel}>
                    {locale === "ko" ? "태양" : "Sun"}
                  </span>
                  <span className={styles.ganzhiValue}>{selectedDate.transitSunSign}</span>
                </>
              )}
            </div>
          )}

          {/* Best times */}
          {selectedDate.bestTimes && selectedDate.bestTimes.length > 0 && (
            <div className={styles.bestTimesBox}>
              <h4 className={styles.bestTimesTitle}>
                <span className={styles.bestTimesIcon}>⏰</span>
                {locale === "ko" ? "오늘의 좋은 시간" : "Best Times Today"}
              </h4>
              <div className={styles.bestTimesList}>
                {selectedDate.bestTimes.map((time, i) => (
                  <span key={i} className={styles.bestTimeItem}>
                    <span className={styles.bestTimeNumber}>{i + 1}</span>
                    {time}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div className={styles.selectedCategories}>
            {selectedDate.categories.map(cat => (
              <span key={cat} className={`${styles.categoryTag} ${styles[cat]}`}>
                {CATEGORY_EMOJI[cat]} {getCategoryLabel(cat)}
              </span>
            ))}
          </div>

          {/* Score bar */}
          <div className={styles.scoreWrapper}>
            <div className={styles.scoreBar}>
              <div
                className={`${styles.scoreFill} ${getScoreClass(selectedDate.score)}`}
                style={{ width: `${selectedDate.score}%` }}
              />
            </div>
            <span className={styles.scoreText}>
              {locale === "ko" ? "점수" : "Score"}: {selectedDate.score}/100
            </span>
          </div>

          {/* Saju analysis section */}
          {selectedDate.sajuFactors && selectedDate.sajuFactors.length > 0 && (
            <div className={styles.analysisSection}>
              <h4 className={styles.analysisTitle}>
                <span className={styles.analysisBadge}>☯️</span>
                {locale === "ko" ? "사주 분석" : "Saju Analysis"}
              </h4>
              <ul className={styles.analysisList}>
                {selectedDate.sajuFactors.slice(0, 4).map((factor, i) => (
                  <li key={i} className={styles.analysisItem}>
                    <span className={styles.analysisDotSaju}></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Astrology analysis section */}
          {selectedDate.astroFactors && selectedDate.astroFactors.length > 0 && (
            <div className={styles.analysisSection}>
              <h4 className={styles.analysisTitle}>
                <span className={styles.analysisBadge}>🌟</span>
                {locale === "ko" ? "점성술 분석" : "Astrology Analysis"}
              </h4>
              <ul className={styles.analysisList}>
                {selectedDate.astroFactors.slice(0, 4).map((factor, i) => (
                  <li key={i} className={styles.analysisItem}>
                    <span className={styles.analysisDotAstro}></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {selectedDate.recommendations.length > 0 && (
            <div className={styles.recommendationsSection}>
              <h4 className={styles.recommendationsTitle}>
                <span className={styles.recommendationsIcon}>✨</span>
                {locale === "ko" ? "오늘의 행운 키" : "Lucky Keys"}
              </h4>
              <div className={styles.recommendationsGrid}>
                {selectedDate.recommendations.slice(0, 4).map((r, i) => (
                  <div key={i} className={styles.recommendationCard}>
                    <span className={styles.recommendationNumber}>{i + 1}</span>
                    <span className={styles.recommendationText}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings - Grade 3 이상은 상단에서 이미 표시했으므로 생략 */}
          {selectedDate.warnings.length > 0 && selectedDate.grade < 3 && (
            <div className={styles.warningsSection}>
              <h4 className={styles.warningsTitle}>
                <span className={styles.warningsIcon}>⚡</span>
                {locale === "ko" ? "오늘의 주의보" : "Today's Alert"}
              </h4>
              <ul className={styles.warningsList}>
                {selectedDate.warnings.slice(0, 3).map((w, i) => (
                  <li key={i} className={styles.warningItem}>
                    <span className={styles.warningDot}></span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Large save button - authenticated users only */}
          {status === 'authenticated' && (
            <button
              className={`${styles.saveBtnLarge} ${isSaved ? styles.saved : ''}`}
              onClick={isSaved ? onUnsave : onSave}
              disabled={saving}
            >
              {saving ? (
                <span>{locale === 'ko' ? '저장 중...' : 'Saving...'}</span>
              ) : isSaved ? (
                <>
                  <span>★</span>
                  <span>{locale === 'ko' ? '저장됨 (클릭하여 삭제)' : 'Saved (click to remove)'}</span>
                </>
              ) : (
                <>
                  <span>☆</span>
                  <span>{locale === 'ko' ? '이 날짜 저장하기' : 'Save this date'}</span>
                </>
              )}
            </button>
          )}

          {/* Add to phone calendar button */}
          <button
            className={styles.calendarSyncBtn}
            onClick={handleAddToCalendar}
            aria-label={locale === 'ko' ? '휴대폰 캘린더에 추가' : 'Add to phone calendar'}
          >
            <span>📲</span>
            <span>{locale === 'ko' ? '캘린더에 추가' : 'Add to Calendar'}</span>
          </button>
        </div>
      ) : (
        <div className={styles.noInfo}>
          <p>{locale === "ko" ? "이 날짜에 대한 정보가 없습니다" : "No info for this date"}</p>
        </div>
      )}
    </div>
  );
});

export default SelectedDatePanel;
