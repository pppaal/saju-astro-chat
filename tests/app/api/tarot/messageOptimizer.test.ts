import { describe, expect, it } from 'vitest'
import {
  optimizeTarotMessagesForBackend,
  summarizeLongUserQuestion,
} from '@/app/api/tarot/chat/_lib/messageOptimizer'

describe('messageOptimizer', () => {
  it('summarizes long user question while preserving tail context', () => {
    const longQuestion = [
      'I need help with relationship timing and career transition.',
      'Background: I have been in a long-distance relationship for 2 years.',
      'I am considering moving cities and changing jobs.',
      'There are family obligations and financial pressure.',
      'Most important: should I prioritize relocation this quarter or delay by 6 months?',
    ].join(' ')

    const input = `${longQuestion} ${'extra '.repeat(400)} end priority question about timing`
    const summarized = summarizeLongUserQuestion(input, 'en', 600)

    expect(summarized.length).toBeLessThanOrEqual(600)
    expect(summarized).toContain('Long question summary')
    expect(summarized).toContain('end priority question')
  })

  it('keeps only recent compact messages for backend', () => {
    const messages = Array.from({ length: 12 }, (_, idx) => ({
      role: (idx % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content:
        idx % 2 === 0
          ? `User message ${idx} ${'detail '.repeat(180)}`
          : `Assistant message ${idx} ${'analysis '.repeat(180)}`,
    }))

    const optimized = optimizeTarotMessagesForBackend(messages, 'en', {
      maxMessages: 8,
      maxUserLength: 500,
      maxAssistantLength: 320,
    })

    expect(optimized.length).toBe(8)
    expect(optimized[0].content).toContain('User message 4')
    for (const msg of optimized) {
      if (msg.role === 'user') {
        expect(msg.content.length).toBeLessThanOrEqual(500)
      } else {
        expect(msg.content.length).toBeLessThanOrEqual(320)
      }
    }
  })
})
