/**
 * Traditional Wisdom Section Component
 * Displays wisdom data from ichingWisdom library
 * @module sections/TraditionalWisdomSection
 */

import React from "react";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface TraditionalWisdomSectionProps {
  wisdomData: any;
  translate: (key: string, fallback: string) => string;
}

/**
 * Traditional Wisdom Section
 * Shows hexagram statement, core wisdom, warnings, and opportunities
 *
 * @param props - Component props
 * @returns JSX element or null if data is missing
 */
export const TraditionalWisdomSection: React.FC<TraditionalWisdomSectionProps> = React.memo(({
  wisdomData,
  translate,
}) => {
  if (!wisdomData) return null;

  return (
    <div className={styles.insightCard}>
      <div className={styles.insightHeader}>
        <span className={styles.insightIcon}>📜</span>
        <h3 className={styles.insightTitle}>
          {translate("iching.traditionalWisdom", "Traditional Wisdom")}
        </h3>
      </div>

      {/* Hexagram Statement */}
      {wisdomData.gwaeSa && (
        <div className={styles.wisdomSection}>
          <div className={styles.wisdomLabel}>
            {translate("iching.gwaeSa", "Hexagram Statement")}
          </div>
          <p className={styles.wisdomGwaeSa}>{wisdomData.gwaeSa}</p>
          <p className={styles.wisdomMeaning}>{wisdomData.meaning}</p>
        </div>
      )}

      {/* Core Wisdom */}
      {wisdomData.coreWisdom && (
        <div className={styles.wisdomSection}>
          <div className={styles.wisdomLabel}>
            💡 {translate("iching.coreWisdom", "Core Wisdom")}
          </div>
          <p className={styles.wisdomCoreText}>{wisdomData.coreWisdom}</p>
        </div>
      )}

      {/* Warnings & Opportunities */}
      <div className={styles.insightGrid}>
        {wisdomData.warnings && wisdomData.warnings.length > 0 && (
          <div className={styles.insightItem}>
            <div className={styles.insightItemHeader}>
              <span className={styles.insightItemIcon}>⚠️</span>
              <span className={styles.insightItemLabel}>
                {translate("iching.warnings", "Warnings")}
              </span>
            </div>
            <ul className={styles.wisdomList}>
              {wisdomData.warnings.map((warning: string, idx: number) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        {wisdomData.opportunities && wisdomData.opportunities.length > 0 && (
          <div className={styles.insightItem}>
            <div className={styles.insightItemHeader}>
              <span className={styles.insightItemIcon}>✨</span>
              <span className={styles.insightItemLabel}>
                {translate("iching.opportunities", "Opportunities")}
              </span>
            </div>
            <ul className={styles.wisdomList}>
              {wisdomData.opportunities.map((opp: string, idx: number) => (
                <li key={idx}>{opp}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
});

TraditionalWisdomSection.displayName = "TraditionalWisdomSection";
