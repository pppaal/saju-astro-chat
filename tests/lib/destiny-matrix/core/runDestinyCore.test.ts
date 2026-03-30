import { describe, expect, it } from 'vitest'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { FiveElement } from '@/lib/Saju/types'
import {
  buildNormalizedMatrixInput,
  runDestinyCore,
} from '@/lib/destiny-matrix/core/runDestinyCore'
import { PATTERN_DEFINITIONS } from '@/lib/destiny-matrix/core/patternEngine'

function createInput(overrides: Partial<MatrixCalculationInput> = {}): MatrixCalculationInput {
  return {
    dayMasterElement: '\uBAA9' as FiveElement,
    pillarElements: ['\uBAA9', '\uD654', '\uD1A0', '\uAE08'] as FiveElement[],
    sibsinDistribution: { any: 2 } as any,
    twelveStages: {} as any,
    relations: [
      { kind: 'relation', pillars: ['year', 'month'], detail: 'tension', note: 'n' },
    ] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '\uD654' as FiveElement,
    currentDaeunElement: '\uC218' as FiveElement,
    currentSaeunElement: '\uD654' as FiveElement,
    dominantWesternElement: 'air',
    planetHouses: { Sun: 1, Moon: 7, Jupiter: 10, Saturn: 6 } as any,
    planetSigns: { Sun: 'Aquarius', Moon: 'Gemini' } as any,
    aspects: [
      { planet1: 'Sun', planet2: 'Jupiter', type: 'trine', angle: 120, orb: 1.2 },
      { planet1: 'Moon', planet2: 'Saturn', type: 'square', angle: 90, orb: 2.1 },
    ],
    lang: 'ko',
    ...overrides,
  }
}

