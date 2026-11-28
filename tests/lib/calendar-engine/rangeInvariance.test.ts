/**
 * 캘린더 교차 범위 불변 — 엔진 감사 E9 (X1·X2·X3·F1·X4·X5·X10) 의 계약.
 *
 * 셀의 교차는 (본명, 날짜) 만의 함수다(CLAUDE.md 결정론). 같은 날을 1일·그 달·앞뒤 3일
 * 범위로 빌드해도 교차 집합 (name, layer, polarity, weight 소수 셋째 자리) 이 같아야 한다.
 * 점수(derivedScore·salience)는 빌드 묶음 모집단 대비라 비교에서 뺀다.
 * 예전엔 트랜짓 창이 빌드 범위에서 잘려 1일 빌드(포커스 셀 — 일 화면 교차·인생 화면 10년
 * 교차의 원천)가 월 빌드(월 리드아웃 '왜')와 표본 날의 절반에서 다른 교차를 냈다.
 *
 * 실제 Swiss Ephemeris 로 돈다(모의 천체력은 행성이 하루 0.1° 씩 도는 가짜라 run 경계가
 * 의미 없다).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

import { calculateSajuData } from '@/lib/saju/saju'
import { STEMS, BRANCHES, TIME_STEM_LOOKUP } from '@/lib/saju/constants'
import { solarTimeCorrectionMinutes } from '@/lib/saju/timezone'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { hourSegmentsForCivilDay } from '@/lib/calendar-engine/extractors/saju-hour'
import { computeDayStem } from '@/lib/calendar-engine/extractors/saju-shinsal'
import { assembleDayTier } from '@/app/calendar/assembleDayTier'
import { assembleLifetime } from '@/app/calendar/assembleLifetime'
import { STATIC_NATAL_KINDS } from '@/lib/calendar-engine/signalTaxonomy'
import { deriveScore } from '@/lib/calendar-engine/derivers/score'
import { deriveEvidenceLadder } from '@/lib/calendar-engine/derivers/evidenceLadder'
import { deriveConvergence } from '@/lib/calendar-engine/derivers/convergence'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { ActiveSignal, CalendarCell } from '@/lib/calendar-engine/types'

const DAY_MS = 86_400_000
const shift = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10)

function monthRange(ym: string) {
  const last = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate()
  return {
    start: `${ym}-01T00:00:00.000Z`,
    end: `${ym}-${String(last).padStart(2, '0')}T23:59:59.999Z`,
    granularity: 'day' as const,
  }
}
const dayRange = (from: string, to: string) => ({
  start: `${from}T00:00:00.000Z`,
  end: `${to}T23:59:59.999Z`,
  granularity: 'day' as const,
})
const cellOf = (cells: CalendarCell[], day: string) =>
  cells.find((c) => c.datetime.startsWith(day))!

/** 계약 필드 — name·layer·polarity·weight(3dp), 그리고 id·창(재감사 CC-7). */
function crossSet(cell: CalendarCell): string[] {
  return cell.signals
    .filter((s) => s.kind === 'cross-activation')
    .map(
      (s) =>
        `${s.id}|${s.name}|${s.layer}|${s.polarity}|${s.weight.toFixed(3)}|${s.active.start}~${s.active.end}`
    )
    .sort()
}

/**
 * 하우스 오버레이·앵글 컨택·정적 본명 신호(본명 Almuten·격국명·패턴·일주 archetype·격국 성패)
 * 의 id·창 — 빌드 범위와 무관해야 한다(CC-7, G13).
 */
function staticWindowSet(cell: CalendarCell): string[] {
  return cell.signals
    .filter(
      (s) =>
        s.kind === 'house-transit' ||
        s.kind === 'angle-contact' ||
        STATIC_NATAL_KINDS.has(s.kind) ||
        s.evidence.detail?.dignity === 'natal-almuten'
    )
    .map((s) => `${s.id}|${s.active.start}|${s.active.peak}|${s.active.end}`)
    .sort()
}

