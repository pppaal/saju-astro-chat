import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixHighlight, MatrixSummary } from '@/lib/destiny-matrix/types'
import type { FiveElement } from '@/lib/Saju/types'

vi.mock('@/lib/destiny-matrix/ai-report/aiBackend', () => ({
  callAIBackend: vi.fn(),
  callAIBackendGeneric: vi.fn(),
}))

import {
  generateAIPremiumReport,
  generateThemedReport,
  generateTimingReport,
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

function createRewriteSections(value: string): Record<string, string> {
  return {
    introduction: value,
    personalityDeep: value,
    careerPath: value,
    relationshipDynamics: value,
    wealthPotential: value,
    healthGuidance: value,
    lifeMission: value,
    timingAdvice: value,
    actionPlan: value,
    conclusion: value,
  }
}

function mkHighlight(
  layer: number,
  rowKey: string,
  colKey: string,
  score: number,
  keyword: string
): MatrixHighlight {
  return {
    layer,
    rowKey,
    colKey,
    cell: {
      interaction: {
        level: 'amplify',
        score,
        icon: 'x',
        colorCode: 'green',
        keyword,
        keywordEn: keyword,
      },
      sajuBasis: `${rowKey} saju`,
      astroBasis: `${colKey} astro`,
      advice: `${keyword} advice`,
    },
  }
}

function createRichMatrixSummary(): MatrixSummary {
  return {
    totalScore: 76,
    strengthPoints: [
      mkHighlight(6, 'imgwan', 'H10', 10, 'career peak'),
      mkHighlight(3, 'siksin', 'H7', 9, 'relationship drive'),
      mkHighlight(2, '\uD3B8\uC7AC', 'Jupiter', 8, 'wealth window'),
    ],
    cautionPoints: [
      mkHighlight(5, 'chung', 'square', 3, 'friction'),
      mkHighlight(2, '\uC0C1\uAD00', 'Saturn', 2, 'delay'),
    ],
    balancePoints: [
      mkHighlight(3, 'jeongin', 'H6', 6, 'health routine'),
      mkHighlight(4, 'daeun', 'transit', 6, 'timing gate'),
    ],
    topSynergies: [],
  }
}

function createTimingData() {
  return {
    daeun: {
      heavenlyStem: '乙',
      earthlyBranch: '亥',
      element: '목',
      startAge: 31,
      endAge: 40,
      isCurrent: true,
    },
    seun: {
      year: 2026,
      heavenlyStem: '丙',
      earthlyBranch: '午',
      element: '화',
    },
    wolun: {
      month: 2,
      heavenlyStem: '甲',
      earthlyBranch: '寅',
      element: '목',
    },
    iljin: {
      date: '2026-02-25',
      heavenlyStem: '辛',
      earthlyBranch: '卯',
      element: '금',
    },
  } as any
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
    expect(result.evidenceRefs).toBeTruthy()
    expect(result.evidenceRefs.introduction?.length || 0).toBeGreaterThan(0)
    expect(result.strategyEngine).toBeTruthy()
    expect(result.graphRagSummary).toBeTruthy()
    expect((result.graphRagSummary?.topInsights || []).length).toBeGreaterThan(0)
    expect((result.graphRagSummary?.drivers || []).length).toBeGreaterThan(0)
    expect((result.graphRagSummary?.cautions || []).length).toBeGreaterThan(0)
    expect(
      (result.strategyEngine?.attackPercent || 0) + (result.strategyEngine?.defensePercent || 0)
    ).toBe(100)
    expect(mockCallAIBackendGeneric).toHaveBeenCalled()
  })

  it('uses rewrite-only AI call path', async () => {
    await generateAIPremiumReport(createMockInput(), createMockReport(), {
      detailLevel: 'comprehensive',
    })

    const models = mockCallAIBackendGeneric.mock.calls.map((call) => call[2]?.modelOverride)
    expect(models.length).toBeGreaterThan(0)
    expect(models.some((model) => model === 'gpt-4o-mini')).toBe(true)
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

  it('removes unsupported high-risk tokens and keeps evidence grounding', async () => {
    mockCallAIBackendGeneric.mockResolvedValue({
      sections: {
        text: '\uC6D4\uC694\uC77C \uAE08\uC131-\uD654\uC131 square \uD750\uB984\uC774\uB77C \uBC1C\uD45C\uB97C \uD655\uC815\uD558\uC138\uC694. \uC624\uB298 \uC77C\uC815\uC744 \uC870\uC815\uD558\uC138\uC694.',
      },
      model: 'gpt-4o',
      tokensUsed: 100,
    })

    const result = await generateAIPremiumReport(createMockInput(), createMockReport())
    expect(result.sections.introduction).not.toContain('\uC6D4\uC694\uC77C')
    expect(result.sections.introduction.toLowerCase()).not.toContain('square')
    expect(result.evidenceRefs.introduction?.length || 0).toBeGreaterThan(0)
  })

  it('falls back to deterministic draft when rewrite output adds unsupported token', async () => {
    mockCallAIBackendGeneric.mockResolvedValue({
      sections: createRewriteSections('hallucinatedtermx 수요일에 즉시 확정하세요.'),
      model: 'gpt-4o-mini',
      tokensUsed: 88,
    })

    const result = await generateAIPremiumReport(createMockInput(), createMockReport())
    expect(result.meta.modelUsed).toBe('rewrite-fallback-validator')
    expect(result.sections.introduction).not.toContain('hallucinatedtermx')
    expect(result.sections.introduction).not.toContain('수요일')
  })

  it('falls back to deterministic draft when rewrite backend fails', async () => {
    mockCallAIBackendGeneric.mockRejectedValue(new Error('provider down'))
    const result = await generateAIPremiumReport(createMockInput(), createMockReport())
    expect(result.meta.modelUsed).toBe('rewrite-fallback-error')
    expect(result.meta.tokensUsed).toBe(0)
  })

  it('supports deterministic-only mode without AI calls', async () => {
    const result = await generateAIPremiumReport(createMockInput(), createMockReport(), {
      deterministicOnly: true,
      matrixSummary: createRichMatrixSummary(),
      timingData: createTimingData(),
    })
    expect(mockCallAIBackendGeneric).not.toHaveBeenCalled()
    expect(result.meta.modelUsed).toBe('deterministic-only')
    expect(result.meta.tokensUsed).toBe(0)
    expect(result.meta.qualityMetrics).toBeTruthy()
    expect(result.meta.qualityMetrics?.evidenceCoverageRatio || 0).toBeGreaterThan(0.7)
    expect(result.meta.qualityMetrics?.contradictionCount || 0).toBe(0)
    expect(result.sections.careerPath.length).toBeGreaterThan(120)
    expect(result.strategyEngine).toBeTruthy()
    for (const refs of Object.values(result.evidenceRefs)) {
      expect((refs || []).length).toBeGreaterThanOrEqual(2)
    }
    expect(result.reportMeta.schemaVersion).toBe('1.1')
    expect(result.timeWindow.scope).toBe('LIFE')
    expect(result.scores.overall.score).toBeGreaterThan(0)
    expect(result.scores.overall.confidence).toBeGreaterThanOrEqual(0)
    expect(result.claims.length).toBeGreaterThan(0)
    expect(result.selectedSignals.length).toBeGreaterThan(0)
    expect(result.anchors.length).toBeGreaterThan(0)
    expect(result.timelineEvents.length).toBeGreaterThan(0)
    expect(result.timelineEvents.some((event) => Boolean(event.timeHint?.ageRange))).toBe(true)
    expect((result.scenarioBundles || []).length).toBeGreaterThan(0)
    expect(result.scenarioBundles?.some((bundle) => bundle.domain === 'career')).toBe(true)
    expect((result.scenarioBundles || []).every((bundle) => (bundle.alt || []).length >= 2)).toBe(
      true
    )
    expect(result.evidenceRefsByPara).toBeTruthy()
    expect(Object.keys(result.evidenceRefsByPara || {}).some((key) => key.endsWith('.p1'))).toBe(true)
    expect(result.meta.qualityMetrics?.sectionCompletenessRate).toBe(1)
    expect(result.meta.qualityMetrics?.scenarioBundleCoverage).toBeGreaterThan(0.5)
    expect(result.meta.qualityMetrics?.tokenIntegrityPass).toBe(true)
    expect(result.meta.qualityMetrics?.structurePass).toBe(true)
    expect(result.meta.qualityMetrics?.forbiddenAdditionsPass).toBe(true)
    expect(
      result.timelineEvents.some((event) =>
        ['job', 'marriage', 'relocation', 'money', 'timing', 'life'].includes(event.type)
      )
    ).toBe(true)
    expect(result.timelineEvents.every((event) => (event.thesis || '').length >= 30)).toBe(true)
    expect(result.timelineEvents.every((event) => !(event.thesis || '').includes('구간 활성'))).toBe(
      true
    )
  })

  it('enforces minimum evidence refs for timing/themed deterministic reports', async () => {
    const timing = await generateTimingReport(
      createMockInput(),
      createMockReport(),
      'daily',
      createTimingData(),
      {
        deterministicOnly: true,
        matrixSummary: createRichMatrixSummary(),
      }
    )
    for (const refs of Object.values(timing.evidenceRefs)) {
      expect((refs || []).length).toBeGreaterThanOrEqual(2)
    }
    expect(timing.meta.qualityMetrics).toBeTruthy()
    expect(timing.meta.qualityMetrics?.minEvidenceSatisfiedRatio || 0).toBeGreaterThanOrEqual(0.9)
    expect(timing.meta.qualityMetrics?.sectionCompletenessRate).toBe(1)
    expect(timing.meta.qualityMetrics?.tokenIntegrityPass).toBe(true)
    expect((timing.scenarioBundles || []).length).toBeGreaterThan(0)
    expect((timing.scenarioBundles || []).every((bundle) => (bundle.alt || []).length >= 2)).toBe(
      true
    )
    expect(timing.evidenceRefsByPara).toBeTruthy()
    expect(timing.timeWindow.scope).toBe('DAY')
    expect(timing.reportMeta.schemaVersion).toBe('1.1')
    expect(timing.timelineEvents.some((event) => event.type === 'timing')).toBe(true)

    const themed = await generateThemedReport(
      createMockInput(),
      createMockReport(),
      'career',
      createTimingData(),
      {
        deterministicOnly: true,
        matrixSummary: createRichMatrixSummary(),
      }
    )
    for (const refs of Object.values(themed.evidenceRefs)) {
      expect((refs || []).length).toBeGreaterThanOrEqual(2)
    }
    expect(themed.meta.qualityMetrics).toBeTruthy()
    expect(themed.meta.qualityMetrics?.evidenceCoverageRatio || 0).toBeGreaterThan(0.7)
    expect(themed.meta.qualityMetrics?.sectionCompletenessRate).toBe(1)
    expect(themed.meta.qualityMetrics?.tokenIntegrityPass).toBe(true)
    expect((themed.scenarioBundles || []).length).toBeGreaterThan(0)
    expect((themed.scenarioBundles || []).every((bundle) => (bundle.alt || []).length >= 2)).toBe(
      true
    )
    expect(themed.evidenceRefsByPara).toBeTruthy()
    expect(themed.timeWindow.scope).toBe('LIFE')
    expect(themed.reportMeta.schemaVersion).toBe('1.1')
    expect(themed.timelineEvents.length).toBeGreaterThan(0)
  })

  it('prioritizes section-domain evidence references with mixed-domain synthesis', async () => {
    const result = await generateAIPremiumReport(createMockInput(), createMockReport(), {
      matrixSummary: createRichMatrixSummary(),
    })

    const careerDomains = new Set((result.evidenceRefs.careerPath || []).map((ref) => ref.domain))
    const relationDomains = new Set(
      (result.evidenceRefs.relationshipDynamics || []).map((ref) => ref.domain)
    )
    const wealthDomains = new Set(
      (result.evidenceRefs.wealthPotential || []).map((ref) => ref.domain)
    )

    expect(careerDomains.has('career') || careerDomains.has('wealth')).toBe(true)
    expect(relationDomains.has('relationship')).toBe(true)
    expect(wealthDomains.has('wealth') || wealthDomains.has('career')).toBe(true)
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
