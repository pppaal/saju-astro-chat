'use client';

import React from 'react';
import styles from './ErrorWithRetry.module.css';

export interface ErrorWithRetryProps {
  /** Error title */
  title?: string;
  /** Error message */
  message: string;
  /** Retry button text */
  retryText?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Error type for styling */
  type?: 'network' | 'server' | 'validation' | 'generic';
  /** Show retry button */
  showRetry?: boolean;
  /** Icon to display */
  icon?: string;
}

const ERROR_CONFIG = {
  network: {
    icon: '📡',
    defaultTitle: 'Connection Error',
    defaultTitleKo: '연결 오류',
  },
  server: {
    icon: '⚠️',
    defaultTitle: 'Server Error',
    defaultTitleKo: '서버 오류',
  },
  validation: {
    icon: '❌',
    defaultTitle: 'Validation Error',
    defaultTitleKo: '입력 오류',
  },
  generic: {
    icon: '💫',
    defaultTitle: 'Error',
    defaultTitleKo: '오류',
  },
} as const;

export function ErrorWithRetry({
  title,
  message,
  retryText = 'Retry',
  onRetry,
  type = 'generic',
  showRetry = true,
  icon,
}: ErrorWithRetryProps) {
  const config = ERROR_CONFIG[type];
  const displayIcon = icon || config.icon;
  const displayTitle = title || config.defaultTitle;

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <span className={styles.icon} role="img" aria-label="Error">
          {displayIcon}
        </span>
      </div>

      <h3 className={styles.title}>{displayTitle}</h3>

      <p className={styles.message}>{message}</p>

      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className={styles.retryButton}
          type="button"
        >
          <svg
            className={styles.retryIcon}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C9.84871 2 11.5051 2.84285 12.5859 4.17157M12.5859 4.17157V1M12.5859 4.17157H9.41421"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {retryText}
        </button>
      )}
    </div>
  );
}

export default ErrorWithRetry;
