'use client';

import React from 'react';
import { useI18n } from '@/i18n/I18nProvider';
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
  // i18n keys for automatic translation (optional)
  titleKey?: string;
  messageKey?: string;
  retryLabelKey?: string;
  supportLabelKey?: string;
}

export default function ErrorMessage({
  title,
  message,
  errorCode,
  onRetry,
  onSupport,
  retryLabel,
  supportLabel,
  variant = 'card',
  titleKey,
  messageKey,
  retryLabelKey,
  supportLabelKey,
}: ErrorMessageProps) {
  const { translate } = useI18n();

  // Use i18n if keys provided, otherwise fallback to props or defaults
  const displayTitle = titleKey ? translate(titleKey, title || 'Error') : (title || 'Error');
  const displayMessage = messageKey ? translate(messageKey, message) : message;
  const displayRetryLabel = retryLabelKey ? translate(retryLabelKey, retryLabel || 'Try Again') : (retryLabel || 'Try Again');
  const displaySupportLabel = supportLabelKey ? translate(supportLabelKey, supportLabel || 'Contact Support') : (supportLabel || 'Contact Support');
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
          <h3 className={styles.title}>{displayTitle}</h3>
          <p className={styles.message}>{displayMessage}</p>
          {errorCode && (
            <p className={styles.errorCode}>
              {translate('errors.errorCode', 'Error Code')}: <code>{errorCode}</code>
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
                aria-label={displayRetryLabel}
              >
                <span aria-hidden="true">🔄</span>
                <span>{displayRetryLabel}</span>
              </button>
            )}
            {onSupport && (
              <button
                onClick={onSupport}
                className={styles.supportButton}
                type="button"
                aria-label={displaySupportLabel}
              >
                <span aria-hidden="true">💬</span>
                <span>{displaySupportLabel}</span>
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
      titleKey="errors.networkErrorTitle"
      title="Network Error"
      messageKey="errors.networkErrorMessage"
      message="Unable to connect to the server. Please check your internet connection and try again."
      errorCode="NET_001"
      onRetry={onRetry}
      retryLabelKey="errors.tryAgain"
      variant="card"
    />
  );
}

// Convenience component for 404 errors
export function NotFoundError({ message }: { message?: string }) {
  return (
    <ErrorMessage
      titleKey="errors.notFoundTitle"
      title="Not Found"
      messageKey="errors.notFoundMessage"
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
      titleKey="errors.permissionDeniedTitle"
      title="Permission Denied"
      messageKey="errors.permissionDeniedMessage"
      message="You don't have permission to access this resource. Please contact support if you believe this is an error."
      errorCode="AUTH_403"
      onRetry={onRetry}
      retryLabelKey="errors.tryAgain"
      supportLabelKey="errors.contactSupport"
      variant="card"
    />
  );
}

// Convenience component for form validation errors
export function ValidationError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <ErrorMessage
      titleKey="errors.validationErrorTitle"
      title="Validation Error"
      message={message}
      errorCode="VAL_001"
      onRetry={onRetry}
      variant="inline"
    />
  );
}
