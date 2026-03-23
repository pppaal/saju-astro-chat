'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import Link from 'next/link'
import { useCallback } from 'react'
import styles from './main-page.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import {
  getPathValue,
  isPlaceholderTranslation,
  toSafeFallbackText,
  type I18nMessages,
} from '@/i18n/utils'
import { HOME_CORE_SERVICE_OPTIONS } from '@/lib/coreServices'
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
          <p className={styles.heroEyebrow}>
            {translate(
              'landing.heroEyebrow',
              localizedFallback('AI 운명 리딩', 'AI-guided destiny reading')
            )}
          </p>
          <h1 className={styles.heroTitle}>
            {translate(
              'landing.heroTitle',
              localizedFallback(
                '타이밍과 관계, 중요한 결정을 더 선명하게 봅니다.',
                'Clarity for timing, relationships, and your next decision.'
              )
            )}
          </h1>
          <p className={styles.heroSub}>
            {translate(
              'landing.heroSub',
              localizedFallback(
                '질문 하나로 사주, 점성, 타로, 캘린더 해석까지 자연스럽게 이어집니다.',
                'Ask one question and move into Saju, astrology, tarot, or calendar guidance without losing context.'
              )
            )}
          </p>

          <ServiceSearchBox translate={translate} styles={styles} locale={locale as Locale} />

          <div className={styles.quickServiceLinks}>
            {HOME_CORE_SERVICE_OPTIONS.map((service) => (
              <Link key={service.key} href={service.path} className={styles.quickServiceLink}>
                <span aria-hidden>{service.icon}</span>
                <span>{translate(service.labelKey, service.labelFallback[locale as Locale])}</span>
              </Link>
            ))}
          </div>

          <div className={styles.aboutShortcutWrap}>
            <Link href="/about" className={styles.aboutShortcutLink}>
              {translate(
                'landing.aboutShortcut',
                localizedFallback(
                  '스크롤형 상세 소개는 About 페이지에서 확인할 수 있습니다.',
                  'See the full product story on the About page.'
                )
              )}
            </Link>
          </div>
        </div>
      </section>

      <PrefetchLinks />
      <SpeedInsights />
    </main>
  )
}
