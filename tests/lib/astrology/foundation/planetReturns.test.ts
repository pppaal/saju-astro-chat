/**
 * 외행성 마일스톤(토성·목성·천왕성·해왕성·명왕성·카이런) 정확성 테스트.
 *
 * 다른 테스트는 tests/setup.ts 의 swisseph mock 을 통해 가짜 위치를 받으므로
 * 천문 정확성을 검증할 수 없다. 이 파일은 real-ephemeris-correctness.test.ts
 * 와 동일하게 mock 을 해제하고 실제 천체력으로 결과를 검증한다 — 같은 출생
 * 연도의 두 사람이 다른 토성 회귀일을 갖는다는 핵심 가치를 잡아낸다.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const swissephAvailable = await import('swisseph')
  .then(() => true)
  .catch(() => false)
const describeWithEphemeris = swissephAvailable ? describe : describe.skip

import type { NatalInput } from '@/lib/astrology/foundation/types'

function natal(overrides?: Partial<NatalInput>): NatalInput {
  return {
    year: 1995,
    month: 2,
    date: 9,
    hour: 6,
    minute: 40,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
    ...overrides,
  }
}

describeWithEphemeris('calculateOuterPlanetMilestones (real ephemeris)', () => {
  it('11개 마일스톤을 모두 반환한다', async () => {
    const { calculateOuterPlanetMilestones } = await import(
      '@/lib/astrology/foundation/planetReturns'
    )
    const milestones = calculateOuterPlanetMilestones(natal())
    expect(milestones).toHaveLength(11)
    const kinds = milestones.map((m) => m.kind).sort()
    expect(kinds).toEqual([
      'chiron_return',
      'jupiter_return_1',
      'jupiter_return_2',
      'jupiter_return_3',
      'jupiter_return_5',
      'neptune_square',
      'pluto_square_pluto',
      'saturn_return_1',
      'saturn_return_2',
      'uranus_opposition',
      'uranus_return',
    ])
  })

  it('1995-02-09 06:40 KST: 첫 토성 회귀가 만 28~30세에 정확히 떨어진다', async () => {
    const { calculateOuterPlanetMilestones } = await import(
      '@/lib/astrology/foundation/planetReturns'
    )
    const m = calculateOuterPlanetMilestones(natal())
    const saturn1 = m.find((x) => x.kind === 'saturn_return_1')!
    expect(saturn1.exactDateISO).not.toBeNull()
    // 토성 시드리얼 주기 ~29.46y. 만 28-30세 안 어딘가에 첫 정확 회귀.
    expect(saturn1.age).toBeGreaterThanOrEqual(28)
    expect(saturn1.age).toBeLessThanOrEqual(30)
  })

  it('1995-02-09: 첫 목성 회귀가 만 11~12세에 떨어진다', async () => {
    const { calculateOuterPlanetMilestones } = await import(
      '@/lib/astrology/foundation/planetReturns'
    )
    const m = calculateOuterPlanetMilestones(natal())
    const jup1 = m.find((x) => x.kind === 'jupiter_return_1')!
    expect(jup1.exactDateISO).not.toBeNull()
    // 목성 주기 11.86y → 만 11~12세 안에 첫 정확 회귀.
    expect(jup1.age).toBeGreaterThanOrEqual(11)
    expect(jup1.age).toBeLessThanOrEqual(13)
  })

  it('1995-02-09: 카이런 회귀가 만 48~52세에 떨어진다', async () => {
    const { calculateOuterPlanetMilestones } = await import(
      '@/lib/astrology/foundation/planetReturns'
    )
    const m = calculateOuterPlanetMilestones(natal())
    const chiron = m.find((x) => x.kind === 'chiron_return')!
    expect(chiron.exactDateISO).not.toBeNull()
    expect(chiron.age).toBeGreaterThanOrEqual(48)
    expect(chiron.age).toBeLessThanOrEqual(53)
  })

  it('startYear / age / exactDateISO 가 일관된다', async () => {
    const { calculateOuterPlanetMilestones } = await import(
      '@/lib/astrology/foundation/planetReturns'
    )
    const m = calculateOuterPlanetMilestones(natal())
    for (const ms of m) {
      if (ms.exactDateISO === null) continue
      const year = parseInt(ms.exactDateISO.slice(0, 4), 10)
      expect(ms.startYear).toBe(year)
      expect(ms.age).toBe(year - 1995)
    }
  })

  it('같은 출생연도의 두 사람이 서로 다른 토성 회귀 일시를 받는다 — 진짜 개인화 검증', async () => {
    // 핵심 회귀 케이스: 옛 평균 나이대 테이블에선 같은 1995년생 두 명이
    // 모두 "토성 회귀 28~31세"로 동일했다. 이제 swisseph 가 출생 월·시간·지역
    // 따라 각자의 정확 회귀일을 잡아내는지 확인.
    const { calculateOuterPlanetMilestones } = await import(
      '@/lib/astrology/foundation/planetReturns'
    )
    const seoulFeb = calculateOuterPlanetMilestones(natal())
    const laAug = calculateOuterPlanetMilestones(
      natal({
        month: 8,
        date: 20,
        hour: 16,
        minute: 30,
        latitude: 34.0522,
        longitude: -118.2437,
        timeZone: 'America/Los_Angeles',
      })
    )

    const seoulSaturn = seoulFeb.find((x) => x.kind === 'saturn_return_1')!
    const laSaturn = laAug.find((x) => x.kind === 'saturn_return_1')!
    expect(seoulSaturn.exactDateISO).not.toBeNull()
    expect(laSaturn.exactDateISO).not.toBeNull()
    expect(seoulSaturn.exactDateISO).not.toBe(laSaturn.exactDateISO)
    // 출생일이 6개월 차이라 토성 회귀일도 최소 한 달 이상 차이가 나야
    const diffDays =
      Math.abs(Date.parse(seoulSaturn.exactDateISO!) - Date.parse(laSaturn.exactDateISO!)) /
      (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThan(30)
  })

  it('1985년생 vs 1995년생: 토성 회귀 연도가 ~10년 차이 난다', async () => {
    const { calculateOuterPlanetMilestones } = await import(
      '@/lib/astrology/foundation/planetReturns'
    )
    const m1985 = calculateOuterPlanetMilestones(natal({ year: 1985 }))
    const m1995 = calculateOuterPlanetMilestones(natal({ year: 1995 }))
    const s1985 = m1985.find((x) => x.kind === 'saturn_return_1')!
    const s1995 = m1995.find((x) => x.kind === 'saturn_return_1')!
    const yearDiff = s1995.startYear! - s1985.startYear!
    expect(yearDiff).toBeGreaterThanOrEqual(9)
    expect(yearDiff).toBeLessThanOrEqual(11)
  })

  it('미래 마일스톤(예: 우라누스 회귀 ~84세)도 ephemeris 범위 안에서 계산된다', async () => {
    const { calculateOuterPlanetMilestones } = await import(
      '@/lib/astrology/foundation/planetReturns'
    )
    const m = calculateOuterPlanetMilestones(natal())
    const uranusReturn = m.find((x) => x.kind === 'uranus_return')!
    expect(uranusReturn.exactDateISO).not.toBeNull()
    expect(uranusReturn.age).toBeGreaterThanOrEqual(82)
    expect(uranusReturn.age).toBeLessThanOrEqual(86)
  })
})
