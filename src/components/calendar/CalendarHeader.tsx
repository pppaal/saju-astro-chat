'use client'

import React from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import CreditBadge from '@/components/ui/CreditBadge'
import styles from './DestinyCalendar.module.css'

interface YearSummary {
  total: number
  grade0: number
  grade1: number
  grade2: number
  grade3: number
  grade4: number
}

interface CalendarHeaderProps {
  year: number
  yearSummary: YearSummary | null
  cacheHit: boolean
  onEditClick: () => void
  isDarkTheme: boolean
  onThemeToggle: () => void
}

export default function CalendarHeader({
  year,
  yearSummary,
  cacheHit,
  onEditClick,
  isDarkTheme: _isDarkTheme,
  onThemeToggle: _onThemeToggle,
}: CalendarHeaderProps) {
  const { locale, t } = useI18n()

  const strategicLabels = {
    grade0: locale === 'ko' ? '실행' : 'Execute',
    grade1: locale === 'ko' ? '활용' : 'Leverage',
    grade2: locale === 'ko' ? '운영' : 'Operate',
    grade3: locale === 'ko' ? '검토' : 'Review',
    grade4: locale === 'ko' ? '방어' : 'Protect',
  }

  return (
    <>
      <div className={styles.calendarHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitleSection}>
            <div className={styles.calendarIconWrapper}>
              <span className={styles.calendarIcon}>📅</span>
            </div>
            <div className={styles.titleGroup}>
              <h1 className={styles.calendarTitle}>{t('calendar.pageTitle', 'Destiny Calendar')}</h1>
              <p className={styles.calendarSubtitle}>
                {locale === 'ko' ? `${year}년 운영 흐름 요약` : `Your operating flow in ${year}`}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <CreditBadge variant="compact" />
            {cacheHit && (
              <span
                className={styles.cacheIndicator}
                title={t('calendar.cachingNote', 'Using cached data (fast loading)')}
                aria-label={locale === 'ko' ? '캐시된 데이터' : 'Cached data'}
              >
                <span className={styles.cacheIcon}>⚡</span>
                <span className={styles.cacheText}>{locale === 'ko' ? '캐시' : 'Cached'}</span>
              </span>
            )}
            <button className={styles.editBirthBtn} onClick={onEditClick}>
              <span>✏️</span>
              <span>{t('common.edit', 'Edit')}</span>
            </button>
          </div>
        </div>

        {yearSummary && (
          <div className={styles.summaryBadges}>
            <span className={styles.summaryTotal}>{locale === 'ko' ? '365일 중' : 'of 365 days'}</span>
            <span className={styles.badgeDivider} />
            <span
              className={styles.summaryBadge}
              title={locale === 'ko' ? '강하게 밀어붙이기 좋은 구간' : 'Best windows to act decisively'}
            >
              <span className={styles.badgeEmoji}>🌟</span>
              <span className={styles.badgeLabel}>{strategicLabels.grade0}</span>
              <span className={styles.badgeCount}>{yearSummary.grade0}{locale === 'ko' ? '일' : 'd'}</span>
            </span>
            <span
              className={styles.summaryBadge}
              title={locale === 'ko' ? '기회를 살리되 점검을 병행할 구간' : 'Use the opportunity, but keep checks in place'}
            >
              <span className={styles.badgeEmoji}>✨</span>
              <span className={styles.badgeLabel}>{strategicLabels.grade1}</span>
              <span className={styles.badgeCount}>{yearSummary.grade1}{locale === 'ko' ? '일' : 'd'}</span>
            </span>
            <span
              className={`${styles.summaryBadge} ${styles.normalBadge}`}
              title={locale === 'ko' ? '정리·운영·루틴 유지에 맞는 구간' : 'Better for operating and organizing'}
            >
              <span className={styles.badgeEmoji}>◆</span>
              <span className={styles.badgeLabel}>{strategicLabels.grade2}</span>
              <span className={styles.badgeCount}>{yearSummary.grade2}{locale === 'ko' ? '일' : 'd'}</span>
            </span>
            <span
              className={`${styles.summaryBadge} ${styles.cautionBadge}`}
              title={locale === 'ko' ? '확정보다 검토를 먼저 할 구간' : 'Review first before acting'}
            >
              <span className={styles.badgeEmoji}>⚠️</span>
              <span className={styles.badgeLabel}>{strategicLabels.grade3}</span>
              <span className={styles.badgeCount}>{yearSummary.grade3}{locale === 'ko' ? '일' : 'd'}</span>
            </span>
            <span
              className={`${styles.summaryBadge} ${styles.worstBadge}`}
              title={locale === 'ko' ? '보전과 리스크 관리에 집중할 구간' : 'Focus on protection and downside control'}
            >
              <span className={styles.badgeEmoji}>🛡️</span>
              <span className={styles.badgeLabel}>{strategicLabels.grade4}</span>
              <span className={styles.badgeCount}>{yearSummary.grade4}{locale === 'ko' ? '일' : 'd'}</span>
            </span>
          </div>
        )}
      </div>
    </>
  )
}
