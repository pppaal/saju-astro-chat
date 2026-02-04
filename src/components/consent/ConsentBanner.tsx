'use client'

import { useEffect, useState } from 'react'
import { useConsent } from '@/contexts/ConsentContext'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './consentBanner.module.css'

export function ConsentBanner() {
  const { status, grant, deny } = useConsent()
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(status === 'pending')
  }, [status])

  if (!visible) {
    return null
  }

  return (
    <div
      className={styles.banner}
      role="dialog"
      aria-live="polite"
      aria-labelledby="consent-banner-title"
    >
      <div className={styles.text}>
        <strong id="consent-banner-title">{t('consent.title')}</strong>
        <p>{t('consent.description')}</p>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.secondary}
          onClick={() => {
            deny()
            setVisible(false)
          }}
        >
          {t('consent.reject')}
        </button>
        <button
          className={styles.primary}
          onClick={() => {
            grant()
            setVisible(false)
          }}
        >
          {t('consent.accept')}
        </button>
      </div>
    </div>
  )
}
