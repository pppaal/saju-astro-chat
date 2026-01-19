import type { DayMaster, DaeunData, YeonunData, WolunData, IljinData, PillarData } from '../Saju';

export type GanjiValue = string | { name: string } | null | undefined;

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
  relations?: { type: string; branches: string[]; description?: string }[];
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
