// 행성시(Planetary Hours) 회귀 테스트.
//
// 버그: 요일별 첫 행성시(일출 hour)를 dayOfWeek 로 DAY_PLANET_ORDER 를 직접
// 인덱싱해, 일요일만 맞고 월~토는 첫 행성이 어긋났다(예: 월요일→Venus, 정답 Moon).
// 정본(calendar-engine/extractors/astro-planetary-hour.ts)은 그 요일의 지배행성을
// 시작점으로 쓴다. 이 테스트가 두 구현의 도그마 일치를 잠근다.

import { describe, it, expect } from 'vitest'
import { calculatePlanetaryHours } from '@/lib/calendar-engine/timing-helpers/modules/planetaryHours'

// 표준 요일 지배행성: 일=Sun 월=Moon 화=Mars 수=Mercury 목=Jupiter 금=Venus 토=Saturn
const EXPECTED_DAY_RULER: Record<number, string> = {
  0: 'Sun',
  1: 'Moon',
  2: 'Mars',
  3: 'Mercury',
  4: 'Jupiter',
  5: 'Venus',
  6: 'Saturn',
}

// 칼데안 시간 진행 순서(Sun 부터 순환) — 매 시간 다음 행성.
const CHALDEAN_FROM_SUN = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars']

// 2024-01-07 = 일요일 … 2024-01-13 = 토요일
const WEEK = [
  new Date(2024, 0, 7),
  new Date(2024, 0, 8),
  new Date(2024, 0, 9),
  new Date(2024, 0, 10),
  new Date(2024, 0, 11),
  new Date(2024, 0, 12),
  new Date(2024, 0, 13),
]

describe('planetaryHours — 요일별 첫 행성시 = 지배행성', () => {
  for (const date of WEEK) {
    const dow = date.getDay()
    it(`요일 ${dow} 의 첫 낮 행성시는 ${EXPECTED_DAY_RULER[dow]}`, () => {
      const hours = calculatePlanetaryHours(date)
      const firstDay = hours.find((h) => h.isDay)
      expect(firstDay?.planet).toBe(EXPECTED_DAY_RULER[dow])
    })
  }

  it('월요일 첫 행성시가 Venus(옛 버그값)가 아니다', () => {
    const monday = new Date(2024, 0, 8)
    expect(monday.getDay()).toBe(1)
    const hours = calculatePlanetaryHours(monday)
    const first = hours.find((h) => h.isDay)
    expect(first?.planet).not.toBe('Venus')
    expect(first?.planet).toBe('Moon')
  })
})

describe('planetaryHours — 24행성시 칼데안 순서 연속성', () => {
  it('연속한 두 행성시는 칼데안 순서로 이어진다 (24개)', () => {
    const hours = calculatePlanetaryHours(new Date(2024, 0, 10)) // 수요일
    expect(hours.length).toBe(24)
    for (let i = 1; i < hours.length; i++) {
      const prevIdx = CHALDEAN_FROM_SUN.indexOf(hours[i - 1].planet)
      const expected = CHALDEAN_FROM_SUN[(prevIdx + 1) % 7]
      expect(hours[i].planet).toBe(expected)
    }
  })

  it('다음 날 첫 행성시로 올바르게 이어진다 (일→월: Sun→…→Moon)', () => {
    const sun = calculatePlanetaryHours(new Date(2024, 0, 7))
    const mon = calculatePlanetaryHours(new Date(2024, 0, 8))
    // 일요일 24번째(마지막) 행성시 다음이 월요일 첫 행성시
    const lastSunIdx = CHALDEAN_FROM_SUN.indexOf(sun[sun.length - 1].planet)
    const expectedMonFirst = CHALDEAN_FROM_SUN[(lastSunIdx + 1) % 7]
    const monFirst = mon.find((h) => h.isDay)?.planet
    expect(monFirst).toBe('Moon')
    expect(monFirst).toBe(expectedMonFirst)
  })
})
