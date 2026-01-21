// components/numerology/CompatibilityAnalyzer.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import DateTimePicker from '@/components/ui/DateTimePicker';
import TimePicker from '@/components/ui/TimePicker';
import { useI18n } from '@/i18n/I18nProvider';
import { calculateSajuData } from '@/lib/Saju/saju';
import {
  analyzeElementCompatibility,
  analyzeStemCompatibility,
  analyzeBranchCompatibility,
  analyzeDayMasterRelation,
  analyzeByCategory,
  type CompatibilityCategory,
} from '@/lib/Saju/compatibilityEngine';
import CompatibilityFunInsights from '@/components/compatibility/fun-insights/CompatibilityFunInsights';
import styles from './CompatibilityAnalyzer.module.css';
import { logger } from '@/lib/logger';
import { SCORE_THRESHOLDS } from '@/constants/scoring';

// 간단한 점성 프로필 계산 (클라이언트용)
function calculateSimpleAstroProfile(birthDate: string, birthTime: string) {
  const date = new Date(birthDate);
  const month = date.getMonth();
  const day = date.getDate();
  const [hours] = (birthTime || '12:00').split(':').map(Number);

  // 태양 별자리 계산
  const getSunSign = (): string => {
    if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) return 'aries';
    if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) return 'taurus';
    if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) return 'gemini';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) return 'cancer';
    if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) return 'leo';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'virgo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'libra';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) return 'scorpio';
    if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) return 'sagittarius';
    if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) return 'capricorn';
    if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) return 'aquarius';
    return 'pisces';
  };

  // 달 별자리 추정 (실제로는 출생 시간과 위치 기반 정밀 계산 필요)
  const getMoonSign = (): string => {
    // 간단한 추정: 태양 별자리에서 2-3칸 이동 (실제 계산 아님)
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                   'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    const sunIndex = signs.indexOf(getSunSign());
    const offset = (day % 12); // 일자 기반 오프셋
    return signs[(sunIndex + offset) % 12];
  };

  // 금성 별자리 추정 (태양에서 ±2칸 이내)
  const getVenusSign = (): string => {
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                   'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    const sunIndex = signs.indexOf(getSunSign());
    const offset = ((month + day) % 5) - 2;
    return signs[(sunIndex + offset + 12) % 12];
  };

  // 화성 별자리 추정
  const getMarsSign = (): string => {
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                   'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    const sunIndex = signs.indexOf(getSunSign());
    const offset = (date.getFullYear() % 12);
    return signs[(sunIndex + offset) % 12];
  };

  // 수성 별자리 추정 (태양에서 ±1칸 이내)
  const getMercurySign = (): string => {
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                   'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    const sunIndex = signs.indexOf(getSunSign());
    const offset = ((day % 3) - 1);
    return signs[(sunIndex + offset + 12) % 12];
  };

  // 상승궁 추정 (출생 시간 기반)
  const getAscendant = (): string => {
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                   'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    // 2시간마다 하나의 별자리 (대략적 추정)
    const ascIndex = Math.floor(hours / 2) % 12;
    const sunIndex = signs.indexOf(getSunSign());
    return signs[(sunIndex + ascIndex) % 12];
  };

  const getElement = (sign: string): string => {
    const elements: Record<string, string> = {
      aries: 'fire', leo: 'fire', sagittarius: 'fire',
      taurus: 'earth', virgo: 'earth', capricorn: 'earth',
      gemini: 'air', libra: 'air', aquarius: 'air',
      cancer: 'water', scorpio: 'water', pisces: 'water',
    };
    return elements[sign] || 'fire';
  };

  const sunSign = getSunSign();
  const moonSign = getMoonSign();
  const venusSign = getVenusSign();
  const marsSign = getMarsSign();
  const mercurySign = getMercurySign();
  const ascendant = getAscendant();

  return {
    sun: { sign: sunSign, element: getElement(sunSign) },
    moon: { sign: moonSign, element: getElement(moonSign) },
    venus: { sign: venusSign, element: getElement(venusSign) },
    mars: { sign: marsSign, element: getElement(marsSign) },
    mercury: { sign: mercurySign, element: getElement(mercurySign) },
    ascendant: { sign: ascendant, element: getElement(ascendant) },
    // 외행성은 년도 기반 추정
    jupiter: { sign: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'][date.getFullYear() % 12], element: getElement(['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'][date.getFullYear() % 12]) },
    saturn: { sign: ['capricorn', 'aquarius', 'pisces', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius'][Math.floor(date.getFullYear() / 2.5) % 12], element: getElement(['capricorn', 'aquarius', 'pisces', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius'][Math.floor(date.getFullYear() / 2.5) % 12]) },
  };
}

