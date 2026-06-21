import { describe, it, expect } from 'vitest'
import {
  buildLifecycleTiming,
  type AstroLifecycleEventKind,
  type LifecycleMilestoneOverride,
} from '@/lib/calendar-engine/lifecycle/astroLifecycle'

/**
 * buildLifecycleTiming — 출생연도 → 외행성 생애주기 마일스톤.
 * 결정론: now 를 주입해 과거/현재/예정 분류를 고정 검증한다.
 */

const KINDS: AstroLifecycleEventKind[] = [
  'jupiter_return_1',
  'jupiter_return_2',
  'progressed_lunar_1',
  'saturn_return_1',
  'jupiter_return_3',
  'pluto_square_pluto',
  'uranus_opposition',
  'neptune_square',
  'chiron_return',
  'saturn_return_2',
  'jupiter_return_5',
  'uranus_return',
]

const NOW = new Date('2026-06-21T00:00:00.000Z') // currentYear = 2026

describe('buildLifecycleTiming — 기본 테이블', () => {
  it('12개 이벤트를 테이블 순서대로 반환한다', () => {
    const { events } = buildLifecycleTiming(1990, 2100, true, undefined, NOW)
    expect(events).toHaveLength(12)
    expect(events.map((e) => e.event)).toEqual(KINDS)
  })

  it('한글 라벨/의미/조언이 채워진다(isKo 기본 true)', () => {
    const { events } = buildLifecycleTiming(1990, 2100, undefined, undefined, NOW)
    for (const e of events) {
      expect(e.label).toBeTruthy()
      expect(e.meaning).toBeTruthy()
      expect(e.advice).toBeTruthy()
      expect(e.ageRange).toMatch(/세$/)
    }
    // 한글 라벨 샘플.
    expect(events[0].label).toContain('목성 회귀')
  })

  it('isKo=false 면 영문 라벨/의미/조언 + "age~age세" 윈도우', () => {
    const { events } = buildLifecycleTiming(1990, 2100, false, undefined, NOW)
    expect(events[0].label).toBe('First Jupiter return')
    expect(events[0].meaning).toContain('worldview')
    expect(events[0].advice).toContain('curiosity')
    // 영문이어도 평균 테이블 ageRange 는 "11~13세" 형태(코드상 한글 윈도우 유지).
    expect(events[0].ageRange).toBe('11~13세')
  })
})

describe('buildLifecycleTiming — startYear / ageRange 계산', () => {
  it('평균 테이블 startYear = 출생연도 + ageStart', () => {
    const { events } = buildLifecycleTiming(2000, 2100, true, undefined, NOW)
    const sat1 = events.find((e) => e.event === 'saturn_return_1')!
    expect(sat1.startYear).toBe(2000 + 28)
    expect(sat1.ageRange).toBe('28~31세')
  })
})

describe('buildLifecycleTiming — past/current/upcoming 분류(now 주입)', () => {
  it('출생 1990, now 2026 (나이 36) 기준 토성 첫 회귀는 과거', () => {
    const { events } = buildLifecycleTiming(1990, 2100, true, undefined, NOW)
    const sat1 = events.find((e) => e.event === 'saturn_return_1')!
    // startYear=2018, endYear=2021 < 2026 → past
    expect(sat1.isPast).toBe(true)
    expect(sat1.isCurrent).toBe(false)
    expect(sat1.isUpcoming).toBe(false)
  })

  it('현재 연도가 윈도우 안이면 isCurrent', () => {
    // pluto_square_pluto: age 36~40. 출생 1990 → 2026~2030. now=2026 → current.
    const { events } = buildLifecycleTiming(1990, 2100, true, undefined, NOW)
    const pluto = events.find((e) => e.event === 'pluto_square_pluto')!
    expect(pluto.isCurrent).toBe(true)
    expect(pluto.isPast).toBe(false)
    expect(pluto.isUpcoming).toBe(false)
  })

  it('현재 연도보다 미래면서 endYear 안이면 isUpcoming', () => {
    // uranus_opposition: age 40~43 → 2030~2033. now=2026, endYear 2100 → upcoming.
    const { events } = buildLifecycleTiming(1990, 2100, true, undefined, NOW)
    const ur = events.find((e) => e.event === 'uranus_opposition')!
    expect(ur.isUpcoming).toBe(true)
    expect(ur.isPast).toBe(false)
    expect(ur.isCurrent).toBe(false)
  })

  it('startYear 가 endYear(상한)를 넘으면 isUpcoming 이 false', () => {
    // endYear 를 빡빡하게 잡으면 미래 이벤트도 upcoming 플래그가 안 붙는다.
    const { events } = buildLifecycleTiming(1990, 2027, true, undefined, NOW)
    const ur = events.find((e) => e.event === 'uranus_opposition')! // startYear 2030 > 2027
    expect(ur.isUpcoming).toBe(false)
  })

  it('갓 태어난 사람(미래 출생)이면 모든 이벤트가 미래로 분류', () => {
    const { events } = buildLifecycleTiming(2030, 2200, true, undefined, NOW)
    for (const e of events) {
      expect(e.isPast).toBe(false)
      expect(e.isCurrent).toBe(false)
    }
  })
})

