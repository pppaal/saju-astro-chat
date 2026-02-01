//src/app/destiny-map/result/page.tsx

"use client";

import { useState, useEffect, useCallback, useMemo, Suspense, use } from "react";
import styles from "./result.module.css";
import { logger } from "@/lib/logger";
import { analyzeDestiny } from "@/components/destiny-map/Analyzer";
import Display from "@/components/destiny-map/Display";
import FunInsights from "@/components/destiny-map/FunInsights";
import { lazy } from "react";
const FortuneDashboard = lazy(() => import("@/components/life-prediction/FortuneDashboard"));
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
    <div className={styles.skeletonContainer}>
      <div className={styles.skeletonFlex}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.skeletonItem} />
        ))}
      </div>
    </div>
  );
}

// Loader step icons (outside component to avoid recreating)
const LOADER_STEP_ICONS = ["☯", "☉", "✨", "📜"] as const;
const STEP_COUNT = LOADER_STEP_ICONS.length;

// ============================================
// Analyzing Loader Component with Progress Bar
// ============================================
function AnalyzingLoader() {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  const steps = useMemo(() => [
    { label: t("destinyMap.result.step1", "Eastern Fortune Analysis..."), icon: LOADER_STEP_ICONS[0] },
    { label: t("destinyMap.result.step2", "Western Fortune Analysis..."), icon: LOADER_STEP_ICONS[1] },
    { label: t("destinyMap.result.step3", "Generating AI Interpretation..."), icon: LOADER_STEP_ICONS[2] },
    { label: t("destinyMap.result.step4", "Finalizing Report..."), icon: LOADER_STEP_ICONS[3] },
  ], [t]);

  useEffect(() => {
    // Simulate progress: ~45 seconds total
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {return prev;}
        const increment = prev < 30 ? 3 : prev < 60 ? 2 : prev < 80 ? 1 : 0.5;
        return Math.min(prev + increment, 95);
      });
    }, 500);

    // Step progression
    const stepInterval = setInterval(() => {
      setStep((prev) => (prev < STEP_COUNT - 1 ? prev + 1 : prev));
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <main className={styles.loaderMain} aria-busy="true" aria-live="polite">
      <BackButton />
      <div className={styles.loaderCard} role="status">
        <div className={styles.loaderIcon} aria-hidden="true">
          <span className={styles.loaderIconSpin}>☯</span>
        </div>

        <h2 className={styles.loaderTitle}>
          {t("destinyMap.result.analyzingTitle", "Analyzing Your Destiny")}
        </h2>
        <p className={styles.loaderSubtitle}>
          {t("destinyMap.result.analyzingSubtitle", "Analyzing Your Destiny Chart")}
        </p>

        <div className={styles.progressBar} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.progressPercent} aria-live="polite">
          {Math.round(progress)}%
        </div>

        <div className={styles.stepList}>
          {steps.map((s, i) => (
            <div
              key={i}
              className={`${styles.stepItem} ${i === step ? styles.stepItemActive : ""}`}
            >
              <span className={`${styles.stepIcon} ${
                i < step ? styles.stepIconCompleted :
                i === step ? styles.stepIconActive : styles.stepIconPending
              }`}>
                {i < step ? "✓" : s.icon}
              </span>
              <span className={`${styles.stepLabel} ${
                i <= step ? styles.stepLabelActive : styles.stepLabelInactive
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <p className={styles.loaderFunFact}>
          {t("destinyMap.result.dataNodes", "Analysis based on 71,000+ data nodes")}
        </p>
      </div>
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
  const sp = use(searchParams);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DestinyResult | null>(null);
  const [activeTheme, setActiveTheme] = useState("focus_love");

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
      if (!raw) {return;}
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
    if (lifePredictionTrend || lifePredictionLoading) {return;}

    const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? "";
    const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? "";
    const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? "Male";
    const rawLang = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? "ko";
    const locale = rawLang === "en" ? "en" : "ko";

    if (!birthDate || !birthTime) {return;}

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

      if (!response.ok) {throw new Error("Failed to fetch prediction");}
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
    if (!lifePredictionTrend || saveStatus === 'saving') {return;}
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

  // Hooks must be called before any conditional returns
  const handleReload = useCallback(() => window.location.reload(), []);

  // Memoize merged astrology data for FunInsights
  const mergedAstro = useMemo(() => {
    const advAstro = result?.advancedAstrology || {};
    return {
      ...(result?.astro || result?.astrology || {}),
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
    };
  }, [result]);

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
          <div className={styles.errorBox}>⚠️ {error}</div>
          <button
            type="button"
            className={`${styles.submitButton} ${styles.retryButton}`}
            onClick={handleReload}
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
          <div className={styles.errorBox}>{t("destinyMap.result.errorNoResult", "Failed to load results.")}</div>
          <button
            type="button"
            className={`${styles.submitButton} ${styles.retryButton}`}
            onClick={handleReload}
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
    <div className={styles.analysisDateBadge}>
      <span>📅</span>
      <span>{t("destinyMap.result.analysisDate", "분석 기준")}: {analysisDate}</span>
      {userCity && (
        <span className={styles.analysisDateCity}>
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
        <div className={styles.analysisDateWrapper}>
          {analysisDateDisplay}
        </div>

        {/* 🗂️ 탭 네비게이션 */}
        <div className={styles.tabContainer} role="tablist" aria-label={lang === "ko" ? "결과 탭" : "Result tabs"}>
          <button
            onClick={() => setActiveTab("destiny")}
            className={`${styles.tabButton} ${activeTab === "destiny" ? styles.tabButtonDestinyActive : ""}`}
            role="tab"
            aria-selected={activeTab === "destiny"}
            aria-controls="panel-destiny"
            id="tab-destiny"
          >
            <span className={styles.tabIcon} aria-hidden="true">🗺️</span>
            <span>{t("destinyMap.result.tabDestiny", "운명 분석")}</span>
          </button>
          <button
            onClick={() => setActiveTab("life-prediction")}
            className={`${styles.tabButton} ${activeTab === "life-prediction" ? styles.tabButtonLifeActive : ""}`}
            role="tab"
            aria-selected={activeTab === "life-prediction"}
            aria-controls="panel-life-prediction"
            id="tab-life-prediction"
          >
            <span className={styles.tabIcon} aria-hidden="true">📈</span>
            <span>{t("destinyMap.result.tabLifePrediction", "10년 예측")}</span>
          </button>
        </div>

        {/* ===== DESTINY TAB ===== */}
        {activeTab === "destiny" && (<div id="panel-destiny" role="tabpanel" aria-labelledby="tab-destiny">
        {/* 🌗 테마 전환 버튼 */}
        {themeKeys.length > 1 && (
          <div className={styles.themeButtonsContainer}>
            {themeKeys.map((key) => {
              const normalizedKey = key.toLowerCase();
              const presetLabels: Record<string, string> = {
                focus_love: t("destinyMap.result.themeLove", "Love"),
                focus_career: t("destinyMap.result.themeCareer", "Career"),
                focus_energy: t("destinyMap.result.themeEnergy", "Energy"),
                focus_overall: t("destinyMap.result.themeOverall", "Overall"),
                focus_health: t("destinyMap.result.themeHealth", "Health"),
                focus_family: t("destinyMap.result.themeFamily", "Family"),
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
        <FunInsights
          saju={result?.saju}
          astro={mergedAstro}
          lang={lang}
          theme={activeTheme}
        />

{/* DestinyMatrixStory AI 섹션 제거됨 - FunInsights에서 스토리텔링 형식으로 통합 */}

        {/* ✨ 성격 유형 인사이트 (노바 페르소나 결과 연동) */}
        <PersonalityInsight lang={lang} />

        {/* 🔮 상담사 연결 버튼 */}
        <div className={styles.counselorSection}>
          <div className={styles.counselorDivider}>
            <div className={styles.counselorLine} />
            <span className={styles.counselorLabel}>
              {lang === "ko" ? "더 궁금한 점이 있으신가요?" : "Want to know more?"}
            </span>
            <div className={styles.counselorLine} />
          </div>

          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("lang", lang);
              window.location.href = `/destiny-map/counselor?${params.toString()}`;
            }}
            className={styles.counselorButton}
          >
            <span className={styles.counselorButtonIcon}>🔮</span>
            <span>{lang === "ko" ? "상담사에게 직접 물어보기" : "Ask the Counselor Directly"}</span>
            <span className={styles.counselorButtonArrow}>→</span>
          </button>
        </div>
        </div>)}

        {/* ===== LIFE PREDICTION TAB ===== */}
        {activeTab === "life-prediction" && (
          <div id="panel-life-prediction" role="tabpanel" aria-labelledby="tab-life-prediction">
            <div className={styles.lifePredictionHeader}>
              <h2 className={styles.lifePredictionTitle}>
                {lang === "ko" ? "📈 10년 인생 예측" : "📈 10-Year Life Prediction"}
              </h2>
              <p className={styles.lifePredictionSubtitle}>
                {lang === "ko" ? "사주와 대운을 기반으로 한 연도별 운세 흐름" : "Year-by-year fortune flow based on Saju and Daeun"}
              </p>
            </div>

            {lifePredictionLoading && <LifePredictionSkeleton />}

            {lifePredictionError && (
              <div className={styles.lifePredictionError}>
                <span className={styles.lifePredictionErrorIcon}>⚠️</span>
                <p className={styles.lifePredictionErrorText}>{lifePredictionError}</p>
                <button
                  onClick={() => { setLifePredictionError(null); setLifePredictionTrend(null); loadLifePrediction(); }}
                  className={styles.lifePredictionRetryButton}
                >
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
              <div className={styles.saveButtonContainer}>
                <button
                  onClick={saveLifePrediction}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  className={`${styles.saveButton} ${
                    saveStatus === 'saved' ? styles.saveButtonSaved :
                    saveStatus === 'error' ? styles.saveButtonError : styles.saveButtonIdle
                  }`}
                >
                  {saveStatus === 'saving' ? (lang === "ko" ? "저장 중..." : "Saving...") :
                   saveStatus === 'saved' ? (<><span>✓</span>{lang === "ko" ? "저장됨" : "Saved"}</>) :
                   saveStatus === 'error' ? (lang === "ko" ? "저장 실패 - 다시 시도" : "Failed - Retry") :
                   (<><span>💾</span>{lang === "ko" ? "결과 저장하기" : "Save Results"}</>)}
                </button>
              </div>
            )}

            {/* 상담사 버튼 */}
            <div className={styles.counselorSection}>
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("lang", lang);
                  params.set("theme", "future");
                  if (selectedYear) {params.set("focusYear", String(selectedYear));}
                  window.location.href = `/destiny-map/counselor?${params.toString()}`;
                }}
                className={`${styles.counselorButton} ${styles.counselorButtonBlue}`}
              >
                <span className={styles.counselorButtonIcon}>🔮</span>
                <span>{selectedYear ? (lang === "ko" ? `${selectedYear}년 운세 상담받기` : `Consult about ${selectedYear}`) : (lang === "ko" ? "미래 운세 상담받기" : "Consult about future")}</span>
                <span className={styles.counselorButtonArrow}>→</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
