//src/app/destiny-map/result/page.tsx

"use client";

import * as React from "react";
import { useState, useEffect, useCallback, Suspense } from "react";
import styles from "./result.module.css";
import { logger } from "@/lib/logger";
import { analyzeDestiny } from "@/components/destiny-map/Analyzer";
import Display from "@/components/destiny-map/Display";
import FunInsights from "@/components/destiny-map/FunInsights";
const FortuneDashboard = React.lazy(() => import("@/components/life-prediction/FortuneDashboard"));
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import CreditBadge from "@/components/ui/CreditBadge";
import ShareButton from "@/components/ui/ShareButton";
import PersonalityInsight from "@/components/personality/PersonalityInsight";
import { calculateSajuData } from "@/lib/Saju/saju";

type Lang = "ko" | "en";
type DestinyResult = {
  lang?: string;
  themes?: Record<string, unknown>;
  profile?: { city?: string };
  analysisDate?: string;
  saju?: Record<string, unknown>;
  astrology?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstrology?: Record<string, unknown>;
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

// Life Prediction Skeleton
function LifePredictionSkeleton() {
  return (
    <div style={{ padding: 24, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '8px 0' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ minWidth: 100, height: 140, borderRadius: 12, background: 'rgba(59,130,246,0.1)', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}

// ============================================
// Analyzing Loader Component with Progress Bar
// ============================================
function AnalyzingLoader() {
  const { t } = useI18n();
  const [progress, setProgress] = React.useState(0);
  const [step, setStep] = React.useState(0);

  const steps: { label: string; icon: string }[] = [
    { label: t("destinyMap.result.step1", "Eastern Fortune Analysis..."), icon: "☯" },
    { label: t("destinyMap.result.step2", "Western Fortune Analysis..."), icon: "☉" },
    { label: t("destinyMap.result.step3", "Generating AI Interpretation..."), icon: "✨" },
    { label: t("destinyMap.result.step4", "Finalizing Report..."), icon: "📜" },
  ];

  React.useEffect(() => {
    // Simulate progress: ~45 seconds total
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const increment = prev < 30 ? 3 : prev < 60 ? 2 : prev < 80 ? 1 : 0.5;
        return Math.min(prev + increment, 95);
      });
    }, 500);

    // Step progression
    const stepInterval = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, [steps.length]);

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      padding: 20,
    }}>
      <BackButton />
      <div style={{
        maxWidth: 440,
        width: "100%",
        textAlign: "center",
        padding: "48px 32px",
        background: "rgba(15, 12, 41, 0.8)",
        borderRadius: 24,
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(167, 139, 250, 0.2)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(167, 139, 250, 0.1)",
      }}>
        {/* Animated cosmic icon */}
        <div style={{
          fontSize: 72,
          marginBottom: 28,
          filter: "drop-shadow(0 0 20px rgba(167, 139, 250, 0.6))",
        }}>
          <span style={{
            display: "inline-block",
            animation: "spin 8s linear infinite",
          }}>☯</span>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 22,
          fontWeight: 600,
          color: "#fff",
          marginBottom: 6,
          letterSpacing: "-0.02em",
        }}>
          {t("destinyMap.result.analyzingTitle", "Analyzing Your Destiny")}
        </h2>
        <p style={{ color: "#a78bfa", fontSize: 13, marginBottom: 36, opacity: 0.8 }}>
          {t("destinyMap.result.analyzingSubtitle", "Analyzing Your Destiny Chart")}
        </p>

        {/* Progress bar */}
        <div style={{
          background: "rgba(167, 139, 250, 0.1)",
          borderRadius: 12,
          height: 6,
          overflow: "hidden",
          marginBottom: 12,
          border: "1px solid rgba(167, 139, 250, 0.2)",
        }}>
          <div style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg, #a78bfa, #818cf8, #6366f1)",
            borderRadius: 12,
            transition: "width 0.5s ease-out",
            boxShadow: "0 0 20px rgba(167, 139, 250, 0.6)",
          }} />
        </div>

        {/* Progress percentage */}
        <div style={{
          fontSize: 13,
          color: "#a78bfa",
          fontWeight: 600,
          marginBottom: 28,
        }}>
          {Math.round(progress)}%
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                borderRadius: 12,
                background: i === step ? "rgba(167, 139, 250, 0.15)" : "transparent",
                border: i === step ? "1px solid rgba(167, 139, 250, 0.3)" : "1px solid transparent",
                transition: "all 0.3s",
              }}
            >
              <span style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: i < step ? 14 : 16,
                background: i < step
                  ? "linear-gradient(135deg, #a78bfa, #818cf8)"
                  : i === step
                    ? "rgba(167, 139, 250, 0.3)"
                    : "rgba(255,255,255,0.05)",
                color: i <= step ? "#fff" : "#6b7280",
                boxShadow: i < step ? "0 0 12px rgba(167, 139, 250, 0.5)" : "none",
              }}>
                {i < step ? "✓" : s.icon}
              </span>
              <span style={{
                fontSize: 14,
                color: i <= step ? "#e5e7eb" : "#6b7280",
                textAlign: "left",
                fontWeight: i === step ? 500 : 400,
              }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Fun fact */}
        <p style={{
          marginTop: 32,
          fontSize: 11,
          color: "#6b7280",
          fontStyle: "italic",
        }}>
          {t("destinyMap.result.dataNodes", "Analysis based on 71,000+ data nodes")}
        </p>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