/** 정적 본명 신호만 — 1일·월·연 빌드 비교용(G13). */
function natalStaticSet(cell: CalendarCell | undefined): string[] {
  return (cell?.signals ?? [])
    .filter((s) => STATIC_NATAL_KINDS.has(s.kind))
    .map((s) => `${s.kind}|${s.id}|${s.active.start}|${s.active.peak}|${s.active.end}`)
    .sort()
}

async function natalFor(b: {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
}): Promise<NatalContext> {
  const saju = calculateSajuData(
    b.birthDate,
    b.birthTime,
    b.gender,
    'solar',
    b.timeZone,
    false,
    b.longitude
  )
  return buildNatalContext(b, { saju })
}

async function expectInvariant(natal: NatalContext, days: string[], label: string) {
  const months = new Map<string, CalendarCell[]>()
  for (const d of days) {
    const ym = d.slice(0, 7)
    if (!months.has(ym)) {
      months.set(ym, await buildCalendar(natal, monthRange(ym), { includeEvidence: true }))
    }
    const monthCell = cellOf(months.get(ym)!, d)
    const oneCell = cellOf(await buildCalendar(natal, dayRange(d, d), { includeEvidence: true }), d)
    const winCell = cellOf(
      await buildCalendar(natal, dayRange(shift(d, -3), shift(d, 3)), { includeEvidence: true }),
      d
    )
    const month = crossSet(monthCell)
    expect(crossSet(oneCell), `${label} ${d}: 1일 빌드 ≠ 월 빌드`).toEqual(month)
    expect(crossSet(winCell), `${label} ${d}: D±3 빌드 ≠ 월 빌드`).toEqual(month)
    const monthStatic = staticWindowSet(monthCell)
    expect(staticWindowSet(oneCell), `${label} ${d}: 1일 빌드 창 ≠ 월 빌드`).toEqual(monthStatic)
    expect(staticWindowSet(winCell), `${label} ${d}: D±3 빌드 창 ≠ 월 빌드`).toEqual(monthStatic)
  }
}

const SAMPLE = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  gender: 'female' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

let sample: NatalContext
let sampleMonth: CalendarCell[]

beforeAll(async () => {
  sample = await natalFor(SAMPLE)
  sampleMonth = await buildCalendar(sample, monthRange('2026-11'), { includeEvidence: true })
}, 120_000)

describe('교차 범위 불변 — 1일 = 월 = D±3 (X1)', () => {
  it('표본 1997-03-21 14:30 F 서울 — 11-02·11-06·11-19·11-24', async () => {
    await expectInvariant(sample, ['2026-11-02', '2026-11-06', '2026-11-19', '2026-11-24'], '표본')
  }, 120_000)

  it('시드 출생 20명 × 3일', async () => {
    let seed = 20261125
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    const CITIES = [
      [37.5665, 126.978, 'Asia/Seoul'],
      [35.1796, 129.0756, 'Asia/Seoul'],
      [34.0522, -118.2437, 'America/Los_Angeles'],
      [51.5074, -0.1278, 'Europe/London'],
      [-33.8688, 151.2093, 'Australia/Sydney'],
      [40.7128, -74.006, 'America/New_York'],
      [35.6762, 139.6503, 'Asia/Tokyo'],
      [39.47, 75.99, 'Asia/Shanghai'],
    ] as const
    for (let i = 0; i < 20; i++) {
      const y = 1950 + Math.floor(rnd() * 60)
      const m = 1 + Math.floor(rnd() * 12)
      const d = 1 + Math.floor(rnd() * 28)
      const hh = Math.floor(rnd() * 24)
      const mm = Math.floor(rnd() * 60)
      const [latitude, longitude, timeZone] = CITIES[Math.floor(rnd() * CITIES.length)]
      const birth = {
        birthDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        birthTime: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
        gender: (rnd() < 0.5 ? 'male' : 'female') as 'male' | 'female',
        latitude,
        longitude,
        timeZone,
      }
      const natal = await natalFor(birth)
      // 같은 달 3일 — 월 빌드 1회를 공유(첫·끝 날은 월 가장자리라 범위 밖 run 이 꼭 필요).
      const ym = `${2025 + Math.floor(rnd() * 3)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}`
      const last = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate()
      const mid = 2 + Math.floor(rnd() * (last - 2))
      const days = [`${ym}-01`, `${ym}-${String(mid).padStart(2, '0')}`, `${ym}-${last}`]
      await expectInvariant(natal, days, `${birth.birthDate} ${birth.birthTime} ${timeZone}`)
    }
  }, 600_000)
})

