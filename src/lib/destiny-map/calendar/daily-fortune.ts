/**
 * Daily Fortune Module
 * 일일 운세 관련 유틸리티 함수
 */

import { STEMS, BRANCHES, STEM_TO_ELEMENT, BRANCH_TO_ELEMENT } from './constants';
import { approximateLunarDay, isSonEomneunDay } from './utils';

// ============================================================
// Types
// ============================================================
// Note: GanzhiResult is also defined in saju-analysis.ts
// We define a local version here to avoid circular dependencies
export interface DailyGanzhiResult {
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
}

export interface AlertInfo {
  type: "warning" | "positive" | "info";
  msg: string;
  icon?: string;
}

// ============================================================
// Ganzhi (간지) Functions
// ============================================================

/**
 * 특정 날짜의 간지 계산 (일일운세용)
 */
export function getDailyGanzhi(date: Date): DailyGanzhiResult {
  // 기준일: 1900년 1월 31일은 甲子일
  const baseUtc = Date.UTC(1900, 0, 31);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));

  const stemIndex = ((diffDays % 10) + 10) % 10;
  const branchIndex = ((diffDays % 12) + 12) % 12;

  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];

  return {
    stem,
    branch,
    stemElement: STEM_TO_ELEMENT[stem] || "wood",
    branchElement: BRANCH_TO_ELEMENT[branch] || "water",
  };
}

/**
 * 연간 간지 계산
 */
export function getYearGanzhiDaily(year: number): DailyGanzhiResult {
  // 1984년은 甲子년
  const diff = year - 1984;
  const stemIndex = ((diff % 10) + 10) % 10;
  const branchIndex = ((diff % 12) + 12) % 12;

  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];

  return {
    stem,
    branch,
    stemElement: STEM_TO_ELEMENT[stem] || "wood",
    branchElement: BRANCH_TO_ELEMENT[branch] || "water",
  };
}

/**
 * 월간 간지 계산
 */
export function getMonthGanzhiDaily(year: number, month: number): DailyGanzhiResult {
  // 연간 천간에 따른 월 천간 시작점
  const yearStemIndex = ((year - 1984) % 10 + 10) % 10;

  // 월 천간 계산: 갑/기년은 丙寅월, 을/경년은 戊寅월...
  const monthStemStart = [2, 4, 6, 8, 0][yearStemIndex % 5];
  const monthStemIndex = (monthStemStart + (month - 1)) % 10;

  // 월 지지는 고정: 1월=寅, 2월=卯, ...
  const monthBranchIndex = (month + 1) % 12;

  const stem = STEMS[monthStemIndex];
  const branch = BRANCHES[monthBranchIndex];

  return {
    stem,
    branch,
    stemElement: STEM_TO_ELEMENT[stem] || "wood",
    branchElement: BRANCH_TO_ELEMENT[branch] || "water",
  };
}

// ============================================================
// Lucky Color/Number Functions
// ============================================================

/**
 * 행운의 색상 (일간 오행 기반)
 */
export function getLuckyColorFromElement(element: string): string {
  const colorMap: Record<string, string[]> = {
    wood: ["Green", "Teal", "Emerald"],
    fire: ["Red", "Orange", "Pink"],
    earth: ["Yellow", "Brown", "Beige"],
    metal: ["White", "Silver", "Gold"],
    water: ["Blue", "Black", "Navy"],
  };

  const colors = colorMap[element] || colorMap.wood;
  // 일관성을 위해 첫 번째 색상 반환 (랜덤 대신)
  return colors[0];
}

/**
 * 행운의 색상 (랜덤 버전)
 */
