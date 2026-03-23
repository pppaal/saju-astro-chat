'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import { useCallback } from 'react'
import styles from './main-page.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import {
  getPathValue,
  isPlaceholderTranslation,
  toSafeFallbackText,
  type I18nMessages,
} from '@/i18n/utils'
import { MainHeader, ServiceSearchBox, ParticleCanvas } from './components'
import PrefetchLinks from '@/components/PrefetchLinks'

type Locale = 'en' | 'ko'

interface MainPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
}

export default function MainPageClient({ initialLocale, initialMessages }: MainPageClientProps) {
  const { locale: activeLocale, hydrated, t } = useI18n()
  const locale = activeLocale || initialLocale

  const localizedFallback = useCallback(
    (ko: string, en: string) => (locale === 'ko' ? ko : en),
    [locale]
  )

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
      <MainHeader translate={translate} locale={locale as Locale} />

      <section className={styles.fullscreenHero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleLead}>
              {translate(
                'landing.heroTitleLead',
                localizedFallback('결정이 필요한 순간,', 'When a decision matters,')
              )}
            </span>
            <span className={styles.heroTitleAccent}>
              {translate(
                'landing.heroTitleAccent',
                localizedFallback('흐름과 타이밍을 함께 봅니다', 'see the flow and timing together')
              )}
            </span>
          </h1>
          <p className={styles.heroSub}>
            {translate(
              'landing.heroSub',
              localizedFallback(
                '연애, 이직, 관계, 중요한 선택 앞에서 흐름을 읽고, 타이밍을 분석해 더 선명한 판단을 도와드립니다.',
                'Read the situation, analyze the timing, and make clearer decisions across relationships, work, and major choices.'
              )
            )}
          </p>

          <ServiceSearchBox translate={translate} styles={styles} locale={locale as Locale} />
        </div>
      </section>

      <PrefetchLinks />
      <SpeedInsights />
    </main>
  )
}
