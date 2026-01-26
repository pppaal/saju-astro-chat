// src/lib/prediction/advancedTimingEngine.ts
// 고급 타이밍 엔진 - 정밀 12운성 + 다층 운세 중첩 분석

import type { FiveElement, YinYang } from '@/lib/Saju/types';
import { scoreToGrade, type PredictionGrade } from './index';

// ============================================================
// 타입 정의 (re-export from central types)
// ============================================================

export type { FiveElement, YinYang };

// 이 모듈에서 사용하는 12운성 (건록/제왕 명칭 사용)
// 표준 types.ts와 구분하기 위해 Local 버전 사용
type TwelveStageLocal =
  | '장생' | '목욕' | '관대' | '건록' | '제왕'
  | '쇠' | '병' | '사' | '묘' | '절' | '태' | '양';

// 외부로 내보내는 타입은 Local 버전 사용
export type { TwelveStageLocal as TwelveStage };

export interface StemInfo {
  name: string;
  element: FiveElement;
  yinYang: YinYang;
}

export interface BranchInfo {
  name: string;
  element: FiveElement;
  yinYang: YinYang;
  hiddenStems: string[]; // 지장간
}

export interface PillarInfo {
  stem: string;
  branch: string;
}

export interface LayeredTimingScore {
  year: number;
  month: number;

  // 다층 분석
  daeunLayer: LayerAnalysis;      // 대운 레이어 (10년)
  saeunLayer: LayerAnalysis;      // 세운 레이어 (1년)
  wolunLayer: LayerAnalysis;      // 월운 레이어 (1달)

  // 레이어 상호작용
  layerInteractions: LayerInteraction[];

  // 지지 상호작용 (합/충/형/해/파)
  branchInteractions: BranchInteraction[];

  // 정밀 12운성
  preciseStage: PreciseTwelveStage;

  // 종합 점수
  rawScore: number;               // 가중치 적용 전 (0-100)
  weightedScore: number;          // 가중치 적용 후 (0-100)
  confidence: number;             // 신뢰도 (0-100)
  grade: PredictionGrade;

  // 해석
  dominantEnergy: FiveElement;
  energyBalance: Record<FiveElement, number>;
  themes: string[];
  opportunities: string[];
  cautions: string[];
  timing: TimingAdvice;
}

export interface LayerAnalysis {
  stem: string;
  branch: string;
  element: FiveElement;
  sibsin: string;                 // 십신
  twelveStage: TwelveStageLocal;
  stageEnergy: 'rising' | 'peak' | 'declining' | 'dormant';
  score: number;                  // 0-100
  weight: number;                 // 가중치 (대운 0.5, 세운 0.3, 월운 0.2)
}

export interface LayerInteraction {
  layers: string[];               // ['대운', '세운'] 등
  type: 'synergy' | 'conflict' | 'neutral';
  description: string;
  scoreModifier: number;
}

export interface BranchInteraction {
  branches: string[];
  type: '육합' | '삼합' | '방합' | '충' | '형' | '해' | '파' | '원진';
  result?: FiveElement;           // 합의 경우 결과 오행
  impact: 'positive' | 'negative' | 'transformative';
  score: number;
  description: string;
}

export interface PreciseTwelveStage {
  stage: TwelveStageLocal;
  description: string;
  energy: 'rising' | 'peak' | 'declining' | 'dormant';
  score: number;
  lifePhase: string;              // 인생 단계 해석
  advice: string;
}

export interface TimingAdvice {
  bestActions: string[];
  avoidActions: string[];
  focusAreas: string[];
  luckyDays: number[];            // 해당 월 내 길일
  cautionDays: number[];          // 해당 월 내 주의일
}

// ============================================================
// 천간 데이터
// ============================================================

