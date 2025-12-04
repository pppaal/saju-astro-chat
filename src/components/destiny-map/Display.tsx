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

const EN = {
  userFallback: "User",
  analysisFallback: "Failed to load analysis.",
  tagline: { core: (label: string) => `Integrated summary · Theme: ${label}` },
  followup: "Ask a follow-up question",
};
const I18N: Record<LangKey, typeof EN> = {
  ko: EN,
  en: EN,
  ja: EN,
  zh: EN,
  es: EN,
};

export default function Display({
  result,
  lang = "ko",
  theme,
  reportType: _reportType = "core",
}: {
  result: DestinyResult;
  lang?: LangKey;
  theme?: string;
  reportType?: ReportType;
}) {
  const themeKeys = Object.keys(result?.themes || {});
  const [activeTheme, setActiveTheme] = useState(
    theme || themeKeys[0] || "focus_overall"
  );
  const tr = I18N[lang] ?? I18N.en;

  if ((result as any)?.error) {
    return (
      <div className={styles.summary}>
        Analysis failed: {(result as any).errorMessage || (result as any).error}
      </div>
    );
  }

  const themed = result?.themes?.[activeTheme];
  const name = result?.profile?.name?.trim() || tr.userFallback;

  const fixedText =
    typeof themed?.interpretation === "string"
      ? themed.interpretation
          .replace(/##+\s*/g, "## ")
      : tr.analysisFallback;

  return (
    <div>
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

      <div className={styles.header}>
        <h2 className={styles.title}>{activeTheme}</h2>
        <p className={styles.subtitle}>
          {tr.tagline.core(activeTheme || "report")}
        </p>
        <div className={styles.profile}>
          <span className={styles.kv}>Name: {name}</span>
        </div>
      </div>

      <div className={styles.summary}>
        <ReactMarkdown
          skipHtml={true}
          components={{
            h1: (props) => <h2 className={styles.h2} {...props} />,
            h2: (props) => <h3 className={styles.h2} {...props} />,
            ul: (props) => <ul style={{ marginLeft: 20, lineHeight: 1.7 }} {...props} />,
            li: (props) => <li style={{ marginBottom: 6 }} {...props} />,
            p: (props) => <p style={{ marginBottom: 12 }} {...props} />,
          }}
        >
          {DOMPurify.sanitize(fixedText, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            USE_PROFILES: { html: false },
          })}
        </ReactMarkdown>
      </div>

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
