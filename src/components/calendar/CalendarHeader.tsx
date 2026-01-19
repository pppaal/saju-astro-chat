"use client";

// src/components/calendar/CalendarHeader.tsx
import React from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import CreditBadge from '@/components/ui/CreditBadge';
import styles from './DestinyCalendar.module.css';

interface YearSummary {
  total: number;
  grade0: number;
  grade1: number;
  grade2: number;
  grade3: number;
  grade4: number;
}

interface CalendarHeaderProps {
  year: number;
  yearSummary: YearSummary | null;
  cacheHit: boolean;
  onEditClick: () => void;
  isDarkTheme: boolean;
  onThemeToggle: () => void;
}

export default function CalendarHeader({
  year,
  yearSummary,
  cacheHit,
  onEditClick,
  isDarkTheme,
  onThemeToggle,
}: CalendarHeaderProps) {
  const { locale, t } = useI18n();

  return (
    <>
      <BackButton />

      <div className={styles.calendarHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitleSection}>
            <div className={styles.calendarIconWrapper}>
              <span className={styles.calendarIcon}>📅</span>
            </div>
            <div className={styles.titleGroup}>
              <h1 className={styles.calendarTitle}>
                {t('calendar.pageTitle', 'Destiny Calendar')}
              </h1>
              <p className={styles.calendarSubtitle}>
                {locale === "ko" ? `${year}년 당신만의 특별한 날들` : `Your special days in ${year}`}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <CreditBadge variant="compact" />
            {/* Cache indicator */}
            {cacheHit && (
              <span
                className={styles.cacheIndicator}
                title={t('calendar.cachingNote', 'Using cached data (fast loading)')}
                aria-label={locale === "ko" ? "캐시된 데이터" : "Cached data"}
              >
                <span className={styles.cacheIcon}>⚡</span>
                <span className={styles.cacheText}>
                  {locale === "ko" ? "캐시" : "Cached"}
                </span>
              </span>
            )}
            <button className={styles.editBirthBtn} onClick={onEditClick}>
              <span>✏️</span>
              <span>{t('common.edit', 'Edit')}</span>
            </button>
          </div>
        </div>

        {/* Year Summary Badges */}
        {yearSummary && (
          <div className={styles.summaryBadges}>
            <span className={styles.summaryBadge} title={t('calendar.bestDayShort', 'Best Days (~5%)')}>
              <span className={styles.badgeEmoji}>🌟</span>
              <span className={styles.badgeLabel}>{locale === "ko" ? "최고" : "Best"}</span>
              <span className={styles.badgeCount}>{yearSummary.grade0}</span>
            </span>
            <span className={styles.summaryBadge} title={t('calendar.goodDayShort', 'Good Days (~15%)')}>
              <span className={styles.badgeEmoji}>✨</span>
              <span className={styles.badgeLabel}>{locale === "ko" ? "좋음" : "Good"}</span>
              <span className={styles.badgeCount}>{yearSummary.grade1}</span>
            </span>
            <span className={`${styles.summaryBadge} ${styles.cautionBadge}`} title={t('calendar.badDayShort', 'Bad Days (~15%)')}>
              <span className={styles.badgeEmoji}>⚠️</span>
              <span className={styles.badgeLabel}>{locale === "ko" ? "안좋음" : "Bad"}</span>
              <span className={styles.badgeCount}>{yearSummary.grade3}</span>
            </span>
            {yearSummary.grade4 > 0 && (
              <span className={`${styles.summaryBadge} ${styles.worstBadge}`} title={t('calendar.worstDayShort', 'Worst Days (~5%)')}>
                <span className={styles.badgeEmoji}>☠️</span>
                <span className={styles.badgeLabel}>{locale === "ko" ? "최악" : "Worst"}</span>
                <span className={styles.badgeCount}>{yearSummary.grade4}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
