/**
 * useLifePredictionAPI Hook
 *
 * Handles API calls for life prediction analysis.
 * Includes backend RAG prediction with fallback to frontend calculation.
 */

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector';
import { TimingPeriod } from '@/components/life-prediction/ResultCards/TimingCard';
import { UserProfile, GuestBirthInfo } from './useLifePredictionProfile';

/**
 * Birth info for prediction API
 */
interface BirthInfo {
  birthDate: string;
  birthTime: string;
  gender: 'M' | 'F';
}

/**
 * Prediction result from API
 */
interface PredictionResult {
  periods: TimingPeriod[];
  generalAdvice: string;
}

/**
 * Return type for useLifePredictionAPI hook
 */
export interface UseLifePredictionAPIReturn {
  /** Submit prediction request */
  handleSubmit: (
    question: string,
    eventType: EventType | null
  ) => Promise<PredictionResult | null>;
}

/**
 * Hook to handle life prediction API calls
 *
 * @param userProfile - User profile (authenticated users)
 * @param guestBirthInfo - Guest birth info (non-authenticated users)
 * @param locale - Current locale
 * @param onError - Error callback
 * @returns API handler
 *
 * @example
 * ```tsx
 * const { handleSubmit } = useLifePredictionAPI(
 *   userProfile,
 *   guestBirthInfo,
 *   locale,
 *   setError
 * );
 * ```
 */
