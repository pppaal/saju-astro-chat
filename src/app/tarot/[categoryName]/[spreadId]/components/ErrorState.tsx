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
}

export default function ErrorState({
  title,
  description,
  linkText,
  primaryActionHref,
  primaryActionText,
}: ErrorStateProps) {
  return (
    <div className={styles.error}>
      <h1>😢 {title}</h1>
      {description && <p className={styles.errorDescription}>{description}</p>}
      <div className={styles.errorActions}>
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
