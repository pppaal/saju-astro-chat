import { describe, expect, it } from 'vitest'
import {
  buildQuestionIntentInstruction,
  detectQuestionIntent,
} from '@/lib/destiny-matrix/ai-report/questionIntent'

describe('questionIntent regression', () => {
  it('classifies Korean binary question and emits action-first instruction', () => {
    const question = '여기로 가는게 맞냐?'
    expect(detectQuestionIntent(question)).toBe('binary_decision')
    const instruction = buildQuestionIntentInstruction(question, 'ko')
    expect(instruction).toContain('예/아니오(결정형)')
    expect(instruction).toContain('지금 해야 할 행동')
  })

  it('classifies English open question as open guidance', () => {
    const question = 'How can I improve my relationship communication?'
    expect(detectQuestionIntent(question)).toBe('open_guidance')
    const instruction = buildQuestionIntentInstruction(question, 'en')
    expect(instruction).toContain('Open guidance question')
  })

  it('returns empty instruction for blank question', () => {
    expect(detectQuestionIntent('   ')).toBe('unknown')
    expect(buildQuestionIntentInstruction('   ', 'ko')).toBe('')
  })
})
