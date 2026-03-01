'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
  ParticleCanvas,
  TarotSection,
} from './components'
import PrefetchLinks from '@/components/PrefetchLinks'

// Non-critical component - lazy loaded with suspense
const WeeklyFortuneCard = dynamic(() => import('@/components/WeeklyFortuneCard'), {
  loading: () => <div className={styles.weeklyCardSkeleton} />,
  ssr: false,
})

const ChatDemoSection = dynamic(
  () => import('@/components/home/ChatDemoSection').then((module) => module.ChatDemoSection),
  {
    loading: () => <div className={styles.featureSectionSkeleton} />,
    ssr: false,
  }
)

const DestinyMapFeature = dynamic(() => import('./components/DestinyMapFeature'), {
  loading: () => <div className={styles.featureSectionSkeleton} />,
  ssr: false,
})

const CTASection = dynamic(() => import('./components/CTASection'), {
  loading: () => <div className={styles.featureSectionSkeleton} />,
  ssr: false,
})

type Locale = 'en' | 'ko'

interface MainPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
}

function DeferredSection({
  children,
  className,
  skeletonClassName,
  minHeight = 320,
  rootMargin = '360px 0px',
}: {
  children: ReactNode
  className?: string
  skeletonClassName: string
  minHeight?: number
  rootMargin?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (!containerRef.current || shouldRender) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldRender(true)
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin, threshold: 0.01 }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [rootMargin, shouldRender])

  return (
    <div ref={containerRef} className={className}>
      {shouldRender ? children : <div className={skeletonClassName} style={{ minHeight }} />}
    </div>
  )
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
            {translate(
              'landing.heroSub',
              "A single report that connects Saju, astrology, and personality into today's action plan"
            )}
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

      <DeferredSection
        className={styles.weeklyFortuneSection}
        skeletonClassName={styles.weeklyCardSkeleton}
        minHeight={220}
      >
        <WeeklyFortuneCard />
      </DeferredSection>

      <DeferredSection skeletonClassName={styles.featureSectionSkeleton}>
        <ChatDemoSection translate={translate} />
      </DeferredSection>

      <DeferredSection skeletonClassName={styles.featureSectionSkeleton}>
        <DestinyMapFeature translate={translate} styles={styles} />
      </DeferredSection>

      <TarotSection translate={translate} locale={locale} />

      <DeferredSection skeletonClassName={styles.featureSectionSkeleton} minHeight={240}>
        <CTASection translate={translate} styles={styles} />
      </DeferredSection>

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
