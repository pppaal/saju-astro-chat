'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import CreditBadge from '@/components/ui/CreditBadge';
import Chat from '@/components/destiny-map/Chat';
import type { PredictionContext, SajuData as ChatSajuData, AstroData as ChatAstroData } from '@/components/destiny-map/chat-types';
import FortuneDashboard from '@/components/life-prediction/FortuneDashboard';
import AdvancedAnalysisPanel from '@/components/life-prediction/AdvancedAnalysisPanel';
import { calculateSajuData } from '@/lib/Saju/saju';
import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService';
import type { MultiYearTrend } from '@/lib/prediction/life-prediction/types';
import styles from './result.module.css';
import { logger } from "@/lib/logger";
import type { SajuData, AstrologyData } from '@/types/api';

interface AdvancedAnalysisData {
  [key: string]: unknown;
}

type SearchParams = Record<string, string | string[] | undefined>;

// Analyzing Loader
function AnalyzingLoader({ locale }: { locale: string }) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  const steps = locale === 'ko'
    ? [
        { label: '사주 분석 중...', icon: '☯' },
        { label: '대운 계산 중...', icon: '🔮' },
        { label: '10년 트렌드 분석...', icon: '📊' },
        { label: '예측 보고서 생성...', icon: '✨' },
      ]
    : [
        { label: 'Analyzing Saju...', icon: '☯' },
        { label: 'Calculating Daeun...', icon: '🔮' },
        { label: 'Analyzing 10-year trend...', icon: '📊' },
        { label: 'Generating prediction...', icon: '✨' },
      ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const increment = prev < 30 ? 4 : prev < 60 ? 3 : prev < 80 ? 2 : 1;
        return Math.min(prev + increment, 95);
      });
    }, 400);

    const stepInterval = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 6000);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, [steps.length]);

  return (
    <main className={styles.loaderContainer}>
      <BackButton />
      <div className={styles.loaderCard}>
        <div className={styles.loaderIcon}>
          <span className={styles.spinningIcon}>🔮</span>
        </div>

        <h2 className={styles.loaderTitle}>
          {locale === 'ko' ? '인생 예측 분석 중' : 'Analyzing Life Prediction'}
        </h2>

        <div className={styles.progressContainer}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.progressText}>{Math.round(progress)}%</span>
        </div>

        <div className={styles.stepsContainer}>
          {steps.map((s, i) => (
            <div
              key={i}
              className={`${styles.step} ${i <= step ? styles.stepActive : ''} ${i === step ? styles.stepCurrent : ''}`}
            >
              <span className={styles.stepIcon}>{s.icon}</span>
              <span className={styles.stepLabel}>{s.label}</span>
              {i < step && <span className={styles.stepCheck}>✓</span>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function LifePredictionResultContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { locale } = useI18n();
  const sp = searchParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<MultiYearTrend | null>(null);
  const [advancedAnalysis, setAdvancedAnalysis] = useState<AdvancedAnalysisData | null>(null);
  const [saju, setSaju] = useState<SajuData | null>(null);
  const [astro, setAstro] = useState<AstrologyData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [predictionContext, setPredictionContext] = useState<PredictionContext | null>(null);

  // Parse params
  const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? '';
  const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? '';
  const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? '';
  const city = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? '';
  const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? 'Male';
  const latStr = (Array.isArray(sp.latitude) ? sp.latitude[0] : sp.latitude) ?? '';
  const lonStr = (Array.isArray(sp.longitude) ? sp.longitude[0] : sp.longitude) ?? '';
  const latitude = latStr ? Number(latStr) : NaN;
  const longitude = lonStr ? Number(lonStr) : NaN;

  // Load prediction data
  useEffect(() => {
    (async () => {
      if (!birthDate || !birthTime || isNaN(latitude) || isNaN(longitude)) {
        setError(locale === 'ko' ? '필수 정보가 누락되었습니다.' : 'Required fields are missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Calculate saju
        const sajuGender = gender === 'Female' ? 'female' : 'male';
        const sajuResult = calculateSajuData(birthDate, birthTime, sajuGender, 'solar', 'Asia/Seoul');
        setSaju(sajuResult as unknown as SajuData);

        // Calculate astrology
        const [year, month, day] = birthDate.split('-').map(Number);
        const [hour, minute] = birthTime.split(':').map(Number);
        const astroResult = await calculateNatalChart({
          year, month, date: day, hour, minute,
          latitude, longitude,
          timeZone: 'Asia/Seoul'
        });
        setAstro(astroResult as unknown as AstrologyData);

        // Extract day stem/branch for prediction
        const dayStem = sajuResult?.pillars?.day?.heavenlyStem?.name || '甲';
        const dayBranch = sajuResult?.pillars?.day?.earthlyBranch?.name || '子';
        const monthBranch = sajuResult?.pillars?.month?.earthlyBranch?.name || '子';
        const yearBranch = sajuResult?.pillars?.year?.earthlyBranch?.name || '子';
        const allStems = [
          sajuResult?.pillars?.year?.heavenlyStem?.name,
          sajuResult?.pillars?.month?.heavenlyStem?.name,
          dayStem,
          sajuResult?.pillars?.time?.heavenlyStem?.name,
        ].filter(Boolean);
        const allBranches = [
          yearBranch,
          monthBranch,
          dayBranch,
          sajuResult?.pillars?.time?.earthlyBranch?.name,
        ].filter(Boolean);

        // Get daeun data from daeWoon structure
        const daeunData = sajuResult?.daeWoon?.list || [];

        // Calculate birth year
        const birthYear = parseInt(birthDate.split('-')[0]);

        // Call life prediction API
        const response = await fetch('/api/life-prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'comprehensive',
            birthYear,
            birthMonth: parseInt(birthDate.split('-')[1]),
            birthDay: parseInt(birthDate.split('-')[2]),
            gender: sajuGender,
            dayStem,
            dayBranch,
            monthBranch,
            yearBranch,
            allStems,
            allBranches,
            daeunList: daeunData,
            yearsRange: 10,
            locale,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch prediction');
        }

        const result = await response.json();
        if (result.success && result.data?.multiYearTrend) {
          setTrend(result.data.multiYearTrend);
          // Store advanced analysis from TIER 1~3
          if (result.data.advancedAnalysis?.current) {
            setAdvancedAnalysis(result.data.advancedAnalysis.current);
          }

          // Build prediction context for AI counselor (TIER 1-10 results)
          const trendData = result.data.multiYearTrend;
          const ctx: PredictionContext = {
            eventType: 'comprehensive',
            eventLabel: locale === 'ko' ? '종합 인생 예측' : 'Comprehensive Life Prediction',
          };

          // Find optimal and avoid periods from trend data
          if (trendData?.years && Array.isArray(trendData.years)) {
            interface YearData {
              year: number;
              score?: number;
              grade?: string;
              highlights?: string[];
              keywords?: string[];
              warnings?: string[];
              cautions?: string[];
            }
            const sortedYears = [...trendData.years].sort((a: YearData, b: YearData) => (b.score || 0) - (a.score || 0));

            // Top 3 optimal years
            ctx.optimalPeriods = sortedYears.slice(0, 3).map((y: YearData) => ({
              startDate: `${y.year}-01-01`,
              endDate: `${y.year}-12-31`,
              score: y.score || 0,
              grade: y.grade || ((y.score ?? 0) >= 80 ? 'A' : (y.score ?? 0) >= 60 ? 'B' : 'C'),
              reasons: y.highlights || y.keywords || [],
            }));

            // Bottom 2 avoid years
            ctx.avoidPeriods = sortedYears.slice(-2).reverse().map((y: YearData) => ({
              startDate: `${y.year}-01-01`,
              endDate: `${y.year}-12-31`,
              score: y.score || 0,
              reasons: y.warnings || y.cautions || [],
            }));
          }

          // Add tier analysis if available
          if (result.data.advancedAnalysis) {
            ctx.tierAnalysis = {
              tier6: result.data.advancedAnalysis.tier6,
              tier7to10: result.data.advancedAnalysis.tier7to10,
            };
            if (result.data.advancedAnalysis.current?.advice) {
              ctx.advice = result.data.advancedAnalysis.current.advice;
            }
          }

          setPredictionContext(ctx);
        } else {
          throw new Error(result.error || 'Unknown error');
        }

        // Store for chat
        sessionStorage.setItem('destinyChartData', JSON.stringify({
          saju: sajuResult,
          astro: astroResult,
          timestamp: Date.now(),
        }));

      } catch (err) {
        logger.error('[LifePrediction] Error:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [birthDate, birthTime, gender, latitude, longitude, locale]);

  const handleYearClick = useCallback((year: number) => {
    setSelectedYear(year);
  }, []);

  if (loading) {
    return <AnalyzingLoader locale={locale} />;
  }

  if (error) {
    return (
      <main className={styles.errorContainer}>
        <BackButton />
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>{locale === 'ko' ? '오류가 발생했습니다' : 'An error occurred'}</h2>
          <p>{error}</p>
          <button
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            {locale === 'ko' ? '다시 시도' : 'Retry'}
          </button>
        </div>
      </main>
    );
  }

  // Build chat context message
  const chatContextMessage = selectedYear
    ? `${selectedYear}년 (${selectedYear - parseInt(birthDate.split('-')[0])}세) 운세에 대해 자세히 알려주세요.`
    : locale === 'ko'
    ? '내 인생 예측과 앞으로의 운세 흐름에 대해 상담해주세요.'
    : 'Please counsel me about my life prediction and future fortune flow.';

  return (
    <main className={styles.container}>
      <BackButton />
      <div className={styles.creditBadgeWrapper}>
        <CreditBadge variant="compact" />
      </div>

      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            {locale === 'ko' ? '🔮 인생 예측 결과' : '🔮 Life Prediction Result'}
          </h1>
          <p className={styles.subtitle}>
            {name && `${name}님의 `}
            {locale === 'ko' ? '10년간 운세 흐름' : '10-Year Fortune Flow'}
          </p>
        </header>

        {/* Fortune Dashboard */}
        {trend && (
          <FortuneDashboard
            trend={trend}
            locale={locale as 'ko' | 'en'}
            onYearClick={handleYearClick}
          />
        )}

        {/* Advanced Analysis Panel - TIER 1~3 */}
        {advancedAnalysis && (
          <section className={styles.advancedSection}>
            <AdvancedAnalysisPanel
              analysis={advancedAnalysis}
              locale={locale as 'ko' | 'en'}
            />
          </section>
        )}

        {/* Chat Section */}
        <section className={styles.chatSection}>
          <h2 className={styles.chatTitle}>
            {locale === 'ko' ? '💬 AI 상담사와 대화하기' : '💬 Chat with AI Counselor'}
          </h2>
          <p className={styles.chatSubtitle}>
            {selectedYear
              ? (locale === 'ko'
                  ? `${selectedYear}년에 대해 더 자세히 물어보세요`
                  : `Ask more about year ${selectedYear}`)
              : (locale === 'ko'
                  ? '궁금한 점을 자유롭게 물어보세요'
                  : 'Ask anything you want to know')}
          </p>

          <div className={styles.chatWrapper}>
            <Chat
              profile={{
                name,
                birthDate,
                birthTime,
                city,
                gender,
                latitude,
                longitude,
              }}
              initialContext={chatContextMessage}
              lang={locale as 'ko' | 'en'}
              theme="future"
              saju={saju as unknown as ChatSajuData | undefined}
              astro={astro as unknown as ChatAstroData | undefined}
              predictionContext={predictionContext || undefined}
              autoScroll={true}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LifePredictionResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = React.use(searchParams);

  return <LifePredictionResultContent searchParams={sp} />;
}
