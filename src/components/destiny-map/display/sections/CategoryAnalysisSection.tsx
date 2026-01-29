// src/components/destiny-map/display/sections/CategoryAnalysisSection.tsx

"use client";

import React, { useMemo, memo } from "react";
import styles from "@/app/destiny-map/result/result.module.css";
import type { CategoryAnalysis, LangKey } from "../types";

// 키워드 리스트 컴포넌트 메모이제이션
const KeywordList = memo(({ keywords }: { keywords: string[] }) => (
  <div className={styles.keywords}>
    {keywords.map((kw, i) => (
      <span key={`kw-${i}-${kw}`} className={styles.keyword}>{kw}</span>
    ))}
  </div>
))
KeywordList.displayName = 'KeywordList'

// 카테고리 카드 컴포넌트 메모이제이션
const CategoryCard = memo(({
  cat,
  t
}: {
  cat: { key: string } & CategoryAnalysis;
  t: { saju: string; astro: string; cross: string }
}) => (
  <div className={styles.categoryCard}>
    <h3 className={styles.categoryTitle}>
      <span className={styles.categoryIcon} aria-hidden="true">{cat.icon}</span>
      {cat.title}
    </h3>

    <div className={styles.analysisGrid}>
      <div className={styles.analysisBox}>
        <span className={styles.analysisLabel}>{t.saju}</span>
        <p>{cat.sajuAnalysis}</p>
      </div>
      <div className={styles.analysisBox}>
        <span className={styles.analysisLabel}>{t.astro}</span>
        <p>{cat.astroAnalysis}</p>
      </div>
    </div>

    <div className={styles.crossInsight}>
      <span className={styles.crossLabel}>✨ {t.cross}</span>
      <p>{cat.crossInsight}</p>
    </div>

    {cat.keywords && cat.keywords.length > 0 && (
      <KeywordList keywords={cat.keywords} />
    )}

    {cat.suitableCareers && cat.suitableCareers.length > 0 && (
      <div className={styles.careerList}>
        <strong>💼</strong> {cat.suitableCareers.join(", ")}
      </div>
    )}

    {cat.timing && <p className={styles.timing}>⏰ {cat.timing}</p>}
    {cat.idealPartner && <p className={styles.partner}>💕 {cat.idealPartner}</p>}
    {cat.wealthType && <p className={styles.wealthType}>💰 {cat.wealthType}</p>}
    {cat.advice && <p className={styles.catAdvice}>💡 {cat.advice}</p>}
  </div>
))
CategoryCard.displayName = 'CategoryCard'

function CategoryAnalysisSection({
  categories,
  lang
}: {
  categories: Record<string, CategoryAnalysis>;
  lang: LangKey;
}) {
  if (!categories || Object.keys(categories).length === 0) {return null;}

  const labels: Record<LangKey, { saju: string; astro: string; cross: string }> = {
    ko: { saju: "사주 분석", astro: "점성 분석", cross: "교차 인사이트" },
    en: { saju: "Saju Analysis", astro: "Astro Analysis", cross: "Cross Insight" },
    ja: { saju: "四柱分析", astro: "占星分析", cross: "クロス分析" },
    zh: { saju: "四柱分析", astro: "占星分析", cross: "交叉洞察" },
    es: { saju: "Análisis Saju", astro: "Análisis Astro", cross: "Insight Cruzado" },
  };
  const t = labels[lang] || labels.en;

  // sortedCategories 메모이제이션
  const sortedCategories = useMemo(() => {
    const categoryOrder = ["personality", "appearance", "love", "family", "friends", "career", "wealth", "health"];
    return categoryOrder
      .filter(key => categories[key])
      .map(key => ({ key, ...categories[key] }));
  }, [categories]);

  return (
    <div className={styles.categorySection} role="region" aria-label="카테고리별 분석">
      {sortedCategories.map((cat) => (
        <CategoryCard key={cat.key} cat={cat} t={t} />
      ))}
    </div>
  );
}

export default memo(CategoryAnalysisSection);
