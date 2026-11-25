/**
 * 없는 음력 날짜 — 검증 단계의 422, 엔진의 InvalidLunarDateError (재감사 SP-3).
 *
 * 예전엔 sajuCalculationRequestSchema 가 음력 입력에도 *그레고리력* 유효성만 봤다:
 *  - 음력 1990-01-30 (1990 음력 1월은 29일) 은 양력으로는 있는 날짜라 통과 → 엔진이
 *    "지원 범위(~2050-12-27 음력) 밖" 이라는 틀린 메시지로 throw → 미들웨어가 500.
 *  - 음력 1990-02-30 (1990 음력 2월은 30일, = 양력 1990-03-26) 은 양력에 없는 날짜라 거부.
 *  - 그해에 없는 윤달(2023 은 윤2월뿐)은 라이브러리가 조용히 평달로 바꿔 계산.
 *
 * 독립 참조: Intl 'dangi'(ICU 한국 음력) 달력으로 양력 날짜 → (음력 월, 윤달, 일)을 읽어
 * 그해의 실제 음력 날짜 집합을 만든다 — korean-lunar-calendar 와 무관한 구현.
 * (1990 음력 1·3·4월 29일, 2월 30일은 astronomy-engine 합삭으로도 확인: 1990-01-27, 02-25,
 * 03-27, 04-25, 05-24 KST.)
 */
import { describe, expect, it } from 'vitest'
import {
  InvalidLunarDateError,
  isExistingLunarDate,
  lunarDateToSolarString,
  lunarToSolar,
  LUNAR_MAX,
} from '@/lib/saju/lunarDate'
import { calculateSajuData } from '@/lib/saju/saju'
import { sajuCalculationRequestSchema } from '@/lib/api/zodValidation'

const NOW = new Date('2026-11-25T03:00:00Z')

/** Intl dangi 로 lunarYear 의 모든 (월, 윤달, 일) → 양력 'YYYY-MM-DD'. */
function dangiDatesOf(lunarYear: number): Map<string, string> {
  const fmt = new Intl.DateTimeFormat('en-u-ca-dangi', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const out = new Map<string, string>()
  const start = Date.UTC(lunarYear, 0, 1)
  const end = Date.UTC(lunarYear + 1, 2, 1)
  for (let t = start; t < end; t += 86_400_000) {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(t)).map((p) => [p.type, p.value])
    ) as Record<string, string>
    if (Number(parts.relatedYear) !== lunarYear) continue
    const leap = /bis/.test(parts.month)
    const month = parseInt(parts.month, 10)
    const key = `${month}${leap ? 'L' : ''}-${Number(parts.day)}`
    out.set(key, new Date(t).toISOString().slice(0, 10))
  }
  return out
}

describe('lunarToSolar — 독립 참조(Intl dangi)와 같은 날짜 집합', () => {
  it.each([1990, 2020, 2023, 1955])('%i: 있는 날짜는 같은 양력, 없는 날짜는 not-exist', (year) => {
    const ref = dangiDatesOf(year)
    for (let month = 1; month <= 12; month++) {
      for (const leap of [false, true]) {
        for (let day = 1; day <= 30; day++) {
          const key = `${month}${leap ? 'L' : ''}-${day}`
          const r = lunarToSolar(year, month, day, leap)
          const want = ref.get(key)
          if (want) {
            expect(r, key).toEqual({
              ok: true,
              solar: {
                year: Number(want.slice(0, 4)),
                month: Number(want.slice(5, 7)),
                day: Number(want.slice(8, 10)),
              },
            })
          } else {
            expect(r, key).toEqual({ ok: false, reason: 'not-exist' })
          }
        }
      }
    }
  })

  it('작은달 30일·없는 윤달은 not-exist, 범위 밖은 out-of-range', () => {
    expect(lunarToSolar(1990, 1, 30)).toEqual({ ok: false, reason: 'not-exist' })
    expect(lunarToSolar(1990, 3, 30)).toEqual({ ok: false, reason: 'not-exist' })
    expect(lunarToSolar(1990, 2, 30)).toEqual({
      ok: true,
      solar: { year: 1990, month: 3, day: 26 },
    })
    expect(lunarToSolar(2023, 3, 1, true)).toEqual({ ok: false, reason: 'not-exist' })
    expect(lunarToSolar(2023, 2, 1, true)).toEqual({
      ok: true,
      solar: { year: 2023, month: 3, day: 22 },
    })
    expect(LUNAR_MAX).toEqual({ year: 2050, month: 11, day: 18 })
    expect(lunarToSolar(2050, 11, 18)).toEqual({
      ok: true,
      solar: { year: 2050, month: 12, day: 31 },
    })
    expect(lunarToSolar(2050, 11, 19)).toEqual({ ok: false, reason: 'out-of-range' })
    expect(isExistingLunarDate('1990-02-30')).toBe(true)
    expect(isExistingLunarDate('1990-01-30')).toBe(false)
    expect(isExistingLunarDate('2020-04-29', true)).toBe(true)
    expect(isExistingLunarDate('2020-04-30', true)).toBe(false)
    expect(lunarDateToSolarString('1990-02-30')).toBe('1990-03-26')
  })
})

