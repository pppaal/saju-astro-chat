'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import styles from './select.module.css'

type Choice = {
  id: 'personality' | 'icp'
  titleKo: string
  titleEn: string
  descKo: string
  descEn: string
  href: '/personality' | '/icp'
  icon: string
}

const CHOICES: Choice[] = [
  {
    id: 'personality',
    titleKo: '성격 분석',
    titleEn: 'Personality Analysis',
    descKo: '개인 성향, 강점, 성장 포인트를 깊이 분석합니다.',
    descEn: 'Explore your personality traits, strengths, and growth points.',
    href: '/personality',
    icon: '✨',
  },
  {
    id: 'icp',
    titleKo: 'ICP 대인관계 스타일',
    titleEn: 'ICP Interpersonal Style',
    descKo: '관계에서의 주도성/친화성 패턴을 과학적으로 분석합니다.',
    descEn: 'Analyze your interpersonal dominance and affiliation patterns.',
    href: '/icp',
    icon: '🎭',
  },
]

export default function PersonalitySelectPage() {
  const { locale } = useI18n()
  const searchParams = useSearchParams()
  const q = searchParams.get('q')?.trim() ?? ''
  const isKo = locale === 'ko'

  const links = useMemo(
    () =>
      CHOICES.map((choice) => ({
        ...choice,
        href: q ? `${choice.href}?q=${encodeURIComponent(q)}` : choice.href,
      })),
    [q]
  )

  return (
    <main className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <section className={styles.container}>
        <p className={styles.eyebrow}>{isKo ? '서비스 선택' : 'Choose Service'}</p>
        <h1 className={styles.title}>
          {isKo ? '어떤 분석을 먼저 할까요?' : 'Which analysis do you want first?'}
        </h1>
        <p className={styles.subtitle}>
          {isKo
            ? '원하는 테스트를 먼저 진행하고, 두 테스트를 모두 완료하면 통합 결과를 볼 수 있습니다.'
            : 'Start with either test. Once both are completed, you can view the combined result.'}
        </p>

        <div className={styles.grid}>
          {links.map((choice) => (
            <Link key={choice.id} href={choice.href} className={styles.card}>
              <div className={styles.icon}>{choice.icon}</div>
              <h2 className={styles.cardTitle}>{isKo ? choice.titleKo : choice.titleEn}</h2>
              <p className={styles.cardDesc}>{isKo ? choice.descKo : choice.descEn}</p>
              <span className={styles.cta}>{isKo ? '시작하기' : 'Start'}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
