/**
 * 출생 instant 단일 resolver — OD-3 (RFC 5545 §3.3.5), 엔진 감사 E8 (F4 · ASTRO-7).
 *
 * 사주(calculateSajuData)와 점성(natalToJD)이 같은 벽시계 입력에서 같은 UTC 순간을
 * 써야 한다. 옛 구현은 사주 date-fns-tz, 점성 dayjs.tz 였고, 서머타임 공백·겹침 시각에서
 * 둘이 1시간 갈렸으며 dayjs 는 겹침 offset 을 서버의 현재 DST 상태로 골랐다.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

import {
  resolveBirthInstant,
  resolveBirthInstantFromDate,
} from '@/lib/datetime/resolveBirthInstant'
import { buildBirthInstant } from '@/lib/datetime'
import { calculateSajuData } from '@/lib/saju/saju'
import { natalToJD } from '@/lib/astrology/foundation/shared'

const iso = (dateStr: string, h: number, m: number, tz: string) =>
  resolveBirthInstantFromDate(dateStr, h, m, tz)

describe('resolveBirthInstant — RFC 5545 공백·겹침 규칙', () => {
  it('평범한 시각은 그 시점 offset 그대로', () => {
    expect(iso('1990-02-04', 7, 30, 'Asia/Seoul')).toEqual({
      utc: new Date('1990-02-03T22:30:00.000Z'),
      kind: 'normal',
      offsetMinutes: 540,
    })
    expect(iso('1990-06-15', 12, 0, 'America/Los_Angeles').utc.toISOString()).toBe(
      '1990-06-15T19:00:00.000Z'
    )
  })

  it('겹치는 벽시계(서머타임 해제) → 첫 번째(이른) instant', () => {
    const ny = iso('2021-11-07', 1, 30, 'America/New_York')
    expect(ny.utc.toISOString()).toBe('2021-11-07T05:30:00.000Z') // EDT
    expect(ny.kind).toBe('overlap')
    expect(iso('2000-03-26', 2, 30, 'Australia/Sydney').utc.toISOString()).toBe(
      '2000-03-25T15:30:00.000Z' // AEDT
    )
    expect(iso('1987-10-11', 2, 30, 'Asia/Seoul').utc.toISOString()).toBe(
      '1987-10-10T16:30:00.000Z' // KDT
    )
  })

  it('없는 벽시계(공백) → 공백 직전 offset 으로 읽는다', () => {
    const ny = iso('2021-03-14', 2, 30, 'America/New_York')
    expect(ny).toEqual({
      utc: new Date('2021-03-14T07:30:00.000Z'),
      kind: 'gap',
      offsetMinutes: -300,
    })
    expect(iso('1987-05-10', 2, 30, 'Asia/Seoul').utc.toISOString()).toBe(
      '1987-05-09T17:30:00.000Z'
    )
    // KMT(+8:30) → KST(+9) 자정 공백
    expect(iso('1961-08-10', 0, 15, 'Asia/Seoul')).toEqual({
      utc: new Date('1961-08-09T15:45:00.000Z'),
      kind: 'gap',
      offsetMinutes: 510,
    })
    expect(iso('2018-11-04', 0, 30, 'America/Sao_Paulo').utc.toISOString()).toBe(
      '2018-11-04T03:30:00.000Z'
    )
    expect(iso('2008-03-21', 0, 30, 'Asia/Tehran').utc.toISOString()).toBe(
      '2008-03-20T21:00:00.000Z'
    )
    // 하루가 통째로 빠진 사모아 2011-12-30
    expect(iso('2011-12-30', 12, 0, 'Pacific/Apia').utc.toISOString()).toBe(
      '2011-12-30T22:00:00.000Z'
    )
  })

  it('초 단위 LMT offset 도 정확히 (서울 1908 이전 +8:27:52)', () => {
    const r = iso('1905-01-01', 10, 0, 'Asia/Seoul')
    expect(r.utc.toISOString()).toBe('1905-01-01T01:32:08.000Z')
  })

  it('없는 날짜·시각과 잘못된 타임존은 RangeError', () => {
    expect(() => iso('2021-02-30', 1, 0, 'UTC')).toThrow(RangeError)
    expect(() => iso('2021-13-01', 1, 0, 'UTC')).toThrow(RangeError)
    expect(() => iso('not-a-date', 1, 0, 'UTC')).toThrow(RangeError)
    expect(() =>
      resolveBirthInstant({ year: 2021, month: 1, day: 1, hour: 24, minute: 0 }, 'UTC')
    ).toThrow(RangeError)
    expect(() => iso('2021-02-10', 1, 0, 'Bad/Zone')).toThrow(RangeError)
  })

  it('buildBirthInstant 도 같은 resolver (공백 시각 포함), 잘못된 입력은 Invalid Date', () => {
    expect(buildBirthInstant('2021-03-14', '02:30', 'America/New_York').toISOString()).toBe(
      '2021-03-14T07:30:00.000Z'
    )
    expect(Number.isNaN(buildBirthInstant('2021-02-30', '01:00', 'UTC').getTime())).toBe(true)
  })
})

describe('사주 출생 instant = 점성 natalToJD instant — 서버 시계 무관 (F4 · ASTRO-7)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const CASES = [
    { date: '2021-11-07', time: '01:30', tz: 'America/New_York', utc: '2021-11-07T05:30:00.000Z' },
    { date: '2021-03-14', time: '02:30', tz: 'America/New_York', utc: '2021-03-14T07:30:00.000Z' },
    { date: '1987-05-10', time: '02:30', tz: 'Asia/Seoul', utc: '1987-05-09T17:30:00.000Z' },
    { date: '1961-08-10', time: '00:15', tz: 'Asia/Seoul', utc: '1961-08-09T15:45:00.000Z' },
  ]
  const SERVER_CLOCKS = ['2026-01-15T12:00:00Z', '2026-07-15T12:00:00Z']
  const NOW = new Date('2026-11-24T03:00:00Z')

  for (const c of CASES) {
    it(`${c.date} ${c.time} ${c.tz} → ${c.utc}`, () => {
      const [year, month, date] = c.date.split('-').map(Number)
      const [hour, minute] = c.time.split(':').map(Number)
      for (const clock of SERVER_CLOCKS) {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(clock))
        const saju = calculateSajuData(c.date, c.time, 'male', 'solar', c.tz, false, undefined, NOW)
        const jd = natalToJD({
          year,
          month,
          date,
          hour,
          minute,
          latitude: 0,
          longitude: 0,
          timeZone: c.tz,
        })
        vi.useRealTimers()
        expect(saju.meta?.birthUtc, `saju @ server ${clock}`).toBe(c.utc)
        const jdMs = (jd - 2440587.5) * 86_400_000
        expect(Math.abs(jdMs - Date.parse(c.utc)), `natalToJD @ server ${clock}`).toBeLessThan(1000)
      }
    })
  }
})
