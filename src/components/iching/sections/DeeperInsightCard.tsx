/**
 * Deeper Insight Card Component
 * Displays lucky information and related hexagrams
 * @module sections/DeeperInsightCard
 */

import React from "react";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface DeeperInsightCardProps {
  luckyInfo: any;
  nuclearHexagram: any;
  relatedHexagrams: any;
  lang: "ko" | "en";
  translate: (key: string, fallback: string) => string;
}

/**
 * Deeper Insight Card Section
 * Shows lucky colors, numbers, direction, and related hexagrams
 *
 * @param props - Component props
 * @returns JSX element or null if data is missing
 */
export const DeeperInsightCard: React.FC<DeeperInsightCardProps> = React.memo(({
  luckyInfo,
  nuclearHexagram,
  relatedHexagrams,
  lang,
  translate,
}) => {
  if (!luckyInfo && !nuclearHexagram) return null;

  return (
    <div className={styles.insightCard}>
      <div className={styles.insightHeader}>
        <span className={styles.insightIcon}>🔮</span>
        <h3 className={styles.insightTitle}>
          {translate("iching.deeperInsight", "Deeper Insight")}
        </h3>
      </div>

      <div className={styles.insightGrid}>
        {/* Lucky Colors */}
        {luckyInfo && (
          <div className={styles.insightItem}>
            <div className={styles.insightItemHeader}>
              <span className={styles.insightItemIcon}>🎨</span>
              <span className={styles.insightItemLabel}>
                {translate("iching.luckyColors", "Lucky Colors")}
              </span>
            </div>
            <div className={styles.luckyColors}>
              {luckyInfo.colors[lang].map((color: string, idx: number) => (
                <span key={idx} className={styles.luckyColorTag}>{color}</span>
              ))}
            </div>
          </div>
        )}

        {/* Lucky Numbers */}
        {luckyInfo && (
          <div className={styles.insightItem}>
            <div className={styles.insightItemHeader}>
              <span className={styles.insightItemIcon}>🔢</span>
              <span className={styles.insightItemLabel}>
                {translate("iching.luckyNumbers", "Lucky Numbers")}
              </span>
            </div>
            <div className={styles.luckyNumbers}>
              {luckyInfo.numbers.map((num: number, idx: number) => (
                <span key={idx} className={styles.luckyNumberTag}>{num}</span>
              ))}
            </div>
          </div>
        )}

        {/* Lucky Direction */}
        {luckyInfo && (
          <div className={styles.insightItem}>
            <div className={styles.insightItemHeader}>
              <span className={styles.insightItemIcon}>🧭</span>
              <span className={styles.insightItemLabel}>
                {translate("iching.luckyDirection", "Lucky Direction")}
              </span>
            </div>
            <p className={styles.insightItemText}>
              {luckyInfo.direction[lang]}
            </p>
          </div>
        )}

        {/* Nuclear Hexagram */}
        {nuclearHexagram && (
          <div className={styles.insightItem}>
            <div className={styles.insightItemHeader}>
              <span className={styles.insightItemIcon}>🔄</span>
              <span className={styles.insightItemLabel}>
                {translate("iching.nuclearHexagram", "Nuclear Hexagram")}
              </span>
            </div>
            <p className={styles.insightItemText}>
              {translate("iching.nuclearHexagramDesc", "Inner structure")}: {lang === "ko" ? nuclearHexagram.name_ko : nuclearHexagram.name_en}
            </p>
          </div>
        )}

        {/* Opposite Hexagram */}
        {relatedHexagrams?.opposite && (
          <div className={styles.insightItem}>
            <div className={styles.insightItemHeader}>
              <span className={styles.insightItemIcon}>⚖️</span>
              <span className={styles.insightItemLabel}>
                {translate("iching.oppositeHexagram", "Opposite Hexagram")}
              </span>
            </div>
            <p className={styles.insightItemText}>
              {translate("iching.oppositeDesc", "Complementary energy")}: {lang === "ko" ? relatedHexagrams.opposite.name_ko : relatedHexagrams.opposite.name_en}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

DeeperInsightCard.displayName = "DeeperInsightCard";
