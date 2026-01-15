// src/lib/Saju/strengthScore.ts
// 사주 강약 종합 점수화 시스템 (200% 급 모듈)

import { FiveElement, SajuPillars, PillarData, SibsinKind } from './types';
import { JIJANGGAN, FIVE_ELEMENT_RELATIONS } from './constants';
import { getStemElement, getBranchElement, getStemYinYang } from './stemBranchUtils';

// ============================================================
// 타입 정의
// ============================================================

/** 개별 점수 항목 */
export interface ScoreItem {
  category: string;        // 점수 카테고리
  name: string;            // 항목 이름
  score: number;           // 점수 (-100 ~ +100)
  weight: number;          // 가중치 (0.0 ~ 1.0)
  description: string;     // 설명
}

/** 오행별 점수 */
export interface ElementScore {
  element: FiveElement;
  raw: number;             // 원시 점수
  weighted: number;        // 가중 점수
  ratio: number;           // 비율 (0.0 ~ 1.0)
}

/** 신강/신약 점수 */
export interface StrengthScore {
  total: number;           // 종합 점수 (0 ~ 100)
  level: '극강' | '강' | '중강' | '중약' | '약' | '극약';
  supportScore: number;    // 도움받는 점수 (비겁, 인성)
  resistScore: number;     // 설기되는 점수 (식상, 재성, 관성)
  balance: number;         // 균형도 (-50 ~ +50)
  items: ScoreItem[];      // 세부 항목
}

/** 격국 점수 */
export interface GeokgukScore {
  type: string;            // 격국 유형
  purity: number;          // 순수도 (0 ~ 100)
  stability: number;       // 안정도 (0 ~ 100)
  items: ScoreItem[];
}

/** 용신 적합도 */
export interface YongsinFitScore {
  yongsin: FiveElement;
  fitScore: number;        // 적합도 (0 ~ 100)
  presenceScore: number;   // 존재감 (0 ~ 100)
  effectiveScore: number;  // 유효도 (0 ~ 100)
  items: ScoreItem[];
}

/** 운세 조화도 */
export interface UnseHarmonyScore {
  period: string;          // 운세 기간 (대운/세운/월운)
  harmonyScore: number;    // 조화도 (0 ~ 100)
  conflictScore: number;   // 충돌도 (0 ~ 100)
  netScore: number;        // 순점수
  items: ScoreItem[];
}

/** 종합 점수 */
export interface ComprehensiveScore {
  overall: number;         // 종합 점수 (0 ~ 100)
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  elements: ElementScore[];
  strength: StrengthScore;
  geokguk: GeokgukScore;
  yongsin: YongsinFitScore;
  unse?: UnseHarmonyScore;
  summary: string;
  strengths: string[];     // 강점
  weaknesses: string[];    // 약점
  recommendations: string[];
}

// ============================================================
// 점수 상수
// ============================================================

/** 위치별 가중치 */
const POSITION_WEIGHTS = {
  year: 0.15,    // 년주
  month: 0.30,   // 월주 (가장 중요)
  day: 0.35,     // 일주 (일간 기준)
  time: 0.20,    // 시주
};

/** 천간/지지 가중치 */
const STEM_BRANCH_WEIGHTS = {
  stem: 0.4,     // 천간
  branch: 0.6,   // 지지 (지장간 포함)
};

/** 지장간 가중치 */
const JIJANGGAN_WEIGHTS = {
  '정기': 0.6,
  '중기': 0.25,
  '여기': 0.15,
};

/** 십성 카테고리별 가중치 */
const SIBSIN_CATEGORY_WEIGHTS: Record<string, number> = {
  '비겁': 1.0,    // 비견, 겁재
  '인성': 0.8,    // 편인, 정인
  '식상': 0.6,    // 식신, 상관
  '재성': 0.7,    // 편재, 정재
  '관성': 0.9,    // 편관, 정관
};

// ============================================================
// 오행 점수 계산
// ============================================================

/**
 * 사주 팔자의 오행 점수 계산
 */
