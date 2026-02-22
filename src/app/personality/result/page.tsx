'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PersonaCircumplex } from '@/components/personality'
import { AxisBar, ConfettiAnimation } from '@/components/shared'
import BackButton from '@/components/ui/BackButton'
import styles from './result.module.css'
import { getTypeCodeMeanings } from './getTypeCodeMeanings'
import { usePersonaResult } from './usePersonaResult'
import { StarsBackground, HeroSection, TraitsGrid, ResultActions } from './components'

export default function ResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const combinedRedirectedRef = useRef(false)
  const {
    t,
    locale,
    authStatus,
    mounted,
    analysis,
    avatarSrc,
    avatarError,
    setAvatarError,
    saveStatus,
    isSavedToDb,
    showConfetti,
    confettiParticles,
    handleSaveResult,
    handleDownload,
    handleShare,
    hasIcpResult,
  } = usePersonaResult()
  const singleView = searchParams.get('view') === 'single'

  useEffect(() => {
    if (mounted && analysis && hasIcpResult && !singleView && !combinedRedirectedRef.current) {
      combinedRedirectedRef.current = true
      router.replace('/personality/combined')
    }
    if (!mounted || !analysis || !hasIcpResult || singleView) {
      combinedRedirectedRef.current = false
    }
  }, [analysis, hasIcpResult, mounted, router, singleView])

  if (!mounted)
    return (
      <main className={styles.page}>
        <StarsBackground styles={styles} count={60} />
        <div className={styles.loading}>
          <div className={styles.cosmicLoader}>
            <div className={styles.cosmicRing} />
            <div className={styles.cosmicRing} />
            <div className={styles.cosmicRing} />
            <div className={styles.cosmicCore}>&#10024;</div>
          </div>
          <p className={styles.loadingText}>
            {t('personality.loading', 'Loading your persona...')}
          </p>
          <div className={styles.loadingSubtext}>
            {t('personality.analyzingAura', 'Analyzing your cosmic aura...')}
          </div>
        </div>
      </main>
    )

  if (!analysis)
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>&#10024;</div>
          <h1>{t('personality.noResults', 'No Results Yet')}</h1>
          <p>
            {t(
              'personality.noResultsDesc',
              'Complete the personality quiz to discover your Nova Persona'
            )}
          </p>
          <Link href="/personality/quiz" className={styles.ctaButton}>
            {t('personality.startQuiz', 'Start Quiz')}
          </Link>
        </div>
      </main>
    )

  const axes = analysis.axes
  const axisEntries = [
    { key: 'energy', labelKo: '에너지', labelEn: 'Energy', score: axes.energy.score },
    { key: 'cognition', labelKo: '사고', labelEn: 'Cognition', score: axes.cognition.score },
    { key: 'decision', labelKo: '결정', labelEn: 'Decision', score: axes.decision.score },
    { key: 'rhythm', labelKo: '리듬', labelEn: 'Rhythm', score: axes.rhythm.score },
  ]
  const strongestAxis = [...axisEntries].sort((a, b) => b.score - a.score)[0]
  const growthAxis = [...axisEntries].sort((a, b) => a.score - b.score)[0]
  const isKo = locale === 'ko'
  const getBand = (score: number) => {
    if (score >= 67) return isKo ? '높음' : 'High'
    if (score <= 33) return isKo ? '낮음' : 'Low'
    return isKo ? '중간' : 'Balanced'
  }
  const detailedAxisGuides = [
    {
      id: 'energy',
      title: isKo ? '에너지 축 해석' : 'Energy Axis Guide',
      score: axes.energy.score,
      left: isKo ? 'Grounded(내향)' : 'Grounded',
      right: isKo ? 'Radiant(외향)' : 'Radiant',
      meaning:
        axes.energy.score >= 67
          ? isKo
            ? '사람/환경과의 상호작용에서 에너지를 얻습니다.'
            : 'You gain energy from interaction and outward activity.'
          : axes.energy.score <= 33
            ? isKo
              ? '혼자 집중하는 시간에서 에너지를 회복합니다.'
              : 'You recover energy through focused solo time.'
            : isKo
              ? '상황에 따라 외향/내향 모드를 유연하게 전환합니다.'
              : 'You switch flexibly between social and solo modes.',
      action:
        axes.energy.score >= 67
          ? isKo
            ? '하루에 20분은 방해 없는 정리 시간으로 과열을 방지하세요.'
            : 'Reserve 20 quiet minutes daily to prevent overdrive.'
          : axes.energy.score <= 33
            ? isKo
              ? '하루 1회 짧은 대화/피드백 루프로 연결 감각을 유지하세요.'
              : 'Keep one short conversation loop daily to stay connected.'
            : isKo
              ? '집중 시간과 협업 시간을 캘린더에서 분리해 운영하세요.'
              : 'Separate deep-work and collaboration blocks on your calendar.',
    },
    {
      id: 'cognition',
      title: isKo ? '사고 축 해석' : 'Cognition Axis Guide',
      score: axes.cognition.score,
      left: isKo ? 'Structured(구조)' : 'Structured',
      right: isKo ? 'Visionary(비전)' : 'Visionary',
      meaning:
        axes.cognition.score >= 67
          ? isKo
            ? '큰 그림과 가능성 탐색에 강합니다.'
            : 'You are strong at big-picture and possibility thinking.'
          : axes.cognition.score <= 33
            ? isKo
              ? '구체화와 실행 설계에 강합니다.'
              : 'You are strong at structuring and execution design.'
            : isKo
              ? '아이디어와 현실 검증을 균형 있게 수행합니다.'
              : 'You balance ideation with practical validation.',
      action:
        axes.cognition.score >= 67
          ? isKo
            ? '아이디어마다 “이번 주 실행 1단계”를 반드시 붙이세요.'
            : 'Attach one executable next step to each idea this week.'
          : axes.cognition.score <= 33
            ? isKo
              ? '주 1회는 대안 2개를 강제로 비교해 시야를 넓히세요.'
              : 'Compare at least two alternatives weekly to widen perspective.'
            : isKo
              ? '기획안에 비전 문장 1개 + 실행 체크리스트 1개를 함께 두세요.'
              : 'Pair one vision statement with one execution checklist.',
    },
    {
      id: 'decision',
      title: isKo ? '결정 축 해석' : 'Decision Axis Guide',
      score: axes.decision.score,
      left: isKo ? 'Empathic(공감)' : 'Empathic',
      right: isKo ? 'Logic(논리)' : 'Logic',
      meaning:
        axes.decision.score >= 67
          ? isKo
            ? '일관된 기준과 데이터 기반 판단이 빠릅니다.'
            : 'You decide quickly with consistent criteria and data.'
          : axes.decision.score <= 33
            ? isKo
              ? '관계 맥락과 감정 신호를 잘 읽어 결정합니다.'
              : 'You decide well by reading context and emotional signals.'
            : isKo
              ? '사람과 성과를 함께 고려하는 균형형입니다.'
              : 'You balance people impact and outcome quality.',
      action:
        axes.decision.score >= 67
          ? isKo
            ? '결정문에 “영향받는 사람 1줄”을 추가해 마찰을 줄이세요.'
            : 'Add one line on people impact to reduce friction.'
          : axes.decision.score <= 33
            ? isKo
              ? '결정 전 “숫자 기준 1개”를 명시해 흔들림을 줄이세요.'
              : 'Define one numeric criterion before deciding.'
            : isKo
              ? '결정 회의에서 사실/감정 체크를 각각 1회 수행하세요.'
              : 'Run one fact-check and one empathy-check in decisions.',
    },
    {
      id: 'rhythm',
      title: isKo ? '리듬 축 해석' : 'Rhythm Axis Guide',
      score: axes.rhythm.score,
      left: isKo ? 'Anchor(안정)' : 'Anchor',
      right: isKo ? 'Flow(유동)' : 'Flow',
      meaning:
        axes.rhythm.score >= 67
          ? isKo
            ? '변화 대응과 즉흥 조정에 강합니다.'
            : 'You adapt quickly and handle dynamic change well.'
          : axes.rhythm.score <= 33
            ? isKo
              ? '계획 기반의 안정적 누적 성과에 강합니다.'
              : 'You excel at stable, planned accumulation of results.'
            : isKo
              ? '상황별 템포 조절 능력이 좋습니다.'
              : 'You regulate pace well across different contexts.',
      action:
        axes.rhythm.score >= 67
          ? isKo
            ? '주간 핵심 루틴 2개만 고정해 생산성 분산을 막으세요.'
            : 'Fix two weekly core routines to prevent diffusion.'
          : axes.rhythm.score <= 33
            ? isKo
              ? '주 1회는 계획 없는 실험 슬롯을 넣어 유연성을 확보하세요.'
              : 'Add one unplanned experiment slot each week.'
            : isKo
              ? '일정의 20%는 버퍼로 두고 변화 대응력을 유지하세요.'
              : 'Keep 20% schedule buffer for adaptive response.',
    },
  ]

  return (
    <main className={styles.page}>
      <StarsBackground styles={styles} />
      {showConfetti && <ConfettiAnimation particles={confettiParticles} styles={styles} />}
      <div className={styles.backButton}>
        <BackButton />
      </div>
      <div className={styles.container}>
        <HeroSection
          styles={styles}
          analysis={analysis}
          avatarSrc={avatarSrc}
          avatarError={avatarError}
          setAvatarError={setAvatarError}
          typeCodeBreakdown={getTypeCodeMeanings(analysis.typeCode, locale)}
          t={t}
        />

        <section className={styles.quickReadSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🧭</span>
            {t('personality.quickRead', 'Quick Read')}
          </h2>
          <div className={styles.quickReadGrid}>
            <article className={styles.quickReadCard}>
              <h3>{t('personality.strongestAxis', 'Strongest Axis')}</h3>
              <p>
                {locale === 'ko' ? strongestAxis.labelKo : strongestAxis.labelEn}{' '}
                {strongestAxis.score}%
              </p>
            </article>
            <article className={styles.quickReadCard}>
              <h3>{t('personality.growthFocus', 'Growth Focus')}</h3>
              <p>
                {locale === 'ko' ? growthAxis.labelKo : growthAxis.labelEn} {growthAxis.score}%
              </p>
            </article>
            <article className={styles.quickReadCard}>
              <h3>{t('personality.todayAction', 'One Action Today')}</h3>
              <p>{analysis.growthTips[0]}</p>
            </article>
          </div>
        </section>

        <section className={styles.detailGuideSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📘</span>
            {isKo ? '결과 상세 해석 가이드' : 'Detailed Interpretation Guide'}
          </h2>
          <p className={styles.detailGuideIntro}>
            {isKo
              ? '점수는 좋고 나쁨이 아니라 선호 패턴입니다. 각 축의 현재 강점과 보완 포인트를 함께 보세요.'
              : 'Scores are preference patterns, not good/bad labels. Read strengths and adjustments together.'}
          </p>
          <div className={styles.detailGuideGrid}>
            {detailedAxisGuides.map((guide) => (
              <article key={guide.id} className={styles.detailGuideCard}>
                <h3>{guide.title}</h3>
                <p className={styles.detailMeta}>
                  {guide.left} ↔ {guide.right} · {guide.score}% ({getBand(guide.score)})
                </p>
                <p>{guide.meaning}</p>
                <p className={styles.detailActionLabel}>
                  {isKo ? '바로 해볼 실천:' : 'Try this now:'}
                </p>
                <p>{guide.action}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.motivationsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>{'\uD83C\uDFAF'}</span>
            {t('personality.keyMotivations', 'Key Motivations')}
          </h2>
          <div className={styles.motivationCards}>
            {analysis.keyMotivations.map((m, i) => (
              <div
                key={m}
                className={styles.motivationCard}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={styles.motivationNumber}>{i + 1}</div>
                <p>{m}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.axesSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>{'\uD83D\uDCCA'}</span>
            {t('personality.axes', 'Personality Spectrum')}
          </h2>
          <div className={styles.axesCard}>
            <AxisBar
              label={t('personality.axis.energy', 'Energy')}
              score={axes.energy.score}
              left={t('personality.axis.grounded', 'Grounded')}
              right={t('personality.axis.radiant', 'Radiant')}
              delay={0}
              styles={styles}
            />
            <AxisBar
              label={t('personality.axis.cognition', 'Cognition')}
              score={axes.cognition.score}
              left={t('personality.axis.structured', 'Structured')}
              right={t('personality.axis.visionary', 'Visionary')}
              delay={100}
              styles={styles}
            />
            <AxisBar
              label={t('personality.axis.decision', 'Decision')}
              score={axes.decision.score}
              left={t('personality.axis.empathic', 'Empathic')}
              right={t('personality.axis.logic', 'Logic')}
              delay={200}
              styles={styles}
            />
            <AxisBar
              label={t('personality.axis.rhythm', 'Rhythm')}
              score={axes.rhythm.score}
              left={t('personality.axis.anchor', 'Anchor')}
              right={t('personality.axis.flow', 'Flow')}
              delay={300}
              styles={styles}
            />
          </div>
        </section>

        <section className={styles.circumplexSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>{'\uD83D\uDD2E'}</span>
            {t('personality.circumplex', 'Personality Circumplex')}
          </h2>
          <div className={styles.circumplexWrapper}>
            <PersonaCircumplex axes={axes} typeCode={analysis.typeCode} locale={locale} />
          </div>
        </section>

        <TraitsGrid
          styles={styles}
          strengths={analysis.strengths}
          challenges={analysis.challenges}
          recommendedRoles={analysis.recommendedRoles}
          career={analysis.career}
          t={t}
        />

        <section className={styles.insightsSection}>
          <div className={styles.insightCard}>
            <div className={styles.insightIcon}>{'\uD83E\uDD1D'}</div>
            <h3>{t('personality.compatibility', 'Compatibility')}</h3>
            <p>{analysis.compatibilityHint}</p>
          </div>
        </section>

        <section className={styles.growthSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>{'\uD83C\uDF31'}</span>
            {t('personality.growthGuide', 'Growth Guide')}
          </h2>
          <div className={styles.growthCards}>
            {analysis.growthTips.map((tip, i) => (
              <div key={i} className={styles.growthCard}>
                <div className={styles.growthNumber}>{i + 1}</div>
                <div className={styles.growthContent}>
                  <p className={styles.growthTip}>{tip}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ResultActions
          styles={styles}
          authStatus={authStatus}
          saveStatus={saveStatus}
          isSavedToDb={isSavedToDb}
          handleSaveResult={handleSaveResult}
          handleShare={handleShare}
          handleDownload={handleDownload}
          t={t}
        />
      </div>
    </main>
  )
}
