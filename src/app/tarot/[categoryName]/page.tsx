"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import styles from "./spread-selection.module.css";

export default function SpreadSelectionPage() {
  const { categoryName } = useParams();
  const theme = tarotThemes.find((t) => t.id === categoryName);

  if (!theme) {
    return (
      <div className={styles.container}>
        <h1>😅 Unknown Category</h1>
        <Link href="/tarot">← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* --- 상단 주제 버튼 (theme-selector) --- */}
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

      {/* --- 크리스탈볼 --- */}
      <div className={styles.crystalBallContainer}>
        <div className={styles.crystalBall}></div>
        <div className={styles.crystalBallBase}></div>
      </div>

      {/* --- 제목/설명 --- */}
      <h1 className={styles.headerText}>{theme.category}</h1>
      <p className={styles.subText}>Choose the spread that best fits your question.</p>

      {/* --- Spread 카드 목록 --- */}
      <div className={styles.spreadSelectionGrid}>
        {theme.spreads.map((spread, i) => (
          <Link
            key={spread.id}
            href={`/tarot/${categoryName}/${spread.id}`}
            className={styles.spreadCard}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={styles.spreadCardHeader}>
              <h2 className={styles.spreadTitle}>{spread.title}</h2>
              <span className={styles.spreadCardCount}>{spread.cardCount} cards</span>
            </div>
            <p className={styles.spreadDescription}>{spread.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}