//src/app/numerology/page.tsx

'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import ServicePageLayout from '@/components/ui/ServicePageLayout'

// Lazy load heavy tab component with framer-motion animations
const NumerologyTabs = dynamic(() => import('@/components/numerology/NumerologyTabs'), {
  ssr: false,
  loading: () => <NumerologyLoadingState />,
})
import styles from './Numerology.module.css'
import { useI18n } from '@/i18n/I18nProvider'

function NumerologyLoadingState() {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 8000)
    return () => window.clearTimeout(timer)
  }, [])

  if (timedOut) {
    return (
      <div
        style={{
          minHeight: '400px',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          padding: '1rem',
        }}
      >
        <div>
          <p>Numerology tools are taking longer than expected.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ minHeight: '400px', display: 'grid', placeItems: 'center', gap: '0.5rem' }}
      aria-live="polite"
    >
      <div
        style={{
          width: '220px',
          height: '16px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.12)',
        }}
      />
      <div
        style={{
          width: '300px',
          height: '16px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <div
        style={{
          width: '180px',
          height: '16px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.06)',
        }}
      />
    </div>
  )
}

export default function NumerologyPage() {
  const { t } = useI18n()

  return (
    <ServicePageLayout
      icon="🔢"
      title={t('numerology.title', 'Numerology Analysis')}
      subtitle={t(
        'numerology.subtitle',
        'Discover your life path and potential with your birth date and name.'
      )}
      particleColor="#f093fb"
    >
      <main className={styles.page}>
        {/* Background Stars */}
        <div className={styles.stars}>
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className={styles.star}
              style={{
                left: `${(i * 37 + 13) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                animationDelay: `${(i % 4) + i * 0.13}s`,
                animationDuration: `${3 + (i % 3)}s`,
              }}
            />
          ))}
        </div>

        <div className={`${styles.card} ${styles.fadeIn}`}>
          <div className={styles.form}>
            <NumerologyTabs />
          </div>
        </div>
      </main>
    </ServicePageLayout>
  )
}
