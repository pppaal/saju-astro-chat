/**
 * Daily Transit Notifications Service
 * 일진/트랜짓 기반 실시간 푸시 알림 콘텐츠 생성
 */

import { STEM_TO_ELEMENT_EN as STEM_TO_ELEMENT } from '@/lib/saju/constants';
import { ELEMENT_RELATIONS } from '@/lib/counselor/config/elements.config';

// 별자리-오행 매핑
const ZODIAC_TO_ELEMENT: Record<string, string> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire",
  Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air",
  Cancer: "water", Scorpio: "water", Pisces: "water",
};

// 알림 유형
export type NotificationType =
  | "daily_fortune"      // 오늘의 운세 알림
  | "lucky_time"         // 행운의 시간 알림
  | "caution_time"       // 주의 시간 알림
  | "transit_peak"       // 트랜짓 피크 알림
  | "wealth_opportunity" // 재물 기회 알림
  | "relationship_hint"  // 관계 힌트 알림
  | "credit_low"         // 크레딧 부족 알림
  | "credit_depleted"    // 크레딧 소진 알림
  | "premium_feature"    // 프리미엄 기능 안내
  | "promotion"          // 특별 할인/프로모션
  | "new_feature";       // 신규 기능 안내

export interface DailyNotification {
  type: NotificationType;
  title: string;
  message: string;
  emoji: string;
  scheduledHour?: number; // 0-23
  confidence: number;     // 1-5
  category: "positive" | "neutral" | "caution";
  data?: {
    luckyColor?: string;
    luckyNumber?: number;
    luckyDirection?: string;
    element?: string;
    url?: string;
  };
}

interface SajuData {
  dayMaster?: string;
  pillars?: {
    year?: { heavenlyStem?: string; earthlyBranch?: string };
    month?: { heavenlyStem?: string; earthlyBranch?: string };
    day?: { heavenlyStem?: string; earthlyBranch?: string };
    hour?: { heavenlyStem?: string; earthlyBranch?: string };
  };
  unse?: {
    iljin?: unknown;
    monthly?: unknown;
    yearly?: unknown;
  };
}

interface AstrologyData {
  transits?: unknown[];
  planets?: unknown[];
}

interface UserProfile {
  birthDate: string;
  birthTime?: string;
  name?: string;
  locale?: string;
}

// 일간 오행 추출
function getDayMasterElement(dayMaster?: string | { name?: string; heavenlyStem?: string }): string | null {
  if (!dayMaster) {return null;}
  const dmStr = typeof dayMaster === "string"
    ? dayMaster
    : (dayMaster?.name || dayMaster?.heavenlyStem || "");
  if (!dmStr || typeof dmStr !== "string") {return null;}
  const stem = dmStr.charAt(0);
  return STEM_TO_ELEMENT[stem] || null;
}

// 천간-오행 변환
function stemToElement(stem: string): string | null {
  return STEM_TO_ELEMENT[stem] || null;
}

// 시간대별 운세 분석
function analyzeHourlyFortune(
  dayMasterElement: string,
  iljinElement: string,
  hour: number
): { score: number; type: "positive" | "neutral" | "caution" } {
  // 12지지 시간대 (자시=23-01, 축시=01-03, ...)
  const hourBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const branchElements: Record<string, string> = {
    "子": "water", "丑": "earth", "寅": "wood", "卯": "wood",
    "辰": "earth", "巳": "fire", "午": "fire", "未": "earth",
    "申": "metal", "酉": "metal", "戌": "earth", "亥": "water"
  };

  // 시간을 12지지로 변환
  const branchIndex = Math.floor(((hour + 1) % 24) / 2);
  const hourBranch = hourBranches[branchIndex];
  const hourElement = branchElements[hourBranch];

  // 일간과 시간 오행의 관계 분석
  const relations = ELEMENT_RELATIONS[dayMasterElement];
  if (!relations) {return { score: 3, type: "neutral" };}

  if (hourElement === relations.generatedBy || hourElement === dayMasterElement) {
    return { score: 5, type: "positive" };
  } else if (hourElement === relations.generates) {
    return { score: 4, type: "positive" };
  } else if (hourElement === relations.controlledBy) {
    return { score: 2, type: "caution" };
  } else if (hourElement === relations.controls) {
    return { score: 3, type: "neutral" };
  }

  return { score: 3, type: "neutral" };
}