const yearRange = (y: string) => dayRange(`${y}-01-01`, `${y}-12-31`)
/** 정적 본명 추출기만 — 연 빌드도 가볍게(격국명·패턴·일주 archetype·격국 성패·본명 Almuten). */
const STATIC_ONLY = {
  includeEvidence: true,
  enabledExtractors: ['saju-pattern', 'geokguk-status', 'natal-dignity'] as never[],
}

async function expectNatalStaticInvariant(natal: NatalContext, days: string[], label: string) {
  const years = new Map<string, CalendarCell[]>()
  const months = new Map<string, CalendarCell[]>()
  for (const d of days) {
    const y = d.slice(0, 4)
    const ym = d.slice(0, 7)
    if (!years.has(y)) years.set(y, await buildCalendar(natal, yearRange(y), STATIC_ONLY))
    if (!months.has(ym)) months.set(ym, await buildCalendar(natal, monthRange(ym), STATIC_ONLY))
    const year = natalStaticSet(cellOf(years.get(y)!, d))
    const month = natalStaticSet(cellOf(months.get(ym)!, d))
    const one = natalStaticSet(cellOf(await buildCalendar(natal, dayRange(d, d), STATIC_ONLY), d))
    expect(year.length, `${label} ${d}: 정적 본명 신호 없음`).toBeGreaterThan(0)
    expect(month, `${label} ${d}: 월 빌드 ≠ 연 빌드`).toEqual(year)
    expect(one, `${label} ${d}: 1일 빌드 ≠ 연 빌드`).toEqual(year)
    // 연 단위 창은 그 해 안에 있고, id 는 연도(또는 날짜)로 끝난다.
    for (const row of year) {
      const [, id, start, , end] = row.split('|')
      expect(start.slice(0, 4), row).toBe(y)
      expect(end.slice(0, 4), row).toBe(y)
      expect(id.endsWith(`.${y}`) || id.includes(`.${d}.`), row).toBe(true)
    }
  }
}

describe('정적 본명 신호 id·창 범위 불변 — 1일 = 월 = 연 (G13)', () => {
  it('표본 1997-03-21 14:30 F 서울 — 격국명·일주 archetype·격국 성패·본명 Almuten', async () => {
    await expectNatalStaticInvariant(
      sample,
      ['2026-01-01', '2026-02-04', '2026-11-19', '2026-12-31'],
      '표본'
    )
    const cell = cellOf(sampleMonth, '2026-11-19')
    const ids = cell.signals.filter((s) => STATIC_NATAL_KINDS.has(s.kind)).map((s) => s.id)
    expect(ids.some((id) => id.startsWith('saju.ilju-archetype.') && id.endsWith('.2026'))).toBe(
      true
    )
    expect(ids.some((id) => id.startsWith('saju.pattern.geokguk.') && id.endsWith('.2026'))).toBe(
      true
    )
    expect(ids.some((id) => id.startsWith('astro.dignity.natal-almuten.'))).toBe(true)
  }, 120_000)

  it('시드 출생 20명 × 3일 (연 경계 포함)', async () => {
    let seed = 20261126
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    const CITIES = [
      [37.5665, 126.978, 'Asia/Seoul'],
      [34.0522, -118.2437, 'America/Los_Angeles'],
      [51.5074, -0.1278, 'Europe/London'],
      [-33.8688, 151.2093, 'Australia/Sydney'],
      [40.7128, -74.006, 'America/New_York'],
    ] as const
    for (let i = 0; i < 20; i++) {
      const y = 1950 + Math.floor(rnd() * 60)
      const m = 1 + Math.floor(rnd() * 12)
      const d = 1 + Math.floor(rnd() * 28)
      const hh = Math.floor(rnd() * 24)
      const mm = Math.floor(rnd() * 60)
      const [latitude, longitude, timeZone] = CITIES[Math.floor(rnd() * CITIES.length)]
      const birth = {
        birthDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        birthTime: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
        gender: (rnd() < 0.5 ? 'male' : 'female') as 'male' | 'female',
        latitude,
        longitude,
        timeZone,
      }
      const natal = await natalFor(birth)
      const year = String(2025 + Math.floor(rnd() * 3))
      const mid = `${year}-${String(2 + Math.floor(rnd() * 10)).padStart(2, '0')}-15`
      await expectNatalStaticInvariant(
        natal,
        [`${year}-01-01`, mid, `${year}-12-31`],
        `${birth.birthDate} ${birth.birthTime} ${timeZone}`
      )
    }
  }, 600_000)
})

