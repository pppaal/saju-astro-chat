'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ICPQuizAnswers, ICPAnalysis } from '@/lib/icp/types';
import { analyzeICP } from '@/lib/icp/analysis';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import { ICPCircumplex } from '@/components/icp';
import styles from './result.module.css';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import { fetchWithRetry, FetchWithRetryError } from '@/lib/http';

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

// Axis Bar Component
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

// Octant Radar Component (simplified)
const OctantRadar = ({ scores, isKo }: { scores: Record<string, number>; isKo: boolean }) => {
  // 표준 ICP 모델 레이블과 일치 - 이모지 + 한글로 직관성 향상
  const octantLabels: Record<string, { emoji: string; en: string; ko: string }> = {
    PA: { emoji: '👑', en: 'Dominant', ko: '지배적' },
    BC: { emoji: '🏆', en: 'Competitive', ko: '경쟁적' },
    DE: { emoji: '🧊', en: 'Cold', ko: '냉담' },
    FG: { emoji: '🌙', en: 'Introverted', ko: '내향적' },
    HI: { emoji: '🕊️', en: 'Submissive', ko: '복종적' },
    JK: { emoji: '🤝', en: 'Agreeable', ko: '동조적' },
    LM: { emoji: '💗', en: 'Warm', ko: '따뜻함' },
    NO: { emoji: '🌻', en: 'Nurturant', ko: '양육적' },
  };

  const sortedOctants = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className={styles.octantRadar}>
      {sortedOctants.map(([code, score], index) => (
        <div
          key={code}
          className={`${styles.octantBar} ${index === 0 ? styles.octantBarPrimary : ''}`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className={styles.octantInfo}>
            <span className={styles.octantCode}>{octantLabels[code]?.emoji}</span>
            <span className={styles.octantName}>
              {isKo ? octantLabels[code]?.ko : octantLabels[code]?.en}
            </span>
          </div>
          <div className={styles.octantTrack}>
            <div
              className={styles.octantFill}
              style={{ width: `${score * 100}%` }}
            />
          </div>
          <span className={styles.octantScore}>{Math.round(score * 100)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function ICPResultPage() {
  const { locale } = useI18n();
  const isKo = locale === 'ko';
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [answers, setAnswers] = useState<ICPQuizAnswers>({});
  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('icpQuizAnswers');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAnswers(parsed);
      }
    } catch (error) {
      console.error('[ICP Result] Error loading answers:', error);
    }
  }, []);

  // Confetti celebration effect
  const createConfetti = useCallback(() => {
    const colors = ['#9d4edd', '#ffd166', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
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

    setTimeout(() => setShowConfetti(false), 4000);
  }, []);

  // Check if already saved to DB
  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user) {
      fetch('/api/icp')
        .then(res => res.json())
        .then(data => {
          if (data.saved) {
            setIsSavedToDb(true);
          }
        })
        .catch(() => {});
    }
  }, [authStatus, session?.user]);

  const analysis: ICPAnalysis | null = useMemo(() => {
    const hasAnswers = Object.keys(answers).length > 0;
    if (!hasAnswers) return null;
    try {
      return analyzeICP(answers, locale);
    } catch (error) {
      console.error('[ICP Result] Analysis error:', error);
      return null;
    }
  }, [answers, locale]);

  // Trigger confetti when analysis is ready
  useEffect(() => {
    if (mounted && analysis) {
      const confettiKey = `icp_confetti_shown_${analysis.primaryStyle}`;
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

  const handleSaveResult = async () => {
    if (!analysis) return;

    if (authStatus !== 'authenticated') {
      router.push(buildSignInUrl('/icp/result'));
      return;
    }

    setSaveStatus('saving');
    try {
      const res = await fetchWithRetry('/api/icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryStyle: analysis.primaryStyle,
          secondaryStyle: analysis.secondaryStyle,
          dominanceScore: analysis.dominanceScore,
          affiliationScore: analysis.affiliationScore,
          consistencyScore: analysis.consistencyScore,
          analysisData: {
            summary: isKo ? analysis.summaryKo : analysis.summary,
            octantScores: analysis.octantScores,
            primaryOctant: analysis.primaryOctant,
            secondaryOctant: analysis.secondaryOctant,
          },
        }),
      }, {
        maxRetries: 3,
        timeoutMs: 15000,
        onRetry: (attempt, error, delay) => {
          console.log(`[ICP Save] Retry ${attempt} after ${delay}ms: ${error.message}`);
        },
      });

      if (res.ok) {
        setSaveStatus('saved');
        setIsSavedToDb(true);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      if (error instanceof FetchWithRetryError) {
        console.error('[ICP Save] Failed after retries:', error.message);
      }
      setSaveStatus('error');
    }
  };

  const handleDownload = () => {
    if (!analysis) return;
    const payload = {
      answers,
      primaryStyle: analysis.primaryStyle,
      secondaryStyle: analysis.secondaryStyle,
      dominanceScore: analysis.dominanceScore,
      affiliationScore: analysis.affiliationScore,
      consistencyScore: analysis.consistencyScore,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icp_result_${analysis.primaryStyle}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!analysis) return;

    const summary = isKo ? analysis.summaryKo : analysis.summary;
    const styleName = isKo ? analysis.primaryOctant.korean : analysis.primaryOctant.name;
    const shareText = isKo
      ? `나의 대인관계 스타일: ${styleName} (${analysis.primaryStyle})\n${summary}\n\nDestinyPal.me에서 진단해보세요`
      : `My Interpersonal Style: ${styleName} (${analysis.primaryStyle})\n${summary}\n\nDiscover yours at DestinyPal.me`;

    try {
      if (navigator.share) {
        await navigator.share({ title: isKo ? '대인관계 스타일 진단' : 'Interpersonal Style', text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        alert(isKo ? '클립보드에 복사되었습니다!' : 'Copied to clipboard!');
      }
    } catch {
      navigator.clipboard.writeText(shareText);
      alert(isKo ? '클립보드에 복사되었습니다!' : 'Copied to clipboard!');
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
            <div className={styles.cosmicCore}>🎭</div>
          </div>
          <p className={styles.loadingText}>
            {isKo ? '결과를 불러오는 중...' : 'Loading your results...'}
          </p>
        </div>
      </main>
    );
  }

  if (!analysis) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎭</div>
          <h1>{isKo ? '결과 없음' : 'No Results Yet'}</h1>
          <p>
            {isKo
              ? '대인관계 스타일 진단을 완료하여 결과를 확인하세요'
              : 'Complete the ICP assessment to discover your interpersonal style'}
          </p>
          <Link href="/icp/quiz" className={styles.ctaButton}>
            {isKo ? '진단 시작하기' : 'Start Assessment'}
          </Link>
        </div>
      </main>
    );
  }

  const primaryOctant = analysis.primaryOctant;
  const secondaryOctant = analysis.secondaryOctant;

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

      {/* Confetti */}
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
          <p className={styles.preTitle}>
            {isKo ? '당신의 대인관계 스타일' : 'Your Interpersonal Style'}
          </p>
          <h1 className={styles.styleName}>
            {isKo ? primaryOctant.korean : primaryOctant.name}
          </h1>
          <div className={styles.styleCode}>{analysis.primaryStyle}</div>
          <p className={styles.summary}>
            {isKo ? analysis.summaryKo : analysis.summary}
          </p>

          <div className={styles.badges}>
            <div className={styles.consistencyBadge}>
              <span className={styles.consistencyValue}>{analysis.consistencyScore}%</span>
              <span className={styles.consistencyLabel}>
                {isKo ? '일관성' : 'Consistency'}
              </span>
            </div>
          </div>
        </section>

        {/* Axes Section */}
        <section className={styles.axesSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📊</span>
            {isKo ? '대인관계 축' : 'Interpersonal Axes'}
          </h2>
          <div className={styles.axesCard}>
            <AxisBar
              label={isKo ? '지배성' : 'Dominance'}
              score={analysis.dominanceScore}
              left={isKo ? '복종적' : 'Submissive'}
              right={isKo ? '지배적' : 'Dominant'}
              delay={0}
            />
            <AxisBar
              label={isKo ? '친화성' : 'Affiliation'}
              score={analysis.affiliationScore}
              left={isKo ? '적대적' : 'Hostile'}
              right={isKo ? '친화적' : 'Friendly'}
              delay={100}
            />
          </div>
        </section>

        {/* Circumplex Visualization */}
        <section className={styles.circumplexSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔮</span>
            {isKo ? '대인관계 원형 분석' : 'Interpersonal Circumplex'}
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

        {/* Octant Scores */}
        <section className={styles.octantSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎯</span>
            {isKo ? '8가지 스타일 점수' : '8 Octant Scores'}
          </h2>
          <OctantRadar scores={analysis.octantScores} isKo={isKo} />
        </section>

        {/* Primary Style Details */}
        <section className={styles.detailsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>✨</span>
            {isKo ? '주요 스타일 특성' : 'Primary Style Traits'}
          </h2>
          <div className={styles.traitsGrid}>
            {/* Traits */}
            <div className={styles.traitCard}>
              <div className={styles.traitHeader}>
                <span className={styles.traitIcon}>💫</span>
                <h3>{isKo ? '특성' : 'Traits'}</h3>
              </div>
              <div className={styles.traitTags}>
                {(isKo ? primaryOctant.traitsKo : primaryOctant.traits).map((trait) => (
                  <span key={trait} className={styles.tagTrait}>{trait}</span>
                ))}
              </div>
            </div>

            {/* Shadow */}
            <div className={styles.traitCard}>
              <div className={styles.traitHeader}>
                <span className={styles.traitIcon}>🌑</span>
                <h3>{isKo ? '그림자 측면' : 'Shadow Side'}</h3>
              </div>
              <p className={styles.traitText}>
                {isKo ? primaryOctant.shadowKo : primaryOctant.shadow}
              </p>
            </div>

            {/* Description */}
            <div className={styles.traitCard}>
              <div className={styles.traitHeader}>
                <span className={styles.traitIcon}>📝</span>
                <h3>{isKo ? '설명' : 'Description'}</h3>
              </div>
              <p className={styles.traitText}>
                {isKo ? primaryOctant.descriptionKo : primaryOctant.description}
              </p>
            </div>
          </div>
        </section>

        {/* Growth Recommendations */}
        <section className={styles.growthSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🌱</span>
            {isKo ? '성장을 위한 조언' : 'Growth Recommendations'}
          </h2>
          <div className={styles.growthCards}>
            {(isKo ? primaryOctant.growthRecommendationsKo : primaryOctant.growthRecommendations).map((rec, i) => (
              <div key={i} className={styles.growthCard}>
                <div className={styles.growthNumber}>{i + 1}</div>
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Therapeutic Questions */}
        <section className={styles.questionsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💭</span>
            {isKo ? '자기 탐색 질문' : 'Self-Reflection Questions'}
          </h2>
          <div className={styles.questionsList}>
            {(isKo ? primaryOctant.therapeuticQuestionsKo : primaryOctant.therapeuticQuestions).map((q, i) => (
              <div key={i} className={styles.questionItem}>
                <span className={styles.questionBullet}>•</span>
                <p>{q}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Secondary Style (if exists) */}
        {secondaryOctant && (
          <section className={styles.secondarySection}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎭</span>
              {isKo ? '보조 스타일' : 'Secondary Style'}
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

        {/* Action Buttons */}
        <section className={styles.actions}>
          <button
            onClick={handleSaveResult}
            className={`${styles.saveButton} ${isSavedToDb ? styles.saved : ''}`}
            disabled={saveStatus === 'saving' || isSavedToDb}
          >
            <span>
              {saveStatus === 'saving' ? '⏳' : isSavedToDb ? '✅' : authStatus === 'authenticated' ? '💾' : '🔐'}
            </span>
            {saveStatus === 'saving'
              ? (isKo ? '저장 중...' : 'Saving...')
              : isSavedToDb
                ? (isKo ? '저장됨!' : 'Saved!')
                : authStatus === 'authenticated'
                  ? (isKo ? '결과 저장' : 'Save Result')
                  : (isKo ? '로그인하여 저장' : 'Login to Save')}
          </button>

          <button onClick={handleShare} className={styles.shareButton}>
            <span>📤</span> {isKo ? '결과 공유' : 'Share Result'}
          </button>
          <button onClick={handleDownload} className={styles.downloadButton}>
            <span>📥</span> {isKo ? 'JSON 다운로드' : 'Download JSON'}
          </button>
          <Link href="/icp/quiz" className={styles.retakeButton}>
            <span>🔄</span> {isKo ? '다시 진단하기' : 'Retake Assessment'}
          </Link>
          <Link href="/personality/combined" className={styles.retakeButton}>
            <span>🔗</span> {isKo ? '통합 성격 분석' : 'Combined Analysis'}
          </Link>
        </section>
      </div>
    </main>
  );
}
