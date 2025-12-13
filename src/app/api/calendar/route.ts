/**
 * Destiny Calendar API
 * 프리미엄 기능 - 중요 날짜 캘린더
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import {
  calculateYearlyImportantDates,
  calculateMonthlyImportantDates,
  findBestDatesForCategory,
  extractSajuProfile,
  extractAstroProfile,
  calculateSajuProfileFromBirthDate,
  calculateAstroProfileFromBirthDate,
  type EventCategory,
  type ImportanceGrade,
  type ImportantDate,
} from "@/lib/destiny-map/destinyCalendar";
import koTranslations from "@/i18n/locales/ko.json";
import enTranslations from "@/i18n/locales/en.json";

export const dynamic = "force-dynamic";

// 번역 데이터 타입 (더 유연하게)
type TranslationData = Record<string, any>;

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

// 번역 헬퍼
function getTranslation(key: string, translations: TranslationData): string {
  const keys = key.split(".");
  let result: any = translations;
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) return key;
  }
  return typeof result === "string" ? result : key;
}

// 날짜 데이터 변환 (컴포넌트 형식으로)
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
    title: getTranslation(date.titleKey, translations),
    description: getTranslation(date.descKey, translations),
    sajuFactors: date.sajuFactorKeys.map(key =>
      SAJU_FACTOR_TRANSLATIONS[key]?.[factorTrans] || key
    ),
    astroFactors: date.astroFactorKeys.map(key =>
      ASTRO_FACTOR_TRANSLATIONS[key]?.[factorTrans] || key
    ),
    recommendations: date.recommendationKeys.map(key =>
      getTranslation(`calendar.recommendations.${key}`, translations)
    ),
    warnings: date.warningKeys.map(key =>
      getTranslation(`calendar.warnings.${key}`, translations)
    ),
  };
}

/**
 * GET /api/calendar
 * 중요 날짜 조회
 *
 * Query params:
 * - year: 연도 (기본: 현재년도)
 * - month: 월 (0-11, 없으면 연간)
 * - category: 카테고리 필터 (wealth, career, love, health, travel, study)
 * - grade: 최소 등급 (1, 2, 3)
 * - limit: 결과 수 제한
 * - locale: 언어 (ko, en)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const birthDateParam = searchParams.get("birthDate");

    let sajuProfile;
    let astroProfile;

    // 생년월일이 직접 전달된 경우 - 바로 계산
    if (birthDateParam) {
      const birthDate = new Date(birthDateParam);
      if (isNaN(birthDate.getTime())) {
        return NextResponse.json({ error: "Invalid birth date" }, { status: 400 });
      }
      sajuProfile = calculateSajuProfileFromBirthDate(birthDate);
      astroProfile = calculateAstroProfileFromBirthDate(birthDate);
    } else {
      // 저장된 프로필에서 가져오기
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const memory = await prisma.personaMemory.findUnique({
        where: { userId: user.id },
      });

      if (!memory?.sajuProfile || !memory?.birthChart) {
        return NextResponse.json(
          {
            error: "Profile required",
            message: "먼저 운명 지도를 생성해주세요.",
          },
          { status: 400 }
        );
      }

      sajuProfile = extractSajuProfile(memory.sajuProfile);
      astroProfile = extractAstroProfile(memory.birthChart);
    }

    // 나머지 파라미터 파싱
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const monthParam = searchParams.get("month");
    const category = searchParams.get("category") as EventCategory | null;
    const gradeParam = searchParams.get("grade");
    const limitParam = searchParams.get("limit");
    const locale = searchParams.get("locale") ||
      request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] || "ko";

    const minGrade = gradeParam ? parseInt(gradeParam) as ImportanceGrade : 3;
    const limit = limitParam ? parseInt(limitParam) : undefined;

    // 월별 조회
    if (monthParam !== null) {
      const month = parseInt(monthParam);
      const result = calculateMonthlyImportantDates(year, month, sajuProfile, astroProfile);

      return NextResponse.json({
        success: true,
        type: "monthly",
        year: result.year,
        month: result.month,
        dates: result.dates.map(d => formatDateForResponse(d, locale)),
      });
    }

    // 카테고리별 베스트 날짜
    if (category) {
      const dates = findBestDatesForCategory(
        year,
        category,
        sajuProfile,
        astroProfile,
        limit || 10
      );

      return NextResponse.json({
        success: true,
        type: "category",
        category,
        year,
        dates: dates.map(d => formatDateForResponse(d, locale)),
        count: dates.length,
      });
    }

    // 연간 중요 날짜
    const dates = calculateYearlyImportantDates(year, sajuProfile, astroProfile, {
      minGrade,
      limit,
    });

    // 등급별 그룹화
    const grade1 = dates.filter(d => d.grade === 1);
    const grade2 = dates.filter(d => d.grade === 2);
    const grade3 = dates.filter(d => d.grade === 3);

    return NextResponse.json({
      success: true,
      type: "yearly",
      year,
      summary: {
        total: dates.length,
        grade1: grade1.length,
        grade2: grade2.length,
        grade3: grade3.length,
      },
      topDates: grade1.slice(0, 10).map(d => formatDateForResponse(d, locale)),
      goodDates: grade2.slice(0, 20).map(d => formatDateForResponse(d, locale)),
      cautionDates: grade3.slice(0, 10).map(d => formatDateForResponse(d, locale)),
      allDates: dates.map(d => formatDateForResponse(d, locale)),
    });
  } catch (error: any) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
