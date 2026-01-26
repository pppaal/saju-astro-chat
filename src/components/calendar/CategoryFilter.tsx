"use client";

// src/components/calendar/CategoryFilter.tsx
import React from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './DestinyCalendar.module.css';

type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";

interface CategoryFilterProps {
  activeCategory: EventCategory | "all";
  onCategoryChange: (category: EventCategory | "all") => void;
}

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  wealth: "💰",
  career: "💼",
  love: "💕",
  health: "💪",
  travel: "✈️",
  study: "📚",
  general: "⭐",
};

const CATEGORIES: EventCategory[] = ["wealth", "career", "love", "health", "travel", "study"];

export default function CategoryFilter({
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const { t } = useI18n();

  const getCategoryLabel = (cat: EventCategory | "all") => {
    if (cat === "all") {return t('calendar.categoryLabels.general', 'General');}
    return t(`calendar.categoryLabels.${cat}`, cat);
  };

  return (
    <div className={styles.categoryFilters}>
      <button
        className={`${styles.categoryBtn} ${activeCategory === "all" ? styles.active : ""}`}
        onClick={() => onCategoryChange("all")}
      >
        <span>🌐</span>
        <span>{getCategoryLabel("all")}</span>
      </button>
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          className={`${styles.categoryBtn} ${activeCategory === cat ? styles.active : ""}`}
          onClick={() => onCategoryChange(cat)}
        >
          <span>{CATEGORY_EMOJI[cat]}</span>
          <span>{getCategoryLabel(cat)}</span>
        </button>
      ))}
    </div>
  );
}
