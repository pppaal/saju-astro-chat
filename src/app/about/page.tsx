'use client'

import Link from 'next/link'
import { useRef, useEffect } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import ScrollToTop from '@/components/ui/ScrollToTop'
import styles from './about.module.css'

type Service = {
  id: string
  icon: string
  href: string
  gradient: string
  descriptionKo: string
  descriptionEn: string
}

const SERVICES: Service[] = [
  {
    id: 'destinyMap',
    icon: '🗺️',
    href: '/destiny-map',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    descriptionKo: 'AI가 사주와 점성술을 융합하여 당신만의 운명 지도를 그립니다',
    descriptionEn: 'AI-powered fusion of Saju and Astrology to map your destiny',
  },
  {
    id: 'aiReports',
    icon: '🤖',
    href: '/premium-reports',
    gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    descriptionKo: '심층 분석 리포트로 삶의 중요한 결정을 도와드립니다',
    descriptionEn: "In-depth analysis reports for life's important decisions",
  },
  {
    id: 'lifePrediction',
    icon: '📈',
    href: '/life-prediction',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
    descriptionKo: '인생의 흐름과 전환점을 예측하고 대비하세요',
    descriptionEn: "Predict and prepare for life's flow and turning points",
  },
  {
    id: 'tarot',
    icon: '🔮',
    href: '/tarot',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    descriptionKo: '타로 카드가 현재 상황과 미래를 통찰합니다',
    descriptionEn: 'Tarot cards provide insight into your present and future',
  },
  {
    id: 'calendar',
    icon: '🗓️',
    href: '/calendar',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    descriptionKo: '매일의 운세와 중요한 날짜를 한눈에 확인하세요',
    descriptionEn: 'View daily fortunes and important dates at a glance',
  },
  {
    id: 'dream',
    icon: '🌙',
    href: '/dream',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    descriptionKo: '꿈이 전하는 메시지를 AI가 해석해드립니다',
    descriptionEn: 'AI interprets the messages your dreams convey',
  },
  {
    id: 'personality',
    icon: '🌈',
    href: '/personality',
    gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    descriptionKo: '성격 유형을 분석하여 자신을 더 깊이 이해하세요',
    descriptionEn: 'Analyze your personality type for deeper self-understanding',
  },
  {
    id: 'icp',
    icon: '🎭',
    href: '/icp',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    descriptionKo: '대인관계 스타일을 파악하여 소통을 개선하세요',
    descriptionEn: 'Understand your interpersonal style to improve communication',
  },
  {
    id: 'numerology',
    icon: '🔢',
    href: '/numerology',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    descriptionKo: '숫자에 담긴 운명의 비밀을 밝혀냅니다',
    descriptionEn: 'Reveal the secrets of destiny hidden in numbers',
  },
  {
    id: 'astrology',
    icon: '✨',
    href: '/astrology',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    descriptionKo: '별자리와 행성이 당신에게 미치는 영향을 분석합니다',
    descriptionEn: 'Analyze how zodiac signs and planets influence you',
  },
  {
    id: 'saju',
    icon: '☯️',
    href: '/saju',
    gradient: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
    descriptionKo: '사주팔자로 타고난 운명과 적성을 알아보세요',
    descriptionEn: 'Discover your innate destiny and aptitude through Saju',
  },
  {
    id: 'compatibility',
    icon: '💕',
    href: '/compatibility',
    gradient: 'linear-gradient(135deg, #f7b733 0%, #fc4a1a 100%)',
    descriptionKo: '사랑과 우정, 비즈니스 관계의 궁합을 분석합니다',
    descriptionEn: 'Analyze compatibility in love, friendship, and business',
  },
  {
    id: 'pastLife',
    icon: '🔄',
    href: '/past-life',
    gradient: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    descriptionKo: '전생의 흔적이 현재에 미치는 영향을 탐색합니다',
    descriptionEn: 'Explore how past life traces influence your present',
  },
  {
    id: 'iching',
    icon: '📜',
    href: '/iching',
    gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    descriptionKo: '역경의 지혜로 현재 상황에 대한 조언을 얻으세요',
    descriptionEn: 'Gain advice on your current situation through I Ching wisdom',
  },
]

export default function AboutPage() {
  const { translate, locale } = useI18n()
  const serviceGridRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

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
            {translate('about.heroSubtitle', 'Fate speaks. AI listens. You decide.')}
          </p>
          <p className={styles.tagline}>
            {translate('about.tagline', 'Understand your patterns. Change your outcomes.')}
          </p>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>
              {translate('about.servicesEyebrow', 'DestinyPal Services')}
            </p>
            <h2 className={styles.sectionTitle}>
              {translate('about.servicesTitle', '14 Destiny Readings')}
            </h2>
            <p className={styles.sectionDesc}>
              {translate(
                'about.servicesDesc',
                'Explore your destiny from multiple perspectives with each unique service'
              )}
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
