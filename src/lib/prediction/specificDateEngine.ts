// src/lib/prediction/specificDateEngine.ts
// 구체적 날짜/시간 추천 엔진 - "3월 15일 오전 10시에 면접 보세요"

import {
  calculateDailyPillar,
  calculateUltraPrecisionScore,
  type UltraPrecisionScore,
  type HourlyAdvice,
} from './ultraPrecisionEngine';
import {
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
} from './advancedTimingEngine';
import { normalizeScore } from './utils/scoring-utils';

// ============================================================
// 타입 정의
// ============================================================

export type ActivityType =
  | 'marriage'      // 결혼
  | 'engagement'    // 약혼
  | 'moving'        // 이사
  | 'business'      // 사업 시작
  | 'contract'      // 계약
  | 'interview'     // 면접
  | 'investment'    // 투자
  | 'travel'        // 여행
  | 'surgery'       // 수술
  | 'meeting'       // 중요 미팅
  | 'proposal'      // 고백/프로포즈
  | 'study'         // 시험/학습
  | 'career_change' // 이직
  | 'opening'       // 개업
  | 'negotiation';  // 협상

export interface DateRecommendation {
  date: Date;
  year: number;
  month: number;
  day: number;
  dayOfWeek: string;

  // 점수 및 등급
  totalScore: number;
  activityScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  rank: number;  // 순위

  // 일진 정보
  dailyStem: string;
  dailyBranch: string;
  twelveStage: string;
  sibsin: string;

  // 추천 시간대
  bestHours: RecommendedHour[];

  // 이유
  reasons: string[];
  warnings: string[];

  // 상세 분석
  detailedAnalysis: string;
}

export interface RecommendedHour {
  hour: number;
  hourRange: string;   // "09:00-11:00"
  siGan: string;       // 시간 지지
  quality: 'excellent' | 'good' | 'neutral';
  reason: string;
  score: number;
}

export interface DateSearchInput {
  activity: ActivityType;
  dayStem: string;
  dayBranch: string;
  monthBranch: string;
  yearBranch: string;
  allStems: string[];
  allBranches: string[];
  yongsin?: string;          // 용신 오행
  startDate?: Date;          // 검색 시작일
  searchDays?: number;       // 검색 기간 (일)
  topN?: number;             // 상위 N개 추천
}

export interface YongsinActivation {
  date: Date;
  activationLevel: 'very_strong' | 'strong' | 'moderate' | 'weak';
  score: number;
  sources: string[];         // 활성화 원인
  advice: string;
}

// ============================================================
// 상수 정의
// ============================================================

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const DAY_OF_WEEK_KO = ['일', '월', '화', '수', '목', '금', '토'];

const STEM_ELEMENT: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
};

const BRANCH_ELEMENT: Record<string, string> = {
  '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화',
  '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수',
};