function createReport(): FusionReport {
  return {
    id: 'core-test',
    generatedAt: new Date('2026-03-06T00:00:00.000Z'),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '\uBAA9' as FiveElement,
      dayMasterDescription: 'wood',
      dominantSibsin: [] as any,
      keyShinsals: [] as any,
    },
    overallScore: {
      total: 82,
      grade: 'A',
      gradeDescription: 'good',
      gradeDescriptionEn: 'good',
      categoryScores: { strength: 84, opportunity: 80, balance: 76, caution: 63, challenge: 58 },
    },
    topInsights: [
      {
        id: 'ti1',
        domain: 'career',
        category: 'strength',
        title: 'career expansion',
        description: 'career expansion signal',
        score: 86,
        weightedScore: 86,
        actionItems: [],
        sources: [],
      },
      {
        id: 'ti2',
        domain: 'relationship',
        category: 'caution',
        title: 'relationship caution',
        description: 'relationship caution signal',
        score: 70,
        weightedScore: 70,
        actionItems: [],
        sources: [],
      },
    ] as any,
    domainAnalysis: [
      { domain: 'career', score: 81 },
      { domain: 'relationship', score: 69 },
      { domain: 'wealth', score: 73 },
    ] as any,
    timingAnalysis: {
      currentPeriod: {
        name: 'now',
        nameEn: 'now',
        score: 75,
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

describe('buildNormalizedMatrixInput', () => {
  it('normalizes optional advanced fields to explicit empty values', () => {
    const normalized = buildNormalizedMatrixInput(
      createInput({
        shinsalList: undefined,
        activeTransits: undefined,
        advancedAstroSignals: undefined,
      })
    )

    expect(Array.isArray(normalized.shinsalList)).toBe(true)
    expect(Array.isArray(normalized.activeTransits)).toBe(true)
    expect(normalized.advancedAstroSignals).toEqual({})
    expect(normalized.availability.shinsal).toBe('missing-upstream')
    expect(normalized.availability.activeTransits).toBe('missing-upstream')
    expect(normalized.availability.advancedAstroSignals).toBe('missing-upstream')
  })

  it('marks computed-empty arrays correctly', () => {
    const normalized = buildNormalizedMatrixInput(
      createInput({
        shinsalList: [],
        activeTransits: [],
        advancedAstroSignals: {},
      })
    )

    expect(normalized.availability.shinsal).toBe('empty-computed')
    expect(normalized.availability.activeTransits).toBe('empty-computed')
    expect(normalized.availability.advancedAstroSignals).toBe('empty-computed')
  })
})

describe('runDestinyCore', () => {
  it('has expanded deterministic pattern catalog', () => {
    expect(PATTERN_DEFINITIONS.length).toBeGreaterThanOrEqual(40)
  })

  it('produces deterministic strategy and stable core hash for same input', () => {
    const params = {
      mode: 'comprehensive' as const,
      lang: 'ko' as const,
      matrixInput: createInput({ activeTransits: ['saturnReturn'] as any }),
      matrixReport: createReport(),
    }

    const first = runDestinyCore(params)
    const second = runDestinyCore(params)

    expect(first.coreHash).toBe(second.coreHash)
    expect(first.signalSynthesis.claims.length).toBeGreaterThan(0)
    expect(first.patterns.length).toBeGreaterThan(0)
    expect(new Set(first.patterns.map((pattern) => pattern.family)).size).toBeGreaterThanOrEqual(2)
    expect(first.scenarios.length).toBeGreaterThan(0)
    expect(first.decisionEngine.options.length).toBeGreaterThanOrEqual(6)
    expect(first.decisionEngine.topOptionId).toBeTruthy()
    expect(first.quality.score).toBeGreaterThanOrEqual(70)
    expect(first.quality.metrics.selectedSignalCount).toBeGreaterThanOrEqual(7)
    expect(first.quality.metrics.scenarioDomainCount).toBeGreaterThanOrEqual(3)
    expect(first.quality.metrics.decisionOptionCount).toBeGreaterThanOrEqual(6)
    expect(first.quality.metrics.topScenarioGap).toBeGreaterThanOrEqual(0)
    expect(first.quality.metrics.topDecisionGap).toBeGreaterThanOrEqual(0)
    expect(first.quality.metrics.scenarioClusterCompression).toBeGreaterThanOrEqual(0)
    expect(first.quality.metrics.focusDomainAmbiguity).toBeGreaterThanOrEqual(0)
    expect(first.strategyEngine.attackPercent + first.strategyEngine.defensePercent).toBe(100)
    expect(first.availability.activeTransits).toBe('present')
  })

  it('derives named patterns and scenario branches from shared signals', () => {
    const result = runDestinyCore({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput({
        activeTransits: ['jupiterReturn', 'saturnReturn'] as any,
      }),
      matrixReport: createReport(),
    })

    const patternIds = result.patterns.map((pattern) => pattern.id)
    const scenarioIds = result.scenarios.map((scenario) => scenario.id)

    expect(patternIds).toContain('career_expansion')
    expect(
      scenarioIds.includes('promotion_window') ||
        scenarioIds.includes('job_change_window') ||
        scenarioIds.includes('launch_project_window')
    ).toBe(true)
    expect(
      result.quality.grade === 'A' || result.quality.grade === 'B' || result.quality.grade === 'C'
    ).toBe(true)
    expect(result.quality.warnings.includes('selected_signals_under_7')).toBe(false)
    expect(result.decisionEngine.options.some((option) => option.domain === 'career')).toBe(true)
  })

  it('tracks advanced signal availability quality from rich input values', () => {
    const result = runDestinyCore({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput({
        advancedAstroSignals: {
          solarReturn: { confidence: 0.78 },
          lunarReturn: ['Moon', 'ASC'],
          harmonics: 'active',
          eclipses: { impact: ['Moon', 'Sun'] },
        } as any,
        sajuSnapshot: { unse: { daeun: [{ age: 31 }] } } as any,
        astrologySnapshot: { natalChart: { planets: [{ name: 'Sun' }] } } as any,
        crossSnapshot: { source: 'test', crossAgreement: 0.61 } as any,
      }),
      matrixReport: createReport(),
    })

    expect(result.availability.advancedAstroSignals).toBe('present')
    expect(result.quality.metrics.advancedSignalCount).toBeGreaterThanOrEqual(3)
    expect(result.quality.metrics.snapshotSignalCount).toBeGreaterThanOrEqual(3)
  })

  it('promotes iljin-aware inputs into now-window scenarios', () => {
    const result = runDestinyCore({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput({
        currentWolunElement: '수' as FiveElement,
        currentIljinElement: '화' as FiveElement,
        currentIljinDate: '2026-03-10',
        activeTransits: [] as any,
      }),
      matrixReport: createReport(),
    })

    expect(result.scenarios.some((scenario) => scenario.window === 'now')).toBe(true)
  })

  it('uses astro timing index daily activation to produce now-window scenarios', () => {
    const result = runDestinyCore({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput({
        currentWolunElement: undefined,
        currentIljinElement: undefined,
        currentIljinDate: undefined,
        activeTransits: [] as any,
        astroTimingIndex: {
          decade: 0.22,
          annual: 0.31,
          monthly: 0.44,
          daily: 0.73,
          confidence: 0.86,
          evidenceCount: 4,
        },
      }),
      matrixReport: createReport(),
    })

    expect(result.scenarios.some((scenario) => scenario.window === 'now')).toBe(true)
  })

  it('penalizes cross agreement when contradiction and lead-lag stay high', () => {
    const stable = runDestinyCore({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput({
        crossSnapshot: {
          source: 'test',
          crossAgreement: 0.66,
          crossAgreementMatrix: [
            {
              domain: 'career',
              timescales: {
                now: { agreement: 0.82, contradiction: 0.08, leadLag: 0.04 },
                '1-3m': { agreement: 0.79, contradiction: 0.12, leadLag: 0.06 },
              },
              leadLag: 0.05,
            },
            {
              domain: 'wealth',
              timescales: {
                now: { agreement: 0.74, contradiction: 0.1, leadLag: 0.08 },
              },
              leadLag: 0.08,
            },
          ],
        } as any,
      }),
      matrixReport: createReport(),
    })

    const stressed = runDestinyCore({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput({
        crossSnapshot: {
          source: 'test',
          crossAgreement: 0.66,
          crossAgreementMatrix: [
            {
              domain: 'career',
              timescales: {
                now: { agreement: 0.82, contradiction: 0.48, leadLag: 0.58 },
                '1-3m': { agreement: 0.79, contradiction: 0.42, leadLag: 0.44 },
              },
              leadLag: 0.51,
            },
            {
              domain: 'wealth',
              timescales: {
                now: { agreement: 0.74, contradiction: 0.45, leadLag: 0.53 },
              },
              leadLag: 0.53,
            },
          ],
        } as any,
      }),
      matrixReport: createReport(),
    })

    expect(stable.canonical.crossAgreement).not.toBeNull()
    expect(stressed.canonical.crossAgreement).not.toBeNull()
    expect((stable.canonical.crossAgreement || 0) - (stressed.canonical.crossAgreement || 0)).toBeGreaterThan(0.1)
  })
})
