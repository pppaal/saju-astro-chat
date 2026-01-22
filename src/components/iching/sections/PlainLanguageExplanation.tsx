/**
 * Plain Language Explanation Section Component
 * Displays traditional text, modern explanation, examples, and metaphors
 * @module sections/PlainLanguageExplanation
 */

import React from "react";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface PlainLanguageExplanationProps {
  enhancedData: any;
  translate: (key: string, fallback: string) => string;
}

/**
 * Plain Language Explanation Section
 * Shows traditional vs modern interpretations with examples
 *
 * @param props - Component props
 * @returns JSX element or null if data is missing
 */
export const PlainLanguageExplanation: React.FC<PlainLanguageExplanationProps> = React.memo(({
  enhancedData,
  translate,
}) => {
  if (!enhancedData?.plainLanguage) return null;

  return (
    <>
      <div className={styles.plainLanguageSection}>
        <div className={styles.sectionLabel}>
          📖 {translate("iching.plainLanguage", "Easy Explanation")}
        </div>

        {/* Traditional expression */}
        <div className={styles.traditionalBox}>
          <div className={styles.traditionalLabel}>
            {translate("iching.traditional", "Traditional")}
          </div>
          <p className={styles.traditionalText}>
            {enhancedData.plainLanguage.traditionalText}
          </p>
        </div>

        {/* Modern explanation */}
        <div className={styles.modernBox}>
          <div className={styles.modernLabel}>
            {translate("iching.modernExplanation", "Modern Explanation")}
          </div>
          <p className={styles.modernText}>
            {enhancedData.plainLanguage.modernExplanation}
          </p>
        </div>

        {/* Real-life example */}
        <div className={styles.exampleBox}>
          <div className={styles.exampleLabel}>
            💡 {translate("iching.realLifeExample", "Real-Life Example")}
          </div>
          <p className={styles.exampleText}>
            {enhancedData.plainLanguage.realLifeExample}
          </p>
        </div>

        {/* Metaphor */}
        <div className={styles.metaphorBox}>
          <div className={styles.metaphorLabel}>
            🌟 {translate("iching.metaphor", "Metaphor")}
          </div>
          <p className={styles.metaphorText}>
            {enhancedData.plainLanguage.metaphor}
          </p>
        </div>
      </div>
      <div className={styles.divider} />
    </>
  );
});

PlainLanguageExplanation.displayName = "PlainLanguageExplanation";
