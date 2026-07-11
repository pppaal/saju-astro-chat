'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { CREDIT_UPDATE_EVENT } from '@/lib/api/ApiClient'
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
      const json = await res.json()
      // /api/me/credits 는 withApiMiddleware 의 apiSuccess 로 감싸
      // `{ success, data: { isLoggedIn, credits } }` 를 준다. 직전엔 최상위
      // 에서 credits 를 읽어 항상 undefined → 뱃지가 아무것도 렌더하지 않는
      // 무음 실패였다. 언랩 우선, (혹시 모를) 비래핑 응답도 그대로 흡수.
      const data = (json?.data ?? json) as CreditData
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

    window.addEventListener(CREDIT_UPDATE_EVENT, handleCreditUpdate)
    return () => window.removeEventListener(CREDIT_UPDATE_EVENT, handleCreditUpdate)
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

// Helper function to trigger credit update across components.
// 과금 라우트 호출은 apiFetch 가 자동으로 이 이벤트를 쏘므로(ApiClient 의
// CREDIT_MUTATING_ROUTES), 이 헬퍼는 그 밖의 잔액 변경(결제 성공 등)에서 쓴다.
export function triggerCreditUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CREDIT_UPDATE_EVENT))
  }
}
