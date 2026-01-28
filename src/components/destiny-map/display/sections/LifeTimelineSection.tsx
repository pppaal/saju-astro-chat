// src/components/destiny-map/display/sections/LifeTimelineSection.tsx

"use client";

import React from "react";
import styles from "@/app/destiny-map/result/result.module.css";
import type { StructuredFortune, LangKey } from "../types";
import StarRating from "./StarRating";

function LifeTimelineSection({
  data,
  lang
}: {
  data: StructuredFortune["lifeTimeline"];
  lang: LangKey;
}) {
  if (!data?.importantYears?.length) {return null;}

  const labels: Record<LangKey, { title: string; age: string; saju: string; astro: string }> = {
    ko: { title: "📅 인생 주요 시점", age: "세", saju: "사주", astro: "점성" },
    en: { title: "📅 Life Timeline", age: "years old", saju: "Saju", astro: "Astro" },
    ja: { title: "📅 人生のタイムライン", age: "歳", saju: "四柱", astro: "占星" },
    zh: { title: "📅 人生时间线", age: "岁", saju: "四柱", astro: "占星" },
    es: { title: "📅 Línea de Vida", age: "años", saju: "Saju", astro: "Astro" },
  };
  const t = labels[lang] || labels.en;

  return (
    <div className={styles.timelineSection} role="region" aria-label={t.title}>
      <h3 className={styles.sectionTitle}>{t.title}</h3>
      {data.description && <p className={styles.timelineDesc}>{data.description}</p>}
      <div className={styles.timeline}>
        {data.importantYears.map((year, i) => (
          <div key={i} className={styles.timelineItem}>
            <div className={styles.timelineYear}>
              <span className={styles.yearValue}>{year.year}</span>
              <span className={styles.yearAge}>({year.age}{t.age})</span>
              <StarRating rating={year.rating} />
            </div>
            <div className={styles.timelineContent}>
              <h4 className={styles.timelineTitle}>{year.title}</h4>
              <div className={styles.timelineReasons}>
                <div className={styles.reasonRow}>
                  <span className={styles.sajuTag}>{t.saju}</span>
                  <span>{year.sajuReason}</span>
                </div>
                <div className={styles.reasonRow}>
                  <span className={styles.astroTag}>{t.astro}</span>
                  <span>{year.astroReason}</span>
                </div>
              </div>
              {year.advice && <p className={styles.timelineAdvice}>💡 {year.advice}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LifeTimelineSection;
