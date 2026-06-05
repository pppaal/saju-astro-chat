/**
 * Error State Component
 *
 * 에러 상태 UI
 */

'use client'

import Link from 'next/link'
import styles from '../tarot-reading.module.css'

interface ErrorStateProps {
  title: string
  description?: string
  linkText: string
  primaryActionHref?: string
  primaryActionText?: string
  // 일시적 실패에서 같은 화면에서 다시 시도. 주어지면 retry 버튼을 우선 노출.
  onRetry?: () => void
  retryText?: string
}

export default function ErrorState({
  title,
  description,
  linkText,
  primaryActionHref,
  primaryActionText,
  onRetry,
  retryText,
}: ErrorStateProps) {
  return (
    <div className={styles.error}>
      <h1>😢 {title}</h1>
      {description && <p className={styles.errorDescription}>{description}</p>}
      <div className={styles.errorActions}>
        {onRetry && (
          <button type="button" onClick={onRetry} className={styles.errorPrimaryLink}>
            {retryText || 'Try again'}
          </button>
        )}
        {primaryActionHref && primaryActionText && (
          <Link href={primaryActionHref} className={styles.errorPrimaryLink}>
            {primaryActionText}
          </Link>
        )}
        <Link href="/tarot" className={styles.errorLink}>
          {linkText}
        </Link>
      </div>
    </div>
  )
}
