'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { SERVICE_OPTIONS, type ServiceKey } from '@/app/(main)/serviceConfig'
import styles from './about.module.css'

type ServiceCard = {
  id: ServiceKey
  icon: string
  href: string
  nameKo: string
  nameEn: string
  descriptionKo: string
  descriptionEn: string
}

type StoryScene = {
  step: string
  titleKo: string
  titleEn: string
  bodyKo: string
  bodyEn: string
}

const SERVICE_DETAILS: Partial<
  Record<
    ServiceKey,
    {
      href: string
      nameKo: string
      nameEn: string
      descriptionKo: string
      descriptionEn: string
    }
  >
> = {
  destinyMap: {
    href: '/destiny-counselor',
    nameKo: '운명 상담사',
    nameEn: 'Destiny Counselor',
    descriptionKo: '질문을 입력하면 바로 상담형 해석을 시작합니다.',
    descriptionEn: 'Start immediate chat-based counseling with your question.',
  },
  tarot: {
    href: '/tarot',
    nameKo: '타로',
    nameEn: 'Tarot',
    descriptionKo: '스프레드 기반으로 현재 상황과 선택지를 읽습니다.',
    descriptionEn: 'Read current context and options through spread-based tarot.',
  },
  report: {
    href: '/premium-reports',
    nameKo: '리포트',
    nameEn: 'Report',
    descriptionKo: '무료 요약과 프리미엄 테마 리포트를 제공합니다.',
    descriptionEn: 'Provides free digest and premium themed reports.',
  },
  calendar: {
    href: '/calendar',
    nameKo: '캘린더',
    nameEn: 'Calendar',
    descriptionKo: '날짜별 타이밍과 행동 플랜을 확인할 수 있습니다.',
    descriptionEn: 'Check date-level timing and practical action plans.',
  },
}

const STORY_SCENES: readonly StoryScene[] = [
  {
    step: 'SCENE 01',
    titleKo: '질문을 수집하고 계산 가능한 형태로 정규화',
    titleEn: 'Normalize user questions into computable inputs',
    bodyKo:
      '생년월일·시간·도시·성별 같은 프로필 입력과 현재 질문을 함께 받아, 계산 엔진이 일관되게 처리할 수 있는 입력으로 변환합니다.',
    bodyEn:
      'We combine profile inputs and live questions, then normalize them into stable inputs for deterministic computation.',
  },
  {
    step: 'SCENE 02',
    titleKo: '사주·점성 계산을 Destiny Matrix로 교차',
    titleEn: 'Cross Saju and astrology in Destiny Matrix',
    bodyKo:
      '단일 체계 해석이 아니라, 다층 신호를 매트릭스에서 교차해 강점·주의·균형 신호를 뽑고 패턴/시나리오/전략으로 연결합니다.',
    bodyEn:
      'Instead of one-system interpretation, we cross multi-layer signals in matrix and derive strength/caution/balance into pattern/scenario/strategy.',
  },
  {
    step: 'SCENE 03',
    titleKo: '서비스별 출력으로 변환',
    titleEn: 'Adapt outputs per service',
    bodyKo:
      '같은 코어 판단을 채팅·캘린더·리포트 화면에 맞게 재표현합니다. 핵심 claim과 리스크 가드는 서비스별로 일관되게 유지됩니다.',
    bodyEn:
      'The same core judgment is adapted for chat, calendar, and report surfaces while preserving claim and risk-control consistency.',
  },
]

const ENGINE_FLOW = [
  'Birth Input',
  'Cosmic Engine',
  'Destiny Matrix',
  'Signal Synthesizer',
  'Pattern Engine',
  'Scenario Engine',
  'Strategy Engine',
  'Calendar / Report / Counselor',
] as const

