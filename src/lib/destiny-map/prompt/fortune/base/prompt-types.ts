/**
 * Prompt Builder Type Definitions
 * 프롬프트 빌더 타입 정의
 *
 * Consolidated type definitions for the fortune prompt builder modules.
 * These types handle the flexible data structures from external APIs.
 */

// ============================================
// House & Chart Types
// ============================================

export interface HouseData {
  cusp?: number
  formatted?: string
  sign?: string
}

// ============================================
// Saju Pillar Types
// ============================================

export interface PillarData {
  heavenlyStem?: { name?: string; element?: string }
  earthlyBranch?: { name?: string; element?: string }
  ganji?: string
  year?: number
}

export interface PillarSet {
  year?: PillarData
  month?: PillarData
  day?: PillarData
  time?: PillarData
}

// ============================================
// Day Master Types
// ============================================

export interface DayMasterInfo {
  name?: string
  element?: string
  yinYang?: string
}

// ============================================
// Luck Cycle Types (Unse)
// ============================================

export interface DaeunItem {
  age: number
  year?: number
  month?: number
  element?: string
  ganji?: string
  startAge?: number
  endAge?: number
  heavenlyStem?: string
  earthlyBranch?: string
}

export interface AnnualItem {
  year?: number
  month?: number
  element?: string
  ganji?: string
  startAge?: number
  endAge?: number
  name?: string
}

export interface MonthlyItem {
  year?: number
  month?: number
  element?: string
  ganji?: string
  startAge?: number
  endAge?: number
  name?: string
}

export interface UnseData {
  daeun?: DaeunItem[]
  annual?: AnnualItem[]
  monthly?: MonthlyItem[]
  iljin?: unknown[]
}

// ============================================
// Planet Types
// ============================================

export interface PlanetData {
  name: string
  sign?: string
  house?: number
  degree?: number
  longitude?: number
  latitude?: number
  speed?: number
  retrograde?: boolean
  [key: string]: unknown
}

// ============================================
// Aspect Types
// ============================================

export interface AspectData {
  planet1?: { name?: string }
  planet2?: { name?: string }
  type?: string
  aspect?: string
  from?: { name?: string }
  to?: { name?: string }
}

// ============================================
// Sinsal Types
// ============================================

export interface SinsalItem {
  name?: string
  stars?: string[]
}

export interface SinsalRecord {
  luckyList?: SinsalItem[]
  unluckyList?: SinsalItem[]
}

// ============================================
// Sibsin Types
// ============================================

export interface SibsinRelation {
  type?: string
  quality?: string
  description?: string
}

export interface SibsinDistribution {
  count?: Record<string, number>
  distribution?: Record<string, number>
  counts?: Record<string, number>
}

// ============================================
// Career & Analysis Types
// ============================================

export interface CareerAptitude {
  field?: string
  score?: number
}

export interface BranchInteraction {
  branch1?: string
  branch2?: string
  from?: string
  to?: string
  result?: string
}

// ============================================
// Advanced Analysis Types
// ============================================

export interface TuechulItem {
  element?: string
  stem?: string
  type?: string
}

export interface HoegukItem {
  type?: string
  name?: string
  resultElement?: string
}

// ============================================
// Astrology Advanced Types
// ============================================

export interface FixedStarItem {
  star?: string
  starName?: string
  planet?: string
  planetName?: string
  meaning?: string
}

export interface MidpointItem {
  planet1?: string
  planet2?: string
  sign?: string
  degree?: number
}

export interface TransitItem {
  type?: string
  aspectType?: string
  transitPlanet?: string
  natalPoint?: string
  from?: { name?: string }
  to?: { name?: string }
  planet1Name?: string
  planet2Name?: string
  orb?: string
  isApplying?: boolean
}

export interface AsteroidAspect {
  asteroid?: string
  from?: string
  type?: string
  aspect?: string
  planet?: string
  to?: string
  planet2?: { name?: string }
}

// ============================================
// Extra Point Types
// ============================================

export interface ExtraPointData {
  sign?: string
  house?: number | string
}

export interface ExtractedExtraPoints {
  chiron?: ExtraPointData
  lilith?: ExtraPointData
  vertex?: ExtraPointData
  partOfFortune?: ExtraPointData
}

export interface ExtractedAsteroids {
  ceres?: ExtraPointData
  pallas?: ExtraPointData
  juno?: ExtraPointData
  vesta?: ExtraPointData
  aspects?: AsteroidAspect[]
}

// ============================================
// Advanced Analysis Input Types
// ============================================

/**
 * Flexible type for advanced Saju analysis input.
 * Uses index signature to handle deeply nested optional properties
 * from external APIs without excessive type guards.
 */
export interface AdvancedAnalysisInput {
  extended?: {
    strength?: { level?: string; score?: number; rootCount?: number }
    geokguk?: { type?: string; description?: string }
    yongsin?: { primary?: string; secondary?: string; avoid?: string }
  }
  geokguk?: { type?: string; description?: string }
  yongsin?: {
    primary?: { element?: string }
    secondary?: { element?: string }
    avoid?: { element?: string }
  }
  sibsin?: SibsinDistribution & {
    dominantSibsin?: string[]
    dominant?: string
    primary?: string
    missingSibsin?: string[]
    missing?: string[]
    relationships?: SibsinRelation[]
    careerAptitudes?: CareerAptitude[]
  }
  hyeongchung?: {
    chung?: BranchInteraction[]
    hap?: BranchInteraction[]
    samhap?: { branches?: string[] }[]
  }
  healthCareer?: {
    health?: { vulnerabilities?: string[]; weakOrgans?: string[] }
    career?: { suitableFields?: string[]; aptitudes?: string[] }
  }
  score?: {
    total?: number
    overall?: number
    business?: number
    career?: number
    wealth?: number
    finance?: number
    health?: number
  }
  tonggeun?: { stem?: string; rootBranch?: string; strength?: string }
  tuechul?: TuechulItem[]
  hoeguk?: HoegukItem[]
  deukryeong?: { status?: string; type?: string; score?: number }
  ultraAdvanced?: {
    jonggeok?: { type?: string; name?: string }
    iljuAnalysis?: { character?: string; personality?: string }
    gongmang?: { branches?: string[]; emptyBranches?: string[] }
  }
  [key: string]: unknown
}

// ============================================
// Type Guards
// ============================================

export function isValidPillarData(data: unknown): data is PillarData {
  if (!data || typeof data !== 'object') {
    return false
  }
  return true
}

export function isValidUnseData(data: unknown): data is UnseData {
  if (!data || typeof data !== 'object') {
    return false
  }
  const obj = data as Record<string, unknown>
  return Array.isArray(obj.daeun) || Array.isArray(obj.annual) || Array.isArray(obj.monthly)
}

export function isValidSinsalRecord(data: unknown): data is SinsalRecord {
  if (!data || typeof data !== 'object') {
    return false
  }
  const obj = data as Record<string, unknown>
  return Array.isArray(obj.luckyList) || Array.isArray(obj.unluckyList)
}