// 활동별 유리한 조건
const ACTIVITY_CONDITIONS: Record<ActivityType, {
  favorableElements: string[];
  favorableSibsin: string[];
  favorableTwelveStage: string[];
  unfavorableSibsin: string[];
  avoidBranches?: string[];
  preferBranches?: string[];
  minScore: number;
  description: string;
}> = {
  marriage: {
    favorableElements: ['목', '화'],
    favorableSibsin: ['정재', '정관', '식신', '정인'],
    favorableTwelveStage: ['장생', '관대', '건록', '제왕'],
    unfavorableSibsin: ['겁재', '상관', '편인'],
    avoidBranches: ['寅', '巳', '申', '亥'],  // 역마 제외
    minScore: 70,
    description: '결혼/혼례',
  },
  engagement: {
    favorableElements: ['화', '목'],
    favorableSibsin: ['정재', '정관', '식신'],
    favorableTwelveStage: ['장생', '관대', '건록'],
    unfavorableSibsin: ['겁재', '상관'],
    minScore: 65,
    description: '약혼',
  },
  moving: {
    favorableElements: ['목', '토'],
    favorableSibsin: ['정인', '편인', '정재'],
    favorableTwelveStage: ['장생', '관대', '건록', '제왕'],
    unfavorableSibsin: ['겁재'],
    preferBranches: ['寅', '巳', '申', '亥'],  // 역마살 선호
    minScore: 60,
    description: '이사',
  },
  business: {
    favorableElements: ['토', '금'],
    favorableSibsin: ['정재', '편재', '식신', '정관'],
    favorableTwelveStage: ['장생', '건록', '제왕'],
    unfavorableSibsin: ['겁재', '상관'],
    minScore: 75,
    description: '사업 시작',
  },
  contract: {
    favorableElements: ['금', '토'],
    favorableSibsin: ['정재', '정관', '정인'],
    favorableTwelveStage: ['건록', '제왕', '관대'],
    unfavorableSibsin: ['겁재', '상관', '편인'],
    minScore: 70,
    description: '계약',
  },
  interview: {
    favorableElements: ['화', '금'],
    favorableSibsin: ['정관', '정인', '식신'],
    favorableTwelveStage: ['관대', '건록', '제왕', '장생'],
    unfavorableSibsin: ['겁재', '상관'],
    minScore: 65,
    description: '면접',
  },
  investment: {
    favorableElements: ['금', '수'],
    favorableSibsin: ['정재', '편재', '식신'],
    favorableTwelveStage: ['장생', '건록', '제왕'],
    unfavorableSibsin: ['겁재', '상관', '편인'],
    minScore: 70,
    description: '투자',
  },
  travel: {
    favorableElements: ['목', '수'],
    favorableSibsin: ['식신', '정인', '편재'],
    favorableTwelveStage: ['장생', '목욕', '관대'],
    unfavorableSibsin: ['겁재'],
    preferBranches: ['寅', '巳', '申', '亥'],  // 역마
    minScore: 55,
    description: '여행',
  },
  surgery: {
    favorableElements: ['금', '수'],
    favorableSibsin: ['정관', '정인', '편관'],
    favorableTwelveStage: ['건록', '제왕', '관대'],
    unfavorableSibsin: ['상관', '겁재'],
    minScore: 70,
    description: '수술',
  },
  meeting: {
    favorableElements: ['화', '토'],
    favorableSibsin: ['정관', '정재', '식신', '정인'],
    favorableTwelveStage: ['관대', '건록', '제왕'],
    unfavorableSibsin: ['상관', '겁재'],
    minScore: 60,
    description: '중요 미팅',
  },
  proposal: {
    favorableElements: ['화', '목'],
    favorableSibsin: ['정재', '식신', '정관'],
    favorableTwelveStage: ['장생', '관대', '건록'],
    unfavorableSibsin: ['상관', '겁재'],
    preferBranches: ['卯', '酉', '子', '午'],  // 도화
    minScore: 65,
    description: '프로포즈/고백',
  },
  study: {
    favorableElements: ['수', '목'],
    favorableSibsin: ['정인', '편인', '식신'],
    favorableTwelveStage: ['장생', '관대', '건록', '목욕'],
    unfavorableSibsin: ['겁재'],
    preferBranches: ['辰', '戌', '丑', '未'],  // 화개
    minScore: 60,
    description: '시험/학습',
  },
  career_change: {
    favorableElements: ['목', '화'],
    favorableSibsin: ['정관', '편관', '정재', '식신'],
    favorableTwelveStage: ['장생', '관대', '건록', '제왕'],
    unfavorableSibsin: ['겁재', '상관'],
    preferBranches: ['寅', '巳', '申', '亥'],  // 역마
    minScore: 70,
    description: '이직',
  },
  opening: {
    favorableElements: ['토', '화'],
    favorableSibsin: ['정재', '편재', '식신', '정관'],
    favorableTwelveStage: ['장생', '건록', '제왕'],
    unfavorableSibsin: ['겁재', '상관'],
    minScore: 75,
    description: '개업',
  },
  negotiation: {
    favorableElements: ['금', '수'],
    favorableSibsin: ['정관', '정재', '정인'],
    favorableTwelveStage: ['관대', '건록', '제왕'],
    unfavorableSibsin: ['상관', '겁재'],
    minScore: 65,
    description: '협상',
  },
};

// 천을귀인 조견표
const CHEONUL_GUIN: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '辛': ['寅', '午'],
  '壬': ['卯', '巳'], '癸': ['卯', '巳'],
};

// ============================================================
// 날짜별 활동 적합도 계산
// ============================================================

