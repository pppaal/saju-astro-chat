//src/lib/destiny-map/reportService.ts

'use server';

import { computeDestinyMap } from "./astrologyengine";
import { buildPromptByTheme } from "@/lib/destiny-map/prompt/fortune";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/redis-cache";

/**
 * DestinyMap Report Service - Fusion backend version
 */

export interface ReportOutput {
  meta: {
    generator: string;
    generatedAt: string;
    theme: string;
    lang: string;
    name?: string;
    gender?: string;
    modelUsed?: string;
  };
  summary: string;
  report: string;
  raw: any;
}

// Extract reasonable five-element defaults when AI text is unavailable
function extractElements(_text: string) {
  return {
    fiveElements: { wood: 25, fire: 25, earth: 20, metal: 20, water: 15 },
  };
}

// Basic cleansing to remove HTML/script/style directives
function cleanseText(raw: string) {
  if (!raw) return "";
  return raw
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/@import.*?;/gi, "")
    .replace(/(html|body|svg|button|form|document\.write|style|font\-family|background)/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[{}<>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * 사용자 타임존 기준 현재 날짜 반환 (YYYY-MM-DD)
 */
function getDateInTimezone(tz?: string): string {
  const now = new Date();
  if (!tz) return now.toISOString().slice(0, 10);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export async function generateReport({
  name,
  birthDate,
  birthTime,
  latitude,
  longitude,
  gender = "male",
  theme,
  lang = "ko",
  extraPrompt,
  userTimezone,
}: {
  name?: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  gender?: "male" | "female";
  theme: string;
  lang?: string;
  extraPrompt?: string;
  userTimezone?: string;
}): Promise<ReportOutput> {
  // 🔥 Cache check - return cached result if available (TTL: 24h)
  const analysisDate = getDateInTimezone(userTimezone);
  const cacheKey = makeCacheKey("destiny", {
    birthDate,
    birthTime,
    lat: latitude.toFixed(2),
    lon: longitude.toFixed(2),
    theme,
    lang,
    date: analysisDate, // 같은 날에만 캐시 유효
  });

  const cached = await cacheGet<ReportOutput>(cacheKey);
  if (cached) {
    console.log("[DestinyMap] Cache HIT:", cacheKey);
    return cached;
  }
  console.log("[DestinyMap] Cache MISS:", cacheKey);

  const safeExtra = extraPrompt ? guardText(extraPrompt, 2000) : "";
  if (extraPrompt && containsForbidden(extraPrompt)) {
    const msg = safetyMessage(lang);
    return {
      meta: {
        generator: "DestinyMap_Report_via_Fusion",
        generatedAt: new Date().toISOString(),
        theme,
        lang,
        name,
        gender,
        modelUsed: "filtered",
      },
      summary: "",
      report: msg,
      raw: {},
    };
  }

  // 1) Calculate astro + saju baseline (userTimezone으로 트랜짓/프로그레션 계산)
  const result: CombinedResult = await computeDestinyMap({
    name,
    birthDate,
    birthTime,
    latitude,
    longitude,
    gender,
    theme,
    userTimezone,
  });

  // 사용자 타임존 기준 분석 날짜 추가
  result.userTimezone = userTimezone;
  result.analysisDate = analysisDate; // 이미 위에서 계산됨

  // 2) Build theme prompt
  const themePrompt = buildPromptByTheme(theme, lang, result);
  const fullPrompt = safeExtra ? `${themePrompt}\n\n${safeExtra}` : themePrompt;

  // 3) Call fusion backend
  const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";

  let aiText = "";
  let modelUsed = "";

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API authentication if ADMIN_API_TOKEN is available
    const apiToken = process.env.ADMIN_API_TOKEN;
    if (apiToken) {
      headers["X-API-KEY"] = apiToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout (AI generation takes 40-50s)

    const response = await fetch(`${backendUrl}/ask`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        theme,
        prompt: fullPrompt,
        saju: result.saju,
        astro: result.astrology,
        locale: lang,  // Pass language to backend for proper translation
        // 고급 사주 분석 데이터
        advancedSaju: result.saju?.advancedAnalysis,
        // 고급 점성학 데이터 (기본)
        extraPoints: result.extraPoints,
        solarReturn: result.solarReturn,
        lunarReturn: result.lunarReturn,
        progressions: result.progressions,
        // 고급 점성학 데이터 (확장)
        draconic: result.draconic,           // 🐉 드라코닉 (영혼 차트)
        harmonics: result.harmonics,         // 🎵 하모닉
        asteroids: result.asteroids,         // ☄️ 소행성
        fixedStars: result.fixedStars,       // ⭐ 항성
        eclipses: result.eclipses,           // 🌑 일/월식
        electional: result.electional,       // 📅 택일
        midpoints: result.midpoints,         // ⚡ 미드포인트
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Flask server error: ${response.status}`);

    const data = await response.json();

    // Check for fusion_layer or report content
    const fusionText = data?.data?.fusion_layer || data?.data?.report || "";
    const contextText = data?.data?.context || "";

    if (fusionText && fusionText.trim()) {
      aiText = fusionText;
    } else if (contextText && contextText.trim()) {
      // If fusion_layer is empty but we have context, use that
      aiText = lang === "ko"
        ? `사주 및 점성술 분석 결과:\n\n${contextText.substring(0, 2000)}`
        : `Saju and Astrology Analysis:\n\n${contextText.substring(0, 2000)}`;
    } else {
      aiText = lang === "ko"
        ? "백엔드 응답이 없어 기본 데이터만 반환합니다."
        : "No detailed response from fusion backend; returning data-only result.";
    }

    modelUsed = data?.data?.model || "fusion-backend";
  } catch (err) {
    console.error("[DestinyMap] Fusion backend call failed:", err);
    aiText =
      lang === "ko"
        ? "백엔드 응답이 없어 기본 데이터만 반환합니다."
        : "Fusion backend unavailable; returning data-only result.";
    modelUsed = "error-fallback";
  }

  // 4) Assemble response
  const output: ReportOutput = {
    meta: {
      generator: "DestinyMap_Report_via_Fusion",
      generatedAt: new Date().toISOString(),
      theme,
      lang,
      name,
      gender,
      modelUsed,
    },
    summary: result.summary,
    report: cleanseText(aiText),
    raw: { ...result, saju: result.saju ?? extractElements(aiText) },
  };

  // 🔥 Save to cache (24h TTL) - only if we got a real response
  if (modelUsed !== "error-fallback") {
    cacheSet(cacheKey, output, 86400).catch(() => {});
    console.log("[DestinyMap] Cached result:", cacheKey);
  }

  return output;
}
