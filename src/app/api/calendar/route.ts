/**
 * Destiny Calendar API
 * Saju + Astrology fused yearly important dates
 * AI-assisted calculations (optional backend)
 */

import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";
import {
  calculateYearlyImportantDates,
  type EventCategory,
} from "@/lib/destiny-map/destinyCalendar";
import { calculateSajuData } from "@/lib/Saju/saju";
import { calculateNatalChart } from "@/lib/astrology/foundation/astrologyService";
import { STEM_TO_ELEMENT_EN as STEM_TO_ELEMENT } from "@/lib/Saju/stemElementMapping";
import koTranslations from "@/i18n/locales/ko";
import enTranslations from "@/i18n/locales/en";
import type { TranslationData } from "@/types/calendar-api";
import { logger } from '@/lib/logger';
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache';

// Import from extracted modules
import {
  getPillarStemName,
  getPillarBranchName,
  parseBirthDate,
  formatDateForResponse,
  fetchAIDates,
  LOCATION_COORDS,
} from './lib';

export const dynamic = "force-dynamic";

import { ALLOWED_LOCALES } from '@/lib/constants/api-limits';
import { TIME_RE, LIMITS } from '@/lib/validation/patterns';
import { HTTP_STATUS } from '@/lib/constants/http';
const VALID_CALENDAR_LOCALES = ALLOWED_LOCALES;
const VALID_CALENDAR_GENDERS = new Set(["male", "female"]);
const VALID_CALENDAR_CATEGORIES: readonly EventCategory[] = [
  "wealth",
  "career",
  "love",
  "health",
  "travel",
  "study",
  "general",
];
const _VALID_CALENDAR_PLACES = new Set(Object.keys(LOCATION_COORDS));
const CALENDAR_TIME_RE = TIME_RE;
const CALENDAR_YEAR_RE = /^\d{4}$/;
const MAX_PLACE_LEN = LIMITS.PLACE;

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
  try {
    // Apply middleware: public token auth + rate limiting (no credits for calendar)
    const guardOptions = createPublicStreamGuard({
      route: "calendar",
      limit: 30,
      windowSeconds: 60,
    });

    const { error } = await initializeApiContext(request, guardOptions);
    if (error) {return error;}

    const { searchParams } = new URL(request.url);
    const birthDateParam = searchParams.get("birthDate")?.trim().slice(0, 10);

    if (!birthDateParam) {
      return NextResponse.json(
        { error: "Birth date required", message: "생년월일을 입력해주세요." },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 생년월일 파싱 (UTC 오프셋 영향 없이 고정)
    const birthDate = parseBirthDate(birthDateParam);
    if (!birthDate) {
      return NextResponse.json({ error: "Invalid birth date" }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const birthTimeParam = (searchParams.get("birthTime") || "12:00").trim().slice(0, 5);
    const birthPlaceParam = (searchParams.get("birthPlace") || "Seoul").trim();
    // birthPlace 검증 완화 - 길이만 체크하고 모든 도시 허용
    const birthPlace = birthPlaceParam.length > 0 && birthPlaceParam.length <= MAX_PLACE_LEN ? birthPlaceParam : "Seoul";
    const yearParam = searchParams.get("year")?.trim();
    const year = parseInt(yearParam || String(new Date().getFullYear()), 10);

    // Gender 파라미터 (대운 계산에 필요)
    const genderParam = searchParams.get("gender")?.toLowerCase().trim();
    const gender: "male" | "female" = VALID_CALENDAR_GENDERS.has(genderParam as string)
      ? (genderParam as "male" | "female")
      : "male";

    // Locale 유효성 검사
    const localeParam = searchParams.get("locale")?.toLowerCase().trim() || "ko";
    const locale = VALID_CALENDAR_LOCALES.has(localeParam) ? localeParam : "ko";

    // Category 유효성 검사
    const categoryParam = searchParams.get("category");
    const category: EventCategory | null = categoryParam && VALID_CALENDAR_CATEGORIES.includes(categoryParam as EventCategory)
      ? categoryParam as EventCategory
      : null;

    if (!CALENDAR_TIME_RE.test(birthTimeParam)) {
      return NextResponse.json({ error: "Invalid birth time" }, { status: HTTP_STATUS.BAD_REQUEST });
    }
    if ((yearParam && !CALENDAR_YEAR_RE.test(yearParam)) || !Number.isFinite(year) || year < 1900 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: HTTP_STATUS.BAD_REQUEST });
    }
    // birthPlace는 항상 유효한 값이 있음 (기본값: Seoul)
    const coords = LOCATION_COORDS[birthPlace] || LOCATION_COORDS["Seoul"];
    const timezone = coords.tz;

    // ✅ 정확한 사주 계산 (saju.ts 사용 - 절기 기반 월주, 자시 교차 처리)
    let sajuResult;
    try {
      sajuResult = calculateSajuData(
        birthDateParam,
        birthTimeParam,
        gender,
        'solar',
        timezone
      );
    } catch (sajuError) {
      logger.error("[Calendar] Saju calculation error:", sajuError);
      return NextResponse.json(
        { error: "Failed to calculate saju data" },
        { status: HTTP_STATUS.SERVER_ERROR }
      );
    }

    // 사주 데이터에서 필요한 정보 추출
    // Null safety: pillars 객체가 없을 수 있음
    const sajuPillars = sajuResult?.pillars || {};
    const pillars = {
      year: {
        stem: getPillarStemName(sajuPillars.year),
        branch: getPillarBranchName(sajuPillars.year),
      },
      month: {
        stem: getPillarStemName(sajuPillars.month),
        branch: getPillarBranchName(sajuPillars.month),
      },
      day: {
        stem: getPillarStemName(sajuPillars.day),
        branch: getPillarBranchName(sajuPillars.day),
      },
      hour: {
        stem: getPillarStemName(sajuPillars.time),
        branch: getPillarBranchName(sajuPillars.time),
      },
    };

    const dayMasterStem = pillars.day.stem;
    const dayMasterElement = STEM_TO_ELEMENT[dayMasterStem] || "wood";

    // 대운 추출 - DaeunCycle 타입에 맞춤
    const daeunCycles = sajuResult.unse?.daeun?.map((d) => ({
      age: d.age || 0,
      heavenlyStem: d.heavenlyStem || "",
      earthlyBranch: d.earthlyBranch || "",
    })).filter((d) => d.heavenlyStem && d.earthlyBranch) || [];

    const sajuProfile = {
      dayMaster: dayMasterStem,
      dayMasterElement,
      dayBranch: pillars.day.branch,
      birthYear: birthDate.getFullYear(),
      yearBranch: pillars.year.branch,
      daeunCycles,
      daeunsu: sajuResult.daeWoon?.startAge ?? 0,
      pillars,
    };

    // ✅ 정확한 점성술 계산 (Swiss Ephemeris 사용)
    const [birthHour, birthMinute] = birthTimeParam.split(':').map(Number);
    let astroProfile;
    try {
      const natalChart = await calculateNatalChart({
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        date: birthDate.getDate(),
        hour: birthHour || 12,
        minute: birthMinute || 0,
        latitude: coords.lat,
        longitude: coords.lng,
        timeZone: timezone,
      });

      // 태양 정보 추출
      const sunPlanet = natalChart.planets.find(p => p.name === "Sun");
      const sunSign = sunPlanet?.sign || "Aries";
      const sunLongitude = sunPlanet?.longitude || 0;

      // 별자리 → 오행 매핑
      const ZODIAC_TO_ELEMENT: Record<string, string> = {
        Aries: "fire", Leo: "fire", Sagittarius: "fire",
        Taurus: "earth", Virgo: "earth", Capricorn: "earth",
        Gemini: "metal", Libra: "metal", Aquarius: "metal",  // air → metal
        Cancer: "water", Scorpio: "water", Pisces: "water",
      };

      astroProfile = {
        sunSign,
        sunElement: ZODIAC_TO_ELEMENT[sunSign] || "fire",
        sunLongitude,
        birthMonth: birthDate.getMonth() + 1,
        birthDay: birthDate.getDate(),
      };
    } catch (astroError) {
      logger.warn("[Calendar] Astrology calculation fallback:", astroError);
      // 폴백: 단순 계산
      const month = birthDate.getMonth();
      const day = birthDate.getDate();
      let sunSign = "Aries";
      if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) {sunSign = "Aries";}
      else if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) {sunSign = "Taurus";}
      else if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) {sunSign = "Gemini";}
      else if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) {sunSign = "Cancer";}
      else if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) {sunSign = "Leo";}
      else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {sunSign = "Virgo";}
      else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {sunSign = "Libra";}
      else if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) {sunSign = "Scorpio";}
      else if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) {sunSign = "Sagittarius";}
      else if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) {sunSign = "Capricorn";}
      else if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) {sunSign = "Aquarius";}
      else {sunSign = "Pisces";}

      const ZODIAC_TO_ELEMENT: Record<string, string> = {
        Aries: "fire", Leo: "fire", Sagittarius: "fire",
        Taurus: "earth", Virgo: "earth", Capricorn: "earth",
        Gemini: "metal", Libra: "metal", Aquarius: "metal",
        Cancer: "water", Scorpio: "water", Pisces: "water",
      };

      astroProfile = {
        sunSign,
        sunElement: ZODIAC_TO_ELEMENT[sunSign] || "fire",
        birthMonth: birthDate.getMonth() + 1,
        birthDay: birthDate.getDate(),
      };
    }

    // 로컬 계산으로 중요 날짜 가져오기 (Redis 캐싱 적용)
    const cacheKey = CacheKeys.yearlyCalendar(birthDateParam, birthTimeParam, gender, year, category || undefined);
    const localDates = await cacheOrCalculate(
      cacheKey,
      async () => {
        return calculateYearlyImportantDates(year, sajuProfile, astroProfile, {
          minGrade: 5,  // grade 5 (최악의 날)까지 포함
        });
      },
      CACHE_TTL.CALENDAR_DATA // 1 day
    );

    // 카테고리 필터링
    let filteredDates = localDates;
    if (category) {
      filteredDates = localDates.filter(d => d.categories.includes(category));
    }

    // AI 백엔드에서 추가 정보 시도
    const sajuData = {
      birth_date: birthDateParam,
      birth_time: birthTimeParam,
      gender: "unknown",
      day_master: pillars.day.stem,
      pillars,
      elements: sajuProfile,
    };

    const astroData = {
      birth_date: birthDateParam,
      birth_time: birthTimeParam,
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

    // 6등급별 그룹화
    const grade0 = filteredDates.filter(d => d.grade === 0); // 천운의 날
    const grade1 = filteredDates.filter(d => d.grade === 1); // 아주 좋은 날
    const grade2 = filteredDates.filter(d => d.grade === 2); // 좋은 날
    const grade3 = filteredDates.filter(d => d.grade === 3); // 보통 날
    const grade4 = filteredDates.filter(d => d.grade === 4); // 나쁜 날
    const grade5 = filteredDates.filter(d => d.grade === 5); // 최악의 날

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
        time: birthTimeParam,
        place: birthPlace,
      },
      summary: {
        total: filteredDates.length,
        grade0: grade0.length, // 천운의 날
        grade1: grade1.length, // 아주 좋은 날
        grade2: grade2.length, // 좋은 날
        grade3: grade3.length, // 보통 날
        grade4: grade4.length, // 나쁜 날
        grade5: grade5.length, // 최악의 날
      },
      topDates: (() => {
        // grade0 + grade1 + grade2가 부족하면 grade3 중 높은 점수 날짜도 포함
        const topCandidates = [...grade0, ...grade1, ...grade2];
        if (topCandidates.length < 5) {
          const topGrade3 = grade3
            .sort((a, b) => b.score - a.score)
            .slice(0, 5 - topCandidates.length);
          topCandidates.push(...topGrade3);
        }
        return topCandidates.slice(0, 10).map(d => formatDateForResponse(d, locale, koTranslations as unknown as TranslationData, enTranslations as unknown as TranslationData));
      })(),
      goodDates: [...grade1, ...grade2].slice(0, 20).map(d => formatDateForResponse(d, locale, koTranslations as unknown as TranslationData, enTranslations as unknown as TranslationData)),
      badDates: [...grade5, ...grade4].slice(0, 10).map(d => formatDateForResponse(d, locale, koTranslations as unknown as TranslationData, enTranslations as unknown as TranslationData)),
      worstDates: grade5.slice(0, 5).map(d => formatDateForResponse(d, locale, koTranslations as unknown as TranslationData, enTranslations as unknown as TranslationData)),
      allDates: filteredDates.map(d => formatDateForResponse(d, locale, koTranslations as unknown as TranslationData, enTranslations as unknown as TranslationData)),
      ...(aiDates && {
        aiInsights: {
          auspicious: aiDates.auspicious,
          caution: aiDates.caution,
        },
      }),
    });

    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    logger.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