export function calculateElementScores(pillars: SajuPillars): ElementScore[] {
  const rawScores: Record<FiveElement, number> = {
    '목': 0, '화': 0, '토': 0, '금': 0, '수': 0
  };

  const pillarEntries: Array<{ key: 'year' | 'month' | 'day' | 'time'; data: PillarData }> = [
    { key: 'year', data: pillars.year },
    { key: 'month', data: pillars.month },
    { key: 'day', data: pillars.day },
    { key: 'time', data: pillars.time },
  ];

  for (const { key, data } of pillarEntries) {
    const weight = POSITION_WEIGHTS[key];

    // 천간 점수
    const stemElement = getStemElement(data.heavenlyStem.name);
    rawScores[stemElement] += weight * STEM_BRANCH_WEIGHTS.stem * 10;

    // 지지 본기 점수
    const branchElement = getBranchElement(data.earthlyBranch.name);
    rawScores[branchElement] += weight * STEM_BRANCH_WEIGHTS.branch * 0.4 * 10;

    // 지장간 점수
    const branchName = data.earthlyBranch.name;
    const jijanggan = JIJANGGAN[branchName];
    if (jijanggan) {
      for (const [qi, stem] of Object.entries(jijanggan)) {
        const qiWeight = JIJANGGAN_WEIGHTS[qi as keyof typeof JIJANGGAN_WEIGHTS] || 0.2;
        const element = getStemElement(stem);
        rawScores[element] += weight * STEM_BRANCH_WEIGHTS.branch * 0.6 * qiWeight * 10;
      }
    }
  }

  // 총합 계산
  const total = Object.values(rawScores).reduce((sum, v) => sum + v, 0);

  return (['목', '화', '토', '금', '수'] as FiveElement[]).map(element => ({
    element,
    raw: rawScores[element],
    weighted: rawScores[element],
    ratio: total > 0 ? rawScores[element] / total : 0.2,
  }));
}

// ============================================================
// 신강/신약 점수 계산
// ============================================================

/**
 * 신강/신약 점수 계산
 */
export function calculateStrengthScore(
  pillars: SajuPillars,
  monthBranch?: string
): StrengthScore {
  const dayMaster = pillars.day.heavenlyStem.name;
  const dayElement = getStemElement(dayMaster);
  const dayYinYang = getStemYinYang(dayMaster);

  const items: ScoreItem[] = [];
  let supportScore = 0;
  let resistScore = 0;

  // 1. 득령(월지 계절) 점수 - 30점 만점
  const actualMonthBranch = monthBranch || pillars.month.earthlyBranch.name;
  const monthElement = getBranchElement(actualMonthBranch);
  const deukryeongScore = calculateDeukryeongScore(dayElement, monthElement);
  items.push({
    category: '득령',
    name: `${actualMonthBranch}월 ${monthElement}`,
    score: deukryeongScore,
    weight: 0.3,
    description: deukryeongScore >= 20 ? '득령' : deukryeongScore >= 10 ? '평령' : '실령',
  });
  supportScore += deukryeongScore;

  // 2. 통근(지지 근) 점수 - 25점 만점
  const tonggeunScore = calculateTonggeunScore(pillars, dayElement);
  items.push({
    category: '통근',
    name: '지지 뿌리',
    score: tonggeunScore,
    weight: 0.25,
    description: tonggeunScore >= 15 ? '강한 뿌리' : tonggeunScore >= 8 ? '보통 뿌리' : '약한 뿌리',
  });
  supportScore += tonggeunScore;

  // 3. 인성 지원 점수 - 20점 만점
  const inseongElement = FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement];
  const inseongScore = calculateElementPresenceScore(pillars, inseongElement, 20);
  items.push({
    category: '인성',
    name: `${inseongElement} 지원`,
    score: inseongScore,
    weight: 0.2,
    description: `인성(${inseongElement})의 도움`,
  });
  supportScore += inseongScore;

  // 4. 비겁 지원 점수 - 15점 만점
  const bigyeobScore = calculateElementPresenceScore(pillars, dayElement, 15);
  items.push({
    category: '비겁',
    name: '비겁 지원',
    score: bigyeobScore,
    weight: 0.15,
    description: '동일 오행의 도움',
  });
  supportScore += bigyeobScore;

  // 5. 설기 (식상) 점수 - 음수
  const siksangElement = FIVE_ELEMENT_RELATIONS['생하는관계'][dayElement];
  const siksangScore = calculateElementPresenceScore(pillars, siksangElement, 15);
  items.push({
    category: '식상',
    name: `${siksangElement} 설기`,
    score: -siksangScore,
    weight: 0.15,
    description: '기운 소모',
  });
  resistScore += siksangScore;

  // 6. 재성 점수 - 음수
  const jaeseongElement = FIVE_ELEMENT_RELATIONS['극하는관계'][dayElement];
  const jaeseongScore = calculateElementPresenceScore(pillars, jaeseongElement, 15);
  items.push({
    category: '재성',
    name: `${jaeseongElement} 극`,
    score: -jaeseongScore,
    weight: 0.15,
    description: '재성 소모',
  });
  resistScore += jaeseongScore;

  // 7. 관성 점수 - 음수
  const gwanseongElement = FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement];
  const gwanseongScore = calculateElementPresenceScore(pillars, gwanseongElement, 20);
  items.push({
    category: '관성',
    name: `${gwanseongElement} 극`,
    score: -gwanseongScore,
    weight: 0.2,
    description: '관성의 억압',
  });
  resistScore += gwanseongScore;

  // 종합 점수 계산
  const balance = supportScore - resistScore;
  const total = Math.max(0, Math.min(100, 50 + balance));

  // 레벨 결정
  let level: StrengthScore['level'];
  if (total >= 85) level = '극강';
  else if (total >= 70) level = '강';
  else if (total >= 55) level = '중강';
  else if (total >= 40) level = '중약';
  else if (total >= 25) level = '약';
  else level = '극약';

  return {
    total,
    level,
    supportScore,
    resistScore,
    balance,
    items,
  };
}

