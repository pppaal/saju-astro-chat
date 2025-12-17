// src/lib/destiny-matrix/interpreter/types.ts
// Destiny Fusion Matrix™ - Interpretation Engine Types
// 특허 가능 요소: 동적 가중치 시스템, 인사이트 생성 알고리즘

import type { FiveElement, SibsinKind } from '../../Saju/types';
import type {
  InteractionCode,
  MatrixCalculationInput,
  GeokgukType,
  TransitCycle,
  ShinsalKind,
} from '../types';

// ===========================
// 인사이트 카테고리
// ===========================

export type InsightCategory =
  | 'strength'      // 강점 (극강 시너지)
  | 'opportunity'   // 기회 (증폭/확장 가능)
  | 'balance'       // 균형 (안정적)
  | 'caution'       // 주의 (잠재적 충돌)
  | 'challenge';    // 도전 (극복 필요)

export type InsightDomain =
  | 'personality'   // 성격/정체성
  | 'career'        // 직업/사업
  | 'relationship'  // 인간관계/연애
  | 'wealth'        // 재물/재정
  | 'health'        // 건강/활력
  | 'spirituality'  // 영성/성장
  | 'timing';       // 시기/타이밍

export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';

// ===========================
// 핵심 인사이트 타입
// ===========================

export interface FusionInsight {
  id: string;
  category: InsightCategory;
  domain: InsightDomain;
  priority: InsightPriority;

  // 점수 정보
  score: number;              // 1-100 (사용자 친화적)
  rawScore: number;           // 원본 매트릭스 점수
  weightedScore: number;      // 가중치 적용 점수

  // 출처 추적 (특허 요소: 다층 융합 추적)
  sources: InsightSource[];

  // 사용자 친화적 출력
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;

  // 실천 가이드
  actionItems: ActionItem[];

  // 시각화 데이터
  icon: string;
  colorCode: string;
  gradient?: string;
}

export interface InsightSource {
  layer: number;
  layerName: string;
  sajuFactor: string;        // 사주 요소 (예: "일간 목", "정관격")
  astroFactor: string;       // 점성 요소 (예: "Jupiter in H10", "Saturn Return")
  interaction: InteractionCode;
  contribution: number;      // 이 소스의 기여도 (0-1)
}

export interface ActionItem {
  type: 'do' | 'avoid' | 'consider';
  text: string;
  textEn: string;
  timing?: string;           // 적용 시기
  timingEn?: string;
}

// ===========================
// 동적 가중치 시스템 (특허 핵심)
// ===========================

export interface WeightConfig {
  // 기본 가중치
  baseWeights: LayerWeights;

  // 컨텍스트 수정자
  contextModifiers: ContextModifier[];

  // 시간 수정자 (역행, 트랜짓 등)
  temporalModifiers: TemporalModifier[];

  // 개인화 수정자 (피드백 기반)
  personalizationModifiers?: PersonalizationModifier[];
}

export interface LayerWeights {
  layer1_elementCore: number;      // 기운핵심 (기본 성향)
  layer2_sibsinPlanet: number;     // 십신-행성 (역할/에너지)
  layer3_sibsinHouse: number;      // 십신-하우스 (생활영역)
  layer4_timing: number;           // 타이밍 (시기)
  layer5_relationAspect: number;   // 관계-애스펙트 (상호작용)
  layer6_stageHouse: number;       // 운성-하우스 (생명력)
  layer7_advanced: number;         // 격국-프로그레션 (고급)
  layer8_shinsal: number;          // 신살-행성 (특수기운)
  layer9_asteroid: number;         // 소행성 (세부)
  layer10_extraPoint: number;      // 엑스트라포인트 (심층)
}

export interface ContextModifier {
  condition: ContextCondition;
  layerAdjustments: Partial<LayerWeights>;
  reason: string;
}

export type ContextCondition =
  | { type: 'geokguk'; value: GeokgukType }
  | { type: 'yongsin'; value: FiveElement }
  | { type: 'dominantElement'; value: FiveElement }
  | { type: 'ageRange'; min: number; max: number }
  | { type: 'query'; domain: InsightDomain };

export interface TemporalModifier {
  activeCycle: TransitCycle;
  layerAdjustments: Partial<LayerWeights>;
  insightBoosts: InsightDomain[];
  reason: string;
}

export interface PersonalizationModifier {
  userId: string;
  preferredDomains: InsightDomain[];
  feedbackHistory: FeedbackEntry[];
  customWeights?: Partial<LayerWeights>;
}

export interface FeedbackEntry {
  insightId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  timestamp: Date;
}

// ===========================
// 서사 생성 타입 (특허 요소)
// ===========================

export interface NarrativeTemplate {
  id: string;
  category: InsightCategory;
  domain: InsightDomain;

  // 템플릿 패턴
  patterns: {
    ko: string[];
    en: string[];
  };

  // 동적 슬롯
  slots: NarrativeSlot[];
}

export interface NarrativeSlot {
  name: string;
  type: 'sajuFactor' | 'astroFactor' | 'score' | 'timing' | 'action';
  format?: string;
}