describe('셀 교차의 부모·dedup (X2·X3·X4·X5)', () => {
  it('교차의 parentIds 는 모두 그 셀 안 신호다 — 전날 子時 꼬리 부모 금지', () => {
    for (const cell of sampleMonth) {
      const ids = new Set(cell.signals.map((s) => s.id))
      for (const s of cell.signals.filter((x) => x.kind === 'cross-activation')) {
        const parents = (s.evidence.detail as { parentIds: string[] }).parentIds
        for (const p of parents) expect(ids.has(p), `${cell.datetime} ${s.id} ← ${p}`).toBe(true)
      }
    }
  })

  it('교차 부모는 오행 흐름·지장간 라인이 아니고, 점성 부모는 행성시가 아니다', () => {
    for (const cell of sampleMonth) {
      const byId = new Map(cell.signals.map((s) => [s.id, s]))
      for (const s of cell.signals.filter((x) => x.kind === 'cross-activation')) {
        const [sajuId, astroId] = (s.evidence.detail as { parentIds: string[] }).parentIds
        const saju = byId.get(sajuId) as ActiveSignal
        const astro = byId.get(astroId) as ActiveSignal
        expect(['saju-pillar', 'saju-hour', 'saju-shinsal', 'saju-shinsal-activation']).toContain(
          saju.evidence.module
        )
        expect(astro.kind).not.toBe('planetary-hour')
      }
    }
  })

  it('(교차 name, layer) 는 셀 안에서 유일하다', () => {
    for (const cell of sampleMonth) {
      const keys = cell.signals
        .filter((s) => s.kind === 'cross-activation')
        .map((s) => `${s.name}|${s.layer}`)
      expect(new Set(keys).size, cell.datetime).toBe(keys.length)
    }
  })

  it('모든 행성시 신호는 end > start (23시 창 포함, X10)', () => {
    const hours = sampleMonth.flatMap((c) => c.signals).filter((s) => s.kind === 'planetary-hour')
    expect(hours.length).toBeGreaterThan(0)
    expect(hours.some((s) => s.id.includes('.H23.'))).toBe(true)
    for (const s of hours)
      expect(Date.parse(s.active.end)).toBeGreaterThan(Date.parse(s.active.start))
  })

  it('11-02 의 00:00–01:32 시진은 丙子(편재) — 11-01 子 부모 교차 없음 (X3·F1)', () => {
    // 11-02 는 庚 일. 五鼠遁 乙庚 → 丙子. 壬 일간에 丙 = 편재.
    const date = new Date('2026-11-02T00:00:00.000Z')
    const dayStem = computeDayStem(date)!
    expect(dayStem).toBe('庚')
    const corr = solarTimeCorrectionMinutes(date, SAMPLE.longitude, SAMPLE.timeZone)
    const dawn = hourSegmentsForCivilDay(corr)[0]
    expect(dawn.startMin).toBe(0)
    expect(dawn.endMin).toBe(92) // 01:32
    const first = STEMS.findIndex((s) => s.name === TIME_STEM_LOOKUP[dayStem])
    expect(`${STEMS[(first + dawn.branchIdx) % 10].name}${BRANCHES[dawn.branchIdx].name}`).toBe(
      '丙子'
    )
    const cell = cellOf(sampleMonth, '2026-11-02')
    // 화(火)가 용신도 기신도 아니면 丙子 는 극성 0 이라 신호가 없다 — 있으면 반드시 丙子.
    for (const s of cell.signals.filter(
      (x) => x.id.startsWith('saju.hour.') && x.name.includes('子')
    )) {
      expect(s.name.startsWith('丙子 (편재)'), s.id).toBe(true)
    }
    for (const s of cell.signals.filter((x) => x.kind === 'cross-activation')) {
      const parents = (s.evidence.detail as { parentIds: string[] }).parentIds
      expect(
        parents.some((p) => p.startsWith('saju.hour.2026-11-01')),
        s.id
      ).toBe(false)
    }
  })
})

