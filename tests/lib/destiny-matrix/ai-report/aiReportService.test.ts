// tests/lib/destiny-matrix/ai-report/aiReportService.test.ts
// Comprehensive tests for AI Report Service with mocked aiBackend

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { FiveElement } from '@/lib/Saju/types'

// Mock aiBackend module
vi.mock('@/lib/destiny-matrix/ai-report/aiBackend', () => ({
  callAIBackend: vi.fn(),
  callAIBackendGeneric: vi.fn(),
}))

import { generateAIPremiumReport } from '@/lib/destiny-matrix/ai-report/aiReportService'
import { callAIBackend } from '@/lib/destiny-matrix/ai-report/aiBackend'

const mockCallAIBackend = callAIBackend as ReturnType<typeof vi.fn>

// ===========================
// Mock Data Helpers
// ===========================

function createMockInput(): MatrixCalculationInput {
  return {
    dayMasterElement: '목' as FiveElement,
    dominantWesternElement: 'Earth',
    lang: 'ko',
    geokguk: '종격',
    yongsin: '화' as FiveElement,
    sibsinDistribution: {
      비견: 2,
      식신: 3,
    },
    shinsalList: ['천을귀인'],
    currentDaeunElement: '화' as FiveElement,
  } as MatrixCalculationInput
}

function createMockReport(): FusionReport {
  return {
    id: 'report_1',
    generatedAt: new Date(),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '목' as FiveElement,
      dayMasterDescription: '목 에너지',
      dominantSibsin: [],
      keyShinsals: [],
    },
    overallScore: {
      total: 75,
      grade: 'A',
      gradeDescription: '훌륭한 조화',
      gradeDescriptionEn: 'Excellent harmony',
      categoryScores: {
        strength: 80,
        opportunity: 70,
        balance: 75,
        caution: 65,
        challenge: 60,
      },
    },
    topInsights: [],
    domainAnalysis: [],
    timingAnalysis: {
      currentPeriod: {
        name: '현재 운세',
        nameEn: 'Current Fortune',
        score: 70,
        description: '좋은 흐름',
        descriptionEn: 'Good flow',
      },
      activeTransits: [],
      upcomingPeriods: [],
      retrogradeAlerts: [],
    },
    visualizations: {
      radarChart: { labels: [], labelsEn: [], values: [], maxValue: 100 },
      heatmap: { rows: [], cols: [], values: [], colorScale: [] },
      synergyNetwork: { nodes: [], edges: [] },
      timeline: { events: [] },
    },
  }
}

// ===========================
// Mock AI Backend Response
// ===========================

