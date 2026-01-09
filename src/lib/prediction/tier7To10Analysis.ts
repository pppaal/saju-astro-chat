// src/lib/prediction/tier7To10Analysis.ts
// TIER 7~10: 고급 정밀 분석 모듈

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  calculateSibsin,
  type FiveElement,
} from './advancedTimingEngine';

import { calculateDailyPillar } from './ultraPrecisionEngine';

// ============================================================
// 타입 정의
// ============================================================

export type EventType = 'marriage' | 'career' | 'investment' | 'move' | 'study' | 'health' | 'relationship';

export interface AdvancedAnalysisInput {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour?: number;
  dayStem: string;
  dayBranch: string;
  monthStem: string;
  monthBranch: string;
  yearStem: string;
  yearBranch: string;
  hourStem?: string;
  hourBranch?: string;
  allStems: string[];
  allBranches: string[];
  yongsin?: FiveElement[];
  kisin?: FiveElement[];
  geokguk?: string; // 격국
   
  advancedAstro?: unknown; // 다양한 점성술 데이터 포맷 수용
}

export interface TierBonus {
  bonus: number;
  reasons: string[];
  penalties: string[];
  confidence: number;
}

// ============================================================
// 상수 정의
// ============================================================

const STEM_ELEMENT: Record<string, FiveElement> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
};

const BRANCH_ELEMENT: Record<string, FiveElement> = {
  '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화',
  '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수',
};

const EVENT_FAVORABLE_CONDITIONS: Record<EventType, {
  favorableSibsin: string[];
  avoidSibsin: string[];
  favorableElements: FiveElement[];
}> = {
  marriage: {
    favorableSibsin: ['정재', '정관', '편재', '편관'],
    avoidSibsin: ['겁재', '상관'],
    favorableElements: ['목', '화'],
  },
  career: {
    favorableSibsin: ['정관', '편관', '정인', '식신'],
    avoidSibsin: ['겁재', '편인'],
    favorableElements: ['금', '수'],
  },
  investment: {
    favorableSibsin: ['정재', '편재', '식신'],
    avoidSibsin: ['겁재', '비견', '상관'],
    favorableElements: ['금', '토'],
  },
  move: {
    favorableSibsin: ['편관', '식신', '상관'],
    avoidSibsin: ['정인'],
    favorableElements: ['목', '화'],
  },
  study: {
    favorableSibsin: ['정인', '편인', '식신'],
    avoidSibsin: ['편재', '정재'],
    favorableElements: ['수', '목'],
  },
  health: {
    favorableSibsin: ['비견', '정인', '식신'],
    avoidSibsin: ['편관', '상관'],
    favorableElements: ['토', '금'],
  },
  relationship: {
    favorableSibsin: ['정재', '편재', '식신', '정관'],
    avoidSibsin: ['겁재', '편인'],
    favorableElements: ['화', '토'],
  },
};

// ============================================================
// TIER 7: 일진(日辰) + 시주(時柱) 정밀 분석
// ============================================================

/**
 * TIER 7: 일진 분석 - 특정 날짜의 일주와 네이탈 일주 관계
 */
