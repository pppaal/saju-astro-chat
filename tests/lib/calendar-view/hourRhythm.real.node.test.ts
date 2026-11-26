/**
 * Day 시진 리듬 줄 — 실제 천체력 (재감사 TP-8 · CC-3, destiny release gate).
 *
 *  - 줄의 창 = 평균태양시 시진 창(CONVENTIONS §1): 마드리드 여름 卯 07:15–09:15, 서울 子
 *    23:32–01:32, 우루무치(Asia/Shanghai) 卯 07:10–09:10. 예전엔 '5-7am' 명목 라벨이었다.
 *  - 상승궁 = 그 창 한가운데 순간의 상승궁. 기대값은 astronomy-engine(독립 천체력)의 항성시와
 *    황도경사로 직접 구한다 — 엔진 출력이 아니다.
 *  - 시진 × 상승궁 룰러는 교차가 아니다(owner 결정 19): 줄에 교차 필드가 없고, 같은 셀의 엔진
 *    hourly 교차는 CROSS_LAYER_BAND.hourly 행성(달·태양·수성·금성·화성)과만 맺는다.
 *  - 시별 달(toHourMoon, G11 carry-over)도 같은 실제 시진 창으로 라벨한다('07:15–09:15 (묘시)' /
 *    '(Rabbit hour)') — 예전엔 명목 창 '5–7am (Rabbit)' 과 명목 시각 표본이었다.
 *
 * 전역 setup 이 swisseph 를 목으로 바꾸므로 여기서 풀고 node 로 돈다. native swisseph 가 없으면
 * 로컬에선 skip, CI·release gate 에선 실패한다(tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'
import * as Astronomy from 'astronomy-engine'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine')
const { buildHourCrossings } = await import('@/lib/calendar-view/toHourCrossings')
const { buildHourMoon } = await import('@/lib/calendar-view/toHourMoon')
const { CROSS_LAYER_BAND } = await import('@/lib/calendar-engine/data/saju-astro-mapping')

const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]
const ANIMALS = [
  'Rat',
  'Ox',
  'Tiger',
  'Rabbit',
  'Dragon',
  'Snake',
  'Horse',
  'Goat',
  'Monkey',
  'Rooster',
  'Dog',
  'Pig',
]
const mod = (a: number, n: number) => ((a % n) + n) % n
const hhmm = (m: number) =>
  `${String(Math.floor(mod(m, 1440) / 60)).padStart(2, '0')}:${String(mod(m, 1440) % 60).padStart(2, '0')}`

/** astronomy-engine 상승궁 — 겉보기 항성시 + 참 황도경사. */
function referenceAscSign(ms: number, lat: number, lon: number): string {
  const time = Astronomy.MakeTime(new Date(ms))
  const ramc = mod(Astronomy.SiderealTime(time) * 15 + lon, 360)
  const eps = Astronomy.e_tilt(time).tobl
  const r = (x: number) => (x * Math.PI) / 180
  const asc = mod(
    (Math.atan2(
      Math.cos(r(ramc)),
      -(Math.sin(r(ramc)) * Math.cos(r(eps)) + Math.tan(r(lat)) * Math.sin(r(eps)))
    ) *
      180) /
      Math.PI,
    360
  )
  return SIGNS[Math.floor(asc / 30)]
}

/** 그날(전환 없는 날) 시계 분 → UTC ms — Intl offset. */
function wallToUtc(dayIso: string, minute: number, tz: string): number {
  const guess = Date.parse(`${dayIso}T00:00:00.000Z`) + minute * 60_000
  const off = (ms: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
        .formatToParts(new Date(ms))
        .map((x) => [x.type, x.value])
    )
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - ms
  }
  return guess - off(guess - off(guess))
}