interface Person {
  birthDate: string;
  birthTime: string;
  name: string;
  gender?: 'male' | 'female';
}

// Simple astrology profile type (compatible with CompatibilityFunInsights AstroRawData)
interface SimpleAstroProfile {
  sun: { sign: string; element: string };
  moon: { sign: string; element: string };
  venus: { sign: string; element: string };
  mars: { sign: string; element: string };
  mercury: { sign: string; element: string };
  ascendant: { sign: string; element: string };
  jupiter: { sign: string; element: string };
  saturn: { sign: string; element: string };
  [key: string]: unknown; // Index signature for compatibility
}

// Raw Saju data type (compatible with CompatibilityFunInsights SajuRawData)
interface RawSajuData {
  yearPillar?: { heavenlyStem?: string; earthlyBranch?: string };
  monthPillar?: { heavenlyStem?: string; earthlyBranch?: string };
  dayPillar?: { heavenlyStem?: string; earthlyBranch?: string };
  timePillar?: { heavenlyStem?: string; earthlyBranch?: string };
  fiveElements?: Record<string, number>;
  dayMaster?: { name?: string; heavenlyStem?: string; element?: string };
  [key: string]: unknown; // Index signature for compatibility
}

interface PairScore {
  score: number;
  saju_details?: string[];
  astro_details?: string[];
  fusion_insights?: string[];
  element_harmony?: {
    score: number;
    details: string[];
  };
  branch_analysis?: {
    samhap?: string[];
    yukhap?: string[];
    chung?: string[];
  };
}

interface TimingAnalysis {
  yearly?: {
    score: number;
    description: string;
  };
  monthly?: {
    score: number;
    description: string;
  };
  best_periods?: string[];
  caution_periods?: string[];
}

// Frontend calculated analysis
interface FrontendSajuAnalysis {
  elementCompatibility: {
    score: number;
    harmony: string[];
    conflict: string[];
    complementary: string[];
    analysis: string;
  };
  stemCompatibility: {
    score: number;
    hapPairs: Array<{ stem1: string; stem2: string; result: string }>;
    chungPairs: Array<{ stem1: string; stem2: string }>;
    analysis: string;
  };
  branchCompatibility: {
    score: number;
    yukhapPairs: Array<{ branch1: string; branch2: string; result: string }>;
    samhapGroups: Array<{ branches: string[]; result: string }>;
    chungPairs: Array<{ branch1: string; branch2: string }>;
    analysis: string;
  };
  dayMasterRelation: {
    person1DayMaster: string;
    person2DayMaster: string;
    relation: string;
    sibsin: string;
    dynamics: string;
    score: number;
  };
  categoryScores: Array<{
    category: string;
    score: number;
    strengths: string[];
    challenges: string[];
    advice: string;
  }>;
}

interface CompatibilityResult {
  // Basic
  overall_score: number;
  average?: number;
  interpretation?: string;
  aiInterpretation?: string;

  // Advanced Saju/Astrology
  pair_score?: PairScore;
  timing?: TimingAnalysis;
  action_items?: string[];
  fusion_enabled?: boolean;

  // Frontend calculated Saju analysis
  frontendAnalysis?: FrontendSajuAnalysis;

  // Raw Saju data for Fun Insights
  person1SajuRaw?: RawSajuData;
  person2SajuRaw?: RawSajuData;

  // Raw Astrology data for Fun Insights
  person1AstroRaw?: SimpleAstroProfile;
  person2AstroRaw?: SimpleAstroProfile;

