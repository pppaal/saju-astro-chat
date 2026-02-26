'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { ConfettiAnimation } from '@/components/shared'
import BackButton from '@/components/ui/BackButton'
import { buildPersonaNarrative, buildPersonaRenderSample } from '@/lib/persona/narrative'
import { usePersonaResult } from './usePersonaResult'
import styles from './result.module.css'
import {
  StarsBackground,
  Hero,
  ConfidenceBadge,
  SnapshotGrid,
  AxisCards,
  Mechanism,
  Playbook,
  RoleFit,
  ActionPlan,
  Disclosure,
  ResultActions,
} from './components'

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
  const sampleMode = (searchParams.get('sample') ?? '').toUpperCase() === 'RSLA'
  const sampleAnalysis = useMemo(
    () => (sampleMode ? buildPersonaRenderSample('RSLA', locale === 'ko' ? 'ko' : 'en') : null),
    [locale, sampleMode]
  )
  const renderAnalysis = analysis ?? sampleAnalysis
  const isSampleOnly = sampleMode && !analysis
  const narrative = useMemo(
    () =>
      renderAnalysis ? buildPersonaNarrative(renderAnalysis, locale === 'ko' ? 'ko' : 'en') : null,
    [locale, renderAnalysis]
  )

  useEffect(() => {
    if (mounted && analysis && hasIcpResult && !singleView && !combinedRedirectedRef.current) {
      combinedRedirectedRef.current = true
      router.replace('/personality/combined')
    }
    if (!mounted || !analysis || !hasIcpResult || singleView) {
      combinedRedirectedRef.current = false
    }
  }, [analysis, hasIcpResult, mounted, router, singleView])

  if (!mounted) {
    return (
      <main className={styles.page}>
        <StarsBackground styles={styles} count={60} />
        <div className={styles.loading}>
          <Sparkles className={styles.loadingIcon} aria-hidden="true" />
          <p className={styles.loadingText}>
            {t('personality.loading', 'Loading your persona...')}
          </p>
        </div>
      </main>
    )
  }

  if (!renderAnalysis || !narrative) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <Sparkles className={styles.emptyIcon} aria-hidden="true" />
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
  }

  return (
    <main className={styles.page}>
      <StarsBackground styles={styles} />
      {showConfetti && <ConfettiAnimation particles={confettiParticles} styles={styles} />}
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <div className={styles.container}>
        {isSampleOnly && (
          <div className={styles.sampleBanner} role="status">
            RSLA 샘플 미리보기입니다. 실제 응답 데이터가 없어 저장/공유는 비활성화됩니다.
          </div>
        )}

        <Hero hero={narrative.hero} styles={styles} />
        <ConfidenceBadge confidence={narrative.confidence} styles={styles} />
        <SnapshotGrid snapshot={narrative.snapshot} styles={styles} />

        <section className={styles.sectionCard} aria-labelledby="today-action-title">
          <h2 id="today-action-title" className={styles.sectionTitle}>
            오늘의 10분 액션
          </h2>
          <p className={styles.bodyText}>{narrative.actionPlan.today.task}</p>
          <p className={styles.hintText}>측정 지표: {narrative.actionPlan.today.metric}</p>
        </section>

        <AxisCards axes={narrative.axes} styles={styles} />
        <Mechanism
          mechanism={narrative.mechanism}
          motivations={narrative.motivations}
          strengths={narrative.strengths}
          risks={narrative.risks}
          styles={styles}
        />
        <Playbook playbook={narrative.relationshipPlaybook} styles={styles} />
        <RoleFit roleFit={narrative.roleFit} styles={styles} />
        <ActionPlan actionPlan={narrative.actionPlan} styles={styles} />
        <Disclosure disclosure={narrative.disclosure} styles={styles} />

        {!isSampleOnly && (
          <ResultActions
            styles={styles}
            authStatus={authStatus}
            saveStatus={saveStatus}
            isSavedToDb={isSavedToDb}
            hasIcpResult={hasIcpResult}
            handleSaveResult={handleSaveResult}
            handleShare={handleShare}
            handleDownload={handleDownload}
            t={t}
          />
        )}
      </div>
    </main>
  )
}
