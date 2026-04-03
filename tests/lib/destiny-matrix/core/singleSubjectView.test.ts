import { describe, expect, it } from 'vitest'
import {
  buildCoreEnvelope,
  adaptCoreToCounselor,
  adaptCoreToReport,
} from '@/lib/destiny-matrix/core'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { FiveElement } from '@/lib/Saju/types'

function createInput(overrides: Partial<MatrixCalculationInput> = {}): MatrixCalculationInput {
  return {
    dayMasterElement: '목' as FiveElement,
    pillarElements: ['목', '화', '토', '금'] as FiveElement[],
    sibsinDistribution: { 비견: 2, 식신: 1, 정관: 1 } as any,
    twelveStages: { 장생: 1, 왕지: 1 } as any,
    relations: [
      { kind: '지지육합', detail: 'support', note: 'stable bond' },
      { kind: '지지충', detail: 'tension', note: 'mobility pressure' },
    ] as any,
    geokguk: 'jeonggwan',
    yongsin: '화' as FiveElement,
    currentDaeunElement: '수' as FiveElement,
    currentSaeunElement: '화' as FiveElement,
    currentWolunElement: '목' as FiveElement,
    shinsalList: ['역마', '천을귀인'] as any,
    planetHouses: { Sun: 1, Moon: 4, Jupiter: 10, Saturn: 6, Venus: 7 } as any,
    planetSigns: { Sun: 'Aquarius', Moon: 'Gemini', Venus: 'Capricorn' } as any,
    aspects: [
      { planet1: 'Sun', planet2: 'Moon', type: 'trine', angle: 120, orb: 1.4 },
      { planet1: 'Venus', planet2: 'Saturn', type: 'conjunction', angle: 0, orb: 2.1 },
    ] as any,
    activeTransits: ['saturnReturn', 'jupiterReturn'] as any,
    lang: 'ko',
    ...overrides,
  }
}

describe('single subject view adapters', () => {
  it('derives a deterministic single-subject projection for counselor and report surfaces', () => {
    const envelope = buildCoreEnvelope({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput(),
    })

    const counselorVm = adaptCoreToCounselor(envelope.coreSeed)
    const reportVm = adaptCoreToReport(envelope.coreSeed)

    expect(counselorVm.singleSubjectView.directAnswer.length).toBeGreaterThan(0)
    expect(counselorVm.singleSubjectView.structureAxis.topAxes.length).toBeGreaterThan(0)
    expect(counselorVm.singleSubjectView.actionAxis.nowAction.length).toBeGreaterThan(0)
    expect(counselorVm.singleSubjectView.actionAxis.whyThisFirst.length).toBeGreaterThan(0)
    expect(counselorVm.singleSubjectView.timingState.windows).toHaveLength(4)
    expect(counselorVm.singleSubjectView.competingPressures.length).toBeGreaterThanOrEqual(2)
    expect(
      counselorVm.singleSubjectView.competingPressures.every((item) =>
        ['open', 'mixed', 'blocked'].includes(item.status)
      )
    ).toBe(true)
    expect(counselorVm.singleSubjectView.branches.length).toBeGreaterThanOrEqual(1)
    expect(counselorVm.singleSubjectView.branches[0]?.nextMove.length).toBeGreaterThan(0)
    expect(reportVm.singleSubjectView.directAnswer).toBe(counselorVm.singleSubjectView.directAnswer)
  })
})