// 최적 시간 찾기
function findOptimalHours(dayMasterElement: string, iljinElement: string): {
  luckyHours: number[];
  cautionHours: number[];
  peakHour: number;
} {
  const luckyHours: number[] = [];
  const cautionHours: number[] = [];
  let peakHour = 10; // 기본값
  let maxScore = 0;

  for (let h = 6; h <= 22; h++) { // 활동 시간대만
    const analysis = analyzeHourlyFortune(dayMasterElement, iljinElement, h);

    if (analysis.type === "positive") {
      luckyHours.push(h);
      if (analysis.score > maxScore) {
        maxScore = analysis.score;
        peakHour = h;
      }
    } else if (analysis.type === "caution") {
      cautionHours.push(h);
    }
  }

  return { luckyHours, cautionHours, peakHour };
}

// 운세 카테고리별 점수 계산
function calculateCategoryScores(
  dayMasterElement: string,
  iljinElement: string,
  transits?: unknown[]
): {
  wealth: number;
  love: number;
  career: number;
  health: number;
  overall: number;
} {
  const relations = ELEMENT_RELATIONS[dayMasterElement] || {};
  let wealth = 50, love = 50, career = 50, health = 50;

  // 일진과 일간의 관계로 기본 점수 계산
  if (iljinElement === relations.controls) {
    wealth += 30; // 재성: 재물운 상승
  }
  if (iljinElement === relations.generatedBy) {
    career += 25; // 인성: 학업/직장운 상승
  }
  if (iljinElement === dayMasterElement) {
    health += 20; // 비견: 건강/활력 상승
  }
  if (iljinElement === relations.generates) {
    love += 20; // 식상: 표현력, 연애운 상승
  }
  if (iljinElement === relations.controlledBy) {
    career -= 15; // 관살: 압박감
    health -= 10;
  }

  // 트랜짓 분석으로 보정
  if (transits && Array.isArray(transits)) {
    const venusTransit = transits.find((t: unknown) => {
      const transit = t as Record<string, unknown>;
      return ((transit.planet || transit.transiting || "") as string).includes("Venus");
    });
    const marsTransit = transits.find((t: unknown) => {
      const transit = t as Record<string, unknown>;
      return ((transit.planet || transit.transiting || "") as string).includes("Mars");
    });
    const jupiterTransit = transits.find((t: unknown) => {
      const transit = t as Record<string, unknown>;
      return ((transit.planet || transit.transiting || "") as string).includes("Jupiter");
    });

    if (venusTransit) {love += 15;}
    if (marsTransit) {career += 10;}
    if (jupiterTransit) {
      wealth += 20;
      career += 15;
    }
  }

  // 범위 제한
  wealth = Math.min(100, Math.max(0, wealth));
  love = Math.min(100, Math.max(0, love));
  career = Math.min(100, Math.max(0, career));
  health = Math.min(100, Math.max(0, health));

  const overall = Math.round((wealth + love + career + health) / 4);

  return { wealth, love, career, health, overall };
}

// 행운의 색상 결정
function getLuckyColor(dayMasterElement: string, iljinElement: string): string {
  const elementColors: Record<string, string[]> = {
    wood: ["초록색", "청록색"],
    fire: ["빨간색", "보라색"],
    earth: ["노란색", "베이지"],
    metal: ["흰색", "금색"],
    water: ["검정색", "파란색"],
  };

  const relations = ELEMENT_RELATIONS[dayMasterElement];
  // 나를 생해주는 오행의 색 또는 내 오행의 색
  const beneficialElement = relations?.generatedBy || dayMasterElement;
  const colors = elementColors[beneficialElement] || ["흰색"];

  return colors[Math.floor(Math.random() * colors.length)];
}

// 행운의 숫자 결정
function getLuckyNumber(dayMasterElement: string): number {
  const elementNumbers: Record<string, number[]> = {
    wood: [3, 8],
    fire: [2, 7],
    earth: [5, 10],
    metal: [4, 9],
    water: [1, 6],
  };

  const numbers = elementNumbers[dayMasterElement] || [7];
  return numbers[Math.floor(Math.random() * numbers.length)];
}

