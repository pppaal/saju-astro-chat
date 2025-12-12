'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AuraAnalysis, AuraQuizAnswers } from '@/lib/aura/types';
import { analyzeAura } from '@/lib/aura/analysis';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './result.module.css';

const AxisBar = ({ label, score, left, right, delay }: {
  label: string;
  score: number;
  left: string;
  right: string;
  delay: number;
}) => {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className={styles.axisBar} style={{ animationDelay: `${delay}ms` }}>
      <div className={styles.axisHeader}>
        <span className={styles.axisLabel}>{label}</span>
        <span className={styles.axisPercent}>{Math.round(pct)}%</span>
      </div>
      <div className={styles.axisTrack}>
        <div
          className={styles.axisFill}
          style={{
            width: `${pct}%`,
            animationDelay: `${delay + 200}ms`
          }}
        />
        <div className={styles.axisMarker} style={{ left: '50%' }} />
      </div>
      <div className={styles.axisPoles}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
};

export default function ResultPage() {
  const { t } = useI18n();
  const [answers, setAnswers] = useState<AuraQuizAnswers>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('auraQuizAnswers') ?? localStorage.getItem('aura_answers');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAnswers(parsed);
      }
    } catch {
      // noop
    }
  }, []);

  const analysis: AuraAnalysis | null = useMemo(() => {
    const hasAnswers = Object.keys(answers).length > 0;
    if (!hasAnswers) return null;
    try {
      return analyzeAura(answers);
    } catch {
      return null;
    }
  }, [answers]);

  const handleDownload = () => {
    if (!analysis) return;
    const payload = {
      answers,
      typeCode: analysis.typeCode,
      consistencyScore: analysis.consistencyScore,
      consistencyLabel: analysis.consistencyLabel,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova_persona_${analysis.typeCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!analysis) return;
    const shareText = `My Nova Persona: ${analysis.personaName} (${analysis.typeCode})\n${analysis.summary}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Nova Persona', text: shareText });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Copied to clipboard!');
    }
  };

  if (!mounted) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>{t('personality.loading', 'Loading your persona...')}</p>
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

      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div
            className={styles.personaOrb}
            style={{
              background: `radial-gradient(circle at 30% 30%, ${analysis.primaryColor}, ${analysis.secondaryColor})`,
              boxShadow: `0 0 60px ${analysis.primaryColor}40, 0 0 120px ${analysis.secondaryColor}20`
            }}
          >
            <span className={styles.orbIcon}>✦</span>
          </div>

          <div className={styles.heroContent}>
            <p className={styles.preTitle}>{t('personality.yourNovaPersona', 'Your Nova Persona')}</p>
            <h1 className={styles.personaName}>{analysis.personaName}</h1>
            <p className={styles.summary}>{analysis.summary}</p>

            <div className={styles.badges}>
              <div className={styles.typeCodeBadge}>
                <span className={styles.typeCodeValue}>{analysis.typeCode}</span>
                <span className={styles.typeCodeLabel}>{t('personality.typeCode', 'Type Code')}</span>
              </div>
              {analysis.consistencyScore !== undefined && (
                <div className={styles.consistencyBadge}>
                  <span className={styles.consistencyValue}>{analysis.consistencyScore}%</span>
                  <span className={styles.consistencyLabel}>
                    {analysis.consistencyLabel || t('personality.consistency', 'Consistency')}
                  </span>
                </div>
              )}
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
            />
            <AxisBar
              label={t('personality.axis.cognition', 'Cognition')}
              score={analysis.axes.cognition.score}
              left={t('personality.axis.structured', 'Structured')}
              right={t('personality.axis.visionary', 'Visionary')}
              delay={100}
            />
            <AxisBar
              label={t('personality.axis.decision', 'Decision')}
              score={analysis.axes.decision.score}
              left={t('personality.axis.empathic', 'Empathic')}
              right={t('personality.axis.logic', 'Logic')}
              delay={200}
            />
            <AxisBar
              label={t('personality.axis.rhythm', 'Rhythm')}
              score={analysis.axes.rhythm.score}
              left={t('personality.axis.anchor', 'Anchor')}
              right={t('personality.axis.flow', 'Flow')}
              delay={300}
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

        {/* Compatibility & Guidance */}
        <section className={styles.insightsSection}>
          <div className={styles.insightCard}>
            <div className={styles.insightIcon}>🤝</div>
            <h3>{t('personality.compatibility', 'Compatibility')}</h3>
            <p>{analysis.compatibilityHint}</p>
          </div>
          <div className={styles.insightCard}>
            <div className={styles.insightIcon}>🧭</div>
            <h3>{t('personality.guidance', 'Guidance')}</h3>
            <p>{analysis.guidance}</p>
          </div>
        </section>

        {/* Action Buttons */}
        <section className={styles.actions}>
          <button onClick={handleShare} className={styles.shareButton}>
            <span>📤</span> {t('personality.share', 'Share Result')}
          </button>
          <button onClick={handleDownload} className={styles.downloadButton}>
            <span>📥</span> {t('personality.download', 'Download JSON')}
          </button>
          <Link href="/personality/quiz" className={styles.retakeButton}>
            <span>🔄</span> {t('personality.retake', 'Retake Quiz')}
          </Link>
        </section>
      </div>
    </main>
  );
}
