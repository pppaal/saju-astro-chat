/**
 * Type definitions for compatibility API
 * Replaces Record<string, unknown> with specific types
 */

export interface TimingData extends Record<string, unknown> {
  score: number
  period: string
  recommendation: string
  favorablePeriods?: Array<{
    startDate: string
    endDate: string
    reason: string
  }>
}

export interface GroupAnalysisData extends Record<string, unknown> {
  groupDynamics: {
    cohesion: number
    conflicts: string[]
    strengths: string[]
  }
  subgroupPatterns: Array<{
    members: number[]
    pattern: string
    compatibility: number
  }>
  recommendations: string[]
}

export interface SynergyBreakdown extends Record<string, unknown> {
  pairwiseScores: Record<string, number>
  elementalBalance: {
    wood: number
    fire: number
    earth: number
    metal: number
    water: number
  }
  energyFlow: string
  warnings: string[]
}

export interface CompatibilityData {
  report: string
  model: string
  overall_score: number
  timing: TimingData | null
  action_items: string[]
}

/**
 * Backend response can have multiple formats:
 * 1. Nested format with data object
 * 2. Flat format with direct fields
 * 3. Group analysis format
 */
export type CompatibilityBackendResponse =
  | {
      // Nested format
      data?: CompatibilityData
      interpretation?: string
      model?: string
      overall_score?: number
      timing?: TimingData | null
      action_items?: string[]
      is_group?: false
    }
  | {
      // Flat format (extends CompatibilityData)
      report: string
      model: string
      overall_score: number
      timing: TimingData | null
      action_items: string[]
      interpretation?: string
      is_group?: false
    }
  | {
      // Group analysis format
      is_group: true
      group_analysis: GroupAnalysisData
      synergy_breakdown: SynergyBreakdown
      overall_score: number
      report?: string
      model?: string
      action_items?: string[]
      interpretation?: string
    }

export type Relation = 'lover' | 'friend' | 'other'

export interface PersonInput {
  name?: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  gender?: 'male' | 'female' | 'other' | 'prefer_not' | 'M' | 'F' | 'Male' | 'Female'
  city: string
  latitude: number
  longitude: number
  timeZone: string // e.g., Asia/Seoul
  relationToP1?: Relation
  relationNoteToP1?: string
}