export function calculateDailyPillarBonus(
  input: AdvancedAnalysisInput,
  eventType: EventType,
  targetDate: Date
): TierBonus {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  // 해당 날짜의 일주 계산
  const targetDayPillar = calculateDailyPillar(targetDate);
  const targetDayStem = targetDayPillar.stem;
  const targetDayBranch = targetDayPillar.branch;

  // 1. 일진 일간과 네이탈 일간의 십신 관계
  const dailySibsin = calculateSibsin(input.dayStem, targetDayStem);
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];

  if (conditions.favorableSibsin.includes(dailySibsin)) {
    bonus += 10;
    reasons.push(`일진 ${dailySibsin} - ${eventType} 길일`);
  } else if (conditions.avoidSibsin.includes(dailySibsin)) {
    bonus -= 8;
    penalties.push(`일진 ${dailySibsin} - 피해야 할 날`);
  }

  // 2. 일진 일지와 네이탈 일지의 관계
  const branchRelation = analyzeBranchRelation(input.dayBranch, targetDayBranch);
  if (branchRelation === '육합' || branchRelation === '삼합') {
    bonus += 12;
    reasons.push(`일진-명식 ${branchRelation} - 조화로운 날`);
  } else if (branchRelation === '충') {
    bonus -= 10;
    penalties.push('일진-명식 충 - 갈등 주의');
  } else if (branchRelation === '형') {
    bonus -= 6;
    penalties.push('일진-명식 형 - 마찰 주의');
  }

  // 3. 일진 12운성
  const dailyTwelveStage = calculatePreciseTwelveStage(input.dayStem, targetDayBranch);
  if (dailyTwelveStage.energy === 'peak') {
    bonus += 8;
    reasons.push(`일진 ${dailyTwelveStage.stage} - 에너지 최고조`);
  } else if (dailyTwelveStage.energy === 'dormant') {
    bonus -= 5;
  }

  // 4. 일진 오행과 용신/기신
  const dailyElement = STEM_ELEMENT[targetDayStem];
  if (input.yongsin?.includes(dailyElement)) {
    bonus += 8;
    reasons.push(`일진 용신 ${dailyElement} 활성`);
  }
  if (input.kisin?.includes(dailyElement)) {
    bonus -= 6;
    penalties.push(`일진 기신 ${dailyElement} 주의`);
  }

  return {
    bonus: Math.max(-25, Math.min(25, bonus)),
    reasons: reasons.slice(0, 3),
    penalties: penalties.slice(0, 2),
    confidence: 0.85,
  };
}

/**
 * TIER 7: 시주 분석 - 시간대별 에너지 분석
 */
export function calculateHourlyBonus(
  input: AdvancedAnalysisInput,
  eventType: EventType,
  targetHour: number // 0-23
): TierBonus {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  // 시간을 지지로 변환 (2시간 단위)
  const hourBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const hourIndex = Math.floor(((targetHour + 1) % 24) / 2);
  const hourBranch = hourBranches[hourIndex];

  // 1. 시지와 일지의 관계
  const branchRelation = analyzeBranchRelation(input.dayBranch, hourBranch);
  if (branchRelation === '육합' || branchRelation === '삼합') {
    bonus += 8;
    reasons.push(`${hourBranch}시 - 일주와 ${branchRelation}`);
  } else if (branchRelation === '충') {
    bonus -= 6;
    penalties.push(`${hourBranch}시 - 일주와 충`);
  }

  // 2. 시지 오행과 이벤트 궁합
  const hourElement = BRANCH_ELEMENT[hourBranch];
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  if (conditions.favorableElements.includes(hourElement)) {
    bonus += 6;
    reasons.push(`${hourBranch}시 ${hourElement} 기운 - ${eventType} 유리`);
  }

  // 3. 용신 시간대
  if (input.yongsin?.includes(hourElement)) {
    bonus += 8;
    reasons.push(`용신 시간대 (${hourElement})`);
  }

  // 4. 네이탈 시주가 있으면 비교
  if (input.hourBranch) {
    const natalHourRelation = analyzeBranchRelation(input.hourBranch, hourBranch);
    if (natalHourRelation === '육합') {
      bonus += 6;
      reasons.push('시주 공명');
    } else if (natalHourRelation === '충') {
      bonus -= 4;
    }
  }

  return {
    bonus: Math.max(-15, Math.min(15, bonus)),
    reasons: reasons.slice(0, 2),
    penalties: penalties.slice(0, 1),
    confidence: 0.75,
  };
}

// ============================================================
// TIER 8: Solar/Lunar Return + 이클립스 분석
// ============================================================

/**
 * TIER 8: Solar Return 분석
 */
