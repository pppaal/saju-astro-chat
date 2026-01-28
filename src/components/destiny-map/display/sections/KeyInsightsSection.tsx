// src/components/destiny-map/display/sections/KeyInsightsSection.tsx

"use client";

import React from "react";
import styles from "@/app/destiny-map/result/result.module.css";
import type { KeyInsight, LangKey } from "../types";

function KeyInsightsSection({ insights, lang }: { insights: KeyInsight[]; lang: LangKey }) {
  const validInsights = insights?.filter(i => i.text && i.text.trim().length > 0);
  if (!validInsights || validInsights.length === 0) {return null;}

  const typeIcons: Record<string, string> = {
    strength: "💪",
    opportunity: "🚀",
    caution: "⚠️",
    advice: "💡",
  };

  const typeLabels: Record<LangKey, Record<string, string>> = {
    ko: { strength: "강점", opportunity: "기회", caution: "주의", advice: "조언" },
    en: { strength: "Strength", opportunity: "Opportunity", caution: "Caution", advice: "Advice" },
    ja: { strength: "強み", opportunity: "機会", caution: "注意", advice: "アドバイス" },
    zh: { strength: "优势", opportunity: "机会", caution: "注意", advice: "建议" },
    es: { strength: "Fortaleza", opportunity: "Oportunidad", caution: "Precaución", advice: "Consejo" },
  };
  const t = typeLabels[lang] || typeLabels.en;

  return (
    <div className={styles.insightsSection} role="list" aria-label="핵심 인사이트">
      {validInsights.map((insight, i) => (
        <div key={i} className={`${styles.insightCard} ${styles[`insight_${insight.type}`]}`} role="listitem">
          <span className={styles.insightIcon} aria-hidden="true">{insight.icon || typeIcons[insight.type] || "✦"}</span>
          <div>
            <span className={styles.insightType}>{t[insight.type] || insight.type}</span>
            <p className={styles.insightText}>{insight.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default KeyInsightsSection;
