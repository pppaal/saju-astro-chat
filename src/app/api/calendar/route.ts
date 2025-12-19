/**
 * Destiny Calendar API
 * 사주 + 점성술 교차 분석 기반 중요 날짜 계산
 * AI 백엔드 연동 버전
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateYearlyImportantDates,
  calculateSajuProfileFromBirthDate,
  calculateAstroProfileFromBirthDate,
  type EventCategory,
  type ImportanceGrade,
  type ImportantDate,
} from "@/lib/destiny-map/destinyCalendar";
import koTranslations from "@/i18n/locales/ko.json";
import enTranslations from "@/i18n/locales/en.json";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.AI_BACKEND_URL ||
  process.env.NEXT_PUBLIC_AI_BACKEND ||
  "http://localhost:5000";

type TranslationData = Record<string, unknown>;

function validateBackendUrl(url: string) {
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[Calendar API] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[Calendar API] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
}

// 번역 헬퍼
function getTranslation(key: string, translations: TranslationData): string {
  const keys = key.split(".");
  let result: unknown = translations;
  for (const k of keys) {
    result = (result as Record<string, unknown>)?.[k];
    if (result === undefined) return key;
  }
  return typeof result === "string" ? result : key;
}

// 사주 분석 요소 번역
const SAJU_FACTOR_TRANSLATIONS: Record<string, { ko: string; en: string }> = {
  stemBijeon: { ko: "일진 천간이 비견(比肩)으로 자기 힘이 강해집니다", en: "Daily stem forms Companion (Bijeon), strengthening personal power" },
  stemInseong: { ko: "일진 천간이 인성(印星)으로 도움과 지원을 받습니다", en: "Daily stem forms Support (Inseong), receiving help and backing" },
  stemJaeseong: { ko: "일진 천간이 재성(財星)으로 재물운이 상승합니다", en: "Daily stem forms Wealth (Jaeseong), boosting financial luck" },
  stemSiksang: { ko: "일진 천간이 식상(食傷)으로 표현력이 빛납니다", en: "Daily stem forms Output (Siksang), enhancing expression" },
  stemGwansal: { ko: "일진 천간이 관살(官殺)로 외부 압박이 있습니다", en: "Daily stem forms Authority (Gwansal), indicating external pressure" },
  branchSamhap: { ko: "일지와 삼합(三合)을 이루어 기운이 조화됩니다", en: "Forms Triple Harmony (Samhap) with day branch, harmonizing energy" },
  branchYukhap: { ko: "일지와 육합(六合)을 이루어 인연이 좋습니다", en: "Forms Six Harmony (Yukhap) with day branch, favoring connections" },
  branchChung: { ko: "일지와 충(冲)하여 에너지 충돌이 있습니다", en: "Clashes (Chung) with day branch, causing energy conflict" },
};

// 점성술 분석 요소 번역
const ASTRO_FACTOR_TRANSLATIONS: Record<string, { ko: string; en: string }> = {
  sameElement: { ko: "트랜짓 태양이 본명 태양과 같은 원소로 에너지가 강화됩니다", en: "Transit Sun shares the same element as natal Sun, amplifying energy" },
  supportElement: { ko: "트랜짓 태양이 본명 태양을 생(生)해주어 힘을 줍니다", en: "Transit Sun supports natal Sun through elemental generation" },
  conflictElement: { ko: "트랜짓 태양이 본명 태양을 극(克)하여 긴장이 있습니다", en: "Transit Sun creates tension through elemental conflict with natal Sun" },
  crossVerified: { ko: "사주와 점성술 분석이 일치하여 영향력이 배가됩니다", en: "Saju and Astrology analyses align, doubling the influence" },
  alignedElement: { ko: "일진 천간과 트랜짓 태양의 원소가 일치합니다", en: "Daily stem element aligns with Transit Sun element" },
};

// 날짜 데이터 변환
interface FormattedDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
}

function formatDateForResponse(date: ImportantDate, locale: string): FormattedDate {
  const translations = locale === "ko" ? koTranslations : enTranslations;
  const factorTrans = locale === "ko" ? "ko" : "en";

  return {
    date: date.date,
    grade: date.grade,
    score: date.score,
    categories: date.categories,
    title: getTranslation(date.titleKey, translations as TranslationData),
    description: getTranslation(date.descKey, translations as TranslationData),
    sajuFactors: date.sajuFactorKeys.map(key =>
      SAJU_FACTOR_TRANSLATIONS[key]?.[factorTrans] || key
    ),
    astroFactors: date.astroFactorKeys.map(key =>
      ASTRO_FACTOR_TRANSLATIONS[key]?.[factorTrans] || key
    ),
    recommendations: date.recommendationKeys.map(key =>
      getTranslation(`calendar.recommendations.${key}`, translations as TranslationData)
    ),
    warnings: date.warningKeys.map(key =>
      getTranslation(`calendar.warnings.${key}`, translations as TranslationData)
    ),
  };
}

// AI 백엔드에서 추가 날짜 정보 가져오기
async function fetchAIDates(sajuData: Record<string, unknown>, astroData: Record<string, unknown>, theme: string = "overall"): Promise<{
  auspicious: Array<{ date?: string; description?: string; is_auspicious?: boolean }>;
  caution: Array<{ date?: string; description?: string; is_auspicious?: boolean }>;
} | null> {
  try {
    validateBackendUrl(BACKEND_URL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${BACKEND_URL}/api/theme/important-dates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({
        theme,
        saju: sajuData,
        astro: astroData,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        auspicious: data.auspicious_dates || [],
        caution: data.caution_dates || [],
      };
    }
  } catch (error) {
    console.warn("[Calendar] AI backend not available, using local calculation:", error);
  }
  return null;
}

// 위치 좌표
const LOCATION_COORDS: Record<string, { lat: number; lng: number; tz: string }> = {
  Seoul: { lat: 37.5665, lng: 126.9780, tz: "Asia/Seoul" },
  Busan: { lat: 35.1796, lng: 129.0756, tz: "Asia/Seoul" },
  Tokyo: { lat: 35.6762, lng: 139.6503, tz: "Asia/Tokyo" },
  "New York": { lat: 40.7128, lng: -74.0060, tz: "America/New_York" },
  "Los Angeles": { lat: 34.0522, lng: -118.2437, tz: "America/Los_Angeles" },
  London: { lat: 51.5074, lng: -0.1278, tz: "Europe/London" },
  Paris: { lat: 48.8566, lng: 2.3522, tz: "Europe/Paris" },
  Beijing: { lat: 39.9042, lng: 116.4074, tz: "Asia/Shanghai" },
  Shanghai: { lat: 31.2304, lng: 121.4737, tz: "Asia/Shanghai" },
};

/**
 * GET /api/calendar
 * 중요 날짜 조회 (인증 불필요)
 *
 * Query params:
 * - birthDate: 생년월일 (YYYY-MM-DD) - 필수
 * - birthTime: 출생시간 (HH:MM) - 선택
 * - birthPlace: 출생장소 - 선택
 * - year: 연도 (기본: 현재년도)
 * - category: 카테고리 필터
 * - locale: 언어 (ko, en)
 */
