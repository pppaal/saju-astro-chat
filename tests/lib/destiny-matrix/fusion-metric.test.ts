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
    planetHouses: { Sun: 1, Moon: 4, Mars: 10, Jupiter: 9 },
    planetSigns: { Sun: '양자리', Moon: '사자자리' },
    aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'trine' }],
    ...overrides,
  }
}

const sampleCell: MatrixCell = {
  interaction: {
    level: 'balance',
    score: 6,
    icon: 'ok',
    colorCode: 'blue',
    keyword: 'k',
    keywordEn: 'k',
  },
}

describe('Destiny Matrix fusion metric', () => {
  it('alignment_is_max_when_scores_equal', () => {
    expect(calculateAlignmentTerm(0.7, 0.7)).toBe(1)
  })

  it('alignment_decreases_as_gap_increases', () => {
    const smallGap = calculateAlignmentTerm(0.6, 0.5)
    const largeGap = calculateAlignmentTerm(0.9, 0.2)
    expect(smallGap).toBeGreaterThan(largeGap)
  })

  it('time_overlap_weight_increases_when_saju_and_astro_timing_converge', () => {
    const aligned = calculateTimeOverlapWeight(
      buildInput({
        currentDaeunElement: '화',
        activeTransits: ['jupiterReturn', 'marsRetrograde'],
      }),
      { a: sampleCell, b: sampleCell },
      { c: sampleCell }
    )
    const misaligned = calculateTimeOverlapWeight(
      buildInput({
        currentDaeunElement: '수',
        activeTransits: ['jupiterReturn', 'marsRetrograde'],
      }),
      { a: sampleCell, b: sampleCell },
      { c: sampleCell }
    )

    expect(aligned.timeOverlapWeight).toBeGreaterThan(misaligned.timeOverlapWeight)
  })

  it('final_score_adjusted_changes_with_alignment_and_time_overlap', () => {
    const highOverlap = calculateDestinyMatrix(
      buildInput({
        currentDaeunElement: '화',
        activeTransits: ['jupiterReturn', 'marsRetrograde', 'saturnReturn'],
      })
    )
    const lowOverlap = calculateDestinyMatrix(
      buildInput({
        currentDaeunElement: '수',
        activeTransits: ['jupiterReturn', 'marsRetrograde', 'saturnReturn'],
      })
    )

    expect(highOverlap.summary.finalScoreAdjusted).toBeDefined()
    expect(lowOverlap.summary.finalScoreAdjusted).toBeDefined()
    expect(highOverlap.summary.finalScoreAdjusted).not.toBe(lowOverlap.summary.finalScoreAdjusted)
  })
})
