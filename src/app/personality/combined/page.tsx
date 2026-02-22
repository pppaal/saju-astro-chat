'use client'

import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import {
  TestStatusCard,
  SummaryGrid,
  AxisComparison,
  InsightGrid,
  useCombinedResult,
} from './components'
import styles from './combined.module.css'

export default function CombinedResultPage() {
  const {
    icpResult,
    personaResult,
    hasIcp,
    hasPersona,
    loading,
    isKo,
    insights,
    starPositions,
    hybridResult,
  } = useCombinedResult()

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>{isKo ? '분석 중...' : 'Analyzing...'}</p>
        </div>
      </main>
    )
  }

  if (!hasIcp || !hasPersona) {
    return <TestStatusCard styles={styles} isKo={isKo} hasIcp={hasIcp} hasPersona={hasPersona} />
  }

  return (
    <main className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      {/* Background Stars */}
      <div className={styles.stars}>
        {starPositions.map((pos, i) => (
          <div key={i} className={styles.star} style={pos} />
        ))}
      </div>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.icon}>🔗</div>
          <h1 className={styles.title}>
            {isKo ? '통합 성격 분석' : 'Combined Personality Analysis'}
          </h1>
          <p className={styles.subtitle}>
            {isKo
              ? 'ICP 대인관계 스타일 + 성격 분석 통합 결과'
              : 'ICP Interpersonal Style + Personality Test Combined Results'}
          </p>
        </div>

        <section className={styles.quickSummary}>
          <article className={styles.quickCard}>
            <h2>{isKo ? '핵심 유형 조합' : 'Core Combination'}</h2>
            <p>
              {isKo
                ? `${icpResult!.primaryOctant.korean} + ${personaResult!.personaName}`
                : `${icpResult!.primaryOctant.name} + ${personaResult!.personaName}`}
            </p>
          </article>
          <article className={styles.quickCard}>
            <h2>{isKo ? '지금 집중할 포인트' : 'Current Focus'}</h2>
            <p>{insights[0]?.title ?? (isKo ? '분석 준비 완료' : 'Analysis ready')}</p>
          </article>
          <article className={styles.quickCard}>
            <h2>{isKo ? '다음 권장 액션' : 'Recommended Next Action'}</h2>
            <p>
              {isKo
                ? '궁합 분석으로 관계 시너지를 확인해보세요.'
                : 'Check compatibility to validate relationship synergy.'}
            </p>
          </article>
        </section>

        <SummaryGrid
          styles={styles}
          isKo={isKo}
          icpResult={icpResult!}
          personaResult={personaResult!}
          hybridResult={hybridResult}
        />
        <AxisComparison
          styles={styles}
          isKo={isKo}
          icpResult={icpResult!}
          personaResult={personaResult!}
        />
        <InsightGrid styles={styles} isKo={isKo} insights={insights} />

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Link href="/icp/result?view=single" className={styles.secondaryButton}>
            {isKo ? 'ICP 상세 결과' : 'ICP Details'}
          </Link>
          <Link href="/personality/result?view=single" className={styles.secondaryButton}>
            {isKo ? '성격 분석 상세' : 'Persona Details'}
          </Link>
          <Link href="/compatibility" className={styles.primaryButton}>
            {isKo ? '궁합 분석하기' : 'Check Compatibility'}
          </Link>
        </div>
      </div>
    </main>
  )
}
