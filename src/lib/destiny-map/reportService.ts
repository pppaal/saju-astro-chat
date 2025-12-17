//src/lib/destiny-map/reportService.ts

'use server';

import { computeDestinyMap } from "./astrologyengine";
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
    validationWarnings?: string[];
    validationPassed?: boolean;
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
// IMPORTANT: Preserve JSON structure (curly braces) for structured responses
function cleanseText(raw: string) {
  if (!raw) return "";

  // Check if this is a JSON response (starts with { or contains lifeTimeline/categoryAnalysis)
  const isJsonResponse = raw.trim().startsWith("{") ||
                          raw.includes('"lifeTimeline"') ||
                          raw.includes('"categoryAnalysis"');

  if (isJsonResponse) {
    // For JSON responses, only clean dangerous content but preserve structure
    return raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+\s*=/gi, "")  // Remove event handlers like onclick=
      .trim();
  }

  // For non-JSON (markdown/text) responses, do full cleansing
  return raw
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/@import.*?;/gi, "")
    .replace(/(html|body|svg|button|form|document\.write|style|font\-family|background)/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[<>]/g, "")  // Only remove angle brackets, NOT curly braces
    .replace(/\s{2,}/g, " ")
    .trim();
}

// 최소 섹션 검증: 프론트 파서/QA용 (재요청 대신 경고 플래그)
const REQUIRED_SECTIONS: Record<string, string[]> = {
  today: ["오늘 한줄요약", "좋은 시간대", "행동 가이드", "교차 하이라이트", "리마인더"],
  career: ["한줄요약", "타이밍", "액션", "교차 하이라이트", "포커스"],
  love: ["한줄요약", "타이밍", "소통", "행동 가이드", "교차 하이라이트", "리마인더"],
  health: ["한줄요약", "루틴", "피로", "회복", "교차 하이라이트", "리마인더"],
  life: ["핵심 정체성", "현재 흐름", "향후", "강점", "도전", "교차 하이라이트", "다음 스텝", "리마인더"],
  family: ["한줄요약", "소통", "협력", "리스크", "교차 하이라이트", "리마인더"],
  month: ["월간 한줄테마", "핵심 주", "영역 카드", "교차 하이라이트", "리마인더"],
  year: ["연간 한줄테마", "분기", "전환", "영역 포커스", "교차 하이라이트", "리마인더"],
  newyear: ["새해 한줄테마", "분기", "준비", "기회", "리스크", "교차 하이라이트", "리마인더"],
};

function validateSections(theme: string, text: string): string[] {
  // Check if this is a structured JSON response
  const isJsonResponse = text.trim().startsWith("{") ||
                          text.includes('"lifeTimeline"') ||
                          text.includes('"categoryAnalysis"');

  // For JSON responses, validate JSON structure instead of text markers
  if (isJsonResponse) {
    const warnings: string[] = [];
    if (theme === "life" || theme === "focus_overall") {
      if (!text.includes('"lifeTimeline"')) {
        warnings.push("JSON 구조 누락: lifeTimeline");
      }
      if (!text.includes('"categoryAnalysis"')) {
        warnings.push("JSON 구조 누락: categoryAnalysis");
      }
      if (!text.includes('"keyInsights"')) {
        warnings.push("JSON 구조 누락: keyInsights");
      }
    }
    return warnings;
  }

  // For text/markdown responses, use traditional validation
  const required = REQUIRED_SECTIONS[theme] || [];
  const warnings: string[] = [];
  for (const marker of required) {
    if (!text.includes(marker)) {
      warnings.push(`섹션 누락: ${marker}`);
    }
  }
  // 교차 근거 체크: 사주/점성 언급이 거의 없으면 경고
  const hasSaju = /사주|오행|십신|대운/.test(text);
  const hasAstro = /점성|행성|하우스|트랜짓|별자리/.test(text);
  if (!hasSaju || !hasAstro) {
    warnings.push("교차 근거 부족: 사주/점성 언급을 모두 포함해야 함");
  }
  return warnings;
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
    mode: "template_v1", // 템플릿 모드 (AI 없이 즉시 생성)
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

  // 2) 템플릿 모드 - AI 없이 계산 데이터로 즉시 리포트 생성
  // extraPrompt가 있으면 상담사 모드로 AI 사용
  const useAI = Boolean(safeExtra);

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
    // 템플릿 모드: 30초, AI 모드: 180초
    const timeoutMs = useAI ? 180000 : 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${backendUrl}/ask`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        theme,
        prompt: safeExtra || "", // 상담사 질문이 있을 때만 프롬프트 전달
        saju: result.saju,
        astro: result.astrology,
        locale: lang,
        render_mode: useAI ? "gpt" : "template", // 🔥 템플릿 모드 (AI 없이 즉시)
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

  // 3.5) Validate required sections / cross evidence
  // Skip validation for error-fallback responses to allow graceful degradation
  const validationWarnings = modelUsed === "error-fallback" ? [] : validateSections(theme, aiText);
  const validationPassed = modelUsed === "error-fallback" ? true : validationWarnings.length === 0;

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
      validationWarnings,
      validationPassed,
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