describe('본명 고정 사실과 하우스 오버레이 (재감사 CC-2·CC-7)', () => {
  it('본명 Almuten 은 정적 본명(natal-dignity) — 점수·근거 사다리·수렴 밖, 서사(cell.signals)엔 남는다 (G13)', () => {
    let scoreMoved = 0
    for (const cell of sampleMonth) {
      const almuten = cell.signals.filter((s) => s.evidence.detail?.dignity === 'natal-almuten')
      expect(almuten.length, cell.datetime).toBeGreaterThan(0)
      for (const s of almuten) expect(s.kind, s.id).toBe('natal-dignity')
      const live = cell.signals.filter((s) => !STATIC_NATAL_KINDS.has(s.kind))
      expect(cell.derivedScore, cell.datetime).toBe(deriveScore(live, cell.matchedPatterns))
      // 대조군 — 본명 Almuten 을 점수에 넣으면(옛 kind 'transit') 점수가 달라지는 날이 있다.
      const withAlmuten = [...live, ...almuten]
      if (deriveScore(withAlmuten, cell.matchedPatterns) !== cell.derivedScore) scoreMoved++
      for (const lang of ['ko', 'en'] as const) {
        for (const rung of deriveEvidenceLadder(cell.signals, lang)) {
          for (const chip of rung.chips)
            expect(chip.text, chip.text).not.toMatch(/^Natal |디그니티/)
        }
      }
    }
    expect(scoreMoved).toBeGreaterThan(0)
    for (const lang of ['ko', 'en'] as const) {
      for (const day of deriveConvergence(sampleMonth, 31, lang).keyDays) {
        for (const chip of day.astro)
          expect(chip, `${day.date} ${chip}`).not.toMatch(/^Natal |디그니티/)
      }
    }
  })

  it('본명 Almuten 은 교차 부모가 아니다 — 단독 배경 신호로만 남는다', () => {
    let almutenCells = 0
    for (const cell of sampleMonth) {
      if (cell.signals.some((s) => s.evidence.detail?.dignity === 'natal-almuten')) almutenCells++
      for (const s of cell.signals.filter((x) => x.kind === 'cross-activation')) {
        const parents = (s.evidence.detail as { parentIds: string[] }).parentIds
        expect(
          parents.some((p) => p.includes('natal-almuten')),
          `${cell.datetime} ${s.id}`
        ).toBe(false)
      }
    }
    expect(almutenCells).toBe(sampleMonth.length)
  })

  it('2026-10-15/16: 하늘의 태양은 몰락(천칭)이라 태양 교차가 ▲ 가 아니다', async () => {
    const october = await buildCalendar(sample, monthRange('2026-10'), { includeEvidence: true })
    for (const day of ['2026-10-15', '2026-10-16']) {
      const cell = cellOf(october, day)
      const sunCrosses = cell.signals.filter(
        (s) => s.kind === 'cross-activation' && s.name.endsWith('× 태양') && s.layer === 'daily'
      )
      for (const s of sunCrosses) expect(s.polarity, `${day} ${s.id}`).toBeLessThanOrEqual(0)
    }
  }, 120_000)

  it('화성의 본명 1하우스 통과는 실제 진입·이탈 정오 2026-10-16..11-30 — 월·1일 빌드 모두', async () => {
    // 독립 기준(재감사 CC-7 판정): astronomy-engine 화성 × 독립 계산한 Placidus 커스프
    // (ASC 130.04°, 2하우스 151.88°) — 10-15T18:00Z 진입, 11-30T21:00Z 이탈, 서울 정오 샘플.
    const expectWindow = (cell: CalendarCell) => {
      const mars = cell.signals.find((s) => s.id.startsWith('astro.house-transit.Mars.1.'))!
      expect(mars.id).toBe('astro.house-transit.Mars.1.2026-10-16')
      expect(mars.active.start).toBe('2026-10-16T00:00:00.000Z')
      expect(mars.active.end.slice(0, 10)).toBe('2026-11-30')
      const cross = cell.signals.find(
        (s) => s.kind === 'cross-activation' && s.id.startsWith('cross.정재-x-Mars.monthly')
      )
      if (cross) expect(cross.id).toBe('cross.정재-x-Mars.monthly:2026-10-16~2026-11-30')
    }
    expectWindow(cellOf(sampleMonth, '2026-11-05'))
    expectWindow(
      cellOf(
        await buildCalendar(sample, dayRange('2026-11-05', '2026-11-05'), {
          includeEvidence: true,
        }),
        '2026-11-05'
      )
    )
  }, 120_000)
})

