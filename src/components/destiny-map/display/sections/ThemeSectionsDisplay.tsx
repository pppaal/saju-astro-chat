// src/components/destiny-map/display/sections/ThemeSectionsDisplay.tsx

"use client";

import { useMemo, memo } from "react";
import styles from "@/app/destiny-map/result/result.module.css";
import type { ThemeSection, LangKey } from "../types";

// 정규표현식을 컴포넌트 외부에서 미리 생성
const BOLD_REGEX = /\*\*(.*?)\*\*/g;

// 단일 섹션 컴포넌트 메모이제이션
const ThemeSectionItem = memo(({
  section,
  lang
}: {
  section: ThemeSection;
  lang: LangKey
}) => {
  // 문자열 처리를 메모이제이션
  const processedLines = useMemo(() =>
    section.content.split('\n').map((line, i) => ({
      id: `${section.id}-line-${i}`,
      text: line.replace(BOLD_REGEX, '$1')
    })),
    [section.id, section.content]
  );

  const title = lang === "en" ? section.titleEn : section.title;

  return (
    <div className={styles.themeSection}>
      <div className={styles.themeSectionHeader}>
        <span className={styles.themeSectionIcon} aria-hidden="true">{section.icon}</span>
        <h3 className={styles.themeSectionTitle}>{title}</h3>
      </div>
      <div className={styles.themeSectionContent}>
        {processedLines.map(({ id, text }) => (
          <p key={id}>{text}</p>
        ))}
      </div>
    </div>
  );
})
ThemeSectionItem.displayName = 'ThemeSectionItem'

function ThemeSectionsDisplay({ sections, lang }: { sections: ThemeSection[]; lang: LangKey }) {
  if (!sections || sections.length === 0) {return null;}

  return (
    <div className={styles.themeSections} role="region" aria-label="테마별 섹션">
      {sections.map((section) => (
        <ThemeSectionItem key={section.id} section={section} lang={lang} />
      ))}
    </div>
  );
}

export default memo(ThemeSectionsDisplay);
