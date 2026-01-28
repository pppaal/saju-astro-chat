'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PersonaCircumplex } from '@/components/personality';
import { AxisBar, ConfettiAnimation } from '@/components/shared';
import BackButton from '@/components/ui/BackButton';
import styles from './result.module.css';
import { getTypeCodeMeanings } from './getTypeCodeMeanings';
import { usePersonaResult } from './usePersonaResult';

export default function ResultPage() {
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
  } = usePersonaResult();

  if (!mounted) {
    return (
      <main className={styles.page}>
        <div className={styles.bgGradient} />
        <div className={styles.stars}>
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className={styles.star}
              style={{
                left: `${(i * 37 + 13) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                animationDelay: `${(i * 0.05) % 3}s`,
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
              }}
            />
          ))}
        </div>
        <div className={styles.loading}>
          <div className={styles.cosmicLoader}>
            <div className={styles.cosmicRing} />
            <div className={styles.cosmicRing} />
            <div className={styles.cosmicRing} />
            <div className={styles.cosmicCore}>✨</div>
          </div>
          <p className={styles.loadingText}>{t('personality.loading', 'Loading your persona...')}</p>
          <div className={styles.loadingSubtext}>{t('personality.analyzingAura', 'Analyzing your cosmic aura...')}</div>
        </div>
      </main>
    );
  }

  if (!analysis) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✨</div>
          <h1>{t('personality.noResults', 'No Results Yet')}</h1>
          <p>{t('personality.noResultsDesc', 'Complete the personality quiz to discover your Nova Persona')}</p>
          <Link href="/personality/quiz" className={styles.ctaButton}>
            {t('personality.startQuiz', 'Start Quiz')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* Animated Background */}
      <div className={styles.bgGradient} />
      <div className={styles.stars}>
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              animationDelay: `${(i * 0.05) % 3}s`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
            }}
          />
        ))}
      </div>

      {/* Confetti Celebration */}
      {showConfetti && (
        <ConfettiAnimation particles={confettiParticles} styles={styles} />
      )}

      {/* Back Button */}
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          {/* Avatar with Aura Rings */}
          <div className={styles.avatarSection}>
            {avatarSrc && !avatarError && (
              <div className={styles.avatarWrapper}>
                {/* Aura Rings */}
                <div className={styles.auraRings}>
                  <div className={styles.auraRing1} />
                  <div className={styles.auraRing2} />
                  <div className={styles.auraRing3} />
                </div>
                <Image
                  src={avatarSrc}
                  alt={analysis.personaName}
                  width={360}
                  height={540}
                  className={styles.avatar}
                  unoptimized
                  onError={() => setAvatarError(true)}
                />
              </div>
            )}
            {/* Fallback when avatar fails to load */}
            {(!avatarSrc || avatarError) && (
              <div className={styles.avatarWrapper}>
                <div className={styles.auraRings}>
                  <div className={styles.auraRing1} />
                  <div className={styles.auraRing2} />
                  <div className={styles.auraRing3} />
                </div>
                <div className={styles.avatarFallback} aria-label={analysis.personaName}>
                  <span className={styles.avatarFallbackIcon}>✨</span>
                  <span className={styles.avatarFallbackCode}>{analysis.typeCode}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.heroContent}>
            <p className={styles.preTitle}>{t('personality.yourNovaPersona', 'Your Nova Persona')}</p>
            <h1 className={styles.personaName}>{analysis.personaName}</h1>
            <p className={styles.summary}>{analysis.summary}</p>

            <div className={styles.badgesWrapper}>
              <div className={styles.badges}>
                <div className={styles.typeCodeBadge}>
                  <span className={styles.typeCodeValue}>{analysis.typeCode}</span>
                  <span className={styles.typeCodeLabel}>{t('personality.typeCode', 'Type Code')}</span>
                </div>
                {analysis.consistencyScore !== undefined && (
                  <div className={styles.consistencyBadge}>
                    <span className={styles.consistencyValue}>{analysis.consistencyScore}%</span>
                    <span className={styles.consistencyLabel}>
                      {analysis.consistencyLabel
                        ? t(`personality.consistencyLabel.${analysis.consistencyLabel}`, analysis.consistencyLabel)
                        : t('personality.consistency', 'Consistency')}
                    </span>
                  </div>
                )}
              </div>
              {analysis.consistencyLabel && (
                <p className={styles.consistencyHint}>
                  {t(`personality.consistencyDesc.${analysis.consistencyLabel}`, '')}
                </p>
              )}
            </div>

            {/* Type Code Breakdown */}
            <div className={styles.typeCodeBreakdown}>
              {getTypeCodeMeanings(analysis.typeCode, locale).map((item, idx) => (
                <div key={idx} className={styles.codeLetterItem}>
                  <span className={styles.codeLetter}>{item.letter}</span>
                  <span className={styles.codeLetterMeaning}>{item.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Key Motivations */}
        <section className={styles.motivationsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎯</span>
            {t('personality.keyMotivations', 'Key Motivations')}
          </h2>
          <div className={styles.motivationCards}>
            {analysis.keyMotivations.map((motivation, i) => (
              <div
                key={motivation}
                className={styles.motivationCard}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={styles.motivationNumber}>{i + 1}</div>
                <p>{motivation}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Personality Axes */}
        <section className={styles.axesSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📊</span>
            {t('personality.axes', 'Personality Spectrum')}
          </h2>
          <div className={styles.axesCard}>
            <AxisBar
              label={t('personality.axis.energy', 'Energy')}
              score={analysis.axes.energy.score}
              left={t('personality.axis.grounded', 'Grounded')}
              right={t('personality.axis.radiant', 'Radiant')}
              delay={0}
              styles={styles}
            />
            <AxisBar
              label={t('personality.axis.cognition', 'Cognition')}
              score={analysis.axes.cognition.score}
              left={t('personality.axis.structured', 'Structured')}
              right={t('personality.axis.visionary', 'Visionary')}
              delay={100}
              styles={styles}
            />
            <AxisBar
              label={t('personality.axis.decision', 'Decision')}
              score={analysis.axes.decision.score}
              left={t('personality.axis.empathic', 'Empathic')}
              right={t('personality.axis.logic', 'Logic')}
              delay={200}
              styles={styles}
            />
            <AxisBar
              label={t('personality.axis.rhythm', 'Rhythm')}
              score={analysis.axes.rhythm.score}
              left={t('personality.axis.anchor', 'Anchor')}
              right={t('personality.axis.flow', 'Flow')}
              delay={300}
              styles={styles}
            />
          </div>
        </section>

        {/* Circumplex Visualization */}
        <section className={styles.circumplexSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔮</span>
            {t('personality.circumplex', 'Personality Circumplex')}
          </h2>
          <div className={styles.circumplexWrapper}>
            <PersonaCircumplex
              axes={analysis.axes}
              typeCode={analysis.typeCode}
              locale={locale}
            />
          </div>
        </section>

        {/* Traits Grid */}
        <section className={styles.traitsGrid}>
          {/* Strengths */}
          <div className={styles.traitCard}>
            <div className={styles.traitHeader}>
              <span className={styles.traitIcon}>💪</span>
              <h3>{t('personality.strengths', 'Strengths')}</h3>
            </div>
            <div className={styles.traitTags}>
              {analysis.strengths.map((s) => (
                <span key={s} className={styles.tagStrength}>{s}</span>
              ))}
            </div>
          </div>

          {/* Challenges */}
          <div className={styles.traitCard}>
            <div className={styles.traitHeader}>
              <span className={styles.traitIcon}>⚡</span>
              <h3>{t('personality.challenges', 'Growth Areas')}</h3>
            </div>
            <div className={styles.traitTags}>
              {analysis.challenges.map((c) => (
                <span key={c} className={styles.tagChallenge}>{c}</span>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div className={styles.traitCard}>
            <div className={styles.traitHeader}>
              <span className={styles.traitIcon}>🎭</span>
              <h3>{t('personality.roles', 'Ideal Roles')}</h3>
            </div>
            <div className={styles.traitTags}>
              {analysis.recommendedRoles.map((r) => (
                <span key={r} className={styles.tagRole}>{r}</span>
              ))}
            </div>
          </div>

          {/* Career */}
          <div className={styles.traitCard}>
            <div className={styles.traitHeader}>
              <span className={styles.traitIcon}>💼</span>
              <h3>{t('personality.career', 'Career Focus')}</h3>
            </div>
            <p className={styles.traitText}>{analysis.career}</p>
          </div>
        </section>

        {/* Compatibility */}
        <section className={styles.insightsSection}>
          <div className={styles.insightCard}>
            <div className={styles.insightIcon}>🤝</div>
            <h3>{t('personality.compatibility', 'Compatibility')}</h3>
            <p>{analysis.compatibilityHint}</p>
          </div>
        </section>

        {/* Growth Guide Section */}
        <section className={styles.growthSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🌱</span>
            {t('personality.growthGuide', 'Growth Guide')}
          </h2>
          <div className={styles.growthCards}>
            {analysis.growthTips.map((tip, idx) => (
              <div key={idx} className={styles.growthCard}>
                <div className={styles.growthNumber}>{idx + 1}</div>
                <div className={styles.growthContent}>
                  <p className={styles.growthTip}>{tip}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <section className={styles.actions}>
          {/* Save Button - Primary action */}
          <button
            onClick={handleSaveResult}
            className={`${styles.saveButton} ${isSavedToDb ? styles.saved : ''}`}
            disabled={saveStatus === 'saving' || isSavedToDb}
          >
            <span>
              {saveStatus === 'saving' ? '⏳' : isSavedToDb ? '✅' : authStatus === 'authenticated' ? '💾' : '🔐'}
            </span>
            {saveStatus === 'saving'
              ? t('personality.saving', 'Saving...')
              : isSavedToDb
                ? t('personality.saved', 'Saved!')
                : authStatus === 'authenticated'
                  ? t('personality.save', 'Save Result')
                  : t('personality.loginToSave', 'Login to Save')}
          </button>

          <button onClick={handleShare} className={styles.shareButton}>
            <span>📤</span> {t('personality.share', 'Share Result')}
          </button>
          <button onClick={handleDownload} className={styles.downloadButton}>
            <span>📥</span> {t('personality.download', 'Download JSON')}
          </button>
          <Link href="/personality/quiz" className={styles.retakeButton}>
            <span>🔄</span> {t('personality.retake', 'Retake Quiz')}
          </Link>
          <Link href="/personality/combined" className={styles.retakeButton}>
            <span>🔗</span> {t('personality.combined', 'Combined Analysis')}
          </Link>
        </section>
      </div>
    </main>
  );
}
