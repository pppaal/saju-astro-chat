/**
 * Visual Imagery Section Component
 * Displays symbolic imagery, scene description, and color palette
 * @module sections/VisualImagerySection
 */

import React from "react";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface VisualImagerySectionProps {
  enhancedData: any;
  translate: (key: string, fallback: string) => string;
}

/**
 * Visual Imagery Section
 * Shows scene description, symbolism, and color palette
 *
 * @param props - Component props
 * @returns JSX element or null if data is missing
 */
export const VisualImagerySection: React.FC<VisualImagerySectionProps> = React.memo(({
  enhancedData,
  translate,
}) => {
  if (!enhancedData?.visualImagery) return null;

  return (
    <>
      <div className={styles.visualImagerySection}>
        <div className={styles.sectionLabel}>
          {translate("iching.visualImagery", "Visual Imagery")}
        </div>
        <div className={styles.sceneDescription}>
          <span className={styles.sceneEmoji}>{enhancedData.visualImagery.emoji}</span>
          <p className={styles.sceneText}>{enhancedData.visualImagery.scene}</p>
        </div>
        <p className={styles.symbolismText}>{enhancedData.visualImagery.symbolism}</p>
        <div className={styles.colorPalette}>
          {enhancedData.visualImagery.colors.map((color: string, idx: number) => (
            <span key={idx} className={styles.colorChip}>{color}</span>
          ))}
        </div>
      </div>
      <div className={styles.divider} />
    </>
  );
});

VisualImagerySection.displayName = "VisualImagerySection";