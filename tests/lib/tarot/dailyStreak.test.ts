/**
 * 데일리 타로 연속 뽑기(스트릭) 로직 — 재방문 습관 루프.
 *
 * 커버: 첫 뽑기=1 / 어제 뽑았으면 +1 / 하루라도 건너뛰면 1 리셋 /
 *       같은 날 재호출 멱등 / localStorage 막히면 0. 월·연 경계 prevDay.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { bumpStreakForToday, prevDay, STREAK_KEY } from '@/lib/tarot/dailyStreak'

function mockLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

beforeEach(() => {
  ;(globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage()
})

describe('prevDay — 하루 전(월·연 경계)', () => {
  it('일반/월경계/연경계', () => {
    expect(prevDay('2026-07-06')).toBe('2026-07-05')
    expect(prevDay('2026-07-01')).toBe('2026-06-30')
    expect(prevDay('2026-01-01')).toBe('2025-12-31')
  })
})

describe('bumpStreakForToday', () => {
  it('첫 뽑기는 1', () => {
    expect(bumpStreakForToday('2026-07-06')).toBe(1)
  })

  it('어제 뽑았으면 +1', () => {
    localStorage.setItem(STREAK_KEY, JSON.stringify({ lastDate: '2026-07-05', count: 3 }))
    expect(bumpStreakForToday('2026-07-06')).toBe(4)
  })

  it('하루라도 건너뛰면 1로 리셋', () => {
    localStorage.setItem(STREAK_KEY, JSON.stringify({ lastDate: '2026-07-03', count: 9 }))
    expect(bumpStreakForToday('2026-07-06')).toBe(1)
  })

  it('같은 날 재호출은 멱등(카운트 유지)', () => {
    expect(bumpStreakForToday('2026-07-06')).toBe(1)
    expect(bumpStreakForToday('2026-07-06')).toBe(1)
    const saved = JSON.parse(localStorage.getItem(STREAK_KEY) as string)
    expect(saved.count).toBe(1)
    expect(saved.lastDate).toBe('2026-07-06')
  })

  it('localStorage 가 던지면 0(스트릭 미표시)', () => {
    ;(globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {},
    }
    expect(bumpStreakForToday('2026-07-06')).toBe(0)
  })
})
