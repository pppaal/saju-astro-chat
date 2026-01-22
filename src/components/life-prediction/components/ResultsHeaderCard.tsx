/**
 * ResultsHeaderCard Component
 *
 * Displays the header for prediction results with title and count.
 */

'use client';

import React from 'react';
import styles from '../life-prediction.module.css';

interface ResultsHeaderCardProps {
  /** Number of results */
  resultsCount: number;
  /** Locale for text */
  locale: string;
}

/**
 * Results header with count
 *
 * @example
 * ```tsx
 * <ResultsHeaderCard resultsCount={3} locale="ko" />
 * ```
 */
export const ResultsHeaderCard = React.memo<ResultsHeaderCardProps>(
  ({ resultsCount, locale }) => {
    return (
      <div className={styles.resultsHeader}>
        <h2 className={styles.resultsTitle}>
          {locale === 'ko' ? '최적 시기 분석 결과' : 'Optimal Timing Analysis'}
        </h2>
        <p className={styles.resultsSubtitle}>
          {locale === 'ko'
            ? `총 ${resultsCount}개의 추천 기간을 찾았습니다`
            : `Found ${resultsCount} recommended periods`}
        </p>
      </div>
    );
  }
);

ResultsHeaderCard.displayName = 'ResultsHeaderCard';
