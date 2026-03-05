// src/lib/destiny-matrix/ai-report/types.ts
// Destiny Fusion Matrix - AI Premium Report Types

import type { InsightDomain } from '../interpreter/types'
import type { GraphRAGEvidenceBundle } from './graphRagEvidence'
import type { CrossConsistencyAudit } from './crossConsistencyAudit'
import type { DeterministicCoreOutput } from './deterministicCore'
import type { SectionEvidenceRefs } from './evidenceRefs'
import type { StrategyEngineResult } from './strategyEngine'

// ===========================
// 기간별/테마별 옵션
// ===========================

export type ReportPeriod = 'daily' | 'monthly' | 'yearly' | 'comprehensive'

export type ReportTheme = 'love' | 'career' | 'wealth' | 'health' | 'family'

// ===========================
// 크레딧 비용 설정
// ===========================

export const REPORT_CREDIT_COSTS: Record<ReportPeriod | ReportTheme | 'themed', number> = {
  // 타이밍 리포트
  daily: 2, // 1 → 2
  monthly: 3, // 2 → 3
  yearly: 5, // 3 → 5
  comprehensive: 7, // 3 → 7

  // 테마별 리포트
  themed: 3, // 2 → 3 (기본)
  love: 3,
  career: 3,
  wealth: 3,
  health: 3,
  family: 3,
}

// ===========================
// 확장된 리포트 옵션
// ===========================

export interface ExtendedReportOptions {
  // 기본 옵션
  name?: string
  birthDate?: string
  lang?: 'ko' | 'en'

  // 기간별 옵션
  period?: ReportPeriod
  targetDate?: string // ISO 형식, 기본값 오늘

  // 테마별 옵션
  theme?: ReportTheme

  // 기존 호환
  focusDomain?: InsightDomain
  detailLevel?: 'standard' | 'detailed' | 'comprehensive'
}

// ===========================
// 타이밍 리포트 섹션
// ===========================

export interface TimingReportSections {
  overview: string // 기간 총평
  energy: string // 에너지 흐름
  opportunities: string // 기회 시기
  cautions: string // 주의 시기
  domains: {
    // 영역별 분석
    career: string
    love: string
    wealth: string
    health: string
  }
  actionPlan: string // 실천 가이드
  luckyElements?: string // 행운 요소 (색상, 방향, 숫자 등)
}

// ===========================
// 테마별 리포트 섹션
// ===========================

export interface ThemedReportSections {
  deepAnalysis: string // 심층 분석
  patterns: string // 패턴 분석
  timing: string // 테마별 타이밍
  compatibility?: string // 궁합 (love)
  spouseProfile?: string // 배우자상/이상형 (love)
  marriageTiming?: string // 결혼 타이밍 (love)
  strategy?: string // 전략 (career/wealth)
  roleFit?: string // 직무 적합/포지션 핏 (career)
  turningPoints?: string // 전환점 분석 (career)
  incomeStreams?: string // 수입원 다각화 (wealth)
  riskManagement?: string // 리스크 관리 (wealth)
  prevention?: string // 예방 (health)
  riskWindows?: string // 건강 위험 구간 (health)
  recoveryPlan?: string // 회복 루틴 (health)
  dynamics?: string // 역학 (family)
  communication?: string // 가족 소통 방식 (family)
  legacy?: string // 가족 유산/세대 과제 (family)
  recommendations: string[] // 추천 사항
  actionPlan: string // 실천 가이드
}

// ===========================
// 타이밍 데이터 구조
// ===========================

export interface TimingData {
  daeun?: {
    heavenlyStem: string
    earthlyBranch: string
    element: string
    startAge: number
    endAge: number
    isCurrent: boolean
  }
  seun?: {
    year: number
    heavenlyStem: string
    earthlyBranch: string
    element: string
  }
  wolun?: {
    month: number
    heavenlyStem: string
    earthlyBranch: string
    element: string
  }
  iljin?: {
    date: string
    heavenlyStem: string
    earthlyBranch: string
    element: string
  }
}

// ===========================
// 타이밍 AI 프리미엄 리포트
// ===========================

export interface TimingAIPremiumReport {
  id: string
  generatedAt: string
  lang: 'ko' | 'en'

  // 기본 정보
  profile: {
    name?: string
    birthDate?: string
    dayMaster: string
    dominantElement: string
  }

  // 기간 정보
  period: ReportPeriod
  targetDate: string
  periodLabel: string // "2026년 1월 21일" 또는 "2026년 1월" 또는 "2026년"

  // 타이밍 데이터
  timingData: TimingData

  // AI 생성 섹션
  sections: TimingReportSections

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

  // Cross consistency audit metadata
  crossConsistencyAudit?: CrossConsistencyAudit

