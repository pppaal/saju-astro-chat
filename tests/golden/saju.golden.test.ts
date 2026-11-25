/**
 * Saju pillar goldens (engine audit E0, section A).
 *
 * Expected values come from tests/golden/engine-golden.json, written by
 * scripts/golden/build-engine-golden.mts from independent references only
 * (astronomy-engine 節 instants cross-checked against KASI, JDN day pillar,
 * mean-solar-time hour, 대운 = floor(days / 3) from the raw UT instant). Never
 * regenerate them from engine output.
 *
 * Known defects: a value that a later engine stage corrects is listed in
 * KNOWN_DEFECTS with that stage id and runs as `it.fails` until the stage lands
 * and deletes the entry. Run with GOLDEN_SHOW_DEFECTS=1 to see the real diffs.
 * Owner decisions: tests read `proposed` (OD-1 absolute 절입 instant, OD-2 zone
 * reference longitude, OD-3 RFC 5545 gap/overlap, OD-12 no 대운 before the first).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { natalToJD } from '@/lib/astrology/foundation/shared'
import golden from './engine-golden.json'

type Daeun = {
  forward: boolean
  startAge: number
  first3: string[]
  current: { pillar: string; age: number } | null
}
type Expect = { pillars: string[]; daeun: Daeun }
type SajuCase = {
  id: string
  label: string
  input: {
    date: string
    time: string
    tz: string
    lon: number
    gender: 'male' | 'female'
    now: string
  }
  instant: { utc: string; kind: 'normal' | 'gap' | 'overlap' }
  dayOnly?: boolean
  proposed: Expect
  noLon?: { proposed: Expect }
}
const CASES = golden.saju.cases as unknown as SajuCase[]

/** Engine stage that corrects each value. Delete an entry when its stage lands. */
const KNOWN_DEFECTS: Record<string, string> = {}

const SHOW_DEFECTS = process.env.GOLDEN_SHOW_DEFECTS === '1'
const usedDefects = new Set<string>()
/** `it`, or `it.fails` while the value is a tagged known defect. */
function golden_it(key: string, fn: () => void) {
  const defect = KNOWN_DEFECTS[key]
  if (!defect) return it(key, fn)
  usedDefects.add(key)
  const name = `${key} [knownDefect:${defect}]`
  return SHOW_DEFECTS ? it(name, fn) : it.fails(name, fn)
}

const fmt = (p: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }) =>
  p.heavenlyStem.name + p.earthlyBranch.name

function engine(c: SajuCase, lon: number | undefined) {
  const r = calculateSajuData(
    c.input.date,
    c.input.time,
    c.input.gender,
    'solar',
    c.input.tz,
    false,
    lon,
    new Date(c.input.now)
  )
  const dw = r.daeWoon
  return {
    pillars: [r.yearPillar, r.monthPillar, r.dayPillar, r.timePillar].map(fmt),
    daeun: {
      forward: dw.isForward,
      startAge: dw.startAge,
      first3: dw.list.slice(0, 3).map((x) => x.heavenlyStem + x.earthlyBranch),
      current: dw.current
        ? { pillar: dw.current.heavenlyStem + dw.current.earthlyBranch, age: dw.current.age }
        : null,
    },
  }
}

function pathTests(c: SajuCase, path: 'lon' | 'noLon', exp: Expect, lon: number | undefined) {
  if (c.dayOnly) {
    golden_it(`${c.id} ${path} day`, () => {
      expect(engine(c, lon).pillars[2]).toBe(exp.pillars[2])
    })
    return
  }
  golden_it(`${c.id} ${path} pillars`, () => {
    expect(engine(c, lon).pillars).toEqual(exp.pillars)
  })
  golden_it(`${c.id} ${path} daeun`, () => {
    const d = engine(c, lon).daeun
    expect({ forward: d.forward, startAge: d.startAge, first3: d.first3 }).toEqual({
      forward: exp.daeun.forward,
      startAge: exp.daeun.startAge,
      first3: exp.daeun.first3,
    })
  })
  golden_it(`${c.id} ${path} current`, () => {
    expect(engine(c, lon).daeun.current).toEqual(exp.daeun.current)
  })
}

describe('saju goldens — independent reference (E0 section A)', () => {
  for (const c of CASES) {
    describe(`${c.id} ${c.label} · ${c.input.date} ${c.input.time} ${c.input.tz}`, () => {
      pathTests(c, 'lon', c.proposed, c.input.lon)
      if (c.noLon) pathTests(c, 'noLon', c.noLon.proposed, undefined)
      if (c.dayOnly) pathTests(c, 'noLon', c.proposed, undefined)
    })
  }
})

describe('astrology birth instant agrees with the saju instant (OD-3, RFC 5545)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  // natalToJD must not depend on the server clock (ASTRO-7): check with "now" in January and July.
  const SERVER_DATES = ['2026-01-15T12:00:00Z', '2026-07-15T12:00:00Z']
  for (const c of CASES.filter((x) => x.instant.kind !== 'normal' && !x.dayOnly)) {
    golden_it(`${c.id} natalToJD`, () => {
      const [year, month, date] = c.input.date.split('-').map(Number)
      const [hour, minute] = c.input.time.split(':').map(Number)
      const expectedJd = Date.parse(c.instant.utc) / 86_400_000 + 2440587.5
      for (const serverNow of SERVER_DATES) {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(serverNow))
        const jd = natalToJD({
          year,
          month,
          date,
          hour,
          minute,
          latitude: 0,
          longitude: c.input.lon,
          timeZone: c.input.tz,
        })
        vi.useRealTimers()
        expect(Math.abs(jd - expectedJd) * 86_400, `server now ${serverNow}`).toBeLessThan(1)
      }
    })
  }
})

describe('knownDefect bookkeeping', () => {
  it('every KNOWN_DEFECTS key names a test in this file', () => {
    expect(Object.keys(KNOWN_DEFECTS).filter((k) => !usedDefects.has(k))).toEqual([])
  })
})