function mockSuccessfulAIResponse() {
  mockCallAIBackend.mockResolvedValue({
    sections: {
      introduction: '인트로 내용',
      personalityDeep: '성격 분석',
      careerPath: '커리어 분석',
      relationshipDynamics: '관계 분석',
      wealthPotential: '재물 분석',
      healthGuidance: '건강 가이드',
      lifeMission: '인생 사명',
      timingAdvice: '타이밍 조언',
      actionPlan: '실천 가이드',
      conclusion: '결론',
    },
    model: 'gpt-4o',
    tokensUsed: 1500,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSuccessfulAIResponse()
})

// ===========================
// Tests: generateAIPremiumReport
// ===========================

describe('generateAIPremiumReport - Basic Generation', () => {
  it('should generate AI premium report successfully', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport)

    expect(result).toBeDefined()
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('generatedAt')
    expect(result).toHaveProperty('lang', 'ko')
    expect(result).toHaveProperty('profile')
    expect(result).toHaveProperty('sections')
    expect(result).toHaveProperty('matrixSummary')
    expect(result).toHaveProperty('meta')
  })

  it('should generate report in English', async () => {
    const input = createMockInput()
    input.lang = 'en'
    const matrixReport = createMockReport()
    matrixReport.lang = 'en'

    const result = await generateAIPremiumReport(input, matrixReport, { lang: 'en' })

    expect(result.lang).toBe('en')
  })

  it('should include all 10 sections', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport)

    expect(result.sections).toHaveProperty('introduction')
    expect(result.sections).toHaveProperty('personalityDeep')
    expect(result.sections).toHaveProperty('careerPath')
    expect(result.sections).toHaveProperty('relationshipDynamics')
    expect(result.sections).toHaveProperty('wealthPotential')
    expect(result.sections).toHaveProperty('healthGuidance')
    expect(result.sections).toHaveProperty('lifeMission')
    expect(result.sections).toHaveProperty('timingAdvice')
    expect(result.sections).toHaveProperty('actionPlan')
    expect(result.sections).toHaveProperty('conclusion')
  })

  it('should include profile information', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport, {
      name: '홍길동',
      birthDate: '1990-05-15',
    })

    expect(result.profile).toBeDefined()
    expect(result.profile.name).toBe('홍길동')
    expect(result.profile.birthDate).toBe('1990-05-15')
  })

  it('should include matrix summary', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport)

    expect(result.matrixSummary).toBeDefined()
    expect(result.matrixSummary.overallScore).toBe(75)
    expect(result.matrixSummary.grade).toBe('A')
  })

  it('should include metadata', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport)

    expect(result.meta).toBeDefined()
    expect(result.meta.modelUsed).toBe('gpt-4o')
    expect(result.meta.tokensUsed).toBe(1500)
    expect(result.meta.processingTime).toBeGreaterThan(0)
  })
})

describe('generateAIPremiumReport - Options', () => {
  it('should handle focus domain option', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport, {
      focusDomain: 'career',
    })

    expect(callAIBackend).toHaveBeenCalled()
    expect(result).toBeDefined()
  })

  it('should handle detail level option', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport, {
      detailLevel: 'comprehensive',
    })

    expect(result).toBeDefined()
  })

  it('should handle themed report', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport, {
      theme: 'business',
    })

    expect(result).toBeDefined()
  })

  it('should handle comprehensive theme', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport, {
      theme: 'comprehensive',
    })

    expect(result).toBeDefined()
  })
})

describe('generateAIPremiumReport - Error Handling', () => {
  it('should handle fetch error', async () => {
    mockCallAIBackend.mockRejectedValue(new Error('AI Backend failed'))

    const input = createMockInput()
    const matrixReport = createMockReport()

    await expect(generateAIPremiumReport(input, matrixReport)).rejects.toThrow()
  })

  it('should handle 404 error', async () => {
    mockCallAIBackend.mockRejectedValue(new Error('Not found'))

    const input = createMockInput()
    const matrixReport = createMockReport()

    await expect(generateAIPremiumReport(input, matrixReport)).rejects.toThrow()
  })
})

describe('generateAIPremiumReport - Fetch Behavior', () => {
  it('should call fetch with correct URL', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    await generateAIPremiumReport(input, matrixReport)

    expect(callAIBackend).toHaveBeenCalledWith(expect.any(String), 'ko')
  })

  it('should send request body with prompt', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    await generateAIPremiumReport(input, matrixReport)

    expect(callAIBackend).toHaveBeenCalled()
    const callArgs = mockCallAIBackend.mock.calls[0]
    expect(callArgs[0]).toBeTruthy() // prompt should exist
    expect(callArgs[1]).toBe('ko') // lang
  })
})

describe('generateAIPremiumReport - Response Parsing', () => {
  it('should parse sections from JSON response', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport)

    expect(result.sections).toBeDefined()
    expect(result.sections.introduction).toBe('인트로 내용')
  })

  it('should extract model and token info', async () => {
    const input = createMockInput()
    const matrixReport = createMockReport()

    const result = await generateAIPremiumReport(input, matrixReport)

    expect(result.meta.modelUsed).toBe('gpt-4o')
    expect(result.meta.tokensUsed).toBe(1500)
  })
})
