'use client';

import React, { memo } from 'react';
import styles from '@/app/(main)/main-page.module.css';

interface StatsSectionProps {
  todayVisitors: number | null;
  totalVisitors: number | null;
  totalMembers: number | null;
  visitorError: string | null;
  todayLabel: string;
  totalLabel: string;
  membersLabel: string;
  footnoteLabel: string;
}

const formatNumber = (num: number | null): string => {
  if (num === null) {return '0';}
  if (num >= 1000000) {return `${(num / 1000000).toFixed(1)}M`;}
  if (num >= 1000) {return `${(num / 1000).toFixed(1)}K`;}
  return num.toString();
};

/**
 * Stats bar section showing visitor and member statistics
 * Memoized to prevent unnecessary re-renders
 */
export const StatsSection = memo(function StatsSection({
  todayVisitors,
  totalVisitors,
  totalMembers,
  visitorError,
  todayLabel,
  totalLabel,
  membersLabel,
  footnoteLabel,
}: StatsSectionProps) {
  return (
    <section className={styles.statsSection}>
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>👁️</span>
          <p className={styles.statLabel}>{todayLabel}</p>
          <p className={styles.statValue}>
            {todayVisitors === null ? (
              <span className={styles.statSkeleton}>...</span>
            ) : (
              formatNumber(todayVisitors)
            )}
          </p>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statIcon}>🌟</span>
          <p className={styles.statLabel}>{totalLabel}</p>
          <p className={styles.statValue}>
            {totalVisitors === null ? (
              <span className={styles.statSkeleton}>...</span>
            ) : (
              formatNumber(totalVisitors)
            )}
          </p>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statIcon}>✨</span>
          <p className={styles.statLabel}>{membersLabel}</p>
          <p className={styles.statValue}>
            {totalMembers === null ? (
              <span className={styles.statSkeleton}>...</span>
            ) : (
              formatNumber(totalMembers)
            )}
          </p>
        </div>

        <div className={styles.statFootnote}>
          {visitorError ?? footnoteLabel}
        </div>
      </div>
    </section>
  );
});

export default StatsSection;
