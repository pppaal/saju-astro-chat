'use client'

import { motion } from 'framer-motion'
const sanitize = (
  dirty: string,
  config?: { ALLOWED_TAGS?: string[]; ALLOWED_ATTR?: string[] }
): string => {
  if (typeof window === 'undefined') return dirty

  const DOMPurify = require('dompurify')
  return String(DOMPurify.sanitize(dirty, config))
}
import CompatibilityFunInsights from '@/components/compatibility/fun-insights/CompatibilityFunInsights'
import { getScoreColor, getScoreEmoji, getGrade } from '../scoreHelpers'
import type { CompatibilityResult, Person, RelationshipType } from '../types'
import styles from '../../CompatibilityAnalyzer.module.css'

interface ResultsDisplayProps {
  result: CompatibilityResult
  person1: Person
  person2: Person
  relationshipType: RelationshipType
  showAdvanced: boolean
  setShowAdvanced: (show: boolean) => void
  locale: string
  t: (key: string, fallback: string) => string
}

export default function ResultsDisplay({
  result,
  person1,
  person2,
  relationshipType,
  showAdvanced,
  setShowAdvanced,
  locale,
  t,
}: ResultsDisplayProps) {
  const apiLocale = locale === 'ko' ? 'ko' : 'en'

  return (
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
              __html: sanitize(
                (result.aiInterpretation || result.interpretation || '')
                  .replace(/\n/g, '<br/>')
                  .replace(/##\s*(.+)/g, '<strong>$1</strong>'),
                {
                  ALLOWED_TAGS: ['br', 'strong', 'em', 'p', 'ul', 'ol', 'li'],
                  ALLOWED_ATTR: [],
                }
              ),
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
              <li key={idx} className={styles.detailItem}>
                {detail}
              </li>
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
              <li key={idx} className={styles.detailItem}>
                {detail}
              </li>
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
              <li key={idx} className={styles.detailItem}>
                {insight}
              </li>
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
              <li key={idx} className={styles.actionItem}>
                {item}
              </li>
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
  )
}
