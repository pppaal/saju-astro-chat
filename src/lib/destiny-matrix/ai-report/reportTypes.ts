// src/lib/destiny-matrix/ai-report/reportTypes.ts
// AI 리포트 타입 정의

import type { InsightDomain } from '../interpreter/types'
import type { GraphRAGEvidenceBundle } from './graphRagEvidence'

export type AIUserPlan = 'free' | 'starter' | 'pro' | 'premium'

export interface AIPremiumReport {
  id: string
  generatedAt: string
  lang: 'ko' | 'en'

  // 기본 정보
  profile: {
    name?: string
    birthDate?: string
    dayMaster: string
    dominantElement: string
    geokguk?: string
  }

  // AI 생성 섹션
  sections: {
    introduction: string // 인트로: 전체 운명 요약
    personalityDeep: string // 성격 심층 분석
    careerPath: string // 커리어 경로 & 적성
    relationshipDynamics: string // 관계 역학
    wealthPotential: string // 재물운 & 재테크 조언
    healthGuidance: string // 건강 가이드
    lifeMission: string // 인생 사명 & 영적 성장
    timingAdvice: string // 타이밍 조언 (대운/세운)
    actionPlan: string // 실천 가이드
    conclusion: string // 마무리 메시지
  }

  // GraphRAG evidence anchors used to ground generated sections
  graphRagEvidence?: GraphRAGEvidenceBundle

  // 원본 매트릭스 데이터 참조
  matrixSummary: {
    overallScore: number
    grade: string
    topInsights: string[]
    keyStrengths: string[]
    keyChallenges: string[]
  }

  // 메타데이터
  meta: {
    modelUsed: string
    tokensUsed?: number
    processingTime?: number
    reportVersion: string
  }
}

export interface AIReportGenerationOptions {
  name?: string
  birthDate?: string
  lang?: 'ko' | 'en'
  userPlan?: AIUserPlan
  focusDomain?: InsightDomain
  detailLevel?: 'standard' | 'detailed' | 'comprehensive'
  bilingual?: boolean
  targetChars?: number
  tone?: 'friendly' | 'realistic'
  theme?: string
  graphRagEvidencePrompt?: string
}
