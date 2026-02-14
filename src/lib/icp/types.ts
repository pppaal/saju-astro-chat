export type ICPQuizAnswers = Record<string, string>

export type ICPOctantCode = 'PA' | 'BC' | 'DE' | 'FG' | 'HI' | 'JK' | 'LM' | 'NO'

export interface ICPOctant {
  code: ICPOctantCode
  emoji: string
  name: string
  korean: string
  traits: string[]
  traitsKo: string[]
  shadow: string
  shadowKo: string
  dominance: number
  affiliation: number
  description: string
  descriptionKo: string
  therapeuticQuestions: string[]
  therapeuticQuestionsKo: string[]
  growthRecommendations: string[]
  growthRecommendationsKo: string[]
}

export interface ICPAnalysis {
  dominanceScore: number
  affiliationScore: number
  dominanceNormalized: number
  affiliationNormalized: number
  boundaryScore?: number
  resilienceScore?: number
  octantScores: Record<ICPOctantCode, number>
  primaryStyle: ICPOctantCode
  secondaryStyle: ICPOctantCode | null
  primaryOctant: ICPOctant
  secondaryOctant: ICPOctant | null
  summary: string
  summaryKo: string
  consistencyScore: number
  confidence?: number
  confidenceLevel?: 'high' | 'medium' | 'low'
  testVersion?: string
  resultId?: string
  explainability?: {
    topAxes: Array<{ axis: string; score: number; interpretation: string }>
    lowAxes: Array<{ axis: string; score: number; interpretation: string }>
    evidence: Array<{
      questionId: string
      axis: string
      answer: number
      reverse: boolean
      reason: string
    }>
    note: string
  }
}

export interface ICPCompatibility {
  person1Style: ICPOctantCode
  person2Style: ICPOctantCode
  score: number
  level: string
  levelKo: string
  description: string
  descriptionKo: string
  dynamics: {
    strengths: string[]
    strengthsKo: string[]
    challenges: string[]
    challengesKo: string[]
    tips: string[]
    tipsKo: string[]
  }
}

export interface PersonaAxisData {
  energy: { score: number; pole: string }
  cognition: { score: number; pole: string }
  decision: { score: number; pole: string }
  rhythm: { score: number; pole: string }
}

export interface CrossSystemCompatibility {
  score: number
  level: string
  levelKo: string
  description: string
  descriptionKo: string
  insights: string[]
  insightsKo: string[]
}

export interface PersonaCompatibilityResult {
  score: number
  level: string
  levelKo: string
  description: string
  descriptionKo: string
  synergies: string[]
  synergiesKo: string[]
  tensions: string[]
  tensionsKo: string[]
}