describe('calculateSajuData — 없는 음력 날짜는 InvalidLunarDateError', () => {
  const lunar = (date: string, leap = false) =>
    calculateSajuData(date, '10:00', 'male', 'lunar', 'Asia/Seoul', leap, undefined, NOW)

  it('음력 1990-01-30 → InvalidLunarDateError(not-exist), 메시지에 "invalid" (미들웨어 → 422)', () => {
    let err: unknown
    try {
      lunar('1990-01-30')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(InvalidLunarDateError)
    expect((err as InvalidLunarDateError).reason).toBe('not-exist')
    expect((err as Error).message).toContain('invalid lunar date')
    expect((err as Error).message).not.toContain('range')
  })

  it('없는 윤달(2023 윤3월)은 평달로 조용히 바꾸지 않고 throw', () => {
    expect(() => lunar('2023-03-01', true)).toThrow(InvalidLunarDateError)
    // 평달 3월 1일 = 양력 2023-04-20 은 그대로 된다.
    expect(lunar('2023-03-01').meta?.civilBirthDate).toBe('2023-04-20')
  })

  it('음력 1990-02-30 (양력엔 없는 날짜지만 음력엔 있다) → 양력 1990-03-26', () => {
    expect(lunar('1990-02-30').meta?.civilBirthDate).toBe('1990-03-26')
  })
})

describe('sajuCalculationRequestSchema — 달력 종류별 날짜 실재 검사', () => {
  const base = { birthTime: '10:00', gender: 'male', timezone: 'Asia/Seoul' }
  const parse = (birthDate: string, calendarType: 'solar' | 'lunar', lunarLeap?: boolean) =>
    sajuCalculationRequestSchema.safeParse({ ...base, birthDate, calendarType, lunarLeap })
  const messages = (r: ReturnType<typeof parse>) =>
    r.success ? [] : r.error.issues.map((i) => i.message)

  it('음력 1990-01-30 / 03-30 / 04-30 → "This lunar date does not exist"', () => {
    for (const d of ['1990-01-30', '1990-03-30', '1990-04-30']) {
      const r = parse(d, 'lunar')
      expect(r.success, d).toBe(false)
      expect(messages(r)).toEqual(['This lunar date does not exist'])
    }
  })

  it('없는 윤달(2023 윤3월) → 거부, 있는 윤달(2023 윤2월) → 통과', () => {
    expect(parse('2023-03-01', 'lunar', true).success).toBe(false)
    expect(parse('2023-02-01', 'lunar', true).success).toBe(true)
  })

  it('음력 1990-02-30 은 통과(양력 검사를 쓰지 않는다), 양력 1990-02-30 은 Invalid date', () => {
    expect(parse('1990-02-30', 'lunar').success).toBe(true)
    const solar = parse('1990-02-30', 'solar')
    expect(solar.success).toBe(false)
    expect(messages(solar)).toEqual(['Invalid date'])
  })

  it('형식이 틀리면 형식 메시지 하나만 (음력 실재 메시지 중복 없음)', () => {
    const r = parse('1990-02-30x', 'lunar')
    expect(r.success).toBe(false)
    expect(messages(r)).toEqual(['Date must be in YYYY-MM-DD format'])
  })

  it('양력 정상 날짜·1900 하한은 그대로', () => {
    expect(parse('1990-05-15', 'solar').success).toBe(true)
    expect(messages(parse('1899-12-31', 'solar'))).toEqual([
      'Date must be between 1900 and the current year',
    ])
  })
})
