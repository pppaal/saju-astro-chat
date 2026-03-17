import { describe, expect, it } from 'vitest'
import type {
  MatrixCalculationInput,
  MatrixHighlight,
  MatrixSummary,
} from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import { runDestinyCore } from '@/lib/destiny-matrix/core/runDestinyCore'
import { buildNextGenCorePipeline } from '@/lib/destiny-matrix/core/nextGenPipeline'

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
        icon: '*',
        colorCode: 'green',
        keyword,
        keywordEn: keyword,
      },
      sajuBasis: `${rowKey} saju`,
      astroBasis: `${colKey} astro`,
      advice: `${keyword} action`,
    },
  }
}

function createInput(): MatrixCalculationInput {
  return {
    dayMasterElement: '목' as any,
    pillarElements: ['목', '화', '토', '금'] as any,
    sibsinDistribution: { pyeonjae: 2, jeongjae: 1 } as any,
    twelveStages: { imgwan: 1, jewang: 1 } as any,
    relations: [] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '화' as any,
    currentDaeunElement: '수' as any,
    currentSaeunElement: '화' as any,
    currentWolunElement: '목' as any,
    currentIljinElement: '금' as any,
    shinsalList: ['화개', '역마', '천을귀인'] as any,
    dominantWesternElement: 'air',
    planetHouses: { Sun: 1, Moon: 7, Jupiter: 10, Saturn: 6 } as any,
    planetSigns: { Sun: 'Aquarius', Moon: 'Gemini', Jupiter: 'Sagittarius', Saturn: 'Pisces' } as any,
    aspects: [
      { planet1: 'Moon', planet2: 'Saturn', type: 'square' as any },
      { planet1: 'Sun', planet2: 'Jupiter', type: 'trine' as any },
    ],
    activeTransits: ['saturnReturn', 'jupiterReturn', 'mercuryRetrograde'],
    asteroidHouses: { Juno: 7, Pallas: 10, Ceres: 6 } as any,
    astroTimingIndex: {
      decade: 0.66,
      annual: 0.72,
      monthly: 0.74,
      daily: 0.61,
      confidence: 0.8,
      evidenceCount: 5,
    },
    advancedAstroSignals: {
      solarReturn: true,
      progressions: true,
      fixedStars: true,
      midpoints: true,
    },
    crossSnapshot: {
      crossAgreement: 0.62,
      crossEvidence: ['career', 'wealth'],
      astroTimingIndex: {
        annual: 0.72,
      },
    } as any,
    lang: 'ko',
  }
}

function createSummary(): MatrixSummary {
  return {
    totalScore: 78,
    confidenceScore: 0.66,
    strengthPoints: [
      mkHighlight(6, 'imgwan', 'H10', 10, 'career peak'),
      mkHighlight(5, 'samhap', 'trine', 8, 'relationship momentum'),
    ],
    cautionPoints: [
      mkHighlight(5, 'chung', 'opposition', 4, 'communication caution'),
      mkHighlight(4, 'daeunTransition', 'saturnReturn', 3, 'timing caution'),
    ],
    balancePoints: [mkHighlight(3, 'jeongin', 'H6', 7, 'health routine')],
    topSynergies: [],
    overlapTimeline: [
      { month: '2026-04', overlapStrength: 0.78, timeOverlapWeight: 1.2, peakLevel: 'peak' },
    ],
    overlapTimelineByDomain: {
      career: [{ month: '2026-04', overlapStrength: 0.78, timeOverlapWeight: 1.2, peakLevel: 'peak' }],
      love: [{ month: '2026-05', overlapStrength: 0.62, timeOverlapWeight: 1.1, peakLevel: 'high' }],
      money: [{ month: '2026-06', overlapStrength: 0.7, timeOverlapWeight: 1.15, peakLevel: 'high' }],
      health: [{ month: '2026-03', overlapStrength: 0.58, timeOverlapWeight: 1.05, peakLevel: 'normal' }],
      move: [{ month: '2026-07', overlapStrength: 0.64, timeOverlapWeight: 1.1, peakLevel: 'high' }],
    },
  }
}

function createReport(): FusionReport {
  return {
    id: 'next-gen',
    generatedAt: new Date('2026-03-10T00:00:00.000Z'),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '목' as any,
      dayMasterDescription: 'wood',
      dominantSibsin: [] as any,
      keyShinsals: [] as any,
    },
    overallScore: {
      total: 84,
      grade: 'A',
      gradeDescription: 'good',
      gradeDescriptionEn: 'good',
      categoryScores: { strength: 84, opportunity: 80, balance: 76, caution: 66, challenge: 61 },
    },
    topInsights: [
      {
        id: 'ti1',
        domain: 'career',
        category: 'strength',
        title: 'career expansion',
        description: 'career momentum',
        score: 88,
        weightedScore: 88,
        actionItems: [],
        sources: [],
      },
    ] as any,
    domainAnalysis: [
      { domain: 'career', score: 82 },
      { domain: 'relationship', score: 70 },
      { domain: 'wealth', score: 75 },
      { domain: 'health', score: 66 },
      { domain: 'timing', score: 68 },
    ] as any,
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
  } as any
}