function calculateDeukryeongScore(dayElement: FiveElement, monthElement: FiveElement): number {
  if (dayElement === monthElement) return 30; // 왕지
  if (FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement] === monthElement) return 25; // 상생
  if (FIVE_ELEMENT_RELATIONS['생하는관계'][dayElement] === monthElement) return 10; // 설기
  if (FIVE_ELEMENT_RELATIONS['극하는관계'][dayElement] === monthElement) return 5; // 극출
  if (FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement] === monthElement) return 0; // 극입
  return 15; // 중립
}

function calculateTonggeunScore(pillars: SajuPillars, dayElement: FiveElement): number {
  let score = 0;
  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ];

  for (const branch of branches) {
    const jijanggan = JIJANGGAN[branch];
    if (!jijanggan) continue;

    for (const [qi, stem] of Object.entries(jijanggan)) {
      if (getStemElement(stem) === dayElement) {
        const qiWeight = qi === '정기' ? 8 : qi === '중기' ? 5 : 3;
        score += qiWeight;
      }
    }
  }

  return Math.min(25, score);
}

function calculateElementPresenceScore(
  pillars: SajuPillars,
  element: FiveElement,
  maxScore: number
): number {
  let score = 0;

  // 천간 체크
  const stems = [
    pillars.year.heavenlyStem.name,
    pillars.month.heavenlyStem.name,
    pillars.day.heavenlyStem.name,
    pillars.time.heavenlyStem.name,
  ];

  for (const stem of stems) {
    if (getStemElement(stem) === element) score += 3;
  }

  // 지지 체크
  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ];

  for (const branch of branches) {
    if (getBranchElement(branch) === element) score += 2;

    const jijanggan = JIJANGGAN[branch];
    if (jijanggan) {
      for (const stem of Object.values(jijanggan)) {
        if (getStemElement(stem) === element) score += 1;
      }
    }
  }

  return Math.min(maxScore, score);
}

// ============================================================
// 격국 점수 계산
// ============================================================

/**
 * 격국 순수도 및 안정도 점수 계산
 */
export function calculateGeokgukScore(
  pillars: SajuPillars,
  geokgukType: string
): GeokgukScore {
  const items: ScoreItem[] = [];
  let purity = 50;
  let stability = 50;

  const dayMaster = pillars.day.heavenlyStem.name;
  const monthBranch = pillars.month.earthlyBranch.name;
  const jijanggan = JIJANGGAN[monthBranch];

  // 월지 정기 투출 여부
  if (jijanggan?.['정기']) {
    const jeonggi = jijanggan['정기'];
    const stems = [
      pillars.year.heavenlyStem.name,
      pillars.month.heavenlyStem.name,
      pillars.time.heavenlyStem.name,
    ];

    if (stems.includes(jeonggi)) {
      purity += 20;
      items.push({
        category: '투출',
        name: '월지 정기 투출',
        score: 20,
        weight: 0.3,
        description: `${jeonggi}이 천간에 투출`,
      });
    }
  }

  // 격국 파괴 요소 체크
  const hasChung = checkChungPresence(pillars);
  if (hasChung) {
    purity -= 15;
    stability -= 20;
    items.push({
      category: '충',
      name: '충 존재',
      score: -15,
      weight: 0.2,
      description: '충으로 인한 불안정',
    });
  }

  // 격국 보호 요소
  const hasHap = checkHapPresence(pillars);
  if (hasHap) {
    stability += 15;
    items.push({
      category: '합',
      name: '합 존재',
      score: 15,
      weight: 0.2,
      description: '합으로 인한 안정',
    });
  }

  return {
    type: geokgukType,
    purity: Math.max(0, Math.min(100, purity)),
    stability: Math.max(0, Math.min(100, stability)),
    items,
  };
}