export function calculateSolarReturnBonus(
  input: AdvancedAnalysisInput,
  eventType: EventType,
  targetYear: number
): TierBonus {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const solarReturn = (input.advancedAstro as any)?.solarReturn;
  if (!solarReturn) {
    return { bonus: 0, reasons: [], penalties: [], confidence: 0 };
  }

  // 1. Solar Return 테마 분석 (다양한 포맷 지원)
  const theme = (solarReturn.theme || solarReturn.summary?.theme || '').toLowerCase();
  const ascSign = (solarReturn.ascSign || solarReturn.ascendant?.sign || '').toLowerCase();

  const eventThemeMap: Record<EventType, string[]> = {
    career: ['career', 'achievement', 'success', 'authority', 'capricorn', 'leo'],
    marriage: ['love', 'partnership', 'commitment', 'venus', 'libra', '7th'],
    investment: ['wealth', 'money', 'resources', 'taurus', '2nd', '8th'],
    move: ['change', 'travel', 'sagittarius', '9th', '4th', 'home'],
    study: ['learning', 'education', 'gemini', 'virgo', '9th', '3rd'],
    health: ['health', 'vitality', 'virgo', '6th', '1st'],
    relationship: ['love', 'social', 'venus', 'libra', '5th', '7th'],
  };

  const relevantThemes = eventThemeMap[eventType] || [];
  for (const t of relevantThemes) {
    if (theme.includes(t) || ascSign.includes(t)) {
      bonus += 10;
      reasons.push(`Solar Return: ${eventType} 테마 활성`);
      break;
    }
  }

  // 2. Solar Return ASC 사인 분석
  const ascSignBonuses: Record<string, EventType[]> = {
    'aries': ['career', 'move'],
    'taurus': ['investment', 'relationship'],
    'gemini': ['study', 'move'],
    'cancer': ['marriage', 'health'],
    'leo': ['career', 'relationship'],
    'virgo': ['study', 'health'],
    'libra': ['marriage', 'relationship'],
    'scorpio': ['investment', 'career'],
    'sagittarius': ['study', 'move'],
    'capricorn': ['career', 'investment'],
    'aquarius': ['study', 'move'],
    'pisces': ['relationship', 'health'],
  };

  for (const [sign, events] of Object.entries(ascSignBonuses)) {
    if (ascSign.includes(sign) && events.includes(eventType)) {
      bonus += 8;
      reasons.push(`SR ASC ${sign} - ${eventType} 유리`);
      break;
    }
  }

  return {
    bonus: Math.max(-15, Math.min(20, bonus)),
    reasons: reasons.slice(0, 2),
    penalties: penalties.slice(0, 1),
    confidence: 0.8,
  };
}

/**
 * TIER 8: Lunar Return 분석 (월별)
 */
export function calculateLunarReturnBonus(
  input: AdvancedAnalysisInput,
  eventType: EventType,
  targetMonth: number
): TierBonus {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const lunarReturn = (input.advancedAstro as any)?.lunarReturn;
  if (!lunarReturn) {
    return { bonus: 0, reasons: [], penalties: [], confidence: 0 };
  }

  const theme = (lunarReturn.theme || lunarReturn.summary?.theme || '').toLowerCase();
  const moonSign = (lunarReturn.moonSign || lunarReturn.moon?.sign || '').toLowerCase();

  // 감정적 테마와 이벤트 매칭
  const emotionalThemes: Record<EventType, string[]> = {
    marriage: ['love', 'commitment', 'emotional', 'nurturing'],
    career: ['ambition', 'drive', 'achievement'],
    investment: ['security', 'resources', 'stability'],
    move: ['change', 'adventure', 'freedom'],
    study: ['curiosity', 'learning', 'mental'],
    health: ['healing', 'wellness', 'self-care'],
    relationship: ['connection', 'love', 'social'],
  };

  const relevantThemes = emotionalThemes[eventType] || [];
  for (const t of relevantThemes) {
    if (theme.includes(t) || moonSign.includes(t)) {
      bonus += 8;
      reasons.push(`Lunar Return: ${eventType} 감정 활성`);
      break;
    }
  }

  return {
    bonus: Math.max(-10, Math.min(15, bonus)),
    reasons: reasons.slice(0, 2),
    penalties: penalties.slice(0, 1),
    confidence: 0.7,
  };
}

/**
 * TIER 8: 이클립스 영향 분석
 */
