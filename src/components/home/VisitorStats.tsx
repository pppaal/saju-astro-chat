import React from 'react';
import { formatNumber } from '@/utils/numberFormat';
import styles from './VisitorStats.module.css';

interface VisitorStatsProps {
  todayVisitors: number | null;
  totalVisitors: number | null;
  totalMembers: number | null;
  error: string | null;
  translate: (key: string, fallback: string) => string;
}

export function VisitorStats({
  todayVisitors,
  totalVisitors,
  totalMembers,
  error,
  translate,
}: VisitorStatsProps) {
  return (
    <section className={styles.statsSection}>
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>👁️</span>
          <p className={styles.statLabel}>{translate('landing.statsToday', 'Today')}</p>
          <p className={styles.statValue}>{formatNumber(todayVisitors)}</p>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>🌟</span>
          <p className={styles.statLabel}>{translate('landing.statsTotal', 'Total Visitors')}</p>
          <p className={styles.statValue}>{formatNumber(totalVisitors)}</p>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>✨</span>
          <p className={styles.statLabel}>{translate('landing.statsMembers', 'Members')}</p>
          <p className={styles.statValue}>{formatNumber(totalMembers)}</p>
        </div>
        <div className={styles.statFootnote}>
          {error ?? translate('landing.statsFootnote', 'Live stats')}
        </div>
      </div>
    </section>
  );
}
