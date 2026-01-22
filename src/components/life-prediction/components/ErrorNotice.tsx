/**
 * ErrorNotice Component
 *
 * Displays error messages in a styled notice box.
 */

'use client';

import React from 'react';
import styles from '../life-prediction.module.css';

interface ErrorNoticeProps {
  /** Error message to display */
  message: string;
}

/**
 * Error notice display
 *
 * @example
 * ```tsx
 * {error && <ErrorNotice message={error} />}
 * ```
 */
export const ErrorNotice = React.memo<ErrorNoticeProps>(({ message }) => {
  return (
    <div className={styles.errorNotice}>
      <span className={styles.noticeIcon}>⚠️</span>
      <p>{message}</p>
    </div>
  );
});

ErrorNotice.displayName = 'ErrorNotice';
