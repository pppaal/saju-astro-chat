'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './CreditBadge.module.css'

interface CreditData {
  isLoggedIn: boolean
  credits: {
    monthly: number
    used: number
    bonus: number
    remaining: number
    total?: number
  }
}

interface CreditBadgeProps {
  variant?: 'default' | 'compact' | 'minimal'
  className?: string
}

export default function CreditBadge({ variant = 'default', className = '' }: CreditBadgeProps) {
  const { data: session, status } = useSession()
  const [creditData, setCreditData] = useState<CreditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const sessionLoading = status === 'loading'

  const fetchCredits = useCallback(async () => {
    if (status === 'loading') {
      return
    }

    if (!session?.user) {
      setCreditData(null)
      setError(false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/me/credits')
      if (!res.ok) {
        throw new Error('Failed to fetch')
      }
      const data = await res.json()
      setCreditData(data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [session, status])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  // Listen for credit updates (custom event)
  useEffect(() => {
    const handleCreditUpdate = () => {
      fetchCredits()
    }

    window.addEventListener('credit-update', handleCreditUpdate)
    return () => window.removeEventListener('credit-update', handleCreditUpdate)
  }, [fetchCredits])

  // Not logged in - show login prompt
  if (sessionLoading) {
    if (variant === 'minimal') {
      return null
    }
    return (
      <div className={`${styles.badge} ${styles.loading} ${className}`}>
        <span className={styles.spinner} />
      </div>
    )
  }

  // Not logged in - render nothing. The global hamburger drawer (top-left
  // on every service page) already provides the login entry inline; a
  // second redundant pill in the corner just clutters the layout. Logged-in
  // users still see their credit count below.
  if (!session?.user) {
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div className={`${styles.badge} ${styles.loading} ${className}`}>
        <span className={styles.spinner} />
      </div>
    )
  }

  // Error state — render nothing instead of a confusing warning icon.
  // Real failures show up in the actual purchase flow.
  if (error || !creditData || !creditData.credits) {
    return null
  }

  const { credits } = creditData
  // API에서 total을 반환하면 사용, 아니면 fallback으로 monthly + bonus
  const totalCredits = credits.total ?? credits.monthly + credits.bonus
  const remaining = credits.remaining ?? 0
  const percentage = totalCredits > 0 ? (remaining / totalCredits) * 100 : 0

  // Determine color based on remaining percentage
  const getColorClass = () => {
    if (percentage > 50) {
      return styles.good
    }
    if (percentage > 20) {
      return styles.warning
    }
    return styles.low
  }

  // 결제 후 돌아올 URL을 저장하면서 pricing 페이지로 이동
  const handleClick = () => {
    if (typeof window !== 'undefined') {
      // 현재 페이지 저장 (pricing 페이지 제외). 쿼리까지 보존해 결제 후
      // 보던 화면으로 정확히 복귀한다.
      const currentPath = window.location.pathname
      if (currentPath !== '/pricing' && currentPath !== '/success') {
        localStorage.setItem('checkout_return_url', currentPath + window.location.search)
      }
    }
  }

  if (variant === 'minimal') {
    return (
      <Link
        href="/pricing"
        onClick={handleClick}
        className={`${styles.badgeMinimal} ${getColorClass()} ${className}`}
      >
        <span className={styles.creditIcon}>✦</span>
        <span className={styles.creditCount}>{remaining}</span>
      </Link>
    )
  }

  if (variant === 'compact') {
    return (
      <Link
        href="/pricing"
        onClick={handleClick}
        className={`${styles.badge} ${styles.compact} ${getColorClass()} ${className}`}
      >
        <span className={styles.creditIcon}>✦</span>
        <span className={styles.creditText}>
          {remaining}/{totalCredits}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href="/pricing"
      onClick={handleClick}
      className={`${styles.badge} ${getColorClass()} ${className}`}
    >
      <div className={styles.content}>
        <div className={styles.creditInfo}>
          <span className={styles.creditIcon}>✦</span>
          <span className={styles.creditText}>
            <strong>{remaining}</strong>
            <span className={styles.divider}>/</span>
            <span className={styles.total}>{totalCredits}</span>
          </span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </Link>
  )
}

// Helper function to trigger credit update across components
export function triggerCreditUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('credit-update'))
  }
}