// 행운의 방향 결정
function getLuckyDirection(dayMasterElement: string): string {
  const elementDirections: Record<string, string> = {
    wood: "동쪽",
    fire: "남쪽",
    earth: "중앙",
    metal: "서쪽",
    water: "북쪽",
  };

  const relations = ELEMENT_RELATIONS[dayMasterElement];
  return elementDirections[relations?.generatedBy || dayMasterElement] || "동쪽";
}

/**
 * 오늘의 알림 콘텐츠 생성
 */
export function generateDailyNotifications(
  saju: SajuData,
  astrology: AstrologyData,
  profile: UserProfile,
  locale: string = "ko"
): DailyNotification[] {
  const notifications: DailyNotification[] = [];

  const dayMasterElement = getDayMasterElement(saju.dayMaster);
  if (!dayMasterElement) {return notifications;}

  // 일진 데이터 추출
  const iljin = Array.isArray(saju.unse?.iljin)
    ? saju.unse.iljin[0]
    : saju.unse?.iljin;
  const iljinStem = iljin?.heavenlyStem || iljin?.stem || iljin?.ganji?.charAt(0) || "";
  const iljinElement = stemToElement(iljinStem) || "earth";

  // 카테고리별 점수 계산
  const scores = calculateCategoryScores(
    dayMasterElement,
    iljinElement,
    astrology.transits
  );

  // 최적 시간대 계산
  const { luckyHours, cautionHours, peakHour } = findOptimalHours(
    dayMasterElement,
    iljinElement
  );

  // 행운 아이템
  const luckyColor = getLuckyColor(dayMasterElement, iljinElement);
  const luckyNumber = getLuckyNumber(dayMasterElement);
  const luckyDirection = getLuckyDirection(dayMasterElement);

  const userName = profile.name || "회원";

  // 1. 아침 운세 알림 (07:00)
  notifications.push({
    type: "daily_fortune",
    title: `🌅 ${userName}님의 오늘 운세`,
    message: scores.overall >= 70
      ? `오늘은 좋은 기운이 함께합니다! 전체운 ${scores.overall}점. 적극적으로 행동하세요.`
      : scores.overall >= 50
        ? `오늘은 평온한 하루입니다. 전체운 ${scores.overall}점. 꾸준함이 답입니다.`
        : `오늘은 신중하게 행동하세요. 전체운 ${scores.overall}점. 무리하지 마세요.`,
    emoji: scores.overall >= 70 ? "🌟" : scores.overall >= 50 ? "☀️" : "🌤️",
    scheduledHour: 7,
    confidence: Math.ceil(scores.overall / 20),
    category: scores.overall >= 70 ? "positive" : scores.overall >= 50 ? "neutral" : "caution",
    data: {
      luckyColor,
      luckyNumber,
      luckyDirection,
      element: dayMasterElement,
      url: "/destiny-counselor",
    },
  });

  // 2. 피크 타임 알림
  if (luckyHours.length > 0) {
    const peakTimeStr = `${peakHour}:00`;
    notifications.push({
      type: "lucky_time",
      title: `⭐ ${peakTimeStr} 행운의 시간!`,
      message: scores.wealth > scores.career
        ? `재물운이 최고조! 중요한 계약이나 거래에 좋은 시간입니다.`
        : scores.career > scores.love
          ? `업무 효율이 최고! 중요한 미팅이나 발표에 적합합니다.`
          : `대인관계가 좋아요! 소개팅이나 중요한 만남에 적합합니다.`,
      emoji: "💫",
      scheduledHour: Math.max(peakHour - 1, 6), // 1시간 전에 알림
      confidence: 5,
      category: "positive",
      data: {
        luckyColor,
        luckyNumber,
        url: "/destiny-counselor",
      },
    });
  }

  // 3. 주의 시간 알림
  if (cautionHours.length > 0) {
    const cautionHour = cautionHours[0];
    notifications.push({
      type: "caution_time",
      title: `⚠️ ${cautionHour}:00 조심하세요`,
      message: `이 시간대는 신중하게 행동하세요. 중요한 결정은 피하는 것이 좋습니다.`,
      emoji: "⚠️",
      scheduledHour: Math.max(cautionHour - 1, 6),
      confidence: 3,
      category: "caution",
    });
  }

  // 4. 재물운 알림 (높을 때만)
  if (scores.wealth >= 75) {
    notifications.push({
      type: "wealth_opportunity",
      title: `💰 재물운 최고!`,
      message: `오늘 재물운이 ${scores.wealth}점으로 매우 좋습니다! ${luckyDirection}에서 재물 기회가 옵니다.`,
      emoji: "💰",
      scheduledHour: 9,
      confidence: 5,
      category: "positive",
      data: {
        luckyDirection,
        luckyNumber,
        url: "/destiny-map?focus=wealth",
      },
    });
  }

  // 5. 연애운 알림 (높을 때만)
  if (scores.love >= 75) {
    notifications.push({
      type: "relationship_hint",
      title: `💕 연애운 활짝!`,
      message: `오늘 연애운이 ${scores.love}점! ${luckyColor} 계열을 착용하면 더 좋아요.`,
      emoji: "💕",
      scheduledHour: 11,
      confidence: 4,
      category: "positive",
      data: {
        luckyColor,
        url: "/destiny-map?focus=love",
      },
    });
  }

  return notifications;
}