const STEMS: Record<string, StemInfo> = {
  '甲': { name: '甲', element: '목', yinYang: '양' },
  '乙': { name: '乙', element: '목', yinYang: '음' },
  '丙': { name: '丙', element: '화', yinYang: '양' },
  '丁': { name: '丁', element: '화', yinYang: '음' },
  '戊': { name: '戊', element: '토', yinYang: '양' },
  '己': { name: '己', element: '토', yinYang: '음' },
  '庚': { name: '庚', element: '금', yinYang: '양' },
  '辛': { name: '辛', element: '금', yinYang: '음' },
  '壬': { name: '壬', element: '수', yinYang: '양' },
  '癸': { name: '癸', element: '수', yinYang: '음' },
};

// ============================================================
// 지지 데이터
// ============================================================

const BRANCHES: Record<string, BranchInfo> = {
  '子': { name: '子', element: '수', yinYang: '양', hiddenStems: ['癸'] },
  '丑': { name: '丑', element: '토', yinYang: '음', hiddenStems: ['己', '癸', '辛'] },
  '寅': { name: '寅', element: '목', yinYang: '양', hiddenStems: ['甲', '丙', '戊'] },
  '卯': { name: '卯', element: '목', yinYang: '음', hiddenStems: ['乙'] },
  '辰': { name: '辰', element: '토', yinYang: '양', hiddenStems: ['戊', '乙', '癸'] },
  '巳': { name: '巳', element: '화', yinYang: '음', hiddenStems: ['丙', '戊', '庚'] },
  '午': { name: '午', element: '화', yinYang: '양', hiddenStems: ['丁', '己'] },
  '未': { name: '未', element: '토', yinYang: '음', hiddenStems: ['己', '丁', '乙'] },
  '申': { name: '申', element: '금', yinYang: '양', hiddenStems: ['庚', '壬', '戊'] },
  '酉': { name: '酉', element: '금', yinYang: '음', hiddenStems: ['辛'] },
  '戌': { name: '戌', element: '토', yinYang: '양', hiddenStems: ['戊', '辛', '丁'] },
  '亥': { name: '亥', element: '수', yinYang: '음', hiddenStems: ['壬', '甲'] },
};

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ============================================================
// 12운성 정밀 계산
// ============================================================

// 각 천간별 12운성 시작 지지 (장생 위치)
const TWELVE_STAGE_START: Record<string, string> = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉',
  '戊': '寅', '己': '酉', '庚': '巳', '辛': '子',
  '壬': '申', '癸': '卯',
};

const TWELVE_STAGES_ORDER: TwelveStageLocal[] = [
  '장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'
];

const STAGE_METADATA: Record<TwelveStageLocal, { energy: 'rising' | 'peak' | 'declining' | 'dormant'; score: number; lifePhase: string }> = {
  '장생': { energy: 'rising', score: 75, lifePhase: '탄생/시작기 - 새로운 가능성의 시작' },
  '목욕': { energy: 'rising', score: 55, lifePhase: '유아기 - 불안정하나 정화의 시기' },
  '관대': { energy: 'rising', score: 85, lifePhase: '청년기 - 자립과 성장의 시기' },
  '건록': { energy: 'peak', score: 95, lifePhase: '장년기 - 왕성한 활동력과 성취' },
  '제왕': { energy: 'peak', score: 100, lifePhase: '전성기 - 최고 정점의 시기' },
  '쇠': { energy: 'declining', score: 65, lifePhase: '성숙기 - 안정과 수확의 시기' },
  '병': { energy: 'declining', score: 45, lifePhase: '쇠퇴기 - 휴식과 재충전 필요' },
  '사': { energy: 'declining', score: 35, lifePhase: '정리기 - 마무리와 해방의 시기' },
  '묘': { energy: 'dormant', score: 25, lifePhase: '잠복기 - 저장과 보존의 시기' },
  '절': { energy: 'dormant', score: 40, lifePhase: '단절기 - 과거와의 단절, 새 시작 준비' },
  '태': { energy: 'rising', score: 50, lifePhase: '잉태기 - 새로운 구상과 계획' },
  '양': { energy: 'rising', score: 65, lifePhase: '양육기 - 성장 준비와 역량 축적' },
};

/**
 * 정밀 12운성 계산
 * @param dayStem 일간 (예: '甲')
 * @param targetBranch 대상 지지 (예: '子')
 */
