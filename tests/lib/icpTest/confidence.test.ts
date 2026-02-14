import { describe, expect, it } from 'vitest'
import { scoreIcpTest } from '@/lib/icpTest/scoring'
import { ICP_V2_QUESTIONS } from '@/lib/icpTest/questions'

function buildConsistentAnswers() {
  const answers = Object.fromEntries(ICP_V2_QUESTIONS.map((q) => [q.id, '4'])) as Record<
    string,
    string
  >
  answers.ag_01 = '5'
  answers.ag_04 = '1'
  answers.wa_01 = '5'
  answers.wa_04 = '1'
  answers.bo_01 = '5'
  answers.bo_04 = '1'
  answers.re_01 = '5'
  answers.re_04 = '1'
  return answers
}

describe('icp confidence score', () => {
  it('penalizes too-fast completion time', () => {
    const answers = buildConsistentAnswers()
    const normal = scoreIcpTest(answers, { completionSeconds: 120 })
    const tooFast = scoreIcpTest(answers, { completionSeconds: 20 })
    expect(normal.confidence).toBeGreaterThan(tooFast.confidence)
  })

  it('drops confidence with inconsistent reverse-pair responses', () => {
    const consistent = buildConsistentAnswers()
    const inconsistent = { ...consistent, ag_04: '5', wa_04: '5', bo_04: '5', re_04: '5' }
    const a = scoreIcpTest(consistent, { completionSeconds: 120 })
    const b = scoreIcpTest(inconsistent, { completionSeconds: 120 })
    expect(a.confidence).toBeGreaterThan(b.confidence)
  })
})
