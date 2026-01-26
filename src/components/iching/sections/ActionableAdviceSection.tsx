/**
 * Actionable Advice Section Component
 * Displays practical dos/don'ts, timing, and next steps
 * @module sections/ActionableAdviceSection
 */

import React from "react";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface ActionableAdviceSectionProps {
  enhancedData: any;
  translate: (key: string, fallback: string) => string;
}

/**
 * Actionable Advice Section
 * Shows practical guidance with dos, don'ts, timing, and next steps
 *
 * @param props - Component props
 * @returns JSX element or null if data is missing
 */
export const ActionableAdviceSection: React.FC<ActionableAdviceSectionProps> = React.memo(({
  enhancedData,
  translate,
}) => {
  if (!enhancedData?.actionableAdvice) {return null;}

  return (
    <div className={styles.actionableCard}>
      <div className={styles.actionableHeader}>
        <span className={styles.actionableIcon}>🎯</span>
        <h3 className={styles.actionableTitle}>
          {translate("iching.actionableAdvice", "Actionable Advice")}
        </h3>
      </div>

      <div className={styles.actionableGrid}>
        {/* Do This */}
        <div className={styles.adviceBox}>
          <div className={styles.adviceBoxHeader}>
            <span className={styles.adviceIcon}>✅</span>
            <span className={styles.adviceLabel}>
              {translate("iching.doThis", "Do This")}
            </span>
          </div>
          <ul className={styles.adviceList}>
            {enhancedData.actionableAdvice.dos.map((item: string, idx: number) => (
              <li key={idx} className={styles.adviceItem}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Don't Do This */}
        <div className={styles.adviceBox}>
          <div className={styles.adviceBoxHeader}>
            <span className={styles.adviceIcon}>⛔</span>
            <span className={styles.adviceLabel}>
              {translate("iching.dontDoThis", "Don't Do This")}
            </span>
          </div>
          <ul className={styles.adviceList}>
            {enhancedData.actionableAdvice.donts.map((item: string, idx: number) => (
              <li key={idx} className={styles.adviceItem}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Best Timing */}
      <div className={styles.timingBox}>
        <div className={styles.timingHeader}>
          <span className={styles.timingIcon}>⏰</span>
          <span className={styles.timingLabel}>
            {translate("iching.bestTiming", "Best Timing")}
          </span>
        </div>
        <p className={styles.timingText}>{enhancedData.actionableAdvice.timing}</p>
      </div>

      {/* Next Steps */}
      <div className={styles.nextStepsBox}>
        <div className={styles.nextStepsHeader}>
          <span className={styles.nextStepsIcon}>📋</span>
          <span className={styles.nextStepsLabel}>
            {translate("iching.nextSteps", "Next Steps")}
          </span>
        </div>
        <ol className={styles.nextStepsList}>
          {enhancedData.actionableAdvice.nextSteps.map((step: string, idx: number) => (
            <li key={idx} className={styles.nextStepItem}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
});

ActionableAdviceSection.displayName = "ActionableAdviceSection";
