// src/lib/destiny-matrix/ai-report/reportTypes.ts
// AI 리포트 타입 정의

import type { InsightDomain } from '../interpreter/types'
import type { MatrixSummary } from '../types'
import type { GraphRAGEvidenceBundle } from './graphRagEvidence'
import type { CrossConsistencyAudit } from './crossConsistencyAudit'
import type { DeterministicCoreOutput } from './deterministicCore'
import type { DeterministicProfile } from './deterministicCoreConfig'
import type {
  TimingData,
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedEvidenceLink,
  UnifiedParaEvidenceRef,
  UnifiedReportMeta,
  UnifiedScores,
  UnifiedScenarioBundle,
  UnifiedSelectedSignal,
  UnifiedTimelineEvent,
  UnifiedTimeWindow,
  TopMatchedPattern,
} from './types'
import type { SignalSynthesisResult } from './signalSynthesizer'
import type { SectionEvidenceRefs } from './evidenceRefs'
import type { StrategyEngineResult } from './strategyEngine'
import type { PatternResult } from '@/lib/destiny-matrix/core/patternEngine'
import type { ScenarioResult } from '@/lib/destiny-matrix/core/scenarioEngine'

export type AIUserPlan = 'free' | 'starter' | 'pro' | 'premium'

export interface AIPremiumReport {
  id: string
  generatedAt: string
  lang: 'ko' | 'en'
  focusDomain?: string
  topDecisionId?: string | null
  topDecisionLabel?: string | null
  riskControl?: string
  reportMeta: UnifiedReportMeta
  timeWindow: UnifiedTimeWindow
  scores: UnifiedScores
  claims: UnifiedClaim[]
  selectedSignals: UnifiedSelectedSignal[]
  anchors: UnifiedAnchor[]
  evidenceLinks: UnifiedEvidenceLink[]
  coreHash?: string
  patterns?: PatternResult[]
  topMatchedPatterns?: TopMatchedPattern[]
  scenarios?: ScenarioResult[]
  timelineEvents: UnifiedTimelineEvent[]
  scenarioBundles?: UnifiedScenarioBundle[]

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
  graphRagSummary?: {
    topInsights: string[]
    drivers: string[]
    cautions: string[]
    trust: {
      avgOverlapScore: number
      avgOrbFitScore: number
      highTrustSetCount: number
      lowTrustSetCount: number
      totalSets: number
    }
    cautionSections: string[]
  }
  evidenceRefs: SectionEvidenceRefs
  evidenceRefsByPara?: Record<string, UnifiedParaEvidenceRef>

  // Cross consistency audit metadata
  crossConsistencyAudit?: CrossConsistencyAudit

  // Pre-rendered narrative payload for downstream AI/chat reuse
  renderedMarkdown?: string
  renderedText?: string
  deterministicCore?: DeterministicCoreOutput

  // 원본 매트릭스 데이터 참조
  matrixSummary: {
    overallScore: number
    grade: string
    topInsights: string[]
    keyStrengths: string[]
    keyChallenges: string[]
  }
  signalSynthesis?: SignalSynthesisResult
  strategyEngine?: StrategyEngineResult

  // 메타데이터
  meta: {
    modelUsed: string
    tokensUsed?: number
    processingTime?: number
    reportVersion: string
    qualityMetrics?: {
      sectionCount: number
      avgSectionChars: number
      evidenceCoverageRatio: number
      minEvidenceSatisfiedRatio: number
      contradictionCount: number
      recheckGuidanceRatio: number
      overclaimCount: number
      coreQualityScore?: number
      coreQualityGrade?: 'A' | 'B' | 'C' | 'D'
      coreQualityWarningCount?: number
      coreQualityWarnings?: string[]
      coreQualityBlockingWarningCount?: number
      coreQualityBlockingWarnings?: string[]
      coreQualityPass?: boolean
      sectionCompletenessRate?: number
      avgEvidencePerParagraph?: number
      anchorCoverageRate?: number
      scenarioBundleCoverage?: number
      eventCountByDomain?: Record<string, number>
      tokenIntegrityPass?: boolean
      structurePass?: boolean
      forbiddenAdditionsPass?: boolean
    }
  }
}

export interface AIReportGenerationOptions {
  name?: string
  birthDate?: string
  lang?: 'ko' | 'en'
  userPlan?: AIUserPlan
  deterministicOnly?: boolean
  focusDomain?: InsightDomain
  detailLevel?: 'standard' | 'detailed' | 'comprehensive'
  bilingual?: boolean
  targetChars?: number
  tone?: 'friendly' | 'realistic'
  theme?: string
  graphRagEvidencePrompt?: string
  userQuestion?: string
  deterministicCorePrompt?: string
  deterministicProfile?: DeterministicProfile
  timingData?: TimingData
  matrixSummary?: MatrixSummary
}
