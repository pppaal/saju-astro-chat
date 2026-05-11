/**
 * Family Lineage Analysis Types
 * Extracted from familyLineage.ts for better organization
 */

// 간소화된 사주 결과 인터페이스
interface SimplePillar {
  stem: string
  branch: string
}

interface SimpleFourPillars {
  year: SimplePillar
  month: SimplePillar
  day: SimplePillar
  hour: SimplePillar
}

export interface SajuResult {
  fourPillars: SimpleFourPillars
  dayMaster?: string
  [key: string]: unknown
}

export type FamilyRole =
  | 'father'
  | 'mother'
  | 'self'
  | 'spouse'
  | 'child'
  | 'sibling'
  | 'grandparent'
export type RelationType = 'parent_child' | 'spouse' | 'sibling' | 'grandparent_grandchild'

export interface FamilyMember {
  id: string
  name: string
  role: FamilyRole
  birthDate: Date
  gender: 'male' | 'female'
  saju?: SajuResult
}

export interface FamilyRelation {
  member1Id: string
  member2Id: string
  relationType: RelationType
  compatibility: FamilyCompatibilityAnalysis
}

export interface FamilyCompatibilityAnalysis {
  overallScore: number // 0-100
  elementHarmony: ElementHarmonyResult
  stemRelation: StemRelationResult
  branchRelation: BranchRelationResult
  roleHarmony: RoleHarmonyResult
  inheritedTraits: InheritedTrait[]
  conflictPoints: ConflictPoint[]
  blessings: string[]
  cautions: string[]
}

export interface ElementHarmonyResult {
  dominant1: string
  dominant2: string
  relation: '상생' | '상극' | '비화' | '균형'
  score: number
  description: string
}

export interface StemRelationResult {
  dayMasterRelation: string
  合: string[] // 합
  沖: string[] // 충
  score: number
}

export interface BranchRelationResult {
  三合: string[]
  六合: string[]
  沖: string[]
  刑: string[]
  score: number
}

export interface RoleHarmonyResult {
  expectedRole: string
  actualEnergy: string
  alignment: 'strong' | 'moderate' | 'weak' | 'conflict'
  suggestions: string[]
}

export interface InheritedTrait {
  trait: string
  source: 'father' | 'mother' | 'both' | 'unique'
  element: string
  manifestation: string
  strength: 'strong' | 'moderate' | 'latent'
}

export interface ConflictPoint {
  area: string
  severity: 'major' | 'minor' | 'latent'
  members: string[]
  resolution: string
}

export interface GenerationalPattern {
  pattern: string
  description: string
  affectedElements: string[]
  manifestation: string
  karmaType: 'positive' | 'negative' | 'transformative'
}

export interface FamilyDynamic {
  overallHarmony: number
  dominantElement: string
  weakElement: string
  familyKarma: string[]
  generationalPatterns: GenerationalPattern[]
  collectiveLessons: string[]
  strengthenFamily: string[]
}

export interface SiblingAnalysis {
  birthOrderInfluence: string
  elementDistribution: Record<string, number>
  conflictPotential: string[]
  cooperationAreas: string[]
  inheritancePatterns: string[]
}

export interface ParentChildAnalysis {
  nurturingStyle: string
  learningStyle: string
  communicationGap: string[]
  growthOpportunities: string[]
  karmicLessons: string[]
  supportStrategies: string[]
}

export interface SpouseAnalysis {
  marriageQuality: string
  complementaryAspects: string[]
  frictionAreas: string[]
  growthTogether: string[]
  yearlyForecast: { year: number; theme: string }[]
}
