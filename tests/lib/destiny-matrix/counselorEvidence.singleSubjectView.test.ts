import { describe, expect, it } from 'vitest'
import { buildCoreEnvelope, adaptCoreToCounselor } from '@/lib/destiny-matrix/core'
import { formatCounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
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

describe('counselor evidence formatting', () => {
  it('shapes the packet with action-first, timing, branch, and risk ordering', () => {
    const envelope = buildCoreEnvelope({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput(),
    })
    const counselorVm = adaptCoreToCounselor(envelope.coreSeed)

    const text = formatCounselorEvidencePacket(
      {
        focusDomain: counselorVm.focusDomain,
        riskAxisLabel: counselorVm.riskAxisLabel,
        branchSet: counselorVm.branchSet,
        singleSubjectView: counselorVm.singleSubjectView,
        projections: counselorVm.projections,
        canonicalBrief: {
          answerThesis: counselorVm.answerThesis,
          actionFocusDomain: counselorVm.actionFocusDomain,
          topDecisionLabel: counselorVm.topDecisionLabel || undefined,
          topDecisionAction: counselorVm.topDecisionAction || undefined,
        },
        topTimingWindow: {
          window: counselorVm.domainTimingWindows[0]?.window,
          whyNow: counselorVm.domainTimingWindows[0]?.whyNow,
          timingConflictNarrative: counselorVm.domainTimingWindows[0]?.timingConflictNarrative,
          entryConditions: counselorVm.domainTimingWindows[0]?.entryConditions || [],
          abortConditions: counselorVm.domainTimingWindows[0]?.abortConditions || [],
        },
        guardrail: counselorVm.primaryCaution,
        whyStack: [counselorVm.answerThesis, counselorVm.primaryAction],
      },
      'ko'
    )

    expect(text).toContain('current_direct=')
    expect(text).toContain('why_now=')
    expect(text).toContain('branch_1=')
    expect(text).toContain('next_move=')
    expect(text).toContain('[Risk Guardrails]')
    expect(text.indexOf('current_direct=')).toBeLessThan(text.indexOf('why_now='))
    expect(text.indexOf('why_now=')).toBeLessThan(text.indexOf('[Branch Options]'))
    expect(text.indexOf('[Branch Options]')).toBeLessThan(text.indexOf('[Risk Guardrails]'))
  })
})
