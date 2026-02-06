// src/lib/destiny-map/prompt/fortune/types/index.ts
// 운세 프롬프트 관련 타입 정의

import type { FiveElement } from '@/lib/Saju/types';

// ============================================================
// 기본 데이터 타입
// ============================================================

export interface PillarInput {
  name?: string;
  sign?: string;
  house?: number;
  heavenlyStem?: { name?: string };
  earthlyBranch?: { name?: string };
  ganji?: string;
  description?: string;
  from?: string;
  to?: string;
  degree?: number;
}

export interface UnseItem {
  year?: number;
  month?: number;
  element?: string;
  ganji?: string;
  heavenlyStem?: string;
  earthlyBranch?: string;
  name?: string;
  startYear?: number;
  endYear?: number;
}

export interface AspectItem {
  year?: number;
  month?: number;
  type?: string;
  planet1?: { name?: string };
  planet2?: { name?: string };
  from?: string;
  to?: string;
}

export interface SinsalItem {
  name?: string;
  stars?: string[];
}

export interface MonthlyItem {
  year?: number;
  month?: number;
  element?: string;
  heavenlyStem?: string;
  earthlyBranch?: string;
}

export interface TransitItem {
  type?: string;
  aspectType?: string;
  from?: { name?: string };
  to?: { name?: string };
  transitPlanet?: string;
  natalPoint?: string;
  orb?: string | number;
  isApplying?: boolean;
  stem?: string;
  gan?: string;
  branch?: string;
  ji?: string;
  strength?: string;
  level?: string;
}

export interface HoegukItem {
  type?: string;
  name?: string;
  resultElement?: string;
  branches?: string[];
  element?: string;
}

export interface BranchInteraction {
  branch1?: string;
  branch2?: string;
  from?: string;
  to?: string;
  result?: string;
  description?: string;
  branches?: string[];
}

// ============================================================
// 신살 타입
// ============================================================

export interface SinsalRecord {
  luckyList?: SinsalItem[];
  unluckyList?: SinsalItem[];
  twelveAll?: SinsalItem[];
}

// ============================================================
// Solar/Lunar Return 타입
// ============================================================

export interface ReturnSummary {
  ascSign?: string;
  ascendant?: string;
  sunHouse?: number;
  moonSign?: string;
  moonHouse?: number;
  theme?: string;
  yearTheme?: string;
  monthTheme?: string;
}

export interface ReturnData {
  summary?: ReturnSummary;
}

// ============================================================
// Progressions 타입
// ============================================================

export interface ProgressionSummary {
  keySigns?: { sun?: string; moon?: string };
  progressedSun?: string;
  progressedMoon?: string;
}

export interface ProgressionSecondary {
  summary?: ProgressionSummary;
  moonPhase?: { phase?: string; description?: string };
}

export interface ProgressionSolarArc {
  summary?: ProgressionSummary;
}

export interface ProgressionData {
  secondary?: ProgressionSecondary;
  solarArc?: ProgressionSolarArc;
}

// ============================================================
// Draconic 타입
// ============================================================

export interface DraconicAlignment {
  description?: string;
}

export interface DraconicComparison {
  alignments?: DraconicAlignment[];
}

export interface DraconicChartData {
  planets?: PillarInput[];
  ascendant?: { sign?: string };
}

export interface DraconicData {
  chart?: DraconicChartData;
  comparison?: DraconicComparison;
}

// ============================================================
// Harmonics 타입
// ============================================================

export interface HarmonicProfile {
  dominant?: number;
  creative?: number;
  spiritual?: number;
  intuitive?: number;
}

export interface HarmonicsData {
  profile?: HarmonicProfile;
}

// ============================================================
// Asteroids 타입
// ============================================================

export interface AsteroidPoint {
  sign?: string;
  house?: number;
}

export interface AsteroidAspect {
  asteroid?: string;
  from?: string;
  type?: string;
  aspect?: string;
  planet?: string;
  to?: string;
  planet2?: { name?: string };
}

export interface AsteroidsData {
  ceres?: AsteroidPoint;
  pallas?: AsteroidPoint;
  juno?: AsteroidPoint;
  vesta?: AsteroidPoint;
  aspects?: AsteroidAspect[] | Record<string, AsteroidAspect[]>;
}

// ============================================================
// Fixed Stars 타입
// ============================================================

export interface FixedStarItem {
  star?: string;
  planet?: string;
  meaning?: string;
}

// ============================================================
// Eclipses 타입
// ============================================================

export interface EclipseImpact {
  eclipseType?: string;
  type?: string;
  affectedPoint?: string;
  affectedPlanet?: string;
  interpretation?: string;
}

export interface UpcomingEclipse {
  date?: string;
  type?: string;
}

export interface EclipsesData {
  impact?: EclipseImpact;
  upcoming?: UpcomingEclipse[];
}

// ============================================================
// Electional 타입
// ============================================================

export interface MoonPhaseInfo {
  phase?: string;
  name?: string;
  illumination?: number;
}

export interface VOCInfo {
  isVoid?: boolean;
}

export interface PlanetaryHourInfo {
  planet?: string;
  quality?: string;
  dayType?: string;
}

export interface ElectionalAnalysis {
  score?: number;
  recommendation?: string;
}

export interface ElectionalData {
  moonPhase?: string | MoonPhaseInfo;
  voidOfCourse?: VOCInfo;
  planetaryHour?: PlanetaryHourInfo;
  retrograde?: string[];
  analysis?: ElectionalAnalysis;
}

