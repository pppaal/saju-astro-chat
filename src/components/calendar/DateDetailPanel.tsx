"use client";

import React from "react";
import { useSession } from "next-auth/react";
import styles from "./DestinyCalendar.module.css";

import type { EventCategory, ImportantDate } from './types';
import { CATEGORY_EMOJI } from './constants';
import { getGradeEmoji, getCategoryLabel, getScoreClass } from './utils';

interface DateDetailPanelProps {
  locale: string;
  selectedDay: Date | null;
  selectedDate: ImportantDate | null;
  savedDates: Set<string>;
  saving: boolean;
  saveMsg: string | null;
  onSaveDate: () => void;
  onUnsaveDate: () => void;
  weekdays: string[];
}

export default function DateDetailPanel({
  locale,
  selectedDay,
  selectedDate,
  savedDates,
  saving,
  saveMsg,
  onSaveDate,
  onUnsaveDate,
  weekdays,
}: DateDetailPanelProps) {
  const { status } = useSession();

  const getCategoryLabelLocal = (cat: EventCategory) => getCategoryLabel(cat, locale);

  if (!selectedDay) {return null;}

  return (
    <div className={styles.selectedDayInfo}>
      <div className={styles.selectedDayHeader}>
        <span className={styles.selectedDayDate}>
          {selectedDay.getMonth() + 1}/{selectedDay.getDate()}
          {locale === "ko" && ` (${weekdays[selectedDay.getDay()]})`}
        </span>
        <div className={styles.headerActions}>
          {selectedDate && (
            <span className={styles.selectedGrade}>{getGradeEmoji(selectedDate.grade)}</span>
          )}
          {status === 'authenticated' && selectedDate && (
            <button
              className={`${styles.saveBtn} ${savedDates.has(selectedDate.date) ? styles.saved : ''}`}
              onClick={savedDates.has(selectedDate.date) ? onUnsaveDate : onSaveDate}
              disabled={saving}
              title={savedDates.has(selectedDate.date)
                ? (locale === 'ko' ? '저장됨 (클릭하여 삭제)' : 'Saved (click to remove)')
                : (locale === 'ko' ? '이 날짜 저장하기' : 'Save this date')}
            >
              {saving ? '...' : savedDates.has(selectedDate.date) ? '★' : '☆'}
            </button>
          )}
        </div>
      </div>

      {saveMsg && <div className={styles.saveMsg}>{saveMsg}</div>}

      {selectedDate ? (
        <div className={styles.selectedDayContent}>
          <h3 className={styles.selectedTitle}>{selectedDate.title}</h3>

          {selectedDate.crossVerified && (
            <div className={styles.crossVerifiedBadge}>
              <span className={styles.crossVerifiedIcon}>🔮</span>
              <span className={styles.crossVerifiedText}>
                {locale === "ko" ? "사주 + 점성술 교차 검증 완료" : "Saju + Astrology Cross-verified"}
              </span>
            </div>
          )}

          {selectedDate.summary && (
            <div className={styles.summaryBox}>
              <p className={styles.summaryText}>{selectedDate.summary}</p>
            </div>
          )}

          <p className={styles.selectedDesc}>{selectedDate.description}</p>

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

          <div className={styles.selectedCategories}>
            {selectedDate.categories.map(cat => (
              <span key={cat} className={`${styles.categoryTag} ${styles[cat]}`}>
                {CATEGORY_EMOJI[cat]} {getCategoryLabelLocal(cat)}
              </span>
            ))}
          </div>

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

          {selectedDate.warnings.length > 0 && (
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

          {status === 'authenticated' && (
            <button
              className={`${styles.saveBtnLarge} ${savedDates.has(selectedDate.date) ? styles.saved : ''}`}
              onClick={savedDates.has(selectedDate.date) ? onUnsaveDate : onSaveDate}
              disabled={saving}
            >
              {saving ? (
                <span>{locale === 'ko' ? '저장 중...' : 'Saving...'}</span>
              ) : savedDates.has(selectedDate.date) ? (
                <>
                  <span className={styles.saveBtnIcon}>★</span>
                  <span>{locale === 'ko' ? '저장됨 (삭제하려면 클릭)' : 'Saved (click to remove)'}</span>
                </>
              ) : (
                <>
                  <span className={styles.saveBtnIcon}>☆</span>
                  <span>{locale === 'ko' ? '이 날짜 저장하기' : 'Save this date'}</span>
                </>
              )}
            </button>
          )}
          {status !== 'authenticated' && (
            <p className={styles.loginHint}>
              {locale === 'ko' ? '로그인하면 이 날짜를 저장할 수 있어요' : 'Login to save this date'}
            </p>
          )}
        </div>
      ) : (
        <p className={styles.noSpecialDay}>
          {locale === "ko" ? "특별한 운세 정보가 없는 날입니다" : "No special fortune info for this day"}
        </p>
      )}
    </div>
  );
}
