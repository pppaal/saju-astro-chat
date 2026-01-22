/**
 * BirthInfoDisplay Component
 *
 * Displays current birth information with option to change it.
 */

'use client';

import React from 'react';
import styles from '../life-prediction.module.css';

interface BirthInfoDisplayProps {
  /** Birth date in YYYY-MM-DD format */
  birthDate: string;
  /** Gender (M or F) */
  gender: 'M' | 'F';
  /** Change handler */
  onChangeClick: () => void;
  /** Locale for text */
  locale: string;
}

/**
 * Birth info display with change button
 *
 * @example
 * ```tsx
 * <BirthInfoDisplay
 *   birthDate="1990-01-15"
 *   gender="M"
 *   onChangeClick={handleChange}
 *   locale="ko"
 * />
 * ```
 */
export const BirthInfoDisplay = React.memo<BirthInfoDisplayProps>(
  ({ birthDate, gender, onChangeClick, locale }) => {
    return (
      <div className={styles.birthInfoDisplay}>
        <span className={styles.birthInfoIcon}>🎂</span>
        <span className={styles.birthInfoText}>
          {birthDate}
          {gender === 'M' ? ' 👨' : ' 👩'}
        </span>
        <button className={styles.changeBirthBtn} onClick={onChangeClick}>
          {locale === 'ko' ? '변경' : 'Change'}
        </button>
      </div>
    );
  }
);

BirthInfoDisplay.displayName = 'BirthInfoDisplay';