export function calculateEclipseBonus(
  input: AdvancedAnalysisInput,
  eventType: EventType
): TierBonus {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eclipses = (input.advancedAstro as any)?.eclipses;
  if (!eclipses?.impact) {
    return { bonus: 0, reasons: [], penalties: [], confidence: 0 };
  }

  const eclipseType = eclipses.impact.type?.toLowerCase() || '';
  const affectedPlanets = eclipses.impact.affectedPlanets || [];

  // 이클립스는 기본적으로 변화/불안정을 의미
  if (eventType === 'marriage' || eventType === 'investment') {
    bonus -= 8;
    penalties.push('이클립스 시즌 - 중요 결정 보류 권장');
  } else if (eventType === 'move' || eventType === 'career') {
    // 변화에는 오히려 유리할 수 있음
    if (eclipseType.includes('solar')) {
      bonus += 5;
      reasons.push('일식 - 새로운 시작 에너지');
    }
  }

  // 영향받는 행성 체크
  const planetEventMap: Record<string, EventType[]> = {
    'venus': ['marriage', 'relationship', 'investment'],
    'mars': ['career', 'move'],
    'jupiter': ['study', 'career', 'investment'],
    'saturn': ['career', 'health'],
    'sun': ['career'],
    'moon': ['health', 'relationship'],
  };

  for (const planet of affectedPlanets) {
    const pLower = planet.toLowerCase();
    const events = planetEventMap[pLower] || [];
    if (events.includes(eventType)) {
      bonus -= 5;
      penalties.push(`${planet} 이클립스 영향 - 주의`);
      break;
    }
  }

  return {
    bonus: Math.max(-15, Math.min(10, bonus)),
    reasons: reasons.slice(0, 1),
    penalties: penalties.slice(0, 2),
    confidence: 0.75,
  };
}

// ============================================================
// TIER 9: 격국(格局) + 용신 심층 분석
// ============================================================

/**
 * TIER 9: 격국 기반 이벤트 적합도 분석
 */
export function calculateGeokgukBonus(
  input: AdvancedAnalysisInput,
  eventType: EventType,
  targetYear: number,
  targetMonth: number
): TierBonus {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const geokguk = input.geokguk || '';

  // 격국별 이벤트 적합도
  const geokgukEventMap: Record<string, {
    good: EventType[];
    caution: EventType[];
    description: string;
  }> = {
    '정관격': {
      good: ['career', 'marriage'],
      caution: ['investment'],
      description: '명예/직장 운 강함',
    },
    '편관격': {
      good: ['career', 'move'],
      caution: ['marriage', 'relationship'],
      description: '변화/도전 운 강함',
    },
    '정인격': {
      good: ['study', 'health'],
      caution: ['investment'],
      description: '학문/수련 운 강함',
    },
    '편인격': {
      good: ['study', 'move'],
      caution: ['career', 'marriage'],
      description: '창의/변화 운 강함',
    },
    '정재격': {
      good: ['investment', 'marriage'],
      caution: ['move'],
      description: '재물/안정 운 강함',
    },
    '편재격': {
      good: ['investment', 'career'],
      caution: ['health'],
      description: '사업/확장 운 강함',
    },
    '식신격': {
      good: ['study', 'relationship', 'health'],
      caution: [],
      description: '표현/건강 운 강함',
    },
    '상관격': {
      good: ['study', 'career'],
      caution: ['marriage', 'relationship'],
      description: '창의/돌파 운 강함',
    },
    '비견격': {
      good: ['career', 'relationship'],
      caution: ['investment'],
      description: '경쟁/협력 운 강함',
    },
    '겁재격': {
      good: ['move', 'career'],
      caution: ['investment', 'marriage'],
      description: '추진/변화 운 강함',
    },
    '건록격': {
      good: ['career', 'health'],
      caution: [],
      description: '자수성가 운 강함',
    },
    '양인격': {
      good: ['career', 'move'],
      caution: ['marriage', 'relationship'],
      description: '결단/추진 운 강함',
    },
  };

  const geokgukInfo = geokgukEventMap[geokguk];
  if (geokgukInfo) {
    if (geokgukInfo.good.includes(eventType)) {
      bonus += 12;
      reasons.push(`${geokguk}: ${geokgukInfo.description}`);
    }
    if (geokgukInfo.caution.includes(eventType)) {
      bonus -= 8;
      penalties.push(`${geokguk} - ${eventType} 신중 필요`);
    }
  }

  // 세운과 격국의 조화 분석
  const yearGanji = calculateYearlyGanji(targetYear);
  const yearElement = STEM_ELEMENT[yearGanji.stem];

  // 격국에 맞는 오행이 세운에 오면 보너스
  const geokgukElementMap: Record<string, FiveElement[]> = {
    '정관격': ['금', '수'],
    '편관격': ['금', '수'],
    '정인격': ['목', '화'],
    '편인격': ['목', '화'],
    '정재격': ['토', '금'],
    '편재격': ['토', '금'],
    '식신격': ['목', '화'],
    '상관격': ['목', '화'],
  };

  const favorableElements = geokgukElementMap[geokguk] || [];
  if (favorableElements.includes(yearElement)) {
    bonus += 8;
    reasons.push(`${targetYear}년 ${yearElement} - 격국 활성`);
  }

  return {
    bonus: Math.max(-15, Math.min(20, bonus)),
    reasons: reasons.slice(0, 2),
    penalties: penalties.slice(0, 1),
    confidence: 0.85,
  };
}

