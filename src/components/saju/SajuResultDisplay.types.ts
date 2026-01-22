/**
 * SajuResultDisplay Types
 * 사주 결과 표시 컴포넌트의 타입 정의
 */

import type {
  DayMaster,
  DaeunData,
  YeonunData,
  WolunData,
  IljinData,
  PillarData,
} from '../../lib/Saju';

// ===== 간지 값 타입 =====
export type GanjiValue = string | { name: string } | null | undefined;

// ===== 고급 분석 세부 타입 =====

export interface GeokgukAnalysis {
  primary?: string;
  category?: string;
  confidence?: string;
  description?: string;
}

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

export interface HyeongchungAnalysis {
  relations?: {
    type: string;
    branches: string[];
    description?: string;
  }[];
}

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

export interface DeukryeongAnalysis {
  status?: string;
  strength?: number;
  description?: string;
}

export interface JohuYongsinAnalysis {
  primary?: string;
  secondary?: string;
  seasonalNeed?: string;
  interpretation?: string;
}

export interface CareerAptitude {
  field: string;
  score: number;
  reason: string;
}

export interface SibsinAnalysis {
  count?: Record<string, number>;
  careerAptitude?: CareerAptitude[];
  personality?: {
    strengths?: string[];
    weaknesses?: string[];
  };
}

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

// ===== API 응답 타입 =====

export interface TablePillarData {
  jijanggan?: { raw?: string } | string;
  twelveStage?: string;
  twelveShinsal?: string | string[];
  lucky?: string[];
}

export interface TableData {
  byPillar: {
    time?: TablePillarData;
    day?: TablePillarData;
    month?: TablePillarData;
    year?: TablePillarData;
  };
}

export interface RelationData {
  kind: string;
  pillars: ('year' | 'month' | 'day' | 'time')[];
  detail?: string;
}

export interface AdvancedAnalysis {
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
}

export interface SajuApiResponse {
  isPremium?: boolean;
  isLoggedIn?: boolean;
  birthYear: number;
  yearPillar: PillarData;
  monthPillar: PillarData;
  dayPillar: PillarData;
  timePillar: PillarData;
  daeun: {
    daeunsu: number;
    cycles: DaeunData[];
  };
  fiveElements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  dayMaster: DayMaster;
  yeonun: YeonunData[];
  wolun: WolunData[];
  iljin: IljinData[];
  table?: TableData;
  relations?: RelationData[];
  advancedAnalysis?: AdvancedAnalysis;
}

// ===== 컴포넌트 Props =====

export interface SajuResultDisplayProps {
  result: SajuApiResponse;
}

// ===== 오행 타입 =====

export type ElementEN = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

// ===== 상태 타입 =====

export interface SajuDisplayState {
  selectedDaeun: DaeunData | null;
  selectedYeonun: YeonunData | undefined;
  selectedWolun: WolunData | undefined;
  displayedYeonun: YeonunData[];
  displayedWolun: WolunData[];
  displayedIljin: IljinData[];
}