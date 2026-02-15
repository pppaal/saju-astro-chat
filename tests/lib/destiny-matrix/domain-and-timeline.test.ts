import { describe, expect, it } from 'vitest'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix/engine'
import { computeDomainScores } from '@/lib/destiny-matrix/domainScoring'
import { computeDomainBaseNorm } from '@/lib/destiny-matrix/domainMap'
import {
  generateMonthlyOverlapTimeline,
  generateTimelineByDomain,
} from '@/lib/destiny-matrix/monthlyTimeline'
import { deriveCalendarSignals } from '@/lib/destiny-matrix/calendarSignals'
import type {
  DomainKey,
  DomainScore,
  MatrixCalculationInput,
  MonthlyOverlapPoint,
} from '@/lib/destiny-matrix/types'

function buildInput(overrides: Partial<MatrixCalculationInput> = {}): MatrixCalculationInput {
  return {
    dayMasterElement: '\uBAA9',
    pillarElements: ['\uBAA9', '\uD654', '\uD1A0', '\uAE08'],
    sibsinDistribution: {},
    twelveStages: {},
    relations: [],
    geokguk: 'jeonggwan',
    yongsin: '\uC218',
    currentDaeunElement: '\uD654',
    planetHouses: { Sun: 1, Moon: 4, Mars: 10, Jupiter: 9 },
    planetSigns: { Sun: '\uC591\uC790\uB9AC', Moon: '\uC0AC\uC790\uC790\uB9AC' },
    aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'trine' }],
    activeTransits: ['saturnReturn', 'jupiterReturn'],
    ...overrides,
  }
}

function makeDomainScore(finalScoreAdjusted: number): DomainScore {
  return {
    domain: 'career',
    baseFinalScore: 6,
    finalScoreAdjusted,
    sajuComponentScore: 0.6,
    astroComponentScore: 0.6,
    alignmentScore: 1,
    overlapStrength: 0.6,
    timeOverlapWeight: 1.18,
    confidenceScore: 0.8,
    drivers: [],
    cautions: [],
  }
}

function makeDomainScoreMap(
  scoreByDomain: Record<DomainKey, number>
): Record<DomainKey, DomainScore> {
  return {
    career: { ...makeDomainScore(scoreByDomain.career), domain: 'career' },
    love: { ...makeDomainScore(scoreByDomain.love), domain: 'love' },
    money: { ...makeDomainScore(scoreByDomain.money), domain: 'money' },
    health: { ...makeDomainScore(scoreByDomain.health), domain: 'health' },
    move: { ...makeDomainScore(scoreByDomain.move), domain: 'move' },
  }
}

describe('destiny-matrix domain and timeline', () => {
  it('domain_scores_exist_for_all_domains', () => {
    const result = calculateDestinyMatrix(buildInput())

    const domainScores = result.summary.domainScores
    expect(domainScores).toBeDefined()
    expect(domainScores).toHaveProperty('career')
    expect(domainScores).toHaveProperty('love')
    expect(domainScores).toHaveProperty('money')
    expect(domainScores).toHaveProperty('health')
    expect(domainScores).toHaveProperty('move')
  })

  it('domain_base_score_changes_when_specific_layer_increases', () => {
    const baseNorms = {
      layer1: 0.1,
      layer2: 0.1,
      layer3: 0.1,
      layer4: 0.1,
      layer5: 0.1,
      layer6: 0.1,
      layer7: 0.1,
      layer8: 0.1,
      layer9: 0.1,
      layer10: 0.1,
    }
    const boostedNorms = { ...baseNorms, layer2: 0.6 }

    const careerDelta =
      computeDomainBaseNorm(boostedNorms, 'career') - computeDomainBaseNorm(baseNorms, 'career')
    const moneyDelta =
      computeDomainBaseNorm(boostedNorms, 'money') - computeDomainBaseNorm(baseNorms, 'money')
    const healthDelta =
      computeDomainBaseNorm(boostedNorms, 'health') - computeDomainBaseNorm(baseNorms, 'health')

    expect(careerDelta).toBeGreaterThan(0)
    expect(moneyDelta).toBeGreaterThan(0)
    expect(careerDelta).toBeGreaterThan(healthDelta)
    expect(moneyDelta).toBeGreaterThan(healthDelta)

    const scores = computeDomainScores({
      input: buildInput(),
      layerScores: boostedNorms,
      baseFinalScore: 5,
      sajuComponentScore: 0.6,
      astroComponentScore: 0.6,
      alignmentScore: 1,
      overlapStrength: 0.5,
      timeOverlapWeight: 1.15,
      confidenceScore: 0.8,
    })

    expect(scores.career.baseFinalScore).toBeGreaterThan(0)
  })

  it('timeline_has_12_months_and_sorted', () => {
    const timeline = generateMonthlyOverlapTimeline({
      input: buildInput(),
      layer4: {},
      layer7: {},
      startYearMonth: '2026-02',
      baseOverlapStrength: 0.62,
    })

    expect(timeline).toHaveLength(12)
    expect(timeline[0].month).toBe('2026-02')
    expect(timeline[11].month).toBe('2027-01')

    for (let i = 1; i < timeline.length; i += 1) {
      expect(timeline[i].month > timeline[i - 1].month).toBe(true)
    }
  })

  it('peak_level_rules_apply', () => {
    const timeline = generateMonthlyOverlapTimeline({
      input: buildInput(),
      layer4: {},
      layer7: {},
      startYearMonth: '2026-02',
      baseOverlapStrength: 0.72,
    })

    for (const point of timeline) {
      if (point.overlapStrength >= 0.75) {
        expect(point.peakLevel).toBe('peak')
      } else if (point.overlapStrength >= 0.6) {
        expect(point.peakLevel).toBe('high')
      } else {
        expect(point.peakLevel).toBe('normal')
      }
    }
  })

  it('timeline_by_domain_scales_with_domain_intensity', () => {
    const globalTimeline: MonthlyOverlapPoint[] = [
      { month: '2026-02', overlapStrength: 0.6, timeOverlapWeight: 1.18, peakLevel: 'high' },
    ]

    const domainScores = makeDomainScoreMap({
      career: 9,
      love: 6,
      money: 7,
      health: 5,
      move: 5,
    })

    const byDomain = generateTimelineByDomain(globalTimeline, domainScores)

    expect(byDomain.career[0].overlapStrength).toBeGreaterThan(byDomain.health[0].overlapStrength)
    expect(byDomain.career[0].overlapStrength).toBeGreaterThan(byDomain.move[0].overlapStrength)
  })

  it('calendar_signals_include_peak_months', () => {
    const signals = deriveCalendarSignals({
      finalScoreAdjusted: 7.8,
      timeOverlapWeight: 1.2,
      alignmentScore: 0.8,
      confidenceScore: 0.9,
      overlapTimeline: [
        { month: '2026-03', overlapStrength: 0.8, timeOverlapWeight: 1.24, peakLevel: 'peak' },
      ],
      overlapTimelineByDomain: {
        career: [
          { month: '2026-04', overlapStrength: 0.81, timeOverlapWeight: 1.243, peakLevel: 'peak' },
        ],
        love: [],
        money: [],
        health: [],
        move: [],
      },
    })

    expect(signals.some((s) => s.trigger === 'Peak Convergence Window (2026-03)')).toBe(true)
    expect(signals.some((s) => s.trigger === 'Peak career window (2026-04)')).toBe(true)
  })
})
