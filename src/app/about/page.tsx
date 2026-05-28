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
    summaryKo: '궁금한 질문을 물어보면 사주·점성을 함께 읽어 답을 드려요.',
    summaryEn: 'Ask anything — answers grounded in Saju and astrology.',
  },
  tarot: {
    href: '/tarot',
    nameKo: '타로 상담사',
    nameEn: 'Tarot Counselor',
    summaryKo: '카드 한 장 한 장으로 지금의 상황과 선택지를 정리해드려요.',
    summaryEn: 'Read your current situation and options, one card at a time.',
  },
  calendar: {
    href: '/calendar',
    nameKo: '운세 캘린더',
    nameEn: 'Fortune Calendar',
    summaryKo: '오늘·이번 달·올해, 좋은 흐름과 조심할 시기를 한눈에 확인해요.',
    summaryEn: 'See your good windows and cautious days at a glance.',
  },
  compatibility: {
    href: '/compatibility',
    nameKo: '궁합 상담사',
    nameEn: 'Compatibility Counselor',
    summaryKo: '두 사람의 차트를 함께 읽어 관계의 결과 호흡을 분석해요.',
    summaryEn: 'Read two charts together to see your relationship dynamic.',
  },
}

const PROCESS_STEPS: readonly ProcessStep[] = [
  {
    id: '01',
    titleKo: '당신을 이해해요',
    titleEn: 'We get to know you',
    descKo: '생년월일·태어난 시간·장소만 있으면, 정확한 사주와 점성 차트가 만들어져요.',
    descEn: 'Your birth date, time, and place are enough to build an accurate chart.',
  },
  {
    id: '02',
    titleKo: '동서양을 함께 읽어요',
    titleEn: 'East meets West',
    descKo:
      '사주의 오행과 점성술의 행성을 같은 화면에서 교차해 보며, 한쪽만으로는 보이지 않는 결을 찾아요.',
    descEn:
      "We cross-read Saju's elements with astrology's planets to reveal patterns one side alone can't show.",
  },
  {
    id: '03',
    titleKo: '실제 삶의 언어로 전해요',
    titleEn: 'Translated into your life',
    descKo: '복잡한 해석을 일상 언어로 풀어, 오늘 할 수 있는 작은 선택까지 함께 안내해요.',
    descEn: 'Complex readings become plain language — down to a small choice you can make today.',
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
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>About · DestinyPal</p>
            <h1 className={styles.title}>
              {isKo ? (
                <>
                  당신만의 별과 사주,
                  <br />한 화면에서 만나요.
                </>
              ) : (
                <>
                  Your stars and your Saju,
                  <br />
                  on the same screen.
                </>
              )}
            </h1>
            <p className={styles.subtitle}>
              {isKo
                ? '서양 점성술과 동양 사주를 함께 읽어, 당신만의 길을 더 또렷하게 보여드려요.'
                : 'We read Western astrology and Eastern Saju together — so your path comes into clearer focus.'}
            </p>
            <div className={styles.heroActions}>
              <Link href="/destiny-counselor" className={styles.primaryBtn}>
                {isKo ? '무료로 상담 시작하기' : 'Start free counseling'}
              </Link>
              <Link href="/pricing" className={styles.secondaryBtn}>
                {isKo ? '가격 안내' : 'See pricing'}
              </Link>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className={styles.mission}>
          <div className={styles.missionText}>
            <h2 className={styles.sectionTitle}>{isKo ? '우리의 마음' : 'Our intent'}</h2>
            <p className={styles.missionBody}>
              {isKo
                ? '운명을 단정하지 않아요. 별과 오행이 보여주는 결을 차분히 읽고, 당신이 더 좋은 선택을 할 수 있도록 곁에서 안내하는 것 — DestinyPal이 하고 싶은 일이에요.'
                : "We won't declare your fate. We read what the stars and elements quietly show, and stand beside you so you can make better choices — that's what DestinyPal is for."}
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
                ? '두 전통을 함께 읽을 때, 내면의 결과 인생의 시기가 입체적으로 드러나요.'
                : 'Read together, the two traditions reveal both your inner self and the timing of your life.'}
            </p>
          </header>
          <div className={styles.synergyGrid}>
            <article className={`${styles.synergyCard} ${styles.synergyWest}`}>
              <div className={styles.synergyIcon} aria-hidden>
                ✨
              </div>
              <h3 className={styles.synergyTitle}>{isKo ? '서양 점성술' : 'Western Astrology'}</h3>
              <p className={styles.synergyDesc}>
                {isKo
                  ? '태어난 순간의 행성과 별자리 배치로, 당신의 성향과 마음의 결, 관계 안에서의 모습을 읽어요.'
                  : 'From the planets and stars at the moment of your birth, it reads your nature, inner motivations, and how you show up in relationships.'}
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
                  ? '연·월·일·시 네 기둥과 오행의 흐름으로, 인생의 주기·운의 시기·일과 관계의 결을 살펴요.'
                  : 'Through the Four Pillars and the flow of Five Elements, it traces your life cycles, the timing of fortune, and the texture of work and relationships.'}
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
                ? '지금 바로 사용해볼 수 있는 4가지 서비스예요.'
                : 'Four services you can try right now.'}
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
            <h2 className={styles.sectionTitle}>{isKo ? '어떻게 만들어지나요' : 'How it works'}</h2>
            <p className={styles.sectionDesc}>
              {isKo
                ? '입력부터 결과까지, 한 흐름으로 이어져요.'
                : 'From input to answer — one consistent flow.'}
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

        {/* CTA */}
        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>
            {isKo ? '이제, 당신의 이야기를 시작해보세요.' : 'Ready to begin your story?'}
          </h2>
          <p className={styles.ctaText}>
            {isKo
              ? '궁금한 질문 하나면 충분해요. 흐름이 보고 싶을 땐 운세 캘린더로 이어가요.'
              : 'One question is enough to start. When you want to see the flow, open the Fortune Calendar.'}
          </p>
          <div className={styles.heroActions}>
            <Link href="/destiny-counselor" className={styles.primaryBtn}>
              {isKo ? '운명 상담 시작' : 'Start counseling'}
            </Link>
            <Link href="/calendar" className={styles.secondaryBtn}>
              {isKo ? '운세 캘린더 열기' : 'Open Fortune Calendar'}
            </Link>
          </div>
        </section>
      </main>

      <ScrollToTop label={translate('common.scrollToTop', 'Top')} />
    </div>
  )
}