  // Pre-rendered narrative payload for downstream AI/chat reuse
  renderedMarkdown?: string
  renderedText?: string
  deterministicCore?: DeterministicCoreOutput
  strategyEngine?: StrategyEngineResult

  // 점수
  periodScore: {
    overall: number
    career: number
    love: number
    wealth: number
    health: number
  }

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
    }
  }
}

// ===========================
// 테마별 AI 프리미엄 리포트
// ===========================

export interface ThemedAIPremiumReport {
  id: string
  generatedAt: string
  lang: 'ko' | 'en'

  // 기본 정보
  profile: {
    name?: string
    birthDate?: string
    dayMaster: string
    dominantElement: string
  }

  // 테마 정보
  theme: ReportTheme
  themeLabel: string // "사랑 & 연애" 등
  themeEmoji: string // "💕" 등

  // AI 생성 섹션
  sections: ThemedReportSections

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

  // Cross consistency audit metadata
  crossConsistencyAudit?: CrossConsistencyAudit

  // Pre-rendered narrative payload for downstream AI/chat reuse
  renderedMarkdown?: string
  renderedText?: string
  deterministicCore?: DeterministicCoreOutput
  strategyEngine?: StrategyEngineResult

  // 테마별 점수
  themeScore: {
    overall: number
    potential: number // 잠재력
    timing: number // 타이밍
    compatibility: number // 조화도
  }

  // 핵심 키워드
  keywords: string[]

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
    }
  }
}

// ===========================
// 테마 메타데이터
// ===========================

export const THEME_META: Record<
  ReportTheme,
  {
    label: { ko: string; en: string }
    emoji: string
    color: string
    description: { ko: string; en: string }
  }
> = {
  love: {
    label: { ko: '사랑 & 연애', en: 'Love & Romance' },
    emoji: '💕',
    color: 'pink',
    description: {
      ko: '연애운, 배우자 성향, 만남 시기, 궁합 분석',
      en: 'Romance, partner traits, meeting timing, compatibility',
    },
  },
  career: {
    label: { ko: '커리어 & 직업', en: 'Career & Work' },
    emoji: '💼',
    color: 'blue',
    description: {
      ko: '직업 적성, 성공 패턴, 사업운, 승진 시기',
      en: 'Career aptitude, success patterns, business luck, promotion timing',
    },
  },
  wealth: {
    label: { ko: '재물 & 금전', en: 'Wealth & Money' },
    emoji: '💰',
    color: 'amber',
    description: {
      ko: '재물운, 투자 성향, 재테크 전략, 금전 흐름',
      en: 'Wealth luck, investment style, financial strategy, money flow',
    },
  },
  health: {
    label: { ko: '건강 & 웰빙', en: 'Health & Wellness' },
    emoji: '💪',
    color: 'green',
    description: {
      ko: '건강 취약점, 오행 균형, 예방법, 활력 관리',
      en: 'Health vulnerabilities, element balance, prevention, vitality',
    },
  },
  family: {
    label: { ko: '가족 & 관계', en: 'Family & Relationships' },
    emoji: '👨‍👩‍👧‍👦',
    color: 'purple',
    description: {
      ko: '가족 관계, 부모/자녀운, 소통 방법, 화합 포인트',
      en: 'Family dynamics, parent/child fortune, communication, harmony',
    },
  },
}

// ===========================
// 기간 메타데이터
// ===========================

export const PERIOD_META: Record<
  ReportPeriod,
  {
    label: { ko: string; en: string }
    emoji: string
    description: { ko: string; en: string }
    creditCost: number
  }
> = {
  daily: {
    label: { ko: '오늘 운세', en: "Today's Fortune" },
    emoji: '☀️',
    description: {
      ko: '오늘 하루의 에너지 흐름과 행동 가이드',
      en: "Today's energy flow and action guide",
    },
    creditCost: 2,
  },
  monthly: {
    label: { ko: '이번달 운세', en: 'Monthly Fortune' },
    emoji: '📅',
    description: {
      ko: '이번달 주요 흐름과 주차별 포인트',
      en: 'This month major trends and weekly highlights',
    },
    creditCost: 3,
  },
  yearly: {
    label: { ko: '올해 운세', en: 'Yearly Fortune' },
    emoji: '🗓️',
    description: {
      ko: '올해 전체 흐름과 월별 예측',
      en: 'This year overall flow and monthly forecast',
    },
    creditCost: 5,
  },
  comprehensive: {
    label: { ko: '종합 리포트', en: 'Comprehensive Report' },
    emoji: '📜',
    description: {
      ko: '전체 운명 분석과 인생 가이드',
      en: 'Full destiny analysis and life guide',
    },
    creditCost: 7,
  },
}