/**
 * TIER 9: 용신 심층 분석 - 세운/월운 용신 강도
 */
export function calculateYongsinDepthBonus(
  input: AdvancedAnalysisInput,
  eventType: EventType,
  targetYear: number,
  targetMonth: number
): TierBonus {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  if (!input.yongsin || input.yongsin.length === 0) {
    return { bonus: 0, reasons: [], penalties: [], confidence: 0 };
  }

  const yearGanji = calculateYearlyGanji(targetYear);
  const monthGanji = calculateMonthlyGanji(targetYear, targetMonth);

  const yearStemElement = STEM_ELEMENT[yearGanji.stem];
  const yearBranchElement = BRANCH_ELEMENT[yearGanji.branch];
  const monthStemElement = STEM_ELEMENT[monthGanji.stem];
  const monthBranchElement = BRANCH_ELEMENT[monthGanji.branch];

  // 세운 천간 용신
  if (input.yongsin.includes(yearStemElement)) {
    bonus += 10;
    reasons.push(`세운 천간 용신 ${yearStemElement} 투출`);
  }

  // 세운 지지 용신
  if (input.yongsin.includes(yearBranchElement)) {
    bonus += 8;
    reasons.push(`세운 지지 용신 ${yearBranchElement} 활성`);
  }

  // 월운 천간 용신
  if (input.yongsin.includes(monthStemElement)) {
    bonus += 6;
    reasons.push(`월운 용신 ${monthStemElement}`);
  }

  // 기신 체크
  if (input.kisin) {
    if (input.kisin.includes(yearStemElement)) {
      bonus -= 10;
      penalties.push(`세운 천간 기신 ${yearStemElement} - 주의`);
    }
    if (input.kisin.includes(yearBranchElement)) {
      bonus -= 8;
      penalties.push(`세운 지지 기신 활성`);
    }
  }

  // 용신이 이벤트에 유리한 오행인지
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  const yongsinMatch = input.yongsin.some(y => conditions.favorableElements.includes(y));
  if (yongsinMatch) {
    bonus += 6;
    reasons.push(`용신-${eventType} 오행 조화`);
  }

  return {
    bonus: Math.max(-20, Math.min(25, bonus)),
    reasons: reasons.slice(0, 3),
    penalties: penalties.slice(0, 2),
    confidence: 0.9,
  };
}

// ============================================================
// TIER 10: 통합 신뢰도 계산 + 크로스 검증
// ============================================================

/**
 * TIER 10: 다층 분석 결과 통합 및 신뢰도 계산
 */
