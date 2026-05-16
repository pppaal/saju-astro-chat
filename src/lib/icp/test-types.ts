export type IcpAxisKey = 'agency' | 'warmth' | 'boundary' | 'resilience'

export type IcpLikertValue = 1 | 2 | 3 | 4 | 5

export type IcpAnswers = Record<string, IcpLikertValue | string>

export interface IcpQuestion {
  id: string
  axis: IcpAxisKey
  text: string
  textKo: string
  reverse?: boolean
}

export interface IcpAxisSummary {
  score: number
  interpretation: string
}

export type IcpArchetypeCode = 'PA' | 'BC' | 'DE' | 'FG' | 'HI' | 'JK' | 'LM' | 'NO'

export interface IcpExplainabilityItem {
  questionId: string
  axis: IcpAxisKey
  answer: IcpLikertValue
  reverse: boolean
  reason: string
}

export interface IcpExplainability {
  topAxes: Array<{ axis: IcpAxisKey; score: number; interpretation: string }>
  lowAxes: Array<{ axis: IcpAxisKey; score: number; interpretation: string }>
  evidence: IcpExplainabilityItem[]
  note: string
}

export interface IcpResult {
  testVersion: 'icp_v2'
  resultId: string
  primaryStyle: IcpArchetypeCode
  secondaryStyle: IcpArchetypeCode | null
  axes: Record<IcpAxisKey, number>
  dominanceScore: number
  affiliationScore: number
  octantScores: Record<IcpArchetypeCode, number>
  confidence: number
  confidenceLevel: 'high' | 'medium' | 'low'
  completionSeconds?: number
  missingAnswerCount: number
  summaryKo: string
  summaryEn: string
  explainability: IcpExplainability
}

export interface IcpHybridResult {
  id: string
  nameKo: string
  descriptionKo: string
  guidance: string[]
  blindspots: string[]
  fallback: boolean
}

export interface CounselingBrief {
  user_archetype: { id: string; name_ko: string }
  axes: Array<{ name: IcpAxisKey; score: number; interpretation: string }>
  hybrid_archetype: { id: string; name_ko: string; fallback?: boolean }
  confidence: { score: number; level: 'high' | 'medium' | 'low' }
  key_strengths: string[]
  key_blindspots: string[]
  what_user_wants?: string
  disclaimer: string
}
