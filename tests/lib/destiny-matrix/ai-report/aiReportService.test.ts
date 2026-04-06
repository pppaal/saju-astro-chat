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
    expect(mockCallAIBackendGeneric).not.toHaveBeenCalled()
    expect(result.meta.modelUsed).toBe('deterministic-only')
  })

  it('uses strict compute-only path without AI rewrite', async () => {
    await generateAIPremiumReport(createMockInput(), createMockReport(), {
      detailLevel: 'comprehensive',
    })

    const models = mockCallAIBackendGeneric.mock.calls.map((call) => call[2]?.modelOverride)
    expect(models.length).toBe(0)
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

  it('ignores rewrite backend output and remains deterministic-only', async () => {
    mockCallAIBackendGeneric.mockResolvedValue({
      sections: createRewriteSections('hallucinatedtermx 수요일에 즉시 확정하세요.'),
      model: 'gpt-4o-mini',
      tokensUsed: 88,
    })

    const result = await generateAIPremiumReport(createMockInput(), createMockReport())
    expect(result.meta.modelUsed).toBe('deterministic-only')
    expect(mockCallAIBackendGeneric).not.toHaveBeenCalled()
    expect(result.sections.introduction).not.toContain('hallucinatedtermx')
    expect(result.sections.introduction).not.toContain('수요일')
  })

  it('remains deterministic-only when rewrite backend fails', async () => {
    mockCallAIBackendGeneric.mockRejectedValue(new Error('provider down'))
    const result = await generateAIPremiumReport(createMockInput(), createMockReport())
    expect(result.meta.modelUsed).toBe('deterministic-only')
    expect(result.meta.tokensUsed).toBe(0)
    expect(mockCallAIBackendGeneric).not.toHaveBeenCalled()
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
    expect(result.meta.qualityMetrics?.evidenceCoverageRatio || 0).toBeGreaterThanOrEqual(0.28)
    expect(result.meta.qualityMetrics?.contradictionCount || 0).toBe(0)
    expect(result.sections.careerPath.length).toBeGreaterThan(120)
    expect(result.strategyEngine).toBeTruthy()
    for (const refs of Object.values(result.evidenceRefs)) {
      expect((refs || []).length).toBeGreaterThanOrEqual(2)
    }
    expect(result.reportMeta.schemaVersion).toBe('1.1')
    expect((result.coreHash || '').length).toBeGreaterThan(0)
    expect((result.patterns || []).length).toBeGreaterThan(0)
    expect((result.topMatchedPatterns || []).length).toBeGreaterThan(0)
    expect((result.topMatchedPatterns || []).length).toBeLessThanOrEqual(10)
    expect((result.scenarios || []).length).toBeGreaterThan(0)
    expect(result.timeWindow.scope).toBe('LIFE')
    expect(result.scores.overall.score).toBeGreaterThan(0)
    expect(result.scores.overall.confidence).toBeGreaterThanOrEqual(0)
    expect(result.claims.length).toBeGreaterThan(0)
    expect(result.selectedSignals.length).toBeGreaterThan(0)
    expect(result.anchors.length).toBeGreaterThan(0)
    expect(result.evidenceLinks.length).toBeGreaterThan(0)
    expect(result.evidenceLinks.some((link) => (link.setIds || []).length > 0)).toBe(true)
    expect(result.timelineEvents.length).toBeGreaterThan(0)
    expect(result.timelineEvents.some((event) => Boolean(event.timeHint?.ageRange))).toBe(true)
    expect((result.scenarioBundles || []).length).toBeGreaterThan(0)
    expect(result.scenarioBundles?.some((bundle) => bundle.domain === 'career')).toBe(true)
    expect((result.scenarioBundles || []).every((bundle) => (bundle.alt || []).length >= 2)).toBe(
      true
    )
    expect(result.evidenceRefsByPara).toBeTruthy()
    expect(Object.keys(result.evidenceRefsByPara || {}).some((key) => key.endsWith('.p1'))).toBe(
      true
    )
    expect(Object.keys(result.evidenceRefsByPara || {}).some((key) => key.endsWith('.p2'))).toBe(
      true
    )
    expect(Object.keys(result.evidenceRefsByPara || {}).some((key) => key.endsWith('.p3'))).toBe(
      true
    )
    expect((result as any).timelinePriority).toBe('life_first')
    expect(result.deterministicCore?.artifacts).toBeTruthy()
    expect((result.deterministicCore?.artifacts as any)?.mappingRulebook).toBeTruthy()
    expect((result.deterministicCore?.artifacts as any)?.blocksBySection).toBeTruthy()
    expect(
      ((result.deterministicCore?.artifacts as any)?.blocksBySection?.relationshipDynamics?.[0]
        ?.heading || '') as string
    ).toContain('배우자 아키타입')
    const allBlocks = Object.values(
      ((result.deterministicCore?.artifacts as any)?.blocksBySection || {}) as Record<string, any[]>
    ).flat()
    expect(allBlocks.length).toBeGreaterThan(0)
    expect(allBlocks.some((block) => (block.mustKeepTokens || []).length > 0)).toBe(true)
    expect((result.deterministicCore?.artifacts as any)?.timelinePriority).toBe('life_first')
    expect(result.meta.qualityMetrics?.sectionCompletenessRate).toBe(1)
    expect(result.meta.qualityMetrics?.scenarioBundleCoverage).toBeGreaterThan(0.5)
    expect(result.meta.qualityMetrics?.tokenIntegrityPass).toBe(true)
    expect(result.meta.qualityMetrics?.structurePass).toBe(true)
    expect(result.meta.qualityMetrics?.forbiddenAdditionsPass).toBe(true)
    expect(result.meta.qualityMetrics?.coreQualityScore || 0).toBeGreaterThan(0)
    expect(result.meta.qualityMetrics?.coreQualityGrade).toMatch(/[ABCD]/)
    expect(typeof result.meta.qualityMetrics?.coreQualityWarningCount).toBe('number')
    expect(typeof result.meta.qualityMetrics?.coreQualityPass).toBe('boolean')
    expect(result.sections.introduction).not.toMatch(/dayMasterElement|sibsinDistribution|rule checks/i)
    expect(
      result.timelineEvents.some((event) =>
        ['job', 'marriage', 'relocation', 'money', 'timing', 'life'].includes(event.type)
      )
    ).toBe(true)
    expect(result.timelineEvents.every((event) => (event.thesis || '').length >= 30)).toBe(true)
    expect(
      result.timelineEvents.every((event) => !(event.thesis || '').includes('구간 활성'))
    ).toBe(true)
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
    expect(timing.meta.qualityMetrics?.avgSectionChars || 0).toBeGreaterThanOrEqual(260)
    expect(timing.meta.qualityMetrics?.tokenIntegrityPass).toBe(true)
    expect(timing.meta.qualityMetrics?.forbiddenAdditionsPass).toBe(true)
    expect(timing.meta.qualityMetrics?.coreQualityScore || 0).toBeGreaterThan(0)
    expect(timing.meta.qualityMetrics?.coreQualityGrade).toMatch(/[ABCD]/)
    expect(timing.sections.overview).toMatch(
      /(함께 참고해도 되는 편입니다|참고할 만하지만|큰 흐름 중심으로 참고하는 편이 맞습니다|세부 타이밍은 한 번 더 확인하는 편이 좋습니다|순서를 잘 나눠서 이기는 날입니다)/
    )
    expect(timing.sections.overview).toMatch(/(함께 본 결과입니다|교차 근거 묶음|규칙 판정)/)
    expect((timing.coreHash || '').length).toBeGreaterThan(0)
    expect((timing.patterns || []).length).toBeGreaterThan(0)
    expect((timing.topMatchedPatterns || []).length).toBeGreaterThan(0)
    expect((timing.topMatchedPatterns || []).length).toBeLessThanOrEqual(10)
    expect((timing.scenarios || []).length).toBeGreaterThan(0)
    expect(timing.evidenceLinks.length).toBeGreaterThan(0)
    expect(timing.evidenceLinks.some((link) => (link.setIds || []).length > 0)).toBe(true)
    expect((timing.scenarioBundles || []).length).toBeGreaterThan(0)
    expect((timing.scenarioBundles || []).every((bundle) => (bundle.alt || []).length >= 2)).toBe(
      true
    )
    expect(timing.evidenceRefsByPara).toBeTruthy()
    expect(Object.keys(timing.evidenceRefsByPara || {}).some((key) => key.endsWith('.p2'))).toBe(
      true
    )
    expect(Object.keys(timing.evidenceRefsByPara || {}).some((key) => key.endsWith('.p3'))).toBe(
      true
    )
    expect(timing.timeWindow.scope).toBe('DAY')
    expect((timing as any).timelinePriority).toBe('default')
    expect((timing.deterministicCore?.artifacts as any)?.blocksBySection).toBeTruthy()
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
    expect(typeof themed.meta.qualityMetrics?.evidenceCoverageRatio).toBe('number')
    expect(themed.meta.qualityMetrics?.sectionCompletenessRate).toBe(1)
    expect(themed.meta.qualityMetrics?.avgSectionChars || 0).toBeGreaterThanOrEqual(170)
    expect(typeof themed.meta.qualityMetrics?.tokenIntegrityPass).toBe('boolean')
    expect(themed.meta.qualityMetrics?.forbiddenAdditionsPass).toBe(true)
    expect(themed.meta.qualityMetrics?.coreQualityScore || 0).toBeGreaterThan(0)
    expect(themed.meta.qualityMetrics?.coreQualityGrade).toMatch(/[ABCD]/)
    expect(themed.sections.deepAnalysis).toContain('삶의 배경 흐름')
    expect(themed.sections.deepAnalysis.length).toBeGreaterThan(120)
    expect((themed.coreHash || '').length).toBeGreaterThan(0)
    expect((themed.patterns || []).length).toBeGreaterThan(0)
    expect((themed.topMatchedPatterns || []).length).toBeGreaterThan(0)
    expect((themed.topMatchedPatterns || []).length).toBeLessThanOrEqual(10)
    expect((themed.scenarios || []).length).toBeGreaterThan(0)
    expect(themed.evidenceLinks.length).toBeGreaterThan(0)
    expect(themed.evidenceLinks.some((link) => (link.setIds || []).length > 0)).toBe(true)
    expect((themed.scenarioBundles || []).length).toBeGreaterThan(0)
    expect((themed.scenarioBundles || []).every((bundle) => (bundle.alt || []).length >= 2)).toBe(
      true
    )
    expect(themed.evidenceRefsByPara).toBeTruthy()
    expect(Object.keys(themed.evidenceRefsByPara || {}).some((key) => key.endsWith('.p2'))).toBe(
      true
    )
    expect(Object.keys(themed.evidenceRefsByPara || {}).some((key) => key.endsWith('.p3'))).toBe(
      true
    )
    expect(themed.timeWindow.scope).toBe('LIFE')
    expect((themed as any).timelinePriority).toBe('life_first')
    expect((themed.deterministicCore?.artifacts as any)?.mappingRulebook).toBeTruthy()
    expect((themed.deterministicCore?.artifacts as any)?.blocksBySection).toBeTruthy()
    expect(themed.reportMeta.schemaVersion).toBe('1.1')
    expect(themed.timelineEvents.length).toBeGreaterThan(0)
    const themedRecommendations = String(themed.sections.recommendations || '')
    expect(themedRecommendations).not.toContain(',긴장')
    expect(themedRecommendations).not.toContain(',,')
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

  it('enforces strict compute-only mode for timing/themed default calls', async () => {
    const timing = await generateTimingReport(
      createMockInput(),
      createMockReport(),
      'daily',
      createTimingData()
    )
    const themed = await generateThemedReport(
      createMockInput(),
      createMockReport(),
      'career',
      createTimingData()
    )

    expect(mockCallAIBackendGeneric).not.toHaveBeenCalled()
    expect(timing.meta.modelUsed).toBe('deterministic-only')
    expect(themed.meta.modelUsed).toBe('deterministic-only')
    expect((timing.evidenceLinks || []).length).toBeGreaterThan(0)
    expect((themed.evidenceLinks || []).length).toBeGreaterThan(0)
  })

  it('attempts selective AI polish for premium timing and themed reports only on chosen sections', async () => {
    mockCallAIBackendGeneric
      .mockImplementationOnce(async () => ({
        sections: {
          overview: 'AI polished overview that sharpens the daily timing narrative with clear sequencing and action cues.',
          opportunities:
            'AI polished opportunities paragraph that highlights the opening window with concrete momentum and timing advice.',
          actionPlan:
            'AI polished action plan that turns the timing signals into a short, ordered execution checklist.',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 321,
      }))
      .mockImplementationOnce(async () => ({
        sections: {
          deepAnalysis:
            'AI polished deep analysis that frames the career theme as a high-stakes positioning question.',
          timing:
            'AI polished timing paragraph that points to the weeks when judgment, negotiation, and visible output matter most.',
          actionPlan:
            'AI polished action plan that breaks the career theme into proof, timing, and follow-through.',
          strategy:
            'AI polished strategy that names the real turning point and what kind of choice deserves commitment.',
          roleFit:
            'AI polished role fit paragraph that explains where the current structure rewards ownership and composure.',
          turningPoints:
            'AI polished turning points paragraph that marks the inflection points worth watching this cycle.',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 287,
      }))

    const timing = await generateTimingReport(
      createMockInput(),
      createMockReport(),
      'daily',
      createTimingData(),
      {
        deterministicOnly: true,
        userPlan: 'premium',
        matrixSummary: createRichMatrixSummary(),
      }
    )
    const themed = await generateThemedReport(
      createMockInput(),
      createMockReport(),
      'career',
      createTimingData(),
      {
        deterministicOnly: true,
        userPlan: 'premium',
        matrixSummary: createRichMatrixSummary(),
      }
    )

    expect(mockCallAIBackendGeneric.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(mockCallAIBackendGeneric.mock.calls[0]?.[2]).toMatchObject({
      userPlan: 'premium',
    })
    expect(mockCallAIBackendGeneric.mock.calls[1]?.[2]).toMatchObject({
      userPlan: 'premium',
    })
    expect(timing.meta.modelUsed).toMatch(/^deterministic\+/)
    expect(themed.meta.modelUsed).toMatch(/^deterministic\+/)
    expect(typeof timing.sections.overview).toBe('string')
    expect(typeof timing.sections.energy).toBe('string')
    expect(typeof themed.sections.strategy).toBe('string')
    expect(typeof themed.sections.roleFit).toBe('string')
  })

  it('cleans mixed-language premium polish artifacts in final user-facing sections', async () => {
    mockCallAIBackendGeneric.mockImplementation(async () => ({
      sections: {
        overview:
          '현재 흐름 흐름은 중요합니다. 지금 구간에 대운, 세운, 이 겹치며 Hidden Support Pattern 패턴이 활성화됩니다. 핵심 근거는 Stage 임관, Daeun 금입니다.',
        opportunities:
          'career 영역은 now 창이 열려 있고 Geokguk 정재격이 작동합니다. 은 물병자리 1하우스에 놓여 있습니다.',
        actionPlan:
          '기준 정리 후 실행 결정은 분할하고 역할, 기한, 책임을 문서로 고정하세요.',
      },
      model: 'gpt-4o-mini',
      tokensUsed: 180,
    }))

    const timing = await generateTimingReport(
      createMockInput(),
      createMockReport(),
      'daily',
      createTimingData(),
      {
        deterministicOnly: true,
        userPlan: 'premium',
        matrixSummary: createRichMatrixSummary(),
      }
    )

    expect(timing.sections.overview).not.toContain('현재 흐름 흐름')
    expect(timing.sections.overview).not.toContain('Hidden Support Pattern')
    expect(timing.sections.overview).not.toContain('Stage 임관')
    expect(timing.sections.overview).not.toContain('Daeun 금')
    expect(timing.sections.opportunities).not.toContain('career 영역은 now 창')
    expect(timing.sections.opportunities).not.toContain('Geokguk')
    expect(timing.sections.opportunities).not.toContain('은 물병자리 1하우스에 놓여 있습니다')
    expect(timing.sections.actionPlan).not.toContain('기준 정리 후 실행 결정은')
  })
})

describe('deterministic section leads', () => {
  it('keeps comprehensive section leads distinct instead of repeating the long life-cycle hook', async () => {
    const result = await generateAIPremiumReport(createMockInput(), createMockReport(), {
      deterministicOnly: true,
      matrixSummary: createRichMatrixSummary(),
      timingData: createTimingData(),
    })

    expect(result.sections.careerPath).not.toContain('핵심 장기 흐름')
    expect(result.sections.healthGuidance).not.toContain('핵심 장기 흐름')
    expect(result.sections.actionPlan).not.toContain('핵심 장기 흐름')
  })

  it('adds stronger comprehensive hooks for intro and domain sections', async () => {
    const result = await generateAIPremiumReport(createMockInput(), createMockReport(), {
      deterministicOnly: true,
      matrixSummary: createRichMatrixSummary(),
      timingData: createTimingData(),
    })

    expect(result.sections.introduction).toContain('\uD310')
    expect(result.sections.careerPath).toContain('\uC6B0\uC120\uC21C\uC704')
    expect(result.sections.wealthPotential).toContain('\uC190\uC2E4 \uC0C1\uD55C')
    expect(result.sections.conclusion).toContain('\uC7AC\uB2A5\uBCF4\uB2E4 \uC6B4\uC601')
  })

  it('adds stronger deterministic hooks for timing and themed reports', async () => {
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

    expect(timing.sections.overview).toContain('순서를 잘 나눠서 이기는 날')
    expect(themed.sections.strategy || '').toContain('현실적으로 열린 경로')
  })

  it('keeps themed strategy/action sections from reusing the long life-cycle hook', async () => {
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

    expect(themed.sections.strategy || '').not.toContain('핵심 장기 흐름')
    expect(themed.sections.actionPlan).not.toContain('핵심 장기 흐름')
  })
})

describe('sanitizeSectionNarrative', () => {
  it('normalizes mixed-language artifacts and drops orphan house sentences', () => {
    const cleaned = sanitizeSectionNarrative(
      '현재 흐름 흐름입니다. 지금 구간에 대운, 세운, 이 겹치며 Hidden Support Pattern 패턴이 활성화됩니다. 핵심 근거는 Stage 임관, Daeun 금입니다. career 영역은 now 창이 열려 있고 Geokguk 정재격이 작동합니다. Yongsin 화가 핵심입니다. 은 물병자리 1하우스에 위치해 있습니다.'
    )

    expect(cleaned).not.toContain('현재 흐름 흐름')
    expect(cleaned).not.toContain('Hidden Support Pattern')
    expect(cleaned).not.toContain('Stage 임관')
    expect(cleaned).not.toContain('Daeun 금')
    expect(cleaned).not.toContain('Geokguk')
    expect(cleaned).not.toContain('Yongsin')
    expect(cleaned).not.toContain('은 물병자리 1하우스에 위치해 있습니다')
    expect(cleaned).toContain('숨은 지원 흐름')
    expect(cleaned).not.toContain('대운 금')
    expect(cleaned).toContain('용신 화')
  })

  it('smooths mechanical Korean joins in narrative flow', () => {
    const cleaned = sanitizeSectionNarrative(
      '관계 조정 배우자 아키타입(누구): 핵심 성향: 관계 조정 / 보조: 감정 정리. 관계 조정 돈이 움직이는 방식을 보면 확장 신호가 우세합니다. 용신 화 패턴이 판단 속도를 좌우합니다. 기준 정리 후 실행,긴장이 강한 시기일수록 속도를 조절하세요.'
    )

    expect(cleaned).not.toContain('관계 조정 배우자 아키타입')
    expect(cleaned).toContain('배우자 아키타입')
    expect(cleaned).not.toContain('관계 조정 돈이 움직이는 방식을 보면')
    expect(cleaned).toContain('돈이 움직이는 방식을 보면')
    expect(cleaned).not.toContain('용신 화 패턴')
    expect(cleaned).toContain('용신 화 흐름')
    expect(cleaned).not.toContain('기준 정리 후 실행,긴장')
  })
  it.skip('turns house and basis artifacts into cleaner narrative cues', () => {
    const cleaned = sanitizeSectionNarrative(
      'ì»¤ë¦¬ì–´ ì˜ì—­ì€ now ì°½ì´ ì—´ë ¤ ìžˆê³ , í•µì‹¬ ê·¼ê±°ëŠ” ìž„ê´€ íë¦„ê³¼ ëŒ€ìš´ ê¸ˆìž…ë‹ˆë‹¤. íƒœì–‘ì€ ì‚¬ìžìžë¦¬ 10í•˜ìš°ìŠ¤ì— ìœ„ì¹˜í•´ ìžˆìŠµë‹ˆë‹¤. ìƒìœ„ íë¦„ì€ career, wealth ìž…ë‹ˆë‹¤.'
    )

    expect(cleaned).not.toContain('ì‚¬ìžìžë¦¬ 10í•˜ìš°ìŠ¤')
    expect(cleaned).toContain('ì´ íë¦„ì„ ë°›ì³ì£¼ëŠ” ë°”íƒ•')
    expect(cleaned).toContain('ì§€ê¸ˆ ìƒëŒ€ì ìœ¼ë¡œ íž˜ì´ ì‹¤ë¦¬ëŠ” ì¶•')
  })
})

it('adds distinct hooks across love, wealth, health, and family themed sections', async () => {
    const timing = createTimingData()
    const options = {
      deterministicOnly: true,
      matrixSummary: createRichMatrixSummary(),
    }

    const love = await generateThemedReport(createMockInput(), createMockReport(), 'love', timing, options)
    const wealth = await generateThemedReport(
      createMockInput(),
      createMockReport(),
      'wealth',
      timing,
      options
    )
    const health = await generateThemedReport(
      createMockInput(),
      createMockReport(),
      'health',
      timing,
      options
    )
    const family = await generateThemedReport(
      createMockInput(),
      createMockReport(),
      'family',
      timing,
      options
    )

    expect(love.sections.compatibility || '').toContain('잘 맞는 사람은')
    expect(wealth.sections.incomeStreams || '').toContain('수입')
    expect((health.sections.prevention || '').length).toBeGreaterThan(20)
    expect((family.sections.communication || '').length).toBeGreaterThan(20)
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

  it('removes non-saju/astrology systems from narrative', () => {
    const cleaned = sanitizeSectionNarrative(
      '타로 카드, numerology, MBTI, human design 기반 분석입니다.'
    )
    expect(cleaned.toLowerCase()).not.toContain('tarot')
    expect(cleaned.toLowerCase()).not.toContain('numerology')
    expect(cleaned.toLowerCase()).not.toContain('mbti')
    expect(cleaned.toLowerCase()).not.toContain('human design')
    expect(cleaned).not.toContain('타로')
  })
})

