// src/lib/prediction/timingScore.ts
// 월별 타이밍 스코어 매트릭스 및 신뢰도 점수 시스템

import { TIMING_OVERLAY_MATRIX, TRANSIT_CYCLE_INFO, RETROGRADE_SCHEDULE } from '@/lib/destiny-matrix/data/layer4-timing-overlay';
import { scoreToGrade, type PredictionGrade } from './index';

// ============================================================
// 타입 정의
// ============================================================

export type FiveElement = '목' | '화' | '토' | '금' | '수';
export type TwelveStage = '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠' | '병' | '사' | '묘' | '절' | '태' | '양';

export interface MonthlyTimingScore {
  year: number;
  month: number;

  // 동양 분석
  easternScore: number;         // 사주 기반 점수 (0-100)
  monthlyElement: FiveElement;  // 해당 월의 오행
  twelveStage: TwelveStage;     // 12운성 단계
  stageEnergy: 'rising' | 'peak' | 'declining' | 'dormant';

  // 서양 분석
  westernScore: number;         // 점성술 기반 점수 (0-100)
  activeTransits: TransitEffect[];
  retrogradeEffects: RetrogradeEffect[];

  // 종합
  combinedScore: number;        // 종합 점수 (0-100)
  confidence: number;           // 신뢰도 (0-100)
  grade: PredictionGrade;

  // 해석
  themes: string[];
  opportunities: string[];
  cautions: string[];
  bestDays: number[];           // 해당 월 내 좋은 날
  avoidDays: number[];          // 해당 월 내 피할 날
  advice: string;
}

export interface TransitEffect {
  type: string;                 // 'saturnReturn', 'jupiterReturn' 등
  planet: string;
  aspect: string;
  score: number;
  description: string;
}

export interface RetrogradeEffect {
  planet: string;
  isRetrograde: boolean;
  score: number;
  advice: string[];
}

export interface PredictionConfidence {
  overall: number;              // 종합 신뢰도 (0-100)

  // 구성 요소별 신뢰도
  dataQuality: number;          // 입력 데이터 품질
  methodAlignment: number;      // 동서양 분석 일치도
  cycleSynchrony: number;       // 주기 동기화 정도
  historicalAccuracy: number;   // 역사적 정확도 (가능한 경우)

  // 설명
  factors: ConfidenceFactor[];
  limitations: string[];
}

export interface ConfidenceFactor {
  name: string;
  score: number;
  weight: number;
  reason: string;
}

export interface YearlyPrediction {
  year: number;
  monthlyScores: MonthlyTimingScore[];
  confidence: PredictionConfidence;

  // 연간 요약
  bestMonths: number[];
  challengingMonths: number[];
  yearTheme: string;
  daeunPhase: string;
  annualElement: FiveElement;
  annualTransits: string[];

  // 분기별 흐름
  quarters: QuarterAnalysis[];
}

export interface QuarterAnalysis {
  quarter: 1 | 2 | 3 | 4;
  averageScore: number;
  trend: 'ascending' | 'descending' | 'stable' | 'volatile';
  keyEvents: string[];
  recommendation: string;
}

// ============================================================
// 12운성 점수 매핑
// ============================================================

const TWELVE_STAGE_SCORES: Record<TwelveStage, { score: number; energy: MonthlyTimingScore['stageEnergy']; description: string }> = {
  '장생': { score: 75, energy: 'rising', description: '새로운 시작, 탄생의 에너지' },
  '목욕': { score: 55, energy: 'rising', description: '정화와 불안정, 변화의 시기' },
  '관대': { score: 80, energy: 'rising', description: '자립과 성장, 독립의 시기' },
  '건록': { score: 90, energy: 'peak', description: '활동력 최고조, 추진의 시기' },
  '제왕': { score: 95, energy: 'peak', description: '최고 정점, 성취의 시기' },
  '쇠': { score: 60, energy: 'declining', description: '성숙과 안정, 수확의 시기' },
  '병': { score: 45, energy: 'declining', description: '휴식 필요, 재충전의 시기' },
  '사': { score: 35, energy: 'declining', description: '정리와 마무리, 해방의 시기' },
  '묘': { score: 25, energy: 'dormant', description: '잠복과 저장, 보존의 시기' },
  '절': { score: 40, energy: 'dormant', description: '전환점, 새 시작 준비의 시기' },
  '태': { score: 50, energy: 'rising', description: '잉태와 구상, 계획의 시기' },
  '양': { score: 65, energy: 'rising', description: '양육과 성장 준비, 준비의 시기' },
};

