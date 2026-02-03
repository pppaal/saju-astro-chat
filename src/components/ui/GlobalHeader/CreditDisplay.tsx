'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useI18n } from '@/i18n/I18nProvider'
import { styles } from './styles'

/**
 * Displays user's remaining credits with auto-refresh on credit-update events
 */
export function CreditDisplay() {
  const { data: session, status } = useSession()
  const { t } = useI18n()
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') {
      return
    }
    if (!session?.user) {
      setCredits(null)
      setLoading(false)
      return
    }

    const fetchCredits = async () => {
      try {
        const res = await fetch('/api/me/credits')
        if (res.ok) {
          const data = await res.json()
          setCredits(data.credits?.remaining ?? 0)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()

    const handleCreditUpdate = () => fetchCredits()
    window.addEventListener('credit-update', handleCreditUpdate)
    return () => window.removeEventListener('credit-update', handleCreditUpdate)
  }, [session, status])

  if (status === 'loading' || loading || !session?.user || credits === null) {
    return null
  }

  return (
    <Link
      href="/pricing"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl
        text-[13px] font-semibold no-underline
        ${styles.buttonBase} ${styles.blueButton}`}
      aria-label={t('credits.viewCredits') || `${credits} credits remaining, click to view pricing`}
    >
      <span className="text-yellow-400" aria-hidden="true">
        ✦
      </span>
      <span>{credits}</span>
      <span className="text-blue-300/80 font-medium text-[12px]">credit left</span>
    </Link>
  )
}