export default function AboutPage() {
  const { translate, locale } = useI18n()
  const isKo = locale === 'ko'

  const services = useMemo<ServiceCard[]>(() => {
    return SERVICE_OPTIONS.map((service) => {
      const detail = SERVICE_DETAILS[service.key]
      return {
        id: service.key,
        icon: service.icon,
        href: detail?.href || service.path,
        nameKo: detail?.nameKo || '서비스',
        nameEn: detail?.nameEn || 'Service',
        descriptionKo: detail?.descriptionKo || '핵심 운명 기능을 제공합니다.',
        descriptionEn: detail?.descriptionEn || 'Provides a core destiny feature.',
      }
    })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.badge}>About DestinyPal</p>
          <h1 className={styles.title}>
            {translate(
              'about.heroTitle',
              isKo
                ? '운명을 추측하지 않습니다. 계산합니다.'
                : 'We do not guess destiny. We compute it.'
            )}
          </h1>
          <p className={styles.subtitle}>
            {translate(
              'about.heroSubtitle',
              isKo
                ? 'DestinyPal은 사주·점성 계산과 매트릭스 해석을 결합해, 상담·캘린더·리포트로 바로 연결되는 실행형 운명 서비스를 만듭니다.'
                : 'DestinyPal combines Saju and astrology computation with matrix interpretation, then turns it into actionable counseling, calendar, and reports.'
            )}
          </p>
          <div className={styles.heroActions}>
            <Link href="/destiny-counselor" className={styles.primaryBtn}>
              {translate('about.ctaPrimary', isKo ? '상담 시작' : 'Start Counseling')}
            </Link>
            <Link href="/premium-reports" className={styles.ghostBtn}>
              {translate('about.ctaSecondary', isKo ? '리포트 보기' : 'View Reports')}
            </Link>
          </div>
        </section>

        <section className={styles.metricsGrid} aria-label="platform stats">
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>{isKo ? '코어 계산 구조' : 'Core Computation'}</p>
            <p className={styles.metricValue}>10 Layers</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>{isKo ? '서비스 출력' : 'Service Outputs'}</p>
            <p className={styles.metricValue}>4 Products</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>{isKo ? '판단 원칙' : 'Judgment Rule'}</p>
            <p className={styles.metricValue}>
              {isKo ? 'Deterministic Core' : 'Deterministic Core'}
            </p>
          </article>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>Origin & Method</p>
            <h2 className={styles.sectionTitle}>
              {translate(
                'about.storyTitle',
                isKo ? '질문이 리포트가 되는 과정' : 'How a question becomes a report'
              )}
            </h2>
            <p className={styles.sectionDesc}>
              {translate(
                'about.storyDesc',
                isKo
                  ? '입력부터 계산, 전략, 출력까지 단계별 파이프라인을 고정해 서비스별 품질 편차를 줄였습니다.'
                  : 'From input to computation, strategy, and output, we keep a fixed pipeline to reduce quality drift across products.'
              )}
            </p>
          </header>
          <div className={styles.storyGrid}>
            {STORY_SCENES.map((scene) => (
              <article key={scene.step} className={styles.storyCard}>
                <p className={styles.storyStep}>{scene.step}</p>
                <h3 className={styles.storyHeading}>{isKo ? scene.titleKo : scene.titleEn}</h3>
                <p className={styles.storyText}>{isKo ? scene.bodyKo : scene.bodyEn}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>Products</p>
            <h2 className={styles.sectionTitle}>
              {translate(
                'about.servicesTitle',
                isKo ? '바로 사용할 수 있는 핵심 서비스' : 'Core services you can use immediately'
              )}
            </h2>
          </header>
          <div className={styles.servicesGrid}>
            {services.map((service) => (
              <article key={service.id} className={styles.serviceCard}>
                <div className={styles.serviceIcon}>{service.icon}</div>
                <h3 className={styles.serviceName}>{isKo ? service.nameKo : service.nameEn}</h3>
                <p className={styles.serviceText}>
                  {isKo ? service.descriptionKo : service.descriptionEn}
                </p>
                <Link href={service.href} className={styles.serviceLink}>
                  {isKo ? '서비스 열기' : 'Open service'}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>Engine Architecture</p>
            <h2 className={styles.sectionTitle}>
              {translate(
                'about.engineTitle',
                isKo
                  ? '질문 하나가 통과하는 계산 체인'
                  : 'Computation chain behind a single question'
              )}
            </h2>
          </header>
          <div className={styles.engineFlow}>
            {ENGINE_FLOW.map((step, idx) => (
              <div key={step} className={styles.flowStep}>
                <span>{step}</span>
                {idx < ENGINE_FLOW.length - 1 ? <span className={styles.flowArrow}>→</span> : null}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>Quality Standard</p>
            <h2 className={styles.sectionTitle}>
              {translate(
                'about.qualityTitle',
                isKo
                  ? '왜 계산 기반 접근을 고집하는가'
                  : 'Why we insist on a computation-first approach'
              )}
            </h2>
          </header>
          <div className={styles.compareGrid}>
            <article className={styles.compareCard}>
              <h3 className={styles.compareTitle}>
                {isKo ? '일반 생성형 운세의 한계' : 'Limits of generic AI fortune text'}
              </h3>
              <ul className={styles.compareList}>
                <li className={styles.compareItem}>
                  {isKo
                    ? '입력이 달라도 비슷한 문장 반복'
                    : 'Similar sentences repeated across different users'}
                </li>
                <li className={styles.compareItem}>
                  {isKo
                    ? '근거 추적이 어려운 단정 표현'
                    : 'Hard-to-trace assertions without evidence links'}
                </li>
                <li className={styles.compareItem}>
                  {isKo
                    ? '서비스 간 결론 불일치'
                    : 'Inconsistent conclusions across service surfaces'}
                </li>
              </ul>
            </article>
            <article className={styles.compareCard}>
              <h3 className={styles.compareTitle}>
                {isKo ? 'DestinyPal 기준' : 'DestinyPal standard'}
              </h3>
              <ul className={styles.compareList}>
                <li className={styles.compareItem}>
                  {isKo
                    ? '같은 입력은 같은 코어 판단으로 고정'
                    : 'Same input yields same core judgment'}
                </li>
                <li className={styles.compareItem}>
                  {isKo
                    ? '신호·패턴·전략 근거를 단계별로 유지'
                    : 'Signal, pattern, and strategy evidence kept end-to-end'}
                </li>
                <li className={styles.compareItem}>
                  {isKo
                    ? '상담/캘린더/리포트 일관성 검증'
                    : 'Consistency checks across counselor/calendar/report'}
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>Principles</p>
            <h2 className={styles.sectionTitle}>
              {translate('about.philosophyTitle', isKo ? '운영 원칙' : 'Operating principles')}
            </h2>
          </header>
          <div className={styles.principlesGrid}>
            <article className={styles.principleCard}>
              <div className={styles.principleIcon}>🎯</div>
              <h3 className={styles.principleTitle}>
                {translate('about.philosophy.accurate.title', 'Accurate Calculation')}
              </h3>
              <p className={styles.principleText}>
                {translate(
                  'about.philosophy.accurate.desc',
                  'Reliable calculations reflecting time zones, seasons, and DST'
                )}
              </p>
            </article>
            <article className={styles.principleCard}>
              <div className={styles.principleIcon}>🤝</div>
              <h3 className={styles.principleTitle}>
                {translate('about.philosophy.ethical.title', 'Ethical Guidance')}
              </h3>
              <p className={styles.principleText}>
                {translate(
                  'about.philosophy.ethical.desc',
                  'Practical hints to help choices, not absolute predictions'
                )}
              </p>
            </article>
            <article className={styles.principleCard}>
              <div className={styles.principleIcon}>🔬</div>
              <h3 className={styles.principleTitle}>
                {isKo ? '근거 추적 가능성' : 'Evidence Traceability'}
              </h3>
              <p className={styles.principleText}>
                {isKo
                  ? '리포트 문장을 코어 신호와 연결해 디버깅 가능한 구조를 유지합니다.'
                  : 'Report sentences remain linked to core signals for debugging and QA.'}
              </p>
            </article>
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>{isKo ? '지금 바로 시작해보세요' : 'Start now'}</h2>
          <p className={styles.ctaText}>
            {isKo
              ? '질문 하나로 상담을 시작하고, 필요하면 캘린더와 리포트로 깊게 들어가세요.'
              : 'Start with one question, then go deeper with calendar and reports.'}
          </p>
          <div className={styles.ctaActions}>
            <Link href="/destiny-counselor" className={styles.primaryBtn}>
              {isKo ? '운명 상담 시작' : 'Start counselor'}
            </Link>
            <Link href="/premium-reports" className={styles.ghostBtn}>
              {isKo ? '프리미엄 리포트' : 'Premium reports'}
            </Link>
          </div>
        </section>
      </main>

      <ScrollToTop label={translate('common.scrollToTop', 'Top')} />
    </div>
  )
}
