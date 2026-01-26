/**
 * Changing Lines Section Component
 * Displays detailed interpretation of changing lines
 * @module sections/ChangingLinesSection
 */

import React from "react";
import { ChangingLine } from "@/components/iching/types";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface ChangingLinesSectionProps {
  changingLines: ChangingLine[];
  lang: "ko" | "en";
  translate: (key: string, fallback: string) => string;
}

/**
 * Changing Lines Section
 * Shows enhanced interpretation with detailed analysis for each changing line
 *
 * @param props - Component props
 * @returns JSX element or null if no changing lines
 */
export const ChangingLinesSection = React.memo<ChangingLinesSectionProps>(({
  changingLines,
  lang,
  translate,
}) => {
  if (changingLines.length === 0) {return null;}

  return (
    <div className={styles.changingLinesCard}>
      <div className={styles.changingLinesHeader}>
        <span className={styles.changingLinesIcon}>✦</span>
        <h3 className={styles.changingLinesTitle}>
          {translate("iching.changingLines", "Changing Lines")}
        </h3>
      </div>
      <div className={styles.changingLinesList}>
        {changingLines.map((line: ChangingLine) => (
          <div key={line.index} className={styles.changingLineItem}>
            <div className={styles.changingLineHeader}>
              <span className={styles.changingLineIndex}>
                {lang === "ko" ? `${line.index + 1}효` : `Line ${line.index + 1}`}
              </span>
              {line.changing_hexagram_name && (
                <span className={styles.changingTo}>
                  → {line.changing_hexagram_name}
                </span>
              )}
            </div>
            <div className={styles.changingLineText}>{line.text}</div>
            {line.interpretation && (
              <div className={styles.changingLineInterpretation}>
                {line.interpretation}
              </div>
            )}
            {line.changing_interpretation && (
              <div className={styles.changingDetailedInterpretation}>
                <div className={styles.changingTransition}>
                  {line.changing_interpretation.transition}
                </div>
                <div className={styles.changingFromTo}>
                  {line.changing_interpretation.from_to}
                </div>
                <div className={styles.changingCoreMessage}>
                  💡 {line.changing_interpretation.core_message}
                </div>
                {line.changing_interpretation.practical_advice && line.changing_interpretation.practical_advice.length > 0 && (
                  <div className={styles.changingAdviceList}>
                    {line.changing_interpretation.practical_advice.map((advice, idx) => (
                      <span key={idx} className={styles.changingAdviceItem}>
                        {advice}
                      </span>
                    ))}
                  </div>
                )}
                {line.changing_interpretation.warning && (
                  <div className={styles.changingWarning}>
                    ⚠️ {line.changing_interpretation.warning}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

ChangingLinesSection.displayName = "ChangingLinesSection";
