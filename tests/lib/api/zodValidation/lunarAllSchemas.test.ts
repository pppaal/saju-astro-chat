/**
 * calendarType 을 받는 *모든* zod 스키마 — 달력 종류별 날짜 실재 검사 (G12).
 *
 * G1 은 /api/saju 의 sajuCalculationRequestSchema 만 고쳤다: 음력은 엔진과 같은 변환기
 * (isExistingLunarDate), 양력은 그레고리력 검사. 나머지 스키마(birthInfoSchema ·
 * sajuRequestSchema · destinyMapRequestSchema · compatibilityAnalysisSchema person1/2)는
 * 음력 입력에도 그레고리력 dateSchema 를 써서, 있는 음력 날짜(1990-02-30)를 막고 없는 음력
 * 날짜(작은달 30일·없는 윤달)는 통과시켰다. 이제 전부 refineCalendarBirthDate 하나를 쓴다.
 *
 * 맨 아래 가드: 바렐(@/lib/api/zodValidation)이 내보내는 스키마 중 calendarType 을 받는 것
 * (중첩 lazy 객체 포함)은 모두 이 파일의 표에 있어야 한다 — 새 스키마가 검사 없이 붙지 않게.
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import * as zv from '@/lib/api/zodValidation'
import {
  birthInfoSchema,
  sajuRequestSchema,
  sajuCalculationRequestSchema,
  destinyMapRequestSchema,
  compatibilityAnalysisSchema,
} from '@/lib/api/zodValidation'

type Cal = 'solar' | 'lunar' | undefined
interface Case {
  name: string
  schema: z.ZodType
  /** 검사 대상 출생일·달력이 들어간 payload, 그리고 이슈 경로의 접두사. */
  build: (birthDate: string, calendarType: Cal, lunarLeap?: boolean) => unknown
  prefix: (string | number)[]
  /** calendarType 이 필수라 생략 케이스가 없는 스키마. */
  calendarRequired?: boolean
}

const seoul = { latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' }
const withCal = (o: Record<string, unknown>, calendarType: Cal, lunarLeap?: boolean) => ({
  ...o,
  ...(calendarType ? { calendarType } : {}),
  ...(lunarLeap !== undefined ? { lunarLeap } : {}),
})
const person = (birthDate: string, calendarType: Cal, lunarLeap?: boolean) =>
  withCal({ birthDate, birthTime: '10:00', gender: 'male', ...seoul }, calendarType, lunarLeap)

const CASES: Case[] = [
  {
    name: 'birthInfoSchema',
    schema: birthInfoSchema,
    build: (d, c, l) => withCal({ birthDate: d, birthTime: '10:00', ...seoul }, c, l),
    prefix: [],
  },
  {
    name: 'sajuRequestSchema',
    schema: sajuRequestSchema,
    build: (d, c, l) =>
      withCal({ birthDate: d, birthTime: '10:00', gender: 'male', timezone: 'Asia/Seoul' }, c, l),
    prefix: [],
    calendarRequired: true,
  },
  {
    name: 'sajuCalculationRequestSchema',
    schema: sajuCalculationRequestSchema,
    build: (d, c, l) =>
      withCal({ birthDate: d, birthTime: '10:00', gender: 'male', timezone: 'Asia/Seoul' }, c, l),
    prefix: [],
    calendarRequired: true,
  },
  {
    name: 'destinyMapRequestSchema',
    schema: destinyMapRequestSchema,
    build: (d, c, l) =>
      withCal({ birthDate: d, birthTime: '10:00', gender: 'male', timezone: 'Asia/Seoul' }, c, l),
    prefix: [],
  },
  {
    name: 'compatibilityAnalysisSchema.person1',
    schema: compatibilityAnalysisSchema,
    build: (d, c, l) => ({ person1: person(d, c, l), person2: person('1992-08-20', 'solar') }),
    prefix: ['person1'],
  },
  {
    name: 'compatibilityAnalysisSchema.person2',
    schema: compatibilityAnalysisSchema,
    build: (d, c, l) => ({ person1: person('1992-08-20', 'solar'), person2: person(d, c, l) }),
    prefix: ['person2'],
  },
]

const issues = (r: { success: boolean; error?: z.ZodError }) =>
  r.success ? [] : r.error!.issues.map((i) => ({ path: i.path, message: i.message }))

describe.each(CASES)('$name — 달력 종류별 날짜 실재 검사', (c) => {
  const parse = (d: string, cal: Cal, leap?: boolean) => c.schema.safeParse(c.build(d, cal, leap))
  const at = (message: string) => [{ path: [...c.prefix, 'birthDate'], message }]

  it('없는 음력 날짜(작은달 30일) → birthDate 에 "This lunar date does not exist"', () => {
    for (const d of ['1990-01-30', '1990-03-30', '1990-04-30']) {
      expect(issues(parse(d, 'lunar')), d).toEqual(at('This lunar date does not exist'))
    }
  })

  it('음력 1990-02-30 은 통과 — 양력 검사를 음력에 쓰지 않는다', () => {
    expect(parse('1990-02-30', 'lunar').success).toBe(true)
  })

  it('없는 윤달(2023 윤3월) → 거부, 있는 윤달(2023 윤2월) → 통과', () => {
    expect(issues(parse('2023-03-01', 'lunar', true))).toEqual(
      at('This lunar date does not exist (check the day and the leap month)')
    )
    expect(parse('2023-02-01', 'lunar', true).success).toBe(true)
  })

  it('양력 1990-02-30 → "Invalid date", 양력 정상 날짜는 통과', () => {
    expect(issues(parse('1990-02-30', 'solar'))).toEqual(at('Invalid date'))
    expect(parse('1990-05-15', 'solar').success).toBe(true)
  })

  it.skipIf(c.calendarRequired)('calendarType 생략 → 양력으로 검사', () => {
    expect(issues(parse('1990-02-30', undefined))).toEqual(at('Invalid date'))
    expect(parse('1990-05-15', undefined).success).toBe(true)
  })

  it('형식 오류·1900 하한은 메시지 하나만 (음력 실재 메시지 중복 없음)', () => {
    expect(issues(parse('1990-02-30x', 'lunar'))).toEqual(at('Date must be in YYYY-MM-DD format'))
    expect(issues(parse('1899-12-31', 'solar'))).toEqual(
      at('Date must be between 1900 and the current year')
    )
  })
})

describe('가드 — calendarType 을 받는 바렐 스키마는 모두 위 표에 있다', () => {
  const objectShape = (s: unknown): Record<string, unknown> | null => {
    if (s instanceof z.ZodLazy) return objectShape((s as z.ZodLazy).unwrap())
    if (s instanceof z.ZodObject) return (s as z.ZodObject).shape as Record<string, unknown>
    return null
  }
  const acceptsCalendarType = (s: unknown): boolean => {
    const shape = objectShape(s)
    if (!shape) return false
    if ('calendarType' in shape) return true
    return Object.values(shape).some((v) => {
      const inner = objectShape(v)
      return !!inner && 'calendarType' in inner
    })
  }

  it('누락 없음', () => {
    const found = Object.entries(zv)
      .filter(([, v]) => v instanceof z.ZodType && acceptsCalendarType(v))
      .map(([k]) => k)
      .sort()
    const covered = [...new Set(CASES.map((c) => c.name.split('.')[0]))].sort()
    expect(found).toEqual(covered)
  })
})