export function calculatePreciseTwelveStage(dayStem: string, targetBranch: string): PreciseTwelveStage {
  const startBranch = TWELVE_STAGE_START[dayStem];
  if (!startBranch) {
    return {
      stage: '장생',
      description: '알 수 없음',
      energy: 'rising',
      score: 50,
      lifePhase: '정보 부족',
      advice: '정확한 분석을 위해 생년월일시를 확인하세요.',
    };
  }

  const startIdx = BRANCH_ORDER.indexOf(startBranch);
  const targetIdx = BRANCH_ORDER.indexOf(targetBranch);

  if (startIdx === -1 || targetIdx === -1) {
    return {
      stage: '장생',
      description: '알 수 없음',
      energy: 'rising',
      score: 50,
      lifePhase: '정보 부족',
      advice: '정확한 분석을 위해 생년월일시를 확인하세요.',
    };
  }

  // 양간은 순행, 음간은 역행
  const stemInfo = STEMS[dayStem];
  let stageIdx: number;

  if (stemInfo?.yinYang === '양') {
    stageIdx = (targetIdx - startIdx + 12) % 12;
  } else {
    stageIdx = (startIdx - targetIdx + 12) % 12;
  }

  const stage = TWELVE_STAGES_ORDER[stageIdx];
  const meta = STAGE_METADATA[stage];

  const adviceMap: Record<TwelveStageLocal, string> = {
    '장생': '새로운 시작에 유리합니다. 계획을 세우고 첫 발을 내딛으세요.',
    '목욕': '변화와 정화의 시기입니다. 불안정하나 새로워지는 과정입니다.',
    '관대': '자립과 성장의 시기입니다. 자신감을 갖고 도전하세요.',
    '건록': '활동력이 최고조입니다. 적극적으로 추진하세요.',
    '제왕': '정점의 시기입니다. 큰 결정과 성취를 이루세요.',
    '쇠': '성숙기입니다. 무리하지 말고 유지에 집중하세요.',
    '병': '휴식이 필요합니다. 건강 관리와 재충전에 집중하세요.',
    '사': '정리의 시기입니다. 불필요한 것을 내려놓으세요.',
    '묘': '잠복기입니다. 내면에 집중하고 때를 기다리세요.',
    '절': '전환점입니다. 과거를 정리하고 새 시작을 준비하세요.',
    '태': '구상의 시기입니다. 아이디어를 키우고 계획을 세우세요.',
    '양': '준비의 시기입니다. 역량을 쌓고 기반을 다지세요.',
  };

  return {
    stage,
    description: `${dayStem}일간 ${targetBranch}월 - ${stage}`,
    energy: meta.energy,
    score: meta.score,
    lifePhase: meta.lifePhase,
    advice: adviceMap[stage],
  };
}

// ============================================================
// 지지 상호작용 분석
// ============================================================

// 육합 (지지 1:1 합)
const YUKAP: Record<string, { partner: string; result: FiveElement }> = {
  '子': { partner: '丑', result: '토' },
  '丑': { partner: '子', result: '토' },
  '寅': { partner: '亥', result: '목' },
  '卯': { partner: '戌', result: '화' },
  '辰': { partner: '酉', result: '금' },
  '巳': { partner: '申', result: '수' },
  '午': { partner: '未', result: '화' },
  '未': { partner: '午', result: '화' },
  '申': { partner: '巳', result: '수' },
  '酉': { partner: '辰', result: '금' },
  '戌': { partner: '卯', result: '화' },
  '亥': { partner: '寅', result: '목' },
};

// 삼합 (지지 3개 합)
const SAMHAP: { branches: string[]; result: FiveElement }[] = [
  { branches: ['申', '子', '辰'], result: '수' },  // 수국
  { branches: ['寅', '午', '戌'], result: '화' },  // 화국
  { branches: ['亥', '卯', '未'], result: '목' },  // 목국
  { branches: ['巳', '酉', '丑'], result: '금' },  // 금국
];

