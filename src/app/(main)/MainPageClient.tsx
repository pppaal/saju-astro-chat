'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import dynamic from 'next/dynamic'
import { useCallback } from 'react'
import styles from './main-page.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import {
  getPathValue,
  isPlaceholderTranslation,
  toSafeFallbackText,
  type I18nMessages,
} from '@/i18n/utils'
import { useVisitorMetrics } from '@/hooks/useVisitorMetrics'
import { useScrollVisibility, useScrollAnimation } from '@/hooks/useMainPageHooks'

// Critical components - loaded immediately
import {
  MainHeader,
  ServiceSearchBox,
  StatsSection,
  DestinyMapFeature,
  TarotSection,
  CTASection,
  ParticleCanvas,
} from './components'
import { ChatDemoSection } from '@/components/home/ChatDemoSection'
import PrefetchLinks from '@/components/PrefetchLinks'

// Non-critical component - lazy loaded with suspense

const WeeklyFortuneCard = dynamic(() => import('@/components/WeeklyFortuneCard'), {
  loading: () => <div className={styles.weeklyCardSkeleton} />,
})

type Locale = 'en' | 'ko'

interface MainPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
}

export default function MainPageClient({ initialLocale, initialMessages }: MainPageClientProps) {
  const { locale: activeLocale, hydrated, t } = useI18n()
  const locale = activeLocale || initialLocale
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

  const metricsToken = process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN

  // Custom hooks
  useScrollAnimation(`.${styles.featureSection}`, styles)
  const showScrollTop = useScrollVisibility(500)

  // Visitor stats
  const { todayVisitors, totalVisitors, totalMembers, visitorError } =
    useVisitorMetrics(metricsToken)

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <main className={styles.container}>
      <ParticleCanvas />
      <MainHeader translate={translate} locale={locale as Locale} />

      {/* Fullscreen Hero Section */}
      <section className={styles.fullscreenHero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {translate('landing.heroTitle', 'Know yourself. Shape tomorrow.')}
          </h1>
          <p className={styles.heroSub}>
            {translate('landing.heroSub', 'Where destiny, psychology, and spirituality meet')}
          </p>

          {/* Google-style Question Search Box */}
          <ServiceSearchBox translate={translate} styles={styles} />
        </div>

        {/* Scroll Indicator */}
        <div className={styles.scrollIndicator}>
          <span className={styles.scrollText}>
            {translate('landing.scrollDown', 'Scroll to see more')}
          </span>
          <div className={styles.scrollArrow}>
            <span>▼</span>
          </div>
        </div>
      </section>

      {/* Stats Section - Below Hero */}
      <StatsSection
        translate={translate}
        todayVisitors={todayVisitors}
        totalVisitors={totalVisitors}
        totalMembers={totalMembers}
        visitorError={visitorError}
        styles={styles}
      />

      {/* Weekly Fortune Card */}
      <section className={styles.weeklyFortuneSection}>
        <WeeklyFortuneCard />
      </section>

      {/* AI Chat Demo Section */}
      <ChatDemoSection translate={translate} />

      {/* Destiny Map Feature Section */}
      <DestinyMapFeature translate={translate} styles={styles} />

      {/* Tarot Feature Section */}
      <TarotSection translate={translate} locale={locale} />

      {/* CTA Section */}
      <CTASection translate={translate} styles={styles} />

      {/* Scroll to Top Button */}
      <button
        className={`${styles.scrollToTop} ${showScrollTop ? styles.visible : ''}`}
        onClick={scrollToTop}
        aria-label={translate('landing.scrollToTop', 'Back to Top')}
      >
        <span className={styles.scrollToTopIcon}>^</span>
        <span className={styles.scrollToTopText}>
          {translate('landing.scrollToTop', 'Back to Top')}
        </span>
      </button>

      {/* Prefetch critical routes in the background */}
      <PrefetchLinks />

      <SpeedInsights />
    </main>
  )
}
