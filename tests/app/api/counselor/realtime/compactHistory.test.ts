/**
 * Tests for compactHistory — the per-turn cache-miss block in the
 * realtime counselor user prompt.
 *
 * Goal: emit a short, model-readable preamble that preserves the last
 * verbatim exchange and lists older user topics, while dropping older
 * assistant replies that the model could regenerate from the cached
 * birth snapshot.
 */

import { describe, it, expect } from 'vitest'
import { compactHistory } from '@/app/api/counselor/realtime/route'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const u = (content: string): ChatMessage => ({ role: 'user', content })
const a = (content: string): ChatMessage => ({ role: 'assistant', content })

describe('compactHistory', () => {
  it('returns empty string for empty input', () => {
    expect(compactHistory([])).toBe('')
  })

  it('emits a 2-message conversation verbatim with no topic line', () => {
    const out = compactHistory([u('직장 운은?'), a('재성 …')])
    expect(out).toBe('User: 직장 운은?\nCounselor: 재성 …')
    expect(out).not.toMatch(/Earlier topics/)
  })

  it('drops older assistant replies but keeps older user topics', () => {
    const out = compactHistory([
      u('첫 질문'),
      a('첫 답변 본문 — 길고 토큰 많이 먹는 응답'),
      u('두 번째 질문'),
      a('두 번째 답변 — 또 길게'),
      u('세 번째 질문이자 현재 질문'),
    ])
    // Verbatim window holds the last 2 messages (assistant + final user).
    // Older user questions become topic-line entries.
    expect(out).toMatch(/^\(Earlier topics: "첫 질문", "두 번째 질문"\)/)
    expect(out).toContain('Counselor: 두 번째 답변 — 또 길게')
    expect(out).toContain('User: 세 번째 질문이자 현재 질문')
    expect(out).not.toContain('첫 답변 본문')
  })

  it('truncates long older user questions with an ellipsis', () => {
    const longQ = '이것은 매우 긴 사용자 질문으로 50자를 한참 넘어가도록 일부러 늘려놓은 테스트용 문장입니다 그리고 더 이어집니다'
    const out = compactHistory([u(longQ), a('reply'), u('latest'), a('latest reply'), u('current')])
    const m = out.match(/Earlier topics: "([^"]+)"/)
    expect(m).not.toBeNull()
    expect(m![1].endsWith('…')).toBe(true)
    expect(m![1].length).toBeLessThanOrEqual(51)
  })

  it('caps older topics at HISTORY_OLDER_TOPIC_MAX (6) and keeps most recent', () => {
    const msgs: ChatMessage[] = []
    for (let i = 1; i <= 10; i++) {
      msgs.push(u(`q${i}`))
      msgs.push(a(`a${i}`))
    }
    msgs.push(u('현재 질문'))
    const out = compactHistory(msgs)
    const topics = out.match(/Earlier topics: ([^)]+)\)/)![1]
    const items = topics.split(',').map((s) => s.trim().replace(/"/g, ''))
    expect(items.length).toBe(6)
    // Verbatim window holds [a10, current question], so q10 is in older.
    // q1..q4 drop off the older-cap; q5..q10 survive.
    expect(items).toEqual(['q5', 'q6', 'q7', 'q8', 'q9', 'q10'])
  })

  it('emits no topic line when only the verbatim window is present', () => {
    const out = compactHistory([u('only user'), a('only counselor')])
    expect(out.startsWith('(Earlier')).toBe(false)
  })

  it('collapses internal whitespace in older topics', () => {
    const out = compactHistory([
      u('첫\n\n질문에\t공백이   많음'),
      a('answer'),
      u('latest'),
      a('latest reply'),
      u('current'),
    ])
    expect(out).toContain('"첫 질문에 공백이 많음"')
  })

  it('produces fewer tokens than the prior 4-turn verbatim approach', () => {
    // Sanity check: a 10-turn conversation should compress substantially.
    const msgs: ChatMessage[] = []
    for (let i = 1; i <= 5; i++) {
      msgs.push(u(`사용자 질문 ${i}`))
      msgs.push(a('상담사 응답 본문이 길게 이어집니다. '.repeat(20)))
    }
    msgs.push(u('현재 마지막 질문'))

    const compacted = compactHistory(msgs)
    const naive = msgs.map((m) => `${m.role}: ${m.content}`).join('\n')
    expect(compacted.length).toBeLessThan(naive.length / 3)
  })
})
