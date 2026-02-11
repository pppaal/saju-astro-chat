'use client'

import Link from 'next/link'
import { useRef, useEffect } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { SERVICE_OPTIONS, type ServiceKey } from '@/app/(main)/serviceConfig'
import styles from './about.module.css'

type Service = {
  id: ServiceKey
  icon: string
  href: string
  gradient: string
  descriptionKo: string
  descriptionEn: string
}

const SERVICE_DETAILS: Record<ServiceKey, Omit<Service, 'id' | 'icon'>> = {
  destinyMap: {
    href: '/destiny-map',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    descriptionKo: 'AI가 사주와 점성술을 융합하여 당신만의 운명 지도를 그립니다',
    descriptionEn: 'AI-powered fusion of Saju and Astrology to map your destiny',
  },
  calendar: {
    href: '/calendar',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    descriptionKo: '매일의 운세와 중요한 날짜를 한눈에 확인하세요',
    descriptionEn: 'View daily fortunes and important dates at a glance',
  },
  compatibility: {
    href: '/compatibility',
    gradient: 'linear-gradient(135deg, #f7b733 0%, #fc4a1a 100%)',
    descriptionKo: '사랑과 우정, 비즈니스 관계의 궁합을 분석합니다',
    descriptionEn: 'Analyze compatibility in love, friendship, and business',
  },
  destinyMatch: {
    href: '/destiny-match',
    gradient: 'linear-gradient(135deg, #f9a8d4 0%, #c084fc 100%)',
    descriptionKo: '사주와 점성 기반으로 완벽한 인연을 찾아드립니다',
    descriptionEn: 'Find your best match with Saju and Astrology insights',
  },
  icpPersonality: {
    href: '/personality',
    gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    descriptionKo: 'ICP와 성격 분석으로 관계와 성향을 통합 해석합니다',
    descriptionEn: 'Integrated ICP and personality analysis for deeper insights',
  },
  tarot: {
    href: '/tarot',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    descriptionKo: '타로 카드가 현재 상황과 미래를 통찰합니다',
    descriptionEn: 'Tarot cards provide insight into your present and future',
  },
}

const SERVICES: Service[] = SERVICE_OPTIONS.map((service) => ({
  id: service.key,
  icon: service.icon,
  ...SERVICE_DETAILS[service.key],
}))
export default function AboutPage() {
  const { translate, locale } = useI18n()
  const serviceGridRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const serviceCount = SERVICES.length
  const servicesTitle =
    locale === 'ko' ? `${serviceCount}가지 운명 리딩` : `${serviceCount} Destiny Readings`

  useEffect(() => {
    const grid = serviceGridRef.current
    if (!grid) return

    const handleTouchStart = (e: TouchEvent) => {
      isDragging.current = true
      startX.current = e.touches[0].pageX - grid.offsetLeft
      scrollLeft.current = grid.scrollLeft
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return
      e.preventDefault()
      const x = e.touches[0].pageX - grid.offsetLeft
      const walk = (x - startX.current) * 2
      grid.scrollLeft = scrollLeft.current - walk
    }

    const handleTouchEnd = () => {
      isDragging.current = false
    }

    grid.addEventListener('touchstart', handleTouchStart, { passive: true })
    grid.addEventListener('touchmove', handleTouchMove, { passive: false })
    grid.addEventListener('touchend', handleTouchEnd)

    return () => {
      grid.removeEventListener('touchstart', handleTouchStart)
      grid.removeEventListener('touchmove', handleTouchMove)
      grid.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.stars} aria-hidden />
          <h1 className={styles.heroTitle}>
            <span className={styles.heroLine}>
              {translate('about.heroTitle1', 'Diagnose with Fate.')}
            </span>
            <span className={styles.heroLine}>
              {translate('about.heroTitle2', 'Analyze with Psychology.')}
            </span>
            <span className={styles.heroLine}>
              {translate('about.heroTitle3', 'Heal with Spirituality.')}
            </span>
          </h1>
          <p className={styles.heroSub}>
            {translate('about.heroSubtitle', '각 서비스로 다양한 관점에서 당신을 발견하세요')}
          </p>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>
              {translate('about.servicesEyebrow', 'DestinyPal Services')}
            </p>
            <h2 className={styles.sectionTitle}>
              {translate('about.servicesTitle', servicesTitle)}
            </h2>
            <p className={styles.sectionDesc}>
              {translate('about.servicesDesc', '각 서비스로 다양한 관점에서 당신을 발견하세요')}
            </p>
          </div>

          <div ref={serviceGridRef} className={styles.serviceGrid}>
            {SERVICES.map((service) => (
              <Link
                key={service.id}
                href={service.href}
                className={styles.serviceCard}
                style={{ background: service.gradient }}
              >
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  <div className={styles.serviceIcon}>{service.icon}</div>
                  <p className={styles.serviceDesc}>
                    {translate(
                      `services.${service.id}.desc`,
                      locale === 'ko' ? service.descriptionKo : service.descriptionEn
                    )}
                  </p>
                  <span className={styles.serviceArrow}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.philosophy}>
          <h2 className={styles.philosophyTitle}>
            {translate('about.philosophyTitle', 'Our Philosophy')}
          </h2>
          <div className={styles.philosophyGrid}>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>🎯</div>
              <h3>{translate('about.philosophy.accurate.title', 'Accurate Calculation')}</h3>
              <p>
                {translate(
                  'about.philosophy.accurate.desc',
                  'Reliable calculations reflecting time zones, seasons, and DST'
                )}
              </p>
            </div>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>🤝</div>
              <h3>{translate('about.philosophy.ethical.title', 'Ethical Guidance')}</h3>
              <p>
                {translate(
                  'about.philosophy.ethical.desc',
                  'Practical hints to help choices, not absolute predictions'
                )}
              </p>
            </div>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>✨</div>
              <h3>{translate('about.philosophy.ui.title', 'Intuitive UI')}</h3>
              <p>
                {translate(
                  'about.philosophy.ui.desc',
                  'Beautiful interface that makes complex information easy'
                )}
              </p>
            </div>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>🤖</div>
              <h3>{translate('about.philosophy.ai.title', 'AI Integration')}</h3>
              <p>
                {translate(
                  'about.philosophy.ai.desc',
                  'AI-powered integration of multiple divination systems'
                )}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>{translate('about.ctaTitle', 'Start Now')}</h2>
          <p className={styles.ctaSub}>
            {translate('about.ctaSub', 'Explore your destiny map with AI')}
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/destiny-map" className={styles.ctaPrimary}>
              {translate('about.ctaPrimary', 'Start Destiny Map')}
            </Link>
            <Link href="/" className={styles.ctaSecondary}>
              {translate('about.ctaSecondary', 'Go Home')}
            </Link>
          </div>
        </section>
      </main>
      <ScrollToTop label={translate('common.scrollToTop', 'Top')} />
    </div>
  )
}
