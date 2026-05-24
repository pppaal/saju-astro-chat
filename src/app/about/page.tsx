'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
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
    href: '/destiny-map/result',
    nameKo: '리포트',
    nameEn: 'Report',
    summaryKo: '인생 5단계 × 6 테마로 풀어내는 통합 리포트.',
    summaryEn: 'Offers free digest and premium reports for deeper interpretation.',
  },
  calendar: {
    href: '/calendar',
    nameKo: '캘린더',
    nameEn: 'Calendar',
    summaryKo: '날짜별 기회/주의 구간과 행동 플랜을 확인할 수 있습니다.',
    summaryEn: 'Shows date-level windows and practical action plans.',
  },
  compatibility: {
    href: '/compatibility',
    nameKo: '궁합 상담사',
    nameEn: 'Compatibility Counselor',
    summaryKo: '두 사람의 사주·점성을 교차해 관계의 결과 호흡을 분석합니다.',
    summaryEn: 'Cross-reads two charts to analyze relationship dynamics and fit.',
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
      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <span className={styles.heroRing} aria-hidden />
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>ABOUT · DESTINYPAL</p>
            <h1 className={styles.title}>
              {isKo ? (
                <>
                  고대의 우주 지혜를
                  <br />
                  현대의 삶으로.
                </>
              ) : (
                <>
                  Bridging ancient cosmic wisdom
                  <br />
                  with modern life.
                </>
              )}
            </h1>
            <p className={styles.subtitle}>
              {isKo
                ? '서양 점성술의 별과 동양 사주의 오행을 하나로 이어, 당신의 진짜 길을 해독합니다.'
                : 'Guiding you through the stars of Western astrology and the elemental forces of Eastern Saju to decode your true path.'}
            </p>
            <div className={styles.heroActions}>
              <Link href="/destiny-counselor" className={styles.primaryBtn}>
                {isKo ? '무료로 내 차트 보기' : 'Get your free chart'}
              </Link>
              <Link href="/destiny-map/result" className={styles.secondaryBtn}>
                {isKo ? '리포트 보기' : 'View reports'}
              </Link>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className={styles.mission}>
          <div className={styles.missionVisual} aria-hidden>
            <span className={styles.orbCore} />
            <span className={styles.orbRing} />
            <span className={styles.orbRingAlt} />
          </div>
          <div className={styles.missionText}>
            <h2 className={`${styles.sectionTitle} ${styles.neonText}`}>
              {isKo ? '우리의 사명' : 'Our Mission'}
            </h2>
            <p className={styles.missionBody}>
              {isKo
                ? 'DestinyPal은 동양의 사주와 서양의 점성술을 하나의 계산 엔진으로 통합해, 과장 없이 근거에 기반한 삶의 지도를 제시합니다. 우리는 화려한 단정 대신 일관성과 계산 근거를 우선하며, 상담·캘린더·리포트 어디서나 같은 결론을 유지합니다. 그렇게 당신이 자기 자신과 조화를 이루며 더 나은 선택을 하도록 돕는 것이 우리의 목표입니다.'
                : 'DestinyPal unifies Eastern Saju and Western astrology into a single computation engine, offering an evidence-based map for your journey — without the hype. We prioritize consistency and calculation over flashy claims, keeping the same conclusions across counselor, calendar, and report, so you can make informed decisions and live in harmony with your cosmic self.'}
            </p>
          </div>
        </section>

        {/* Synergy of East & West */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {isKo ? (
                <>
                  <span className={styles.accentEast}>동양</span>과{' '}
                  <span className={styles.accentWest}>서양</span>의 시너지
                </>
              ) : (
                <>
                  The synergy of <span className={styles.accentEast}>East</span> &amp;{' '}
                  <span className={styles.accentWest}>West</span>
                </>
              )}
            </h2>
            <p className={styles.sectionDesc}>
              {isKo
                ? '두 전통을 함께 읽을 때, 내면의 심리와 인생의 시기가 입체적으로 드러납니다.'
                : 'Read together, the two traditions reveal both your inner psyche and the timing of your life.'}
            </p>
          </header>
          <div className={styles.synergyGrid}>
            <article className={`${styles.synergyCard} ${styles.synergyWest}`}>
              <div className={styles.synergyIcon} aria-hidden>
                ✨
              </div>
              <h3 className={styles.synergyTitle}>
                {isKo ? '서양 점성술' : 'Western Astrology'}
              </h3>
              <p className={styles.synergyDesc}>
                {isKo
                  ? '출생 시점 행성·하우스·각도의 배치로 심리 원형과 성향, 내면의 동기를 읽습니다. 자기 이해와 관계의 결을 깊게 합니다.'
                  : 'From the placement of planets, houses, and aspects at birth, it reads your psychological archetypes, traits, and inner motivations — deepening self-understanding.'}
              </p>
            </article>
            <article className={`${styles.synergyCard} ${styles.synergyEast}`}>
              <div className={styles.synergyIcon} aria-hidden>
                ☯
              </div>
              <h3 className={styles.synergyTitle}>
                {isKo ? '동양 사주 (사주팔자)' : 'Eastern Saju (Four Pillars)'}
              </h3>
              <p className={styles.synergyDesc}>
                {isKo
                  ? '연·월·일·시 네 기둥과 오행(목·화·토·금·수)의 상호작용으로 인생 주기·운의 흐름·관계·일·건강의 결을 봅니다.'
                  : 'Built on the Four Pillars (Year, Month, Day, Hour) and the interplay of the Five Elements (Wood, Fire, Earth, Metal, Water), it reveals life cycles, fortune flow, relationships, career, and health.'}
              </p>
            </article>
          </div>
        </section>

        {/* Core services */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{isKo ? '핵심 서비스' : 'Core services'}</h2>
            <p className={styles.sectionDesc}>
              {isKo
                ? '현재 메인에서 바로 사용할 수 있는 5개 서비스입니다.'
                : 'These are the five services available immediately from the main page.'}
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
                  {isKo ? '열기 →' : 'Open →'}
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
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

        {/* Quality standard */}
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

        {/* CTA */}
        <section className={styles.cta}>
          <span className={styles.ctaGlow} aria-hidden />
          <h2 className={`${styles.ctaTitle} ${styles.neonText}`}>
            {isKo ? '당신의 우주 설계도를 만나보세요' : 'Ready to discover your cosmic blueprint?'}
          </h2>
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