export function calculateIntegratedScore(
  input: AdvancedAnalysisInput,
  eventType: EventType,
  targetYear: number,
  targetMonth: number,
  targetDay?: number
): {
  totalBonus: number;
  confidence: number;
  tier7: TierBonus;
  tier8: { solarReturn: TierBonus; lunarReturn: TierBonus; eclipse: TierBonus };
  tier9: { geokguk: TierBonus; yongsin: TierBonus };
  crossValidation: { agreement: number; conflicts: string[] };
  recommendation: string;
} {
  // 날짜 생성
  const targetDate = new Date(targetYear, targetMonth - 1, targetDay || 15);

  // TIER 7 계산
  const dailyBonus = calculateDailyPillarBonus(input, eventType, targetDate);
  const hourlyBonus = input.birthHour !== undefined
    ? calculateHourlyBonus(input, eventType, input.birthHour)
    : { bonus: 0, reasons: [], penalties: [], confidence: 0 };

  const tier7: TierBonus = {
    bonus: dailyBonus.bonus + hourlyBonus.bonus,
    reasons: [...dailyBonus.reasons, ...hourlyBonus.reasons],
    penalties: [...dailyBonus.penalties, ...hourlyBonus.penalties],
    confidence: (dailyBonus.confidence + hourlyBonus.confidence) / 2,
  };

  // TIER 8 계산
  const solarReturn = calculateSolarReturnBonus(input, eventType, targetYear);
  const lunarReturn = calculateLunarReturnBonus(input, eventType, targetMonth);
  const eclipse = calculateEclipseBonus(input, eventType);

  // TIER 9 계산
  const geokguk = calculateGeokgukBonus(input, eventType, targetYear, targetMonth);
  const yongsin = calculateYongsinDepthBonus(input, eventType, targetYear, targetMonth);

  // 크로스 검증
  const allBonuses = [
    tier7.bonus,
    solarReturn.bonus,
    lunarReturn.bonus,
    eclipse.bonus,
    geokguk.bonus,
    yongsin.bonus,
  ].filter(b => b !== 0);

  const positiveCount = allBonuses.filter(b => b > 0).length;
  const negativeCount = allBonuses.filter(b => b < 0).length;

  const conflicts: string[] = [];
  if (positiveCount > 0 && negativeCount > 0) {
    conflicts.push('분석 간 상충 발견');
    if (tier7.bonus > 0 && eclipse.bonus < 0) {
      conflicts.push('일진 길일이나 이클립스 주의');
    }
    if (geokguk.bonus > 0 && yongsin.bonus < 0) {
      conflicts.push('격국 유리하나 기신 활성');
    }
  }

  const agreement = allBonuses.length > 0
    ? (Math.max(positiveCount, negativeCount) / allBonuses.length)
    : 0.5;

  // 총점 계산 (가중치 적용)
  const weights = {
    tier7: 0.20,
    solarReturn: 0.15,
    lunarReturn: 0.10,
    eclipse: 0.10,
    geokguk: 0.25,
    yongsin: 0.20,
  };

  const totalBonus =
    tier7.bonus * weights.tier7 +
    solarReturn.bonus * weights.solarReturn +
    lunarReturn.bonus * weights.lunarReturn +
    eclipse.bonus * weights.eclipse +
    geokguk.bonus * weights.geokguk +
    yongsin.bonus * weights.yongsin;

  // 신뢰도 계산
  const confidences = [
    tier7.confidence,
    solarReturn.confidence,
    lunarReturn.confidence,
    eclipse.confidence,
    geokguk.confidence,
    yongsin.confidence,
  ].filter(c => c > 0);

  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0.5;

  const finalConfidence = avgConfidence * agreement;

  // 추천 생성
  let recommendation = '';
  if (totalBonus >= 15 && finalConfidence >= 0.7) {
    recommendation = `${eventType}에 매우 적합한 시기입니다. 적극 추진을 권장합니다.`;
  } else if (totalBonus >= 8 && finalConfidence >= 0.6) {
    recommendation = `${eventType}에 양호한 시기입니다. 진행해도 좋습니다.`;
  } else if (totalBonus >= 0) {
    recommendation = `${eventType}에 평범한 시기입니다. 신중하게 판단하세요.`;
  } else if (totalBonus >= -10) {
    recommendation = `${eventType}에 다소 불리한 시기입니다. 가능하면 연기를 권장합니다.`;
  } else {
    recommendation = `${eventType}에 불리한 시기입니다. 다른 시기를 찾아보세요.`;
  }

  if (conflicts.length > 0) {
    recommendation += ` 단, ${conflicts.join(', ')}.`;
  }

  return {
    totalBonus: Math.round(totalBonus * 10) / 10,
    confidence: Math.round(finalConfidence * 100) / 100,
    tier7,
    tier8: { solarReturn, lunarReturn, eclipse },
    tier9: { geokguk, yongsin },
    crossValidation: { agreement, conflicts },
    recommendation,
  };
}

