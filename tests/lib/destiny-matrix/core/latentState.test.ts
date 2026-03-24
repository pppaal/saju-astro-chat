import { describe, expect, it } from 'vitest'
import type {
  MatrixCalculationInput,
  MatrixHighlight,
  MatrixSummary,
} from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { FiveElement } from '@/lib/Saju/types'
import { runDestinyCore } from '@/lib/destiny-matrix/core/runDestinyCore'

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
    dayMasterElement: '목' as FiveElement,
    pillarElements: ['목', '화', '토', '금'] as FiveElement[],
    sibsinDistribution: { pyeonjae: 2, jeongjae: 1, sanggwan: 1, jeonggwan: 1 } as any,
    twelveStages: { imgwan: 1, jewang: 1, soe: 1, byeong: 1 } as any,
    relations: [
      { kind: 'clash', pillars: ['year', 'month'], detail: 'tension' },
      { kind: 'harmony', pillars: ['day', 'hour'], detail: 'support' },
    ] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '화' as FiveElement,
    currentDaeunElement: '수' as FiveElement,
    currentSaeunElement: '화' as FiveElement,
    currentWolunElement: '목' as FiveElement,
    currentIljinElement: '화' as FiveElement,
    shinsalList: ['천을귀인', '역마', '망신'] as any,
    dominantWesternElement: 'air',
    planetHouses: { Sun: 1, Moon: 7, Mercury: 1, Venus: 5, Mars: 7, Jupiter: 10, Saturn: 6 } as any,
    planetSigns: {
      Sun: 'Aquarius',
      Moon: 'Gemini',
      Mercury: 'Aquarius',
      Venus: 'Pisces',
      Mars: 'Leo',
      Jupiter: 'Sagittarius',
      Saturn: 'Pisces',
    } as any,
    aspects: [
      { planet1: 'Sun', planet2: 'Jupiter', type: 'trine', orb: 1.2, angle: 120 },
      { planet1: 'Moon', planet2: 'Mars', type: 'opposition', orb: 2.4, angle: 180 },
    ],
    activeTransits: ['saturnReturn', 'jupiterReturn', 'mercuryRetrograde'],
    advancedAstroSignals: {
      solarReturn: true,
      lunarReturn: true,
      progressions: true,
      draconic: true,
      harmonics: true,
      fixedStars: true,
      eclipses: true,
      midpoints: true,
      asteroids: true,
      extraPoints: true,
    },
    crossSnapshot: { source: 'latent-test', crossAgreement: 0.62 } as any,
    profileContext: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      birthCity: 'Seoul',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      houseSystem: 'placidus',
      analysisAt: '2026-03-10T00:00:00.000Z',
    },
    lang: 'ko',
    startYearMonth: '2026-01',
  }
}

function createSummary(): MatrixSummary {
  return {
    totalScore: 78,
    confidenceScore: 0.66,
    strengthPoints: [mkHighlight(6, 'imgwan', 'H10', 10, 'career peak')],
    balancePoints: [mkHighlight(3, 'jeongin', 'H6', 7, 'health routine')],
    cautionPoints: [mkHighlight(4, 'daeunTransition', 'saturnReturn', 3, 'timing caution')],
    topSynergies: [],
    overlapTimeline: [
      {
        month: '2026-04',
        overlapStrength: 0.78,
        timeOverlapWeight: 1.2,
        peakLevel: 'peak',
        probeDay: 15,
      },
      {
        month: '2026-07',
        overlapStrength: 0.65,
        timeOverlapWeight: 1.1,
        peakLevel: 'high',
        probeDay: 20,
      },
    ],
    timingCalibration: {
      readinessScore: 0.78,
      triggerScore: 0.63,
      convergenceScore: 0.7,
      pastStability: 0.68,
      futureStability: 0.72,
      backtestConsistency: 0.66,
      reliabilityScore: 0.7,
      reliabilityBand: 'high',
    },
  }
}

function createReport(): FusionReport {
  return {
    id: 'latent-test',
    generatedAt: new Date('2026-03-10T00:00:00.000Z'),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '목' as FiveElement,
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

describe('destiny latent state', () => {
  it('builds a stable 72-axis latent state from the core result', () => {
    const core = runDestinyCore({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput(),
      matrixReport: createReport(),
      matrixSummary: createSummary(),
    })

    expect(core.latentState.version).toBe('v3-96')
    expect(Object.keys(core.latentState.dimensions)).toHaveLength(96)
    expect(core.latentState.groups.structural).toHaveLength(20)
    expect(core.latentState.groups.timing).toHaveLength(18)
    expect(core.latentState.groups.astrology).toHaveLength(16)
    expect(core.latentState.groups.domain).toHaveLength(20)
    expect(core.latentState.groups.conflict).toHaveLength(14)
    expect(core.latentState.groups.narrative).toHaveLength(8)
    expect(core.latentState.topAxes).toHaveLength(12)
    expect(core.latentState.dimensions.readiness).toBeGreaterThan(0)
    expect(core.latentState.dimensions.trigger).toBeGreaterThan(0)
    expect(core.latentState.dimensions.action_focus_strength).toBeGreaterThanOrEqual(0)
    expect(core.latentState.dimensions.action_focus_strength).toBeLessThanOrEqual(1)
    expect(core.latentState.dimensions.timing_reliability).toBeGreaterThan(0)
    expect(core.latentState.dimensions.draconic_support).toBeGreaterThanOrEqual(0)
    expect(core.latentState.dimensions.career_growth).toBeGreaterThanOrEqual(0)
    expect(core.latentState.dimensions.evidence_cohesion).toBeGreaterThanOrEqual(0)

    expect(core.latentState.dimensions.projection_clarity).toBeGreaterThanOrEqual(0)
    expect(core.latentState.dimensions.explanation_depth).toBeGreaterThanOrEqual(0)
    expect(core.latentState.dimensions.career_authority).toBeGreaterThanOrEqual(0)
    expect(core.latentState.dimensions.return_stack_pressure).toBeGreaterThanOrEqual(0)
  })
})
