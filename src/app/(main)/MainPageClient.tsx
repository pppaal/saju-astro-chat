'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import { useCallback } from 'react'
import Link from 'next/link'
import styles from './main-page.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import {
  getPathValue,
  isPlaceholderTranslation,
  toSafeFallbackText,
  type I18nMessages,
} from '@/i18n/utils'
import { MainHeader, ParticleCanvas } from './components'
import PrefetchLinks from '@/components/PrefetchLinks'
import { ENABLED_SERVICES } from '@/config/enabledServices'

type Locale = 'en' | 'ko'

interface MainPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
}

const HOMEPAGE_SERVICES = ENABLED_SERVICES.filter((s) => s.id !== 'destinyMatch')

export default function MainPageClient({ initialLocale, initialMessages }: MainPageClientProps) {
  const { locale: activeLocale, hydrated, t } = useI18n()
  const locale = (activeLocale || initialLocale) as Locale

  const serverTranslate = useCallback(
    (key: string, fallback?: string) => {
      const value = getPathValue(initialMessages, key)
      if (typeof value === 'string' && !isPlaceholderTranslation(value, key)) {
        return value
      }
      return fallback || toSafeFallbackText(key)
    },
    [initialMessages]
  )

  const translate = useCallback(
    (key: string, fallback: string) => {
      if (!hydrated) {
        return serverTranslate(key, fallback)
      }
      const translated = t(key, fallback)
      if (isPlaceholderTranslation(translated, key)) {
        return serverTranslate(key, fallback)
      }
      return translated
    },
    [hydrated, serverTranslate, t]
  )

  return (
    <main className={styles.container}>
      <ParticleCanvas />
      <MainHeader translate={translate} locale={locale} />

      <section className={styles.brandHero}>
        <h1 className={styles.brandTitle}>DestinyPal</h1>
        <p className={styles.brandSub}>
          {locale === 'ko' ? '당신의 운세를 보여드립니다' : 'See your fortune unfold'}
        </p>
      </section>

      <section
        className={styles.servicesGrid}
        aria-label={locale === 'ko' ? '서비스' : 'Services'}
      >
        {HOMEPAGE_SERVICES.map((service) => (
          <Link key={service.id} href={service.href} className={styles.serviceTile}>
            <span className={styles.serviceTileIcon} aria-hidden="true">
              {service.icon}
            </span>
            <h2 className={styles.serviceTileLabel}>
              {locale === 'ko' ? service.label.ko : service.label.en}
            </h2>
            <p className={styles.serviceTileDesc}>
              {locale === 'ko' ? service.description.ko : service.description.en}
            </p>
          </Link>
        ))}
      </section>

      <PrefetchLinks />
      <SpeedInsights />
    </main>
  )
}