// 방합 (계절 방위 합)
const BANGHAP: { branches: string[]; result: FiveElement }[] = [
  { branches: ['寅', '卯', '辰'], result: '목' },  // 동방 목
  { branches: ['巳', '午', '未'], result: '화' },  // 남방 화
  { branches: ['申', '酉', '戌'], result: '금' },  // 서방 금
  { branches: ['亥', '子', '丑'], result: '수' },  // 북방 수
];

// 충 (대립)
const CHUNG: Record<string, string> = {
  '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
  '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};

// 형 (충돌)
const HYEONG: { branches: string[]; type: string }[] = [
  { branches: ['寅', '巳', '申'], type: '무은지형' },  // 삼형
  { branches: ['丑', '戌', '未'], type: '무례지형' },  // 삼형
  { branches: ['子', '卯'], type: '무례지형' },        // 이형
  { branches: ['辰', '辰'], type: '자형' },            // 자형
  { branches: ['午', '午'], type: '자형' },
  { branches: ['酉', '酉'], type: '자형' },
  { branches: ['亥', '亥'], type: '자형' },
];

/**
 * 지지 상호작용 분석
 */
export function analyzeBranchInteractions(branches: string[]): BranchInteraction[] {
  const interactions: BranchInteraction[] = [];
  const uniqueBranches = [...new Set(branches)];

  // 육합 체크
  for (let i = 0; i < uniqueBranches.length; i++) {
    for (let j = i + 1; j < uniqueBranches.length; j++) {
      const b1 = uniqueBranches[i];
      const b2 = uniqueBranches[j];

      if (YUKAP[b1]?.partner === b2) {
        interactions.push({
          branches: [b1, b2],
          type: '육합',
          result: YUKAP[b1].result,
          impact: 'positive',
          score: 15,
          description: `${b1}-${b2} 육합 → ${YUKAP[b1].result} 기운 생성`,
        });
      }
    }
  }

  // 삼합 체크
  for (const samhap of SAMHAP) {
    const matchCount = samhap.branches.filter(b => uniqueBranches.includes(b)).length;
    if (matchCount >= 2) {
      const matched = samhap.branches.filter(b => uniqueBranches.includes(b));
      interactions.push({
        branches: matched,
        type: '삼합',
        result: samhap.result,
        impact: 'positive',
        score: matchCount === 3 ? 25 : 15,
        description: `${matched.join('-')} 삼합 → ${samhap.result}국 형성 (${matchCount}/3)`,
      });
    }
  }

  // 방합 체크
  for (const banghap of BANGHAP) {
    const matchCount = banghap.branches.filter(b => uniqueBranches.includes(b)).length;
    if (matchCount >= 2) {
      const matched = banghap.branches.filter(b => uniqueBranches.includes(b));
      interactions.push({
        branches: matched,
        type: '방합',
        result: banghap.result,
        impact: 'positive',
        score: matchCount === 3 ? 20 : 10,
        description: `${matched.join('-')} 방합 → ${banghap.result} 기운 강화`,
      });
    }
  }

  // 충 체크
  for (let i = 0; i < uniqueBranches.length; i++) {
    for (let j = i + 1; j < uniqueBranches.length; j++) {
      const b1 = uniqueBranches[i];
      const b2 = uniqueBranches[j];

      if (CHUNG[b1] === b2) {
        interactions.push({
          branches: [b1, b2],
          type: '충',
          impact: 'negative',
          score: -20,
          description: `${b1}-${b2} 충 → 에너지 충돌, 변화와 불안정`,
        });
      }
    }
  }

  // 형 체크
  for (const hyeong of HYEONG) {
    const matchCount = hyeong.branches.filter(b => branches.includes(b)).length;
    if (matchCount >= hyeong.branches.length) {
      interactions.push({
        branches: hyeong.branches,
        type: '형',
        impact: 'negative',
        score: -15,
        description: `${hyeong.branches.join('-')} ${hyeong.type} → 갈등과 시련`,
      });
    }
  }

  return interactions;
}

// ============================================================
// 십신 계산
// ============================================================

const SIBSIN_NAMES = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const;

export function calculateSibsin(dayStem: string, targetStem: string): string {
  const dayInfo = STEMS[dayStem];
  const targetInfo = STEMS[targetStem];

  if (!dayInfo || !targetInfo) {return '비견';}

  const elements: FiveElement[] = ['목', '화', '토', '금', '수'];
  const dayIdx = elements.indexOf(dayInfo.element);
  const targetIdx = elements.indexOf(targetInfo.element);
  const samePolarity = dayInfo.yinYang === targetInfo.yinYang;

  const diff = (targetIdx - dayIdx + 5) % 5;
  const baseIndex = diff * 2;
  const sibsinIndex = samePolarity ? baseIndex : (baseIndex + 1) % 10;

  return SIBSIN_NAMES[sibsinIndex];
}

// ============================================================
// 다층 레이어 분석
// ============================================================

export interface MultiLayerInput {
  dayStem: string;
  dayBranch: string;
  daeun?: { stem: string; branch: string };
  saeun: { stem: string; branch: string };   // 세운 (연간)
  wolun: { stem: string; branch: string };   // 월운
}

export function analyzeMultiLayer(input: MultiLayerInput): {
  layers: LayerAnalysis[];
  interactions: LayerInteraction[];
  branchInteractions: BranchInteraction[];
} {
  const { dayStem, dayBranch, daeun, saeun, wolun } = input;
  const layers: LayerAnalysis[] = [];

  // 대운 레이어
  if (daeun) {
    const stage = calculatePreciseTwelveStage(dayStem, daeun.branch);
    layers.push({
      stem: daeun.stem,
      branch: daeun.branch,
      element: STEMS[daeun.stem]?.element || '토',
      sibsin: calculateSibsin(dayStem, daeun.stem),
      twelveStage: stage.stage,
      stageEnergy: stage.energy,
      score: stage.score,
      weight: 0.5,  // 대운 가중치 50%
    });
  }

  // 세운 레이어
  {
    const stage = calculatePreciseTwelveStage(dayStem, saeun.branch);
    layers.push({
      stem: saeun.stem,
      branch: saeun.branch,
      element: STEMS[saeun.stem]?.element || '토',
      sibsin: calculateSibsin(dayStem, saeun.stem),
      twelveStage: stage.stage,
      stageEnergy: stage.energy,
      score: stage.score,
      weight: 0.3,  // 세운 가중치 30%
    });
  }

  // 월운 레이어
  {
    const stage = calculatePreciseTwelveStage(dayStem, wolun.branch);
    layers.push({
      stem: wolun.stem,
      branch: wolun.branch,
      element: STEMS[wolun.stem]?.element || '토',
      sibsin: calculateSibsin(dayStem, wolun.stem),
      twelveStage: stage.stage,
      stageEnergy: stage.energy,
      score: stage.score,
      weight: 0.2,  // 월운 가중치 20%
    });
  }

  // 레이어 간 상호작용
  const layerInteractions: LayerInteraction[] = [];

  // 대운-세운 상호작용
  if (daeun) {
    const daeunElement = STEMS[daeun.stem]?.element;
    const saeunElement = STEMS[saeun.stem]?.element;

    if (daeunElement && saeunElement) {
      const synergy = checkElementSynergy(daeunElement, saeunElement);
      layerInteractions.push({
        layers: ['대운', '세운'],
        type: synergy.type,
        description: synergy.description,
        scoreModifier: synergy.score,
      });
    }
  }

  // 세운-월운 상호작용
  {
    const saeunElement = STEMS[saeun.stem]?.element;
    const wolunElement = STEMS[wolun.stem]?.element;

    if (saeunElement && wolunElement) {
      const synergy = checkElementSynergy(saeunElement, wolunElement);
      layerInteractions.push({
        layers: ['세운', '월운'],
        type: synergy.type,
        description: synergy.description,
        scoreModifier: synergy.score,
      });
    }
  }

  // 모든 지지 상호작용
  const allBranches = [dayBranch];
  if (daeun) {allBranches.push(daeun.branch);}
  allBranches.push(saeun.branch, wolun.branch);

  const branchInteractions = analyzeBranchInteractions(allBranches);

  return { layers, interactions: layerInteractions, branchInteractions };
}

// ============================================================
// 오행 상생상극 체크
// ============================================================

function checkElementSynergy(e1: FiveElement, e2: FiveElement): { type: 'synergy' | 'conflict' | 'neutral'; description: string; score: number } {
  // 상생 관계
  const generating: Record<FiveElement, FiveElement> = {
    '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
  };

  // 상극 관계
  const controlling: Record<FiveElement, FiveElement> = {
    '목': '토', '토': '수', '수': '화', '화': '금', '금': '목',
  };

  if (e1 === e2) {
    return { type: 'synergy', description: `${e1}-${e2} 비화 (같은 오행)`, score: 10 };
  }

  if (generating[e1] === e2) {
    return { type: 'synergy', description: `${e1}생${e2} (상생)`, score: 15 };
  }

  if (generating[e2] === e1) {
    return { type: 'synergy', description: `${e2}생${e1} (상생)`, score: 12 };
  }

  if (controlling[e1] === e2) {
    return { type: 'conflict', description: `${e1}극${e2} (상극)`, score: -10 };
  }

  if (controlling[e2] === e1) {
    return { type: 'conflict', description: `${e2}극${e1} (상극)`, score: -8 };
  }

  return { type: 'neutral', description: `${e1}-${e2} 중립`, score: 0 };
}

// ============================================================
// 월운 간지 계산 (절기 기준)
// ============================================================

export function calculateMonthlyGanji(year: number, month: number): { stem: string; branch: string } {
  // 월지 (절기 기준, 1월=인월 시작)
  const monthBranches = ['丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子'];
  const branch = monthBranches[(month - 1) % 12];

  // 월간 계산 (연간에 따라 결정)
  // 갑기년 → 병인월 시작, 을경년 → 무인월 시작, ...
  const yearStemIdx = (year - 4) % 10;
  const monthStemStart = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 각 연간별 인월 천간 인덱스
  const stemIdx = (monthStemStart[yearStemIdx] + (month - 1)) % 10;
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const stem = stems[stemIdx];

  return { stem, branch };
}

// ============================================================
// 세운 간지 계산
// ============================================================

export function calculateYearlyGanji(year: number): { stem: string; branch: string } {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const stemIdx = (year - 4) % 10;
  const branchIdx = (year - 4) % 12;

  return {
    stem: stems[stemIdx],
    branch: branches[branchIdx],
  };
}

// ============================================================
// 종합 월별 타이밍 점수 계산
// ============================================================

export interface AdvancedTimingInput {
  year: number;
  month: number;
  dayStem: string;
  dayBranch: string;
  daeun?: { stem: string; branch: string };
  yongsin?: FiveElement[];
  kisin?: FiveElement[];
}

export function calculateAdvancedMonthlyScore(input: AdvancedTimingInput): LayeredTimingScore {
  const { year, month, dayStem, dayBranch, daeun, yongsin = [], kisin = [] } = input;

  // 세운/월운 계산
  const saeun = calculateYearlyGanji(year);
  const wolun = calculateMonthlyGanji(year, month);

  // 다층 분석
  const { layers, interactions, branchInteractions } = analyzeMultiLayer({
    dayStem,
    dayBranch,
    daeun,
    saeun,
    wolun,
  });

  // 정밀 12운성
  const preciseStage = calculatePreciseTwelveStage(dayStem, wolun.branch);

  // 기본 점수 계산 (가중 평균)
  let rawScore = layers.reduce((sum, layer) => sum + layer.score * layer.weight, 0);

  // 레이어 상호작용 적용
  for (const inter of interactions) {
    rawScore += inter.scoreModifier * 0.5;
  }

  // 지지 상호작용 적용
  for (const bInter of branchInteractions) {
    rawScore += bInter.score * 0.3;
  }

  // 용신/기신 적용
  const wolunElement = STEMS[wolun.stem]?.element;
  if (wolunElement) {
    if (yongsin.includes(wolunElement)) {rawScore += 15;}
    if (kisin.includes(wolunElement)) {rawScore -= 12;}
  }

  // 점수 정규화
  rawScore = Math.max(0, Math.min(100, rawScore));
  const weightedScore = Math.round(rawScore);

  // 신뢰도 (데이터 완전성에 따라)
  let confidence = 60;
  if (daeun) {confidence += 20;}
  if (yongsin.length > 0) {confidence += 10;}
  if (branchInteractions.length > 0) {confidence += 10;}
  confidence = Math.min(100, confidence);

  // 등급 (통일된 기준 사용)
  const grade = scoreToGrade(weightedScore);

  // 오행 분포 계산
  const energyBalance: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
  for (const layer of layers) {
    energyBalance[layer.element] += layer.weight * 100;
  }
  const dominantEnergy = (Object.entries(energyBalance) as [FiveElement, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  // 테마/기회/주의 생성
  const themes: string[] = [];
  const opportunities: string[] = [];
  const cautions: string[] = [];

  // 12운성 기반 테마
  if (preciseStage.energy === 'peak') {
    themes.push('최고조 활동기');
    opportunities.push('중요한 결정과 도전');
  } else if (preciseStage.energy === 'rising') {
    themes.push('상승 에너지');
    opportunities.push('새로운 시작과 계획');
  } else if (preciseStage.energy === 'declining') {
    themes.push('안정과 수확');
    cautions.push('무리한 확장 자제');
  } else {
    themes.push('내면 성찰');
    cautions.push('큰 결정 보류');
  }

  // 지지 상호작용 기반
  for (const bInter of branchInteractions) {
    if (bInter.impact === 'positive') {
      opportunities.push(bInter.description);
    } else if (bInter.impact === 'negative') {
      cautions.push(bInter.description);
    }
  }

  // 타이밍 조언
  const timing: TimingAdvice = {
    bestActions: preciseStage.energy === 'peak' ? ['중요 계약', '면접', '프로젝트 시작'] : ['계획 수립', '학습', '네트워킹'],
    avoidActions: preciseStage.energy === 'dormant' ? ['큰 결정', '무리한 투자'] : [],
    focusAreas: [preciseStage.lifePhase.split(' - ')[1] || '균형 유지'],
    luckyDays: calculateLuckyDays(month, weightedScore),
    cautionDays: calculateCautionDays(month, branchInteractions),
  };

  return {
    year,
    month,
    daeunLayer: layers.find(l => l.weight === 0.5) || layers[0],
    saeunLayer: layers.find(l => l.weight === 0.3) || layers[0],
    wolunLayer: layers.find(l => l.weight === 0.2) || layers[0],
    layerInteractions: interactions,
    branchInteractions,
    preciseStage,
    rawScore,
    weightedScore,
    confidence,
    grade,
    dominantEnergy,
    energyBalance,
    themes,
    opportunities,
    cautions,
    timing,
  };
}

function calculateLuckyDays(month: number, baseScore: number): number[] {
  // 현재 연도 기준으로 월의 일수 계산 (하드코딩된 2024 제거)
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(currentYear, month, 0).getDate();
  const luckyCount = baseScore >= 70 ? 6 : baseScore >= 50 ? 4 : 2;

  // 1, 6, 11, 16, 21, 26 (5일 간격)
  const days: number[] = [];
  for (let d = 1; d <= daysInMonth && days.length < luckyCount; d += 5) {
    days.push(d);
  }
  return days;
}

function calculateCautionDays(month: number, branchInteractions: BranchInteraction[]): number[] {
  const hasConflict = branchInteractions.some(b => b.impact === 'negative');
  if (!hasConflict) {return [];}

  // 현재 연도 기준으로 월의 일수 계산 (하드코딩된 2024 제거)
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(currentYear, month, 0).getDate();
  // 충이 있으면 월초/월말 주의
  return [1, 2, daysInMonth - 1, daysInMonth];
}

// ============================================================
// 프롬프트 컨텍스트 생성
// ============================================================

export function generateAdvancedTimingPromptContext(
  scores: LayeredTimingScore[],
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push(`=== 정밀 월별 타이밍 분석 (다층 레이어 + 합충형) ===`);
    lines.push('');
    lines.push('📊 레이어 가중치: 대운 50% + 세운 30% + 월운 20%');
    lines.push('');

    for (const s of scores) {
      lines.push(`【${s.month}월】 ${s.grade}등급 (${s.weightedScore}점) | 신뢰도 ${s.confidence}%`);
      lines.push(`  12운성: ${s.preciseStage.stage} (${s.preciseStage.energy})`);
      lines.push(`  주도 오행: ${s.dominantEnergy}`);

      // 레이어별 점수 분리 표시 (TIER 1: 대운/월운 분리)
      if (s.daeunLayer && s.saeunLayer && s.wolunLayer) {
        lines.push(`  레이어: 대운 ${Math.round(s.daeunLayer.score)}점 | 세운 ${Math.round(s.saeunLayer.score)}점 | 월운 ${Math.round(s.wolunLayer.score)}점`);
      }

      if (s.branchInteractions.length > 0) {
        const interStr = s.branchInteractions.map(b => `${b.type}(${b.branches.join('-')})`).join(', ');
        lines.push(`  지지작용: ${interStr}`);
      }

      lines.push(`  테마: ${s.themes.join(', ')}`);
      lines.push(`  기회: ${s.opportunities.slice(0, 2).join(', ') || '-'}`);
      lines.push(`  주의: ${s.cautions.slice(0, 2).join(', ') || '-'}`);
      lines.push(`  길일: ${s.timing.luckyDays.join(', ')}일`);
      lines.push('');
    }

    // 신뢰도 설명 추가
    const avgConfidence = Math.round(scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length);
    lines.push(`--- 신뢰도 안내 ---`);
    lines.push(`평균 신뢰도: ${avgConfidence}%`);
    if (avgConfidence >= 80) {
      lines.push('✅ 대운/세운/시간 정보가 모두 있어 높은 정확도');
    } else if (avgConfidence >= 60) {
      lines.push('📊 일부 데이터 부족, 대략적 추세 참고용');
    } else {
      lines.push('⚠️ 데이터 부족, 정확한 생시 입력시 정확도 향상');
    }
    lines.push('');
  } else {
    lines.push(`=== Advanced Monthly Timing (Multi-layer + Branch Interactions) ===`);
    lines.push('');
    lines.push('📊 Layer weights: Daeun 50% + Saeun 30% + Woleun 20%');
    lines.push('');

    for (const s of scores) {
      lines.push(`【Month ${s.month}】 Grade ${s.grade} (${s.weightedScore}) | Confidence ${s.confidence}%`);
      lines.push(`  Stage: ${s.preciseStage.stage} (${s.preciseStage.energy})`);
      lines.push(`  Dominant Element: ${s.dominantEnergy}`);

      // Layer separation
      if (s.daeunLayer && s.saeunLayer && s.wolunLayer) {
        lines.push(`  Layers: Daeun ${Math.round(s.daeunLayer.score)} | Saeun ${Math.round(s.saeunLayer.score)} | Woleun ${Math.round(s.wolunLayer.score)}`);
      }

      lines.push(`  Lucky Days: ${s.timing.luckyDays.join(', ')}`);
      lines.push('');
    }

    // Confidence explanation
    const avgConfidence = Math.round(scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length);
    lines.push(`--- Confidence Note ---`);
    lines.push(`Average: ${avgConfidence}%`);
    if (avgConfidence >= 80) {
      lines.push('✅ Complete data - high accuracy');
    } else if (avgConfidence >= 60) {
      lines.push('📊 Partial data - general trends');
    } else {
      lines.push('⚠️ Limited data - provide birth time for better accuracy');
    }
    lines.push('');
  }

  return lines.join('\n');
}