/**
 * 특정 시간대의 알림만 필터링
 */
export function getNotificationsForHour(
  notifications: DailyNotification[],
  hour: number
): DailyNotification[] {
  return notifications.filter(n => n.scheduledHour === hour);
}

/**
 * 알림 메시지를 다국어로 변환
 */
export function localizeNotification(
  notification: DailyNotification,
  locale: string
): DailyNotification {
  // 현재는 한국어만 지원, 추후 확장 가능
  if (locale === "en") {
    const typeTranslations: Partial<Record<NotificationType, { title: string; positive: string; neutral: string; caution: string }>> & Record<string, { title: string; positive: string; neutral: string; caution: string }> = {
      daily_fortune: {
        title: "Today's Fortune",
        positive: "Great energy today! Overall: {{score}}. Take action!",
        neutral: "A calm day ahead. Overall: {{score}}. Stay steady.",
        caution: "Be careful today. Overall: {{score}}. Don't push too hard.",
      },
      lucky_time: {
        title: "Lucky Time!",
        positive: "Best time for important decisions!",
        neutral: "Good timing for activities.",
        caution: "Average timing.",
      },
      caution_time: {
        title: "Caution Time",
        positive: "",
        neutral: "",
        caution: "Be careful during this time. Avoid major decisions.",
      },
      transit_peak: {
        title: "Transit Peak",
        positive: "Energy is at its highest!",
        neutral: "",
        caution: "",
      },
      wealth_opportunity: {
        title: "Wealth Opportunity!",
        positive: "Great day for finances! Look {{direction}}.",
        neutral: "",
        caution: "",
      },
      relationship_hint: {
        title: "Love is in the air!",
        positive: "Great day for relationships! Wear {{color}}.",
        neutral: "",
        caution: "",
      },
    };

    // 간단한 번역 로직 (실제로는 더 정교하게)
    const trans = typeTranslations[notification.type];
    if (trans) {
      return {
        ...notification,
        title: `${notification.emoji} ${trans.title}`,
      };
    }
  }

  return notification;
}

/**
 * 다음 알림까지 남은 시간 계산 (밀리초)
 */
export function getNextNotificationDelay(
  notifications: DailyNotification[],
  currentHour: number
): { notification: DailyNotification | null; delayMs: number } {
  const upcoming = notifications
    .filter(n => (n.scheduledHour || 0) > currentHour)
    .sort((a, b) => (a.scheduledHour || 0) - (b.scheduledHour || 0));

  if (upcoming.length === 0) {
    return { notification: null, delayMs: 0 };
  }

  const next = upcoming[0];
  const now = new Date();
  const targetTime = new Date();
  targetTime.setHours(next.scheduledHour || 0, 0, 0, 0);

  const delayMs = targetTime.getTime() - now.getTime();

  return { notification: next, delayMs: Math.max(0, delayMs) };
}
