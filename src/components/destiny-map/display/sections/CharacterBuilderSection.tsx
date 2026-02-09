"use client";

import React, { memo, useMemo } from "react";
import styles from "@/app/destiny-map/result/result.module.css";
import type { CharacterBuilder, LangKey } from "../types";

const renderParagraphs = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => <p key={`${idx}-${line.slice(0, 12)}`}>{line}</p>);

const CharacterCard = memo(
  ({
    label,
    icon,
    content,
  }: {
    label: string;
    icon: string;
    content: string;
  }) => (
    <div className={styles.characterCard}>
      <div className={styles.characterCardHeader}>
        <span className={styles.characterCardIcon} aria-hidden="true">
          {icon}
        </span>
        <h4 className={styles.characterCardTitle}>{label}</h4>
      </div>
      <div className={styles.characterCardBody}>{renderParagraphs(content)}</div>
    </div>
  )
);
CharacterCard.displayName = "CharacterCard";

function CharacterBuilderSection({
  data,
  lang,
}: {
  data: CharacterBuilder;
  lang: LangKey;
}) {
  const keywords = useMemo(() => data?.keywords?.filter(Boolean) ?? [], [data?.keywords]);
  if (!data) {return null;}

  const labels: Record<
    LangKey,
    { title: string; archetype: string; personality: string; conflict: string; growth: string }
  > = {
    ko: {
      title: "🎭 스토리텔링 캐릭터 빌더",
      archetype: "아키타입",
      personality: "성격",
      conflict: "핵심 갈등",
      growth: "성장 곡선",
    },
    en: {
      title: "🎭 Storytelling Character Builder",
      archetype: "Archetype",
      personality: "Personality",
      conflict: "Core Conflict",
      growth: "Growth Arc",
    },
    ja: {
      title: "🎭 物語キャラクタービルダー",
      archetype: "アーキタイプ",
      personality: "性格",
      conflict: "核心の葛藤",
      growth: "成長曲線",
    },
    zh: {
      title: "🎭 角色叙事构建",
      archetype: "原型",
      personality: "性格",
      conflict: "核心冲突",
      growth: "成长曲线",
    },
    es: {
      title: "🎭 Constructor de Personaje",
      archetype: "Arquetipo",
      personality: "Personalidad",
      conflict: "Conflicto Central",
      growth: "Arco de Crecimiento",
    },
  };

  const t = labels[lang] || labels.en;

  return (
    <section className={styles.characterSection} aria-label={t.title}>
      <h3 className={styles.sectionTitle}>{t.title}</h3>
      <div className={styles.characterHeader}>
        {data.archetype && (
          <div className={styles.characterArchetype}>
            <span className={styles.characterArchetypeLabel}>{t.archetype}</span>
            <span className={styles.characterArchetypeValue}>{data.archetype}</span>
          </div>
        )}
        {data.tagline && <p className={styles.characterTagline}>{data.tagline}</p>}
      </div>

      <div className={styles.characterGrid}>
        <CharacterCard label={t.personality} icon="🌟" content={data.personality} />
        <CharacterCard label={t.conflict} icon="⚔️" content={data.conflict} />
        <CharacterCard label={t.growth} icon="🧭" content={data.growthArc} />
      </div>

      {keywords.length > 0 && (
        <div className={styles.characterKeywords}>
          {keywords.map((kw) => (
            <span key={kw} className={styles.characterKeyword}>
              {kw}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export default memo(CharacterBuilderSection);
