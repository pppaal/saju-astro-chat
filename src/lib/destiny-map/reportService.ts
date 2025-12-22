//src/lib/destiny-map/reportService.ts

'use server';

import { computeDestinyMap } from "./astrologyengine";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/redis-cache";
import crypto from "crypto";

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
    backendAvailable?: boolean;
    promptTrimmed?: boolean;
  };
  summary: string;
  report: string;
  raw: any;
  crossHighlights?: { summary: string; points?: string[] };
  themes?: Record<string, unknown>;
}

// Extract reasonable five-element defaults when AI text is unavailable
function extractElements(_text: string) {
  return {
    fiveElements: { wood: 25, fire: 25, earth: 20, metal: 20, water: 15 },
  };
}

function hashName(name?: string) {
  if (!name) return "anon";
  return crypto.createHash("sha256").update(name).digest("hex").slice(0, 12);
}

function maskDisplayName(name?: string) {
  if (!name) return undefined;
  const first = name.trim().slice(0, 1) || "";
  return `${first}***`;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function maskTextWithName(text: string, name?: string) {
  if (!text || !name) return text;
  try {
    return text.replace(new RegExp(escapeRegExp(name), "g"), "***");
  } catch {
    return text;
  }
}

/**
 * 로컬 템플릿 기반 리포트 생성 (AI 없이 사주/점성 데이터만으로)
 */
function generateLocalReport(result: CombinedResult, theme: string, lang: string, name?: string): string {
  const isKo = lang === "ko";
  const saju = result.saju;
  const astro = result.astrology;

  // 디버그 로그
  console.log("[generateLocalReport] saju keys:", saju ? Object.keys(saju) : "null");
  console.log("[generateLocalReport] saju.dayMaster:", JSON.stringify(saju?.dayMaster));
  console.log("[generateLocalReport] saju.facts?.dayMaster:", JSON.stringify((saju?.facts as any)?.dayMaster));

  // 일간 정보 추출 - 여러 경로에서 시도
  const dayMasterRaw = saju?.dayMaster || (saju?.facts as any)?.dayMaster || {};
  const pillarsDay = (saju?.pillars as any)?.day;
  const dayMasterName = dayMasterRaw?.name || dayMasterRaw?.heavenlyStem ||
    pillarsDay?.heavenlyStem?.name || "Unknown";
  const dayMasterElement = dayMasterRaw?.element ||
    pillarsDay?.heavenlyStem?.element || "Unknown";

  console.log("[generateLocalReport] dayMasterName:", dayMasterName, "element:", dayMasterElement);

  // 오행 정보 - facts에서 가져오기
  const sajuFacts = saju?.facts as { fiveElements?: Record<string, number> } | undefined;
  const fiveElements = (saju as any)?.fiveElements || sajuFacts?.fiveElements || {};
  const dominantElement = Object.entries(fiveElements)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || "unknown";
  const weakestElement = Object.entries(fiveElements)
    .sort(([, a], [, b]) => (a as number) - (b as number))[0]?.[0] || "unknown";

  // 태양 별자리
  const sunSign = Array.isArray(astro?.planets)
    ? astro.planets.find((p: any) => p?.name?.toLowerCase() === "sun")?.sign
    : (astro?.planets as { sun?: { sign?: string } })?.sun?.sign || (astro?.facts as { sun?: { sign?: string } })?.sun?.sign || "Unknown";

  // 달 별자리
  const moonSign = Array.isArray(astro?.planets)
    ? astro.planets.find((p: any) => p?.name?.toLowerCase() === "moon")?.sign
    : (astro?.planets as { moon?: { sign?: string } })?.moon?.sign || (astro?.facts as { moon?: { sign?: string } })?.moon?.sign || "Unknown";

  // 상승궁
  const ascendant = (astro?.ascendant as { sign?: string })?.sign || (astro?.facts as { ascendant?: { sign?: string } })?.ascendant?.sign || "Unknown";

  // 오행 번역
  const elementNames: Record<string, { ko: string; en: string }> = {
    wood: { ko: "목(木)", en: "Wood" },
    fire: { ko: "화(火)", en: "Fire" },
    earth: { ko: "토(土)", en: "Earth" },
    metal: { ko: "금(金)", en: "Metal" },
    water: { ko: "수(水)", en: "Water" },
  };

  // 별자리 번역
  const signNames: Record<string, { ko: string; en: string }> = {
    aries: { ko: "양자리", en: "Aries" },
    taurus: { ko: "황소자리", en: "Taurus" },
    gemini: { ko: "쌍둥이자리", en: "Gemini" },
    cancer: { ko: "게자리", en: "Cancer" },
    leo: { ko: "사자자리", en: "Leo" },
    virgo: { ko: "처녀자리", en: "Virgo" },
    libra: { ko: "천칭자리", en: "Libra" },
    scorpio: { ko: "전갈자리", en: "Scorpio" },
    sagittarius: { ko: "사수자리", en: "Sagittarius" },
    capricorn: { ko: "염소자리", en: "Capricorn" },
    aquarius: { ko: "물병자리", en: "Aquarius" },
    pisces: { ko: "물고기자리", en: "Pisces" },
  };

  const getDominantName = () => elementNames[dominantElement]?.[isKo ? "ko" : "en"] || dominantElement;
  const getWeakestName = () => elementNames[weakestElement]?.[isKo ? "ko" : "en"] || weakestElement;
  const getSunSignName = () => signNames[sunSign?.toLowerCase()]?.[isKo ? "ko" : "en"] || sunSign;
  const getMoonSignName = () => signNames[moonSign?.toLowerCase()]?.[isKo ? "ko" : "en"] || moonSign;
  const getAscName = () => signNames[ascendant?.toLowerCase()]?.[isKo ? "ko" : "en"] || ascendant;

  // 사주 기반 특성 메시지
  const elementTraits: Record<string, { ko: string; en: string }> = {
    wood: {
      ko: "성장과 창의성을 추구하며, 새로운 시작에 강한 에너지를 보입니다",
      en: "Seeks growth and creativity, showing strong energy for new beginnings"
    },
    fire: {
      ko: "열정과 리더십이 강하며, 주변을 밝히는 카리스마가 있습니다",
      en: "Strong passion and leadership, with charisma that lights up surroundings"
    },
    earth: {
      ko: "안정과 신뢰를 중시하며, 현실적이고 꾸준한 성향입니다",
      en: "Values stability and trust, with a realistic and steady disposition"
    },
    metal: {
      ko: "원칙과 정의를 중시하며, 결단력과 집중력이 뛰어납니다",
      en: "Values principles and justice, with excellent decisiveness and focus"
    },
    water: {
      ko: "지혜와 적응력이 뛰어나며, 깊은 통찰력을 지닙니다",
      en: "Excellent wisdom and adaptability, with deep insight"
    },
  };

  const getElementTrait = () => elementTraits[dominantElement]?.[isKo ? "ko" : "en"] || "";

  // 테마별 리포트 생성
  if (isKo) {
    return `## 사주×점성 통합 분석

### 핵심 정체성
당신의 일간은 **${dayMasterName}**(${dayMasterElement})이며, 태양은 **${getSunSignName()}**, 달은 **${getMoonSignName()}**에 위치합니다.

오행 중 **${getDominantName()}** 기운이 가장 강하고, **${getWeakestName()}** 기운이 상대적으로 약합니다.
${getElementTrait()}

### 사주 분석 (동양)
- 일간: ${dayMasterName} (${dayMasterElement})
- 우세 오행: ${getDominantName()}
- 부족 오행: ${getWeakestName()}
- 오행 분포: 목 ${fiveElements.wood || 0}%, 화 ${fiveElements.fire || 0}%, 토 ${fiveElements.earth || 0}%, 금 ${fiveElements.metal || 0}%, 수 ${fiveElements.water || 0}%

### 점성 분석 (서양)
- 태양: ${getSunSignName()} - 핵심 자아와 정체성
- 달: ${getMoonSignName()} - 감정과 내면
- 상승궁: ${getAscName()} - 외부에 보이는 모습

### 융합 인사이트
${getDominantName()} 기운과 ${getSunSignName()}의 에너지가 결합되어, 독특한 성향과 잠재력을 형성합니다.
${getWeakestName()} 기운을 보완하면 더욱 균형 잡힌 발전이 가능합니다.

---
*사주와 점성을 융합한 분석입니다. 더 자세한 상담은 상담사에게 문의하세요.*`;
  } else {
    return `## Saju × Astrology Fusion Analysis

### Core Identity
Your Day Master is **${dayMasterName}** (${dayMasterElement}), with Sun in **${getSunSignName()}** and Moon in **${getMoonSignName()}**.

Among the Five Elements, **${getDominantName()}** is strongest while **${getWeakestName()}** is relatively weak.
${getElementTrait()}

### Saju Analysis (Eastern)
- Day Master: ${dayMasterName} (${dayMasterElement})
- Dominant Element: ${getDominantName()}
- Weak Element: ${getWeakestName()}
- Element Distribution: Wood ${fiveElements.wood || 0}%, Fire ${fiveElements.fire || 0}%, Earth ${fiveElements.earth || 0}%, Metal ${fiveElements.metal || 0}%, Water ${fiveElements.water || 0}%

### Astrology Analysis (Western)
- Sun: ${getSunSignName()} - Core self and identity
- Moon: ${getMoonSignName()} - Emotions and inner world
- Ascendant: ${getAscName()} - How others perceive you

### Fusion Insight
The combination of ${getDominantName()} energy and ${getSunSignName()} creates a unique personality and potential.
Strengthening your ${getWeakestName()} element can lead to more balanced development.

---
*This is a fusion analysis of Saju and Astrology. For detailed consultation, please ask the counselor.*`;
  }
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
  const warnings: string[] = [];

  // 1) JSON 응답: 파싱 후 필수 키 확인
  const isJsonResponse = text.trim().startsWith("{") ||
    text.includes('"lifeTimeline"') ||
    text.includes('"categoryAnalysis"');

  if (isJsonResponse) {
    try {
      const parsed = JSON.parse(text);
      const ensureKeys = (obj: any, keys: string[]) => {
        for (const k of keys) {
          if (!(k in obj)) warnings.push(`JSON 키 누락: ${k}`);
        }
      };

      if (theme === "life" || theme === "focus_overall") {
        ensureKeys(parsed, ["lifeTimeline", "categoryAnalysis", "keyInsights"]);
      }
      if (theme === "today" || theme === "fortune_today") {
        ensureKeys(parsed, ["daySummary", "timing", "advice"]);
      }
    } catch {
      warnings.push("JSON 파싱 실패");
    }
    return warnings;
  }

  // 2) 텍스트/마크다운 응답: 마커 기반
  const required = REQUIRED_SECTIONS[theme] || [];
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
    lat: latitude.toFixed(4),
    lon: longitude.toFixed(4),
    theme,
    lang,
    date: analysisDate, // 같은 날에만 캐시 유효
    mode: "template_v4", // v4: birthDate를 saju.facts에 추가 (대운/세운 나이 계산용)
    name: hashName(name),
    gender,
    userTimezone: userTimezone || "unknown",
  });

  const cached = await cacheGet<ReportOutput>(cacheKey);
  if (cached) {
    console.log("[DestinyMap] Cache HIT:", cacheKey);
    return cached;
  }
  console.log("[DestinyMap] Cache MISS:", cacheKey);

  const safeExtra = extraPrompt ? guardText(extraPrompt, 2000) : "";
  const promptWasTrimmed = safeExtra.length > 1200;
  const effectivePrompt = promptWasTrimmed ? safeExtra.slice(0, 1200) : safeExtra;
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

  // 3) Call fusion backend (optional - fallback to local template if unavailable)
  const backendUrl =
    process.env.AI_BACKEND_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND;

  let aiText = "";
  let modelUsed = "";
  let backendAvailable = true;

  // 백엔드 URL이 없거나 템플릿 모드일 경우 로컬 생성
  if (!backendUrl) {
    console.log("[DestinyMap] No backend URL - using local template generation");
    aiText = generateLocalReport(result, theme, lang, name);
    modelUsed = "local-template";
  } else {
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
          prompt: effectivePrompt || "", // 상담사 질문이 있을 때만 프롬프트 전달
        prompt_trimmed: promptWasTrimmed,
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
        // 백엔드 응답이 없으면 로컬 생성
        aiText = generateLocalReport(result, theme, lang, name);
      }

      modelUsed = data?.data?.model || "fusion-backend";
    } catch (err) {
      console.error("[DestinyMap] Fusion backend call failed:", err);
      backendAvailable = false;
      // 백엔드 실패 시 로컬 생성으로 fallback
      aiText = generateLocalReport(result, theme, lang, name);
      modelUsed = "local-template";
    }
  }

  // 3.5) Validate required sections / cross evidence
  // Skip validation for local-template and error-fallback responses to allow graceful degradation
  const validationWarnings = (modelUsed === "error-fallback" || modelUsed === "local-template") ? [] : validateSections(theme, aiText);
  if (!backendAvailable) {
    validationWarnings.push("backend_unavailable");
  }
  const validationPassed = validationWarnings.length === 0;

  // 4) Assemble response with name masking for privacy
  const maskedName = maskDisplayName(name);
  const maskedSummary = maskTextWithName(result.summary, name);
  const maskedReport = maskTextWithName(cleanseText(aiText), name);
  const maskedRaw = {
    ...result,
    meta: { ...(result.meta || {}), name: maskedName },
    saju: result.saju ?? extractElements(aiText),
  };

  const output: ReportOutput = {
    meta: {
      generator: "DestinyMap_Report_via_Fusion",
      generatedAt: new Date().toISOString(),
      theme,
      lang,
      name: maskedName,
      gender,
      modelUsed,
      validationWarnings,
      validationPassed,
      backendAvailable,
      promptTrimmed: promptWasTrimmed || undefined,
    },
    summary: maskedSummary,
    report: maskedReport,
    raw: maskedRaw,
  };

  // 🔥 Save to cache (24h TTL) - only if we got a real response
  if (modelUsed !== "error-fallback") {
    cacheSet(cacheKey, output, 86400).catch(() => {});
    console.log("[DestinyMap] Cached result:", cacheKey);
  }

  return output;
}
