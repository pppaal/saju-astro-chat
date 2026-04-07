import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'
import type { TimelineTone } from './routeActionPlanCommon'

export type SlotType =
  | 'deepWork'
  | 'decision'
  | 'communication'
  | 'money'
  | 'relationship'
  | 'recovery'

export type SlotWhy = {
  signalIds: string[]
  anchorIds: string[]
  patterns: string[]
  summary: string
}

export type TimelineSlot = {
  hour: number
  minute?: number
  label?: string
  note: string
  tone?: TimelineTone
  slotTypes?: SlotType[]
  why?: SlotWhy
  guardrail?: string
  evidenceSummary?: string[]
  confidence?: number
  confidenceReason?: string[]
  source?: 'rule' | 'rag' | 'hybrid'
}

type CalendarEvidence = {
  matrix?: {
    domain?: 'career' | 'love' | 'money' | 'health' | 'move' | 'general'
    finalScoreAdjusted?: number
    overlapStrength?: number
    peakLevel?: 'peak' | 'high' | 'normal'
    monthKey?: string
  }
  cross?: {
    sajuEvidence?: string
    astroEvidence?: string
    sajuDetails?: string[]
    astroDetails?: string[]
    bridges?: string[]
  }
  confidence?: number
  source?: 'rule' | 'rag' | 'hybrid'
  matrixVerdict?: {
    focusDomain?: string
    verdict?: string
    guardrail?: string
    topClaim?: string
    topAnchorSummary?: string
    phase?: string
    attackPercent?: number
    defensePercent?: number
  }
  matrixPacket?: {
    focusDomain?: string
    graphRagEvidenceSummary?: {
      totalAnchors?: number
      totalSets?: number
    }
    topAnchors?: Array<{
      id?: string
      section?: string
      summary?: string
      setCount?: number
    }>
    topClaims?: Array<{
      id?: string
      text?: string
      domain?: string
      signalIds?: string[]
      anchorIds?: string[]
    }>
    scenarioBriefs?: Array<{
      id?: string
      domain?: string
      mainTokens?: string[]
      altTokens?: string[]
    }>
    selectedSignals?: Array<{
      id?: string
      domain?: string
      polarity?: string
      summary?: string
      score?: number
    }>
    strategyBrief?: {
      overallPhase?: string
      overallPhaseLabel?: string
      attackPercent?: number
      defensePercent?: number
    }
  }
}

export type ActionPlanCalendarContext = {
  grade?: number
  displayGrade?: number
  score?: number
  displayScore?: number
  categories?: string[]
  bestTimes?: string[]
  warnings?: string[]
  recommendations?: string[]
  sajuFactors?: string[]
  astroFactors?: string[]
  summary?: string
  canonicalCore?: Partial<CalendarCoreAdapterResult>
  evidence?: CalendarEvidence
} | null

export type ActionPlanInsights = {
  ifThenRules: string[]
  situationTriggers: string[]
  actionFramework: {
    do: string[]
    dont: string[]
    alternative: string[]
  }
  riskTriggers: string[]
  successKpi: string[]
  deltaToday: string
}

export type ActionPlanIcpProfile =
  | {
      primaryStyle?: string
      secondaryStyle?: string | null
      dominanceScore?: number
      affiliationScore?: number
      summary?: string
      traits?: string[]
    }
  | null
  | undefined

export type ActionPlanPersonaProfile =
  | {
      typeCode?: string
      personaName?: string
      summary?: string
      strengths?: string[]
      challenges?: string[]
      guidance?: string
      motivations?: string[]
      axes?: Record<string, { pole: string; score: number }>
    }
  | null
  | undefined

export type MatrixEvidencePacket = NonNullable<NonNullable<CalendarEvidence['matrixPacket']>>

export const SLOT_TYPE_DOMAIN_HINTS: Record<SlotType, string[]> = {
  deepWork: ['career', 'personality'],
  decision: ['career', 'timing'],
  communication: ['relationship', 'timing'],
  money: ['wealth'],
  relationship: ['relationship'],
  recovery: ['health', 'timing'],
}
