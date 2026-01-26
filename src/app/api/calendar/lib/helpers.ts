/**
 * @file Calendar API helper functions
 * Extracted from route.ts for modularity
 */

import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api/ApiClient';
import type { EventCategory, ImportanceGrade, ImportantDate } from "@/lib/destiny-map/destinyCalendar";
import type { TranslationData } from "@/types/calendar-api";
import type { PillarData } from "@/lib/Saju/types";
import type { SajuPillarAccessor, FormattedDate, LocationCoord } from './types';
import { getFactorTranslation } from './translations';
import { KO_MESSAGES, EN_MESSAGES } from './constants';
import { SCORE_THRESHOLDS } from '@/constants/scoring';

// Translation helper
export function getTranslation(key: string, translations: TranslationData): string {
  const keys = key.split(".");
  let result: unknown = translations;
  for (const k of keys) {
    result = (result as Record<string, unknown>)?.[k];
    if (result === undefined) {return key;}
  }
  return typeof result === "string" ? result : key;
}

export function validateBackendUrl(url: string) {
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    logger.warn("[Calendar API] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    logger.warn("[Calendar API] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
}

export function getPillarStemName(pillar: PillarData | SajuPillarAccessor | undefined): string {
  if (!pillar) {return "";}
  const p = pillar as SajuPillarAccessor;
  // PillarData format (heavenlyStem is object with name)
  if (typeof p.heavenlyStem === 'object' && p.heavenlyStem && 'name' in p.heavenlyStem) {
    return p.heavenlyStem.name || "";
  }
  // Simple format with stem.name
  if (typeof p.stem === 'object' && p.stem && 'name' in p.stem) {
    return p.stem.name || "";
  }
  // String format
  if (typeof p.heavenlyStem === 'string') {return p.heavenlyStem;}
  if (typeof p.stem === 'string') {return p.stem;}
  return "";
}

export function getPillarBranchName(pillar: PillarData | SajuPillarAccessor | undefined): string {
  if (!pillar) {return "";}
  const p = pillar as SajuPillarAccessor;
  // PillarData format (earthlyBranch is object with name)
  if (typeof p.earthlyBranch === 'object' && p.earthlyBranch && 'name' in p.earthlyBranch) {
    return p.earthlyBranch.name || "";
  }
  // Simple format with branch.name
  if (typeof p.branch === 'object' && p.branch && 'name' in p.branch) {
    return p.branch.name || "";
  }
  // String format
  if (typeof p.earthlyBranch === 'string') {return p.earthlyBranch;}
  if (typeof p.branch === 'string') {return p.branch;}
  return "";
}

// ==== Date helpers ====
export function parseBirthDate(birthDateParam: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateParam);
  if (!match) {return null;}
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {return null;}
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

// 한줄 요약 생성
export function generateSummary(
  grade: ImportanceGrade,
  categories: EventCategory[],
  score: number,
  lang: "ko" | "en",
  sajuFactorKeys?: string[],
  astroFactorKeys?: string[]
): string {
  const cat = categories[0] || "general";

  if (lang === "ko") {
    if (grade === 0) {
      return KO_MESSAGES.GRADE_0[cat] || KO_MESSAGES.GRADE_0.general;
    } else if (grade === 1) {
      return KO_MESSAGES.GRADE_1[cat] || KO_MESSAGES.GRADE_1.general;
    } else if (grade === 2 && score >= SCORE_THRESHOLDS.AVERAGE) {
      return KO_MESSAGES.GRADE_2_HIGH[cat] || KO_MESSAGES.GRADE_2_HIGH.general;
    } else if (grade === 2) {
      return KO_MESSAGES.GRADE_2_LOW;
    } else if (grade === 3) {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang);
      if (reason) {return `⚠️ ${reason}`;}
      return KO_MESSAGES.GRADE_3[cat] || KO_MESSAGES.GRADE_3.general;
    } else if (grade === 4) {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang);
      if (reason) {return `🚨 ${reason}`;}
      return KO_MESSAGES.GRADE_4[cat] || KO_MESSAGES.GRADE_4.general;
    } else {
      // Grade 5
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang);
      if (reason) {return `🚨🚨 ${reason} 모든 일정을 연기하세요!`;}
      return KO_MESSAGES.GRADE_5[cat] || KO_MESSAGES.GRADE_5.general;
    }
  } else {
    // English
    if (grade === 0) {
      return EN_MESSAGES.GRADE_0[cat] || EN_MESSAGES.GRADE_0.general;
    } else if (grade === 1) {
      return EN_MESSAGES.GRADE_1[cat] || EN_MESSAGES.GRADE_1.general;
    } else if (grade === 2 && score >= SCORE_THRESHOLDS.AVERAGE) {
      return EN_MESSAGES.GRADE_2_HIGH;
    } else if (grade === 2) {
      return EN_MESSAGES.GRADE_2_LOW;
    } else if (grade === 3) {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang);
      if (reason) {return `⚠️ ${reason}`;}
      return EN_MESSAGES.GRADE_3;
    } else if (grade === 4) {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang);
      if (reason) {return `🚨 ${reason}`;}
      return EN_MESSAGES.GRADE_4;
    } else {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang);
      if (reason) {return `🚨🚨 ${reason} Postpone everything!`;}
      return EN_MESSAGES.GRADE_5;
    }
  }
}

