'use client';

import React from 'react';
import styles from './ErrorMessage.module.css';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  onSupport?: () => void;
  retryLabel?: string;
  supportLabel?: string;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export default function ErrorMessage({
  title = 'Error',
  message,
  errorCode,
  onRetry,
  onSupport,
  retryLabel = 'Try Again',
  supportLabel = 'Contact Support',
  variant = 'card',
}: ErrorMessageProps) {
  const containerClass = `${styles.errorMessage} ${styles[variant]}`;

  return (
    <div className={containerClass} role="alert" aria-live="assertive">
      <div className={styles.content}>
        {variant !== 'inline' && (
          <div className={styles.iconWrapper}>
            <span className={styles.icon} aria-hidden="true">
              ⚠️
            </span>
          </div>
        )}

        <div className={styles.textContent}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.message}>{message}</p>
          {errorCode && (
            <p className={styles.errorCode}>
              Error Code: <code>{errorCode}</code>
            </p>
          )}
        </div>

        {(onRetry || onSupport) && (
          <div className={styles.actions}>
            {onRetry && (
              <button
                onClick={onRetry}
                className={styles.retryButton}
                type="button"
                aria-label={retryLabel}
              >
                <span aria-hidden="true">🔄</span>
                <span>{retryLabel}</span>
              </button>
            )}
            {onSupport && (
              <button
                onClick={onSupport}
                className={styles.supportButton}
                type="button"
                aria-label={supportLabel}
              >
                <span aria-hidden="true">💬</span>
                <span>{supportLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Convenience component for network errors
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      title="Network Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      errorCode="NET_001"
      onRetry={onRetry}
      variant="card"
    />
  );
}

// Convenience component for 404 errors
export function NotFoundError({ message }: { message?: string }) {
  return (
    <ErrorMessage
      title="Not Found"
      message={message || "The requested resource could not be found."}
      errorCode="404"
      variant="card"
    />
  );
}

// Convenience component for permission errors
export function PermissionError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      title="Permission Denied"
      message="You don't have permission to access this resource. Please contact support if you believe this is an error."
      errorCode="AUTH_403"
      onRetry={onRetry}
      variant="card"
    />
  );
}
