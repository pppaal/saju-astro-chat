import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { FiveElement } from '@/lib/Saju/types'

vi.mock('@/lib/destiny-matrix/ai-report/aiBackend', () => ({
  callAIBackend: vi.fn(),
  callAIBackendGeneric: vi.fn(),
}))

import {
  generateAIPremiumReport,
  sanitizeSectionNarrative,
} from '@/lib/destiny-matrix/ai-report/aiReportService'
import { callAIBackendGeneric } from '@/lib/destiny-matrix/ai-report/aiBackend'

const mockCallAIBackendGeneric = callAIBackendGeneric as ReturnType<typeof vi.fn>

function createMockInput(): MatrixCalculationInput {
  return {
    dayMasterElement: '\uBAA9' as FiveElement,
    pillarElements: ['\uBAA9', '\uD654', '\uD1A0', '\uAE08'] as FiveElement[],
    sibsinDistribution: { any: 2 } as any,
    twelveStages: {},
    relations: [],
    dominantWesternElement: 'earth',
    planetHouses: { Sun: 1, Moon: 4, Mars: 7, Jupiter: 10 },
    planetSigns: {} as any,
    aspects: [
      { planet1: 'Sun', planet2: 'Mars', type: 'opposition', orb: 2.1 },
      { planet1: 'Moon', planet2: 'Saturn', type: 'square', orb: 1.2 },
    ],
    activeTransits: ['saturnReturn', 'jupiterReturn'],
    geokguk: 'jeonggwan',
    yongsin: '\uD654' as FiveElement,
    currentDaeunElement: '\uD654' as FiveElement,
    currentSaeunElement: '\uBAA9' as FiveElement,
    lang: 'ko',
  }
}

