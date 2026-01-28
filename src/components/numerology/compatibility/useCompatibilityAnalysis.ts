"use client";

import { useState } from 'react';
import { calculateSajuData } from '@/lib/Saju/saju';
import {
  analyzeElementCompatibility,
  analyzeStemCompatibility,
  analyzeBranchCompatibility,
  analyzeDayMasterRelation,
  analyzeByCategory,
  type CompatibilityCategory,
} from '@/lib/Saju/compatibilityEngine';
import { logger } from '@/lib/logger';
import type {
  Person,
  RawSajuData,
  FrontendSajuAnalysis,
  CompatibilityResult,
  RelationshipType,
} from './types';
import { calculateSimpleAstroProfile } from './astroProfile';
import { getScoreDescription } from './scoreHelpers';

interface UseCompatibilityAnalysisOptions {
  person1: Person;
  person2: Person;
  relationshipType: RelationshipType;
  locale: string;
  t: (key: string, fallback: string) => string;
}

interface UseCompatibilityAnalysisReturn {
  result: CompatibilityResult | null;
  isLoading: boolean;
  error: string | null;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useCompatibilityAnalysis({
  person1, person2, relationshipType, locale, t,
}: UseCompatibilityAnalysisOptions): UseCompatibilityAnalysisReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const apiLocale = locale === 'ko' ? 'ko' : 'en';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!person1.birthDate || !person2.birthDate) {
      setError(t('numerology.compatibility.errorBothDates', 'Please enter birth dates for both people.'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // ===== Frontend Saju & Astrology Calculation =====
      let frontendAnalysis: FrontendSajuAnalysis | undefined;
      let person1SajuRaw: RawSajuData | undefined;
      let person2SajuRaw: RawSajuData | undefined;
      let person1AstroRaw = undefined;
      let person2AstroRaw = undefined;

      try {
        // Calculate Astrology for both persons
        person1AstroRaw = calculateSimpleAstroProfile(person1.birthDate, person1.birthTime || '12:00');
        person2AstroRaw = calculateSimpleAstroProfile(person2.birthDate, person2.birthTime || '12:00');
      } catch (astroErr) {
        logger.warn('[Compatibility] Astrology calculation failed:', astroErr);
      }

      try {
        // Calculate Saju for both persons
        const saju1 = calculateSajuData(
          person1.birthDate,
          person1.birthTime || '12:00',
          person1.gender || 'male',
          'solar',
          'Asia/Seoul'
        );

        const saju2 = calculateSajuData(
          person2.birthDate,
          person2.birthTime || '12:00',
          person2.gender || 'female',
          'solar',
          'Asia/Seoul'
        );

        // Convert to RawSajuData format for Fun Insights
        const toRawSajuData = (saju: typeof saju1): RawSajuData => ({
          yearPillar: { heavenlyStem: saju.yearPillar.heavenlyStem.name, earthlyBranch: saju.yearPillar.earthlyBranch.name },
          monthPillar: { heavenlyStem: saju.monthPillar.heavenlyStem.name, earthlyBranch: saju.monthPillar.earthlyBranch.name },
          dayPillar: { heavenlyStem: saju.dayPillar.heavenlyStem.name, earthlyBranch: saju.dayPillar.earthlyBranch.name },
          timePillar: { heavenlyStem: saju.timePillar.heavenlyStem.name, earthlyBranch: saju.timePillar.earthlyBranch.name },
          fiveElements: saju.fiveElements,
          dayMaster: { name: saju.dayMaster.name, element: saju.dayMaster.element },
        });

        person1SajuRaw = toRawSajuData(saju1);
        person2SajuRaw = toRawSajuData(saju2);

        // Use pillars from CalculateSajuDataResult for compatibility engine
        const pillars1 = saju1.pillars;
        const pillars2 = saju2.pillars;

        // Run compatibility analysis
        const elementCompat = analyzeElementCompatibility(pillars1, pillars2);
        const stemCompat = analyzeStemCompatibility(pillars1, pillars2);
        const branchCompat = analyzeBranchCompatibility(pillars1, pillars2);
        const dayMasterRelation = analyzeDayMasterRelation(pillars1, pillars2);

        // Analyze by relationship category
        const categoryMap: Record<RelationshipType, CompatibilityCategory> = {
          lover: 'love',
          spouse: 'love',
          friend: 'friendship',
          business: 'business',
          family: 'family',
        };
        const categoryAnalysis = analyzeByCategory(pillars1, pillars2, categoryMap[relationshipType]);

        frontendAnalysis = {
          elementCompatibility: elementCompat,
          stemCompatibility: stemCompat,
          branchCompatibility: branchCompat,
          dayMasterRelation,
          categoryScores: [categoryAnalysis],
        };
      } catch (sajuErr) {
        logger.warn('[Compatibility] Frontend Saju calculation failed:', sajuErr);
      }

      // ===== Backend API Call (GPT + Fusion) =====
      const response = await fetch('/api/compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Token': 'public',
        },
        body: JSON.stringify({
          persons: [
            {
              name: person1.name || t('numerology.compatibility.person1', 'First Person'),
              date: person1.birthDate,
              time: person1.birthTime || '12:00',
              city: 'Seoul',
              latitude: 37.5665,
              longitude: 126.9780,
              timeZone: 'Asia/Seoul',
            },
            {
              name: person2.name || t('numerology.compatibility.person2', 'Second Person'),
              date: person2.birthDate,
              time: person2.birthTime || '12:00',
              city: 'Seoul',
              latitude: 37.5665,
              longitude: 126.9780,
              timeZone: 'Asia/Seoul',
              relationToP1: relationshipType === 'spouse' ? 'lover' : relationshipType === 'business' || relationshipType === 'family' ? 'other' : relationshipType,
              relationNoteToP1: relationshipType === 'business' ? '사업 파트너' : relationshipType === 'family' ? '가족' : undefined,
            }
          ],
          locale: apiLocale,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('numerology.compatibility.errorRequest', 'Failed to analyze compatibility.'));
      }

      const data = await response.json();

      // Calculate combined score (weighted average of backend and frontend)
      let combinedScore = data.overall_score || data.average || 70;
      if (frontendAnalysis) {
        const frontendScore = Math.round(
          (frontendAnalysis.elementCompatibility.score * 0.25 +
           frontendAnalysis.stemCompatibility.score * 0.2 +
           frontendAnalysis.branchCompatibility.score * 0.2 +
           frontendAnalysis.dayMasterRelation.score * 0.2 +
           (frontendAnalysis.categoryScores[0]?.score || 70) * 0.15)
        );
        combinedScore = Math.round(combinedScore * 0.6 + frontendScore * 0.4);
      }

      // Transform response to our result format
      const transformedResult: CompatibilityResult = {
        overall_score: combinedScore,
        average: data.average,
        interpretation: data.interpretation,
        aiInterpretation: data.aiInterpretation,
        pair_score: data.pair_score,
        timing: data.timing,
        action_items: data.action_items || [],
        fusion_enabled: data.fusion_enabled || !!frontendAnalysis,
        frontendAnalysis,
        person1SajuRaw,
        person2SajuRaw,
        person1AstroRaw,
        person2AstroRaw,
        description: getScoreDescription(combinedScore, locale),
      };

      setResult(transformedResult);
      setShowAdvanced(true);

    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError(t('numerology.compatibility.errorNetwork', 'Please check your network connection.'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('numerology.compatibility.errorGeneral', 'An error occurred. Please try again.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    result,
    isLoading,
    error,
    showAdvanced,
    setShowAdvanced,
    handleSubmit,
  };
}
