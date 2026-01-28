//src/components/destiny-map/Display.tsx

"use client";

import React, { useState, useMemo } from "react";
import type { DestinyResult } from "./Analyzer";
import styles from "@/app/destiny-map/result/result.module.css";

import type { LangKey, ReportType } from "./display/types";
import { I18N, getThemeLabel } from "./display/i18n";
import { tryParseStructured, findThemeData } from "./display/utils";
import {
  ThemeSectionsDisplay,
  KeyInsightsSection,
  LuckyElementsSection,
  LifeTimelineSection,
  CategoryAnalysisSection,
} from "./display/sections";

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

  const themeMatch = findThemeData(result?.themes, activeTheme);
  const themed = themeMatch?.data;
  const name = result?.profile?.name?.trim() || tr.userFallback;
  const interpretationText =
    typeof ((themed as Record<string, unknown>))?.interpretation === "string" ? ((themed as Record<string, unknown>)).interpretation : "";

  const structuredData = useMemo(() => {
    const text = String(interpretationText);
    if (!text.trim()) {return null;}
    return tryParseStructured(text);
  }, [interpretationText]);

  const errorMessage = result.errorMessage || result.error;
  if (errorMessage) {
    return (
      <div className={styles.summary} role="alert">
        Analysis failed: {errorMessage}
      </div>
    );
  }

  return (
    <div>
      {/* Theme selector tabs */}
      {themeKeys.length > 1 && (
        <div
          className="flex gap-2 flex-wrap mb-4"
          role="tablist"
          aria-label="테마 선택"
        >
          {themeKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTheme(key)}
              className={`px-3 py-1.5 rounded-lg cursor-pointer border transition-colors
                ${activeTheme === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-transparent text-inherit border-gray-600 hover:border-gray-400'
                }`}
              role="tab"
              aria-selected={activeTheme === key}
              aria-controls={`theme-panel-${key}`}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      <div className={styles.header}>
        {/* Title badge */}
        <div className="inline-flex items-center gap-4 mb-6 px-8 py-3
          bg-gradient-to-br from-violet-500/15 to-blue-500/15
          rounded-full border border-violet-400/30 backdrop-blur-sm">
          <span className="text-3xl drop-shadow-[0_0_10px_rgba(167,139,250,0.6)]" aria-hidden="true">✨</span>
          <h2 className={styles.title} style={{ margin: 0, fontSize: '2rem', textShadow: 'none' }}>
            {structuredData?.themeSummary || getThemeLabel(activeTheme, lang)}
          </h2>
          <span className="text-3xl drop-shadow-[0_0_10px_rgba(167,139,250,0.6)]" aria-hidden="true">✨</span>
        </div>

        {/* Profile section */}
        <div className={styles.profile}>
          <div className="flex flex-col items-center gap-2 w-full">
            <div className={styles.profileName}>{name}</div>
            {result?.profile?.birthDate && (
              <div className="flex items-center gap-3 text-sm text-violet-400/90">
                <span className="flex items-center gap-1.5">
                  <span className="opacity-70" aria-hidden="true">📅</span>
                  {result.profile.birthDate}
                </span>
                {result?.profile?.birthTime && (
                  <>
                    <span className="opacity-50">•</span>
                    <span className="flex items-center gap-1.5">
                      <span className="opacity-70" aria-hidden="true">🕐</span>
                      {result.profile.birthTime}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme Sections */}
      {structuredData?.sections && structuredData.sections.length > 0 && (
        <ThemeSectionsDisplay sections={structuredData.sections} lang={lang} />
      )}

      {/* Key Insights */}
      {structuredData?.keyInsights && (
        <div className={styles.section}>
          <KeyInsightsSection insights={structuredData.keyInsights} lang={lang} />
        </div>
      )}

      {/* Lucky Elements */}
      {structuredData?.luckyElements && (
        <LuckyElementsSection data={structuredData.luckyElements} lang={lang} />
      )}

      {/* Life Timeline */}
      {structuredData?.lifeTimeline && (
        <LifeTimelineSection data={structuredData.lifeTimeline} lang={lang} />
      )}

      {/* Category Analysis */}
      {structuredData?.categoryAnalysis && (
        <CategoryAnalysisSection categories={structuredData.categoryAnalysis} lang={lang} />
      )}

      {/* Saju & Astro Highlights */}
      {(structuredData?.sajuHighlight || structuredData?.astroHighlight) && (
        <div className={styles.highlightsRow}>
          {structuredData.sajuHighlight && (
            <div className={styles.highlightCard}>
              <span className={styles.highlightIcon} aria-hidden="true">☯️</span>
              <div>
                <div className={styles.highlightTitle}>{structuredData.sajuHighlight.pillar}</div>
                <div className={styles.highlightElement}>{structuredData.sajuHighlight.element}</div>
                <p>{structuredData.sajuHighlight.meaning}</p>
              </div>
            </div>
          )}
          {structuredData.astroHighlight && (
            <div className={styles.highlightCard}>
              <span className={styles.highlightIcon} aria-hidden="true">✨</span>
              <div>
                <div className={styles.highlightTitle}>{structuredData.astroHighlight.planet}</div>
                <div className={styles.highlightElement}>{structuredData.astroHighlight.sign}</div>
                <p>{structuredData.astroHighlight.meaning}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