// ============================================================
// 헬퍼 함수
// ============================================================

function analyzeBranchRelation(branch1: string, branch2: string): string {
  const sixCombos: Record<string, string> = {
    '子丑': '육합', '丑子': '육합', '寅亥': '육합', '亥寅': '육합',
    '卯戌': '육합', '戌卯': '육합', '辰酉': '육합', '酉辰': '육합',
    '巳申': '육합', '申巳': '육합', '午未': '육합', '未午': '육합',
  };

  const partialTrines: Record<string, string> = {
    '寅午': '삼합', '午戌': '삼합', '寅戌': '삼합',
    '申子': '삼합', '子辰': '삼합', '申辰': '삼합',
    '巳酉': '삼합', '酉丑': '삼합', '巳丑': '삼합',
    '亥卯': '삼합', '卯未': '삼합', '亥未': '삼합',
  };

  const clashes: Record<string, string> = {
    '子午': '충', '午子': '충', '丑未': '충', '未丑': '충',
    '寅申': '충', '申寅': '충', '卯酉': '충', '酉卯': '충',
    '辰戌': '충', '戌辰': '충', '巳亥': '충', '亥巳': '충',
  };

  const punishments: Record<string, string> = {
    '寅巳': '형', '巳寅': '형', '巳申': '형', '申巳': '형',
    '丑戌': '형', '戌丑': '형', '戌未': '형', '未戌': '형',
    '子卯': '형', '卯子': '형',
  };

  const combo = branch1 + branch2;
  const reverseCombo = branch2 + branch1;

  if (sixCombos[combo] || sixCombos[reverseCombo]) return '육합';
  if (partialTrines[combo] || partialTrines[reverseCombo]) return '삼합';
  if (clashes[combo] || clashes[reverseCombo]) return '충';
  if (punishments[combo] || punishments[reverseCombo]) return '형';

  return '무관';
}

// ============================================================
// 통합 TIER 7-10 분석 함수 (외부 호출용)
// ============================================================

export function calculateTier7To10Bonus(
  input: AdvancedAnalysisInput,
  eventType: EventType,
  targetYear: number,
  targetMonth: number,
  targetDay?: number
): {
  total: number;
  confidence: number;
  reasons: string[];
  penalties: string[];
  recommendation: string;
} {
  const result = calculateIntegratedScore(input, eventType, targetYear, targetMonth, targetDay);

  const allReasons = [
    ...result.tier7.reasons,
    ...result.tier8.solarReturn.reasons,
    ...result.tier8.lunarReturn.reasons,
    ...result.tier8.eclipse.reasons,
    ...result.tier9.geokguk.reasons,
    ...result.tier9.yongsin.reasons,
  ];

  const allPenalties = [
    ...result.tier7.penalties,
    ...result.tier8.solarReturn.penalties,
    ...result.tier8.lunarReturn.penalties,
    ...result.tier8.eclipse.penalties,
    ...result.tier9.geokguk.penalties,
    ...result.tier9.yongsin.penalties,
  ];

  return {
    total: result.totalBonus,
    confidence: result.confidence,
    reasons: allReasons.slice(0, 5),
    penalties: allPenalties.slice(0, 3),
    recommendation: result.recommendation,
  };
}
