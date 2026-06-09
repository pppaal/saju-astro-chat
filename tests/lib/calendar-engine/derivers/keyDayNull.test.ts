// @vitest-environment node
// 운흐름 v3 step 4 — circularShiftKeyDays: 원형시프트 null 큰날 판정 검증.
import { describe, it, expect } from 'vitest'
import { circularShiftKeyDays } from '@/lib/calendar-engine/derivers/keyDayNull'

describe('circularShiftKeyDays (v3 step 4)', () => {
  it('flags a day where both systems spike together as a key day', () => {
    const n = 10
    const saju = Array.from({ length: n }, (_, i) => (i === 3 ? 10 : 1))
    const astro = Array.from({ length: n }, (_, i) => (i === 3 ? 10 : 1))

    const r = circularShiftKeyDays(saju, astro)

    // 두 스파이크가 같은 날(3)에만 겹침 → 시프트하면 절대 안 겹침 → null max=1.
    expect(r.threshold).toBe(1)
    expect(r.isKeyDay[3]).toBe(true)
    expect(r.isKeyDay.filter(Boolean)).toHaveLength(1)
    expect(r.surprise[3]).toBe(1) // 모든 null max(=1) 보다 큼
  })

  it('does NOT flag a coincidence that is common under random shifts', () => {
    // 사주는 늘 무겁고(10), 점성도 늘 무거움(10) → 겹침이 흔함 → 큰 날 아님.
    const saju = Array(10).fill(10)
    const astro = Array(10).fill(10)

    const r = circularShiftKeyDays(saju, astro)

    expect(r.isKeyDay.some(Boolean)).toBe(false)
  })

  it('cross uses min by default — one-sided heaviness is not a key day', () => {
    const n = 8
    const saju = Array.from({ length: n }, (_, i) => (i === 2 ? 20 : 1))
    const astro = Array(n).fill(1) // 점성은 평탄

    const r = circularShiftKeyDays(saju, astro)

    // min(20,1)=1 → observed 평탄 → 큰 날 없음 (한쪽만 큰 건 교차 아님).
    expect(r.observed[2]).toBe(1)
    expect(r.isKeyDay.some(Boolean)).toBe(false)
  })

  it('returns no key days for series too short to shift', () => {
    const r = circularShiftKeyDays([5, 5], [5, 5])
    expect(r.isKeyDay).toEqual([false, false])
    expect(r.threshold).toBe(Infinity)
  })

  it('respects a custom combine function (product)', () => {
    const n = 6
    const saju = Array.from({ length: n }, (_, i) => (i === 1 ? 4 : 1))
    const astro = Array.from({ length: n }, (_, i) => (i === 1 ? 5 : 1))

    const r = circularShiftKeyDays(saju, astro, { combine: (a, b) => a * b })

    expect(r.observed[1]).toBe(20) // 4*5
    expect(r.isKeyDay[1]).toBe(true)
  })
})
