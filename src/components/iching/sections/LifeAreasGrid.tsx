/**
 * Life Areas Grid Component
 * Displays theme-based interpretations for different life areas
 * @module sections/LifeAreasGrid
 */

import React from "react";
import type { PremiumHexagramData } from '@/lib/iChing/iChingPremiumData';
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface LifeAreasGridProps {
  premiumData: PremiumHexagramData | null;
  lang: "ko" | "en";
  translate: (key: string, fallback: string) => string;
}

/**
 * Life Areas Grid Section
 * Shows interpretations for career, love, health, wealth, and timing
 *
 * @param props - Component props
 * @returns JSX element or null if data is missing
 */
export const LifeAreasGrid = React.memo<LifeAreasGridProps>(({
  premiumData,
  lang,
  translate,
}) => {
  if (!premiumData) {return null;}

  return (
    <div className={styles.themesCard}>
      <div className={styles.themesHeader}>
        <span className={styles.themesIcon}>✧</span>
        <h3 className={styles.themesTitle}>
          {translate("iching.lifeAreas", "Life Area Interpretations")}
        </h3>
      </div>

      <div className={styles.themesGrid}>
        {/* Career & Business */}
        <div className={styles.themeItem}>
          <div className={styles.themeHeader}>
            <span className={styles.themeIcon}>💼</span>
            <span className={styles.themeLabel}>
              {translate("iching.career", "Career & Business")}
            </span>
          </div>
          <p className={styles.themeText}>
            {premiumData.themes.career[lang]}
          </p>
        </div>

        {/* Love & Relationships */}
        <div className={styles.themeItem}>
          <div className={styles.themeHeader}>
            <span className={styles.themeIcon}>💕</span>
            <span className={styles.themeLabel}>
              {translate("iching.love", "Love & Relationships")}
            </span>
          </div>
          <p className={styles.themeText}>
            {premiumData.themes.love[lang]}
          </p>
        </div>

        {/* Health */}
        <div className={styles.themeItem}>
          <div className={styles.themeHeader}>
            <span className={styles.themeIcon}>🏥</span>
            <span className={styles.themeLabel}>
              {translate("iching.health", "Health")}
            </span>
          </div>
          <p className={styles.themeText}>
            {premiumData.themes.health[lang]}
          </p>
        </div>

        {/* Wealth & Finance */}
        <div className={styles.themeItem}>
          <div className={styles.themeHeader}>
            <span className={styles.themeIcon}>💰</span>
            <span className={styles.themeLabel}>
              {translate("iching.wealth", "Wealth & Finance")}
            </span>
          </div>
          <p className={styles.themeText}>
            {premiumData.themes.wealth[lang]}
          </p>
        </div>

        {/* Timing & Action */}
        <div className={styles.themeItem}>
          <div className={styles.themeHeader}>
            <span className={styles.themeIcon}>⏰</span>
            <span className={styles.themeLabel}>
              {translate("iching.timing", "Timing & Action")}
            </span>
          </div>
          <p className={styles.themeText}>
            {premiumData.themes.timing[lang]}
          </p>
        </div>
      </div>
    </div>
  );
});

LifeAreasGrid.displayName = "LifeAreasGrid";
