/**
 * timing/types.ts - 고급 타이밍 엔진 타입 정의
 */

import type { FiveElement, YinYang } from '@/lib/Saju/types';
import type { PredictionGrade } from '../index';

export type { FiveElement, YinYang };

// 이 모듈에서 사용하는 12운성 (건록/제왕 명칭 사용)
export type TwelveStageLocal =
  | '장생' | '목욕' | '관대' | '건록' | '제왕'
  | '쇠' | '병' | '사' | '묘' | '절' | '태' | '양';

// 외부로 내보내는 타입은 Local 버전 사용
export type TwelveStage = TwelveStageLocal;

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

export interface MultiLayerInput {
  dayStem: string;
  dayBranch: string;
  daeun?: { stem: string; branch: string };
  saeun: { stem: string; branch: string };   // 세운 (연간)
  wolun: { stem: string; branch: string };   // 월운
}

export interface AdvancedTimingInput {
  year: number;
  month: number;
  dayStem: string;
  dayBranch: string;
  daeun?: { stem: string; branch: string };
  yongsin?: FiveElement[];
  kisin?: FiveElement[];
}
