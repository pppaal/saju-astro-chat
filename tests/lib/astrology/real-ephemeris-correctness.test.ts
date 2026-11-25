/**
 * 실제 천체력(real swisseph) 정확성 회귀 테스트.
 *
 * 다른 점성 테스트 대부분은 tests/setup.ts 의 swisseph/ephe mock 을 통해 *가짜* 행성
 * 위치를 받는다(태양이 늘 같은 자리). 그 mock 은 구조/배선 테스트엔 쓸모 있지만 *천문
 * 정확성*은 전혀 검증하지 못한다.
 *
 * 이 파일은 mock 을 풀고(vi.unmock) node 환경에서 실제 swisseph + public/ephe 로 계산한
 * 본명 차트를 독립 천체력(astronomy-engine, 진황도·겉보기 위치 — scripts/golden 생성기와
 * 같은 정의)과 0.02° 안에서 맞춘다. 예전엔 태양이 30° 폭 계절 띠 안에 있는지만 봤다
 * (엔진 감사 F10). 정밀 골든 전체(ASC/MC·커스프·하우스·교점)는
 * tests/golden/astro.golden.node.test.ts 가 맡는다.
 *
 * native swisseph 가 없으면 로컬에선 skip, CI·release gate 에선 실패한다
 * (tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'
import * as Astronomy from 'astronomy-engine'

// 전역 setup 의 mock 두 개를 이 파일에서만 해제 → 진짜 모듈을 쓴다.
vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { calculateNatalChart } = await import('@/lib/astrology/foundation/astrologyService')

const TOL_DEG = 0.02
const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

/** 독립 기준 — astronomy-engine 겉보기 지심 황경(진황도). */
function referenceLon(name: string, t: Date): number {
  if (name === 'Sun') return Astronomy.SunPosition(t).elon
  if (name === 'Moon') return Astronomy.EclipticGeoMoon(t).lon
  return Astronomy.Ecliptic(Astronomy.GeoVector(name as Astronomy.Body, t, true)).elon
}

// 서울 정오(KST = UTC+9, 세 날짜 모두 서머타임 없음) — 계절별 태양 사인 포함.
const CASES = [
  { date: [1995, 2, 9], utc: '1995-02-09T03:00:00Z', sunSign: 'Aquarius' },
  { date: [2000, 7, 15], utc: '2000-07-15T03:00:00Z', sunSign: 'Cancer' },
  { date: [1985, 11, 20], utc: '1985-11-20T03:00:00Z', sunSign: 'Scorpio' },
] as const
const BODIES = ['Sun', 'Moon', 'Mercury', 'Mars', 'Saturn'] as const

async function natal([year, month, date]: readonly [number, number, number]) {
  return calculateNatalChart({
    year,
    month,
    date,
    hour: 12,
    minute: 0,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })
}

describeRealEphemeris('real ephemeris 정확성 (mock 없이 node 환경)', () => {
  for (const c of CASES) {
    it(`${c.utc} 서울 정오 — 행성 황경이 독립 천체력과 ${TOL_DEG}° 안`, async () => {
      const n = await natal(c.date)
      const t = new Date(c.utc)
      for (const body of BODIES) {
        const p = n.planets.find((x) => x.name === body)
        expect(p, body).toBeDefined()
        expect(angDiff(p!.longitude, referenceLon(body, t)), body).toBeLessThanOrEqual(TOL_DEG)
      }
      expect(n.planets.find((x) => x.name === 'Sun')!.sign).toBe(c.sunSign)
    })
  }

  it('날짜가 다르면 태양 위치도 크게 다르다 (전부-같은-자리 mock 버그를 잡는 그물)', async () => {
    const suns = await Promise.all(
      CASES.map(async (c) => (await natal(c.date)).planets.find((p) => p.name === 'Sun')!.longitude)
    )
    expect(angDiff(suns[0], suns[1])).toBeGreaterThan(60)
    expect(angDiff(suns[1], suns[2])).toBeGreaterThan(60)
  })
})