  // Legacy numerology fields
  level?: string;
  description?: string;
  life_path_comparison?: {
    person1: number;
    person2: number;
    base_score: number;
  };
  expression_comparison?: {
    person1: number;
    person2: number;
    score: number;
  };
  pairing_insight?: {
    compatibility: string;
    description: string;
  };
}

type RelationshipType = 'lover' | 'spouse' | 'friend' | 'business' | 'family';

export default function CompatibilityAnalyzer() {
  const { t, locale } = useI18n();
  const [person1, setPerson1] = useState<Person>({ birthDate: '', birthTime: '12:00', name: '', gender: undefined });
  const [person2, setPerson2] = useState<Person>({ birthDate: '', birthTime: '12:00', name: '', gender: undefined });
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('lover');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const apiLocale = locale === 'ko' ? 'ko' : 'en';

  const relationshipOptions: { value: RelationshipType; label: string }[] = [
    { value: 'lover', label: t('numerology.compatibility.relationLover', 'Romantic Partner') },
    { value: 'spouse', label: t('numerology.compatibility.relationSpouse', 'Spouse') },
    { value: 'friend', label: t('numerology.compatibility.relationFriend', 'Friend') },
    { value: 'business', label: t('numerology.compatibility.relationBusiness', 'Business Partner') },
    { value: 'family', label: t('numerology.compatibility.relationFamily', 'Family') },
  ];

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
      let person1AstroRaw: SimpleAstroProfile | undefined;
      let person2AstroRaw: SimpleAstroProfile | undefined;

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
          spouse: 'love',  // Use 'love' for spouse as well
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
        // Continue with backend-only analysis
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
        // Blend backend (60%) and frontend (40%) scores
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
        // Legacy fields for fallback UI
        description: getScoreDescription(combinedScore),
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

  const getScoreDescription = (score: number): string => {
    if (locale === 'ko') {
      if (score >= 90) return '천생연분! 최상의 궁합입니다';
      if (score >= SCORE_THRESHOLDS.EXCELLENT) return '매우 좋은 궁합입니다';
      if (score >= SCORE_THRESHOLDS.GOOD) return '좋은 궁합입니다';
      if (score >= SCORE_THRESHOLDS.AVERAGE) return '보통의 궁합입니다';
      if (score >= 50) return '노력이 필요한 궁합입니다';
      return '어려운 궁합이지만 극복 가능합니다';
    }
    if (score >= 90) return 'Perfect match! Exceptional compatibility';
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'Excellent compatibility';
    if (score >= SCORE_THRESHOLDS.GOOD) return 'Good compatibility';
    if (score >= SCORE_THRESHOLDS.AVERAGE) return 'Average compatibility';
    if (score >= 50) return 'Compatibility requires effort';
    return 'Challenging but possible with dedication';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4ade80';
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return '#60a5fa';
    if (score >= SCORE_THRESHOLDS.GOOD) return '#fbbf24';
    if (score >= SCORE_THRESHOLDS.AVERAGE) return '#fb923c';
    return '#f87171';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '💯';
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return '😍';
    if (score >= SCORE_THRESHOLDS.GOOD) return '😊';
    if (score >= SCORE_THRESHOLDS.AVERAGE) return '🙂';
    return '😐';
  };

  const getGrade = (score: number): string => {
    if (score >= 90) return 'S';
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'A';
    if (score >= SCORE_THRESHOLDS.GOOD) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Person 1 */}
        <div className={styles.personSection}>
          <h3 className={styles.personTitle}>{t('numerology.compatibility.person1', 'First Person')}</h3>
          <div className={styles.inputGroup}>
            <DateTimePicker
              value={person1.birthDate}
              onChange={(date) => setPerson1({ ...person1, birthDate: date })}
              label={t('numerology.birthdateLabel', 'Birthdate')}
              required
              locale={apiLocale}
            />
          </div>
          <div className={styles.inputGroup}>
            <TimePicker
              value={person1.birthTime}
              onChange={(time) => setPerson1({ ...person1, birthTime: time })}
              label={t('numerology.birthtimeLabel', 'Birth Time (Optional)')}
              locale={apiLocale}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>{t('numerology.compatibility.nameOptional', 'Name (Optional)')}</label>
            <input
              type="text"
              value={person1.name}
              onChange={(e) => setPerson1({ ...person1, name: e.target.value })}
              placeholder={locale === 'ko' ? '홍길동' : 'John Smith'}
              className={styles.input}
            />
          </div>
        </div>

        {/* Heart Divider */}
        <div className={styles.divider}>
          <span className={styles.heartIcon}>💕</span>
        </div>

        {/* Person 2 */}
        <div className={styles.personSection}>
          <h3 className={styles.personTitle}>{t('numerology.compatibility.person2', 'Second Person')}</h3>
          <div className={styles.inputGroup}>
            <DateTimePicker
              value={person2.birthDate}
              onChange={(date) => setPerson2({ ...person2, birthDate: date })}
              label={t('numerology.birthdateLabel', 'Birthdate')}
              required
              locale={apiLocale}
            />
          </div>
          <div className={styles.inputGroup}>
            <TimePicker
              value={person2.birthTime}
              onChange={(time) => setPerson2({ ...person2, birthTime: time })}
              label={t('numerology.birthtimeLabel', 'Birth Time (Optional)')}
              locale={apiLocale}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>{t('numerology.compatibility.nameOptional', 'Name (Optional)')}</label>
            <input
              type="text"
              value={person2.name}
              onChange={(e) => setPerson2({ ...person2, name: e.target.value })}
              placeholder={locale === 'ko' ? '홍길순' : 'Jane Doe'}
              className={styles.input}
            />
          </div>
        </div>

        {/* Relationship Type */}
        <div className={styles.relationshipSection}>
          <label className={styles.label}>{t('numerology.compatibility.relationshipType', 'Relationship Type')}</label>
          <div className={styles.relationshipButtons}>
            {relationshipOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.relationBtn} ${relationshipType === option.value ? styles.active : ''}`}
                onClick={() => setRelationshipType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <motion.button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <span className={styles.loading}>{t('common.loading', 'Loading...')}</span>
          ) : (
            t('numerology.compatibility.analyzeButton', 'Analyze Compatibility')
          )}
        </motion.button>
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className={styles.results}>
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonCircle} />
            <div className={styles.skeletonText} />
          </div>
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonTextLong} />
            <div className={styles.skeletonTextLong} />
          </div>
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonTextLong} />
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <motion.div
          className={styles.results}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Overall Score */}
          <div className={styles.scoreCard}>
            <div className={styles.scoreCircle}>
              <svg viewBox="0 0 100 100" className={styles.scoreSvg}>
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={getScoreColor(result.overall_score)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - result.overall_score / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className={styles.scoreContent}>
                <div className={styles.scoreEmoji}>{getScoreEmoji(result.overall_score)}</div>
                <div className={styles.scoreNumber}>{result.overall_score}</div>
                <div className={styles.scoreGrade}>{getGrade(result.overall_score)}</div>
              </div>
            </div>
            <h3 className={styles.compatibilityLevel}>{result.description}</h3>
            {result.fusion_enabled && (
              <span className={styles.fusionBadge}>
                ✨ {t('numerology.compatibility.sajuAstroFusion', 'Saju + Astrology Fusion')}
              </span>
            )}
          </div>

          {/* AI Interpretation */}
          {(result.interpretation || result.aiInterpretation) && (
            <div className={styles.interpretationCard}>
              <h4 className={styles.cardTitle}>
                📜 {t('numerology.compatibility.detailedAnalysis', 'Detailed Analysis')}
              </h4>
              <div
                className={styles.interpretationText}
                dangerouslySetInnerHTML={{
                  __html: (result.aiInterpretation || result.interpretation || '')
                    .replace(/\n/g, '<br/>')
                    .replace(/##\s*(.+)/g, '<strong>$1</strong>')
                }}
              />
            </div>
          )}

          {/* Saju Details */}
          {result.pair_score?.saju_details && result.pair_score.saju_details.length > 0 && (
            <div className={styles.detailCard}>
              <h4 className={styles.cardTitle}>
                🔮 {t('numerology.compatibility.sajuAnalysis', 'Four Pillars Analysis')}
              </h4>
              <ul className={styles.detailList}>
                {result.pair_score.saju_details.map((detail, idx) => (
                  <li key={idx} className={styles.detailItem}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Astrology Details */}
          {result.pair_score?.astro_details && result.pair_score.astro_details.length > 0 && (
            <div className={styles.detailCard}>
              <h4 className={styles.cardTitle}>
                ⭐ {t('numerology.compatibility.astroAnalysis', 'Astrology Analysis')}
              </h4>
              <ul className={styles.detailList}>
                {result.pair_score.astro_details.map((detail, idx) => (
                  <li key={idx} className={styles.detailItem}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Fusion Insights */}
          {result.pair_score?.fusion_insights && result.pair_score.fusion_insights.length > 0 && (
            <div className={styles.insightCard}>
              <h4 className={styles.insightTitle}>
                💡 {t('numerology.compatibility.fusionInsights', 'Fusion Insights')}
              </h4>
              <ul className={styles.detailList}>
                {result.pair_score.fusion_insights.map((insight, idx) => (
                  <li key={idx} className={styles.detailItem}>{insight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Timing Analysis */}
          {result.timing && (
            <div className={styles.timingCard}>
              <h4 className={styles.cardTitle}>
                📅 {t('numerology.compatibility.timingAnalysis', 'Timing Analysis')}
              </h4>
              {result.timing.yearly && (
                <div className={styles.timingSection}>
                  <span className={styles.timingLabel}>
                    {t('numerology.compatibility.thisYear', 'This Year')}:
                  </span>
                  <span className={styles.timingScore}>{result.timing.yearly.score}점</span>
                  <p className={styles.timingDesc}>{result.timing.yearly.description}</p>
                </div>
              )}
              {result.timing.best_periods && result.timing.best_periods.length > 0 && (
                <div className={styles.timingSection}>
                  <span className={styles.timingLabel}>
                    🌟 {t('numerology.compatibility.bestPeriods', 'Best Periods')}:
                  </span>
                  <p className={styles.timingDesc}>{result.timing.best_periods.join(', ')}</p>
                </div>
              )}
              {result.timing.caution_periods && result.timing.caution_periods.length > 0 && (
                <div className={styles.timingSection}>
                  <span className={styles.timingLabel}>
                    ⚠️ {t('numerology.compatibility.cautionPeriods', 'Caution Periods')}:
                  </span>
                  <p className={styles.timingDesc}>{result.timing.caution_periods.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Items */}
          {result.action_items && result.action_items.length > 0 && (
            <div className={styles.actionCard}>
              <h4 className={styles.cardTitle}>
                ✅ {t('numerology.compatibility.actionItems', 'Recommendations')}
              </h4>
              <ul className={styles.actionList}>
                {result.action_items.map((item, idx) => (
                  <li key={idx} className={styles.actionItem}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Fun Insights - 상세 분석 (destiny-map 스타일) */}
          {(result.person1SajuRaw || result.person2SajuRaw) && (
            <>
              <button
                type="button"
                className={styles.advancedToggle}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced
                  ? t('numerology.compatibility.hideAdvanced', 'Hide Detailed Analysis')
                  : t('numerology.compatibility.showAdvanced', 'Show Detailed Analysis')}
                <span className={`${styles.toggleArrow} ${showAdvanced ? styles.open : ''}`}>▼</span>
              </button>

              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={styles.advancedSection}
                >
                  <CompatibilityFunInsights
                    persons={[
                      {
                        name: person1.name || t('numerology.compatibility.person1', 'Person 1'),
                        date: person1.birthDate,
                        time: person1.birthTime || '12:00',
                        city: 'Seoul',
                      },
                      {
                        name: person2.name || t('numerology.compatibility.person2', 'Person 2'),
                        date: person2.birthDate,
                        time: person2.birthTime || '12:00',
                        city: 'Seoul',
                        relation: relationshipType,
                      },
                    ]}
                    person1Saju={result.person1SajuRaw}
                    person2Saju={result.person2SajuRaw}
                    person1Astro={result.person1AstroRaw}
                    person2Astro={result.person2AstroRaw}
                    lang={apiLocale}
                  />
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
