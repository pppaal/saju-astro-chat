"use client";

import React from "react";
import styles from "../community.module.css";

export interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  translate: (key: string, fallback: string) => string;
}

/**
 * CategoryFilter component displays category chips
 * Shows active state for selected category
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = React.memo(({
  categories,
  selected,
  onSelect,
  translate
}) => {
  return (
    <div className={styles.catChips}>
      {categories.map(c => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`${styles.chip} ${selected === c ? styles.chipActive : ""}`}
        >
          {translate(`community.categoryLabels.${c}`, c)}
        </button>
      ))}
    </div>
  );
});

CategoryFilter.displayName = "CategoryFilter";
