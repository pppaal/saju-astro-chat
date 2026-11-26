/**
 * 통합 리포트 교차 행 — 하우스 근거의 정직성 (감사 CR-1·CR-2·CR-7), 진짜 천체력 위에서.
 *
 *  - CR-1: 출생시각/출생지 미상(placeUnreliable)이면 하우스는 정오 앵커·기본 좌표 폴백이라
 *    날조값이다(CALCULATION_SPEC §6). 예전엔 buildCrossRows 가 _chart 의 폴백 하우스를 세어
 *    '소통·표현'·'이동·변화' 행을 지어내고 도입부 집계·헤드라인까지 바꿨다(129 중 128).
 *    이제 ctx 단계에서 행성 하우스를 미상으로 비우고, 어댑터도 하우스 수를 null 로 넘긴다.
 *  - CR-7: 하우스가 비었는데 담당 행성 강조로만 켜진 행이 "houses of … run active"라고
 *    말했다. 이제 켜진 근거(하우스 vs 행성)만 인용한다.
 *  - CR-2: 엔진의 임관/왕지 일주가 강점 행에서 약하게 읽혔다(정규화 누락).
 *
 * 운영 페이지(src/app/(main)/integrated-report/page.tsx)와 같은 경로로 ctx 를 만든다.
 * NOW 고정(미성년 판정이 시계에 새지 않게). native swisseph 가 없으면 로컬에선 skip,
 * CI·destiny release gate 에선 실패한다(tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { buildReportContext } = await import('@/lib/report/buildReportContext')
const { buildCrossRows, natalToReportData } = await import('@/lib/report/integratedAdapter')
const { tallyCrossRows } = await import('@/lib/report/natalCross')
const { stageLabel } = await import('@/lib/report/integratedReportLabels')
const { defaultLatitudeFor, defaultLongitudeFor } = await import('@/lib/saju/timezone')

const NOW = new Date('2026-11-25T03:00:00Z')

type Birth = {
  date: string
  time: string
  tz: string
  lat: number
  lon: number
  gender: 'male' | 'female'
  timeUnknown?: boolean
  cityUnknown?: boolean
}

async function ctxFor(b: Birth) {
  const ctx = (await buildReportContext({
    birthDate: b.date,
    birthTime: b.timeUnknown ? '12:00' : b.time,
    gender: b.gender,
    latitude: b.lat,
    longitude: b.lon,
    timeZone: b.tz,
    birthTimeUnknown: !!b.timeUnknown,
    birthCityUnknown: !!b.cityUnknown,
  })) as unknown as Record<string, any>
  ctx.input = {
    ...ctx.input,
    birthTimeUnknown: !!b.timeUnknown,
    birthCityUnknown: !!b.cityUnknown,
    gender: b.gender,
    timeZone: b.tz,
  }
  return ctx
}

const LIFE_HOUSES: Record<string, number[]> = {
  romance: [5, 7],
  expression: [3, 5],
  movement: [3, 9],
  spirit: [12],
  wealth: [2, 8],
}
// 하우스를 근거로 인용하는 문구(긍정·중립 부정 모두) — EN 'houses of …', KO '별자리의 ○○ 자리'.
const HOUSE_EN = /houses? of/i
const HOUSE_KO = /별자리의 (사랑·관계|사랑|이동·확장|내면·영성|자원·소유|소통·표현) 자리/

const SEOUL_1997 = {
  date: '1997-03-21',
  tz: 'Asia/Seoul',
  lat: 37.5665,
  lon: 126.978,
  gender: 'female' as const,
}

describeRealEphemeris('CR-1 — 시각·도시 미상이면 생활영역 행이 하우스를 쓰지 않는다', () => {
  it('1997-03-21 시각 미상 서울 — 소통·표현/이동·변화 행이 없고 집계 5·4·2·1', async () => {
    const ctx = await ctxFor({ ...SEOUL_1997, time: '', timeUnknown: true })
    expect(ctx.astro.placeUnreliable).toBe(true)
    // ctx 단계에서 이미 하우스는 미상(0)·커스프 없음 — 어떤 소비자도 폴백 하우스를 못 읽는다.
    expect(ctx.astro.chart.planets.every((p: { house: number }) => p.house === 0)).toBe(true)
    expect(ctx.astro.chart.houses).toEqual([])

    const cross = buildCrossRows(ctx, 'en', NOW)
    const keys = cross.rows.map((r) => r.key)
    expect(keys).not.toContain('expression')
    expect(keys).not.toContain('movement')
    expect(tallyCrossRows(cross.rows)).toMatchObject({
      same: 5,
      supportive: 4,
      twoPulls: 2,
      unrelated: 1,
    })
    expect(cross.synthesis).toContain('A many-sided yet aligned identity')
    expect(cross.synthesis).toContain(
      "align in 5, complement in 4, clash in 2, and 1 doesn't connect"
    )
    // 금성 고양으로만 켜진 연애·재물 행은 금성을 말하고 하우스를 말하지 않는다(CR-1 판정 보강).
    const romance = cross.rows.find((r) => r.key === 'romance')!
    const wealth = cross.rows.find((r) => r.key === 'wealth')!
    expect(romance.reason).toContain('Venus')
    expect(wealth.reason).toContain('Venus')
    for (const r of cross.rows) expect(r.reason, r.key).not.toMatch(HOUSE_EN)
  })

  it('1997-03-21 14:30 도시 미상 — 소통·표현/이동·변화 행이 없고 집계 7·3·3', async () => {
    const ctx = await ctxFor({
      ...SEOUL_1997,
      time: '14:30',
      lat: defaultLatitudeFor('Asia/Seoul'),
      lon: defaultLongitudeFor('Asia/Seoul'),
      cityUnknown: true,
    })
    expect(ctx.astro.placeUnreliable).toBe(true)
    const cross = buildCrossRows(ctx, 'en', NOW)
    const keys = cross.rows.map((r) => r.key)
    expect(keys).not.toContain('expression')
    expect(keys).not.toContain('movement')
    expect(tallyCrossRows(cross.rows)).toMatchObject({ same: 7, supportive: 3, twoPulls: 3 })
    for (const r of cross.rows) expect(r.reason, r.key).not.toMatch(HOUSE_EN)
  })

  it('같은 생일·같은 시각 — 출생지를 알면 하우스 근거 행이 다시 나온다(대조군)', async () => {
    const ctx = await ctxFor({ ...SEOUL_1997, time: '14:30' })
    expect(ctx.astro.placeUnreliable).toBe(false)
    const keys = buildCrossRows(ctx, 'en', NOW).rows.map((r) => r.key)
    expect(keys).toContain('expression')
    expect(keys).toContain('movement')
  })

  it('표본 — 미상 차트 어디서도 하우스를 인용하지 않고, 도시 미상 행은 기준 좌표와 무관하다', async () => {
    // 남반구·서머타임 존 포함, 1900–2050, 시각 미상/도시 미상 교대, ko/en 교대.
    const ZONES: Array<[string, number, number]> = [
      ['Asia/Seoul', 37.57, 126.98],
      ['America/New_York', 40.71, -74.0],
      ['Europe/London', 51.5, -0.12],
      ['Australia/Sydney', -33.87, 151.21],
      ['America/Sao_Paulo', -23.55, -46.63],
      ['Africa/Johannesburg', -26.2, 28.04],
      ['America/Los_Angeles', 34.05, -118.24],
      ['Asia/Kolkata', 19.07, 72.88],
    ]
    let seed = 20261126
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648)
    let checked = 0
    for (let i = 0; i < 16; i++) {
      const y = 1900 + Math.floor(rnd() * 151)
      const m = 1 + Math.floor(rnd() * 12)
      const d = 1 + Math.floor(rnd() * 28)
      const [tz, lat, lon] = ZONES[i % ZONES.length]
      const time = `${String(Math.floor(rnd() * 24)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`
      const timeUnknown = i % 2 === 0
      const lang = i % 4 < 2 ? 'en' : 'ko'
      const b: Birth = {
        date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        time,
        tz,
        lat,
        lon,
        gender: rnd() < 0.5 ? 'female' : 'male',
        timeUnknown,
        cityUnknown: !timeUnknown,
      }
      const ctx = await ctxFor(b)
      expect(ctx.astro.placeUnreliable).toBe(true)
      const rows = buildCrossRows(ctx, lang, NOW).rows
      for (const r of rows) {
        expect(r.reason, `${b.date} ${tz} ${r.key}`).not.toMatch(
          lang === 'en' ? HOUSE_EN : HOUSE_KO
        )
      }
      // 리포트 표에도 하우스가 없다.
      const data = natalToReportData(ctx, lang, NOW)
      expect(data.astro.placeUnreliable).toBe(true)
      expect(data.astro.houses).toEqual([])
      expect(data.astro.planets.every((p) => p.house === 0)).toBe(true)
      if (!timeUnknown) {
        // 도시 미상 — 하우스가 행에 들어가지 않으니 기준 좌표를 옮겨도 행이 같다.
        // (음양 리듬은 섹트(태양 고도)라 좌표에 기댈 수 있어 비교에서 뺀다.)
        const moved = await ctxFor({ ...b, lat: lat + 4, lon: lon - 4 })
        const sig = (rs: typeof rows) =>
          rs
            .filter((r) => r.key !== 'yinYang')
            .map((r) => `${r.key}:${r.tone}:${r.reason}`)
            .join('|')
        expect(sig(buildCrossRows(moved, lang, NOW).rows), `${b.date} ${tz}`).toBe(sig(rows))
      }
      checked++
    }
    expect(checked).toBe(16)
  })
})

describeRealEphemeris('CR-7 — 출생지를 알아도 켜진 근거만 인용한다', () => {
  it('1992-12-04 15:25 서울 남 — 3·5하우스가 비어 소통·표현 행은 수성을 말한다', async () => {
    const ctx = await ctxFor({
      date: '1992-12-04',
      time: '15:25',
      tz: 'Asia/Seoul',
      lat: 37.5665,
      lon: 126.978,
      gender: 'male',
    })
    const houses = ctx.astro.chart.planets.map((p: { house: number }) => p.house)
    expect(houses).not.toContain(3)
    expect(houses).not.toContain(5)
    const expr = buildCrossRows(ctx, 'en', NOW).rows.find((r) => r.key === 'expression')!
    expect(expr.tone).toBe('complement')
    expect(expr.reason).toContain('Mercury, the planet of communication, stands out')
    expect(expr.reason).not.toMatch(HOUSE_EN)
    const exprKo = buildCrossRows(ctx, 'ko', NOW).rows.find((r) => r.key === 'expression')!
    expect(exprKo.reason).toContain('소통의 별 수성이 두드러져요')
  })

  it('표본 — 하우스를 인용하는 긍정 문구는 그 하우스에 행성이 실제로 있을 때만', async () => {
    const CITIES: Array<[string, number, number]> = [
      ['Asia/Seoul', 37.5665, 126.978],
      ['America/New_York', 40.7128, -74.006],
      ['Europe/London', 51.5074, -0.1278],
      ['Australia/Sydney', -33.8688, 151.2093],
      ['America/Sao_Paulo', -23.5505, -46.6333],
      ['Asia/Kolkata', 28.6139, 77.209],
    ]
    let seed = 99
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648)
    let houseRows = 0
    for (let i = 0; i < 24; i++) {
      const [tz, lat, lon] = CITIES[Math.floor(rnd() * CITIES.length)]
      const y = 1930 + Math.floor(rnd() * 90)
      const m = 1 + Math.floor(rnd() * 12)
      const d = 1 + Math.floor(rnd() * 28)
      const time = `${String(Math.floor(rnd() * 24)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`
      const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const ctx = await ctxFor({ date, time, tz, lat, lon, gender: 'male' })
      const count: Record<number, number> = {}
      for (const p of ctx.astro.chart.planets as Array<{ house: number }>)
        count[p.house] = (count[p.house] ?? 0) + 1
      for (const r of buildCrossRows(ctx, 'en', NOW).rows) {
        const hs = LIFE_HOUSES[r.key]
        if (!hs || !HOUSE_EN.test(r.reason)) continue
        // 중립 연애 행("nor lit houses of love")은 빈 하우스를 정직하게 부정하는 문구.
        if (/nor lit houses/.test(r.reason)) {
          expect(
            hs.every((h) => !count[h]),
            `${date} ${time} ${tz} ${r.key}`
          ).toBe(true)
          continue
        }
        houseRows++
        expect(
          hs.some((h) => (count[h] ?? 0) > 0),
          `${date} ${time} ${tz} ${r.key}: ${r.reason.slice(0, 80)}`
        ).toBe(true)
      }
    }
    expect(houseRows).toBeGreaterThan(20)
  })
})

describeRealEphemeris('CR-2 — 임관/왕지 일주의 강점 행', () => {
  it('1983-06-01 10:26 런던 여 — 庚申(임관=건록) + 목성 본궁 → 강점 resonant, 집계 5·8·2·1', async () => {
    const ctx = await ctxFor({
      date: '1983-06-01',
      time: '10:26',
      tz: 'Europe/London',
      lat: 51.5074,
      lon: -0.1278,
      gender: 'female',
    })
    expect(ctx.saju.twelveStages.day).toBe('임관')
    const cross = buildCrossRows(ctx, 'en', NOW)
    const strength = cross.rows.find((r) => r.key === 'strength')!
    expect(strength.tone).toBe('resonant')
    expect(strength.reason).toContain('Your power sits at its strongest')
    expect(tallyCrossRows(cross.rows)).toMatchObject({
      same: 5,
      supportive: 8,
      twoPulls: 2,
      unrelated: 1,
    })
    // 같은 리포트의 명식 표(stageLabel)도 건록 — 두 부분이 같은 말을 한다.
    const dayStage = natalToReportData(ctx, 'ko', NOW).saju.pillars.day.twelveStage
    expect(stageLabel(dayStage, 'ko')).toBe('건록')
  })
})
