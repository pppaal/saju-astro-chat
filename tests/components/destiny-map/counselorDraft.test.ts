import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  readCounselorDraft,
  writeCounselorDraft,
  clearCounselorDraft,
} from '@/components/destiny-map/counselorDraft'
import type { Message } from '@/components/destiny-map/chat-constants'

const KEY = 'destinypal:counselor:draft'

const convo: Message[] = [
  { role: 'system', content: 'context' },
  { role: 'user', content: '안녕하세요' },
  { role: 'assistant', content: '반갑습니다' },
]

describe('counselorDraft', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('round-trips a saved conversation', () => {
    writeCounselorDraft({ sessionId: 's1', locale: 'ko', messages: convo })
    const draft = readCounselorDraft()
    expect(draft).not.toBeNull()
    expect(draft!.sessionId).toBe('s1')
    expect(draft!.locale).toBe('ko')
    expect(draft!.messages).toHaveLength(3)
    expect(draft!.messages[1].content).toBe('안녕하세요')
  })

  it('returns null when nothing is stored', () => {
    expect(readCounselorDraft()).toBeNull()
  })

  it('does not write an empty conversation', () => {
    writeCounselorDraft({ sessionId: 's1', locale: 'ko', messages: [] })
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })

  it('does not write without a session id', () => {
    writeCounselorDraft({ sessionId: '', locale: 'ko', messages: convo })
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })

  it('clears the draft', () => {
    writeCounselorDraft({ sessionId: 's1', locale: 'ko', messages: convo })
    clearCounselorDraft()
    expect(readCounselorDraft()).toBeNull()
  })

  it('strips the transient streaming flag on restore but keeps incomplete', () => {
    const mid: Message[] = [
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'partial', streaming: true, incomplete: true },
    ]
    writeCounselorDraft({ sessionId: 's1', locale: 'ko', messages: mid })
    const draft = readCounselorDraft()
    expect(draft!.messages[1].streaming).toBe(false)
    expect(draft!.messages[1].incomplete).toBe(true)
  })

  it('caps very long conversations while keeping the system head', () => {
    const long: Message[] = [{ role: 'system', content: 'ctx' }]
    for (let i = 0; i < 300; i++) {
      long.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}` })
    }
    writeCounselorDraft({ sessionId: 's1', locale: 'ko', messages: long })
    const draft = readCounselorDraft()
    expect(draft!.messages.length).toBeLessThanOrEqual(120)
    // System grounding is preserved as the first turn …
    expect(draft!.messages[0].role).toBe('system')
    // … and the most recent turn survives.
    expect(draft!.messages[draft!.messages.length - 1].content).toBe('m299')
  })

  it('ages out stale drafts older than a week', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ sessionId: 's1', locale: 'ko', messages: convo, savedAt: eightDaysAgo })
    )
    expect(readCounselorDraft()).toBeNull()
    // and it self-cleans the stale entry
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })

  it('returns null on corrupt JSON', () => {
    window.localStorage.setItem(KEY, '{not valid json')
    expect(readCounselorDraft()).toBeNull()
  })
})