// ✅ searchParams 타입 정의
type SearchParams = Record<string, string | string[] | undefined>;

export default function DestinyResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { t } = useI18n();
  // ✅ Next.js 15 동적 API 규칙 — Promise 언래핑
  const sp = React.use(searchParams);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DestinyResult | null>(null);
  const [activeTheme, setActiveTheme] = useState("focus_love");
  const [cachedAge, setCachedAge] = useState<string | null>(null);

  // Life Prediction states
  const [activeTab, setActiveTab] = useState<"destiny" | "life-prediction">("destiny");
  const [lifePredictionTrend, setLifePredictionTrend] = useState<any>(null);
  const [lifePredictionLoading, setLifePredictionLoading] = useState(false);
  const [lifePredictionError, setLifePredictionError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ------------------------------------------------------------ //
  // 🎯 비즈니스 로직
  // ------------------------------------------------------------ //
  useEffect(() => {
    (async () => {
      const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? "";
      const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? "";
      const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? "";
      const city = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? "";
      const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? "";
      const rawLang = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? "ko";
      const reqLang: Lang = rawLang === "en" ? "en" : "ko";
      const themeParam = (Array.isArray(sp.theme) ? sp.theme[0] : sp.theme) ?? "focus_love";

      const latStr =
        (Array.isArray(sp.lat) ? sp.lat[0] : sp.lat) ??
        (Array.isArray(sp.latitude) ? sp.latitude[0] : sp.latitude);
      const lonStr =
        (Array.isArray(sp.lon) ? sp.lon[0] : sp.lon) ??
        (Array.isArray(sp.longitude) ? sp.longitude[0] : sp.longitude);
      const userTz = (Array.isArray(sp.userTz) ? sp.userTz[0] : sp.userTz) ?? '';

      const latitude = latStr ? Number(latStr) : NaN;
      const longitude = lonStr ? Number(lonStr) : NaN;

      setActiveTheme(themeParam);

      if (!birthDate || !birthTime || !city || isNaN(latitude) || isNaN(longitude)) {
        setError(t("destinyMap.result.errorMissing", "Required fields are missing. (birthDate, birthTime, city, latitude, longitude)"));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const themesReq = [themeParam];
        const res = await analyzeDestiny({
          name,
          birthDate,
          birthTime,
          city,
          gender,
          latitude,
          longitude,
          lang: reqLang,
          themes: themesReq,
          userTimezone: userTz || undefined,
        });
        setResult(res as DestinyResult);

        // Store saju/astro for counselor chat (avoids re-computation)
        // Note: API returns "astrology" but we store as "astro" for consistency
        // Include advanced astrology features for deeper counseling
        if (res?.saju || res?.astrology) {
          try {
            const advancedRes = res as Record<string, unknown>;
            const solarReturn = isRecord(advancedRes.solarReturn) ? advancedRes.solarReturn : null;
            const lunarReturn = isRecord(advancedRes.lunarReturn) ? advancedRes.lunarReturn : null;
            const progressions = isRecord(advancedRes.progressions) ? advancedRes.progressions : null;
            const progressionsSecondary = progressions && isRecord(progressions.secondary) ? progressions.secondary : null;
            const progressionsSolarArc = progressions && isRecord(progressions.solarArc) ? progressions.solarArc : null;
            const draconic = isRecord(advancedRes.draconic) ? advancedRes.draconic : null;
            const harmonics = isRecord(advancedRes.harmonics) ? advancedRes.harmonics : null;
            const midpoints = isRecord(advancedRes.midpoints) ? advancedRes.midpoints : null;
            const fixedStars = Array.isArray(advancedRes.fixedStars) ? advancedRes.fixedStars.slice(0, 5) : null;
            const transits = Array.isArray(advancedRes.transitAspects) ? advancedRes.transitAspects.slice(0, 10) : null;

            sessionStorage.setItem("destinyChartData", JSON.stringify({
              saju: res.saju || {},
              astro: res.astrology || {},  // API returns "astrology", store as "astro"
              // Advanced astrology features for counselor
              advancedAstro: {
                extraPoints: advancedRes.extraPoints || null,
                solarReturn: solarReturn ? { summary: solarReturn.summary } : null,
                lunarReturn: lunarReturn ? { summary: lunarReturn.summary } : null,
                progressions: progressions ? {
                  secondary: progressionsSecondary ? progressionsSecondary.summary : undefined,
                  solarArc: progressionsSolarArc ? progressionsSolarArc.summary : undefined,
                  moonPhase: progressionsSecondary ? progressionsSecondary.moonPhase : undefined,
                } : null,
                draconic: draconic ? draconic.comparison : null,
                harmonics: harmonics ? harmonics.profile : null,
                asteroids: advancedRes.asteroids || null,
                fixedStars,  // Top 5 conjunctions
                eclipses: advancedRes.eclipses || null,
                midpoints: midpoints ? {
                  sunMoon: midpoints.sunMoon,
                  ascMc: midpoints.ascMc,
                } : null,
                transits,  // Top 10 transits
              },
              timestamp: Date.now(),
            }));
            setCachedAge("0m");
          } catch (e) {
            logger.warn("[ResultPage] Failed to store chart data:", e);
          }
        }

        // Trigger referral reward claim (if user was referred)
        try {
          fetch("/api/referral/claim", { method: "POST" }).catch(() => {});
        } catch {
          // Silent fail - not critical
        }
      } catch (err: unknown) {
        logger.error("[ResultPage] analyzeDestiny error:", err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sp, t]);

  // Cached chart timestamp for UI hint
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("destinyChartData");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.timestamp) {
        const minutes = Math.max(0, Math.floor((Date.now() - parsed.timestamp) / 60000));
        setCachedAge(`${minutes}m ago`);
      }
    } catch {
      // ignore
    }
  }, []);

  // Load Life Prediction when tab is switched
  const loadLifePrediction = useCallback(async () => {
    if (lifePredictionTrend || lifePredictionLoading) return;

    const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? "";
    const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? "";
    const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? "Male";
    const rawLang = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? "ko";
    const locale = rawLang === "en" ? "en" : "ko";

    if (!birthDate || !birthTime) return;

    setLifePredictionLoading(true);
    setLifePredictionError(null);

    try {
      const sajuGender = gender === "Female" ? "female" : "male";
      const sajuResult = calculateSajuData(birthDate, birthTime, sajuGender, "solar", "Asia/Seoul");

      const dayStem = sajuResult?.pillars?.day?.heavenlyStem?.name || "甲";
      const dayBranch = sajuResult?.pillars?.day?.earthlyBranch?.name || "子";
      const monthBranch = sajuResult?.pillars?.month?.earthlyBranch?.name || "子";
      const yearBranch = sajuResult?.pillars?.year?.earthlyBranch?.name || "子";
      const allStems = [sajuResult?.pillars?.year?.heavenlyStem?.name, sajuResult?.pillars?.month?.heavenlyStem?.name, dayStem, sajuResult?.pillars?.time?.heavenlyStem?.name].filter(Boolean);
      const allBranches = [yearBranch, monthBranch, dayBranch, sajuResult?.pillars?.time?.earthlyBranch?.name].filter(Boolean);
      const daeunData = sajuResult?.daeWoon?.list || [];
      const birthYear = parseInt(birthDate.split("-")[0]);

      const response = await fetch("/api/life-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "comprehensive", birthYear, birthMonth: parseInt(birthDate.split("-")[1]), birthDay: parseInt(birthDate.split("-")[2]),
          gender: sajuGender, dayStem, dayBranch, monthBranch, yearBranch, allStems, allBranches, daeunList: daeunData, yearsRange: 10, locale,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch prediction");
      const apiResult = await response.json();
      if (apiResult.success && apiResult.data?.multiYearTrend) {
        setLifePredictionTrend(apiResult.data.multiYearTrend);
      } else {
        throw new Error(apiResult.error || "Unknown error");
      }
    } catch (err) {
      logger.error("[LifePrediction] Error:", err);
      setLifePredictionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLifePredictionLoading(false);
    }
  }, [sp, lifePredictionTrend, lifePredictionLoading]);

  useEffect(() => {
    if (activeTab === "life-prediction" && !lifePredictionTrend && !lifePredictionLoading) {
      loadLifePrediction();
    }
  }, [activeTab, lifePredictionTrend, lifePredictionLoading, loadLifePrediction]);

  const handleYearClick = useCallback((year: number) => setSelectedYear(year), []);

  // Save Life Prediction result
  const saveLifePrediction = useCallback(async () => {
    if (!lifePredictionTrend || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const rawLang = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? "ko";
      const response = await fetch("/api/life-prediction/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ multiYearTrend: lifePredictionTrend, saju: result?.saju, astro: result?.astrology, locale: rawLang }),
      });
      if (response.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [lifePredictionTrend, result, sp, saveStatus]);

  // ------------------------------------------------------------ //
  // ⏳ 상태별 렌더링
  // ------------------------------------------------------------ //
  if (loading) {
    return <AnalyzingLoader />;
  }

  if (error) {
    return (
      <main className={styles.page}>
        <BackButton />
        <section className={styles.card}>
          <div style={{ padding: 40, color: "crimson" }}>⚠️ {error}</div>
          <button
            type="button"
            className={styles.submitButton}
            style={{ marginTop: 16 }}
            onClick={() => window.location.reload()}
          >
            {t("destinyMap.result.retry", "Retry")}
          </button>
        </section>
      </main>
    );
  }

  if (!result) {
    return (
      <main className={styles.page}>
        <BackButton />
        <section className={styles.card}>
          <div style={{ padding: 40 }}>{t("destinyMap.result.errorNoResult", "Failed to load results.")}</div>
          <button
            type="button"
            className={styles.submitButton}
            style={{ marginTop: 16 }}
            onClick={() => window.location.reload()}
          >
            {t("destinyMap.result.retry", "Retry")}
          </button>
        </section>
      </main>
    );
  }

  // ------------------------------------------------------------ //
  // ✅ 결과 렌더링
  // ------------------------------------------------------------ //
  const themeKeys = Object.keys(result?.themes || {});
  const lang: Lang = result?.lang === "en" ? "en" : "ko";

  // 분석 기준일 포맷팅 - 사용자 위치(도시) 기준으로 표시
  const userCity = result?.profile?.city || "";
  const analysisDate = result?.analysisDate || new Date().toISOString().slice(0, 10);

  const analysisDateDisplay = (
    <div style={{
      textAlign: 'center',
      marginBottom: 20,
      padding: '10px 20px',
      background: 'rgba(167, 139, 250, 0.1)',
      borderRadius: 12,
      fontSize: 14,
      color: '#a78bfa',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      margin: '0 auto 20px',
    }}>
      <span>📅</span>
      <span>{t("destinyMap.result.analysisDate", "분석 기준")}: {analysisDate}</span>
      {userCity && (
        <span style={{
          opacity: 0.8,
          borderLeft: '1px solid rgba(167, 139, 250, 0.3)',
          paddingLeft: 8,
          marginLeft: 4,
        }}>
          📍 {userCity}
        </span>
      )}
    </div>
  );

  return (
    <main className={styles.page}>
      <BackButton />
      <div className={styles.creditBadgeWrapper}>
        <CreditBadge variant="compact" />
        <ShareButton variant="compact" />
      </div>
      <section className={styles.card}>
        {/* 📅 분석 기준일 표시 */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {analysisDateDisplay}
        </div>

        {/* 🗂️ 탭 네비게이션 */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, justifyContent: 'center', background: 'rgba(15, 12, 41, 0.6)', borderRadius: 16, padding: 4, border: '1px solid rgba(167, 139, 250, 0.15)' }}>
          <button onClick={() => setActiveTab("destiny")} style={{ flex: 1, maxWidth: 200, padding: '14px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: activeTab === "destiny" ? 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' : 'transparent', color: activeTab === "destiny" ? '#fff' : 'rgba(255,255,255,0.6)', boxShadow: activeTab === "destiny" ? '0 4px 20px rgba(139, 92, 246, 0.4)' : 'none' }}>
            <span style={{ fontSize: 18 }}>🗺️</span>
            <span>{t("destinyMap.result.tabDestiny", "운명 분석")}</span>
          </button>
          <button onClick={() => setActiveTab("life-prediction")} style={{ flex: 1, maxWidth: 200, padding: '14px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: activeTab === "life-prediction" ? 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' : 'transparent', color: activeTab === "life-prediction" ? '#fff' : 'rgba(255,255,255,0.6)', boxShadow: activeTab === "life-prediction" ? '0 4px 20px rgba(59, 130, 246, 0.4)' : 'none' }}>
            <span style={{ fontSize: 18 }}>📈</span>
            <span>{t("destinyMap.result.tabLifePrediction", "10년 예측")}</span>
          </button>
        </div>

        {/* ===== DESTINY TAB ===== */}
        {activeTab === "destiny" && (<>
        {/* 🌗 테마 전환 버튼 */}
        {themeKeys.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
              justifyContent: "center",
            }}
          >
            {themeKeys.map((key) => {
              const normalizedKey = key.toLowerCase();
              const presetLabels: Record<string, string> = {
                // Focus themes
                focus_love: t("destinyMap.result.themeLove", "Love"),
                focus_career: t("destinyMap.result.themeCareer", "Career"),
                focus_energy: t("destinyMap.result.themeEnergy", "Energy"),
                focus_overall: t("destinyMap.result.themeOverall", "Overall"),
                focus_health: t("destinyMap.result.themeHealth", "Health"),
                focus_family: t("destinyMap.result.themeFamily", "Family"),
                // Fortune themes
                fortune_new_year: t("destinyMap.result.themeNewYear", "New Year"),
                fortune_next_year: t("destinyMap.result.themeNextYear", "Next Year"),
                fortune_monthly: t("destinyMap.result.themeMonthly", "Monthly"),
                fortune_today: t("destinyMap.result.themeToday", "Today"),
              };
              const label = presetLabels[normalizedKey] ?? key;
              const isActive = activeTheme.toLowerCase() === normalizedKey;

              return (
                <button
                  key={key}
                  onClick={() => setActiveTheme(key)}
                  aria-pressed={isActive}
                  className={styles.badge}
                  style={{
                    background: isActive ? "#2563eb" : "transparent",
                    color: isActive ? "#fff" : "inherit",
                    border: `1px solid ${isActive ? "#2563eb" : "#4b5563"}`,
                    padding: "6px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* 🧮 리포트 본문 렌더 */}
        <Display result={result as Record<string, unknown>} lang={lang} theme={activeTheme} reportType="core" />

        {/* ✨ 재미있는 운세 인사이트 (AI 없이 데이터 기반) */}
        {(() => {
          const advAstro = result?.advancedAstrology || {};
          return (
            <FunInsights
              saju={result?.saju}
              astro={{
                ...(result?.astro || result?.astrology || {}),
                // 🔥 고급 점성학 데이터 병합
                extraPoints: advAstro.extraPoints,
                asteroids: advAstro.asteroids,
                solarReturn: advAstro.solarReturn,
                lunarReturn: advAstro.lunarReturn,
                progressions: advAstro.progressions,
                draconic: advAstro.draconic,
                harmonics: advAstro.harmonics,
                fixedStars: advAstro.fixedStars,
                eclipses: advAstro.eclipses,
                electional: advAstro.electional,
                midpoints: advAstro.midpoints,
              }}
              lang={lang}
              theme={activeTheme}
            />
          );
        })()}

{/* DestinyMatrixStory AI 섹션 제거됨 - FunInsights에서 스토리텔링 형식으로 통합 */}

        {/* ✨ 성격 유형 인사이트 (노바 페르소나 결과 연동) */}
        <PersonalityInsight lang={lang} />

        {/* 🔮 상담사 연결 버튼 */}
        <div style={{ marginTop: 48, marginBottom: 20 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
          }}>
            <div style={{
              flex: 1,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)',
            }} />
            <span style={{
              color: '#a78bfa',
              fontSize: 14,
              fontWeight: 500,
            }}>
              {lang === "ko" ? "더 궁금한 점이 있으신가요?" : "Want to know more?"}
            </span>
            <div style={{
              flex: 1,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)',
            }} />
          </div>

          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("lang", lang); // Ensure lang is passed
              window.location.href = `/destiny-map/counselor?${params.toString()}`;
            }}
            style={{
              width: '100%',
              padding: '18px 24px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 16,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              transition: 'all 0.3s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)';
            }}
          >
            <span style={{ fontSize: 24 }}>🔮</span>
            <span>{lang === "ko" ? "상담사에게 직접 물어보기" : "Ask the Counselor Directly"}</span>
            <span style={{ fontSize: 20 }}>→</span>
          </button>
        </div>
        </>)}

        {/* ===== LIFE PREDICTION TAB ===== */}
        {activeTab === "life-prediction" && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginBottom: 8, background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {lang === "ko" ? "📈 10년 인생 예측" : "📈 10-Year Life Prediction"}
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                {lang === "ko" ? "사주와 대운을 기반으로 한 연도별 운세 흐름" : "Year-by-year fortune flow based on Saju and Daeun"}
              </p>
            </div>

            {lifePredictionLoading && <LifePredictionSkeleton />}

            {lifePredictionError && (
              <div style={{ padding: 32, textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>⚠️</span>
                <p style={{ color: '#f87171', marginBottom: 16 }}>{lifePredictionError}</p>
                <button onClick={() => { setLifePredictionError(null); setLifePredictionTrend(null); loadLifePrediction(); }} style={{ padding: '10px 24px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, cursor: 'pointer' }}>
                  {lang === "ko" ? "다시 시도" : "Retry"}
                </button>
              </div>
            )}

            {lifePredictionTrend && !lifePredictionLoading && (
              <Suspense fallback={<LifePredictionSkeleton />}>
                <FortuneDashboard trend={lifePredictionTrend} locale={lang} onYearClick={handleYearClick} />
              </Suspense>
            )}

            {/* 저장 버튼 */}
            {lifePredictionTrend && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <button
                  onClick={saveLifePrediction}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  style={{
                    padding: '12px 32px', borderRadius: 12, border: 'none', cursor: saveStatus === 'saved' ? 'default' : 'pointer',
                    background: saveStatus === 'saved' ? 'rgba(34, 197, 94, 0.2)' : saveStatus === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: saveStatus === 'saved' ? '#22c55e' : saveStatus === 'error' ? '#f87171' : '#60a5fa',
                    fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.3s ease',
                  }}
                >
                  {saveStatus === 'saving' ? (lang === "ko" ? "저장 중..." : "Saving...") :
                   saveStatus === 'saved' ? (<><span>✓</span>{lang === "ko" ? "저장됨" : "Saved"}</>) :
                   saveStatus === 'error' ? (lang === "ko" ? "저장 실패 - 다시 시도" : "Failed - Retry") :
                   (<><span>💾</span>{lang === "ko" ? "결과 저장하기" : "Save Results"}</>)}
                </button>
              </div>
            )}

            {/* 상담사 버튼 */}
            <div style={{ marginTop: 48, marginBottom: 20 }}>
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("lang", lang);
                  params.set("theme", "future");
                  if (selectedYear) params.set("focusYear", String(selectedYear));
                  window.location.href = `/destiny-map/counselor?${params.toString()}`;
                }}
                style={{ width: '100%', padding: '18px 24px', background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: '#ffffff', fontWeight: 700, fontSize: 16, borderRadius: 16, border: 'none', cursor: 'pointer', boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all 0.3s ease' }}
              >
                <span style={{ fontSize: 24 }}>🔮</span>
                <span>{selectedYear ? (lang === "ko" ? `${selectedYear}년 운세 상담받기` : `Consult about ${selectedYear}`) : (lang === "ko" ? "미래 운세 상담받기" : "Consult about future")}</span>
                <span style={{ fontSize: 20 }}>→</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