// ============================================================
// 오행 상생상극 점수
// ============================================================

const ELEMENT_INTERACTIONS: Record<FiveElement, Record<FiveElement, number>> = {
  '목': { '목': 50, '화': 70, '토': 30, '금': 20, '수': 80 },  // 목 기준
  '화': { '목': 80, '화': 50, '토': 70, '금': 30, '수': 20 },  // 화 기준
  '토': { '목': 20, '화': 80, '토': 50, '금': 70, '수': 30 },  // 토 기준
  '금': { '목': 30, '화': 20, '토': 80, '금': 50, '수': 70 },  // 금 기준
  '수': { '목': 70, '화': 30, '토': 20, '금': 80, '수': 50 },  // 수 기준
};

// 월별 기본 오행 (절기 기준)
const MONTH_ELEMENTS: FiveElement[] = [
  '토', // 1월 (대한-입춘)
  '목', // 2월 (입춘-경칩)
  '목', // 3월 (경칩-청명)
  '토', // 4월 (청명-입하)
  '화', // 5월 (입하-망종)
  '화', // 6월 (망종-소서)
  '토', // 7월 (소서-입추)
  '금', // 8월 (입추-백로)
  '금', // 9월 (백로-한로)
  '토', // 10월 (한로-입동)
  '수', // 11월 (입동-대설)
  '수', // 12월 (대설-소한)
];

// ============================================================
// 역행 영향 계산
// ============================================================

function getRetrogradeEffects(year: number, month: number): RetrogradeEffect[] {
  const effects: RetrogradeEffect[] = [];
  const yearKey = year as 2024 | 2025;
  const schedule = RETROGRADE_SCHEDULE[yearKey];

  if (!schedule) {
    return effects;
  }

  const checkRetrograde = (
    planet: string,
    periods: readonly { readonly start: string; readonly end: string; readonly sign: string }[] | undefined,
    baseScore: number,
    advice: string[]
  ) => {
    if (!periods || periods.length === 0) {
      effects.push({ planet, isRetrograde: false, score: 0, advice: [] });
      return;
    }

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const isRetrograde = periods.some(p => {
      const startMonth = p.start.slice(0, 7);
      const endMonth = p.end.slice(0, 7);
      return monthStr >= startMonth && monthStr <= endMonth;
    });

    effects.push({
      planet,
      isRetrograde,
      score: isRetrograde ? baseScore : 0,
      advice: isRetrograde ? advice : [],
    });
  };

  checkRetrograde('수성', schedule.mercury, -15, [
    '계약/서명 신중히',
    '소통 재확인 필요',
    '과거 프로젝트 마무리',
  ]);

  checkRetrograde('금성', schedule.venus, -10, [
    '새 연애 시작 비추',
    '재정 결정 보류',
    '자기 가치 성찰',
  ]);

  checkRetrograde('화성', schedule.mars, -20, [
    '새 프로젝트 연기',
    '충동적 행동 자제',
    '에너지 회복에 집중',
  ]);

  checkRetrograde('목성', schedule.jupiter, -5, [
    '내적 성장에 집중',
    '과잉 확장 자제',
    '철학적 성찰',
  ]);

  checkRetrograde('토성', schedule.saturn, -10, [
    '구조 재정비',
    '장기 계획 재검토',
    '책임 재평가',
  ]);

  return effects;
}

// ============================================================
// 월별 타이밍 점수 계산
// ============================================================

interface CalculateMonthlyScoreParams {
  year: number;
  month: number;
  dayStem: string;
  dayElement: FiveElement;
  yongsin: FiveElement[];
  kisin: FiveElement[];
  currentDaeunElement?: FiveElement;
  birthYear?: number;
}