export function useLifePredictionAPI(
  userProfile: UserProfile | null,
  guestBirthInfo: GuestBirthInfo | null,
  locale: string,
  onError: (error: string) => void
): UseLifePredictionAPIReturn {
  /**
   * Fallback prediction using frontend API
   */
  const handleFallbackPrediction = useCallback(
    async (
      question: string,
      eventType: EventType | null,
      birthInfo: BirthInfo
    ): Promise<PredictionResult | null> => {
      try {
        // AI question analysis
        let analyzedEventType = eventType;
        let eventLabel = '';
        try {
          const analyzeRes = await fetch('/api/life-prediction/analyze-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, locale }),
          });
          const analyzeData = await analyzeRes.json();
          if (analyzeData.success && analyzeData.data) {
            analyzedEventType = analyzeData.data.eventType as EventType;
            eventLabel = analyzeData.data.eventLabel;
          }
        } catch (e) {
          logger.warn('AI question analysis failed:', e);
          analyzedEventType = eventType || 'career';
        }

        // Parse birth date
        const [birthYear, birthMonth, birthDay] = birthInfo.birthDate
          .split('-')
          .map(Number);
        const gender = birthInfo.gender === 'M' ? 'male' : 'female';
        const currentYear = new Date().getFullYear();

        // Calculate saju + astro chart (no credit cost)
        let chartData: {
          saju?: Record<string, unknown>;
          astro?: Record<string, unknown>;
          advancedAstro?: Record<string, unknown>;
        } | null = null;

        try {
          const defaultLat = 37.5665;
          const defaultLon = 126.978;

          const chartRes = await fetch('/api/precompute-chart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              birthDate: birthInfo.birthDate,
              birthTime: birthInfo.birthTime || '12:00',
              gender: birthInfo.gender,
              latitude: defaultLat,
              longitude: defaultLon,
              timezone: 'Asia/Seoul',
            }),
          });
          const chartResult = await chartRes.json();
          if (chartResult.saju) {
            chartData = {
              saju: chartResult.saju,
              astro: chartResult.astro,
              advancedAstro: chartResult.advancedAstro,
            };
          }
        } catch (e) {
          logger.warn('Chart calculation failed:', e);
        }

        // Extract saju data
        const sajuData = chartData?.saju as Record<string, unknown> | null;

        if (!sajuData) {
          // Fallback: simple default result
          const periods: TimingPeriod[] = [
            {
              startDate: `${currentYear + 1}-03-01`,
              endDate: `${currentYear + 1}-05-31`,
              score: 75,
              grade: 'B' as const,
              reasons: ['✨ 전반적으로 좋은 시기입니다', '🌱 새로운 시작에 적합한 에너지'],
            },
          ];
          return { periods, generalAdvice: '' };
        }

        const pillars = (sajuData as Record<string, unknown>).pillars as
          | Record<string, any>
          | undefined;
        if (!pillars) {
          const periods: TimingPeriod[] = [
            {
              startDate: `${currentYear + 1}-03-01`,
              endDate: `${currentYear + 1}-05-31`,
              score: 75,
              grade: 'B' as const,
              reasons: ['✨ 전반적으로 좋은 시기입니다', '🌱 새로운 시작에 적합한 에너지'],
            },
          ];
          return { periods, generalAdvice: '' };
        }

        const yearPillar = pillars.year as Record<string, any>;
        const monthPillar = pillars.month as Record<string, any>;
        const dayPillar = pillars.day as Record<string, any>;
        const timePillar = pillars.time as Record<string, any>;

        // Extract stem/branch names
        const dayStem =
          dayPillar.heavenlyStem?.name || dayPillar.stem?.name || '';
        const dayBranch =
          dayPillar.earthlyBranch?.name || dayPillar.branch?.name || '';
        const monthBranch =
          monthPillar.earthlyBranch?.name || monthPillar.branch?.name || '';
        const yearBranch =
          yearPillar.earthlyBranch?.name || yearPillar.branch?.name || '';

        // Collect all stems/branches
        const allStems = [
          yearPillar.heavenlyStem?.name || yearPillar.stem?.name,
          monthPillar.heavenlyStem?.name || monthPillar.stem?.name,
          dayPillar.heavenlyStem?.name || dayPillar.stem?.name,
          timePillar.heavenlyStem?.name || timePillar.stem?.name,
        ].filter(Boolean);

        const allBranches = [
          yearPillar.earthlyBranch?.name || yearPillar.branch?.name,
          monthPillar.earthlyBranch?.name || monthPillar.branch?.name,
          dayPillar.earthlyBranch?.name || dayPillar.branch?.name,
          timePillar.earthlyBranch?.name || timePillar.branch?.name,
        ].filter(Boolean);

        if (!dayStem || !dayBranch) {
          logger.warn('Missing required saju data:', { dayStem, dayBranch });
          const periods: TimingPeriod[] = [
            {
              startDate: `${currentYear + 1}-03-01`,
              endDate: `${currentYear + 1}-05-31`,
              score: 75,
              grade: 'B' as const,
              reasons: ['✨ 전반적으로 좋은 시기입니다', '🌱 새로운 시작에 적합한 에너지'],
            },
          ];
          return { periods, generalAdvice: '' };
        }

        // Extract astro data
        const astroData = chartData?.astro as Record<string, unknown> | null;
        const advancedAstroData = chartData?.advancedAstro as
          | Record<string, unknown>
          | null;

        // Call frontend prediction API
        const response = await fetch('/api/life-prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'event-timing',
            birthYear,
            birthMonth,
            birthDay,
            gender,
            dayStem,
            dayBranch,
            monthBranch,
            yearBranch,
            allStems,
            allBranches,
            eventType: analyzedEventType || 'career',
            startYear: currentYear,
            endYear: currentYear + 3,
            locale,
            astroChart: astroData,
            advancedAstro: advancedAstroData,
          }),
        });

        const data = await response.json();

        if (data.success && data.data?.optimalPeriods) {
          // Try AI explanation
          let aiExplainedPeriods = null;
          try {
            const explainRes = await fetch('/api/life-prediction/explain-results', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question,
                eventType: analyzedEventType || 'career',
                eventLabel: eventLabel || (analyzedEventType || 'career'),
                optimalPeriods: data.data.optimalPeriods,
                locale,
              }),
            });
            const explainData = await explainRes.json();
            if (explainData.success && explainData.data?.periods) {
              aiExplainedPeriods = explainData.data.periods;
            }
          } catch {
            logger.warn('AI explanation failed, using raw results');
          }

          const periods: TimingPeriod[] = data.data.optimalPeriods.map(
            (
              p: {
                startDate: string;
                endDate: string;
                score: number;
                grade: string;
                reasons: string[];
                specificDays?: string[];
              },
              index: number
            ) => ({
              startDate: p.startDate,
              endDate: p.endDate,
              score: p.score,
              grade: p.grade as 'S' | 'A+' | 'A' | 'B' | 'C' | 'D',
              reasons:
                aiExplainedPeriods?.[index]?.reasons ||
                p.reasons || ['✨ 좋은 시기입니다'],
              specificDays: p.specificDays?.map((dateStr: string) => ({
                date: dateStr,
                quality: (p.score >= 85
                  ? 'excellent'
                  : p.score >= 70
                  ? 'good'
                  : 'neutral') as 'excellent' | 'good' | 'neutral',
              })),
            })
          );

          return { periods, generalAdvice: '' };
        } else {
          throw new Error(data.error || 'Fallback API failed');
        }
      } catch (err) {
        logger.error('Fallback prediction failed:', err);
        throw err;
      }
    },
    [locale]
  );

  /**
   * Main submit handler - tries backend first, then fallback
   */
  const handleSubmit = useCallback(
    async (
      question: string,
      eventType: EventType | null
    ): Promise<PredictionResult | null> => {
      // Get birth info
      const birthInfo = userProfile?.birthDate
        ? {
            birthDate: userProfile.birthDate,
            birthTime: userProfile.birthTime || '12:00',
            gender: (userProfile.gender || 'M') as 'M' | 'F',
          }
        : guestBirthInfo;

      if (!birthInfo?.birthDate) {
        onError(
          locale === 'ko'
            ? '먼저 생년월일 정보가 필요합니다.'
            : 'Please enter your birth information first.'
        );
        return null;
      }

      try {
        // Parse birth date
        const [birthYear, birthMonth, birthDay] = birthInfo.birthDate
          .split('-')
          .map(Number);
        const [birthHour] = (birthInfo.birthTime || '12:00').split(':').map(Number);
        const gender = birthInfo.gender === 'M' ? 'male' : 'female';

        // Try backend RAG prediction first
        const response = await fetch('/api/life-prediction/backend-predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            birthYear,
            birthMonth,
            birthDay,
            birthHour,
            gender,
            type: 'timing',
            locale,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // Backend unavailable, use fallback
          logger.warn('Backend unavailable or error, using fallback. Error:', data.error);
          return await handleFallbackPrediction(question, eventType, birthInfo);
        }

        // Backend response successful
        if (data.data?.optimalPeriods) {
          const periods: TimingPeriod[] = data.data.optimalPeriods.map(
            (p: {
              startDate: string;
              endDate: string;
              score: number;
              grade: string;
              reasons: string[];
              specificDays?: string[];
              rank?: number;
            }) => ({
              startDate: p.startDate,
              endDate: p.endDate,
              score: p.score,
              grade: p.grade as 'S' | 'A+' | 'A' | 'B' | 'C' | 'D',
              reasons: p.reasons || ['✨ 좋은 시기입니다'],
              specificDays: p.specificDays?.map((dateStr: string) => ({
                date: dateStr,
                quality: (p.score >= 85
                  ? 'excellent'
                  : p.score >= 70
                  ? 'good'
                  : 'neutral') as 'excellent' | 'good' | 'neutral',
              })),
            })
          );

          const generalAdvice =
            data.data.generalAdvice || data.data.naturalAnswer || '';

          return { periods, generalAdvice };
        }

        return null;
      } catch (err) {
        logger.error('Prediction failed:', err);
        onError(
          locale === 'ko'
            ? '예측 분석 중 오류가 발생했습니다. 다시 시도해주세요.'
            : 'An error occurred during analysis. Please try again.'
        );
        return null;
      }
    },
    [
      userProfile,
      guestBirthInfo,
      locale,
      onError,
      handleFallbackPrediction,
    ]
  );

  return {
    handleSubmit,
  };
}
