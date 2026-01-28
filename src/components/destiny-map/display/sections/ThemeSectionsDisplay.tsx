// src/components/destiny-map/display/sections/ThemeSectionsDisplay.tsx

"use client";

import React from "react";
import styles from "@/app/destiny-map/result/result.module.css";
import type { ThemeSection, LangKey } from "../types";

function ThemeSectionsDisplay({ sections, lang }: { sections: ThemeSection[]; lang: LangKey }) {
  if (!sections || sections.length === 0) {return null;}

  return (
    <div className={styles.themeSections} role="region" aria-label="테마별 섹션">
      {sections.map((section) => (
        <div key={section.id} className={styles.themeSection}>
          <div className={styles.themeSectionHeader}>
            <span className={styles.themeSectionIcon} aria-hidden="true">{section.icon}</span>
            <h3 className={styles.themeSectionTitle}>
              {lang === "en" ? section.titleEn : section.title}
            </h3>
          </div>
          <div className={styles.themeSectionContent}>
            {section.content.split('\n').map((line, i) => (
              <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ThemeSectionsDisplay;
