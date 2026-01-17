/**
 * @file Calendar API helper functions
 * Extracted from route.ts for modularity
 */

import { logger } from '@/lib/logger';
import type { EventCategory, ImportanceGrade, ImportantDate } from "@/lib/destiny-map/destinyCalendar";
import type { TranslationData } from "@/types/calendar-api";
import type { PillarData } from "@/lib/Saju/types";
import type { SajuPillarAccessor, FormattedDate, LocationCoord } from './types';
import { getFactorTranslation } from './translations';

// Translation helper
export function getTranslation(key: string, translations: TranslationData): string {
  const keys = key.split(".");
  let result: unknown = translations;
  for (const k of keys) {
    result = (result as Record<string, unknown>)?.[k];
    if (result === undefined) return key;
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
  if (!pillar) return "";
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
  if (typeof p.heavenlyStem === 'string') return p.heavenlyStem;
  if (typeof p.stem === 'string') return p.stem;
  return "";
}

export function getPillarBranchName(pillar: PillarData | SajuPillarAccessor | undefined): string {
  if (!pillar) return "";
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
  if (typeof p.earthlyBranch === 'string') return p.earthlyBranch;
  if (typeof p.branch === 'string') return p.branch;
  return "";
}

// ==== Date helpers ====
export function parseBirthDate(birthDateParam: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateParam);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
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
  lang: "ko" | "en"
): string {
  const cat = categories[0] || "general";

  if (lang === "ko") {
    if (grade === 0) {
      // 천운의 날 - 최상의 메시지
      const messages: Record<string, string> = {
        career: "🌟 인생을 바꿀 계약, 사업 시작에 완벽한 날!",
        wealth: "💎 대박 재물운! 중요한 투자/계약 강력 추천!",
        love: "💍 프로포즈, 결혼 결정에 최고의 날!",
        health: "✨ 에너지 폭발! 새로운 도전을 시작하세요!",
        travel: "🌈 인생 여행 떠나기 완벽한 날!",
        study: "🏆 합격운 최고! 시험, 면접에 행운이!",
        general: "✨ 천운이 함께하는 특별한 날!"
      };
      return messages[cat] || messages.general;
    } else if (grade === 1) {
      const messages: Record<string, string> = {
        career: "💼 계약, 협상, 중요한 결정에 최적의 날!",
        wealth: "💰 재물운 최고! 투자, 쇼핑에 좋아요!",
        love: "💕 연애운 폭발! 고백, 데이트 적극 추천!",
        health: "💪 활력 넘치는 날! 새 운동 시작해보세요!",
        travel: "✈️ 여행운 최고! 출발하기 좋은 날!",
        study: "📚 집중력 UP! 시험, 공부에 유리해요!",
        general: "⭐ 모든 일이 잘 풀리는 최고의 날!"
      };
      return messages[cat] || messages.general;
    } else if (grade === 2 && score >= 60) {
      const messages: Record<string, string> = {
        career: "📋 업무가 순조롭게 진행되는 날",
        wealth: "💵 작은 행운이 찾아올 수 있어요",
        love: "☕ 편안한 만남에 좋은 날",
        health: "🌿 가벼운 산책이나 휴식 추천",
        travel: "🚶 가까운 곳 나들이에 좋아요",
        study: "📖 꾸준한 학습이 성과를 내요",
        general: "🌤️ 평온하게 흘러가는 괜찮은 날"
      };
      return messages[cat] || messages.general;
    } else if (grade === 2) {
      return "🌥️ 평범한 하루, 무리하지 마세요";
    } else if (grade === 3) {
      // 보통 날 - 중립적 메시지
      const messages: Record<string, string> = {
        career: "📝 일상 업무에 집중하세요",
        wealth: "💵 큰 거래보다 평소대로 관리하세요",
        love: "☕ 가벼운 대화가 좋아요",
        health: "🚶 무리하지 않는 게 좋아요",
        travel: "🏠 가까운 곳 위주가 좋아요",
        study: "📖 복습 위주로 하세요",
        general: "🌤️ 평범한 하루, 편안하게 보내세요"
      };
      return messages[cat] || messages.general;
    } else if (grade === 4) {
      // Grade 4 - 나쁜 날
      const messages: Record<string, string> = {
        career: "⚠️ 중요한 결정은 미루세요",
        wealth: "💸 큰 지출/투자는 피하세요",
        love: "💔 오해가 생기기 쉬워요, 조심!",
        health: "🏥 무리한 활동은 삼가세요",
        travel: "🚫 이동 시 각별히 주의하세요",
        study: "😵 집중이 안 될 수 있어요",
        general: "🌧️ 조용히 지내는 게 좋은 날"
      };
      return messages[cat] || messages.general;
    } else {
      // Grade 5 - 최악의 날
      const messages: Record<string, string> = {
        career: "🚨 모든 중요한 일정을 연기하세요!",
        wealth: "💀 절대 투자/계약 금지!",
        love: "🖤 감정적 결정은 후회할 수 있어요",
        health: "🆘 건강 관리에 특히 주의하세요",
        travel: "☠️ 장거리 이동은 피하세요!",
        study: "🔴 시험/면접은 다른 날로!",
        general: "⛈️ 최악의 날, 모든 것을 조심하세요!"
      };
      return messages[cat] || messages.general;
    }
  } else {
    // English
    if (grade === 0) {
      // Celestial Day - best messages
      const messages: Record<string, string> = {
        career: "🌟 Perfect day for life-changing contracts!",
        wealth: "💎 Amazing fortune! Big investments highly recommended!",
        love: "💍 Best day for proposals and wedding decisions!",
        health: "✨ Energy explosion! Start new challenges!",
        travel: "🌈 Perfect day for a journey of a lifetime!",
        study: "🏆 Best luck for exams and interviews!",
        general: "✨ A special day blessed by heaven!"
      };
      return messages[cat] || messages.general;
    } else if (grade === 1) {
      const messages: Record<string, string> = {
        career: "💼 Best day for contracts and decisions!",
        wealth: "💰 Great wealth luck! Good for investments!",
        love: "💕 Romance luck high! Perfect for dates!",
        health: "💪 Full of energy! Start something new!",
        travel: "✈️ Excellent travel luck! Go for it!",
        study: "📚 Focus is sharp! Great for exams!",
        general: "⭐ Everything flows smoothly today!"
      };
      return messages[cat] || messages.general;
    } else if (grade === 2 && score >= 60) {
      return "🌤️ A good day with positive energy";
    } else if (grade === 2) {
      return "🌥️ An ordinary day, take it easy";
    } else if (grade === 3) {
      return "🌤️ A normal day, take it easy";
    } else if (grade === 4) {
      return "🌧️ Be cautious and avoid big decisions";
    } else {
      // Grade 5 - Worst day
      return "⛈️ Worst day! Postpone all important matters!";
    }
  }
}

// 추천 시간대 생성
export function generateBestTimes(
  grade: ImportanceGrade,
  categories: EventCategory[],
  lang: "ko" | "en"
): string[] {
  // Grade 3(보통), Grade 4(나쁜 날)는 시간 추천 없음
  if (grade >= 3) return [];

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

  return {
    date: date.date,
    grade: date.grade,
    score: date.score,
    categories: uniqueCategories,
    title: getTranslation(date.titleKey, translations),
    description: getTranslation(date.descKey, translations),
    summary: generateSummary(date.grade, uniqueCategories, date.score, lang),
    bestTimes: generateBestTimes(date.grade, uniqueCategories, lang),
    sajuFactors: translatedSajuFactors,
    astroFactors: translatedAstroFactors,
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
  backendUrl: string,
  theme: string = "overall"
): Promise<{
  auspicious: Array<{ date?: string; description?: string; is_auspicious?: boolean }>;
  caution: Array<{ date?: string; description?: string; is_auspicious?: boolean }>;
} | null> {
  try {
    validateBackendUrl(backendUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${backendUrl}/api/theme/important-dates`, {
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