describe('next-gen core pipeline sidecar', () => {
  it('builds feature, rule, state, and evaluation zones without replacing current core', () => {
    const matrixInput = createInput()
    const core = runDestinyCore({
      mode: 'calendar',
      lang: 'ko',
      matrixInput,
      matrixReport: createReport(),
      matrixSummary: createSummary(),
    })
    const nextGen = buildNextGenCorePipeline({
      matrixInput,
      core,
    })

    expect(nextGen.featureZone.tokens.length).toBeGreaterThan(0)
    expect(nextGen.ruleZone.activation.domains.length).toBeGreaterThan(0)
    expect(nextGen.ruleZone.rules.domains.length).toBeGreaterThan(0)
    expect(nextGen.scenarioZone.states.domains.length).toBeGreaterThan(0)
    expect(nextGen.verdictZone.canonicalFocusDomain).toBe(core.canonical.focusDomain)
    expect(nextGen.evaluation.coverage.tokenCount).toBeGreaterThan(0)
    expect(typeof nextGen.evaluation.replay.verdictAligned).toBe('boolean')
    expect(nextGen.evaluation.replay.stateRuleAlignmentRate).toBeGreaterThan(0)
    expect(nextGen.evaluation.replay.patternScenarioAlignmentRate).toBeGreaterThan(0)
    expect(typeof nextGen.evaluation.replay.focusScenarioDomainAligned).toBe('boolean')
    expect(typeof nextGen.evaluation.replay.topDecisionDomainAligned).toBe('boolean')
    expect(nextGen.evaluation.calibration.confidenceBand).toBeTruthy()
    expect(nextGen.evaluation.calibration.irreversibilityPressure).toBeGreaterThanOrEqual(0)
    expect(nextGen.evaluation.calibration.domainConcentration).toBeGreaterThanOrEqual(0)
    expect(nextGen.evaluation.calibration.timingSharpness).toBeGreaterThanOrEqual(0)
    expect(nextGen.evaluation.calibration.topScenarioGap).toBeGreaterThanOrEqual(0)
    expect(nextGen.evaluation.calibration.topDecisionGap).toBeGreaterThanOrEqual(0)
    expect(nextGen.evaluation.calibration.scenarioClusterCompression).toBeGreaterThanOrEqual(0)
    expect(nextGen.evaluation.audit.notes.length).toBeGreaterThan(0)
    expect(nextGen.evaluation.influence.topRuleDrivers.length).toBeGreaterThan(0)
    expect(nextGen.evaluation.influence.topPatternDrivers.length).toBeGreaterThan(0)
    expect(nextGen.evaluation.influence.topScenarioDrivers.length).toBeGreaterThan(0)
    expect(nextGen.evaluation.influence.decisionDriver).toBeTruthy()
    expect(nextGen.inputAudit.entries.length).toBeGreaterThan(20)
    const advanced = nextGen.inputAudit.entries.find((entry) => entry.key === 'advancedAstroSignals')
    const shinsal = nextGen.inputAudit.entries.find((entry) => entry.key === 'shinsalList')
    const houses = nextGen.inputAudit.entries.find((entry) => entry.key === 'planetHouses')
    const cross = nextGen.inputAudit.entries.find((entry) => entry.key === 'crossSnapshot')
    const asteroids = nextGen.inputAudit.entries.find((entry) => entry.key === 'asteroidHouses')
    const pillars = nextGen.inputAudit.entries.find((entry) => entry.key === 'pillarElements')
    const stages = nextGen.inputAudit.entries.find((entry) => entry.key === 'twelveStages')
    expect(advanced?.tokenCount).toBeGreaterThan(0)
    expect(advanced?.coverageScore).toBeGreaterThan(0)
    expect(advanced?.verdictPressureScore).toBeGreaterThan(0)
    expect(shinsal?.tokenCount).toBeGreaterThan(0)
    expect(houses?.activationDomains.length).toBeGreaterThan(0)
    expect(cross?.tokenCount).toBeGreaterThan(0)
    expect(asteroids?.activationDomains.length).toBeGreaterThan(0)
    expect(pillars?.manifestationDomains.length).toBeGreaterThan(0)
    expect(stages?.manifestationDomains.length).toBeGreaterThan(0)
    expect(nextGen.inputAudit.summary.highCoverageKeys.length).toBeGreaterThan(0)
    expect(nextGen.inputAudit.summary.highVerdictPressureKeys.length).toBeGreaterThan(0)
  })
})
