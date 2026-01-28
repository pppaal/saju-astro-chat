'use client';

import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import { ICPCircumplex } from '@/components/icp';
import { AxisBar, ConfettiAnimation } from '@/components/shared';
import OctantRadar from './OctantRadar';
import useICPResult from './useICPResult';
import useDestinyAdvice from './useDestinyAdvice';
import styles from './result.module.css';
import {
  StarsBackground, LoadingScreen, EmptyState,
  PrimaryStyleDetails, DestinyAdviceSection, ResultActions,
} from './components';

export default function ICPResultPage() {
  const { locale } = useI18n();
  const isKo = locale === 'ko';
  const {
    mounted, analysis, authStatus, saveStatus,
    isSavedToDb, showConfetti, confettiParticles,
    handleSaveResult, handleDownload, handleShare,
  } = useICPResult(locale);
  const {
    birthDate, setBirthDate, birthTime, setBirthTime,
    destinyAdvice, handleGenerateDestinyAdvice,
  } = useDestinyAdvice(analysis);

  if (!mounted) return <LoadingScreen styles={styles} isKo={isKo} />;
  if (!analysis) return <EmptyState styles={styles} isKo={isKo} />;

  const { primaryOctant, secondaryOctant } = analysis;
  const t = (ko: string, en: string) => (isKo ? ko : en);

  return (
    <main className={styles.page}>
      <StarsBackground styles={styles} />
      {showConfetti && <ConfettiAnimation particles={confettiParticles} styles={styles} />}
      <div className={styles.backButton}><BackButton /></div>

      <div className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.preTitle}>{t('당신의 대인관계 스타일', 'Your Interpersonal Style')}</p>
          <h1 className={styles.styleName}>{isKo ? primaryOctant.korean : primaryOctant.name}</h1>
          <div className={styles.styleCode}>{analysis.primaryStyle}</div>
          <p className={styles.summary}>{isKo ? analysis.summaryKo : analysis.summary}</p>
          <div className={styles.badges}>
            <div className={styles.consistencyBadge}>
              <span className={styles.consistencyValue}>{analysis.consistencyScore}%</span>
              <span className={styles.consistencyLabel}>{t('일관성', 'Consistency')}</span>
            </div>
          </div>
        </section>

        <section className={styles.axesSection}>
          <h2 className={styles.sectionTitle}><span className={styles.sectionIcon}>📊</span>{t('대인관계 축', 'Interpersonal Axes')}</h2>
          <div className={styles.axesCard}>
            <AxisBar label={t('지배성', 'Dominance')} score={analysis.dominanceScore} left={t('복종적', 'Submissive')} right={t('지배적', 'Dominant')} delay={0} styles={styles} />
            <AxisBar label={t('친화성', 'Affiliation')} score={analysis.affiliationScore} left={t('적대적', 'Hostile')} right={t('친화적', 'Friendly')} delay={100} styles={styles} />
          </div>
        </section>

        <section className={styles.circumplexSection}>
          <h2 className={styles.sectionTitle}><span className={styles.sectionIcon}>🔮</span>{t('대인관계 원형 분석', 'Interpersonal Circumplex')}</h2>
          <div className={styles.circumplexWrapper}>
            <ICPCircumplex primaryStyle={analysis.primaryStyle} secondaryStyle={analysis.secondaryStyle ?? undefined} octantScores={analysis.octantScores} dominanceScore={(analysis.dominanceScore - 50) / 50} affiliationScore={(analysis.affiliationScore - 50) / 50} />
          </div>
        </section>

        <section className={styles.octantSection}>
          <h2 className={styles.sectionTitle}><span className={styles.sectionIcon}>🎯</span>{t('8가지 스타일 점수', '8 Octant Scores')}</h2>
          <OctantRadar scores={analysis.octantScores} isKo={isKo} />
        </section>

        <PrimaryStyleDetails styles={styles} isKo={isKo} primaryOctant={primaryOctant} />

        <section className={styles.growthSection}>
          <h2 className={styles.sectionTitle}><span className={styles.sectionIcon}>🌱</span>{t('성장 팁', 'Growth Tips')}</h2>
          <p className={styles.growthIntro}>{t(`${primaryOctant.korean}의 핵심 성장 포인트:`, `Key growth points for ${primaryOctant.name}:`)}</p>
          <div className={styles.growthCards}>
            {(isKo ? primaryOctant.growthRecommendationsKo : primaryOctant.growthRecommendations).map((rec, i) => (
              <div key={i} className={styles.growthCard}><div className={styles.growthNumber}>{i + 1}</div><p>{rec}</p></div>
            ))}
          </div>
        </section>

        <DestinyAdviceSection styles={styles} isKo={isKo} primaryOctantLabel={isKo ? primaryOctant.korean : primaryOctant.name} birthDate={birthDate} setBirthDate={setBirthDate} birthTime={birthTime} setBirthTime={setBirthTime} isLoading={destinyAdvice.isLoading} fortune={destinyAdvice.fortune} growthDates={destinyAdvice.growthDates} onGenerate={handleGenerateDestinyAdvice} />

        <section className={styles.questionsSection}>
          <h2 className={styles.sectionTitle}><span className={styles.sectionIcon}>💭</span>{t('자기 탐색 질문', 'Self-Reflection Questions')}</h2>
          <div className={styles.questionsList}>
            {(isKo ? primaryOctant.therapeuticQuestionsKo : primaryOctant.therapeuticQuestions).map((q, i) => (
              <div key={i} className={styles.questionItem}><span className={styles.questionBullet}>•</span><p>{q}</p></div>
            ))}
          </div>
        </section>

        {secondaryOctant && (
          <section className={styles.secondarySection}>
            <h2 className={styles.sectionTitle}><span className={styles.sectionIcon}>🎭</span>{t('보조 스타일', 'Secondary Style')}</h2>
            <div className={styles.secondaryCard}>
              <div className={styles.secondaryHeader}>
                <span className={styles.secondaryCode}>{analysis.secondaryStyle}</span>
                <span className={styles.secondaryName}>{isKo ? secondaryOctant.korean : secondaryOctant.name}</span>
              </div>
              <p className={styles.secondaryDesc}>{isKo ? secondaryOctant.descriptionKo : secondaryOctant.description}</p>
            </div>
          </section>
        )}

        <ResultActions styles={styles} isKo={isKo} authStatus={authStatus} saveStatus={saveStatus} isSavedToDb={isSavedToDb} onSave={handleSaveResult} onShare={handleShare} onDownload={handleDownload} />
      </div>
    </main>
  );
}