// ============================================================
// Midpoints 타입
// ============================================================

export interface MidpointPoint {
  sign?: string;
  degree?: number;
}

export interface MidpointActivation {
  description?: string;
}

export interface MidpointsData {
  sunMoon?: MidpointPoint;
  ascMc?: MidpointPoint;
  activations?: MidpointActivation[];
}

// ============================================================
// Extra Points 타입
// ============================================================

export interface ExtraPointData {
  sign?: string;
  house?: number;
}

export interface ExtraPointsData {
  chiron?: ExtraPointData;
  lilith?: ExtraPointData;
  partOfFortune?: ExtraPointData;
  vertex?: ExtraPointData;
}

// ============================================================
// Advanced Saju Analysis 타입
// ============================================================

export interface StrengthData {
  level?: string;
  score?: number;
  rootCount?: number;
  roots?: number;
  supportRatio?: number;
  ratio?: number;
}

export interface GeokgukData {
  type?: string;
  name?: string;
  grade?: string;
  level?: string;
  description?: string;
  explanation?: string;
  characteristics?: string[];
}

export interface YongsinData {
  primary?: { element?: string; reason?: string };
  yongsin?: string;
  reason?: string;
  secondary?: { element?: string } | string;
  huisin?: string;
  avoid?: { element?: string } | string;
  gisin?: string;
  recommendations?: string[];
}

export interface JohuYongsinData {
  needed?: string;
  element?: string;
  seasonalBalance?: string;
  balance?: string;
}

export interface TonggeunData {
  score?: number;
  strength?: number;
  status?: string;
  level?: string;
  details?: Record<string, unknown>;
  branches?: Record<string, unknown>;
}

export interface DeukryeongData {
  isDeukryeong?: boolean;
  status?: boolean;
  seasonalEnergy?: string;
  season?: string;
  explanation?: string;
  description?: string;
}

export interface HyeongchungData {
  chung?: BranchInteraction[];
  clashes?: BranchInteraction[];
  hyeong?: BranchInteraction[];
  punishments?: BranchInteraction[];
  hap?: BranchInteraction[];
  combinations?: BranchInteraction[];
  samhap?: Array<{ branches?: string[]; description?: string }>;
  banghap?: Array<{ branches?: string[]; description?: string }>;
}

export interface SibsinData {
  distribution?: Record<string, number>;
  counts?: Record<string, number>;
  dominant?: string;
  primary?: string;
  missing?: string[];
  absent?: string[];
  personality?: string;
  personalityTraits?: string;
  careerAptitude?: string;
  careerAptitudes?: string[];
  relationships?: string;
  relationshipStyle?: string;
}

export interface HealthCareerData {
  health?: {
    vulnerabilities?: string[];
    weakOrgans?: string[];
    strengths?: string[];
    strongOrgans?: string[];
  };
  career?: {
    suitableFields?: string[];
    aptitudes?: string[];
    workStyle?: string;
  };
}

export interface ScoreData {
  total?: number;
  overall?: number;
  business?: number;
  career?: number;
  wealth?: number;
  finance?: number;
  health?: number;
  relationships?: number;
  social?: number;
}

export interface UltraAdvancedData {
  jonggeok?: { type?: string; name?: string; description?: string };
  hwagyeok?: { type?: string; name?: string; description?: string };
  iljuAnalysis?: { character?: string; personality?: string; advice?: string; guidance?: string };
  gongmang?: { branches?: string[]; emptyBranches?: string[]; impact?: string; interpretation?: string };
  samgi?: { type?: string; name?: string; present?: boolean; found?: boolean };
}

export interface ExtendedAnalysis {
  strength?: StrengthData;
  geokguk?: GeokgukData;
  yongsin?: YongsinData;
  johuYongsin?: JohuYongsinData;
  johu?: JohuYongsinData;
}

export interface AdvancedAnalysisData {
  extended?: ExtendedAnalysis;
  geokguk?: GeokgukData;
  yongsin?: YongsinData;
  tonggeun?: TonggeunData;
  tuechul?: TransitItem[];
  hoeguk?: HoegukItem[];
  deukryeong?: DeukryeongData;
  hyeongchung?: HyeongchungData;
  sibsin?: SibsinData;
  healthCareer?: HealthCareerData;
  score?: ScoreData;
  ultraAdvanced?: UltraAdvancedData;
}

// ============================================================
// 출력 타입
// ============================================================

export interface StructuredFortuneOutput {
  sections: {
    id: string;
    title: string;
    icon: string;
    content: string;
    reasoning?: string;
    terminology?: Array<{ term: string; explanation: string }>;
  }[];
  dateRecommendations: {
    lucky: Array<{
      date: string;
      reason: string;
      easternFactor?: string;
      astroFactor?: string;
      rating: 1 | 2 | 3 | 4 | 5;
    }>;
    caution: Array<{
      date: string;
      reason: string;
      easternFactor?: string;
      astroFactor?: string;
    }>;
    bestPeriod?: {
      start: string;
      end: string;
      reason: string;
    };
  };
  keyInsights: Array<{
    type: 'strength' | 'opportunity' | 'caution' | 'advice';
    text: string;
    icon: string;
  }>;
  easternHighlight?: {
    pillar: string;
    element: string;
    meaning: string;
  };
  astroHighlight?: {
    planet: string;
    sign: string;
    meaning: string;
  };
}