describe('일 화면 교차 = 월 셀 교차 (X1 — assembleDayTier)', () => {
  it('포커스 1일 셀로만 만든 crossActivations 와 월 셀로 만든 것이 같다', async () => {
    const day = '2026-11-19'
    const focus = cellOf(
      await buildCalendar(sample, dayRange(day, day), { includeEvidence: true }),
      day
    )
    const strip = (rows: Array<Record<string, unknown>>) =>
      rows.map((r) => ({ ...r, id: undefined, weight: (r.weight as number).toFixed(3) }))
    const fromMonth = await assembleDayTier({
      natal: sample,
      cells: sampleMonth,
      lang: 'ko',
      targetDayIso: day,
      focusDayCell: focus,
      now: new Date('2026-11-19T03:00:00Z'),
    })
    const fromFocus = await assembleDayTier({
      natal: sample,
      cells: [focus],
      lang: 'ko',
      targetDayIso: day,
      focusDayCell: focus,
      now: new Date('2026-11-19T03:00:00Z'),
    })
    expect(fromMonth.crossActivations.length).toBeGreaterThan(0)
    expect(strip(fromFocus.crossActivations as never)).toEqual(
      strip(fromMonth.crossActivations as never)
    )
  }, 120_000)
})

describe('인생 화면 10년 교차 = 월 셀 교차 (X1 — assembleLifetime)', () => {
  it('decadeCross 는 포커스 1일 셀로 만들든 월 셀로 만들든 같다', async () => {
    const day = '2026-11-19'
    const focus = cellOf(
      await buildCalendar(sample, dayRange(day, day), { includeEvidence: true }),
      day
    )
    const run = (cell: CalendarCell) =>
      assembleLifetime({
        natal: sample,
        lang: 'ko',
        birthYear: 1997,
        targetYear: 2026,
        sex: '여',
        birthDisplay: '1997.3.21 14:30',
        whoBirthLine: '1997.3.21 14:30',
        place: '서울',
        now: new Date('2026-11-19T03:00:00Z'),
        todayIso: day,
        focusDayCell: cell,
      })
    // 엔진 감사 E11 뒤로 10년 교차는 두 부모가 모두 10년 층일 때만 생긴다 — 표본은 그날
    // 정재 대운 × 첫 토성 회귀 하나(부모가 매핑 방향에 동의하지 않아 0)라 decadeCross 는
    // 비고(계획 B3 예상), 교차 신호 자체(0 포함)로 비어 있지 않음을 확인한다.
    const decadal = (cell: CalendarCell) =>
      cell.signals
        .filter((s) => s.kind === 'cross-activation' && s.layer === 'decadal')
        .map((s) => `${s.name}|${s.polarity}`)
        .sort()
    const monthCell = cellOf(sampleMonth, day)
    expect(decadal(monthCell).length).toBeGreaterThan(0)
    expect(decadal(focus)).toEqual(decadal(monthCell))
    const fromFocus = (await run(focus)).lifetime.decadeCross
    const fromMonth = (await run(monthCell)).lifetime.decadeCross
    expect(fromFocus).toEqual(fromMonth)
  }, 300_000)
})