/**
 * 나쁜 날의 구체적 원인을 분석하여 메시지 생성
 */
function getBadDayReason(
  sajuFactorKeys?: string[],
  astroFactorKeys?: string[],
  lang: "ko" | "en" = "ko"
): string | null {
  if (!sajuFactorKeys && !astroFactorKeys) {return null;}

  const saju = sajuFactorKeys || [];
  const astro = astroFactorKeys || [];

  // 충(沖) - 가장 강력한 부정 요소
  if (saju.some(k => k.toLowerCase().includes("chung"))) {
    return lang === "ko"
      ? "일진 충(沖)! 갈등과 급변에 주의하세요."
      : "Day Clash (沖)! Watch for conflicts.";
  }

  // 형(刑)
  if (saju.some(k => k.toLowerCase().includes("xing"))) {
    return lang === "ko"
      ? "형(刑)살! 서류 실수, 법적 문제에 주의하세요."
      : "Punishment (刑)! Watch for legal issues.";
  }

  // 공망
  if (saju.includes("shinsal_gongmang")) {
    return lang === "ko"
      ? "공망(空亡)! 계획이 무산되기 쉬운 날입니다."
      : "Void Day! Plans may fall through.";
  }

  // 백호
  if (saju.includes("shinsal_backho")) {
    return lang === "ko"
      ? "백호살! 사고, 수술에 특히 주의하세요."
      : "White Tiger! Be careful of accidents.";
  }

  // 귀문관
  if (saju.includes("shinsal_guimungwan")) {
    return lang === "ko"
      ? "귀문관! 정신적 혼란, 불안감에 주의하세요."
      : "Ghost Gate! Watch for mental confusion.";
  }

  // 관살
  if (saju.includes("stemGwansal")) {
    return lang === "ko"
      ? "관살 기운! 외부 압박과 스트레스가 강합니다."
      : "Authority pressure! High stress expected.";
  }

  // 수성 역행
  if (astro.includes("retrogradeMercury")) {
    return lang === "ko"
      ? "수성 역행 중! 계약/소통에 오류가 생기기 쉬워요."
      : "Mercury retrograde! Communication errors likely.";
  }

  // 금성 역행
  if (astro.includes("retrogradeVenus")) {
    return lang === "ko"
      ? "금성 역행 중! 연애/재정 결정은 미루세요."
      : "Venus retrograde! Delay love/money decisions.";
  }

  // 보이드 오브 코스
  if (astro.includes("voidOfCourse")) {
    return lang === "ko"
      ? "달이 공허한 상태! 새 시작은 피하세요."
      : "Void of Course Moon! Avoid new starts.";
  }

  // 교차 부정
  if (astro.includes("crossNegative")) {
    return lang === "ko"
      ? "사주+점성술 모두 부정! 매우 조심하세요."
      : "Both Saju & Astro negative! Extra caution!";
  }

  // 충돌 원소
  if (astro.includes("conflictElement")) {
    return lang === "ko"
      ? "오행 충돌! 에너지가 분산됩니다."
      : "Element clash! Energy scattered.";
  }

  return null;
}

