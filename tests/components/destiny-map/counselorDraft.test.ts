import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  readCounselorDraft,
  writeCounselorDraft,
  clearCounselorDraft,
  readCompatCounselorDraft,
  writeCompatCounselorDraft,
  clearCompatCounselorDraft,
} from '@/components/destiny-map/counselorDraft'
import type { Message } from '@/components/destiny-map/chat-constants'

const KEY = 'destinypal:counselor:draft'
const COMPAT_KEY = 'destinypal:compat-counselor:draft'

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

describe('compat counselor draft (separate key + couple meta)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  const couple = [
    { name: 'A', date: '1990-01-01', time: '12:00' },
    { name: 'B', date: '1992-02-02', time: '08:30' },
  ]

  it('uses its own key, not the destiny key', () => {
    writeCompatCounselorDraft({ sessionId: 's1', locale: 'ko', messages: convo, meta: undefined })
    expect(window.localStorage.getItem(COMPAT_KEY)).not.toBeNull()
    expect(window.localStorage.getItem(KEY)).toBeNull()
    // and the destiny reader does not see the compat draft
    expect(readCounselorDraft()).toBeNull()
  })

  it('round-trips the couple snapshot meta', () => {
    writeCompatCounselorDraft({
      sessionId: 's1',
      locale: 'ko',
      messages: convo,
      meta: {
        persons: couple,
        person1Saju: { a: 1 },
        person2Saju: null,
        person1Astro: null,
        person2Astro: null,
        chatTitle: '우리 궁합',
      },
    })
    const draft = readCompatCounselorDraft()
    expect(draft!.meta!.persons).toEqual(couple)
    expect(draft!.meta!.chatTitle).toBe('우리 궁합')
    expect(draft!.meta!.person1Saju).toEqual({ a: 1 })
  })

  it('persists a guest draft with a null session id', () => {
    writeCompatCounselorDraft({ sessionId: null, locale: 'ko', messages: convo, meta: undefined })
    const draft = readCompatCounselorDraft()
    expect(draft).not.toBeNull()
    expect(draft!.sessionId).toBeNull()
    expect(draft!.messages).toHaveLength(3)
  })

  it('clears independently of the destiny draft', () => {
    writeCounselorDraft({ sessionId: 'd1', locale: 'ko', messages: convo })
    writeCompatCounselorDraft({ sessionId: 'c1', locale: 'ko', messages: convo, meta: undefined })
    clearCompatCounselorDraft()
    expect(readCompatCounselorDraft()).toBeNull()
    // destiny draft untouched
    expect(readCounselorDraft()).not.toBeNull()
  })
})
