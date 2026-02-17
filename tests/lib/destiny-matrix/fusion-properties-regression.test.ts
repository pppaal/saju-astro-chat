import { describe, expect, it } from 'vitest'
import { calculateAlignmentTerm } from '@/lib/destiny-matrix/alignment'
import { calculateTimeOverlapWeight } from '@/lib/destiny-matrix/timeOverlap'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix/engine'
import type { MatrixCalculationInput, MatrixCell } from '@/lib/destiny-matrix/types'

function buildInput(overrides: Partial<MatrixCalculationInput> = {}): MatrixCalculationInput {
  return {
    dayMasterElement: '목',
    pillarElements: ['목', '화', '토', '금'],
    sibsinDistribution: { 비견: 1, 정관: 1, 식신: 1 },
    twelveStages: { 장생: 1, 왕지: 1 },
    relations: [{ kind: '지지삼합', detail: '寅午戌' }],
    geokguk: 'jeonggwan',
    yongsin: '수',
    currentDaeunElement: '화',
    currentSaeunElement: '목',
    planetHouses: { Sun: 1, Moon: 4, Mars: 10, Jupiter: 9 },
    planetSigns: { Sun: '양자리', Moon: '사자자리' },
    aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'trine' }],
    activeTransits: ['jupiterReturn'],
    startYearMonth: '2026-03',
    ...overrides,
  }
}

const CELL: MatrixCell = {
  interaction: {
    level: 'balance',
    score: 6,
    icon: 'ok',
    colorCode: 'blue',
    keyword: 'k',
    keywordEn: 'k',
  },
}

describe('Destiny matrix fusion property regression', () => {
  it('alignment decreases as saju/astro gap increases', () => {
    const close = calculateAlignmentTerm(0.65, 0.6)
    const far = calculateAlignmentTerm(0.9, 0.1)
    expect(close).toBeGreaterThan(far)
  })

  it('time overlap weight stays in clamp [1.0, 1.3]', () => {
    const low = calculateTimeOverlapWeight(
      buildInput({
        currentDaeunElement: undefined,
        currentSaeunElement: undefined,
        activeTransits: [],
      }),
      {},
      {}
    )
    const high = calculateTimeOverlapWeight(
      buildInput({
        activeTransits: ['jupiterReturn', 'saturnReturn', 'nodeReturn', 'eclipse', 'plutoTransit'],
      }),
      { a: CELL, b: CELL, c: CELL, d: CELL },
      { a: CELL, b: CELL, c: CELL, d: CELL }
    )

    expect(low.timeOverlapWeight).toBeGreaterThanOrEqual(1.0)
    expect(low.timeOverlapWeight).toBeLessThanOrEqual(1.3)
    expect(high.timeOverlapWeight).toBeGreaterThanOrEqual(1.0)
    expect(high.timeOverlapWeight).toBeLessThanOrEqual(1.3)
    expect(high.timeOverlapWeight).toBeGreaterThanOrEqual(low.timeOverlapWeight)
  })

  it('finalScoreAdjusted reflects overlap changes', () => {
    const low = calculateDestinyMatrix(buildInput({ activeTransits: [] }))
    const high = calculateDestinyMatrix(
      buildInput({
        activeTransits: ['jupiterReturn', 'saturnReturn', 'nodeReturn', 'eclipse'],
      })
    )
    expect(low.summary.finalScoreAdjusted).not.toBe(high.summary.finalScoreAdjusted)
  })

  it('timeline is deterministic and sorted when startYearMonth is fixed', () => {
    const a = calculateDestinyMatrix(buildInput({ startYearMonth: '2026-03' }))
    const b = calculateDestinyMatrix(buildInput({ startYearMonth: '2026-03' }))
    const monthsA = (a.summary.overlapTimeline || []).map((p) => p.month)
    const monthsB = (b.summary.overlapTimeline || []).map((p) => p.month)

    expect(monthsA).toEqual(monthsB)
    expect(monthsA[0]).toBe('2026-03')
    for (let i = 1; i < monthsA.length; i += 1) {
      expect(monthsA[i] > monthsA[i - 1]).toBe(true)
    }
  })

  it('drivers/cautions and domain scores remain deterministic', () => {
    const a = calculateDestinyMatrix(buildInput())
    const b = calculateDestinyMatrix(buildInput())
    expect(a.summary.drivers).toEqual(b.summary.drivers)
    expect(a.summary.cautions).toEqual(b.summary.cautions)
    expect(a.summary.domainScores).toEqual(b.summary.domainScores)
  })
})
