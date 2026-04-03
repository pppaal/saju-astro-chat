import { describe, expect, it } from 'vitest'
import { buildCoreEnvelope, adaptCoreToReport } from '@/lib/destiny-matrix/core'
import {
  renderProjectionBlocksAsMarkdown,
  renderProjectionBlocksAsText,
} from '@/lib/destiny-matrix/ai-report/reportRendering'
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

describe('report rendering single-subject view', () => {
  it('renders the single-subject interpretation before other projection blocks', () => {
    const envelope = buildCoreEnvelope({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput(),
    })
    const reportVm = adaptCoreToReport(envelope.coreSeed)

    const rendered = renderProjectionBlocksAsText(reportVm.projections, 'ko', {
      matrixView: reportVm.matrixView,
      singleUserModel: reportVm.singleUserModel,
      branchSet: reportVm.branchSet,
      singleSubjectView: reportVm.singleSubjectView,
    })

    expect(rendered.startsWith('단일 해석 뷰')).toBe(true)
    expect(rendered).toContain('다음 행동:')
    expect(rendered).toContain('경로 1:')
  })
  it('renders the same single-subject block in markdown output', () => {
    const envelope = buildCoreEnvelope({
      mode: 'comprehensive',
      lang: 'ko',
      matrixInput: createInput(),
    })
    const reportVm = adaptCoreToReport(envelope.coreSeed)

    const rendered = renderProjectionBlocksAsMarkdown(reportVm.projections, 'ko', {
      matrixView: reportVm.matrixView,
      singleUserModel: reportVm.singleUserModel,
      branchSet: reportVm.branchSet,
      singleSubjectView: reportVm.singleSubjectView,
    })

    expect(rendered.startsWith('## ')).toBe(true)
    expect(rendered).toContain('다음 행동:')
    expect(rendered).toContain('경로 1:')
  })
})
