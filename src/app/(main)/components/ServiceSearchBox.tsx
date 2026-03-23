'use client'

import Link from 'next/link'
import { HOME_CORE_SERVICE_OPTIONS } from '@/lib/coreServices'

type CSSModule = Record<string, string>
type Locale = 'en' | 'ko'
type ServiceTone = 'Cyan' | 'Violet' | 'Rose' | 'Indigo'

interface ServiceSearchBoxProps {
  translate: (key: string, fallback: string) => string
  styles: CSSModule
  locale: Locale
}

type HeroServiceCard = {
  key: string
  path: string
  icon: string
  title: string
  description: string
  tone: ServiceTone
}

export default function ServiceSearchBox({ translate, styles, locale }: ServiceSearchBoxProps) {
  const localizedFallback = (ko: string, en: string) => (locale === 'ko' ? ko : en)

  const primaryService = HOME_CORE_SERVICE_OPTIONS[0]

  const services: HeroServiceCard[] = [
    {
      key: 'destinyMap',
      path: '/destiny-counselor',
      icon: '💬',
      title: translate(
        'landing.heroServiceCounselorTitle',
        localizedFallback('AI 운세 상담', 'AI Fortune Guidance')
      ),
      description: translate(
        'landing.heroServiceCounselorDescription',
        localizedFallback(
          '지금 상황을 정리하고 갈림길에서 방향을 잡아드립니다.',
          'Organize the situation and get clear direction at a crossroads.'
        )
      ),
      tone: 'Cyan',
    },
    {
      key: 'tarot',
      path: '/tarot',
      icon: '🔮',
      title: translate(
        'landing.heroServiceTarotTitle',
        localizedFallback('타로 리딩', 'Tarot Reading')
      ),
      description: translate(
        'landing.heroServiceTarotDescription',
        localizedFallback(
          '상대 마음과 관계 흐름을 직관적으로 보여드립니다.',
          'See relationship dynamics and emotional momentum in a direct way.'
        )
      ),
      tone: 'Violet',
    },
    {
      key: 'report',
      path: '/report',
      icon: '✨',
      title: translate(
        'landing.heroServiceReportTitle',
        localizedFallback('정밀 운세 리포트', 'Detailed Fortune Report')
      ),
      description: translate(
        'landing.heroServiceReportDescription',
        localizedFallback(
          '사주와 점성 기반으로 당신의 흐름과 패턴을 분석합니다.',
          'Analyze your patterns and longer-term flow with Saju and astrology.'
        )
      ),
      tone: 'Rose',
    },
    {
      key: 'calendar',
      path: '/calendar',
      icon: '📅',
      title: translate(
        'landing.heroServiceCalendarTitle',
        localizedFallback('운세 캘린더', 'Fortune Calendar')
      ),
      description: translate(
        'landing.heroServiceCalendarDescription',
        localizedFallback(
          '언제 움직여야 하는지 좋은 날과 주의할 시점을 확인합니다.',
          'Check favorable dates and caution windows before you move.'
        )
      ),
      tone: 'Indigo',
    },
  ]

  const flowSteps = [
    translate('landing.heroFlowStep1', localizedFallback('흐름', 'Flow')),
    translate('landing.heroFlowStep2', localizedFallback('타이밍', 'Timing')),
    translate('landing.heroFlowStep3', localizedFallback('선택', 'Choice')),
  ]

  return (
    <div className={styles.heroUtilityStack}>
      <div className={styles.heroActionRow}>
        <Link href={primaryService.path} className={styles.heroPrimaryButton}>
          <span>
            {translate(
              'landing.heroPrimaryCta',
              localizedFallback('무료로 시작하기', 'Start for Free')
            )}
          </span>
          <span aria-hidden className={styles.heroButtonArrow}>
            →
          </span>
        </Link>
        <Link href="#main-services" className={styles.heroSecondaryButton}>
          {translate('landing.heroSecondaryCta', localizedFallback('흐름 보기', 'View the Paths'))}
        </Link>
      </div>

      <div className={styles.heroFlowRow} aria-label={localizedFallback('핵심 흐름', 'Core flow')}>
        {flowSteps.map((step, index) => (
          <div key={step} className={styles.heroFlowItem}>
            <span className={styles.heroFlowStep}>{step}</span>
            {index < flowSteps.length - 1 ? (
              <span className={styles.heroFlowArrow} aria-hidden>
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div id="main-services" className={styles.heroServiceGrid}>
        {services.map((service) => (
          <Link
            key={service.key}
            href={service.path}
            className={[styles.heroServiceCard, styles[`heroServiceCard${service.tone}`]].join(' ')}
          >
            <div className={styles.heroServiceGlow} aria-hidden />
            <div className={styles.heroServiceSymbolWrap}>
              <span className={styles.heroServiceSymbol} aria-hidden>
                {service.icon}
              </span>
            </div>
            <div className={styles.heroServiceBody}>
              <h2 className={styles.heroServiceLabel}>{service.title}</h2>
              <p className={styles.heroServiceDescription}>{service.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
