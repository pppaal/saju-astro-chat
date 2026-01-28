// src/components/destiny-map/display/sections/LuckyElementsSection.tsx

"use client";

import React from "react";
import styles from "@/app/destiny-map/result/result.module.css";
import type { LuckyElements, LangKey } from "../types";

function LuckyElementsSection({
  data,
  lang
}: {
  data: LuckyElements;
  lang: LangKey;
}) {
  if (!data) {return null;}

  const labels: Record<LangKey, { title: string; colors: string; directions: string; numbers: string; items: string }> = {
    ko: { title: "🍀 행운의 요소", colors: "색상", directions: "방향", numbers: "숫자", items: "아이템" },
    en: { title: "🍀 Lucky Elements", colors: "Colors", directions: "Directions", numbers: "Numbers", items: "Items" },
    ja: { title: "🍀 ラッキー要素", colors: "色", directions: "方角", numbers: "数字", items: "アイテム" },
    zh: { title: "🍀 幸运元素", colors: "颜色", directions: "方向", numbers: "数字", items: "物品" },
    es: { title: "🍀 Elementos de Suerte", colors: "Colores", directions: "Direcciones", numbers: "Números", items: "Artículos" },
  };
  const t = labels[lang] || labels.en;

  return (
    <div className={styles.luckySection} role="region" aria-label={t.title}>
      <h4>{t.title}</h4>
      <div className={styles.luckyGrid}>
        {data.colors?.length && (
          <div className={styles.luckyItem}>
            <span className={styles.luckyLabel}>🎨 {t.colors}</span>
            <span>{data.colors.join(", ")}</span>
          </div>
        )}
        {data.directions?.length && (
          <div className={styles.luckyItem}>
            <span className={styles.luckyLabel}>🧭 {t.directions}</span>
            <span>{data.directions.join(", ")}</span>
          </div>
        )}
        {data.numbers?.length && (
          <div className={styles.luckyItem}>
            <span className={styles.luckyLabel}>🔢 {t.numbers}</span>
            <span>{data.numbers.join(", ")}</span>
          </div>
        )}
        {data.items?.length && (
          <div className={styles.luckyItem}>
            <span className={styles.luckyLabel}>✨ {t.items}</span>
            <span>{data.items.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LuckyElementsSection;
