/**
 * Resulting Hexagram Card Component
 * Displays the resulting hexagram after line changes
 * @module sections/ResultingHexagramCard
 */

import React from "react";
import { Hexagram } from "@/components/iching/types";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface ResultingHexagramCardProps {
  resultingHexagram: Hexagram | null;
  resultingPremiumData: any;
  lang: "ko" | "en";
  translate: (key: string, fallback: string) => string;
}

/**
 * Resulting Hexagram Card
 * Shows the hexagram that results from changing lines
 *
 * @param props - Component props
 * @returns JSX element or null if no resulting hexagram
 */
export const ResultingHexagramCard: React.FC<ResultingHexagramCardProps> = React.memo(({
  resultingHexagram,
  resultingPremiumData,
  lang,
  translate,
}) => {
  if (!resultingHexagram) {return null;}

  return (
    <div className={styles.resultingCard}>
      <div className={styles.resultingHeader}>
        <span className={styles.resultingIcon}>→</span>
        <h3 className={styles.resultingTitle}>
          {translate("iching.resulting", "Resulting Hexagram")}:{" "}
          {resultingHexagram.name}{" "}
          {resultingHexagram.symbol}
        </h3>
      </div>
      {resultingPremiumData && (
        <p className={styles.resultingSubtitle}>
          {resultingPremiumData.name_hanja} · {resultingPremiumData.element}
        </p>
      )}
      <p className={styles.resultingText}>
        {resultingHexagram.judgment}
      </p>
      {resultingPremiumData && (
        <div className={styles.resultingMeaning}>
          <div className={styles.sectionLabel}>
            {translate("iching.coreMeaning", "Core Meaning")}
          </div>
          <p className={styles.resultingMeaningText}>
            {resultingPremiumData.core_meaning[lang]}
          </p>
        </div>
      )}
    </div>
  );
});

ResultingHexagramCard.displayName = "ResultingHexagramCard";
