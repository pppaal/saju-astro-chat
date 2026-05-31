import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { savePendingChat, loadPendingChat, clearPendingChat } from '@/lib/chat/pendingChat'

describe('pendingChat (게스트 진행 채팅 드래프트)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('save → load 가 같은 payload 를 돌려준다', () => {
    savePendingChat('compat', { messages: [{ role: 'user', content: 'hi' }], persons: [1, 2] })
    expect(loadPendingChat('compat')).toEqual({
      messages: [{ role: 'user', content: 'hi' }],
      persons: [1, 2],
    })
  })

  it('kind 별로 분리 저장된다', () => {
    savePendingChat('compat', { a: 1 })
    savePendingChat('destiny', { b: 2 })
    expect(loadPendingChat('compat')).toEqual({ a: 1 })
    expect(loadPendingChat('destiny')).toEqual({ b: 2 })
  })

  it('clear 후엔 null', () => {
    savePendingChat('destiny', { x: 1 })
    clearPendingChat('destiny')
    expect(loadPendingChat('destiny')).toBeNull()
  })

  it('없으면 null', () => {
    expect(loadPendingChat('compat')).toBeNull()
  })

  it('TTL(2시간) 지난 드래프트는 만료되어 null + 자동 정리', () => {
    const t0 = new Date('2026-01-01T00:00:00Z').getTime()
    vi.useFakeTimers()
    vi.setSystemTime(t0)
    savePendingChat('compat', { stale: true })
    // 2시간 1분 경과
    vi.setSystemTime(t0 + 2 * 60 * 60 * 1000 + 60 * 1000)
    expect(loadPendingChat('compat')).toBeNull()
    // 만료분은 제거되어 raw 도 사라진다
    expect(window.localStorage.getItem('pending_chat:compat')).toBeNull()
  })

  it('손상된 JSON 은 null (throw 안 함)', () => {
    window.localStorage.setItem('pending_chat:compat', '{not json')
    expect(loadPendingChat('compat')).toBeNull()
  })
})