export async function GET(request: NextRequest) {
  let limitHeaders: Headers | undefined;
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`calendar:${ip}`, { limit: 30, windowSeconds: 60 });
    limitHeaders = limit.headers;
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: limit.reset },
        { status: 429, headers: limit.headers }
      );
    }
    if (!requirePublicToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const { searchParams } = new URL(request.url);
    const birthDateParam = searchParams.get("birthDate");

    if (!birthDateParam) {
      return NextResponse.json(
        { error: "Birth date required", message: "생년월일을 입력해주세요." },
        { status: 400, headers: limit.headers }
      );
    }

    // 생년월일 파싱
    const birthDate = new Date(birthDateParam);
    if (isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: "Invalid birth date" }, { status: 400, headers: limit.headers });
    }

    const birthTime = searchParams.get("birthTime") || "12:00";
    const birthPlace = searchParams.get("birthPlace") || "Seoul";
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const locale = searchParams.get("locale") || "ko";
    const category = searchParams.get("category") as EventCategory | null;
    if (!/^\d{2}:\d{2}$/.test(birthTime)) {
      return NextResponse.json({ error: "Invalid birth time" }, { status: 400, headers: limit.headers });
    }
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400, headers: limit.headers });
    }

    // 사주 프로필 계산
    const sajuProfile = calculateSajuProfileFromBirthDate(birthDate);
    const astroProfile = calculateAstroProfileFromBirthDate(birthDate);

    // 로컬 계산으로 중요 날짜 가져오기
    const localDates = calculateYearlyImportantDates(year, sajuProfile, astroProfile, {
      minGrade: 3,
    });

    // 카테고리 필터링
    let filteredDates = localDates;
    if (category) {
      filteredDates = localDates.filter(d => d.categories.includes(category));
    }

    // AI 백엔드에서 추가 정보 시도
    const coords = LOCATION_COORDS[birthPlace] || LOCATION_COORDS["Seoul"];

    const sajuData = {
      birth_date: birthDateParam,
      birth_time: birthTime,
      gender: "unknown",
      day_master: sajuProfile.dayMaster,
      pillars: {
        year: { stem: sajuProfile.dayMaster, branch: sajuProfile.dayBranch || "" },
        month: { stem: sajuProfile.dayMaster, branch: sajuProfile.dayBranch || "" },
        day: { stem: sajuProfile.dayMaster, branch: sajuProfile.dayBranch || "" },
        hour: { stem: sajuProfile.dayMaster, branch: sajuProfile.dayBranch || "" },
      },
      elements: sajuProfile,
    };

    const astroData = {
      birth_date: birthDateParam,
      birth_time: birthTime,
      latitude: coords.lat,
      longitude: coords.lng,
      timezone: coords.tz,
      sun_sign: astroProfile.sunSign,
      planets: {
        sun: { sign: astroProfile.sunSign, degree: 15 },
        moon: { sign: astroProfile.sunSign, degree: 15 },
      },
    };

    // AI 백엔드 호출 시도
    const aiDates = await fetchAIDates(sajuData, astroData, category || "overall");

    // 등급별 그룹화
    const grade1 = filteredDates.filter(d => d.grade === 1);
    const grade2 = filteredDates.filter(d => d.grade === 2);
    const grade3 = filteredDates.filter(d => d.grade === 3);

    // AI 날짜 병합
    let aiEnhanced = false;
    if (aiDates) {
      aiEnhanced = true;
      // AI 날짜를 기존 날짜에 병합 가능
    }

    const res = NextResponse.json({
      success: true,
      type: "yearly",
      year,
      aiEnhanced,
      birthInfo: {
        date: birthDateParam,
        time: birthTime,
        place: birthPlace,
      },
      summary: {
        total: filteredDates.length,
        grade1: grade1.length,
        grade2: grade2.length,
        grade3: grade3.length,
      },
      topDates: grade1.slice(0, 10).map(d => formatDateForResponse(d, locale)),
      goodDates: grade2.slice(0, 20).map(d => formatDateForResponse(d, locale)),
      cautionDates: grade3.slice(0, 10).map(d => formatDateForResponse(d, locale)),
      allDates: filteredDates.map(d => formatDateForResponse(d, locale)),
      ...(aiDates && {
        aiInsights: {
          auspicious: aiDates.auspicious,
          caution: aiDates.caution,
        },
      }),
    });

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: limitHeaders }
    );
  }
}
