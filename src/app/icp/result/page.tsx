'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ICPQuizAnswers, ICPAnalysis, ICPOctantCode } from '@/lib/icp/types';
import { analyzeICP } from '@/lib/icp/analysis';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import { ICPCircumplex } from '@/components/icp';
import styles from './result.module.css';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import { fetchWithRetry, FetchWithRetryError } from '@/lib/http';
import {
  getDailyFortuneScore,
  calculateYearlyImportantDates,
  calculateSajuProfileFromBirthDate,
  calculateAstroProfileFromBirthDate,
  type DailyFortuneResult,
  type ImportantDate,
} from '@/lib/destiny-map/destinyCalendar';

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
    PA: { emoji: '👑', en: 'Leader', ko: '리더형' },
    BC: { emoji: '🏆', en: 'Achiever', ko: '성취형' },
    DE: { emoji: '🧊', en: 'Analyst', ko: '분석형' },
    FG: { emoji: '🌙', en: 'Observer', ko: '관찰형' },
    HI: { emoji: '🕊️', en: 'Peacemaker', ko: '평화형' },
    JK: { emoji: '🤝', en: 'Supporter', ko: '협력형' },
    LM: { emoji: '💗', en: 'Connector', ko: '친화형' },
    NO: { emoji: '🌻', en: 'Mentor', ko: '멘토형' },
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

  // Destiny-based advice states
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('');
  const [destinyAdvice, setDestinyAdvice] = useState<{
    fortune: DailyFortuneResult | null;
    growthDates: ImportantDate[];
    isLoading: boolean;
  }>({ fortune: null, growthDates: [], isLoading: false });

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('icpQuizAnswers');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAnswers(parsed);
      }
    } catch (error) {
      logger.error('[ICP Result] Error loading answers:', error);
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
    if (!hasAnswers) {return null;}
    try {
      return analyzeICP(answers, locale);
    } catch (error) {
      logger.error('[ICP Result] Analysis error:', error);
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

  // ICP 유형별 성장 카테고리 매핑
  const getGrowthCategories = (icpType: ICPOctantCode): string[] => {
    const categoryMap: Record<ICPOctantCode, string[]> = {
      PA: ['career', 'general'], // 리더형 - 커리어, 전반
      BC: ['career', 'wealth'], // 성취형 - 커리어, 재물
      DE: ['study', 'general'], // 분석형 - 학업, 전반
      FG: ['study', 'health'], // 관찰형 - 학업, 건강
      HI: ['love', 'health'], // 평화형 - 연애, 건강
      JK: ['love', 'general'], // 협력형 - 연애, 전반
      LM: ['love', 'travel'], // 친화형 - 연애, 여행
      NO: ['career', 'love'], // 멘토형 - 커리어, 연애
    };
    return categoryMap[icpType] || ['general'];
  };

  // 운명 기반 조언 생성
  const handleGenerateDestinyAdvice = useCallback(async () => {
    if (!birthDate || !analysis) {return;}

    setDestinyAdvice(prev => ({ ...prev, isLoading: true }));

    try {
      // 오늘의 운세
      const fortune = getDailyFortuneScore(birthDate, birthTime || undefined);

      // 성장에 좋은 날짜 (올해)
      const sajuProfile = calculateSajuProfileFromBirthDate(new Date(birthDate));
      const astroProfile = calculateAstroProfileFromBirthDate(new Date(birthDate));
      const growthCategories = getGrowthCategories(analysis.primaryStyle as ICPOctantCode);

      const yearlyDates = calculateYearlyImportantDates(
        new Date().getFullYear(),
        sajuProfile,
        astroProfile,
        { minGrade: 2, limit: 30 }
      );

      // ICP 유형에 맞는 날짜 필터링
      const filteredDates = yearlyDates
        .filter(d =>
          d.categories.some(cat => growthCategories.includes(cat)) ||
          d.grade <= 1
        )
        .sort((a, b) => a.grade - b.grade)
        .slice(0, 5);

      setDestinyAdvice({
        fortune,
        growthDates: filteredDates,
        isLoading: false,
      });
    } catch (error) {
      logger.error('[ICP Destiny] Error:', error);
      setDestinyAdvice(prev => ({ ...prev, isLoading: false }));
    }
  }, [birthDate, birthTime, analysis]);

  const handleSaveResult = async () => {
    if (!analysis) {return;}

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
          logger.info(`[ICP Save] Retry ${attempt} after ${delay}ms: ${error.message}`);
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
        logger.error('[ICP Save] Failed after retries:', error.message);
      }
      setSaveStatus('error');
    }
  };

  const handleDownload = () => {
    if (!analysis) {return;}
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
    if (!analysis) {return;}

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

        {/* Growth Recommendations - General Tips */}
        <section className={styles.growthSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🌱</span>
            {isKo ? '성장 팁' : 'Growth Tips'}
          </h2>
          <p className={styles.growthIntro}>
            {isKo
              ? `${primaryOctant.korean}의 핵심 성장 포인트:`
              : `Key growth points for ${primaryOctant.name}:`}
          </p>
          <div className={styles.growthCards}>
            {(isKo ? primaryOctant.growthRecommendationsKo : primaryOctant.growthRecommendations).map((rec, i) => (
              <div key={i} className={styles.growthCard}>
                <div className={styles.growthNumber}>{i + 1}</div>
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Destiny-Based Personalized Advice */}
        <section className={styles.destinySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔮</span>
            {isKo ? '운명 기반 맞춤 조언' : 'Destiny-Based Personalized Advice'}
          </h2>
          <p className={styles.destinyIntro}>
            {isKo
              ? '생년월일을 입력하면 사주와 점성술 분석을 기반으로 성장에 좋은 시기를 알려드려요.'
              : 'Enter your birth date to get personalized growth timing based on Saju and astrology analysis.'}
          </p>

          <div className={styles.destinyInputs}>
            <div className={styles.inputGroup}>
              <label htmlFor="birthDate">
                {isKo ? '생년월일' : 'Birth Date'}
              </label>
              <input
                type="date"
                id="birthDate"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={styles.dateInput}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="birthTime">
                {isKo ? '출생 시간 (선택)' : 'Birth Time (optional)'}
              </label>
              <input
                type="time"
                id="birthTime"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className={styles.timeInput}
              />
            </div>
            <button
              onClick={handleGenerateDestinyAdvice}
              disabled={!birthDate || destinyAdvice.isLoading}
              className={styles.destinyButton}
            >
              {destinyAdvice.isLoading
                ? (isKo ? '분석 중...' : 'Analyzing...')
                : (isKo ? '운명 분석하기' : 'Analyze Destiny')}
            </button>
          </div>

          {destinyAdvice.fortune && (
            <div className={styles.destinyResults}>
              {/* Today's Fortune */}
              <div className={styles.fortuneCard}>
                <h3>
                  <span>✨</span>
                  {isKo ? '오늘의 운세' : "Today's Fortune"}
                </h3>
                <div className={styles.fortuneScores}>
                  <div className={styles.fortuneScore}>
                    <span className={styles.scoreLabel}>{isKo ? '종합' : 'Overall'}</span>
                    <span className={styles.scoreValue}>{destinyAdvice.fortune.overall}점</span>
                  </div>
                  <div className={styles.fortuneScore}>
                    <span className={styles.scoreLabel}>{isKo ? '연애' : 'Love'}</span>
                    <span className={styles.scoreValue}>{destinyAdvice.fortune.love}점</span>
                  </div>
                  <div className={styles.fortuneScore}>
                    <span className={styles.scoreLabel}>{isKo ? '커리어' : 'Career'}</span>
                    <span className={styles.scoreValue}>{destinyAdvice.fortune.career}점</span>
                  </div>
                </div>
                {destinyAdvice.fortune.recommendations.length > 0 && (
                  <div className={styles.fortuneTips}>
                    <p>💡 {destinyAdvice.fortune.recommendations[0]}</p>
                  </div>
                )}
              </div>

              {/* Growth Dates */}
              {destinyAdvice.growthDates.length > 0 && (
                <div className={styles.growthDatesCard}>
                  <h3>
                    <span>📅</span>
                    {isKo
                      ? `${primaryOctant.korean} 성장에 좋은 날`
                      : `Best Days for ${primaryOctant.name} Growth`}
                  </h3>
                  <div className={styles.datesList}>
                    {destinyAdvice.growthDates.map((d, i) => (
                      <div key={i} className={styles.dateItem}>
                        <span className={styles.dateGrade}>
                          {d.grade === 0 ? '🌟' : d.grade === 1 ? '⭐' : '✨'}
                        </span>
                        <span className={styles.dateValue}>
                          {new Date(d.date).toLocaleDateString(isKo ? 'ko-KR' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </span>
                        <span className={styles.dateCategory}>
                          {d.categories.slice(0, 2).map(c => {
                            const catNames: Record<string, { ko: string; en: string }> = {
                              career: { ko: '커리어', en: 'Career' },
                              love: { ko: '연애', en: 'Love' },
                              wealth: { ko: '재물', en: 'Wealth' },
                              health: { ko: '건강', en: 'Health' },
                              study: { ko: '학업', en: 'Study' },
                              travel: { ko: '여행', en: 'Travel' },
                              general: { ko: '전반', en: 'General' },
                            };
                            return isKo ? catNames[c]?.ko || c : catNames[c]?.en || c;
                          }).join(', ')}
                        </span>
                        <span className={styles.dateScore}>{d.score}점</span>
                      </div>
                    ))}
                  </div>
                  <p className={styles.datesNote}>
                    {isKo
                      ? '* 사주와 점성술이 교차 검증된 날짜만 표시됩니다.'
                      : '* Only dates cross-verified by Saju and astrology are shown.'}
                  </p>
                </div>
              )}
            </div>
          )}
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
