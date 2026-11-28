/**
 * 상담사 '오늘' 트랜짓 = 캘린더의 그 날짜 셀과 같은 하늘 (재감사 CNS-1 · G3).
 *
 * ensureCounselorContext 는 보는 사람의 현지 날짜 D 를 Date.UTC(D, 12) 그릇에 실어 넘긴다.
 * 예전엔 formatAstroSelf 가 그 UTC 정오를 그대로 트랜짓 순간으로 써서, UTC+12..+14
 * (오클랜드·키리티마티·통가·피지)에선 '# Today: D' 아래에 다음 현지 날 자정 무렵의 하늘이
 * 실렸다. 오클랜드 1954-11-20 19:44 남, D = 2026-06-11: 달 □ 본명 목성이 정확해지는 건
 * 2026-06-11T12:20Z = 06-12 00:20 현지라 상담사는 'Moon(t) [square] Jupiter 0.2°' 를 냈고,
 * 캘린더(현지 정오 표본, 달 □ 허용 6.0°)는 06-11·06-12 어느 셀에도 그 각이 없다
 * (현지 정오 06-11 7.34°, 06-12 7.04° — 판정의 astronomy-engine 독립값).
 *
 * 이제 트랜짓 순간은 그 날짜의 출생 tz 정오(counselorDayAnchor) — 캘린더 astro-transit
 * 추출기가 셀을 재는 순간과 같다. 상담사의 강한 트랜짓(≤2°)은 그 셀의 트랜짓 신호의
 * 부분집합이어야 한다.
 *
 * 전역 setup 이 swisseph 를 모킹하므로 이 파일은 unmock 하고 node 에서 돈다. native swisseph
 * 가 없으면 로컬에선 skip, CI·destiny release 게이트에선 실패(tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')

const { buildDestinyContext } = await import('@/lib/destiny/counselorContext')
const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const astroTransitExtractor = (await import('@/lib/calendar-engine/extractors/astro-transit'))
  .default
const { createCache } = await import('@/lib/calendar-engine/cache')

const ASTRO_ONLY = { saju: false, astro: true }
const LBL: Record<string, string> = { ASC: 'Ascendant', Node: 'True Node' }

const AUCKLAND = {
  birthDate: '1954-11-20',
  birthTime: '19:44',
  gender: 'male' as const,
  timezone: 'Pacific/Auckland',
  latitude: -36.8485,
  longitude: 174.7633,
}
const KIRITIMATI = {
  birthDate: '1990-05-15',
  birthTime: '10:00',
  gender: 'male' as const,
  timezone: 'Pacific/Kiritimati',
  latitude: 1.87,
  longitude: -157.4,
}

/** ensureCounselorContext 가 넘기는 '오늘' 그릇 — 보는 사람 tz 날짜 D 의 UTC 정오. */
function carrier(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

async function strongTransits(birth: typeof AUCKLAND, date: string): Promise<string[]> {
  const { daily } = await buildDestinyContext(birth, carrier(date), 'en', undefined, ASTRO_ONLY)
  expect(daily).toContain(`# Today: ${date}`)
  const lines = daily.split('\n')
  const i = lines.findIndex((l) => l.startsWith('strong transits:'))
  expect(i).toBeGreaterThanOrEqual(0)
  const out: string[] = []
  for (let k = i + 1; k < lines.length && /^\s{2}\S/.test(lines[k]); k++) out.push(lines[k].trim())
  return out
}

/** 캘린더 그 날짜 셀의 트랜짓 신호 키 'transit|natal|aspect'. */
async function calendarTransitKeys(birth: typeof AUCKLAND, date: string): Promise<Set<string>> {
  const natal = await buildNatalContext({
    birthDate: birth.birthDate,
    birthTime: birth.birthTime,
    gender: birth.gender,
    latitude: birth.latitude,
    longitude: birth.longitude,
    timeZone: birth.timezone,
  })
  const sigs = await astroTransitExtractor.extract({
    natal,
    range: { start: `${date}T00:00:00.000Z`, end: `${date}T23:59:59.999Z`, granularity: 'day' },
    cache: createCache(),
  })
  return new Set(
    sigs.map((s) => {
      const ev = s.evidence as { planets?: string[]; aspectType?: string }
      return `${ev.planets?.[0]}|${ev.planets?.[1]}|${ev.aspectType}`
    })
  )
}

function keyOf(line: string): string {
  const m = /^(\w+)\(t\) \[(\w+)\] (\w+) ([\d.]+)°$/.exec(line)
  expect(m, line).not.toBeNull()
  return `${LBL[m![1]] ?? m![1]}|${LBL[m![3]] ?? m![3]}|${m![2]}`
}

describeRealEphemeris('상담사 오늘 트랜짓 — 출생 tz 의 그 날짜 정오 (CNS-1)', () => {
  it('오클랜드 2026-06-11: 다음 날 자정의 달 □ 목성(0.2°)을 싣지 않는다', async () => {
    const st = await strongTransits(AUCKLAND, '2026-06-11')
    expect(st.length).toBeGreaterThan(0)
    expect(st.some((l) => /^Moon\(t\) \[square\] Jupiter /.test(l))).toBe(false)
  }, 60_000)

  it.each([
    ['Pacific/Auckland', '2026-06-11', AUCKLAND],
    ['Pacific/Auckland', '2026-12-20', AUCKLAND],
    ['Pacific/Kiritimati', '2026-06-11', KIRITIMATI],
    ['Pacific/Kiritimati', '2026-03-03', KIRITIMATI],
  ] as const)(
    '%s %s: 상담사의 강한 트랜짓은 모두 그 날짜 캘린더 셀에 있다',
    async (_tz, date, birth) => {
      const st = await strongTransits(birth, date)
      const cal = await calendarTransitKeys(birth, date)
      expect(st.length).toBeGreaterThan(0)
      expect(st.filter((l) => !cal.has(keyOf(l)))).toEqual([])
    },
    60_000
  )
})
