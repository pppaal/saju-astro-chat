import { describe, expect, it } from 'vitest'

import {
  selectStrongestMonthlyProbe,
  selectStrongestMonthlyProbeForDomain,
} from '@/lib/destiny-matrix/monthlyTimelinePrecise'
import type { DomainScore, MatrixCalculationInput } from '@/lib/destiny-matrix/types'

function makeProbe(month: string, astroTimingIndex: number, probeDay = 1) {
  return {
    month,
    monthIndex: 0,
    probeDay,
    input: {
      astroTimingIndex,
    } as MatrixCalculationInput,
  }
}

function makeDomainScore(
  domain: DomainScore['domain'],
  finalScoreAdjusted: number,
  overlapStrength: number
): DomainScore {
  return {
    domain,
    baseFinalScore: finalScoreAdjusted,
    finalScoreAdjusted,
    sajuComponentScore: 0.6,
    astroComponentScore: 0.6,
    alignmentScore: 0.6,
    overlapStrength,
    timeOverlapWeight: 1.1,
    confidenceScore: 0.7,
    drivers: [],
    cautions: [],
  }
}

describe('monthlyTimelinePrecise', () => {
  it('selects the strongest monthly probe by overlap first', () => {
    const selected = selectStrongestMonthlyProbe([
      {
        probe: makeProbe('2026-03', 0.3),
        summary: { overlapStrength: 0.62, timeOverlapWeight: 1.02 },
      },
      {
        probe: makeProbe('2026-03', 0.1),
        summary: { overlapStrength: 0.71, timeOverlapWeight: 0.96 },
      },
      {
        probe: makeProbe('2026-03', 0.8),
        summary: { overlapStrength: 0.69, timeOverlapWeight: 1.1 },
      },
    ])

    expect(selected?.summary.overlapStrength).toBe(0.71)
  })

  it('breaks ties with timeOverlapWeight and astroTimingIndex', () => {
    const selected = selectStrongestMonthlyProbe([
      {
        probe: makeProbe('2026-03', 0.2),
        summary: { overlapStrength: 0.7, timeOverlapWeight: 1.01 },
      },
      {
        probe: makeProbe('2026-03', 0.9),
        summary: { overlapStrength: 0.7, timeOverlapWeight: 1.01 },
      },
      {
        probe: makeProbe('2026-03', 0.1),
        summary: { overlapStrength: 0.7, timeOverlapWeight: 0.98 },
      },
    ])

    expect(selected?.probe.input.astroTimingIndex).toBe(0.9)
  })

  it('lets domain timelines choose a stronger intra-month probe for that domain', () => {
    const selected = selectStrongestMonthlyProbeForDomain('health', [
      {
        probe: makeProbe('2026-03', 0.4, 1),
        summary: {
          domainScores: {
            career: makeDomainScore('career', 4.2, 0.41),
            love: makeDomainScore('love', 4.2, 0.41),
            money: makeDomainScore('money', 4.2, 0.41),
            health: makeDomainScore('health', 6.9, 0.72),
            move: makeDomainScore('move', 4.2, 0.41),
          },
        },
      },
      {
        probe: makeProbe('2026-03', 0.2, 22),
        summary: {
          domainScores: {
            career: makeDomainScore('career', 4.2, 0.41),
            love: makeDomainScore('love', 4.2, 0.41),
            money: makeDomainScore('money', 4.2, 0.41),
            health: makeDomainScore('health', 7.0, 0.72),
            move: makeDomainScore('move', 4.2, 0.41),
          },
        },
      },
    ])

    expect(selected?.probe.probeDay).toBe(22)
  })
})