export function getLuckyColorRandom(element: string): string {
  const colorMap: Record<string, string[]> = {
    wood: ["Green", "Teal", "Emerald"],
    fire: ["Red", "Orange", "Pink"],
    earth: ["Yellow", "Brown", "Beige"],
    metal: ["White", "Silver", "Gold"],
    water: ["Blue", "Black", "Navy"],
  };

  const colors = colorMap[element] || colorMap.wood;
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 행운의 숫자 계산
 */
export function getLuckyNumber(targetDate: Date, birthDate: Date): number {
  // UTC 기준으로 연초부터 일수 계산 (서버 타임존 영향 제거)
  const yearStartUtc = Date.UTC(targetDate.getFullYear(), 0, 0);
  const dateUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const dayOfYear = Math.floor((dateUtc - yearStartUtc) / (1000 * 60 * 60 * 24));
  const birthDay = birthDate.getDate();
  return ((dayOfYear + birthDay) % 9) + 1;
}

// Note: isSonEomneunDay and approximateLunarDay are imported from utils.ts

// ============================================================
// Alert Generation Functions
// ============================================================

/**
 * 알림 생성
 */
export function generateAlerts(
  grade: number,
  sajuFactorKeys: string[],
  astroFactorKeys: string[],
  crossVerified: boolean
): AlertInfo[] {
  const alerts: AlertInfo[] = [];

  // 등급별 알림
  if (grade === 0) {
    alerts.push({ type: "positive", msg: "천운의 날! 중요한 결정에 최적입니다.", icon: "🌟" });
  } else if (grade === 1) {
    alerts.push({ type: "positive", msg: "아주 좋은 날입니다. 적극적으로 행동하세요.", icon: "✨" });
  } else if (grade === 4) {
    alerts.push({ type: "warning", msg: "오늘은 조심하세요. 중요한 결정은 미루세요.", icon: "⚠️" });
  }

  // 특별 요소 알림
  if (sajuFactorKeys.includes("cheoneulGwiin")) {
    alerts.push({ type: "positive", msg: "천을귀인이 함께합니다. 귀인의 도움이 있습니다.", icon: "👼" });
  }

  if (sajuFactorKeys.includes("dohwaDay")) {
    alerts.push({ type: "info", msg: "도화살의 기운. 매력이 빛나는 날입니다.", icon: "💕" });
  }

  if (astroFactorKeys.includes("retrogradeMercury")) {
    alerts.push({ type: "warning", msg: "수성 역행 중. 계약/통신에 주의하세요.", icon: "📝" });
  }

  if (crossVerified) {
    alerts.push({ type: "positive", msg: "사주와 점성술이 일치합니다. 신뢰도 높음!", icon: "🎯" });
  }

  return alerts;
}

// ============================================================
// Default Result Functions
// ============================================================

export interface DefaultFortuneResult {
  overall: number;
  love: number;
  career: number;
  wealth: number;
  health: number;
  luckyColor: string;
  luckyNumber: number;
  grade: number;
  ganzhi: string;
  alerts: AlertInfo[];
  recommendations: string[];
  warnings: string[];
  crossVerified: boolean;
  sajuFactors: string[];
  astroFactors: string[];
}

/**
 * 기본 운세 결과 생성 (분석 실패 시)
 */
export function createDefaultFortuneResult(
  score: number,
  targetDate: Date,
  birthDate: Date
): DefaultFortuneResult {
  const ganzhi = getDailyGanzhi(targetDate);

  return {
    overall: score,
    love: score + Math.floor(Math.random() * 10) - 5,
    career: score + Math.floor(Math.random() * 10) - 5,
    wealth: score + Math.floor(Math.random() * 10) - 5,
    health: score + Math.floor(Math.random() * 10) - 5,
    luckyColor: getLuckyColorRandom(ganzhi.stemElement),
    luckyNumber: getLuckyNumber(targetDate, birthDate),
    grade: 3,
    ganzhi: `${ganzhi.stem}${ganzhi.branch}`,
    alerts: [],
    recommendations: [],
    warnings: [],
    crossVerified: false,
    sajuFactors: [],
    astroFactors: [],
  };
}