export function calculateMonthlyTimingScore(params: CalculateMonthlyScoreParams): MonthlyTimingScore {
  const { year, month, dayElement, yongsin, kisin, currentDaeunElement } = params;

  const monthlyElement = MONTH_ELEMENTS[month - 1];

  // 1. 동양 점수 계산
  let easternScore = 50;

  // 오행 상호작용
  const elementInteraction = ELEMENT_INTERACTIONS[dayElement][monthlyElement];
  easternScore = elementInteraction;

  // 용신/기신 매칭
  if (yongsin.includes(monthlyElement)) {
    easternScore += 20;
  }
  if (kisin.includes(monthlyElement)) {
    easternScore -= 15;
  }

  // 대운 오행과의 조화
  if (currentDaeunElement) {
    const daeunHarmony = ELEMENT_INTERACTIONS[currentDaeunElement][monthlyElement];
    easternScore = Math.round((easternScore * 0.7) + (daeunHarmony * 0.3));
  }

  // 12운성 계산 (간략화 - 실제로는 더 복잡)
  const stageIndex = ((month - 1) + 3) % 12;
  const stages = Object.keys(TWELVE_STAGE_SCORES) as TwelveStage[];
  const twelveStage = stages[stageIndex];
  const stageInfo = TWELVE_STAGE_SCORES[twelveStage];

  easternScore = Math.round((easternScore * 0.6) + (stageInfo.score * 0.4));

  // 2. 서양 점수 계산
  const retrogradeEffects = getRetrogradeEffects(year, month);
  let westernScore = 60;

  for (const effect of retrogradeEffects) {
    westernScore += effect.score;
  }

  // 트랜짓 효과 (간략화)
  const activeTransits: TransitEffect[] = [];

  // 목성 주기 (12년)
  if (params.birthYear) {
    const age = year - params.birthYear;
    if (age > 0 && age % 12 === 0) {
      activeTransits.push({
        type: 'jupiterReturn',
        planet: 'Jupiter',
        aspect: 'conjunction',
        score: 25,
        description: '목성 회귀 - 확장과 행운의 시기',
      });
      westernScore += 25;
    }

    // 토성 주기 (29년)
    if (age > 0 && (age === 29 || age === 58 || age === 87)) {
      activeTransits.push({
        type: 'saturnReturn',
        planet: 'Saturn',
        aspect: 'conjunction',
        score: -10,
        description: '토성 회귀 - 성숙과 구조화의 시기',
      });
      westernScore -= 10;
    }
  }

  westernScore = Math.max(20, Math.min(100, westernScore));

  // 3. 종합 점수 (동서양 50:50)
  const combinedScore = Math.round((easternScore * 0.5) + (westernScore * 0.5));

  // 4. 신뢰도 계산
  const confidence = calculateConfidence(easternScore, westernScore, retrogradeEffects.length);

  // 5. 등급 (통일된 기준 사용)
  const grade = scoreToGrade(combinedScore);

  // 6. 테마 및 조언 생성
  const { themes, opportunities, cautions, advice } = generateThemesAndAdvice(
    monthlyElement,
    twelveStage,
    stageInfo.energy,
    retrogradeEffects,
    grade
  );

  // 7. 좋은 날/피할 날 (간략화)
  const bestDays = findBestDays(month, combinedScore);
  const avoidDays = findAvoidDays(month, retrogradeEffects);

  return {
    year,
    month,
    easternScore,
    monthlyElement,
    twelveStage,
    stageEnergy: stageInfo.energy,
    westernScore,
    activeTransits,
    retrogradeEffects,
    combinedScore,
    confidence,
    grade,
    themes,
    opportunities,
    cautions,
    bestDays,
    avoidDays,
    advice,
  };
}

// ============================================================
// 신뢰도 계산
// ============================================================

function calculateConfidence(easternScore: number, westernScore: number, factorCount: number): number {
  // 동서양 점수 일치도 (차이가 작을수록 높은 신뢰도)
  const scoreDiff = Math.abs(easternScore - westernScore);
  const alignmentScore = Math.max(0, 100 - (scoreDiff * 2));

  // 분석 요소 개수 (많을수록 높은 신뢰도)
  const factorScore = Math.min(100, 50 + (factorCount * 10));

  // 기본 신뢰도
  const baseConfidence = 70;

  return Math.round((baseConfidence * 0.4) + (alignmentScore * 0.4) + (factorScore * 0.2));
}

