/**
 * tryThis — 월 "이렇게 해보세요"(PUSH/HOLD) 날짜 선택(계획 B1 #3).
 *
 * MonthTier do/avoid 한 줄과 이달 총평이 같은 함수를 읽는다. 지난 날은 절대
 * 추천하지 않고, HOLD 는 avoid-first(오너 결정 — decisions.md §5).
 */
import { describe, it, expect } from 'vitest'
import {
  firstUpcoming,
  pickTryThis,
  toMMDD,
  HOLD_PRIORITY,
} from '@/lib/calendar-engine/derivers/tryThis'

// 2026-11 샘플(1997-03-21 14:30 F 서울) 모양 — 오늘 19일.
const NOV = {
  bestDay: '11-24',
  goodDays: ['11-03', '11-09', '11-12', '11-22', '11-24', '11-27'],
  cautionDays: ['11-08', '11-10', '11-14', '11-20'],
  avoidDays: ['11-02', '11-11', '11-17', '11-29'],
}

describe('firstUpcoming', () => {
  it('기준일(포함) 이후 가장 이른 날', () => {
    expect(firstUpcoming(['11-08', '11-10', '11-14', '11-20'], '11-19')).toBe('11-20')
    expect(firstUpcoming(['11-08', '11-19', '11-20'], '11-19')).toBe('11-19') // 오늘 포함
  })

  it('목록 순서에 기대지 않는다(최솟값)', () => {
    expect(firstUpcoming(['11-29', '11-20', '11-02'], '11-19')).toBe('11-20')
  })

  it('남은 날이 없거나 목록이 비면 null', () => {
    expect(firstUpcoming(['11-02', '11-11'], '11-19')).toBeNull()
    expect(firstUpcoming([], '11-19')).toBeNull()
    expect(firstUpcoming(undefined, '11-19')).toBeNull()
  })

  it("기준일이 ''(미상)이면 가장 이른 날", () => {
    expect(firstUpcoming(['11-11', '11-02'], '')).toBe('11-02')
  })
})

describe('pickTryThis', () => {
  it('기본 HOLD 우선순위는 avoid-first', () => {
    expect(HOLD_PRIORITY).toBe('avoid-first')
  })

  it('오늘 19일: PUSH 11-24(앞으로의 최고일), HOLD 11-29(앞으로의 첫 피할 날)', () => {
    expect(pickTryThis(NOV, '11-19')).toEqual({ push: '11-24', hold: '11-29' })
  })

  it('caution-first(FIX9b E6 대안)면 HOLD 11-20', () => {
    expect(pickTryThis(NOV, '11-19', { holdPriority: 'caution-first' })).toEqual({
      push: '11-24',
      hold: '11-20',
    })
  })

  it('최고일이 지났으면 앞으로의 첫 좋은 날로 폴백 (06-06 지남, 오늘 21일 → 06-23)', () => {
    const r = pickTryThis(
      {
        bestDay: '06-06',
        goodDays: ['06-05', '06-06', '06-23'],
        cautionDays: ['06-08', '06-20'],
        avoidDays: [],
      },
      '06-21'
    )
    expect(r.push).toBe('06-23')
    // 조심할 날이 모두 지났고 피할 날도 없다 — HOLD 없음.
    expect(r.hold).toBeNull()
  })

  it('앞으로 남은 날이 하나도 없으면 PUSH·HOLD 모두 null (지난 날로 폴백 금지)', () => {
    expect(pickTryThis(NOV, '11-30')).toEqual({ push: null, hold: null })
  })

  it('HOLD: 피할 날이 다 지났으면 조심할 날, 조심할 날도 없으면 null', () => {
    expect(
      pickTryThis({ avoidDays: ['11-02'], cautionDays: ['11-08', '11-25'] }, '11-19').hold
    ).toBe('11-25')
    expect(pickTryThis({ avoidDays: ['11-02'], cautionDays: ['11-08'] }, '11-19').hold).toBeNull()
  })

  it('최고일 크라운이 없으면(빈 문자열) 좋은 날로', () => {
    expect(pickTryThis({ bestDay: '', goodDays: ['11-22'] }, '11-19').push).toBe('11-22')
  })
})

describe('toMMDD', () => {
  it("'YYYY-MM' + 일 → 'MM-DD'", () => {
    expect(toMMDD('2026-11', 19)).toBe('11-19')
    expect(toMMDD('2026-06', 5)).toBe('06-05')
  })

  it("일이 없거나 0 이하면 ''", () => {
    expect(toMMDD('2026-11', 0)).toBe('')
    expect(toMMDD('2026-11', undefined)).toBe('')
  })
})
