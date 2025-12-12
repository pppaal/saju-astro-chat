"use client";

import React from "react";
import { ChangingLine, IChingResult } from "@/components/iching/types";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./ResultDisplay.module.css";

interface ResultDisplayProps {
  result: IChingResult | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const { translate } = useI18n();

  if (!result) return null;
  if (result.error) return <p className={styles.errorText}>{result.error}</p>;

  return (
    <div className={styles.resultContainer}>
      {/* Primary Hexagram Card */}
      <div className={styles.resultCard}>
        <div className={styles.hexagramHeader}>
          <div className={styles.hexagramIcon}>☯</div>
          <div className={styles.hexagramInfo}>
            <h2 className={styles.hexagramTitle}>
              {translate("iching.today", "Today's Hexagram")}:{" "}
              {result.primaryHexagram.name}
              <span className={styles.hexagramSymbol}>
                {result.primaryHexagram.symbol}
              </span>
            </h2>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Judgment */}
        <div>
          <div className={styles.sectionLabel}>
            {translate("iching.judgment", "Judgment")}
          </div>
          <p className={styles.sectionText}>
            {result.primaryHexagram.judgment}
          </p>
        </div>

        <div className={styles.divider} />

        {/* Image */}
        <div>
          <div className={styles.sectionLabel}>
            {translate("iching.image", "Image")}
          </div>
          <p className={styles.imageText}>
            {result.primaryHexagram.image}
          </p>
        </div>
      </div>

      {/* Changing Lines */}
      {result.changingLines.length > 0 && (
        <div className={styles.changingLinesCard}>
          <div className={styles.changingLinesHeader}>
            <span className={styles.changingLinesIcon}>✦</span>
            <h3 className={styles.changingLinesTitle}>
              {translate("iching.changingLines", "Changing Lines")}
            </h3>
          </div>
          <div className={styles.changingLinesList}>
            {result.changingLines.map((line: ChangingLine) => (
              <div key={line.index} className={styles.changingLineItem}>
                {line.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resulting Hexagram */}
      {result.resultingHexagram && (
        <div className={styles.resultingCard}>
          <div className={styles.resultingHeader}>
            <span className={styles.resultingIcon}>→</span>
            <h3 className={styles.resultingTitle}>
              {translate("iching.resulting", "Resulting Hexagram")}:{" "}
              {result.resultingHexagram.name}{" "}
              {result.resultingHexagram.symbol}
            </h3>
          </div>
          <p className={styles.resultingText}>
            {result.resultingHexagram.judgment}
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;
