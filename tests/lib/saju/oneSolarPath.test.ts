/**
 * 시주 평균태양시 한 경로 + 출생 instant 단일화 — 엔진 감사 E8.
 *
 * 규칙 (CONVENTIONS §1, docs/SOLAR_TIME_CONVENTION.md):
 *  - 출생 instant = resolveBirthInstant (OD-3, RFC 5545). 일주 = 입력한 민용 날짜.
 *  - 시주 = UT + 경도 × 4분. 경도 미상 = 존 기준 경도(Asia/Seoul 126.978, OD-2).
 *  - 존 자오선에서 60° 넘게 떨어진 경도는 버린다(OD-14).
 * 지운 것: '한국 LMT +30분' 표, 한국 DST 윈도우, KMT 분기, 1월/7월 DST 추정.
 * 기대값은 각 감사 항목(F2 · F3 · F7 · SAJU-2 · SAJU-3 · SAJU-6 · SAJU-9)의 expected.
 */
import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { zoneReferenceLongitude } from '@/lib/saju/timezone'

const NOW = new Date('2026-11-24T03:00:00Z')
const SEOUL_LON = 126.978
type G = 'male' | 'female'

const gz = (p: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }) =>
  p.heavenlyStem.name + p.earthlyBranch.name

function run(date: string, time: string, tz: string, lon?: number, gender: G = 'male') {
  return calculateSajuData(date, time, gender, 'solar', tz, false, lon, NOW)
}
function pillars(date: string, time: string, tz: string, lon?: number, gender: G = 'male') {
  const r = run(date, time, tz, lon, gender)
  return [r.yearPillar, r.monthPillar, r.dayPillar, r.timePillar].map(gz)
}

describe('자정에 걸친 서머타임 공백 — 일주는 입력한 날 (골든 G26)', () => {
  it('서울 1961-08-10 00:15 (KMT→KST 공백) → 日 乙亥 · 時 丙子', () => {
    for (const lon of [SEOUL_LON, undefined]) {
      const [, , day, hour] = pillars('1961-08-10', '00:15', 'Asia/Seoul', lon)
      expect(day).toBe('乙亥')
      expect(hour).toBe('丙子')
    }
  })
  it('상파울루 2018-11-04 00:30 → 日 庚子', () => {
    for (const lon of [-46.6333, undefined]) {
      expect(pillars('2018-11-04', '00:30', 'America/Sao_Paulo', lon)[2]).toBe('庚子')
    }
  })
  it('테헤란 2008-03-21 00:30 → 日 庚申', () => {
    for (const lon of [51.389, undefined]) {
      expect(pillars('2008-03-21', '00:30', 'Asia/Tehran', lon)[2]).toBe('庚申')
    }
  })
})

describe('경도 없는 서울 = 서울 기본값 126.978 (F7 property)', () => {
  // DST(1948–51·1955–60·1987–88), KMT(1954-03-21 ~ 1961-08-10), 표준 offset 이 연중
  // 바뀐 해(1954·1961), 공백·겹침 날, 현대를 고루 덮는다.
  const DATES = [
    '1948-07-01',
    '1949-06-01',
    '1951-05-29',
    '1954-01-15',
    '1954-03-01',
    '1957-11-15',
    '1958-07-01',
    '1961-08-10',
    '1961-10-01',
    '1961-12-20',
    '1987-05-10',
    '1987-07-01',
    '1987-10-11',
    '1988-07-15',
    '1995-06-10',
    '2020-02-04',
  ]
  it('네 기둥·대운(시작·방향·목록·현재)이 23분 간격 전 시각에서 같다', () => {
    const mismatches: string[] = []
    for (const date of DATES) {
      for (let m = 0; m < 1440; m += 23) {
        const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        for (const gender of ['male', 'female'] as const) {
          const a = run(date, time, 'Asia/Seoul', undefined, gender)
          const b = run(date, time, 'Asia/Seoul', SEOUL_LON, gender)
          if (
            JSON.stringify([a.pillars, a.daeWoon, a.meta]) !==
            JSON.stringify([b.pillars, b.daeWoon, b.meta])
          ) {
            mismatches.push(`${date} ${time} ${gender}`)
          }
        }
      }
    }
    expect(mismatches).toEqual([])
  })

  it('F7: 1995-06-10 23:31 F → 時 辛亥 · 대운 8 (경도 유무 무관), 11:30 → 乙巳', () => {
    // 옛 경로: 경도 없음 庚子 d8 vs 126.978 辛亥 d9. 대운수는 OD-1 로 생 UT instant 기준이라 8.
    for (const lon of [undefined, SEOUL_LON]) {
      const r = run('1995-06-10', '23:31', 'Asia/Seoul', lon, 'female')
      expect(gz(r.timePillar)).toBe('辛亥')
      expect(r.daeWoon.startAge).toBe(8)
      expect(pillars('1995-06-10', '11:30', 'Asia/Seoul', lon, 'female')[3]).toBe('乙巳')
    }
  })
})

