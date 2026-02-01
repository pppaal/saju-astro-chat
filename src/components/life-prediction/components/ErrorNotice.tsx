/**
 * ErrorNotice Component
 *
 * Displays error messages in a styled notice box with retry option.
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './ErrorNotice.module.css'

interface ErrorNoticeProps {
  /** Error message to display */
  message: string
  /** Optional retry callback */
  onRetry?: () => void
  /** Optional dismiss callback */
  onDismiss?: () => void
  /** Error type for styling */
  type?: 'error' | 'warning' | 'info'
}

const iconMap = {
  error: '🚫',
  warning: '⚠️',
  info: 'ℹ️',
}

/**
 * Error notice display with retry and dismiss options
 *
 * @example
 * ```tsx
 * {error && (
 *   <ErrorNotice
 *     message={error}
 *     onRetry={handleRetry}
 *     onDismiss={() => setError(null)}
 *     type="error"
 *   />
 * )}
 * ```
 */
export const ErrorNotice = React.memo<ErrorNoticeProps>(
  ({ message, onRetry, onDismiss, type = 'error' }) => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          className={`${styles.errorNotice} ${styles[type]}`}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          role="alert"
          aria-live="assertive"
        >
          <div className={styles.noticeContent}>
            <span className={styles.noticeIcon} aria-hidden="true">
              {iconMap[type]}
            </span>
            <p className={styles.noticeMessage}>{message}</p>
          </div>

          <div className={styles.noticeActions}>
            {onRetry && (
              <button onClick={onRetry} className={styles.retryBtn} aria-label="다시 시도">
                <span className={styles.retryIcon}>🔄</span>
                다시 시도
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className={styles.dismissBtn} aria-label="닫기">
                ✕
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }
)

ErrorNotice.displayName = 'ErrorNotice'
