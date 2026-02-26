import { ICP_LIKERT_OPTIONS, ICP_V2_QUESTIONS } from '@/lib/icpTest/questions'
import { INTEGRATED_ICP_ITEM_IDS, computeIcpDimensions } from '@/lib/assessment/integratedProfile'

describe('ICP integrated-item regression', () => {
  it('keeps the integrated ICP 8-item set IDs unchanged', () => {
    expect(INTEGRATED_ICP_ITEM_IDS).toEqual([
      'ag_02',
      're_04',
      'wa_03',
      'ag_04',
      'bo_02',
      're_01',
      'wa_04',
      'bo_03',
    ])
    expect(INTEGRATED_ICP_ITEM_IDS).toHaveLength(8)

    const byId = new Set(ICP_V2_QUESTIONS.map((question) => question.id))
    INTEGRATED_ICP_ITEM_IDS.forEach((id) => {
      expect(byId.has(id)).toBe(true)
    })
  })

  it('keeps Likert options at 5 with stable Korean ordering', () => {
    expect(ICP_LIKERT_OPTIONS).toHaveLength(5)
    expect(ICP_LIKERT_OPTIONS.map((option) => option.id)).toEqual(['1', '2', '3', '4', '5'])
    expect(ICP_LIKERT_OPTIONS.map((option) => option.textKo)).toEqual([
      '전혀 아니다',
      '아니다',
      '보통이다',
      '그렇다',
      '매우 그렇다',
    ])
  })

  it('computeIcpDimensions returns stable scores for a fixed fixture', () => {
    const fixtureAnswers = {
      ag_02: '5',
      re_04: '4',
      wa_03: '4',
      ag_04: '2',
      bo_02: '5',
      re_01: '4',
      wa_04: '2',
      bo_03: '5',
    }

    const result = computeIcpDimensions(fixtureAnswers)

    expect(result.scores).toEqual({
      assertiveness: 83,
      rumination: 75,
      empathy: 75,
      boundary: 100,
      recovery: 75,
    })
    expect(result.topDimension).toBe('boundary')
    expect(result.topCluster).toBe('assertive')
  })
})