export interface GeneratedNarrative {
  short: string;           // 한 줄 요약
  shortEn: string;
  medium: string;          // 2-3문장
  mediumEn: string;
  detailed: string;        // 상세 설명
  detailedEn: string;
}

// ===========================
// 최종 사용자 출력 타입
// ===========================

export interface FusionReport {
  // 메타 정보
  id: string;
  generatedAt: Date;
  version: string;
  lang: 'ko' | 'en';

  // 사용자 정보 요약
  profile: ProfileSummary;

  // 핵심 점수 (100점 만점)
  overallScore: OverallScore;

  // 주요 인사이트 (5개)
  topInsights: FusionInsight[];

  // 도메인별 분석
  domainAnalysis: DomainAnalysis[];

  // 타이밍 분석
  timingAnalysis: TimingAnalysis;

  // 시각화 데이터
  visualizations: VisualizationData;

  // 상세 데이터 (옵션)
  detailedData?: DetailedFusionData;
}

export interface ProfileSummary {
  dayMasterElement: FiveElement;
  dayMasterDescription: string;
  geokguk?: GeokgukType;
  geokgukDescription?: string;
  dominantSibsin: SibsinKind[];
  keyShinsals: ShinsalKind[];
  westernSunSign?: string;
  westernMoonSign?: string;
}

export interface OverallScore {
  total: number;            // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  gradeDescription: string;
  gradeDescriptionEn: string;

  // 카테고리별 점수
  categoryScores: {
    strength: number;
    opportunity: number;
    balance: number;
    caution: number;
    challenge: number;
  };

  // 비교 데이터
  percentile?: number;      // 상위 몇 % (향후 구현)
}

export interface DomainAnalysis {
  domain: InsightDomain;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';

  summary: string;
  summaryEn: string;

  strengths: string[];
  strengthsEn: string[];

  challenges: string[];
  challengesEn: string[];

  insights: FusionInsight[];
}

export interface TimingAnalysis {
  currentPeriod: {
    name: string;
    nameEn: string;
    score: number;
    description: string;
    descriptionEn: string;
  };

  activeTransits: ActiveTransit[];

  upcomingPeriods: UpcomingPeriod[];

  retrogradeAlerts: RetrogradeAlert[];
}

export interface ActiveTransit {
  cycle: TransitCycle;
  influence: 'positive' | 'neutral' | 'challenging';
  description: string;
  descriptionEn: string;
  until?: Date;
}

export interface UpcomingPeriod {
  name: string;
  nameEn: string;
  startDate?: Date;
  score: number;
  highlight: string;
  highlightEn: string;
}

export interface RetrogradeAlert {
  planet: string;
  startDate: Date;
  endDate: Date;
  affectedDomains: InsightDomain[];
  advice: string;
  adviceEn: string;
}

// ===========================
// 시각화 데이터
// ===========================

export interface VisualizationData {
  // 레이더 차트 (도메인별)
  radarChart: {
    labels: string[];
    labelsEn: string[];
    values: number[];
    maxValue: number;
  };

  // 히트맵 (레이어 × 중요도)
  heatmap: {
    rows: string[];
    cols: string[];
    values: number[][];
    colorScale: string[];
  };

  // 시너지 네트워크
  synergyNetwork: {
    nodes: SynergyNode[];
    edges: SynergyEdge[];
  };

  // 타임라인
  timeline: {
    events: TimelineEvent[];
  };
}

export interface SynergyNode {
  id: string;
  label: string;
  type: 'saju' | 'astro';
  size: number;
  color: string;
}

export interface SynergyEdge {
  source: string;
  target: string;
  weight: number;
  type: 'synergy' | 'tension';
}

export interface TimelineEvent {
  date: Date;
  type: 'transit' | 'retrograde' | 'return' | 'eclipse';
  title: string;
  titleEn: string;
  impact: number;
}

// ===========================
// 상세 데이터 (개발자용)
// ===========================

export interface DetailedFusionData {
  // 모든 계산된 인사이트
  allInsights: FusionInsight[];

  // 레이어별 원시 데이터
  layerData: Record<string, unknown>;

  // 가중치 계산 로그
  weightCalculationLog: WeightCalculationLog[];

  // 서사 생성 로그
  narrativeGenerationLog: NarrativeGenerationLog[];
}

export interface WeightCalculationLog {
  step: string;
  input: unknown;
  output: unknown;
  reason: string;
}

export interface NarrativeGenerationLog {
  insightId: string;
  templateUsed: string;
  slotsFilledWith: Record<string, string>;
  finalOutput: string;
}

// ===========================
// 엔진 설정
// ===========================

export interface InterpreterConfig {
  // 출력 설정
  lang: 'ko' | 'en';
  maxTopInsights: number;
  includeDetailedData: boolean;

  // 가중치 설정
  weightConfig: WeightConfig;

  // 서사 설정
  narrativeStyle: 'formal' | 'friendly' | 'minimal';

  // 시각화 설정
  includeVisualizations: boolean;
  visualizationOptions?: {
    includeRadar: boolean;
    includeHeatmap: boolean;
    includeSynergyNetwork: boolean;
    includeTimeline: boolean;
  };
}
