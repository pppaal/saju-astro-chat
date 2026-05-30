/**
 * 실제 천체력(real swisseph) 정확성 회귀 테스트.
 *
 * 다른 점성 테스트는 전부 tests/setup.ts 의 swisseph/ephe mock 을 통해
 * *가짜* 행성 위치를 받는다(태양이 늘 ~쌍둥이 9°). 그 mock 은 구조/배선
 * 테스트엔 쓸모 있지만 *천문 정확성*은 전혀 검증하지 못한다 — 천체력이
 * 통째로 망가져도(또는 mock 이 garbage 를 줘도) 아무도 못 잡는다.
 *
 * 이 파일만 mock 을 풀고(vi.unmock) node 환경에서 실제 swisseph +
 * public/ephe 데이터로 계산해, 알려진 계절별 태양 위치를 단언한다.
 * "전부 같은 별자리로 나오는" 류의 회귀를 잡는 최후의 그물.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

// 전역 setup 의 mock 두 개를 이 파일에서만 해제 → 진짜 모듈을 쓴다.
vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

// CI 러너 등 native swisseph 바이너리가 로드되지 않는 환경(ABI/rebuild 불일치)
// 에서는 진짜 천체력을 못 쓰므로 hard-fail 대신 skip 한다. ephe.ts 도 swisseph
// 미탑재를 정상 상태로 취급. swisseph 가 로드되면 평소대로 실제 단언을 돈다.
const swissephAvailable = await import('swisseph')
  .then(() => true)
  .catch(() => false)
const describeWithEphemeris = swissephAvailable ? describe : describe.skip

async function sunLongitude(year: number, month: number, date: number): Promise<number> {
  const { calculateNatalChart } = await import('@/lib/astrology/foundation/astrologyService')
  const natal = await calculateNatalChart({
    year, month, date, hour: 12, minute: 0,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  })
  const sun = natal.planets.find((p) => p.name === 'Sun')
  if (!sun) throw new Error('Sun not found in natal chart')
  return sun.longitude
}

describeWithEphemeris('real ephemeris 정확성 (mock 없이 node 환경)', () => {
  it('태양 황경이 출생 계절과 일치한다 (전부-쌍둥이 mock 버그를 잡는 그물)', async () => {
    // 황경: 물병 300~330 / 게 90~120 / 전갈 210~240
    const feb = await sunLongitude(1995, 2, 9) // 물병 (≈320)
    const jul = await sunLongitude(2000, 7, 15) // 게 (≈113)
    const nov = await sunLongitude(1985, 11, 20) // 전갈 (≈238)

    expect(feb).toBeGreaterThan(300)
    expect(feb).toBeLessThan(330)
    expect(jul).toBeGreaterThan(95)
    expect(jul).toBeLessThan(125)
    expect(nov).toBeGreaterThan(225)
    expect(nov).toBeLessThan(250)

    // 날짜가 다르면 위치도 명백히 달라야 한다 (mock 은 전부 ~45° 였다).
    expect(Math.abs(feb - jul)).toBeGreaterThan(60)
    expect(Math.abs(jul - nov)).toBeGreaterThan(60)
  })
})