describe('경도 없는 시주 — 옛 DST·KMT·Jan/Jul 추정 결함 (F2 · F3 · SAJU-2 · SAJU-3)', () => {
  const hour = (date: string, time: string, gender: G = 'male') =>
    pillars(date, time, 'Asia/Seoul', undefined, gender)[3]

  it('KST 기준 한국 DST(1948–51·1987–88) — DST 를 뺀 뒤에도 서울 경도 보정', () => {
    expect(hour('1987-07-15', '12:10')).toBe('辛巳') // SAJU-2 (옛 壬午)
    expect(hour('1948-07-01', '00:10').slice(1)).toBe('亥') // SAJU-2 (옛 子)
    expect(hour('1987-07-01', '12:15')).toBe('癸巳') // F3 / G10 (옛 甲午)
    expect(hour('1949-07-14', '08:12', 'female')).toBe('己卯') // F3 / G28 (옛 庚辰)
    expect(hour('1951-05-29', '12:13')).toBe('己巳') // F3 (옛 庚午)
  })

  it('표준 offset 이 연중 바뀐 해의 가짜 DST 없음 (서울 1954·1961)', () => {
    expect(hour('1954-03-01', '07:35')).toBe('壬辰') // F2 / G12 (옛 辛卯)
    expect(hour('1961-10-01', '13:40')).toBe('丁未') // F2 / G30 (옛 丙午)
    expect(hour('1961-12-20', '23:40')).toBe('庚子') // F2 (옛 辛亥)
    expect(hour('1954-01-15', '09:45')).toBe('癸巳') // SAJU-3 / G29 (옛 壬辰)
    expect(hour('1961-10-01', '09:45')).toBe('乙巳') // SAJU-3 (옛 甲辰)
  })

  it('비한국 존도 경도 없으면 존 기준 경도 평균태양시 (SAJU-3)', () => {
    const cases: Array<[string, string, string, string]> = [
      ['2014-11-15', '12:30', 'Europe/Moscow', '壬午'],
      ['1943-02-27', '01:14', 'Asia/Shanghai', '戊子'],
      ['1945-10-12', '22:39', 'Pacific/Honolulu', '乙亥'],
      ['2015-09-01', '12:50', 'Asia/Pyongyang', '壬午'],
    ]
    for (const [date, time, tz, expected] of cases) {
      expect(pillars(date, time, tz)[3], `${date} ${time} ${tz}`).toBe(expected)
      expect(pillars(date, time, tz)).toEqual(pillars(date, time, tz, zoneReferenceLongitude(tz)))
    }
  })
})

describe('잘못 짝지은 경도는 버린다 (SAJU-9, OD-14)', () => {
  it('LA 1990-06-15 12:00 + 서울 경도 126.978 → 時 甲午 · 대운 7 · 현재 乙酉@27', () => {
    const bad = run('1990-06-15', '12:00', 'America/Los_Angeles', SEOUL_LON)
    expect(gz(bad.timePillar)).toBe('甲午')
    expect(bad.daeWoon.startAge).toBe(7)
    expect(bad.daeWoon.current).toMatchObject({ heavenlyStem: '乙', earthlyBranch: '酉', age: 27 })
    // 실제 LA 경도·경도 없음과 같은 결과
    const real = run('1990-06-15', '12:00', 'America/Los_Angeles', -118.24)
    const none = run('1990-06-15', '12:00', 'America/Los_Angeles')
    expect(bad.pillars).toEqual(real.pillars)
    expect(bad.daeWoon).toEqual(real.daeWoon)
    expect(none.pillars).toEqual(real.pillars)
  })
})

describe("시각 문자열 — 'H:MM' 도 같은 길 (SAJU-6)", () => {
  it("'9:05' ≡ '09:05', '0:10' ≡ '00:10' — 네 기둥·대운", () => {
    for (const [a, b] of [
      ['9:05', '09:05'],
      ['0:10', '00:10'],
    ]) {
      const ra = run('2020-02-04', a, 'Asia/Seoul')
      const rb = run('2020-02-04', b, 'Asia/Seoul')
      expect(ra.pillars).toEqual(rb.pillars)
      expect(ra.daeWoon).toEqual(rb.daeWoon)
      expect(ra.meta).toEqual(rb.meta)
    }
    expect(pillars('2020-02-04', '9:05', 'Asia/Seoul')).toEqual(['己亥', '丁丑', '丁丑', '甲辰'])
  })
})