// 추천 시간대 생성
export function generateBestTimes(
  grade: ImportanceGrade,
  categories: EventCategory[],
  lang: "ko" | "en"
): string[] {
  // Grade 3(보통), Grade 4(나쁜 날)는 시간 추천 없음
  if (grade >= 3) {return [];}

  const cat = categories[0] || "general";

  if (lang === "ko") {
    const times: Record<string, string[]> = {
      career: ["🌅 오전 10-12시: 미팅/협상 최적", "🌆 오후 2-4시: 서류/계약 유리"],
      wealth: ["💰 오전 9-11시: 금융 거래 유리", "📈 오후 1-3시: 투자 결정 적합"],
      love: ["☕ 오후 3-5시: 데이트 최적", "🌙 저녁 7-9시: 로맨틱한 시간"],
      health: ["🌄 오전 6-8시: 운동 효과 UP", "🧘 저녁 6-8시: 휴식/명상 추천"],
      study: ["📚 오전 9-12시: 집중력 최고", "🌙 저녁 8-10시: 암기력 UP"],
      travel: ["✈️ 오전 8-10시: 출발 추천", "🚗 오후 2-4시: 이동 안전"],
      general: ["🌅 오전 10-12시: 중요한 일 처리", "🌆 오후 3-5시: 미팅/약속"]
    };
    return times[cat] || times.general;
  } else {
    const times: Record<string, string[]> = {
      career: ["🌅 10am-12pm: Best for meetings", "🌆 2-4pm: Good for documents"],
      wealth: ["💰 9-11am: Financial deals", "📈 1-3pm: Investment decisions"],
      love: ["☕ 3-5pm: Perfect for dates", "🌙 7-9pm: Romantic time"],
      health: ["🌄 6-8am: Exercise boost", "🧘 6-8pm: Rest & meditation"],
      study: ["📚 9am-12pm: Peak focus", "🌙 8-10pm: Memory boost"],
      travel: ["✈️ 8-10am: Best departure", "🚗 2-4pm: Safe travel"],
      general: ["🌅 10am-12pm: Important tasks", "🌆 3-5pm: Meetings"]
    };
    return times[cat] || times.general;
  }
}

export function formatDateForResponse(
  date: ImportantDate,
  locale: string,
  koTranslations: TranslationData,
  enTranslations: TranslationData
): FormattedDate {
  const translations = locale === "ko" ? koTranslations : enTranslations;
  const lang = locale === "ko" ? "ko" : "en";

  // 중복 카테고리 제거
  const uniqueCategories = [...new Set(date.categories)];

  // 번역된 요소만 포함 (번역 없으면 제외)
  const translatedSajuFactors = date.sajuFactorKeys
    .map(key => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null);

  const translatedAstroFactors = date.astroFactorKeys
    .map(key => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null);

  // Grade 3 이상(나쁜 날)에서는 부정적 요소를 먼저 보여주기
  let orderedSajuFactors = translatedSajuFactors;
  let orderedAstroFactors = translatedAstroFactors;

  if (date.grade >= 3) {
    // 부정적 키워드가 포함된 요소를 앞으로
    const negativeKeywords = ['충', '형', '해', '공망', '역행', '주의', 'clash', 'conflict', 'retrograde', 'caution'];
    orderedSajuFactors = [...translatedSajuFactors].sort((a, b) => {
      const aHasNeg = negativeKeywords.some(k => a.toLowerCase().includes(k) || a.includes(k));
      const bHasNeg = negativeKeywords.some(k => b.toLowerCase().includes(k) || b.includes(k));
      if (aHasNeg && !bHasNeg) {return -1;}
      if (!aHasNeg && bHasNeg) {return 1;}
      return 0;
    });
    orderedAstroFactors = [...translatedAstroFactors].sort((a, b) => {
      const aHasNeg = negativeKeywords.some(k => a.toLowerCase().includes(k) || a.includes(k));
      const bHasNeg = negativeKeywords.some(k => b.toLowerCase().includes(k) || b.includes(k));
      if (aHasNeg && !bHasNeg) {return -1;}
      if (!aHasNeg && bHasNeg) {return 1;}
      return 0;
    });
  }

  return {
    date: date.date,
    grade: date.grade,
    score: date.score,
    categories: uniqueCategories,
    title: getTranslation(date.titleKey, translations),
    description: getTranslation(date.descKey, translations),
    summary: generateSummary(
      date.grade,
      uniqueCategories,
      date.score,
      lang,
      date.sajuFactorKeys,
      date.astroFactorKeys
    ),
    bestTimes: generateBestTimes(date.grade, uniqueCategories, lang),
    sajuFactors: orderedSajuFactors,
    astroFactors: orderedAstroFactors,
    recommendations: date.recommendationKeys.map(key =>
      getTranslation(`calendar.recommendations.${key}`, translations)
    ),
    warnings: date.warningKeys.map(key =>
      getTranslation(`calendar.warnings.${key}`, translations)
    ),
  };
}