function createMockReport(): FusionReport {
  return {
    id: 'report_1',
    generatedAt: new Date(),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '\uBAA9' as FiveElement,
      dayMasterDescription: 'wood',
      dominantSibsin: [],
      keyShinsals: [],
    },
    overallScore: {
      total: 82,
      grade: 'A',
      gradeDescription: 'good',
      gradeDescriptionEn: 'good',
      categoryScores: { strength: 84, opportunity: 81, balance: 80, caution: 70, challenge: 65 },
    },
    topInsights: [
      {
        id: 'i1',
        domain: 'career',
        category: 'strength',
        title: 'Career Expansion',
        description: 'growth momentum',
        score: 88,
        weightedScore: 88,
        confidence: 0.8,
        actionItems: [],
        sources: [
          {
            layer: 4,
            row: 'daeunTransition',
            col: 'saturnReturn',
            contribution: 0.4,
            sajuFactor: 'pattern',
            astroFactor: 'Saturn',
          },
        ],
      },
      {
        id: 'i2',
        domain: 'relationship',
        category: 'caution',
        title: 'Relationship Adjustment',
        description: 'communication reset',
        score: 74,
        weightedScore: 74,
        confidence: 0.7,
        actionItems: [],
        sources: [],
      },
    ],
    domainAnalysis: [],
    timingAnalysis: {
      currentPeriod: {
        name: 'now',
        nameEn: 'now',
        score: 78,
        description: 'flow',
        descriptionEn: 'flow',
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

beforeEach(() => {
  vi.clearAllMocks()
  mockCallAIBackendGeneric.mockImplementation(async (_prompt, _lang, options) => ({
    sections: {
      text: '\uC774 \uAD6C\uAC04\uC758 \uD575\uC2EC \uCD08\uC810\uC740 \uAD00\uACC4 \uC815\uB82C\uC785\uB2C8\uB2E4. \uC624\uB298 \uC6B0\uC120\uC21C\uC704\uB97C \uC815\uB9AC\uD558\uC138\uC694. \uC774\uBC88\uC8FC \uB300\uD654\uB97C \uBA3C\uC800 \uC5EC\uC138\uC694. \uCEE4\uB9AC\uC5B4\uC640 \uC7AC\uC815 \uD750\uB984\uC744 \uD568\uAED8 \uC810\uAC80\uD558\uC138\uC694. \uAC74\uAC15 \uB8E8\uD2F4\uC744 \uC870\uC815\uD558\uC138\uC694.',
    },
    model: options?.modelOverride || 'gpt-4o-mini',
    tokensUsed: 120,
  }))
})

describe('generateAIPremiumReport', () => {
  it('generates all 10 sections', async () => {
    const result = await generateAIPremiumReport(createMockInput(), createMockReport(), {
      detailLevel: 'detailed',
    })

    expect(result.sections.introduction).toBeTruthy()
    expect(result.sections.personalityDeep).toBeTruthy()
    expect(result.sections.careerPath).toBeTruthy()
    expect(result.sections.relationshipDynamics).toBeTruthy()
    expect(result.sections.wealthPotential).toBeTruthy()
    expect(result.sections.healthGuidance).toBeTruthy()
    expect(result.sections.lifeMission).toBeTruthy()
    expect(result.sections.timingAdvice).toBeTruthy()
    expect(result.sections.actionPlan).toBeTruthy()
    expect(result.sections.conclusion).toBeTruthy()
    expect(mockCallAIBackendGeneric).toHaveBeenCalled()
  })

  it('uses 4o-mini and 4o models', async () => {
    await generateAIPremiumReport(createMockInput(), createMockReport(), {
      detailLevel: 'comprehensive',
    })

    const models = mockCallAIBackendGeneric.mock.calls.map((call) => call[2]?.modelOverride)
    expect(models).toContain('gpt-4o-mini')
    expect(models).toContain('gpt-4o')
  })

  it('removes boilerplate phrase from sections', async () => {
    const result = await generateAIPremiumReport(createMockInput(), createMockReport())
    expect(result.sections.introduction).not.toContain(
      '\uC774 \uAD6C\uAC04\uC758 \uD575\uC2EC \uCD08\uC810\uC740'
    )
  })

  it('removes timing contradiction phrase when saeun exists', async () => {
    mockCallAIBackendGeneric.mockResolvedValue({
      sections: {
        text: '\uC138\uC6B4 \uBBF8\uC785\uB825\uC785\uB2C8\uB2E4. \uC624\uB298 \uC77C\uC815 \uC7AC\uC815\uB9AC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.',
      },
      model: 'gpt-4o',
      tokensUsed: 120,
    })
    const result = await generateAIPremiumReport(createMockInput(), createMockReport())
    expect(result.sections.introduction).not.toContain('\uC138\uC6B4 \uBBF8\uC785\uB825')
  })

  it('never contains banned reporty phrases in final sections', async () => {
    mockCallAIBackendGeneric.mockResolvedValue({
      sections: {
        text: '\uACA9\uAD6D\uC758 \uACB0\uC774 \uBCF4\uC785\uB2C8\uB2E4. \uAE34\uC7A5 \uC2E0\uD638\uAC00 \uC788\uACE0 \uC0C1\uD638\uC791\uC6A9\uC774 \uC791\uB3D9\uD569\uB2C8\uB2E4. \uADF8 \uD750\uB984\uC740 \uC2DC\uC0AC\uC810\uC744 \uC90D\uB2C8\uB2E4.',
      },
      model: 'gpt-4o',
      tokensUsed: 100,
    })

    const result = await generateAIPremiumReport(createMockInput(), createMockReport())
    const allText = [
      result.sections.introduction,
      result.sections.personalityDeep,
      result.sections.careerPath,
      result.sections.relationshipDynamics,
      result.sections.wealthPotential,
      result.sections.healthGuidance,
      result.sections.lifeMission,
      result.sections.timingAdvice,
      result.sections.actionPlan,
      result.sections.conclusion,
    ].join(' ')

    const banned = [
      '\uACA9\uAD6D\uC758 \uACB0',
      '\uAE34\uC7A5 \uC2E0\uD638',
      '\uC0C1\uD638\uC791\uC6A9',
      '\uC2DC\uC0AC',
      '\uD504\uB808\uC784',
      '\uAC80\uC99D',
      '\uADFC\uAC70 \uC138\uD2B8',
    ]
    for (const phrase of banned) {
      expect(allText).not.toContain(phrase)
    }
  })
})

describe('sanitizeSectionNarrative', () => {
  it('strips forbidden phrase', () => {
    const cleaned = sanitizeSectionNarrative(
      '\uC774 \uAD6C\uAC04\uC758 \uD575\uC2EC \uCD08\uC810\uC740 \uAD00\uACC4\uC785\uB2C8\uB2E4. \uC624\uB298 \uC2E4\uD589\uD558\uC138\uC694.'
    )
    expect(cleaned).toBe('\uC624\uB298 \uC2E4\uD589\uD558\uC138\uC694.')
  })

  it('strips banned reporty phrases', () => {
    const cleaned = sanitizeSectionNarrative(
      '\uACA9\uAD6D\uC758 \uACB0, \uAE34\uC7A5 \uC2E0\uD638, \uC0C1\uD638\uC791\uC6A9, \uC2DC\uC0AC, \uD504\uB808\uC784, \uAC80\uC99D, \uADFC\uAC70 \uC138\uD2B8'
    )
    expect(cleaned).not.toContain('\uACA9\uAD6D\uC758 \uACB0')
    expect(cleaned).not.toContain('\uAE34\uC7A5 \uC2E0\uD638')
    expect(cleaned).not.toContain('\uC0C1\uD638\uC791\uC6A9')
    expect(cleaned).not.toContain('\uC2DC\uC0AC')
    expect(cleaned).not.toContain('\uD504\uB808\uC784')
    expect(cleaned).not.toContain('\uAC80\uC99D')
    expect(cleaned).not.toContain('\uADFC\uAC70 \uC138\uD2B8')
  })
})
