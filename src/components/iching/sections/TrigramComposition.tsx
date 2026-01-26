/**
 * Trigram Composition Section Component
 * Displays upper and lower trigram information
 * @module sections/TrigramComposition
 */

import React from "react";
import type { TrigramInfo } from '@/lib/iChing/iChingPremiumData';
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface TrigramCompositionProps {
  upperTrigram: TrigramInfo | null;
  lowerTrigram: TrigramInfo | null;
  lang: "ko" | "en";
  translate: (key: string, fallback: string) => string;
}

/**
 * Trigram Composition Section
 * Shows the composition of the hexagram from upper and lower trigrams
 *
 * @param props - Component props
 * @returns JSX element or null if trigrams are missing
 */
export const TrigramComposition = React.memo<TrigramCompositionProps>(({
  upperTrigram,
  lowerTrigram,
  lang,
  translate,
}) => {
  if (!upperTrigram || !lowerTrigram) {return null;}

  return (
    <>
      <div className={styles.divider} />
      <div className={styles.trigramSection}>
        <div className={styles.sectionLabel}>
          {translate("iching.composition", "Hexagram Composition")}
        </div>
        <div className={styles.trigramGrid}>
          <div className={styles.trigramItem}>
            <span className={styles.trigramSymbol}>{upperTrigram.symbol}</span>
            <span className={styles.trigramName}>
              {lang === "ko" ? upperTrigram.name_ko : upperTrigram.name_en}
            </span>
            <span className={styles.trigramLabel}>
              {translate("iching.upperTrigram", "Upper")}
            </span>
          </div>
          <div className={styles.trigramDivider}>+</div>
          <div className={styles.trigramItem}>
            <span className={styles.trigramSymbol}>{lowerTrigram.symbol}</span>
            <span className={styles.trigramName}>
              {lang === "ko" ? lowerTrigram.name_ko : lowerTrigram.name_en}
            </span>
            <span className={styles.trigramLabel}>
              {translate("iching.lowerTrigram", "Lower")}
            </span>
          </div>
        </div>
      </div>
    </>
  );
});

TrigramComposition.displayName = "TrigramComposition";
