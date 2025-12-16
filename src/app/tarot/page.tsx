"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import styles from "./tarot-home.module.css";

// 테마별 아이콘과 그라데이션
const themeStyles: Record<string, { icon: string; gradient: string }> = {
  "general-insight": {
    icon: "🔮",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  "love-relationships": {
    icon: "💕",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
  },
  "career-work": {
    icon: "💼",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
  },
  "money-finance": {
    icon: "💰",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
  },
  "well-being-health": {
    icon: "🌿",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
  },
  "spiritual-growth": {
    icon: "✨",
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
  },
  "decisions-crossroads": {
    icon: "⚖️",
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
  },
  "self-discovery": {
    icon: "🪞",
    gradient: "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)"
  },
  "daily-reading": {
    icon: "☀️",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)"
  }
};

// 카드 개수별 아이콘
function getCardIcon(count: number): string {
  if (count === 1) return "🃏";
  if (count === 2) return "🃏🃏";
  if (count === 3) return "🃏🃏🃏";
  if (count <= 5) return "🃏×" + count;
  return "🃏×" + count;
}

export default function TarotHomePage() {
  const { translate, language } = useI18n();
  const isKo = language === 'ko';
  const [activeTheme, setActiveTheme] = useState(tarotThemes[0]?.id || "general-insight");

  const currentTheme = useMemo(() => {
    return tarotThemes.find((t) => t.id === activeTheme) || tarotThemes[0];
  }, [activeTheme]);

  const themeStyle = themeStyles[activeTheme] || themeStyles["general-insight"];

  return (
    <div className={styles.container}>
      <div className={styles.backButtonContainer}>
        <BackButton />
      </div>

      {/* Crystal Ball */}
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

      {/* Title */}
      <h1 className={styles.title}>
        {translate("tarot.home.title", "What is your question?")}
      </h1>
      <p className={styles.subtitle}>
        {translate("tarot.home.subtitle", "Choose a topic to begin your reading")}
      </p>

      {/* Theme Selector Pills */}
      <div className={styles.themeSelector}>
        {tarotThemes.map((theme) => {
          const style = themeStyles[theme.id];
          return (
            <button
              key={theme.id}
              className={`${styles.themeButton} ${theme.id === activeTheme ? styles.active : ""}`}
              onClick={() => setActiveTheme(theme.id)}
              style={theme.id === activeTheme ? {
                background: style?.gradient || "rgba(138, 43, 226, 0.4)"
              } : undefined}
            >
              <span className={styles.themeIcon}>{style?.icon || "🔮"}</span>
              <span className={styles.themeName}>{isKo ? theme.categoryKo || theme.category : theme.category}</span>
            </button>
          );
        })}
      </div>

      {/* Current Theme Info */}
      <div className={styles.themeHeader}>
        <div
          className={styles.themeIconLarge}
          style={{ background: themeStyle.gradient }}
        >
          {themeStyle.icon}
        </div>
        <div className={styles.themeInfo}>
          <h2 className={styles.themeTitleLarge}>{isKo ? currentTheme?.categoryKo || currentTheme?.category : currentTheme?.category}</h2>
          <p className={styles.themeDescription}>{isKo ? currentTheme?.descriptionKo || currentTheme?.description : currentTheme?.description}</p>
        </div>
      </div>

      {/* Spread Cards Grid */}
      <div className={styles.spreadGrid}>
        {currentTheme?.spreads.map((spread, i) => (
          <Link
            key={spread.id}
            href={`/tarot/${activeTheme}/${spread.id}`}
            className={styles.spreadCard}
            style={{
              animationDelay: `${i * 0.1}s`,
              "--gradient": themeStyle.gradient
            } as React.CSSProperties}
          >
            <div className={styles.spreadCardIcon}>
              {getCardIcon(spread.cardCount)}
            </div>
            <div className={styles.spreadCardContent}>
              <h3 className={styles.spreadTitle}>{isKo ? spread.titleKo || spread.title : spread.title}</h3>
              <span className={styles.spreadCardCount}>
                {spread.cardCount} {translate("tarot.spread.cards", "cards")}
              </span>
              <p className={styles.spreadDescription}>{isKo ? spread.descriptionKo || spread.description : spread.description}</p>
            </div>
            <div className={styles.spreadPositions}>
              {spread.positions.slice(0, 3).map((pos, idx) => (
                <span key={idx} className={styles.positionTag}>
                  {isKo ? pos.titleKo || pos.title : pos.title}
                </span>
              ))}
              {spread.positions.length > 3 && (
                <span className={styles.positionMore}>
                  +{spread.positions.length - 3}
                </span>
              )}
            </div>
            <div className={styles.spreadCardArrow}>→</div>
          </Link>
        ))}
      </div>

      {/* Quick Tip */}
      <div className={styles.tipContainer}>
        <div className={styles.tipIcon}>💡</div>
        <p className={styles.tipText}>
          {translate(
            "tarot.home.tip",
            "Clear your mind and focus on your question before selecting cards"
          )}
        </p>
      </div>
    </div>
  );
}
