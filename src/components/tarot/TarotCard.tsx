"use client";

import { useState, memo } from "react";
import Image from "next/image";
import styles from "./TarotCard.module.css";

// Reusable TarotCard component for use in:
// - Tarot readings
// - Destiny Map (saju + astrology + tarot + Jung psychology)
// - Any other feature that needs tarot card display

export interface TarotCardProps {
  // Basic card info
  name: string;
  image: string;
  isReversed?: boolean;
  position?: string;

  // Interpretation
  keywords?: string[];
  meaning?: string;

  // Display options
  size?: "small" | "medium" | "large";
  expandable?: boolean;
  interactive?: boolean;

  // Callbacks
  onClick?: () => void;
  onExpand?: (expanded: boolean) => void;
}

const TarotCard = memo(function TarotCard({
  name,
  image,
  isReversed = false,
  position,
  keywords = [],
  meaning,
  size = "medium",
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

        {/* Expand Hint */}
        {expandable && interactive && (
          <div className={styles.expandHint}>
            {isExpanded ? "▲ Click to collapse" : "▼ Click for more"}
          </div>
        )}
      </div>
    </div>
  );
});

export default TarotCard;
