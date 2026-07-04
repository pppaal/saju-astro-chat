import { describe, it, expect } from 'vitest'
import { computeStreak, parseStreak } from '@/lib/calendar/streak'

/**
 * computeStreak — 방문 스트릭 갱신 순수 로직. 같은 날 유지 / 어제 +1 / 공백·미래 리셋.
 */
describe('computeStreak', () => {
  it('첫 방문(prev=null)은 count 1', () => {
    expect(computeStreak(null, '2026-07-01')).toEqual({ last: '2026-07-01', count: 1 })
  })

  it('같은 날 재방문은 count 유지', () => {
    expect(computeStreak({ last: '2026-07-01', count: 5 }, '2026-07-01')).toEqual({
      last: '2026-07-01',
      count: 5,
    })
  })

  it('바로 어제 방문했으면 +1', () => {
    expect(computeStreak({ last: '2026-07-01', count: 5 }, '2026-07-02')).toEqual({
      last: '2026-07-02',
      count: 6,
    })
  })

  it('월 경계에서도 어제 판정이 정확하다', () => {
    expect(computeStreak({ last: '2026-06-30', count: 3 }, '2026-07-01')).toEqual({
      last: '2026-07-01',
      count: 4,
    })
  })

  it('하루 이상 공백이면 1 로 리셋', () => {
    expect(computeStreak({ last: '2026-07-01', count: 9 }, '2026-07-03')).toEqual({
      last: '2026-07-03',
      count: 1,
    })
  })

  it('과거로 돌아간(시계 이상) 경우도 리셋', () => {
    expect(computeStreak({ last: '2026-07-05', count: 9 }, '2026-07-01')).toEqual({
      last: '2026-07-01',
      count: 1,
    })
  })

  it('이상 today 는 이전 상태를 보존(불필요한 리셋 방지)', () => {
    const prev = { last: '2026-07-01', count: 4 }
    expect(computeStreak(prev, 'nope')).toEqual(prev)
  })
})

describe('parseStreak — 미검증 입력 정규화', () => {
  it('유효 객체는 그대로(count 는 ≥1 정수)', () => {
    expect(parseStreak({ last: '2026-07-01', count: 3 })).toEqual({ last: '2026-07-01', count: 3 })
    expect(parseStreak({ last: '2026-07-01', count: 2.9 })).toEqual({
      last: '2026-07-01',
      count: 2,
    })
    expect(parseStreak({ last: '2026-07-01', count: 0 })).toEqual({ last: '2026-07-01', count: 1 })
  })

  it('형식 불량·null·잘못된 날짜는 null', () => {
    expect(parseStreak(null)).toBeNull()
    expect(parseStreak('x')).toBeNull()
    expect(parseStreak({ last: '2026/07/01', count: 3 })).toBeNull()
    expect(parseStreak({ last: '2026-07-01' })).toBeNull()
    expect(parseStreak({ last: '2026-07-01', count: Number.NaN })).toBeNull()
  })
})