describe('buildLifecycleTiming — overrides(실제 transit 덮어쓰기)', () => {
  it('startYear/age 가 모두 잡힌 override 는 단일 나이 표기로 교체된다', () => {
    const overrides: LifecycleMilestoneOverride[] = [
      { kind: 'saturn_return_1', startYear: 2019, age: 29 },
    ]
    const { events } = buildLifecycleTiming(1990, 2100, true, overrides, NOW)
    const sat1 = events.find((e) => e.event === 'saturn_return_1')!
    expect(sat1.startYear).toBe(2019)
    expect(sat1.ageRange).toBe('29세')
    // override 단일 연도 기준 재분류: 2019 < 2026 → past.
    expect(sat1.isPast).toBe(true)
    expect(sat1.isCurrent).toBe(false)
  })

  it('영문 override 단일 나이는 "age N" 표기', () => {
    const overrides: LifecycleMilestoneOverride[] = [
      { kind: 'saturn_return_1', startYear: 2026, age: 36 },
    ]
    const { events } = buildLifecycleTiming(1990, 2100, false, overrides, NOW)
    const sat1 = events.find((e) => e.event === 'saturn_return_1')!
    expect(sat1.ageRange).toBe('age 36')
    // 단일 연도 == now 2026 → current.
    expect(sat1.isCurrent).toBe(true)
  })

  it('startYear/age 중 하나라도 null 이면 평균 테이블 폴백', () => {
    const overrides: LifecycleMilestoneOverride[] = [
      { kind: 'saturn_return_1', startYear: 2019, age: null },
      { kind: 'jupiter_return_1', startYear: null, age: 12 },
    ]
    const { events } = buildLifecycleTiming(1990, 2100, true, overrides, NOW)
    const sat1 = events.find((e) => e.event === 'saturn_return_1')!
    const jup1 = events.find((e) => e.event === 'jupiter_return_1')!
    expect(sat1.startYear).toBe(1990 + 28) // 폴백
    expect(sat1.ageRange).toBe('28~31세')
    expect(jup1.startYear).toBe(1990 + 11)
  })

  it('일부 kind 만 override 하면 나머지는 평균 테이블 유지(부분 오버라이드)', () => {
    const overrides: LifecycleMilestoneOverride[] = [
      { kind: 'jupiter_return_1', startYear: 2002, age: 12 },
    ]
    const { events } = buildLifecycleTiming(1990, 2100, true, overrides, NOW)
    const jup1 = events.find((e) => e.event === 'jupiter_return_1')!
    const jup2 = events.find((e) => e.event === 'jupiter_return_2')!
    expect(jup1.ageRange).toBe('12세') // overridden
    expect(jup2.ageRange).toBe('23~25세') // 폴백
  })

  it('빈 overrides 배열은 평균 테이블과 동일 결과', () => {
    const withEmpty = buildLifecycleTiming(1990, 2100, true, [], NOW)
    const without = buildLifecycleTiming(1990, 2100, true, undefined, NOW)
    expect(withEmpty.events).toEqual(without.events)
  })
})

describe('buildLifecycleTiming — now 기본값(주입 생략)', () => {
  it('now 미지정이어도 동작하고 12개 이벤트를 반환한다', () => {
    const { events } = buildLifecycleTiming(1990, 2100)
    expect(events).toHaveLength(12)
  })
})
