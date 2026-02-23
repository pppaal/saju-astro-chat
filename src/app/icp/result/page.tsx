'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import { ConfettiAnimation } from '@/components/shared'
import { buildIcpNarrative, buildIcpRenderSample, isIcpStyleCode } from '@/lib/icp/narrative'
import useICPResult from './useICPResult'
import useDestinyAdvice from './useDestinyAdvice'
import styles from './result.module.css'
import {
  StarsBackground,
  LoadingScreen,
  EmptyState,
  DestinyAdviceSection,
  ResultActions,
  Hero,
  SnapshotGrid,
  AxisCards,
  ArchetypePanel,
  ActionPlan,
  ConfidenceDisclosure,
} from './components'

export default function ICPResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const combinedRedirectedRef = useRef(false)
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const {
    mounted,
    analysis,
    authStatus,
    saveStatus,
    isSavedToDb,
    showConfetti,
    confettiParticles,
    handleSaveResult,
    handleDownload,
    handleShare,
    hasPersonaResult,
  } = useICPResult(locale)

  const singleView = searchParams.get('view') === 'single'
  const sampleQuery = (searchParams.get('sample') ?? '').toUpperCase()
  const sampleCode = isIcpStyleCode(sampleQuery) ? sampleQuery : null
  const sampleMode = sampleCode !== null
  const sampleAnalysis = useMemo(
    () => (sampleCode ? buildIcpRenderSample(sampleCode, isKo ? 'ko' : 'en') : null),
    [sampleCode, isKo]
  )
  const renderAnalysis = analysis ?? sampleAnalysis
  const isSampleOnly = sampleMode && !analysis

  useEffect(() => {
    if (mounted && analysis && hasPersonaResult && !singleView && !combinedRedirectedRef.current) {
      combinedRedirectedRef.current = true
      router.replace('/personality/combined')
    }
    if (!mounted || !analysis || !hasPersonaResult || singleView) {
      combinedRedirectedRef.current = false
    }
  }, [analysis, hasPersonaResult, mounted, router, singleView])

  const narrative = useMemo(() => {
    if (!renderAnalysis) return null
    return buildIcpNarrative({ ...renderAnalysis, locale })
  }, [renderAnalysis, locale])

  const {
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    destinyAdvice,
    handleGenerateDestinyAdvice,
  } = useDestinyAdvice(renderAnalysis)

  if (!mounted) return <LoadingScreen styles={styles} isKo={isKo} />
  if (!renderAnalysis || !narrative) return <EmptyState styles={styles} isKo={isKo} />

  return (
    <main className={styles.page}>
      <StarsBackground styles={styles} />
      {showConfetti && <ConfettiAnimation particles={confettiParticles} styles={styles} />}

      <div className={styles.backButton}>
        <BackButton />
      </div>

      <div className={styles.premiumContainer}>
        {isSampleOnly && (
          <div className={styles.sampleBanner} role="status">
            {isKo
              ? `${sampleCode} 샘플 미리보기 모드입니다. 실제 응답 데이터가 없어 저장/공유는 비활성 상태입니다.`
              : `${sampleCode} sample preview mode. Save/share is disabled without real answers.`}
          </div>
        )}

        <Hero narrative={narrative.hero} styles={styles} />
        <SnapshotGrid snapshot={narrative.snapshot} styles={styles} />

        <section className={styles.todaySection} aria-labelledby="today-heading">
          <h2 id="today-heading" className={styles.sectionTitlePremium}>
            오늘의 1가지
          </h2>
          <p className={styles.todayAction}>{narrative.actions.todayOneThing}</p>
        </section>

        <AxisCards axes={narrative.axes} styles={styles} />
        <ArchetypePanel archetypes={narrative.archetypes} styles={styles} />
        <ActionPlan actions={narrative.actions} styles={styles} />
        <ConfidenceDisclosure
          confidence={narrative.confidence}
          whyThisResult={narrative.whyThisResult}
          disclaimers={narrative.disclaimers}
          styles={styles}
        />

        {!isSampleOnly && (
          <DestinyAdviceSection
            styles={styles}
            isKo={isKo}
            primaryOctantLabel={
              isKo ? renderAnalysis.primaryOctant.korean : renderAnalysis.primaryOctant.name
            }
            birthDate={birthDate}
            setBirthDate={setBirthDate}
            birthTime={birthTime}
            setBirthTime={setBirthTime}
            isLoading={destinyAdvice.isLoading}
            fortune={destinyAdvice.fortune}
            growthDates={destinyAdvice.growthDates}
            onGenerate={handleGenerateDestinyAdvice}
          />
        )}

        {!isSampleOnly && (
          <ResultActions
            styles={styles}
            isKo={isKo}
            authStatus={authStatus}
            saveStatus={saveStatus}
            isSavedToDb={isSavedToDb}
            onSave={handleSaveResult}
            onShare={handleShare}
            onDownload={handleDownload}
          />
        )}
      </div>
    </main>
  )
}
