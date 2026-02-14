'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import { ICPCircumplex } from '@/components/icp'
import { AxisBar, ConfettiAnimation } from '@/components/shared'
import OctantRadar from './OctantRadar'
import useICPResult from './useICPResult'
import useDestinyAdvice from './useDestinyAdvice'
import styles from './result.module.css'
import {
  StarsBackground,
  LoadingScreen,
  EmptyState,
  PrimaryStyleDetails,
  DestinyAdviceSection,
  ResultActions,
} from './components'

export default function ICPResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const {
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    destinyAdvice,
    handleGenerateDestinyAdvice,
  } = useDestinyAdvice(analysis)

  useEffect(() => {
    if (mounted && analysis && hasPersonaResult && !singleView) {
      router.replace('/personality/combined')
    }
  }, [analysis, hasPersonaResult, mounted, router, singleView])

  if (!mounted) return <LoadingScreen styles={styles} isKo={isKo} />
  if (!analysis) return <EmptyState styles={styles} isKo={isKo} />

  const { primaryOctant, secondaryOctant } = analysis
  const t = (ko: string, en: string) => (isKo ? ko : en)

  return (
    <main className={styles.page}>
      <StarsBackground styles={styles} />
      {showConfetti && <ConfettiAnimation particles={confettiParticles} styles={styles} />}
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <div className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.preTitle}>
            {t('당신의 대인관계 스타일', 'Your Interpersonal Style')}
          </p>
          <h1 className={styles.styleName}>{isKo ? primaryOctant.korean : primaryOctant.name}</h1>
          <div className={styles.styleCode}>{analysis.primaryStyle}</div>
          <p className={styles.summary}>{isKo ? analysis.summaryKo : analysis.summary}</p>
          <div className={styles.badges}>
            <div className={styles.consistencyBadge}>
              <span className={styles.consistencyValue}>{analysis.consistencyScore}%</span>
              <span className={styles.consistencyLabel}>{t('신뢰도', 'Confidence')}</span>
            </div>
          </div>
        </section>

        <section className={styles.axesSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📊</span>
            {t('대인관계 핵심 축', 'Interpersonal Axes')}
          </h2>
          <div className={styles.axesCard}>
            <AxisBar
              label={t('주도성', 'Agency')}
              score={analysis.dominanceScore}
              left={t('신중함', 'Reserved')}
              right={t('주도적', 'Initiating')}
              delay={0}
              styles={styles}
            />
            <AxisBar
              label={t('관계 온도', 'Warmth')}
              score={analysis.affiliationScore}
              left={t('거리 둠', 'Distant')}
              right={t('친화적', 'Friendly')}
              delay={100}
              styles={styles}
            />
          </div>
        </section>

        <section className={styles.circumplexSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔮</span>
            {t('원형 분석', 'Circumplex Analysis')}
          </h2>
          <div className={styles.circumplexWrapper}>
            <ICPCircumplex
              primaryStyle={analysis.primaryStyle}
              secondaryStyle={analysis.secondaryStyle ?? undefined}
              octantScores={analysis.octantScores}
              dominanceScore={(analysis.dominanceScore - 50) / 50}
              affiliationScore={(analysis.affiliationScore - 50) / 50}
            />
          </div>
        </section>

        <section className={styles.octantSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎯</span>
            {t('8가지 스타일 점수', '8 Octant Scores')}
          </h2>
          <OctantRadar scores={analysis.octantScores} isKo={isKo} />
        </section>

        <PrimaryStyleDetails styles={styles} isKo={isKo} primaryOctant={primaryOctant} />

        <section className={styles.growthSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🌱</span>
            {t('성장 제안', 'Growth Suggestions')}
          </h2>
          <p className={styles.growthIntro}>
            {t(
              `${primaryOctant.korean} 유형의 실전 개선 포인트`,
              `Practical growth points for ${primaryOctant.name}`
            )}
          </p>
          <div className={styles.growthCards}>
            {(isKo
              ? primaryOctant.growthRecommendationsKo
              : primaryOctant.growthRecommendations
            ).map((rec, i) => (
              <div key={i} className={styles.growthCard}>
                <div className={styles.growthNumber}>{i + 1}</div>
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </section>

        {analysis.explainability && (
          <section className={styles.explainSection}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🧭</span>
              {t('이 결과가 나온 이유', 'Why You Got This Result')}
            </h2>
            <div className={styles.explainCard}>
              <p className={styles.disclaimerText}>
                {t(
                  '이 검사는 비임상 자기이해 도구입니다. 의료/진단 목적이 아니며, 현재 컨디션에 따라 결과가 달라질 수 있습니다.',
                  'This test is a non-clinical self-reflection tool, not a medical or diagnostic assessment.'
                )}
              </p>
              <div className={styles.questionsList}>
                {analysis.explainability.topAxes.map((axis) => (
                  <div key={axis.axis} className={styles.questionItem}>
                    <span className={styles.questionBullet}>•</span>
                    <p>{`${axis.axis} ${axis.score}% - ${axis.interpretation}`}</p>
                  </div>
                ))}
                {analysis.explainability.evidence.slice(0, 2).map((item, idx) => (
                  <div key={`${item.questionId}-${idx}`} className={styles.questionItem}>
                    <span className={styles.questionBullet}>•</span>
                    <p>{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <DestinyAdviceSection
          styles={styles}
          isKo={isKo}
          primaryOctantLabel={isKo ? primaryOctant.korean : primaryOctant.name}
          birthDate={birthDate}
          setBirthDate={setBirthDate}
          birthTime={birthTime}
          setBirthTime={setBirthTime}
          isLoading={destinyAdvice.isLoading}
          fortune={destinyAdvice.fortune}
          growthDates={destinyAdvice.growthDates}
          onGenerate={handleGenerateDestinyAdvice}
        />

        <section className={styles.questionsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💭</span>
            {t('자기 탐색 질문', 'Self-Reflection Questions')}
          </h2>
          <div className={styles.questionsList}>
            {(isKo ? primaryOctant.therapeuticQuestionsKo : primaryOctant.therapeuticQuestions).map(
              (q, i) => (
                <div key={i} className={styles.questionItem}>
                  <span className={styles.questionBullet}>•</span>
                  <p>{q}</p>
                </div>
              )
            )}
          </div>
        </section>

        {secondaryOctant && (
          <section className={styles.secondarySection}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎭</span>
              {t('보조 스타일', 'Secondary Style')}
            </h2>
            <div className={styles.secondaryCard}>
              <div className={styles.secondaryHeader}>
                <span className={styles.secondaryCode}>{analysis.secondaryStyle}</span>
                <span className={styles.secondaryName}>
                  {isKo ? secondaryOctant.korean : secondaryOctant.name}
                </span>
              </div>
              <p className={styles.secondaryDesc}>
                {isKo ? secondaryOctant.descriptionKo : secondaryOctant.description}
              </p>
            </div>
          </section>
        )}

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
      </div>
    </main>
  )
}
