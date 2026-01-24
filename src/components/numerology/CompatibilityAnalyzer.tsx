// components/numerology/CompatibilityAnalyzer.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
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

// Extracted modules
import type {
  Person,
  RawSajuData,
  FrontendSajuAnalysis,
  CompatibilityResult,
  RelationshipType,
} from './compatibility/types';
import { calculateSimpleAstroProfile } from './compatibility/astroProfile';
import { getScoreDescription, getScoreColor, getScoreEmoji, getGrade } from './compatibility/scoreHelpers';

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
                  __html: DOMPurify.sanitize(
                    (result.aiInterpretation || result.interpretation || '')
                      .replace(/\n/g, '<br/>')
                      .replace(/##\s*(.+)/g, '<strong>$1</strong>'),
                    {
                      ALLOWED_TAGS: ['br', 'strong', 'em', 'p', 'ul', 'ol', 'li'],
                      ALLOWED_ATTR: []
                    }
                  )
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
