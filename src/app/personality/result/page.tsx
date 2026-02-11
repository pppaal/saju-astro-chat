'use client'

import Link from 'next/link'
import { useEffect } from 'react'
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
    if (mounted && analysis && hasIcpResult && !singleView) {
      router.replace('/personality/combined')
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