function calculateActivityScore(
  daily: { stem: string; branch: string },
  activity: ActivityType,
  dayStem: string,
  dayBranch: string,
  monthBranch: string,
  yearBranch: string,
  allBranches: string[],
  yongsin?: string
): { score: number; reasons: string[]; warnings: string[] } {
  const conditions = ACTIVITY_CONDITIONS[activity];
  let score = 50;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const dailyElement = STEM_ELEMENT[daily.stem];
  const dailyBranchElement = BRANCH_ELEMENT[daily.branch];
  const sibsin = calculateSibsin(dayStem, daily.stem);
  const twelveStage = calculatePreciseTwelveStage(dayStem, daily.branch);

  // 1. 일간 오행 검사
  if (conditions.favorableElements.includes(dailyElement)) {
    score += 10;
    reasons.push(`${dailyElement} 오행의 일간 - ${conditions.description}에 유리`);
  }

  // 2. 일지 오행 검사
  if (conditions.favorableElements.includes(dailyBranchElement)) {
    score += 8;
    reasons.push(`${dailyBranchElement} 오행의 일지`);
  }

  // 3. 십신 검사
  if (conditions.favorableSibsin.includes(sibsin)) {
    score += 15;
    reasons.push(`${sibsin}운 - ${conditions.description}에 좋은 기운`);
  }
  if (conditions.unfavorableSibsin.includes(sibsin)) {
    score -= 15;
    warnings.push(`${sibsin}운 - 신중함 필요`);
  }

  // 4. 12운성 검사
  if (conditions.favorableTwelveStage.includes(twelveStage.stage)) {
    score += 12;
    reasons.push(`${twelveStage.stage} 단계 - 에너지 상승기`);
  }
  if (['사', '병', '묘', '절'].includes(twelveStage.stage)) {
    score -= 10;
    warnings.push(`${twelveStage.stage} 단계 - 에너지 하강기`);
  }

  // 5. 선호/기피 지지 검사
  if (conditions.preferBranches?.includes(daily.branch)) {
    score += 10;
    reasons.push(`${daily.branch}지 - ${conditions.description}에 특히 유리`);
  }
  if (conditions.avoidBranches?.includes(daily.branch)) {
    score -= 10;
    warnings.push(`${daily.branch}지 - 활동적 에너지 주의`);
  }

  // 6. 지지 충 검사
  const allWithDaily = [...allBranches, daily.branch];
  const interactions = analyzeBranchInteractions(allWithDaily);
  const chung = interactions.filter(i => i.type === '충' && i.branches.includes(daily.branch));
  if (chung.length > 0) {
    score -= 15;
    warnings.push(`${chung[0].branches.join('-')} 충 - 갈등 주의`);
  }

  // 7. 지지 합 검사
  const hab = interactions.filter(i =>
    ['육합', '삼합', '방합'].includes(i.type) && i.branches.includes(daily.branch)
  );
  if (hab.length > 0) {
    score += 10;
    reasons.push(`${hab[0].type} - 조화로운 기운`);
  }

  // 8. 천을귀인 검사
  const guinBranches = CHEONUL_GUIN[dayStem] || [];
  if (guinBranches.includes(daily.branch)) {
    score += 18;
    reasons.push('천을귀인일 - 귀인의 도움');
  }

  // 9. 용신 활성화 검사
  if (yongsin) {
    if (dailyElement === yongsin) {
      score += 20;
      reasons.push(`용신(${yongsin}) 활성화 - 최적의 타이밍`);
    }
    if (dailyBranchElement === yongsin) {
      score += 12;
      reasons.push(`용신(${yongsin}) 지지 활성화`);
    }
  }

  // 10. 공망 검사 (일주 기준)
  const gongmang = calculateGongmangSimple(dayStem, dayBranch);
  if (gongmang.includes(daily.branch)) {
    score -= 15;
    warnings.push(`${daily.branch} 공망 - 계획이 허해질 수 있음`);
  }

  return {
    score: normalizeScore(score),
    reasons,
    warnings,
  };
}

// 간략한 공망 계산
function calculateGongmangSimple(dayStem: string, dayBranch: string): string[] {
  const stemIdx = STEMS.indexOf(dayStem);
  const branchIdx = BRANCHES.indexOf(dayBranch);
  const xunStart = (branchIdx - stemIdx + 12) % 12;
  const gongmangStart = (xunStart + 10) % 12;
  return [BRANCHES[gongmangStart], BRANCHES[(gongmangStart + 1) % 12]];
}

