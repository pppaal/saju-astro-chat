'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import { TestStatusCard, useCombinedResult } from './components'
import { buildHybridNarrativeSample } from '@/lib/persona/hybridNarrative'
import type { IcpDimensionKey } from '@/lib/assessment/integratedProfile'
import styles from './combined.module.css'

export default function CombinedResultPage() {
  const searchParams = useSearchParams()
  const sampleMode = (searchParams.get('sample') ?? '').toLowerCase() === 'bc-rsla'
  const {
    hasIcp,
    hasPersona,
    loading,
    isKo,
    starPositions,
    hybridNarrative,
    personaResult,
    icpDimensions,
    integratedProfile,
    integratedProfileId,
  } = useCombinedResult()

  const sampleNarrative = useMemo(
    () => (sampleMode ? buildHybridNarrativeSample(isKo ? 'ko' : 'en') : null),
    [isKo, sampleMode]
  )

  const narrative = sampleMode ? sampleNarrative : hybridNarrative
  const integratedName = integratedProfile
    ? isKo
      ? integratedProfile.nameKo
      : integratedProfile.nameEn
    : null
  const integratedOneLine = integratedProfile
    ? isKo
      ? integratedProfile.oneLineKo
      : integratedProfile.oneLineEn
    : null
  const integratedStrengths = integratedProfile
    ? isKo
      ? integratedProfile.strengthsKo
      : integratedProfile.strengthsEn
    : []
  const integratedWatchouts = integratedProfile
    ? isKo
      ? integratedProfile.watchoutsKo
      : integratedProfile.watchoutsEn
    : []
  const integratedShowUp = integratedProfile
    ? isKo
      ? integratedProfile.howYouShowUpKo
      : integratedProfile.howYouShowUpEn
    : null
  const integratedPlaybook = integratedProfile
    ? isKo
      ? integratedProfile.communicationPlaybookKo
      : integratedProfile.communicationPlaybookEn
    : null

  const dimensionLabels: Record<
    IcpDimensionKey,
    { ko: string; en: string; koDesc: string; enDesc: string }
  > = {
    assertiveness: {
      ko: '주장성',
      en: 'Assertiveness',
      koDesc: '갈등에서도 입장을 분명하게 전달하는 경향',
      enDesc: 'Tendency to state your view clearly in tension',
    },
    rumination: {
      ko: '반추',
      en: 'Rumination',
      koDesc: '관계 스트레스가 오래 남아 사고를 점유하는 경향',
      enDesc: 'Tendency for social stress to stay active in thought',
    },
    empathy: {
      ko: '공감',
      en: 'Empathy',
      koDesc: '상대 관점을 이해하려는 시도 강도',
      enDesc: 'Degree of trying to understand the other side',
    },
    boundary: {
      ko: '경계 설정',
      en: 'Boundary',
      koDesc: '시간·에너지 기준을 세우고 유지하는 경향',
      enDesc: 'Tendency to set and hold time-energy limits',
    },
    recovery: {
      ko: '회복력',
      en: 'Recovery',
      koDesc: '갈등 이후 정서를 정리하고 복귀하는 속도',
      enDesc: 'Speed of emotional reset after conflict',
    },
  }

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

  if (!narrative && (!hasIcp || !hasPersona)) {
    return <TestStatusCard styles={styles} isKo={isKo} hasIcp={hasIcp} hasPersona={hasPersona} />
  }

  if (!narrative) {
    return <TestStatusCard styles={styles} isKo={isKo} hasIcp={false} hasPersona={false} />
  }

  return (
    <main className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <div className={styles.stars} aria-hidden>
        {starPositions.map((pos, i) => (
          <div key={i} className={styles.star} style={pos} />
        ))}
      </div>

      <div className={styles.container}>
        {sampleMode && (
          <div className={styles.sampleBadge} role="status">
            {isKo
              ? 'BC + RSLA 샘플 리포트 미리보기 모드입니다.'
              : 'BC + RSLA sample report preview mode.'}
          </div>
        )}

        {personaResult &&
          icpDimensions &&
          integratedProfile &&
          integratedShowUp &&
          integratedPlaybook && (
            <section className={styles.section} aria-labelledby="integrated-result-title">
              <h2 id="integrated-result-title" className={styles.sectionTitle}>
                {isKo ? 'Integrated Result' : 'Integrated Result'}
              </h2>

              <div className={styles.snapshotGrid}>
                <article className={styles.card}>
                  <h3>{isKo ? 'Personality Summary' : 'Personality Summary'}</h3>
                  <p>
                    {personaResult.personaName} ({personaResult.typeCode})
                  </p>
                  <p>{personaResult.summary}</p>
                </article>

                <article className={styles.card}>
                  <h3>{isKo ? 'ICP Summary (5 Dimensions)' : 'ICP Summary (5 Dimensions)'}</h3>
                  <ul>
                    {icpDimensions.ranked.map((dimension) => {
                      const labelMeta = dimensionLabels[dimension.key]
                      const label = isKo ? labelMeta.ko : labelMeta.en
                      const desc = isKo ? labelMeta.koDesc : labelMeta.enDesc
                      return (
                        <li key={dimension.key}>
                          <strong>{label}</strong> {dimension.score} · {desc}
                        </li>
                      )
                    })}
                  </ul>
                </article>
              </div>

              <article className={styles.card}>
                <h3>
                  {integratedName} ({integratedProfileId})
                </h3>
                <p>{integratedOneLine}</p>
                <div className={styles.snapshotGrid}>
                  <div>
                    <h3>{isKo ? '강점 3' : '3 Strengths'}</h3>
                    <ul>
                      {integratedStrengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{isKo ? '주의 3' : '3 Watchouts'}</h3>
                    <ul>
                      {integratedWatchouts.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className={styles.snapshotGrid}>
                  <div>
                    <h3>{isKo ? '연애에서 보이는 패턴' : 'Dating Pattern'}</h3>
                    <ul>
                      {integratedShowUp.dating.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{isKo ? '일할 때 보이는 패턴' : 'Work Pattern'}</h3>
                    <ul>
                      {integratedShowUp.work.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className={styles.snapshotGrid}>
                  <div>
                    <h3>{isKo ? '친구/가족과의 패턴' : 'Friends/Family Pattern'}</h3>
                    <ul>
                      {integratedShowUp.friendsFamily.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{isKo ? 'Communication Playbook' : 'Communication Playbook'}</h3>
                    <ul>
                      <li>{integratedPlaybook.conflictOpener}</li>
                      <li>{integratedPlaybook.boundarySetting}</li>
                      <li>{integratedPlaybook.repairReconnect}</li>
                    </ul>
                  </div>
                </div>
              </article>
            </section>
          )}

        <section className={styles.hero} aria-labelledby="hybrid-hero-title">
          <p className={styles.overline}>
            {isKo ? '통합 성격 분석' : 'Combined Personality Analysis'}
          </p>
          <h1 id="hybrid-hero-title" className={styles.heroTitle}>
            {narrative.hero.combination}
          </h1>
          <p className={styles.heroSubtitle}>{narrative.hero.definitionLine}</p>
          <div className={styles.heroMeta}>
            <span className={styles.badge}>{narrative.hero.hybridCode}</span>
            <span className={styles.badge}>{narrative.hero.hybridAlias}</span>
            <span className={styles.badge}>{narrative.hero.confidenceBadge}</span>
          </div>
          <p className={styles.todayPoint}>
            <strong>{isKo ? '오늘의 포인트' : 'Today Point'}</strong>
            <span>{narrative.hero.todayPoint}</span>
          </p>
        </section>

        <section className={styles.section} aria-labelledby="snapshot-title">
          <h2 id="snapshot-title" className={styles.sectionTitle}>
            {isKo ? '30초 요약' : '30-Second Snapshot'}
          </h2>
          <div className={styles.snapshotGrid}>
            <article className={styles.card}>
              <h3>{isKo ? '강점 3' : '3 Strengths'}</h3>
              <ul>
                {narrative.snapshot.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.card}>
              <h3>{isKo ? '리스크 2' : '2 Risks'}</h3>
              <ul>
                {narrative.snapshot.risks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.card}>
              <h3>{isKo ? '잘 맞는 환경 2' : '2 Best-Fit Environments'}</h3>
              <ul>
                {narrative.snapshot.bestFitEnvironments.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.card}>
              <h3>{isKo ? '망가지는 조건 2' : '2 Breakdown Conditions'}</h3>
              <ul>
                {narrative.snapshot.breakdownConditions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="axes-title">
          <h2 id="axes-title" className={styles.sectionTitle}>
            {isKo ? '축별 해석' : 'Axis Translator'}
          </h2>
          <div className={styles.axisGrid}>
            {narrative.axes.map((axis) => (
              <article key={axis.key} className={styles.axisCard}>
                <header className={styles.axisHeader}>
                  <h3>{axis.label}</h3>
                  <span className={styles.axisScore}>
                    {axis.score} · {axis.levelLabel}
                  </span>
                </header>
                <p className={styles.axisSpectrum}>{axis.spectrum}</p>
                <p>{axis.positionSummary}</p>
                <p>{axis.advantage}</p>
                <p>{axis.overdriveRisk}</p>
                <p className={styles.axisAction}>{axis.microAdjustment}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.sectionNarrow} aria-labelledby="core-title">
          <h2 id="core-title" className={styles.sectionTitle}>
            {narrative.hybridCore.title}
          </h2>
          {narrative.hybridCore.lines.map((line) => (
            <p key={line} className={styles.bodyLine}>
              {line}
            </p>
          ))}
        </section>

        <section className={styles.section} aria-labelledby="insight-title">
          <h2 id="insight-title" className={styles.sectionTitle}>
            {isKo ? '근거 기반 인사이트' : 'Evidence-Based Insights'}
          </h2>
          <div className={styles.insightGrid}>
            {narrative.insights.map((insight) => (
              <article key={insight.name} className={styles.insightCard}>
                <h3>{insight.name}</h3>
                <p>{insight.evidence}</p>
                <p>{insight.strengthWhen}</p>
                <p>{insight.riskAndAdjustment}</p>
                <p className={styles.insightAction}>{insight.quickAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="playbook-title">
          <h2 id="playbook-title" className={styles.sectionTitle}>
            {isKo ? '관계 운영 플레이북' : 'Relationship Playbook'}
          </h2>
          <div className={styles.playbookGrid}>
            <article className={styles.card}>
              <h3>{isKo ? '시작' : 'Start'}</h3>
              <p>{narrative.playbook.start}</p>
            </article>
            <article className={styles.card}>
              <h3>{isKo ? '유지' : 'Maintain'}</h3>
              <p>{narrative.playbook.maintain}</p>
            </article>
            <article className={styles.card}>
              <h3>{isKo ? '갈등' : 'Conflict'}</h3>
              <p>{narrative.playbook.conflict}</p>
            </article>
            <article className={styles.card}>
              <h3>{isKo ? '회복' : 'Recovery'}</h3>
              <p>{narrative.playbook.recovery}</p>
            </article>
          </div>
          <div className={styles.scriptBox}>
            <h3>{isKo ? '갈등 시 말문 2개' : 'Two Conflict Scripts'}</h3>
            <ul>
              {narrative.playbook.scripts.map((script) => (
                <li key={script}>{script}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="rolefit-title">
          <h2 id="rolefit-title" className={styles.sectionTitle}>
            {isKo ? '업무/역할 적합도' : 'Work / Role Fit'}
          </h2>
          <div className={styles.snapshotGrid}>
            <article className={styles.card}>
              <h3>{isKo ? '빛나는 역할 3' : '3 Roles to Shine'}</h3>
              <ul>
                {narrative.roleFit.shineRoles.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.card}>
              <h3>{isKo ? '피해야 할 환경 2' : '2 Environments to Avoid'}</h3>
              <ul>
                {narrative.roleFit.avoidRoles.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.card}>
              <h3>{isKo ? '운영 체크리스트' : 'Operating Checklist'}</h3>
              <ul>
                {narrative.roleFit.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="action-title">
          <h2 id="action-title" className={styles.sectionTitle}>
            {isKo ? '행동 계획' : 'Action Plan'}
          </h2>
          <article className={styles.actionMain}>
            <h3>{isKo ? '오늘 10분' : 'Today 10 Minutes'}</h3>
            <p>{narrative.actionPlan.today10Min}</p>
          </article>
          <article className={styles.card}>
            <h3>{isKo ? '이번주 3개' : 'This Week (3)'}</h3>
            <ul>
              {narrative.actionPlan.thisWeek.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className={styles.card}>
            <h3>{narrative.actionPlan.twoWeekExperiment.title}</h3>
            <ul>
              {narrative.actionPlan.twoWeekExperiment.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <p className={styles.metric}>{narrative.actionPlan.twoWeekExperiment.metric}</p>
          </article>
        </section>

        <section className={styles.sectionNarrow} aria-labelledby="next-title">
          <h2 id="next-title" className={styles.sectionTitle}>
            {narrative.nextAction.title}
          </h2>
          <ul className={styles.nextList}>
            {narrative.nextAction.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.nextCta}>{narrative.nextAction.optionalCta}</p>
        </section>

        <section className={styles.sectionNarrow}>
          <details className={styles.disclosure}>
            <summary>{isKo ? '해석 방법 및 고지' : 'Interpretation & Disclosure'}</summary>
            <p>{narrative.disclosure.nonClinical}</p>
            <p>{narrative.disclosure.variability}</p>
            <ul>
              {narrative.disclosure.interpretation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </section>

        <div className={styles.actions}>
          <Link href="/icp/result?view=single" className={styles.secondaryButton}>
            {isKo ? 'ICP 상세 결과' : 'ICP Details'}
          </Link>
          <Link href="/personality/result?view=single" className={styles.secondaryButton}>
            {isKo ? '성격 분석 상세' : 'Persona Details'}
          </Link>
          <Link href="/compatibility" className={styles.primaryButton}>
            {isKo ? '궁합 비교 열기' : 'Open Compatibility'}
          </Link>
        </div>
      </div>
    </main>
  )
}