// AI 백엔드에서 추가 날짜 정보 가져오기
export async function fetchAIDates(
  sajuData: Record<string, unknown>,
  astroData: Record<string, unknown>,
  theme: string = "overall"
): Promise<{
  auspicious: Array<{ date?: string; description?: string; is_auspicious?: boolean }>;
  caution: Array<{ date?: string; description?: string; is_auspicious?: boolean }>;
} | null> {
  try {
    const response = await apiClient.post('/api/theme/important-dates', {
      theme,
      saju: sajuData,
      astro: astroData,
    }, { timeout: 20000 });

    if (response.ok && response.data) {
      const resData = response.data as { auspicious_dates?: string[]; caution_dates?: string[] };
      return {
        auspicious: (resData.auspicious_dates || []).map(date => ({ date, is_auspicious: true })),
        caution: (resData.caution_dates || []).map(date => ({ date, is_auspicious: false })),
      };
    }
  } catch (error) {
    logger.warn("[Calendar] AI backend not available, using local calculation:", error);
  }
  return null;
}

// 위치 좌표
export const LOCATION_COORDS: Record<string, LocationCoord> = {
  Seoul: { lat: 37.5665, lng: 126.9780, tz: "Asia/Seoul" },
  "Seoul, KR": { lat: 37.5665, lng: 126.9780, tz: "Asia/Seoul" },
  Busan: { lat: 35.1796, lng: 129.0756, tz: "Asia/Seoul" },
  "Busan, KR": { lat: 35.1796, lng: 129.0756, tz: "Asia/Seoul" },
  Tokyo: { lat: 35.6762, lng: 139.6503, tz: "Asia/Tokyo" },
  "Tokyo, JP": { lat: 35.6762, lng: 139.6503, tz: "Asia/Tokyo" },
  "New York": { lat: 40.7128, lng: -74.0060, tz: "America/New_York" },
  "New York, US": { lat: 40.7128, lng: -74.0060, tz: "America/New_York" },
  "Los Angeles": { lat: 34.0522, lng: -118.2437, tz: "America/Los_Angeles" },
  "Los Angeles, US": { lat: 34.0522, lng: -118.2437, tz: "America/Los_Angeles" },
  London: { lat: 51.5074, lng: -0.1278, tz: "Europe/London" },
  "London, GB": { lat: 51.5074, lng: -0.1278, tz: "Europe/London" },
  Paris: { lat: 48.8566, lng: 2.3522, tz: "Europe/Paris" },
  "Paris, FR": { lat: 48.8566, lng: 2.3522, tz: "Europe/Paris" },
  Beijing: { lat: 39.9042, lng: 116.4074, tz: "Asia/Shanghai" },
  "Beijing, CN": { lat: 39.9042, lng: 116.4074, tz: "Asia/Shanghai" },
  Shanghai: { lat: 31.2304, lng: 121.4737, tz: "Asia/Shanghai" },
  "Shanghai, CN": { lat: 31.2304, lng: 121.4737, tz: "Asia/Shanghai" },
};
