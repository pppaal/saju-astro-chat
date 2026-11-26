import { describe, it, expect } from 'vitest'
import {
  mdLabel,
  weekdayShort,
  weekdayLong,
  weekdayInitials,
  firstWeekdayOfMonth,
  ordinal,
  monthYearShort,
  monthYearLong,
  monthName,
  dotMonthDay,
  dotDate,
  numberWordEn,
} from '@/lib/calendar-view/dateLabels'

describe('dateLabels — v9 캘린더 날짜 표기', () => {
  it("mdLabel: 'Nov 24' / '11월 24일' (MM-DD · YYYY-MM-DD 모두)", () => {
    expect(mdLabel('11-24', 'en')).toBe('Nov 24')
    expect(mdLabel('2026-11-24', 'en')).toBe('Nov 24')
    expect(mdLabel('11-05', 'ko')).toBe('11월 5일')
    expect(mdLabel('2026-01-01', 'en')).toBe('Jan 1')
  })

  it('weekdayShort / weekdayLong — 민용 날짜의 요일(UTC 자정, 서버 시간대 무관)', () => {
    expect(weekdayShort('2026-11-05', 'en')).toBe('Thu')
    expect(weekdayShort('2026-11-05', 'ko')).toBe('목')
    expect(weekdayShort('2026-11-29', 'en')).toBe('Sun')
    expect(weekdayLong('2026-11-19', 'en')).toBe('Thursday')
    expect(weekdayLong('2026-11-19', 'ko')).toBe('목요일')
  })

  it('weekdayInitials — 일요일 시작 S M T W T F S / 일…토', () => {
    expect(weekdayInitials('en')).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S'])
    expect(weekdayInitials('ko')).toEqual(['일', '월', '화', '수', '목', '금', '토'])
  })

  it('firstWeekdayOfMonth — 2026-11-01 은 일요일(0), 2026-12-01 은 화요일(2)', () => {
    expect(firstWeekdayOfMonth('2026-11')).toBe(0)
    expect(firstWeekdayOfMonth('2026-12')).toBe(2)
  })

  it("ordinal — 24th · 1st · 2nd · 3rd · 11th~13th · 21st · 22nd / ko '24일'", () => {
    expect(ordinal(24, 'en')).toBe('24th')
    expect(ordinal(1, 'en')).toBe('1st')
    expect(ordinal(2, 'en')).toBe('2nd')
    expect(ordinal(3, 'en')).toBe('3rd')
    expect(ordinal(11, 'en')).toBe('11th')
    expect(ordinal(12, 'en')).toBe('12th')
    expect(ordinal(13, 'en')).toBe('13th')
    expect(ordinal(21, 'en')).toBe('21st')
    expect(ordinal(22, 'en')).toBe('22nd')
    expect(ordinal(31, 'en')).toBe('31st')
    expect(ordinal(24, 'ko')).toBe('24일')
  })

  it('월 라벨 · 점 표기 · 수 단어', () => {
    expect(monthYearShort('2026-11', 'en')).toBe('Nov 2026')
    expect(monthYearShort('2026-11', 'ko')).toBe('2026년 11월')
    expect(monthYearLong('2026-11', 'en')).toBe('November 2026')
    expect(monthName('2026-11', 'en')).toBe('November')
    expect(monthName('2026-11', 'ko')).toBe('11월')
    expect(dotMonthDay('2026-11-19')).toBe('11.19')
    expect(dotMonthDay('2026-01-05')).toBe('1.5')
    expect(dotDate('2026-11-19')).toBe('2026.11.19')
    expect(numberWordEn(6)).toBe('Six')
    expect(numberWordEn(12)).toBe('Twelve')
    expect(numberWordEn(13)).toBe('13')
  })
})
