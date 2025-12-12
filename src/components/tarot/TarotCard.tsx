"use client";
/* eslint-disable react/no-unescaped-entities */

import { useState } from "react";
import Image from "next/image";
import styles from "./TarotCard.module.css";

// Reusable TarotCard component for use in:
// - Tarot readings
// - Destiny Map (saju + astrology + tarot + Jung psychology)
// - Any other feature that needs tarot card display

export interface CardInsight {
  interpretation?: string;
  spiritAnimal?: {
    name: string;
    meaning: string;
    message: string;
  };
  chakra?: {
    name: string;
    color: string;
    guidance: string;
  };
  element?: "Fire" | "Water" | "Air" | "Earth";
  shadow?: {
    prompt: string;
    affirmation: string;
  };
  numerology?: {
    number: number;
    meaning: string;
  };
  astrology?: {
    sign: string;
    planet?: string;
  };
}

export interface TarotCardProps {
  // Basic card info
  name: string;
  image: string;
  isReversed?: boolean;
  position?: string;

  // Interpretation
  keywords?: string[];
  meaning?: string;

  // Premium insights
  insights?: CardInsight;

  // Display options
  size?: "small" | "medium" | "large";
  showInsights?: boolean;
  expandable?: boolean;
  interactive?: boolean;

  // Callbacks
  onClick?: () => void;
  onExpand?: (expanded: boolean) => void;
}

const elementIcons: Record<string, string> = {
  Fire: "🔥",
  Water: "💧",
  Air: "🌬️",
  Earth: "🌍"
};

export default function TarotCard({
  name,
  image,
  isReversed = false,
  position,
  keywords = [],
  meaning,
  insights,
  size = "medium",
  showInsights = true,
  expandable = true,
  interactive = true,
  onClick,
  onExpand
}: TarotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }

    if (expandable && interactive) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      onExpand?.(newExpanded);
    }
  };

  const sizeClasses = {
    small: styles.sizeSmall,
    medium: styles.sizeMedium,
    large: styles.sizeLarge
  };

  return (
    <div
      className={`${styles.cardContainer} ${sizeClasses[size]} ${isExpanded ? styles.expanded : ""} ${interactive ? styles.interactive : ""}`}
      onClick={handleClick}
    >
      {/* Position Badge */}
      {position && (
        <div className={styles.positionBadge}>{position}</div>
      )}

      {/* Card Image */}
      <div className={`${styles.imageWrapper} ${isReversed ? styles.reversed : ""}`}>
        <Image
          src={image}
          alt={name}
          width={size === "small" ? 120 : size === "medium" ? 180 : 220}
          height={size === "small" ? 210 : size === "medium" ? 315 : 385}
          className={styles.cardImage}
        />
        {isReversed && (
          <div className={styles.reversedLabel}>Reversed</div>
        )}
      </div>

      {/* Card Info */}
      <div className={styles.cardInfo}>
        <h3 className={styles.cardName}>{name}</h3>

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className={styles.keywords}>
            {keywords.slice(0, isExpanded ? keywords.length : 3).map((keyword, i) => (
              <span key={i} className={styles.keywordTag}>{keyword}</span>
            ))}
            {!isExpanded && keywords.length > 3 && (
              <span className={styles.keywordMore}>+{keywords.length - 3}</span>
            )}
          </div>
        )}

        {/* Meaning */}
        {meaning && (
          <p className={styles.meaning}>{meaning}</p>
        )}

        {/* Premium Insights */}
        {showInsights && isExpanded && insights && (
          <div className={styles.insightsContainer}>
            {/* AI Interpretation */}
            {insights.interpretation && (
              <div className={styles.insightBlock}>
                <h4 className={styles.insightTitle}>🔮 Deep Insight</h4>
                <p className={styles.insightText}>{insights.interpretation}</p>
              </div>
            )}

            {/* Spirit Animal */}
            {insights.spiritAnimal && (
              <div className={styles.insightBlock}>
                <h4 className={styles.insightTitle}>🦋 Spirit Animal</h4>
                <div className={styles.spiritAnimal}>
                  <span className={styles.animalName}>{insights.spiritAnimal.name}</span>
                  <p className={styles.animalMeaning}>{insights.spiritAnimal.meaning}</p>
                  <p className={styles.animalMessage}>"{insights.spiritAnimal.message}"</p>
                </div>
              </div>
            )}

            {/* Chakra */}
            {insights.chakra && (
              <div className={styles.insightBlock}>
                <h4 className={styles.insightTitle}>🧘 Chakra</h4>
                <div className={styles.chakraInfo}>
                  <span
                    className={styles.chakraDot}
                    style={{ backgroundColor: insights.chakra.color }}
                  />
                  <span className={styles.chakraName}>{insights.chakra.name}</span>
                  <p className={styles.chakraGuidance}>{insights.chakra.guidance}</p>
                </div>
              </div>
            )}

            {/* Shadow Work */}
            {insights.shadow && (
              <div className={styles.insightBlock}>
                <h4 className={styles.insightTitle}>🌙 Shadow Work</h4>
                <p className={styles.shadowPrompt}>{insights.shadow.prompt}</p>
                <p className={styles.shadowAffirmation}>💫 {insights.shadow.affirmation}</p>
              </div>
            )}

            {/* Element */}
            {insights.element && (
              <div className={styles.elementTag}>
                {elementIcons[insights.element]} {insights.element}
              </div>
            )}

            {/* Astrology */}
            {insights.astrology && (
              <div className={styles.astrologyInfo}>
                <span className={styles.astrologySign}>{insights.astrology.sign}</span>
                {insights.astrology.planet && (
                  <span className={styles.astrologyPlanet}>{insights.astrology.planet}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expand Hint */}
        {expandable && interactive && (
          <div className={styles.expandHint}>
            {isExpanded ? "▲ Click to collapse" : "▼ Click for more"}
          </div>
        )}
      </div>
    </div>
  );
}
