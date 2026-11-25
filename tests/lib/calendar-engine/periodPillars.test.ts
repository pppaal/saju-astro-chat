/**
 * periodPillars — 캘린더 셀 하나에 세운·월운·대운 하나 (재감사 G2 · TP-2 · TP-3 · TP-7).
 *
 * 셀 = 출생지 시간대의 민용 날짜. 절입일 규칙(오너 결정 17 기본값): 節/立春 이 든 그 현지
 * 날이 새 기둥을 받는다(그날이 끝날 때 걸린 기둥). 대운은 만 나이 생일 경계(daeunAge SSOT).
 *
 * 기대값은 엔진 헬퍼를 거치지 않고 따로 낸다 — 절입 instant(KASI 표)를 Intl 로 그 존의
 * 민용 날짜로 읽고, 60갑자·五虎遁 은 이 파일의 산술로. 사주 추출기만 켠 buildCalendar 로
 * 셀 불변식(세운 하나, 모든 월 신호가 saju-pillar 월운과 같은 지지)과 범위 불변을 잠근다.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { getSolarTermKST } from '@/lib/saju/constants'
import { calculateSajuData } from '@/lib/saju/saju'
import { currentDaeun } from '@/lib/saju/daeunAge'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import {
  daeunWindows,
  monthWindows,
  pillarsForLocalDate,
  yearWindows,
} from '@/lib/calendar-engine/periodPillars'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { ActiveSignal, CalendarCell } from '@/lib/calendar-engine/types'

const STEMS = '甲乙丙丁戊己庚辛壬癸'.split('')
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('')

const DAY_MS = 86_400_000
const addDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10)

/** 절대 순간 → 그 존의 민용 날짜 'YYYY-MM-DD' (Intl, 엔진 코드 밖). */
function localDate(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

/** 독립 기대값 — 그 존의 민용 날짜에 걸린 (세운, 월운) 간지 (절입일 규칙). */
function expectedPillars(date: string, tz: string): { year: string; month: string } {
  const y = Number(date.slice(0, 4))
  let last: { term: number; termYear: number } | null = null
  for (const ty of [y - 1, y]) {
    for (let term = 1; term <= 12; term++) {
      const t = getSolarTermKST(ty, term)!
      if (localDate(t.getTime(), tz) <= date) last = { term, termYear: ty }
    }
  }
  const { term, termYear } = last!
  const sajuYear = term === 1 ? termYear - 1 : termYear
  const ys = (((sajuYear - 4) % 10) + 10) % 10
  const yb = (((sajuYear - 4) % 12) + 12) % 12
  const k = term === 1 ? 11 : term - 2 // 0 = 寅
  const ms = ((ys % 5) * 2 + 2 + k) % 10 // 五虎遁
  const mb = (2 + k) % 12
  return { year: STEMS[ys] + BRANCHES[yb], month: STEMS[ms] + BRANCHES[mb] }
}

const ganji = (p: { stem: string; branch: string }) => p.stem + p.branch

const ZONES = [
  { tz: 'Asia/Seoul', lat: 37.5665, lon: 126.978 },
  { tz: 'America/Los_Angeles', lat: 34.05, lon: -118.24 },
  { tz: 'Australia/Sydney', lat: -33.8688, lon: 151.2093 },
  { tz: 'Pacific/Honolulu', lat: 21.3069, lon: -157.8583 },
  { tz: 'Pacific/Auckland', lat: -36.8485, lon: 174.7633 },
] as const

/** 2025–2030 의 모든 節(12 × 6 = 72) 절입 instant. */
const TERMS: Array<{ year: number; term: number; ms: number }> = []
for (let year = 2025; year <= 2030; year++) {
  for (let term = 1; term <= 12; term++) {
    TERMS.push({ year, term, ms: getSolarTermKST(year, term)!.getTime() })
  }
}

describe('pillarsForLocalDate — 재감사 TP-3 corrected_expected', () => {
  const cases: Array<[string, string, string, string]> = [
    // [zone, local date, 세운, 월운]
    ['America/Los_Angeles', '2025-01-05', '甲辰', '丁丑'], // 소한 LA 01-04 18:32
    ['America/Los_Angeles', '2025-01-04', '甲辰', '丁丑'], // 절입이 든 날 = 새 달
    ['America/Los_Angeles', '2025-01-03', '甲辰', '丙子'],
    ['Asia/Seoul', '2026-02-03', '乙巳', '己丑'], // 입춘 서울 02-04 05:02
    ['Asia/Seoul', '2026-02-04', '丙午', '庚寅'],
    ['America/Los_Angeles', '2026-02-03', '丙午', '庚寅'], // 같은 순간이 LA 02-03 12:02
    ['America/Los_Angeles', '2027-02-04', '丁未', '壬寅'], // 입춘 LA 02-03 17:46
    ['Australia/Sydney', '2025-02-03', '甲辰', '丁丑'], // 입춘 시드니 02-04 01:10
    ['Pacific/Auckland', '2025-02-03', '甲辰', '丁丑'],
    ['Asia/Seoul', '2026-11-04', '丙午', '戊戌'], // TP-2: 11-01~06 은 戊戌
    ['Asia/Seoul', '2026-11-06', '丙午', '戊戌'],
    ['Asia/Seoul', '2026-11-07', '丙午', '己亥'], // 입동 18:52 KST
    ['Pacific/Honolulu', '2026-11-06', '丙午', '己亥'], // 입동 11-06 23:52 HST
  ]
  it.each(cases)('%s %s → 세운 %s · 월운 %s', (tz, date, year, month) => {
    const [y, m, d] = date.split('-').map(Number)
    const p = pillarsForLocalDate(y, m, d, tz)
    expect(ganji(p.year)).toBe(year)
    expect(ganji(p.month)).toBe(month)
  })

  it('모든 존 × 2025–2030 의 모든 節: 절입일과 그 전날이 독립 기대값과 같다', () => {
    for (const { tz } of ZONES) {
      for (const t of TERMS) {
        const day = localDate(t.ms, tz)
        for (const date of [addDays(day, -1), day, addDays(day, 1)]) {
          const [y, m, d] = date.split('-').map(Number)
          const p = pillarsForLocalDate(y, m, d, tz)
          const exp = expectedPillars(date, tz)
          expect(`${tz} ${date} ${ganji(p.year)} ${ganji(p.month)}`).toBe(
            `${tz} ${date} ${exp.year} ${exp.month}`
          )
        }
        // 절입일 규칙: 그날 = 새 지지, 전날 = 앞 지지.
        const [y, m, d] = day.split('-').map(Number)
        const [py, pm, pd] = addDays(day, -1).split('-').map(Number)
        const newBranch = BRANCHES[(2 + (t.term === 1 ? 11 : t.term - 2)) % 12]
        expect(pillarsForLocalDate(y, m, d, tz).month.branch).toBe(newBranch)
        expect(pillarsForLocalDate(py, pm, pd, tz).month.branch).not.toBe(newBranch)
      }
    }
  })
})

describe('monthWindows / yearWindows — 빈틈 없이 이어지는 떠 있는 창', () => {
  const RANGE = { start: '2025-01-01T00:00:00.000Z', end: '2030-12-31T23:59:59.999Z' }

  it.each(ZONES.map((z) => z.tz))('%s: 절기월 창이 이어지고 각 창이 절입일에 연다', (tz) => {
    const ws = monthWindows(RANGE, tz)
    expect(ws.length).toBeGreaterThanOrEqual(72)
    for (let i = 1; i < ws.length; i++) {
      expect(ws[i].startDate).toBe(addDays(ws[i - 1].endDate, 1))
    }
    for (const w of ws) {
      expect(w.startDate).toBe(localDate(Date.parse(w.opensAt), tz))
      expect(w.start).toBe(`${w.startDate}T00:00:00.000Z`)
      expect(w.end).toBe(`${w.endDate}T23:59:59.999Z`)
      expect(ganji(w)).toBe(expectedPillars(w.startDate, tz).month)
      expect(ganji(w)).toBe(expectedPillars(w.endDate, tz).month)
    }
  })

  it.each(ZONES.map((z) => z.tz))('%s: 세운 경계 = 寅월 경계 (한 셀에 세운 둘이 없다)', (tz) => {
    const years = yearWindows(RANGE, tz)
    const tigers = monthWindows(RANGE, tz).filter((w) => w.branch === '寅')
    for (let i = 1; i < years.length; i++) {
      expect(years[i].startDate).toBe(addDays(years[i - 1].endDate, 1))
    }
    for (const y of years.filter((w) => w.startDate >= '2025-01-01')) {
      expect(tigers.some((t) => t.startDate === y.startDate)).toBe(true)
      expect(ganji(y)).toBe(expectedPillars(y.startDate, tz).year)
    }
  })

  it('범위가 달라도 같은 창 (범위 불변)', () => {
    const tz = 'America/Los_Angeles'
    const month = monthWindows({ start: '2026-11-01T00:00:00.000Z', end: '2026-11-30' }, tz)
    const day = monthWindows({ start: '2026-11-04', end: '2026-11-04' }, tz)
    expect(day).toHaveLength(1)
    expect(month).toContainEqual(day[0])
  })
})

describe('daeunWindows — 만 나이 생일 경계 (재감사 TP-7, daeunAge SSOT)', () => {
  it('대운은 시작 나이 생일에 열리고 다음 대운 생일 전날 닫힌다', () => {
    const ws = daeunWindows(
      {
        input: { year: 1990, month: 10, date: 20 },
        saju: {
          daeun: [
            { startAge: 26, startYear: 2016, stem: '己', branch: '丑' },
            { startAge: 36, startYear: 2026, stem: '庚', branch: '寅' },
          ],
        },
      },
      { start: '2026-01-01T00:00:00.000Z', end: '2026-12-31T23:59:59.999Z' }
    )
    expect(ws.map((w) => [ganji(w), w.startDate, w.midDate, w.endDate])).toEqual([
      ['己丑', '2016-10-20', '2021-10-20', '2026-10-19'],
      ['庚寅', '2026-10-20', '2031-10-20', '2036-10-19'],
    ])
  })

  it('2월 29일생은 평년엔 3월 1일에 나이가 오른다 (currentManAge 와 같다)', () => {
    const ws = daeunWindows(
      {
        input: { year: 2000, month: 2, date: 29 },
        saju: {
          daeun: [
            { startAge: 3, stem: '戊', branch: '寅' },
            { startAge: 13, stem: '己', branch: '卯' },
          ],
        },
      },
      { start: '2003-01-01T00:00:00.000Z', end: '2014-12-31T23:59:59.999Z' }
    )
    expect(ws[0].startDate).toBe('2003-03-01')
    expect(ws[0].endDate).toBe('2013-02-28')
    expect(ws[1].startDate).toBe('2013-03-01')
  })

  it('목록이 범위 끝 만 나이를 못 덮으면 같은 순서열로 잇는다 (시작 + 100세 이상)', () => {
    // 1920-03-01 서울 남, 대운수 1, 순행 — 2026 은 만 106세, 己丑@101 (G1 · SP-1).
    const daeun = '己卯 庚辰 辛巳 壬午 癸未 甲申 乙酉 丙戌 丁亥 戊子'
      .split(' ')
      .map((g, i) => ({ startAge: 1 + 10 * i, stem: g[0], branch: g[1] }))
    const ws = daeunWindows(
      { input: { year: 1920, month: 3, date: 1 }, saju: { daeun } },
      { start: '2026-11-24', end: '2026-11-24' }
    )
    expect(ws.map((w) => `${ganji(w)}@${w.startAge}`)).toEqual(['己丑@101'])
  })
})

// ─── buildCalendar 셀 불변식 — 사주 기간 추출기만 켠 빌드 ───

const SAJU_KINDS = ['pillar-sibsin', 'jijanggan', 'gongmang', 'tonggeun-shift']
const PERIOD_MODULES = new Set([
  'saju-pillar',
  'saju-twelve-stage',
  'saju-jijanggan',
  'saju-yongsin',
  'saju-johu-yongsin',
  'saju-gongmang',
  'saju-tonggeun',
])

/** 기간 신호가 가리키는 (간지 또는 지지) — 모듈마다 실린 곳이 다르다. */
function namedPillar(s: ActiveSignal): { stem?: string; branch: string } | null {
  const ev = s.evidence as { module: string; pillars?: string[]; detail?: Record<string, unknown> }
  const det = ev.detail ?? {}
  switch (ev.module) {
    case 'saju-pillar':
    case 'saju-tonggeun': {
      const g = ev.pillars?.[0] ?? ''
      return { stem: g[0], branch: g[1] }
    }
    case 'saju-twelve-stage':
    case 'saju-gongmang':
      return { branch: String(det.cyclicalBranch) }
    case 'saju-jijanggan':
      return { branch: String(det.branch) }
    case 'saju-johu-yongsin':
      return { branch: String(det.monthBranch) }
    case 'saju-yongsin': {
      const m = /— (.)(.) (대운|세운|월운)$/.exec(s.name)
      return m ? { stem: m[1], branch: m[2] } : null
    }
    default:
      return null
  }
}

const periodSignals = (cell: CalendarCell, layer: 'yearly' | 'monthly' | 'decadal') =>
  cell.signals.filter(
    (s) => s.layer === layer && PERIOD_MODULES.has((s.evidence as { module: string }).module)
  )

async function natalFor(
  zone: (typeof ZONES)[number],
  birthDate = '1984-04-27',
  birthTime = '12:40',
  gender: 'male' | 'female' = 'male',
  now?: Date
): Promise<NatalContext> {
  const input = {
    birthDate,
    birthTime,
    gender,
    latitude: zone.lat,
    longitude: zone.lon,
    timeZone: zone.tz,
  }
  const saju = calculateSajuData(
    birthDate,
    birthTime,
    gender,
    'solar',
    zone.tz,
    false,
    zone.lon,
    now
  )
  return buildNatalContext(input, { saju })
}

const sajuBuild = (natal: NatalContext, from: string, to: string) =>
  buildCalendar(
    natal,
    { start: `${from}T00:00:00.000Z`, end: `${to}T23:59:59.999Z`, granularity: 'day' },
    { includeEvidence: true, enabledExtractors: SAJU_KINDS as never, enablePatterns: false }
  )

describe('buildCalendar — 셀마다 세운 하나 + 모든 월 신호가 saju-pillar 월운 (재감사 TP-2·TP-3)', () => {
  const natals = new Map<string, NatalContext>()
  beforeAll(async () => {
    for (const z of ZONES) natals.set(z.tz, await natalFor(z))
  }, 120_000)

  it.each(ZONES.map((z) => z.tz))(
    '%s: 2025–2030 모든 節 전날·당일·다음날',
    async (tz) => {
      const natal = natals.get(tz)!
      for (const t of TERMS) {
        const day = localDate(t.ms, tz)
        const cells = await sajuBuild(natal, addDays(day, -1), addDays(day, 1))
        expect(cells).toHaveLength(3)
        for (const cell of cells) {
          const date = cell.datetime.slice(0, 10)
          const exp = expectedPillars(date, tz)
          const where = `${tz} ${date}`

          const seun = periodSignals(cell, 'yearly').filter((s) =>
            s.id.startsWith('saju.pillar-sibsin.seun.')
          )
          expect(
            seun.map((s) => s.name.slice(0, 2)),
            where
          ).toEqual([exp.year])
          const wolun = periodSignals(cell, 'monthly').filter((s) =>
            s.id.startsWith('saju.pillar-sibsin.wolun.')
          )
          expect(
            wolun.map((s) => s.name.slice(0, 2)),
            where
          ).toEqual([exp.month])

          for (const s of periodSignals(cell, 'yearly')) {
            const p = namedPillar(s)
            expect(p, `${where} ${s.id}`).not.toBeNull()
            expect(p!.branch, `${where} ${s.id}`).toBe(exp.year[1])
            if (p!.stem) expect(p!.stem, `${where} ${s.id}`).toBe(exp.year[0])
          }
          for (const s of periodSignals(cell, 'monthly')) {
            const p = namedPillar(s)
            expect(p, `${where} ${s.id}`).not.toBeNull()
            expect(p!.branch, `${where} ${s.id}`).toBe(exp.month[1])
            if (p!.stem) expect(p!.stem, `${where} ${s.id}`).toBe(exp.month[0])
          }
        }
      }
    },
    120_000
  )

  it('범위 불변 — 節 날의 기간 신호는 1일·3일·한 달 빌드에서 같다', async () => {
    const key = (c: CalendarCell) =>
      c.signals
        .filter((s) => s.layer !== 'daily' && s.layer !== 'hourly')
        .filter((s) => PERIOD_MODULES.has((s.evidence as { module: string }).module))
        .map((s) => `${s.id}|${s.active.start}|${s.active.end}|${s.polarity}`)
        .sort()
    for (const tz of ['America/Los_Angeles', 'Pacific/Auckland']) {
      const natal = natals.get(tz)!
      for (const t of TERMS.filter((x) => x.year === 2026)) {
        const day = localDate(t.ms, tz)
        const one = (await sajuBuild(natal, day, day))[0]
        const three = (await sajuBuild(natal, addDays(day, -1), addDays(day, 1)))[1]
        const ym = day.slice(0, 7)
        const last = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate()
        const month = (await sajuBuild(natal, `${ym}-01`, `${ym}-${last}`)).find((c) =>
          c.datetime.startsWith(day)
        )!
        expect(key(three), `${tz} ${day} 3d`).toEqual(key(one))
        expect(key(month), `${tz} ${day} month`).toEqual(key(one))
      }
    }
  }, 120_000)
})

describe('buildCalendar — 대운 창은 만 나이 생일에 연다 (재감사 TP-7)', () => {
  /** 그 셀의 기간 추출기 decadal 신호가 가리키는 대운들(간지 또는 지지). */
  function decadalNames(cell: CalendarCell): Set<string> {
    const out = new Set<string>()
    for (const s of periodSignals(cell, 'decadal')) {
      const p = namedPillar(s)
      if (p) out.add(p.stem ? p.stem + p.branch : p.branch)
    }
    return out
  }
  /** 현지 날짜의 정오 순간(그 존) — currentDaeun 의 now. */
  function localNoon(date: string, tz: string): Date {
    const naive = Date.parse(`${date}T12:00:00.000Z`)
    const shown = Date.parse(
      new Intl.DateTimeFormat('sv-SE', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
        .format(new Date(naive))
        .replace(' ', 'T') + 'Z'
    )
    return new Date(naive - (shown - naive))
  }

  it.each([
    // 1990-10-20 10:00 서울 남 — 己丑@26 → 庚寅@36 은 2026-10-20 (TP-7 repro)
    {
      zone: ZONES[0],
      birth: '1990-10-20',
      time: '10:00',
      gender: 'male' as const,
      edge: '2026-10-20',
      before: '己丑',
      after: '庚寅',
    },
    // LA 출생 — 경계는 LA 민용 생일
    {
      zone: ZONES[1],
      birth: '1985-08-15',
      time: '06:30',
      gender: 'female' as const,
      edge: null,
      before: '',
      after: '',
    },
  ])(
    '$zone.tz $birth: 생일 전날은 앞 대운, 생일부터 새 대운 — currentDaeun 과 같다',
    async (c) => {
      const natal = await natalFor(c.zone, c.birth, c.time, c.gender)
      const tz = c.zone.tz
      const [, bm, bd] = c.birth.split('-')
      const starts = natal.saju.daeun.map((d) => d.startYear)
      // 첫 대운이 걸린 뒤의 경계 두 개(시작 나이 생일)를 본다.
      const edges = c.edge ? [c.edge] : starts.slice(2, 4).map((y) => `${y}-${bm}-${bd}`)
      const saju = calculateSajuData(c.birth, c.time, c.gender, 'solar', tz, false, c.zone.lon)
      const list = saju.daeWoon.list
      const civil = { year: +c.birth.slice(0, 4), month: +bm, day: +bd }
      for (const edge of edges) {
        const cells = await sajuBuild(natal, addDays(edge, -1), edge)
        for (const cell of cells) {
          const date = cell.datetime.slice(0, 10)
          const cur = currentDaeun(list, civil, tz, localNoon(date, tz)).current!
          const g = cur.heavenlyStem + cur.earthlyBranch
          const names = decadalNames(cell)
          expect(names.size, `${tz} ${date}`).toBeGreaterThan(0)
          for (const n of names)
            expect(g.includes(n) || n === g, `${tz} ${date} ${n} vs ${g}`).toBe(true)
        }
        if (c.edge) {
          expect(decadalNames(cells[0])).toContain(c.before)
          expect(decadalNames(cells[1])).not.toContain(c.before)
          expect([...decadalNames(cells[1])].some((n) => c.after.includes(n))).toBe(true)
        }
      }
    },
    120_000
  )

  it('첫 대운 전에는 기간 추출기 대운 신호가 없다 (OD-12)', async () => {
    // 2022-06-15 10:00 서울 남 — 첫 대운 丁未@7 (2029-06-15, 골든 G22).
    const natal = await natalFor(ZONES[0], '2022-06-15', '10:00', 'male')
    const cells = await sajuBuild(natal, '2029-06-14', '2029-06-15')
    expect(decadalNames(cells[0]).size).toBe(0)
    expect([...decadalNames(cells[1])].every((n) => '丁未'.includes(n) || n === '丁未')).toBe(true)
    expect(decadalNames(cells[1]).size).toBeGreaterThan(0)
  }, 60_000)

  it('시작 + 100세 이상이면 캐시된 10칸 목록을 이어 지금 대운을 낸다', async () => {
    // 1920-03-01 10:00 서울 남 — 2000 년 기준으로 계산한 10칸 목록(戊子@91 까지)이 캐시돼
    // 있어도 2026-11-24 셀은 己丑@101 (G1 · SP-1).
    const natal = await natalFor(
      ZONES[0],
      '1920-03-01',
      '10:00',
      'male',
      new Date('2000-01-01T00:00:00Z')
    )
    expect(natal.saju.daeun).toHaveLength(10)
    const [cell] = await sajuBuild(natal, '2026-11-24', '2026-11-24')
    const names = decadalNames(cell)
    expect(names.size).toBeGreaterThan(0)
    for (const n of names) expect('己丑'.includes(n) || n === '己丑', n).toBe(true)
  }, 60_000)
})