// ============================================================
// 시간대 추천
// ============================================================

function findBestHours(
  daily: { stem: string; branch: string },
  activity: ActivityType,
  dayStem: string,
  yongsin?: string
): RecommendedHour[] {
  const hourBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const hourRanges = [
    '23:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00',
    '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00',
    '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00',
  ];

  const conditions = ACTIVITY_CONDITIONS[activity];
  const results: RecommendedHour[] = [];

  for (let i = 0; i < 12; i++) {
    const hourBranch = hourBranches[i];
    const hourElement = BRANCH_ELEMENT[hourBranch];
    let score = 50;
    const reasonParts: string[] = [];

    // 시지와 일지의 관계
    const interactions = analyzeBranchInteractions([daily.branch, hourBranch]);
    const positive = interactions.filter(i => i.impact === 'positive');
    const negative = interactions.filter(i => i.impact === 'negative');

    if (positive.length > 0) {
      score += 20;
      reasonParts.push(positive[0].type);
    }
    if (negative.length > 0) {
      score -= 15;
    }

    // 시지 오행이 유리한지
    if (conditions.favorableElements.includes(hourElement)) {
      score += 10;
      reasonParts.push(`${hourElement}기운`);
    }

    // 용신 시간
    if (yongsin && hourElement === yongsin) {
      score += 15;
      reasonParts.push(`용신시`);
    }

    // 천을귀인 시간
    const guinBranches = CHEONUL_GUIN[dayStem] || [];
    if (guinBranches.includes(hourBranch)) {
      score += 12;
      reasonParts.push('귀인시');
    }

    // 공망 시간 제외
    const gongmang = calculateGongmangSimple(daily.stem, daily.branch);
    if (gongmang.includes(hourBranch)) {
      score -= 20;
    }

    let quality: 'excellent' | 'good' | 'neutral';
    if (score >= 70) quality = 'excellent';
    else if (score >= 55) quality = 'good';
    else quality = 'neutral';

    // 실제 시각 계산 (각 지지 시간대의 중간)
    const realHour = (i * 2 + 1) % 24;

    results.push({
      hour: realHour,
      hourRange: hourRanges[i],
      siGan: hourBranch,
      quality,
      reason: reasonParts.length > 0 ? reasonParts.join(', ') : '일반적',
      score,
    });
  }

  // 점수순 정렬
  return results.sort((a, b) => b.score - a.score);
}

// ============================================================
// 메인 추천 함수
// ============================================================

export function findBestDates(input: DateSearchInput): DateRecommendation[] {
  const {
    activity,
    dayStem,
    dayBranch,
    monthBranch,
    yearBranch,
    allStems,
    allBranches,
    yongsin,
    startDate = new Date(),
    searchDays = 30,
    topN = 5,
  } = input;

  const conditions = ACTIVITY_CONDITIONS[activity];
  const candidates: DateRecommendation[] = [];

  // 시작일부터 검색 기간까지 모든 날짜 분석
  for (let i = 0; i < searchDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const daily = calculateDailyPillar(date);
    const sibsin = calculateSibsin(dayStem, daily.stem);
    const twelveStage = calculatePreciseTwelveStage(dayStem, daily.branch);

    // 활동 적합도 계산
    const { score: activityScore, reasons, warnings } = calculateActivityScore(
      daily, activity, dayStem, dayBranch, monthBranch, yearBranch, allBranches, yongsin
    );

    // 기본 일별 점수
    const ultraScore = calculateUltraPrecisionScore({
      date,
      dayStem,
      dayBranch,
      monthBranch,
      yearBranch,
      allStems,
      allBranches,
    });

    // 종합 점수 (활동 점수 60% + 기본 점수 40%)
    const totalScore = activityScore * 0.6 + ultraScore.totalScore * 0.4;

    // 최소 점수 미만이면 스킵
    if (totalScore < conditions.minScore * 0.8) continue;

    // 시간대 추천
    const bestHours = findBestHours(daily, activity, dayStem, yongsin);

    // 등급 결정
    let grade: 'S' | 'A' | 'B' | 'C' | 'D';
    if (totalScore >= 85) grade = 'S';
    else if (totalScore >= 70) grade = 'A';
    else if (totalScore >= 55) grade = 'B';
    else if (totalScore >= 40) grade = 'C';
    else grade = 'D';

    // 상세 분석 문구
    const detailedAnalysis = generateDetailedAnalysis(
      activity, daily, sibsin, twelveStage.stage, reasons, warnings
    );

    candidates.push({
      date,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      dayOfWeek: DAY_OF_WEEK_KO[date.getDay()],
      totalScore: Math.round(totalScore),
      activityScore: Math.round(activityScore),
      grade,
      rank: 0,  // 나중에 설정
      dailyStem: daily.stem,
      dailyBranch: daily.branch,
      twelveStage: twelveStage.stage,
      sibsin,
      bestHours: bestHours.filter(h => h.quality !== 'neutral').slice(0, 3),
      reasons,
      warnings,
      detailedAnalysis,
    });
  }

  // 점수순 정렬
  candidates.sort((a, b) => b.totalScore - a.totalScore);

  // 순위 부여 및 상위 N개 선택
  const topCandidates = candidates.slice(0, topN);
  topCandidates.forEach((c, idx) => { c.rank = idx + 1; });

  return topCandidates;
}

