import { describe, expect, it } from 'vitest'
import { scoreIcpTest } from '@/lib/icpTest/scoring'
import { ICP_V2_QUESTIONS } from '@/lib/icpTest/questions'

function answersWith(value: string) {
  return Object.fromEntries(ICP_V2_QUESTIONS.map((q) => [q.id, value]))
}

describe('scoreIcpTest', () => {
  it('returns neutral axis scores for all-neutral answers', () => {
    const result = scoreIcpTest(answersWith('3'))
    expect(result.axes.agency).toBe(50)
    expect(result.axes.warmth).toBe(50)
    expect(result.axes.boundary).toBe(50)
    expect(result.axes.resilience).toBe(50)
    expect(result.missingAnswerCount).toBe(0)
  })

  it('applies reverse-coded items in axis scoring', () => {
    const answers = answersWith('3')
    answers.ag_04 = '5'
    const result = scoreIcpTest(answers)
    expect(result.axes.agency).toBe(40)
  })

  it('fills missing answers with neutral and counts missing items', () => {
    const result = scoreIcpTest({})
    expect(result.missingAnswerCount).toBe(ICP_V2_QUESTIONS.length)
    expect(result.axes.agency).toBe(50)
    expect(result.axes.warmth).toBe(50)
  })
})
