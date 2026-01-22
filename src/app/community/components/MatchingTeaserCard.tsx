"use client";

import React from "react";
import Link from "next/link";
import styles from "../community.module.css";

export interface MatchingTeaserCardProps {
  translate: (key: string, fallback: string) => string;
}

/**
 * MatchingTeaserCard component displays teaser for cosmic compatibility matching
 * Simple card with icon, title, description, CTA link
 */
export const MatchingTeaserCard: React.FC<MatchingTeaserCardProps> = React.memo(({ translate }) => {
  return (
    <section className={styles.matchingSection}>
      <div className={styles.matchingCard}>
        <div className={styles.matchingIcon}>*</div>
        <div className={styles.matchingContent}>
          <h3 className={styles.matchingTitle}>
            {translate("community.matchingTitle", "Cosmic Compatibility Matching")}
          </h3>
          <p className={styles.matchingDesc}>
            {translate(
              "community.matchingDesc",
              "Find your perfect cosmic match based on birth charts, zodiac signs, and shared interests"
            )}
          </p>
          <Link href="/community/matching" className={styles.matchingButton}>
            <span>{translate("community.comingSoon", "Coming Soon")}</span>
            <span className={styles.matchingButtonIcon}>{"->"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
});

MatchingTeaserCard.displayName = "MatchingTeaserCard";
