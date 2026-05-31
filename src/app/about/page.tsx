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
    href: '/destiny-map',
    nameKo: '운명 상담사',
    nameEn: 'Destiny Counselor',
    summaryKo: '궁금한 게 있으면 무엇이든 물어보세요. 사주와 별자리를 같이 보고 답해드려요.',
    summaryEn: 'Ask anything you wonder about — we read your Saju and your stars together.',
  },
  tarot: {
    href: '/tarot',
    nameKo: '타로 상담사',
    nameEn: 'Tarot Counselor',
    summaryKo: '카드 한 장 한 장에 담긴 의미로 지금의 상황과 선택지를 풀어드려요.',
    summaryEn: 'Card by card, we unfold your current situation and the choices in front of you.',
  },
  calendar: {
    href: '/calendar',
    nameKo: '운세 캘린더',
    nameEn: 'Fortune Calendar',
    summaryKo: '오늘, 이번 달, 올해 — 좋은 시기와 조심할 시기를 한눈에 보여드려요.',
    summaryEn:
      'Today, this month, this year — see your good windows and cautious days at a glance.',
  },
  compatibility: {
    href: '/compatibility',
    nameKo: '궁합 상담사',
    nameEn: 'Compatibility Counselor',
    summaryKo: '두 사람의 차트를 함께 읽고, 관계의 분위기와 호흡을 살펴드려요.',
    summaryEn: 'We read two charts together and gently look at the rhythm between you.',
  },
}

const PROCESS_STEPS: readonly ProcessStep[] = [
  {
    id: '01',
    titleKo: '먼저 당신을 알아가요',
    titleEn: 'We get to know you first',
    descKo: '생년월일, 태어난 시간과 장소만 알려주시면, 사주와 별자리 차트를 정확하게 그려드려요.',
    descEn:
      'Just your birth date, time, and place — and we draw your Saju and astrology charts precisely.',
  },
  {
    id: '02',
    titleKo: '동양과 서양을 같이 봐요',
    titleEn: 'We read East and West side by side',
    descKo:
      '사주의 오행과 별자리 행성을 한 화면에서 같이 보면서, 한쪽만으론 잘 안 보이는 부분까지 찾아드려요.',
    descEn:
      "We bring Saju's elements and astrology's planets onto one screen, finding what neither side shows alone.",
  },
  {
    id: '03',
    titleKo: '일상의 말로 풀어드려요',
    titleEn: 'We translate it into everyday words',
    descKo: '어려운 해석은 쉬운 말로 바꿔서, 오늘 할 수 있는 작은 선택까지 같이 고민해드려요.',
    descEn:
      'Difficult readings become plain words, all the way down to a small choice you can make today.',
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
        summaryKo: detail?.summaryKo || '운명 서비스를 안내해드려요.',
        summaryEn: detail?.summaryEn || 'A destiny service ready for you.',
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
                  사주와 별자리,
                  <br />
                  이제 한 곳에서 봐요.
                </>
              ) : (
                <>
                  Your Saju and your stars,
                  <br />
                  now in one place.
                </>
              )}
            </h1>
            <p className={styles.subtitle}>
              {isKo
                ? '동양 사주와 서양 점성술을 함께 읽어, 지금 내 흐름이 더 선명하게 보여요.'
                : 'When Eastern Saju and Western astrology are read together, your current flow comes into sharper focus.'}
            </p>
            <div className={styles.heroActions}>
              <Link href="/destiny-map" className={styles.primaryBtn}>
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
            <h2 className={styles.sectionTitle}>
              {isKo ? '우리가 바라는 것' : 'What we hope for'}
            </h2>
            <p className={styles.missionBody}>
              {isKo
                ? '운명을 정해드리진 않아요. 사주와 별자리가 알려주는 흐름을 차분히 풀어드리고, 더 좋은 선택을 할 수 있도록 곁에서 함께할게요. 그게 저희가 바라는 일이에요.'
                : "We won't decide your fate. What we'll do is gently unfold the flow your Saju and stars point to, and stand beside you as you make better choices. That's what we hope to do."}
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
                  <span className={styles.accentWest}>서양</span>, 함께 읽어요
                </>
              ) : (
                <>
                  <span className={styles.accentEast}>East</span> and{' '}
                  <span className={styles.accentWest}>West</span>, read side by side
                </>
              )}
            </h2>
            <p className={styles.sectionDesc}>
              {isKo
                ? '두 시선을 같이 보면, 평소엔 보이지 않던 나의 모습과 흐름이 또렷해져요.'
                : 'Looking through both lenses, the parts of you and the flow of your life come into clearer view.'}
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
                  ? '태어난 순간의 행성과 별자리로, 나의 성격과 마음의 움직임, 사람들과 어울리는 모습을 읽어요.'
                  : 'From the planets and stars at the moment of your birth, we read your nature, the movement of your heart, and how you connect with people.'}
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
                  ? '태어난 연·월·일·시 네 기둥과 오행으로, 인생의 큰 흐름과 시기, 일과 관계의 분위기를 읽어요.'
                  : 'Through the Four Pillars of your birth and the Five Elements, we read your life cycles, their timing, and the mood of your work and relationships.'}
              </p>
            </article>
          </div>
        </section>

        {/* Core services */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{isKo ? '이런 걸 해드려요' : 'What we offer'}</h2>
            <p className={styles.sectionDesc}>
              {isKo
                ? '바로 써볼 수 있는 네 가지를 준비했어요.'
                : 'Four things ready for you to try right now.'}
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
            <h2 className={styles.sectionTitle}>
              {isKo ? '이렇게 봐드려요' : 'How we read for you'}
            </h2>
            <p className={styles.sectionDesc}>
              {isKo
                ? '몇 가지 정보만 알려주시면, 차분히 풀어 전해드려요.'
                : 'Share a few details, and we gently put it all together for you.'}
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
            {isKo ? '이제 내 이야기를 시작해볼까요?' : 'Shall we begin your story?'}
          </h2>
          <p className={styles.ctaText}>
            {isKo
              ? '궁금한 질문 하나면 충분해요. 흐름이 궁금할 땐 운세 캘린더를 열어보세요.'
              : 'One question is enough to start. Curious about the flow? Open the Fortune Calendar.'}
          </p>
          <div className={styles.heroActions}>
            <Link href="/destiny-map" className={styles.primaryBtn}>
              {isKo ? '무료로 상담 시작' : 'Start free counseling'}
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