function generateDetailedAnalysis(
  activity: ActivityType,
  daily: { stem: string; branch: string },
  sibsin: string,
  twelveStage: string,
  reasons: string[],
  warnings: string[]
): string {
  const conditions = ACTIVITY_CONDITIONS[activity];
  const parts: string[] = [];

  parts.push(`${daily.stem}${daily.branch}일은 ${conditions.description}에 `);

  if (reasons.length >= 3) {
    parts.push('매우 좋은 날입니다. ');
  } else if (reasons.length >= 2) {
    parts.push('좋은 날입니다. ');
  } else {
    parts.push('무난한 날입니다. ');
  }

  if (reasons.length > 0) {
    parts.push(reasons.slice(0, 2).join(', ') + ' 등의 기운이 있습니다. ');
  }

  if (warnings.length > 0) {
    parts.push('다만 ' + warnings[0] + '에 유의하세요.');
  }

  return parts.join('');
}

// ============================================================
// 용신 활성화 시점 탐색
// ============================================================

export function findYongsinActivationPeriods(
  yongsin: string,  // '목' | '화' | '토' | '금' | '수'
  dayStem: string,
  startDate: Date = new Date(),
  searchDays: number = 60
): YongsinActivation[] {
  const activations: YongsinActivation[] = [];

  for (let i = 0; i < searchDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const daily = calculateDailyPillar(date);
    const dailyStemElement = STEM_ELEMENT[daily.stem];
    const dailyBranchElement = BRANCH_ELEMENT[daily.branch];

    const sources: string[] = [];
    let score = 0;

    // 일간 오행이 용신
    if (dailyStemElement === yongsin) {
      score += 40;
      sources.push(`일간(${daily.stem})이 ${yongsin}`);
    }

    // 일지 오행이 용신
    if (dailyBranchElement === yongsin) {
      score += 30;
      sources.push(`일지(${daily.branch})가 ${yongsin}`);
    }

    // 일지 지장간에서 용신 투출
    const hiddenStems = HIDDEN_STEMS[daily.branch] || [];
    for (const hidden of hiddenStems) {
      if (STEM_ELEMENT[hidden] === yongsin) {
        score += 15;
        sources.push(`지장간(${hidden}) ${yongsin}`);
        break;
      }
    }

    // 생조 관계 (용신을 생하는 오행)
    const generating: Record<string, string> = {
      '목': '수', '화': '목', '토': '화', '금': '토', '수': '금',
    };
    if (dailyStemElement === generating[yongsin]) {
      score += 10;
      sources.push(`${dailyStemElement}이 ${yongsin}을 생함`);
    }

    if (score <= 10) continue;

    // 활성화 레벨
    let activationLevel: YongsinActivation['activationLevel'];
    if (score >= 60) activationLevel = 'very_strong';
    else if (score >= 40) activationLevel = 'strong';
    else if (score >= 25) activationLevel = 'moderate';
    else activationLevel = 'weak';

    const advice = generateYongsinAdvice(yongsin, activationLevel, sources);

    activations.push({
      date,
      activationLevel,
      score,
      sources,
      advice,
    });
  }

  // 강한 순으로 정렬
  return activations.sort((a, b) => b.score - a.score);
}

