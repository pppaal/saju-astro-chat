import type { CalculationDetails, QualityAudit } from '@/lib/destiny-matrix/ai-report/qualityAudit'
import type {
  AdapterPersonModel,
  AdapterSingleSubjectView,
} from '@/lib/destiny-matrix/core/adaptersTypes'
import type { InterpretedAnswerContract } from '@/lib/destiny-matrix/interpretedAnswer'

export interface ReportProfileInput {
  name: string
  birthDate: string
  birthTime: string
  gender?: 'M' | 'F'
  birthCity?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

export interface ReportSection {
  title: string
  content: string
}

export interface GraphRAGEvidenceAnchor {
  id: string
  section: string
  sajuEvidence: string
  astrologyEvidence: string
  crossConclusion: string
  crossEvidenceSets?: Array<{
    id: string
    astrologyEvidence: string
    sajuEvidence: string
    overlapDomains?: string[]
    overlapScore?: number
    combinedConclusion?: string
  }>
}

export interface GraphRAGEvidenceBundle {
  mode: 'comprehensive' | 'timing' | 'themed'
  theme?: string
  period?: string
  anchors: GraphRAGEvidenceAnchor[]
}

export interface PremiumReportData {
  id: string
  type: 'timing' | 'themed' | 'comprehensive'
  title: string
  summary: string
  createdAt: string
  period?: string
  theme?: string
  score?: number
  grade?: string
  sections: ReportSection[]
  keywords?: string[]
  insights?: Array<{ title: string; content: string }>
  actionItems?: string[]
  qualityAudit?: QualityAudit
  calculationDetails?: CalculationDetails
  graphRagEvidence?: GraphRAGEvidenceBundle
  singleSubjectView?: AdapterSingleSubjectView
  personModel?: AdapterPersonModel
  interpretedAnswer?: InterpretedAnswerContract
  fullData?: Record<string, unknown>
}