const CASES = [
  {
    name: 'Madrid',
    birth: { birthDate: '1988-03-12', birthTime: '09:30', gender: 'female' as const },
    loc: { latitude: 40.4168, longitude: -3.7038, timeZone: 'Europe/Madrid' },
    day: '2026-07-15',
    pin: ['Rabbit', '07:15–09:15', 'Leo'],
  },
  {
    name: 'Seoul',
    birth: { birthDate: '1990-05-15', birthTime: '10:00', gender: 'male' as const },
    loc: { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' },
    day: '2026-11-25',
    pin: ['Rat', '23:32–01:32', null],
  },
  {
    name: 'Urumqi',
    birth: { birthDate: '1985-08-20', birthTime: '14:00', gender: 'male' as const },
    loc: { latitude: 43.825, longitude: 87.6168, timeZone: 'Asia/Shanghai' },
    day: '2026-11-25',
    pin: ['Rabbit', '07:10–09:10', null],
  },
  {
    // 재감사 CC-3 표본 — 2026-10-12 未시(상승 염소, 룰러 토성)가 '정인 × 토성' 교차로 나왔다.
    name: 'Seoul CC-3',
    birth: { birthDate: '1997-03-21', birthTime: '14:30', gender: 'female' as const },
    loc: { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' },
    day: '2026-10-12',
    pin: [null, null, null],
  },
] as const

describeRealEphemeris('Day 시진 리듬 줄 — 실제 창 + 한가운데 상승궁 (TP-8 · CC-3)', () => {
  for (const c of CASES) {
    it(`${c.name} ${c.day}: 줄의 창 = 평균태양시 시진, 상승궁 = 창 한가운데의 astronomy-engine 상승궁`, async () => {
      const natal = await buildNatalContext({ ...c.birth, calendarType: 'solar', ...c.loc })
      const cells = await buildCalendar(
        natal,
        { start: `${c.day}T00:00:00.000Z`, end: `${c.day}T23:59:59.999Z`, granularity: 'day' },
        { includeEvidence: true }
      )
      const cell = cells.find((x) => x.datetime.startsWith(c.day))!
      const rows = buildHourCrossings(cell, c.day, natal.astro.location)
      expect(rows.length).toBeGreaterThan(0)

      // 그날 offset 하나(전환 없는 날) — 보정 = round(경도×4) − offset.
      const offset =
        (wallToUtc(c.day, 0, c.loc.timeZone) - Date.parse(`${c.day}T00:00:00.000Z`)) / -60_000
      const corr = Math.round(c.loc.longitude * 4) - offset
      for (const r of rows) {
        const b = ANIMALS.indexOf(/\((\w+) hour\)/.exec(r.whenEn)?.[1] ?? '')
        expect(b, r.whenEn).toBeGreaterThanOrEqual(0)
        const solarStart = b === 0 ? -60 : (2 * b - 1) * 60
        expect(r.whenEn.slice(0, 11), r.whenEn).toBe(
          `${hhmm(solarStart - corr)}–${hhmm(solarStart + 120 - corr)}`
        )
        const center = mod(b * 120 - corr, 1440) // 그날 안의 시진 한가운데(시계 분)
        const want = referenceAscSign(
          wallToUtc(c.day, center, c.loc.timeZone),
          c.loc.latitude,
          c.loc.longitude
        )
        expect(r.risingSignEn, `${r.whenEn} @ ${hhmm(center)}`).toBe(want)
      }

      const [animal, window, rising] = c.pin
      if (animal) {
        const row = rows.find((r) => r.whenEn.includes(`(${animal} hour)`))!
        expect(row.whenEn.slice(0, 11)).toBe(window)
        if (rising) expect(row.risingSignEn).toBe(rising)
      }

      // 결정 19 — 줄은 교차가 아니다. 엔진 hourly 교차는 밴드 안 빠른 행성과만.
      for (const r of rows) {
        expect(r).not.toHaveProperty('matched')
        expect(r).not.toHaveProperty('crossMeaning')
        expect(r).not.toHaveProperty('rulerEn')
      }
      const hourlyBand = Object.entries(CROSS_LAYER_BAND)
        .filter(([, layers]) => layers.includes('hourly'))
        .map(([planet]) => planet)
      expect(hourlyBand.sort()).toEqual(['Mars', 'Mercury', 'Moon', 'Sun', 'Venus'])
      const hourlyCrosses = cell.signals.filter(
        (x) => x.kind === 'cross-activation' && x.layer === 'hourly'
      )
      expect(hourlyCrosses.length).toBeGreaterThan(0)
      for (const s of hourlyCrosses) {
        const astro = (s.evidence.detail as { astroKey?: string } | undefined)?.astroKey
        expect(astro, s.id).toBeDefined()
        expect(hourlyBand, s.id).toContain(astro)
      }
    }, 60_000)
  }
})

const BRANCH_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']

describeRealEphemeris('Day 시별 달 — 실제 시진 창 라벨 (G11 · TP-8 carry-over)', () => {
  for (const c of CASES) {
    it(`${c.name} ${c.day}: 달 절정 시각의 창 = 평균태양시 시진 창(시진 리듬 줄과 같은 라벨)`, async () => {
      const natal = await buildNatalContext({ ...c.birth, calendarType: 'solar', ...c.loc })
      const events = await buildHourMoon(c.day, natal)
      expect(events.length).toBeGreaterThan(0)
      const offset =
        (wallToUtc(c.day, 0, c.loc.timeZone) - Date.parse(`${c.day}T00:00:00.000Z`)) / -60_000
      const corr = Math.round(c.loc.longitude * 4) - offset
      for (const e of events) {
        const b = ANIMALS.indexOf(/\((\w+) hour\)$/.exec(e.whenEn)?.[1] ?? '')
        expect(b, e.whenEn).toBeGreaterThanOrEqual(0)
        const solarStart = b === 0 ? -60 : (2 * b - 1) * 60
        const span = `${hhmm(solarStart - corr)}–${hhmm(solarStart + 120 - corr)}`
        expect(e.whenEn).toBe(`${span} (${ANIMALS[b]} hour)`)
        expect(e.when).toBe(`${span} (${BRANCH_KO[b]}시)`)
        expect(e.hour).toBe(b * 2)
        // 명목 라벨('5–7am', '05-07시') 잔재가 없다.
        expect(e.whenEn).not.toMatch(/am|pm/)
        expect(e.when).not.toMatch(/^\d\d-\d\d시/)
      }
    }, 60_000)
  }
})