export function calculateDetailedConfidence(
  monthlyScores: MonthlyTimingScore[],
  hasCompleteData: boolean,
  hasDaeunData: boolean,
  hasTransitData: boolean
): PredictionConfidence {
  const factors: ConfidenceFactor[] = [];
  const limitations: string[] = [];

  // 데이터 품질
  let dataQuality = 50;
  if (hasCompleteData) {
    dataQuality += 20;
    factors.push({ name: '완전한 생년월일시', score: 20, weight: 0.25, reason: '정확한 사주 계산 가능' });
  } else {
    limitations.push('출생 시간 미입력 시 시주 분석 제한');
  }

  if (hasDaeunData) {
    dataQuality += 15;
    factors.push({ name: '대운 데이터 확보', score: 15, weight: 0.2, reason: '장기 운세 흐름 분석 가능' });
  }

  if (hasTransitData) {
    dataQuality += 15;
    factors.push({ name: '트랜짓 데이터 확보', score: 15, weight: 0.2, reason: '현재 행성 영향 분석 가능' });
  }

  // 방법론 일치도
  const alignments = monthlyScores.map(m => {
    const diff = Math.abs(m.easternScore - m.westernScore);
    return Math.max(0, 100 - (diff * 2));
  });
  const methodAlignment = alignments.length > 0
    ? Math.round(alignments.reduce((a, b) => a + b, 0) / alignments.length)
    : 50;

  factors.push({
    name: '동서양 분석 일치도',
    score: methodAlignment,
    weight: 0.35,
    reason: methodAlignment > 70 ? '높은 일관성' : '일부 불일치 존재',
  });

  // 주기 동기화
  const cycleSynchrony = 65; // 기본값 (실제로는 대운/세운/트랜짓 동기화 분석 필요)

  // 역사적 정확도 (현재는 기본값)
  const historicalAccuracy = 60;

  // 종합 신뢰도
  const overall = Math.round(
    (dataQuality * 0.3) +
    (methodAlignment * 0.35) +
    (cycleSynchrony * 0.2) +
    (historicalAccuracy * 0.15)
  );

  return {
    overall,
    dataQuality,
    methodAlignment,
    cycleSynchrony,
    historicalAccuracy,
    factors,
    limitations,
  };
}

// ============================================================
// 테마 및 조언 생성
// ============================================================

function generateThemesAndAdvice(
  element: FiveElement,
  stage: TwelveStage,
  energy: MonthlyTimingScore['stageEnergy'],
  retrogrades: RetrogradeEffect[],
  grade: MonthlyTimingScore['grade']
): {
  themes: string[];
  opportunities: string[];
  cautions: string[];
  advice: string;
} {
  const themes: string[] = [];
  const opportunities: string[] = [];
  const cautions: string[] = [];

  // 오행별 테마
  const elementThemes: Record<FiveElement, { theme: string; opp: string; caution: string }> = {
    '목': { theme: '성장과 시작', opp: '새로운 프로젝트, 학습', caution: '과욕 주의' },
    '화': { theme: '열정과 표현', opp: '창의적 활동, 발표', caution: '충동적 결정 주의' },
    '토': { theme: '안정과 조화', opp: '인간관계 개선, 중재', caution: '우유부단 주의' },
    '금': { theme: '결단과 정리', opp: '마무리 작업, 재정 정리', caution: '지나친 비판 주의' },
    '수': { theme: '지혜와 성찰', opp: '연구, 명상, 계획', caution: '우울감 주의' },
  };

  const et = elementThemes[element];
  themes.push(et.theme);
  opportunities.push(et.opp);
  cautions.push(et.caution);

  // 12운성별 테마
  if (energy === 'peak') {
    themes.push('최고조 활동기');
    opportunities.push('중요한 결정과 실행');
  } else if (energy === 'rising') {
    themes.push('상승 에너지');
    opportunities.push('새로운 시도');
  } else if (energy === 'declining') {
    themes.push('정리와 수확');
    cautions.push('무리한 확장 자제');
  } else {
    themes.push('준비와 성찰');
    cautions.push('큰 결정 보류');
  }

  // 역행 영향
  for (const retro of retrogrades) {
    if (retro.isRetrograde) {
      themes.push(`${retro.planet} 역행`);
      cautions.push(...retro.advice);
    }
  }

  // 종합 조언
  let advice: string;
  if (grade === 'S' || grade === 'A') {
    advice = '적극적인 행동과 새로운 도전이 좋은 결과를 가져올 시기입니다.';
  } else if (grade === 'B' || grade === 'C') {
    advice = '안정적인 흐름을 유지하며 기회를 기다리는 것이 좋습니다.';
  } else {
    advice = '내실을 다지고 건강 관리에 집중하세요. 큰 결정은 보류가 좋습니다.';
  }

  return { themes, opportunities, cautions, advice };
}

