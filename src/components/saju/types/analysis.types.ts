/**
 * Saju Advanced Analysis Types
 * 사주 고급 분석 타입 정의
 */

import type { DayMaster, DaeunData, YeonunData, WolunData, IljinData, PillarData } from '@/lib/Saju';

// 격국 분석
export interface GeokgukAnalysis {
  primary?: string;
  category?: string;
  confidence?: string;
  description?: string;
}

// 용신 분석
export interface YongsinAnalysis {
  primaryYongsin?: string;
  secondaryYongsin?: string;
  kibsin?: string;
  daymasterStrength?: string;
  luckyColors?: string[];
  luckyDirection?: string;
  luckyNumbers?: number[];
  description?: string;
  reasoning?: string;
}

// 형충 분석
export interface HyeongchungAnalysis {
  relations?: { type: string; branches: string[]; description?: string }[];
}

// 통근 분석
export interface TonggeunRoot {
  pillar: string;
  branch: string;
  type: string;
  strength: number;
}

export interface TonggeunAnalysis {
  totalStrength?: number;
  roots?: TonggeunRoot[];
}

// 득령 분석
export interface DeukryeongAnalysis {
  status?: string;
  strength?: number;
  description?: string;
}

// 조후용신 분석
export interface JohuYongsinAnalysis {
  primary?: string;
  secondary?: string;
  seasonalNeed?: string;
  interpretation?: string;
}

// 직업 적성
export interface CareerAptitude {
  field: string;
  score: number;
  reason: string;
}

// 십신 분석
export interface SibsinAnalysis {
  count?: Record<string, number>;
  careerAptitude?: CareerAptitude[];
  personality?: {
    strengths?: string[];
    weaknesses?: string[];
  };
}

// 건강 분석
export interface OrganHealth {
  organ: string;
  element: string;
  status: string;
  score: number;
}

export interface HealthAnalysis {
  constitution?: string;
  organHealth?: OrganHealth[];
  preventionAdvice?: string[];
}

// 직업 분석
export interface CareerField {
  category: string;
  fitScore: number;
  jobs?: string[];
}

export interface CareerAnalysis {
  primaryFields?: CareerField[];
  workStyle?: {
    type?: string;
    description?: string;
    strengths?: string[];
    idealEnvironment?: string[];
  };
  careerAdvice?: string[];
}

// 점수
export interface StrengthScore {
  total?: number;
  level?: string;
}

export interface GeokgukScore {
  purity?: number;
  stability?: number;
}

export interface YongsinScore {
  fitScore?: number;
}

export interface ComprehensiveScore {
  overall?: number;
  grade?: string;
  strength?: StrengthScore;
  geokguk?: GeokgukScore;
  yongsin?: YongsinScore;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

// 리포트
export interface ReportSection {
  title: string;
  content: string;
}

export interface ComprehensiveReport {
  summary?: string;
  sections?: ReportSection[];
}

export interface Interpretations {
  twelveStages?: Record<string, string>;
  elements?: Record<string, string>;
}

// API 응답 타입
export interface SajuApiResponse {
  isPremium?: boolean;
  isLoggedIn?: boolean;
  birthYear: number;
  yearPillar: PillarData;
  monthPillar: PillarData;
  dayPillar: PillarData;
  timePillar: PillarData;
  daeun: { daeunsu: number; cycles: DaeunData[] };
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number };
  dayMaster: DayMaster;
  yeonun: YeonunData[];
  wolun: WolunData[];
  iljin: IljinData[];
  table?: {
    byPillar: {
      time?: { jijanggan?: { raw?: string } | string; twelveStage?: string; twelveShinsal?: string | string[]; lucky?: string[] };
      day?: { jijanggan?: { raw?: string } | string; twelveStage?: string; twelveShinsal?: string | string[]; lucky?: string[] };
      month?: { jijanggan?: { raw?: string } | string; twelveStage?: string; twelveShinsal?: string | string[]; lucky?: string[] };
      year?: { jijanggan?: { raw?: string } | string; twelveStage?: string; twelveShinsal?: string | string[]; lucky?: string[] };
    };
  };
  relations?: { kind: string; pillars: ('year' | 'month' | 'day' | 'time')[]; detail?: string }[];
  advancedAnalysis?: {
    geokguk?: GeokgukAnalysis;
    yongsin?: YongsinAnalysis;
    hyeongchung?: HyeongchungAnalysis;
    tonggeun?: TonggeunAnalysis;
    deukryeong?: DeukryeongAnalysis;
    johuYongsin?: JohuYongsinAnalysis;
    sibsin?: SibsinAnalysis;
    health?: HealthAnalysis;
    career?: CareerAnalysis;
    score?: ComprehensiveScore;
    report?: ComprehensiveReport;
    interpretations?: Interpretations;
  };
}
