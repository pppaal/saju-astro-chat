/**
 * 운명상담사 — 출생시각·출생지 미상(placeUnreliable)이면 컨텍스트에 앵글·하우스가 없다
 * (CALCULATION_SPEC §6, 재감사 AC-2 · CNS-2, G8).
 *
 * 예전엔 본명 위치·본명 각·SR·진행·프로펙션만 skipAngles 를 지켰고, 타이밍 블록의
 *  - 강한 트랜짓이 정오 앵커·존 기준점 차트의 ASC/MC 를 대상으로 잡았고
 *    ('Jupiter(t) [sextile] MC 0.1°' / '목성(현재) [협력] 중천점'),
 *  - 일·월식 줄이 폴백 커스프의 하우스를 달았다('(eclipse@H11)' / '(식점 H11)').
 * 이제 formatAstroSelf 가 placeMask 로 앵글·앵글 파생점 대상 트랜짓·일식과 식점 하우스를
 * 빼고, astroSlim 은 하우스 없는 일식 줄을 태그 없이 싣는다. 대조군(시각·도시를 앎)에는
 * 같은 하늘의 앵글 각이 그대로 있어, 마스크가 실제로 일했음을 보인다.
 *
 * 앵커 일치(G8 carryover): 미상이면 남은 시각 문자열('03:00')이 아니라 정오 앵커로 본명
 * 차트·SR·진행을 계산한다 — '03:00'+미상 컨텍스트 = '12:00'+미상 컨텍스트.
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
const { collectAstroFacts } = await import('@/lib/destiny/astroFacts')

/** 앵글·하우스 인용 토큰 — KO·EN 둘 다. */
const PLACE_TOKENS =
  /\bASC\b|\bMC\b|\bAsc\b|Ascendant|Fortune|Vertex|@H\d|식점 H|상승점|중천점|포춘|버텍스|House \d|\bH\d{1,2}\b/

type Birth = Parameters<typeof buildDestinyContext>[0]

/** ensureCounselorContext 가 넘기는 '오늘' 그릇 — 보는 사람 tz 날짜 D 의 UTC 정오. */
function carrier(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

async function contextText(birth: Birth, date: string, locale: 'ko' | 'en'): Promise<string> {
  const ctx = await buildDestinyContext(birth, carrier(date), locale, undefined, {
    saju: false,
    astro: true,
  })
  expect(ctx.degraded).toBeFalsy()
  return `${ctx.stable}\n${ctx.daily}`
}

const leaks = (text: string) => text.split('\n').filter((l) => PLACE_TOKENS.test(l))

const SEOUL_1990 = {
  birthDate: '1990-05-15',
  birthTime: '12:00',
  gender: 'male' as const,
  timezone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
}
const LONDON_2001 = {
  birthDate: '2001-08-09',
  birthTime: '12:00',
  gender: 'female' as const,
  timezone: 'Europe/London',
  latitude: 51.5,
  longitude: -0.13,
}
const NYC_1936 = {
  birthDate: '1936-07-21',
  birthTime: '12:00',
  gender: 'male' as const,
  timezone: 'America/New_York',
  latitude: 40.7128,
  longitude: -74.006,
}
/** 시각은 알고 도시를 모름 — 좌표는 출생 타임존 기준점(서울)으로 떨어진다. */
const SEOUL_1997_CITY_UNKNOWN = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  gender: 'female' as const,
  timezone: 'Asia/Seoul',
  birthCityUnknown: true,
}