function checkChungPresence(pillars: SajuPillars): boolean {
  const CHUNG_PAIRS: [string, string][] = [
    ['子', '午'], ['丑', '未'], ['寅', '申'],
    ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
  ];

  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ];

  for (const [a, b] of CHUNG_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) return true;
  }
  return false;
}

function checkHapPresence(pillars: SajuPillars): boolean {
  const YUKHAP_PAIRS: [string, string][] = [
    ['子', '丑'], ['寅', '亥'], ['卯', '戌'],
    ['辰', '酉'], ['巳', '申'], ['午', '未'],
  ];

  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ];

  for (const [a, b] of YUKHAP_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) return true;
  }
  return false;
}

// ============================================================
// 용신 적합도 점수 계산
// ============================================================

/**
 * 용신 적합도 점수 계산
 */
export function calculateYongsinFitScore(
  pillars: SajuPillars,
  yongsin: FiveElement,
  strengthLevel: string
): YongsinFitScore {
  const items: ScoreItem[] = [];

  // 용신 존재감 점수
  const presenceScore = calculateElementPresenceScore(pillars, yongsin, 50) * 2;
  items.push({
    category: '존재감',
    name: `${yongsin} 현존`,
    score: presenceScore,
    weight: 0.4,
    description: '사주 내 용신 오행의 존재',
  });

  // 용신 유효도 (통근, 투출 여부)
  let effectiveScore = 30; // 기본 점수

  // 용신이 천간에 투출되었는지 확인
  const stems = [
    pillars.year.heavenlyStem.name,
    pillars.month.heavenlyStem.name,
    pillars.time.heavenlyStem.name,
  ];

  for (const stem of stems) {
    if (getStemElement(stem) === yongsin) {
      effectiveScore += 20;
      items.push({
        category: '투출',
        name: '용신 투출',
        score: 20,
        weight: 0.3,
        description: '용신이 천간에 드러남',
      });
      break;
    }
  }

  // 적합도 종합
  const fitScore = Math.round((presenceScore + effectiveScore) / 2);

  return {
    yongsin,
    fitScore: Math.min(100, fitScore),
    presenceScore: Math.min(100, presenceScore),
    effectiveScore: Math.min(100, effectiveScore),
    items,
  };
}

// ============================================================
// 종합 점수 계산
// ============================================================

/**
 * 사주 종합 점수 계산
 */
