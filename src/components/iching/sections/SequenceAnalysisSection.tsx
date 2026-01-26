/**
 * Sequence Analysis Section Component
 * Displays sequence and pattern analysis from ichingPatterns
 * @module sections/SequenceAnalysisSection
 */

import React from "react";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface SequenceAnalysisSectionProps {
  sequenceData: any;
  xuguaPairData: any;
  lang: "ko" | "en";
  translate: (key: string, fallback: string) => string;
}

/**
 * Sequence Analysis Section
 * Shows position in I Ching, lifecycle stage, and related hexagrams
 *
 * @param props - Component props
 * @returns JSX element or null if data is missing
 */
export const SequenceAnalysisSection: React.FC<SequenceAnalysisSectionProps> = React.memo(({
  sequenceData,
  xuguaPairData,
  lang,
  translate,
}) => {
  if (!sequenceData) {return null;}

  return (
    <div className={styles.insightCard}>
      <div className={styles.insightHeader}>
        <span className={styles.insightIcon}>🔄</span>
        <h3 className={styles.insightTitle}>
          {translate("iching.sequenceAnalysis", "Sequence Analysis")}
        </h3>
      </div>

      <div className={styles.wisdomSection}>
        <div className={styles.wisdomLabel}>
          📍 {translate("iching.position", "Position in I Ching")}
        </div>
        <p className={styles.wisdomCoreText}>
          {lang === "ko"
            ? `제 ${sequenceData.position}괘 - ${sequenceData.lifecycleStage}`
            : `Hexagram #${sequenceData.position} - ${sequenceData.lifecycleStage}`}
        </p>
        <p className={styles.wisdomMeaning}>{sequenceData.sequenceMeaning}</p>
      </div>

      <div className={styles.insightGrid}>
        {sequenceData.前괘 && (
          <div className={styles.insightItem}>
            <div className={styles.insightItemHeader}>
              <span className={styles.insightItemIcon}>⬅️</span>
              <span className={styles.insightItemLabel}>
                {translate("iching.preceding", "Preceding")}
              </span>
            </div>
            <p className={styles.sequenceTransition}>
              #{sequenceData.前괘.number} {sequenceData.前괘.name}
            </p>
          </div>
        )}
        {sequenceData.後괘 && (
          <div className={styles.insightItem}>
            <div className={styles.insightItemHeader}>
              <span className={styles.insightItemIcon}>➡️</span>
              <span className={styles.insightItemLabel}>
                {translate("iching.following", "Following")}
              </span>
            </div>
            <p className={styles.sequenceTransition}>
              #{sequenceData.後괘.number} {sequenceData.後괘.name}
            </p>
          </div>
        )}
      </div>

      {xuguaPairData && (
        <div className={styles.wisdomSection}>
          <div className={styles.wisdomLabel}>
            🔗 {translate("iching.xuguaPair", "Xugua Pair")} ({xuguaPairData.relationship})
          </div>
          <p className={styles.wisdomMeaning}>
            {xuguaPairData.meaning}
          </p>
        </div>
      )}
    </div>
  );
});

SequenceAnalysisSection.displayName = "SequenceAnalysisSection";
