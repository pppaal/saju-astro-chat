//src/components/destiny-map/Display.tsx

"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";
import type { DestinyResult } from "./Analyzer";
import Chat from "./Chat";
import styles from "@/app/destiny-map/result/result.module.css";

type LangKey = "en" | "ko" | "ja" | "zh" | "es";
type ReportType = "core" | "timing" | "compat";

const KO = {
  userFallback: "사용자",
  analysisFallback: "분석 결과를 불러오지 못했습니다.",
  tagline: {
    core: (label: string) =>
      `사주 흐름과 서양 분석을 통합한 요약입니다 · Theme: ${label}`,
  },
  followup: "후속 질문하기",
};
const EN = {
  userFallback: "User",
  analysisFallback: "Failed to load analysis.",
  tagline: { core: (label: string) => `Integrated summary · Theme: ${label}` },
  followup: "Ask a follow‑up question",
};
const I18N: Record<LangKey, any> = { ko: KO, en: EN, ja: EN, zh: EN, es: EN };

export default function Display({
  result,
  lang = "ko",
  theme,
  reportType = "core",
}: {
  result: DestinyResult;
  lang?: LangKey;
  theme?: string;
  reportType?: ReportType;
}) {
  const tr = I18N[lang] ?? I18N.ko;

  if ((result as any)?.error) {
    return (
      <div className={styles.summary}>
        ⚠️ 분석 요청 중 오류:
        {(result as any).errorMessage || (result as any).error}
      </div>
    );
  }

  const themeKeys = Object.keys(result?.themes || {});
  const [activeTheme, setActiveTheme] = useState(
    theme || themeKeys[0] || "focus_overall"
  );

  const themed = result?.themes?.[activeTheme];
  const name = result?.profile?.name?.trim() || tr.userFallback;

  // ✅ 개요, 성향, 조언 헤더 바로 뒤에 줄바꿈 없을 경우 자동 \n\n 추가
// ✅ 헤딩(개요/성향/조언) 뒤 누락 개행 자동 보정
  const fixedText =
    typeof themed?.interpretation === "string"
      ? themed.interpretation
          // ##, ###, # # 등 모든 헤더 뒤 줄 바꿈 보정
          .replace(/(#+\s*(개요|성향|조언)\s*)(?![\r\n])/g, "$1\n\n")
          // 혹시 붙은 ## ## 중복 처리
          .replace(/##+\s*/g, "## ")
      : tr.analysisFallback;

  return (
    <div>
      {/* 테마 탭 */}
      {themeKeys.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {themeKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTheme(key)}
              className={styles.badge}
              aria-pressed={activeTheme === key}
              style={{
                background: activeTheme === key ? "#2563eb" : "transparent",
                color: activeTheme === key ? "#fff" : "inherit",
                borderColor: activeTheme === key ? "#2563eb" : "#4b5563",
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{activeTheme} 리포트</h2>
        <p className={styles.subtitle}>
          {tr.tagline.core(activeTheme || "report")}
        </p>
        <div className={styles.profile}>
          <span className={styles.kv}>🌿 이름: {name}</span>
        </div>
      </div>

      {/* 본문 */}
      <div className={styles.summary}>
        <ReactMarkdown
          skipHtml={true}
          components={{
            h1: ({ node, ...props }) => <h2 className={styles.h2} {...props} />,
            h2: ({ node, ...props }) => <h3 className={styles.h2} {...props} />,
            ul: ({ node, ...props }) => (
              <ul style={{ marginLeft: 20, lineHeight: 1.7 }} {...props} />
            ),
            li: ({ node, ...props }) => (
              <li style={{ marginBottom: 6 }} {...props} />
            ),
            p: ({ node, ...props }) => (
              <p style={{ marginBottom: 12 }} {...props} />
            ),
          }}
        >
          {DOMPurify.sanitize(fixedText, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            USE_PROFILES: { html: false },
          })}
        </ReactMarkdown>
      </div>

      {/* 후속 질문 */}
      <div className={styles.section}>
        <h3 className={styles.h2}>{tr.followup}</h3>
        <Chat
          profile={result?.profile as any}
          lang={lang}
          theme={activeTheme}
        />
      </div>
    </div>
  );
}