export function calculateComprehensiveScore(
  pillars: SajuPillars,
  options?: {
    geokgukType?: string;
    yongsin?: FiveElement;
    unseInfo?: { period: string; stem: string; branch: string };
  }
): ComprehensiveScore {
  // 오행 점수
  const elements = calculateElementScores(pillars);

  // 신강/신약 점수
  const strength = calculateStrengthScore(pillars);

  // 격국 점수
  const geokguk = calculateGeokgukScore(pillars, options?.geokgukType || '미정');

  // 용신 적합도
  const yongsin = calculateYongsinFitScore(
    pillars,
    options?.yongsin || '수',
    strength.level
  );

  // 운세 조화도 (선택)
  let unse: UnseHarmonyScore | undefined;
  if (options?.unseInfo) {
    unse = calculateUnseHarmonyScore(pillars, options.unseInfo);
  }

  // 종합 점수 계산 (가중 평균)
  const overall = Math.round(
    strength.total * 0.35 +
    geokguk.purity * 0.2 +
    geokguk.stability * 0.15 +
    yongsin.fitScore * 0.3
  );

  // 등급 결정
  let grade: ComprehensiveScore['grade'];
  if (overall >= 90) grade = 'S';
  else if (overall >= 80) grade = 'A';
  else if (overall >= 70) grade = 'B';
  else if (overall >= 60) grade = 'C';
  else if (overall >= 50) grade = 'D';
  else grade = 'F';

  // 강점/약점 분석
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (strength.total >= 60) {
    strengths.push('일간이 강하여 어려움을 극복할 힘이 있습니다');
  } else if (strength.total <= 40) {
    weaknesses.push('일간이 약하여 외부의 도움이 필요합니다');
    recommendations.push(`인성(${FIVE_ELEMENT_RELATIONS['생받는관계'][getStemElement(pillars.day.heavenlyStem.name)]}) 오행을 보강하세요`);
  }

  if (geokguk.purity >= 70) {
    strengths.push('격국이 순수하여 능력 발휘가 원활합니다');
  }

  if (yongsin.presenceScore >= 50) {
    strengths.push('용신이 사주에 잘 자리잡고 있습니다');
  } else {
    weaknesses.push('용신의 힘이 부족합니다');
    recommendations.push(`${yongsin.yongsin} 오행과 관련된 방향/색상을 활용하세요`);
  }

  // 오행 균형 분석
  const maxRatio = Math.max(...elements.map(e => e.ratio));
  const minRatio = Math.min(...elements.map(e => e.ratio));

  if (maxRatio - minRatio > 0.4) {
    const dominant = elements.find(e => e.ratio === maxRatio);
    const lacking = elements.find(e => e.ratio === minRatio);
    weaknesses.push(`${dominant?.element} 과다, ${lacking?.element} 부족으로 오행 불균형`);
    recommendations.push(`${lacking?.element} 오행을 보강하는 것이 좋습니다`);
  } else {
    strengths.push('오행이 비교적 균형 잡혀 있습니다');
  }

  const summary = generateScoreSummary(overall, grade, strength.level);

  return {
    overall,
    grade,
    elements,
    strength,
    geokguk,
    yongsin,
    unse,
    summary,
    strengths,
    weaknesses,
    recommendations,
  };
}

function calculateUnseHarmonyScore(
  pillars: SajuPillars,
  unseInfo: { period: string; stem: string; branch: string }
): UnseHarmonyScore {
  const items: ScoreItem[] = [];
  const dayElement = getStemElement(pillars.day.heavenlyStem.name);
  const unseStemElement = getStemElement(unseInfo.stem);
  const unseBranchElement = getBranchElement(unseInfo.branch);

  let harmonyScore = 50;
  let conflictScore = 0;

  // 운세 천간과 일간의 관계
  if (unseStemElement === dayElement) {
    harmonyScore += 15;
    items.push({ category: '천간', name: '비겁 관계', score: 15, weight: 0.2, description: '동일 오행' });
  } else if (FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement] === unseStemElement) {
    harmonyScore += 20;
    items.push({ category: '천간', name: '인성 관계', score: 20, weight: 0.2, description: '생조 받음' });
  } else if (FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement] === unseStemElement) {
    conflictScore += 20;
    items.push({ category: '천간', name: '관성 관계', score: -20, weight: 0.2, description: '극을 받음' });
  }

  // 운세 지지 충 여부
  const dayBranch = pillars.day.earthlyBranch.name;
  if (isChungPair(dayBranch, unseInfo.branch)) {
    conflictScore += 25;
    items.push({ category: '지지', name: '일지 충', score: -25, weight: 0.3, description: '충으로 불안정' });
  }

  const netScore = harmonyScore - conflictScore;

  return {
    period: unseInfo.period,
    harmonyScore: Math.min(100, harmonyScore),
    conflictScore: Math.min(100, conflictScore),
    netScore,
    items,
  };
}

function isChungPair(a: string, b: string): boolean {
  const CHUNG_MAP: Record<string, string> = {
    '子': '午', '午': '子',
    '丑': '未', '未': '丑',
    '寅': '申', '申': '寅',
    '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰',
    '巳': '亥', '亥': '巳',
  };
  return CHUNG_MAP[a] === b;
}

function generateScoreSummary(
  overall: number,
  grade: string,
  strengthLevel: string
): string {
  const gradeDesc: Record<string, string> = {
    'S': '매우 우수한 사주 구성입니다',
    'A': '좋은 사주 구성입니다',
    'B': '양호한 사주 구성입니다',
    'C': '평균적인 사주 구성입니다',
    'D': '다소 아쉬운 부분이 있습니다',
    'F': '보완이 필요한 부분이 많습니다',
  };

  return `종합 ${overall}점(${grade}등급) - ${gradeDesc[grade]}. 일간은 ${strengthLevel} 상태입니다.`;
}
