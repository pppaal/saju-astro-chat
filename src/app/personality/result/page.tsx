'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn } from 'next-auth/react';
import type { PersonaAnalysis, PersonaQuizAnswers } from '@/lib/persona/types';
import { analyzePersona } from '@/lib/persona/analysis';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import styles from './result.module.css';

// Confetti particle type
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
}

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
  const { data: session, status: authStatus } = useSession();
  const [answers, setAnswers] = useState<PersonaQuizAnswers>({});
  const [mounted, setMounted] = useState(false);
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('personaQuizAnswers') ?? localStorage.getItem('auraQuizAnswers') ?? localStorage.getItem('aura_answers');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAnswers(parsed);
      }
      // Read gender from initial selection (personaGender or auraGender is 'male' or 'female')
      const selectedGender = localStorage.getItem('personaGender') ?? localStorage.getItem('auraGender');
      if (selectedGender === 'male') {
        setGender('M');
      } else if (selectedGender === 'female') {
        setGender('F');
      }
    } catch {
      // noop
    }
  }, []);

  // Confetti celebration effect
  const createConfetti = useCallback(() => {
    const colors = ['#a8edea', '#fed6e3', '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
    const particles: ConfettiParticle[] = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        speedY: 2 + Math.random() * 3,
        speedX: (Math.random() - 0.5) * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    setConfettiParticles(particles);
    setShowConfetti(true);

    // Stop confetti after 4 seconds
    setTimeout(() => setShowConfetti(false), 4000);
  }, []);

  // Check if already saved to DB
  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user) {
      fetch('/api/personality')
        .then(res => res.json())
        .then(data => {
          if (data.saved) {
            setIsSavedToDb(true);
          }
        })
        .catch(() => {});
    }
  }, [authStatus, session?.user]);

  const handleSaveResult = async () => {
    if (!analysis) return;

    if (authStatus !== 'authenticated') {
      // Redirect to login
      signIn(undefined, { callbackUrl: '/personality/result' });
      return;
    }

    setSaveStatus('saving');
    try {
      const res = await fetch('/api/personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeCode: analysis.typeCode,
          personaName: analysis.personaName,
          avatarGender: gender,
          energyScore: analysis.axes.energy.score,
          cognitionScore: analysis.axes.cognition.score,
          decisionScore: analysis.axes.decision.score,
          rhythmScore: analysis.axes.rhythm.score,
          consistencyScore: analysis.consistencyScore,
          analysisData: {
            summary: analysis.summary,
            keyMotivations: analysis.keyMotivations,
            strengths: analysis.strengths,
            challenges: analysis.challenges,
            recommendedRoles: analysis.recommendedRoles,
            career: analysis.career,
            compatibilityHint: analysis.compatibilityHint,
            guidance: analysis.guidance,
          },
        }),
      });

      if (res.ok) {
        setSaveStatus('saved');
        setIsSavedToDb(true);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const analysis: PersonaAnalysis | null = useMemo(() => {
    const hasAnswers = Object.keys(answers).length > 0;
    if (!hasAnswers) return null;
    try {
      return analyzePersona(answers);
    } catch {
      return null;
    }
  }, [answers]);

  // Trigger confetti when analysis is ready (only once per result)
  useEffect(() => {
    if (mounted && analysis) {
      // Check if we already showed confetti for this specific result
      const confettiKey = `confetti_shown_${analysis.typeCode}`;
      const alreadyShown = sessionStorage.getItem(confettiKey);

      if (!alreadyShown) {
        const timer = setTimeout(() => {
          createConfetti();
          sessionStorage.setItem(confettiKey, 'true');
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [mounted, analysis, createConfetti]);

  const avatarSrc = analysis ? `/images/persona/${analysis.typeCode}_${gender}.gif` : null;

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

  // Generate share card image
  const generateShareCard = async (): Promise<Blob | null> => {
    if (!analysis) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 1200;
    canvas.height = 630;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle star effect
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(168, 237, 234, ${Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Glow effect
    const glowGradient = ctx.createRadialGradient(600, 315, 0, 600, 315, 400);
    glowGradient.addColorStop(0, 'rgba(168, 237, 234, 0.15)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Brand title
    ctx.font = '600 24px "Cinzel", serif';
    ctx.fillStyle = 'rgba(168, 237, 234, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('NOVA PERSONA', 600, 80);

    // Persona name
    ctx.font = '800 64px "Cinzel", serif';
    const nameGradient = ctx.createLinearGradient(300, 150, 900, 200);
    nameGradient.addColorStop(0, '#a8edea');
    nameGradient.addColorStop(0.5, '#ffffff');
    nameGradient.addColorStop(1, '#fed6e3');
    ctx.fillStyle = nameGradient;
    ctx.fillText(analysis.personaName, 600, 200);

    // Type code badge
    ctx.font = '700 36px monospace';
    ctx.fillStyle = '#a8edea';
    ctx.fillText(analysis.typeCode, 600, 280);

    // Summary (wrap text)
    ctx.font = '400 24px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const words = analysis.summary.split(' ');
    let line = '';
    let y = 350;
    const maxWidth = 900;
    const lineHeight = 36;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), 600, y);
        line = word + ' ';
        y += lineHeight;
        if (y > 450) break; // Max 3 lines
      } else {
        line = testLine;
      }
    }
    if (line && y <= 450) {
      ctx.fillText(line.trim(), 600, y);
    }

    // Axes visualization
    const axes = [
      { label: 'Energy', score: analysis.axes.energy.score },
      { label: 'Cognition', score: analysis.axes.cognition.score },
      { label: 'Decision', score: analysis.axes.decision.score },
      { label: 'Rhythm', score: analysis.axes.rhythm.score },
    ];

    const barWidth = 200;
    const barHeight = 12;
    const startX = 200;
    const startY = 500;

    axes.forEach((axis, i) => {
      const x = startX + i * 220;

      // Track
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(x, startY, barWidth, barHeight, 6);
      ctx.fill();

      // Fill
      const fillGradient = ctx.createLinearGradient(x, startY, x + barWidth, startY);
      fillGradient.addColorStop(0, '#a8edea');
      fillGradient.addColorStop(1, '#fed6e3');
      ctx.fillStyle = fillGradient;
      ctx.beginPath();
      ctx.roundRect(x, startY, (barWidth * axis.score) / 100, barHeight, 6);
      ctx.fill();

      // Label
      ctx.font = '500 14px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(axis.label, x + barWidth / 2, startY - 10);
      ctx.fillText(`${Math.round(axis.score)}%`, x + barWidth / 2, startY + 30);
    });

    // Footer
    ctx.font = '400 18px sans-serif';
    ctx.fillStyle = 'rgba(168, 237, 234, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('DestinyPal.me', 600, 600);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  };

  const handleShare = async () => {
    if (!analysis) return;

    try {
      // Try to generate and share image
      const imageBlob = await generateShareCard();
      const shareText = `My Nova Persona: ${analysis.personaName} (${analysis.typeCode})\n${analysis.summary}\n\nDiscover yours at DestinyPal.me`;

      if (imageBlob && navigator.share && navigator.canShare) {
        const file = new File([imageBlob], 'nova-persona.png', { type: 'image/png' });
        const shareData = {
          title: 'My Nova Persona',
          text: shareText,
          files: [file],
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }

      // Fallback to text share
      if (navigator.share) {
        await navigator.share({ title: 'My Nova Persona', text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        alert(t('personality.copiedToClipboard', 'Copied to clipboard!'));
      }
    } catch {
      // User cancelled or error
      const shareText = `My Nova Persona: ${analysis.personaName} (${analysis.typeCode})\n${analysis.summary}`;
      navigator.clipboard.writeText(shareText);
      alert(t('personality.copiedToClipboard', 'Copied to clipboard!'));
    }
  };

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
        <div className={styles.confettiContainer}>
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className={styles.confetti}
              style={{
                left: `${particle.x}%`,
                backgroundColor: particle.color,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDuration: `${3 + Math.random() * 2}s`,
                animationDelay: `${particle.id * 0.02}s`,
              }}
            />
          ))}
        </div>
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
            {avatarSrc && (
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
                />
              </div>
            )}
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
        </section>
      </div>
    </main>
  );
}