// ============================================================
// 좋은 날/피할 날 찾기
// ============================================================

function findBestDays(month: number, baseScore: number): number[] {
  const days: number[] = [];
  // 현재 연도 기준으로 월의 일수 계산 (하드코딩된 2024 제거)
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(currentYear, month, 0).getDate();

  // 간략화된 로직: 점수가 높을수록 좋은 날이 많음
  const goodDayCount = baseScore >= 70 ? 6 : baseScore >= 50 ? 4 : 2;

  // 1, 8, 15, 22 (매주 시작) + 월 특성에 따른 날
  const baseDays = [1, 8, 15, 22];
  for (let i = 0; i < goodDayCount && i < baseDays.length; i++) {
    if (baseDays[i] <= daysInMonth) {
      days.push(baseDays[i]);
    }
  }

  return days;
}

function findAvoidDays(month: number, retrogrades: RetrogradeEffect[]): number[] {
  const days: number[] = [];

  // 역행 시작/종료 시점 (간략화)
  const hasRetrograde = retrogrades.some(r => r.isRetrograde);

  if (hasRetrograde) {
    // 역행 중에는 월초/월말 주의
    days.push(1, 2, 3);
    // 현재 연도 기준으로 월의 일수 계산 (하드코딩된 2024 제거)
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, month, 0).getDate();
    days.push(daysInMonth - 2, daysInMonth - 1, daysInMonth);
  }

  return [...new Set(days)].sort((a, b) => a - b);
}

// ============================================================
// 연간 예측 생성
// ============================================================

interface GenerateYearlyPredictionParams {
  year: number;
  dayStem: string;
  dayElement: FiveElement;
  yongsin: FiveElement[];
  kisin: FiveElement[];
  currentDaeunElement?: FiveElement;
  birthYear?: number;
}

export function generateYearlyPrediction(params: GenerateYearlyPredictionParams): YearlyPrediction {
  const monthlyScores: MonthlyTimingScore[] = [];

  // 12개월 점수 계산
  for (let month = 1; month <= 12; month++) {
    const score = calculateMonthlyTimingScore({
      ...params,
      month,
    });
    monthlyScores.push(score);
  }

  // 신뢰도 계산
  const confidence = calculateDetailedConfidence(
    monthlyScores,
    !!params.birthYear,
    !!params.currentDaeunElement,
    true
  );

  // 최고/최저 월
  const sorted = [...monthlyScores].sort((a, b) => b.combinedScore - a.combinedScore);
  const bestMonths = sorted.slice(0, 3).map(m => m.month);
  const challengingMonths = sorted.slice(-3).map(m => m.month);

  // 분기별 분석
  const quarters: QuarterAnalysis[] = [];
  for (let q = 1; q <= 4; q++) {
    const startMonth = (q - 1) * 3 + 1;
    const quarterMonths = monthlyScores.slice(startMonth - 1, startMonth + 2);
    const avgScore = quarterMonths.reduce((sum, m) => sum + m.combinedScore, 0) / 3;

    const scores = quarterMonths.map(m => m.combinedScore);
    const trend = determineTrend(scores);

    quarters.push({
      quarter: q as 1 | 2 | 3 | 4,
      averageScore: Math.round(avgScore),
      trend,
      keyEvents: quarterMonths.flatMap(m => m.themes.slice(0, 1)),
      recommendation: avgScore >= 60
        ? '적극적인 활동 권장'
        : avgScore >= 40
        ? '신중한 접근 권장'
        : '휴식과 재충전 권장',
    });
  }

  // 연간 오행
  const yearBranchIdx = (params.year - 4) % 12;
  const annualElements: FiveElement[] = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
  const annualElement = annualElements[yearBranchIdx];

  // 연간 테마
  const avgScore = monthlyScores.reduce((sum, m) => sum + m.combinedScore, 0) / 12;
  const yearTheme = avgScore >= 65
    ? '성장과 발전의 해'
    : avgScore >= 50
    ? '안정과 유지의 해'
    : '재정비와 성찰의 해';

  return {
    year: params.year,
    monthlyScores,
    confidence,
    bestMonths,
    challengingMonths,
    yearTheme,
    daeunPhase: params.currentDaeunElement ? `${params.currentDaeunElement} 대운` : '대운 정보 없음',
    annualElement,
    annualTransits: ['세운 영향'],
    quarters,
  };
}

