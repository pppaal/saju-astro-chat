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

describe('person model adapters', () => {
  it('builds a multidimensional person model for counselor and report surfaces', () => {
    const envelope = buildCoreEnvelope({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput(),
    })

    const counselorVm = adaptCoreToCounselor(envelope.coreSeed)
    const reportVm = adaptCoreToReport(envelope.coreSeed)

    expect(counselorVm.personModel.subject.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.structuralCore.overview.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.formationProfile.summary.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.timeProfile.timingNarrative.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.timeProfile.windows.length).toBeGreaterThanOrEqual(1)
    expect(counselorVm.personModel.layers).toHaveLength(4)
    expect(counselorVm.personModel.states.map((state) => state.key)).toEqual([
      'baseline',
      'pressure',
      'opportunity',
    ])
    expect(counselorVm.personModel.dimensions.length).toBeGreaterThanOrEqual(2)
    expect(counselorVm.personModel.domainStateGraph.length).toBeGreaterThanOrEqual(2)
    expect(counselorVm.personModel.domainStateGraph[0]?.timescales).toHaveLength(4)
    expect(counselorVm.personModel.domainPortraits.length).toBeGreaterThanOrEqual(2)
    expect(counselorVm.personModel.appliedProfile.foodProfile.helpfulFoods.length).toBeGreaterThan(
      0
    )
    expect(
      counselorVm.personModel.appliedProfile.lifeRhythmProfile.peakWindows.length
    ).toBeGreaterThan(0)
    expect(
      counselorVm.personModel.appliedProfile.relationshipStyleProfile.repairMoves.length
    ).toBeGreaterThan(0)
    expect(
      counselorVm.personModel.appliedProfile.workStyleProfile.bestConditions.length
    ).toBeGreaterThan(0)
    expect(
      counselorVm.personModel.appliedProfile.moneyStyleProfile.controlRules.length
    ).toBeGreaterThan(0)
    expect(counselorVm.personModel.relationshipProfile.summary.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.careerProfile.summary.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.futureBranches.length).toBeGreaterThanOrEqual(1)
    expect(counselorVm.personModel.eventOutlook.length).toBe(5)
    expect(counselorVm.personModel.eventOutlook[0]?.entryConditions.length).toBeGreaterThanOrEqual(
      1
    )
    expect(counselorVm.personModel.birthTimeHypotheses.length).toBeGreaterThanOrEqual(3)
    expect(counselorVm.personModel.birthTimeHypotheses[0]?.summary.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.crossConflictMap.length).toBeGreaterThanOrEqual(1)
    expect(counselorVm.personModel.crossConflictMap[0]?.resolutionMove.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.pastEventReconstruction.summary.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.pastEventReconstruction.markers.length).toBeGreaterThanOrEqual(3)
    expect(counselorVm.personModel.uncertaintyEnvelope.summary.length).toBeGreaterThan(0)
    expect(counselorVm.personModel.evidenceLedger.topClaimIds.length).toBeGreaterThanOrEqual(1)

    expect(reportVm.personModel.overview.length).toBeGreaterThan(0)
    expect(reportVm.personModel.dimensions[0]?.summary.length).toBeGreaterThan(0)
    expect(reportVm.personModel.domainStateGraph[0]?.thesis.length).toBeGreaterThan(0)
    expect(reportVm.personModel.appliedProfile.foodProfile.summary.length).toBeGreaterThan(0)
    expect(reportVm.personModel.domainPortraits[0]?.summary.length).toBeGreaterThan(0)
    expect(reportVm.personModel.futureBranches[0]?.conditions.length).toBeGreaterThan(0)
    expect(reportVm.personModel.eventOutlook[0]?.nextMove.length).toBeGreaterThan(0)
    expect(reportVm.personModel.birthTimeHypotheses[0]?.birthTime).toMatch(/^\d{2}:\d{2}$/)
    expect(reportVm.personModel.crossConflictMap[0]?.summary.length).toBeGreaterThan(0)
    expect(
      reportVm.personModel.pastEventReconstruction.markers[0]?.evidence.length
    ).toBeGreaterThan(0)
  })

  it('prefers runtime birth-time rectification candidates when available', () => {
    const envelope = buildCoreEnvelope({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput({
        profileContext: {
          birthTime: '06:30',
          birthTimeRectification: {
            currentBirthTime: '06:30',
            candidates: [
              {
                birthTime: '06:30',
                label: '기록된 생시',
                status: 'current-best',
                fitScore: 0.91,
                confidence: 0.86,
                summary: '실측 차트 기준으로 기록된 생시가 가장 안정적입니다.',
                supportSignals: ['상승궁 유지', '시주 유지'],
                cautionSignals: ['관계 축은 민감'],
              },
              {
                birthTime: '04:30',
                label: '비교 생시',
                status: 'plausible',
                fitScore: 0.63,
                confidence: 0.49,
                summary: '비교 생시에서는 해석 축이 더 흔들립니다.',
                supportSignals: ['시주 변경'],
                cautionSignals: ['커리어 축 민감도 상승'],
              },
            ],
          },
        },
      }),
    })

    const counselorVm = adaptCoreToCounselor(envelope.coreSeed)

    expect(counselorVm.personModel.birthTimeHypotheses).toHaveLength(2)
    expect(counselorVm.personModel.birthTimeHypotheses[0]?.birthTime).toBe('06:30')
    expect(counselorVm.personModel.birthTimeHypotheses[0]?.summary).toContain('기록된 생시')
    expect(counselorVm.personModel.birthTimeHypotheses[0]?.supportSignals[0]).toBe('상승궁 유지')
  })
})