describeRealEphemeris('counselor context — no angles or houses when placeUnreliable', () => {
  const cases: Array<{ name: string; birth: Birth; date: string }> = [
    {
      name: '1990 Seoul, time unknown',
      birth: { ...SEOUL_1990, birthTimeUnknown: true },
      date: '2026-04-16',
    },
    {
      name: '2001 London, time unknown',
      birth: { ...LONDON_2001, birthTimeUnknown: true },
      date: '2026-01-01',
    },
    {
      name: '1936 New York, time unknown',
      birth: { ...NYC_1936, birthTimeUnknown: true },
      date: '2026-05-03',
    },
    { name: '1997 Seoul, city unknown', birth: SEOUL_1997_CITY_UNKNOWN, date: '2026-01-01' },
    { name: '1997 Seoul, city unknown (June)', birth: SEOUL_1997_CITY_UNKNOWN, date: '2026-06-01' },
  ]
  for (const { name, birth, date } of cases) {
    for (const locale of ['en', 'ko'] as const) {
      it(`${name} — ${locale} stable + daily carry no ASC/MC/house token`, async () => {
        const text = await contextText(birth, date, locale)
        expect(leaks(text)).toEqual([])
        // 타이밍 블록 자체는 살아 있다(행성 대상 트랜짓)
        expect(text).toMatch(locale === 'en' ? /strong transits:/ : /강한 트랜짓:/)
      })
    }
  }

  it('the control (time and city known) still cites the same angle contacts', async () => {
    // 같은 정오 차트를 '시각을 앎'으로 넣으면 마스크가 없다 — 위 미상 케이스가 같은 하늘의
    // 앵글 각을 실제로 지웠다는 대조. 1990 서울: Jupiter(t) sextile 정오 MC 0.1°.
    const en = await contextText({ ...SEOUL_1990, birthTimeUnknown: false }, '2026-04-16', 'en')
    expect(en).toMatch(/Jupiter\(t\) \[sextile\] MC 0\.1°/)
    const ko = await contextText({ ...SEOUL_1990, birthTimeUnknown: false }, '2026-04-16', 'ko')
    expect(ko).toMatch(/목성\(현재\) \[협력\] 중천점 0\.1°/)
    // 2001 런던: 식점 하우스 태그가 붙는다
    const london = await contextText(
      { ...LONDON_2001, birthTimeUnknown: false },
      '2026-01-01',
      'en'
    )
    expect(london).toMatch(/03-03 lunar Virgo → natal Saturn \[square\] 0\.07° \(eclipse@H\d+\)/)
  })

  it('eclipse lines to natal planets stay, without the house tag', async () => {
    const en = await contextText({ ...LONDON_2001, birthTimeUnknown: true }, '2026-01-01', 'en')
    expect(en).toContain('03-03 lunar Virgo → natal Saturn [square] 0.07°')
    expect(en).toContain('08-12 solar Leo → natal Mercury [conjunction] 0.70°')
    expect(en).not.toMatch(/eclipse@H/)
    const ko = await contextText({ ...LONDON_2001, birthTimeUnknown: true }, '2026-01-01', 'ko')
    expect(ko).toContain('03-03 월식 처녀 → 본명 토성 [긴장] 0.07°')
    expect(ko).not.toMatch(/식점 H/)
  })

  it('time unknown: a stale time string is replaced by the noon anchor (G8 carryover)', async () => {
    const stale = await contextText(
      { ...SEOUL_1990, birthTime: '03:00', birthTimeUnknown: true },
      '2026-04-16',
      'en'
    )
    const anchored = await contextText(
      { ...SEOUL_1990, birthTimeUnknown: true },
      '2026-04-16',
      'en'
    )
    expect(stale).toBe(anchored)

    const base = {
      birthDate: SEOUL_1990.birthDate,
      latitude: SEOUL_1990.latitude,
      longitude: SEOUL_1990.longitude,
      timezone: SEOUL_1990.timezone,
    }
    const now = new Date('2026-04-16T03:00:00Z')
    const staleFacts = await collectAstroFacts(
      { ...base, birthTime: '03:00', birthTimeUnknown: true },
      now
    )
    const noonFacts = await collectAstroFacts(
      { ...base, birthTime: '12:00', birthTimeUnknown: true },
      now
    )
    const knownFacts = await collectAstroFacts({ ...base, birthTime: '03:00' }, now)
    const moon = (f: typeof staleFacts) =>
      f!._chart.planets.find((p) => p.name === 'Moon')!.longitude
    expect(moon(staleFacts)).toBe(moon(noonFacts))
    expect(staleFacts!._chart.ascendant.longitude).toBe(noonFacts!._chart.ascendant.longitude)
    // 시각을 아는 03:00 출생은 다른 하늘(달이 ~5° 다른 곳)
    expect(Math.abs(moon(knownFacts) - moon(noonFacts))).toBeGreaterThan(3)
  })
})
