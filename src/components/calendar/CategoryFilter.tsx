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
  const { locale } = useI18n();

  const getCategoryLabel = (cat: EventCategory | "all") => {
    const labels: Record<EventCategory | "all", { ko: string; en: string }> = {
      all: { ko: "전체", en: "All" },
      wealth: { ko: "재물운", en: "Wealth" },
      career: { ko: "커리어", en: "Career" },
      love: { ko: "연애운", en: "Love" },
      health: { ko: "건강운", en: "Health" },
      travel: { ko: "여행운", en: "Travel" },
      study: { ko: "학업운", en: "Study" },
      general: { ko: "전체운", en: "General" },
    };
    return locale === "ko" ? labels[cat].ko : labels[cat].en;
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
