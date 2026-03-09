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
  summaryKo: string
  summaryEn: string
}

type ProcessStep = {
  id: string
  titleKo: string
  titleEn: string
  descKo: string
  descEn: string
}

const SERVICE_DETAILS: Partial<
  Record<
    ServiceKey,
    {
      href: string
      nameKo: string
      nameEn: string
      summaryKo: string
      summaryEn: string
    }
  >
> = {
  destinyMap: {
    href: '/destiny-counselor',
    nameKo: '운명 상담사',
    nameEn: 'Destiny Counselor',
    summaryKo: '질문을 입력하면 계산 근거 기반 상담 답변을 제공합니다.',
    summaryEn: 'Provides evidence-backed counseling answers from your input.',
  },
  tarot: {
    href: '/tarot',
    nameKo: '타로',
    nameEn: 'Tarot',
    summaryKo: '스프레드 기준으로 현재 상황과 선택지를 정리합니다.',
    summaryEn: 'Organizes your current context and options by spread.',
  },
  report: {
    href: '/premium-reports',
    nameKo: '리포트',
    nameEn: 'Report',
    summaryKo: '무료 요약과 프리미엄 리포트로 깊이 있는 해석을 제공합니다.',
    summaryEn: 'Offers free digest and premium reports for deeper interpretation.',
  },
  calendar: {
    href: '/calendar',
    nameKo: '캘린더',
    nameEn: 'Calendar',
    summaryKo: '날짜별 기회/주의 구간과 행동 플랜을 확인할 수 있습니다.',
    summaryEn: 'Shows date-level windows and practical action plans.',
  },
}

const PROCESS_STEPS: readonly ProcessStep[] = [
  {
    id: '01',
    titleKo: '입력 정규화',
    titleEn: 'Input normalization',
    descKo: '생년월일, 시간, 도시, 성별, 질문을 표준 입력으로 정리해 계산 오차를 줄입니다.',
    descEn:
      'Birth/profile/question fields are normalized into a standard input to reduce variance.',
  },
  {
    id: '02',
    titleKo: '사주·점성 계산',
    titleEn: 'Saju & astrology computation',
    descKo: '기본 정보와 고급 정보를 함께 계산해 다층 신호를 생성합니다.',
    descEn: 'Core and advanced calculations produce multi-layer signals.',
  },
  {
    id: '03',
    titleKo: 'Matrix 교차 해석',
    titleEn: 'Matrix cross-interpretation',
    descKo: '신호를 강점·주의·균형으로 분류하고 패턴/시나리오/전략으로 연결합니다.',
    descEn:
      'Signals are classified into strength/caution/balance and linked to pattern/scenario/strategy.',
  },
  {
    id: '04',
    titleKo: '서비스별 출력',
    titleEn: 'Service adaptation',
    descKo: '동일한 코어 판단을 상담/캘린더/리포트 화면에 맞게 출력합니다.',
    descEn: 'The same core judgment is adapted to counselor/calendar/report outputs.',
  },
]

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
        summaryKo: detail?.summaryKo || '핵심 운명 서비스를 제공합니다.',
        summaryEn: detail?.summaryEn || 'Provides a core destiny service.',
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
          <p className={styles.eyebrow}>ABOUT</p>
          <h1 className={styles.title}>{isKo ? 'DestinyPal 소개' : 'About DestinyPal'}</h1>
          <p className={styles.subtitle}>
            {isKo
              ? 'DestinyPal은 사주·점성 계산 결과를 상담, 캘린더, 리포트로 전달하는 운명 서비스입니다. 과장된 문장보다 계산 근거와 일관성을 우선합니다.'
              : 'DestinyPal delivers Saju/Astrology computation into counselor, calendar, and report products. We prioritize evidence and consistency over hype.'}
          </p>
          <div className={styles.heroActions}>
            <Link href="/destiny-counselor" className={styles.primaryBtn}>
              {isKo ? '상담 시작' : 'Start counselor'}
            </Link>
            <Link href="/premium-reports" className={styles.secondaryBtn}>
              {isKo ? '리포트 보기' : 'View reports'}
            </Link>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{isKo ? '핵심 서비스' : 'Core services'}</h2>
            <p className={styles.sectionDesc}>
              {isKo
                ? '현재 메인에서 바로 사용할 수 있는 4개 서비스입니다.'
                : 'These are the four services available immediately from the main page.'}
            </p>
          </header>
          <div className={styles.serviceGrid}>
            {services.map((service) => (
              <article key={service.id} className={styles.serviceCard}>
                <div className={styles.serviceHead}>
                  <span className={styles.serviceIcon}>{service.icon}</span>
                  <h3 className={styles.serviceName}>{isKo ? service.nameKo : service.nameEn}</h3>
                </div>
                <p className={styles.serviceSummary}>
                  {isKo ? service.summaryKo : service.summaryEn}
                </p>
                <Link href={service.href} className={styles.serviceLink}>
                  {isKo ? '열기' : 'Open'}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{isKo ? '작동 방식' : 'How it works'}</h2>
            <p className={styles.sectionDesc}>
              {isKo
                ? '입력부터 결과까지 같은 파이프라인을 사용해 서비스 간 결론 차이를 줄입니다.'
                : 'A single pipeline is used from input to output to reduce cross-service drift.'}
            </p>
          </header>
          <div className={styles.processGrid}>
            {PROCESS_STEPS.map((step) => (
              <article key={step.id} className={styles.processCard}>
                <p className={styles.processId}>{step.id}</p>
                <h3 className={styles.processTitle}>{isKo ? step.titleKo : step.titleEn}</h3>
                <p className={styles.processDesc}>{isKo ? step.descKo : step.descEn}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{isKo ? '품질 기준' : 'Quality standard'}</h2>
          </header>
          <div className={styles.qualityBox}>
            <p>
              {isKo
                ? '1. 같은 입력은 같은 코어 판단으로 처리합니다.'
                : '1. Same input goes through the same core judgment.'}
            </p>
            <p>
              {isKo
                ? '2. 신호·패턴·전략 근거를 끊지 않고 유지합니다.'
                : '2. Signal, pattern, and strategy evidence remain connected.'}
            </p>
            <p>
              {isKo
                ? '3. 상담/캘린더/리포트의 결론 일관성을 검사합니다.'
                : '3. Cross-service consistency is checked for counselor/calendar/report.'}
            </p>
            <p>
              {isKo
                ? '4. 근거 없는 단정 문장은 차단합니다.'
                : '4. Unsupported assertions are blocked.'}
            </p>
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>{isKo ? '바로 사용해보세요' : 'Use it now'}</h2>
          <p className={styles.ctaText}>
            {isKo
              ? '질문을 입력해 상담을 시작하고, 필요할 때 캘린더와 리포트로 확장하세요.'
              : 'Start from a question, then expand with calendar and reports.'}
          </p>
          <div className={styles.heroActions}>
            <Link href="/destiny-counselor" className={styles.primaryBtn}>
              {isKo ? '운명 상담 시작' : 'Start counseling'}
            </Link>
            <Link href="/calendar" className={styles.secondaryBtn}>
              {isKo ? '캘린더 열기' : 'Open calendar'}
            </Link>
          </div>
        </section>
      </main>

      <ScrollToTop label={translate('common.scrollToTop', 'Top')} />
    </div>
  )
}
