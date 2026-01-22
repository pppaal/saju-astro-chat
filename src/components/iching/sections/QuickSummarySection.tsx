/**
 * Quick Summary Section Component
 * Displays one-liner summary and keywords
 * @module sections/QuickSummarySection
 */

import React from "react";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface QuickSummarySectionProps {
  enhancedData: any;
  translate: (key: string, fallback: string) => string;
}

/**
 * Quick Summary Section
 * Shows brief summary and keyword tags
 *
 * @param props - Component props
 * @returns JSX element or null if data is missing
 */
export const QuickSummarySection: React.FC<QuickSummarySectionProps> = React.memo(({
  enhancedData,
  translate,
}) => {
  if (!enhancedData?.quickSummary) return null;

  return (
    <>
      <div className={styles.quickSummarySection}>
        <div className={styles.sectionLabel}>
          {enhancedData.visualImagery.emoji} {translate("iching.quickSummary", "Quick Summary")}
        </div>
        <p className={styles.oneLiner}>
          {enhancedData.quickSummary.oneLiner}
        </p>
        <div className={styles.keywords}>
          {enhancedData.quickSummary.keywords.map((keyword: string, idx: number) => (
            <span key={idx} className={styles.keywordTag}>#{keyword}</span>
          ))}
        </div>
      </div>
      <div className={styles.divider} />
    </>
  );
});

QuickSummarySection.displayName = "QuickSummarySection";