function determineTrend(scores: number[]): QuarterAnalysis['trend'] {
  if (scores.length < 2) {return 'stable';}

  const diff = scores[scores.length - 1] - scores[0];
  const volatility = Math.max(...scores) - Math.min(...scores);

  if (volatility > 20) {return 'volatile';}
  if (diff > 10) {return 'ascending';}
  if (diff < -10) {return 'descending';}
  return 'stable';
}

// ============================================================
// 예측 텍스트 생성 (AI 프롬프트용)
// ============================================================

export function generatePredictionPromptContext(yearly: YearlyPrediction, lang: 'ko' | 'en' = 'ko'): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push(`=== ${yearly.year}년 월별 타이밍 스코어 매트릭스 ===`);
    lines.push(`연간 테마: ${yearly.yearTheme}`);
    lines.push(`연간 오행: ${yearly.annualElement}`);
    lines.push(`대운 단계: ${yearly.daeunPhase}`);
    lines.push(`신뢰도: ${yearly.confidence.overall}%`);
    lines.push('');
    lines.push('--- 월별 상세 ---');

    for (const m of yearly.monthlyScores) {
      lines.push(
        `${m.month}월: ${m.grade}등급 (${m.combinedScore}점) | ` +
        `${m.monthlyElement}기운 | ${m.twelveStage}(${m.stageEnergy}) | ` +
        `신뢰도 ${m.confidence}%`
      );
      lines.push(`  - 테마: ${m.themes.join(', ')}`);
      lines.push(`  - 기회: ${m.opportunities.join(', ')}`);
      lines.push(`  - 주의: ${m.cautions.join(', ')}`);
      lines.push(`  - 조언: ${m.advice}`);
    }

    lines.push('');
    lines.push('--- 분기별 흐름 ---');
    for (const q of yearly.quarters) {
      lines.push(`Q${q.quarter}: 평균 ${q.averageScore}점, ${q.trend} - ${q.recommendation}`);
    }

    lines.push('');
    lines.push(`최고의 달: ${yearly.bestMonths.join(', ')}월`);
    lines.push(`도전의 달: ${yearly.challengingMonths.join(', ')}월`);
  } else {
    lines.push(`=== ${yearly.year} Monthly Timing Score Matrix ===`);
    lines.push(`Year Theme: ${yearly.yearTheme}`);
    lines.push(`Annual Element: ${yearly.annualElement}`);
    lines.push(`Daeun Phase: ${yearly.daeunPhase}`);
    lines.push(`Confidence: ${yearly.confidence.overall}%`);
    lines.push('');

    for (const m of yearly.monthlyScores) {
      lines.push(
        `Month ${m.month}: Grade ${m.grade} (${m.combinedScore}) | ` +
        `${m.twelveStage} (${m.stageEnergy}) | Confidence ${m.confidence}%`
      );
    }
  }

  return lines.join('\n');
}
