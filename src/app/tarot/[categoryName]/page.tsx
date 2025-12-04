"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import styles from "./spread-selection.module.css";

export default function SpreadSelectionPage() {
  const { categoryName } = useParams();
  const { translate } = useI18n();
  const theme = tarotThemes.find((t) => t.id === categoryName);

  if (!theme) {
    return (
      <div className={styles.errorContainer}>
        <h1>😅 {translate("tarot.spread.unknownCategory", "Unknown Category")}</h1>
        <Link href="/tarot" className={styles.errorLink}>
          ← {translate("tarot.spread.backToHome", "Back to Home")}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backButtonContainer}>
        <BackButton />
      </div>

      {/* Theme Navigation Pills */}
      <div className={styles.themeSelector}>
        {tarotThemes.map((t) => (
          <Link
            key={t.id}
            href={`/tarot/${t.id}`}
            className={`${styles.themeButton} ${t.id === categoryName ? styles.active : ""}`}
          >
            {t.category}
          </Link>
        ))}
      </div>

      {/* Enhanced Crystal Ball */}
      <div className={styles.crystalBallContainer}>
        <div className={styles.orbRing}></div>
        <div className={styles.orbRing2}></div>
        <div className={styles.crystalBall}>
          <div className={styles.innerGlow}></div>
          <div className={styles.sparkle} style={{ top: "25%", left: "35%" }}>✦</div>
          <div className={styles.sparkle} style={{ top: "55%", right: "30%" }}>✦</div>
        </div>
        <div className={styles.crystalBallBase}>
          <div className={styles.baseTop}></div>
          <div className={styles.baseMiddle}></div>
        </div>
      </div>

      {/* Category Title and Description */}
      <h1 className={styles.headerText}>{theme.category}</h1>
      <p className={styles.subText}>
        {translate("tarot.spread.chooseSpread", "Choose the spread that best fits your question.")}
      </p>

      {/* Spread Cards Grid */}
      <div className={styles.spreadSelectionGrid}>
        {theme.spreads.map((spread, i) => (
          <Link
            key={spread.id}
            href={`/tarot/${categoryName}/${spread.id}`}
            className={styles.spreadCard}
            style={{ animationDelay: `${i * 0.1}s` } as React.CSSProperties}
          >
            <div className={styles.spreadCardIcon}>
              {spread.cardCount === 1 ? "🃏" : spread.cardCount === 2 ? "🃏🃏" : spread.cardCount === 3 ? "🃏🃏🃏" : spread.cardCount <= 5 ? "🃏🃏🃏🃏" : "🃏🃏🃏🃏🃏"}
            </div>
            <div className={styles.spreadCardHeader}>
              <h2 className={styles.spreadTitle}>{spread.title}</h2>
              <span className={styles.spreadCardCount}>
                {spread.cardCount} {translate("tarot.spread.cards", "cards")}
              </span>
            </div>
            <p className={styles.spreadDescription}>{spread.description}</p>
            <div className={styles.spreadCardArrow}>→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