const HIDDEN_STEMS: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'],
  '卯': ['乙'], '辰': ['戊', '乙', '癸'], '巳': ['丙', '戊', '庚'],
  '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
  '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲'],
};

function generateYongsinAdvice(
  yongsin: string,
  level: YongsinActivation['activationLevel'],
  sources: string[]
): string {
  const elementAdvice: Record<string, string> = {
    '목': '창의적 활동, 새 시작, 성장 관련 일',
    '화': '표현, 발표, 인맥 확장, 열정적 활동',
    '토': '안정, 부동산, 계약, 신뢰 구축',
    '금': '재정, 결단, 수확, 마무리',
    '수': '학습, 계획, 지혜 활용, 유연한 대응',
  };

  if (level === 'very_strong') {
    return `${yongsin} 기운이 매우 강합니다! ${elementAdvice[yongsin]}에 최적입니다.`;
  } else if (level === 'strong') {
    return `${yongsin} 기운이 강합니다. ${elementAdvice[yongsin]}을 진행하기 좋습니다.`;
  } else {
    return `${yongsin} 기운이 활성화됩니다. ${elementAdvice[yongsin]}을 고려해보세요.`;
  }
}

// ============================================================
// 프롬프트 컨텍스트 생성
// ============================================================

export function generateSpecificDatePromptContext(
  recommendations: DateRecommendation[],
  activity: ActivityType,
  lang: 'ko' | 'en' = 'ko'
): string {
  const conditions = ACTIVITY_CONDITIONS[activity];
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push(`=== ${conditions.description} 최적 날짜 추천 ===`);
    lines.push('');

    for (const rec of recommendations) {
      lines.push(`【${rec.rank}위】 ${rec.month}월 ${rec.day}일 (${rec.dayOfWeek}) - ${rec.grade}등급 (${rec.totalScore}점)`);
      lines.push(`  일진: ${rec.dailyStem}${rec.dailyBranch} | ${rec.sibsin}운 | ${rec.twelveStage}`);

      if (rec.bestHours.length > 0) {
        const hourStr = rec.bestHours.map(h => h.hourRange).join(', ');
        lines.push(`  🕐 추천 시간: ${hourStr}`);
      }

      if (rec.reasons.length > 0) {
        lines.push(`  ✓ ${rec.reasons.slice(0, 2).join(' / ')}`);
      }

      if (rec.warnings.length > 0) {
        lines.push(`  ⚠️ ${rec.warnings[0]}`);
      }

      lines.push('');
    }

    lines.push(`💡 위 날짜들은 ${conditions.description}에 특별히 유리한 날입니다.`);

  } else {
    lines.push(`=== Best Dates for ${conditions.description} ===`);
    lines.push('');

    for (const rec of recommendations) {
      lines.push(`【#${rec.rank}】 ${rec.month}/${rec.day} (${rec.dayOfWeek}) - Grade ${rec.grade} (${rec.totalScore})`);
      lines.push(`  Daily: ${rec.dailyStem}${rec.dailyBranch} | ${rec.twelveStage}`);

      if (rec.bestHours.length > 0) {
        const hourStr = rec.bestHours.map(h => h.hourRange).join(', ');
        lines.push(`  🕐 Best hours: ${hourStr}`);
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

export function generateYongsinPromptContext(
  activations: YongsinActivation[],
  yongsin: string,
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];
  const topActivations = activations.slice(0, 10);

  if (lang === 'ko') {
    lines.push(`=== 용신(${yongsin}) 활성화 기간 ===`);
    lines.push('');

    for (const act of topActivations) {
      const date = act.date;
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const levelStr = act.activationLevel === 'very_strong' ? '★★★'
        : act.activationLevel === 'strong' ? '★★'
        : '★';

      lines.push(`${dateStr} ${levelStr} (${act.score}점)`);
      lines.push(`  ${act.advice}`);
      lines.push('');
    }

  } else {
    lines.push(`=== Yongsin (${yongsin}) Activation Periods ===`);
    lines.push('');

    for (const act of topActivations) {
      const date = act.date;
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      lines.push(`${dateStr} - ${act.activationLevel} (${act.score})`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
