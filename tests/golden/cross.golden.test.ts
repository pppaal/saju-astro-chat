/**
 * Calendar cross invariants and report cross rows (engine audit E0, sections E and F).
 *
 * Runs on the real ephemeris (node environment, swisseph unmocked): under the
 * global mock every chart's Sun sits at the same longitude, so crosses would be
 * built from fake planets.
 *
 * Inputs and reference values come from tests/golden/engine-golden.json
 * (scripts/golden/build-engine-golden.mts): the sample birth plus 20 births
 * seeded with mulberry32(20261124), three dates each in 2026-11; the 子時 golden
 * from CONVENTIONS §1; report references from astronomy-engine (true node, Moon),
 * 旬空 from the day pillar, and the five-element verdict family.
 * Population size is capped (21 births × 1 month) for the 4-vCPU CI.
 *
 * Known defects: an invariant that a later engine stage restores is listed in
 * KNOWN_DEFECTS with that stage id and runs as `it.fails` until the stage lands
 * and deletes the entry. Run with GOLDEN_SHOW_DEFECTS=1 to see the real diffs.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import golden from './engine-golden.json'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const swissephAvailable = await import('swisseph').then(
  () => true,
  () => false
)

const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine/index')
const { buildReportContext } = await import('@/lib/report/buildReportContext')
const { buildCrossRows } = await import('@/lib/report/integratedAdapter')
const { evalVoid } = await import('@/lib/report/natalCrossEvaluators')
const { crossLayerAllowed } = await import('@/lib/calendar-engine/data/saju-astro-mapping')

type Cell = Awaited<ReturnType<typeof buildCalendar>>[number]
type Signal = Cell['signals'][number]

/** Engine stage that restores each invariant. Delete an entry when its stage lands. */
const KNOWN_DEFECTS: Record<string, string> = {}

const SHOW_DEFECTS = process.env.GOLDEN_SHOW_DEFECTS === '1'
const usedDefects = new Set<string>()
function golden_it(key: string, fn: () => unknown, timeout?: number) {
  const defect = KNOWN_DEFECTS[key]
  if (!defect) return it(key, fn, timeout)
  usedDefects.add(key)
  const name = `${key} [knownDefect:${defect}]`
  return SHOW_DEFECTS ? it(name, fn, timeout) : it.fails(name, fn, timeout)
}

const X = golden.cross
type Birth = (typeof X.births)[number]
const PEOPLE: Birth[] = [X.sample as Birth, ...X.births]
const DAY_MS = 86_400_000
const sgn = (n: number) => Math.sign(n)
const isCross = (s: Signal) => s.kind === 'cross-activation'
const parentIds = (s: Signal) => (s.evidence?.detail?.parentIds as string[] | undefined) ?? []
const LAYER_RANK: Record<string, number> = {
  hourly: 0,
  instant: 0,
  daily: 1,
  monthly: 2,
  yearly: 3,
  decadal: 4,
}

type Built = { person: Birth; month: Cell[]; days: Map<string, Cell> }
const built: Built[] = []

describe.skipIf(!swissephAvailable)('calendar cross invariants (E0 section E)', () => {
  beforeAll(async () => {
    for (const person of PEOPLE) {
      const natal = await buildNatalContext({
        birthDate: person.birthDate,
        birthTime: person.birthTime,
        gender: person.gender as 'male' | 'female',
        latitude: person.latitude,
        longitude: person.longitude,
        timeZone: person.timeZone,
      })
      const month = await buildCalendar(
        natal,
        { start: X.month.start, end: X.month.end, granularity: 'day' },
        { includeEvidence: true }
      )
      const days = new Map<string, Cell>()
      for (const d of person.dates) {
        const one = await buildCalendar(
          natal,
          { start: `${d}T00:00:00.000Z`, end: `${d}T23:59:59.999Z`, granularity: 'day' },
          { includeEvidence: true }
        )
        days.set(d, one[0])
      }
      built.push({ person, month, days })
    }
  }, 120_000)

  const cellOf = (b: Built, date: string) => b.month.find((c) => c.datetime.startsWith(date))!
  const eachCross = (fn: (b: Built, cell: Cell, s: Signal, byId: Map<string, Signal>) => void) => {
    for (const b of built) {
      for (const cell of b.month) {
        const byId = new Map(cell.signals.map((x) => [x.id, x]))
        for (const s of cell.signals) if (isCross(s)) fn(b, cell, s, byId)
      }
    }
  }

  it('builds the whole population', () => {
    expect(built).toHaveLength(PEOPLE.length)
    for (const b of built) expect(b.month).toHaveLength(30)
    let crosses = 0
    eachCross(() => crosses++)
    expect(crosses).toBeGreaterThan(0)
  })

  golden_it('range invariance: 1-day build = month cell', () => {
    const key = (c: Cell) =>
      [
        ...new Set(c.signals.filter(isCross).map((s) => `${s.name}|${s.layer}|${s.polarity}`)),
      ].sort()
    const diffs: string[] = []
    for (const b of built) {
      for (const [date, one] of b.days) {
        const m = key(cellOf(b, date))
        const d = key(one)
        if (m.join('\n') !== d.join('\n')) {
          diffs.push(
            `${b.person.id} ${date}: month-only [${m.filter((x) => !d.includes(x)).slice(0, 3)}] day-only [${d.filter((x) => !m.includes(x)).slice(0, 3)}]`
          )
        }
      }
    }
    expect(diffs).toEqual([])
  })

  // Hour windows are floating local time (local wall clock written with a Z).
  const zi = X.ziHour
  golden_it('子時 2026-11-02 00:00–01:32 is 丙子', () => {
    const t = Date.parse(`${zi.date}T00:30:00.000Z`)
    const covering: string[] = []
    for (const b of built) {
      for (const date of [zi.previousDay.date, zi.date]) {
        for (const s of cellOf(b, date).signals) {
          if (!s.id.startsWith('saju.hour.')) continue
          if (Date.parse(s.active.start) <= t && t < Date.parse(s.active.end))
            covering.push(`${b.person.id} ${s.name}`)
        }
      }
    }
    expect(covering.length).toBeGreaterThan(0)
    expect(covering.filter((x) => !x.includes(zi.hourPillar))).toEqual([])
  })

  golden_it('no previous-day 子時 parent on 2026-11-02', () => {
    const bad: string[] = []
    for (const b of built) {
      for (const s of cellOf(b, zi.date).signals) {
        if (
          isCross(s) &&
          parentIds(s).some((id) => id.startsWith(`saju.hour.${zi.previousDay.date}.`))
        )
          bad.push(`${b.person.id} ${s.name} ← ${parentIds(s)[0]}`)
      }
    }
    expect(bad).toEqual([])
  })

  golden_it('cross parents resolve inside the cell', () => {
    const bad: string[] = []
    eachCross((b, cell, s, byId) => {
      const missing = parentIds(s).filter((id) => !byId.has(id))
      if (parentIds(s).length !== 2 || missing.length)
        bad.push(
          `${b.person.id} ${cell.datetime.slice(0, 10)} ${s.name}: ${missing.join(',') || 'no parentIds'}`
        )
    })
    expect(bad.slice(0, 10)).toEqual([])
  })

  // Symbolic astro keys (OD-9): planetary hours are time rulers; solar arc, secondary
  // progressions and the progressed Moon (incl. the progressed lunar return milestone)
  // are directed points, not planets moving in the sky.
  const SYMBOLIC_ASTRO_KINDS = new Set([
    'planetary-hour',
    'solar-arc',
    'progression',
    'progressed-moon',
  ])
  golden_it('no element-flow / jijanggan / symbolic astro parents', () => {
    const bad: string[] = []
    eachCross((b, cell, s, byId) => {
      const [sajuId, astroId] = parentIds(s)
      const astroKind = byId.get(astroId)?.kind ?? s.evidence?.detail?.parentAstroKind
      if (
        /^saju\.(element-flow|jijanggan)\./.test(sajuId ?? '') ||
        SYMBOLIC_ASTRO_KINDS.has(String(astroKind)) ||
        (astroId ?? '').startsWith('astro.lifecycle.progressed_')
      )
        bad.push(`${b.person.id} ${cell.datetime.slice(0, 10)} ${s.name} ← ${sajuId} × ${astroId}`)
    })
    expect(bad.slice(0, 10)).toEqual([])
  })

  golden_it('(name, layer) unique per cell', () => {
    const bad: string[] = []
    for (const b of built) {
      for (const cell of b.month) {
        const seen = new Map<string, number>()
        for (const s of cell.signals.filter(isCross)) {
          const k = `${s.name}|${s.layer}`
          seen.set(k, (seen.get(k) ?? 0) + 1)
        }
        for (const [k, n] of seen)
          if (n > 1) bad.push(`${b.person.id} ${cell.datetime.slice(0, 10)} ${k} ×${n}`)
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })

  golden_it('sign coherence with both parents', () => {
    // A nonzero cross needs a nonzero parent, and every nonzero parent shares its sign.
    const bad: string[] = []
    eachCross((b, cell, s, byId) => {
      if (s.polarity === 0) return
      const ps = parentIds(s).map((id) => byId.get(id))
      if (ps.some((p) => !p)) return // covered by 'parents resolve inside the cell'
      const signs = ps.map((p) => sgn(p!.polarity))
      if (signs.every((x) => x === 0) || signs.some((x) => x !== 0 && x !== sgn(s.polarity)))
        bad.push(
          `${b.person.id} ${cell.datetime.slice(0, 10)} ${s.name} ${s.polarity} ← (${signs.join(',')})`
        )
    })
    expect(bad.slice(0, 10)).toEqual([])
  })

  golden_it('cross layer = narrowest parent layer', () => {
    const bad: string[] = []
    eachCross((b, cell, s, byId) => {
      const ps = parentIds(s).map((id) => byId.get(id))
      if (ps.some((p) => !p)) return
      const narrowest = ps.map((p) => p!.layer).sort((x, y) => LAYER_RANK[x] - LAYER_RANK[y])[0]
      if (s.layer !== narrowest)
        bad.push(
          `${b.person.id} ${cell.datetime.slice(0, 10)} ${s.name} ${s.layer} ← (${ps.map((p) => p!.layer)})`
        )
    })
    expect(bad.slice(0, 10)).toEqual([])
  })

  golden_it('an hourly parent keeps the cross hourly (out of TONE_LAYERS)', () => {
    const bad: string[] = []
    let hourly = 0
    eachCross((b, cell, s, byId) => {
      const ps = parentIds(s).map((id) => byId.get(id))
      if (!ps.some((p) => p?.layer === 'hourly')) return
      hourly++
      if (s.layer !== 'hourly')
        bad.push(`${b.person.id} ${cell.datetime.slice(0, 10)} ${s.name} ${s.layer}`)
    })
    expect(hourly).toBeGreaterThan(0)
    expect(bad.slice(0, 10)).toEqual([])
  })

  golden_it('a decadal cross has a 대운 saju parent and a decade-scale astro parent', () => {
    const bad: string[] = []
    eachCross((b, cell, s, byId) => {
      if (s.layer !== 'decadal') return
      const [saju, astro] = parentIds(s).map((id) => byId.get(id))
      if (!saju || !astro) return
      if (
        !/\.daeun-(stem|branch)\./.test(saju.id) ||
        saju.layer !== 'decadal' ||
        astro.layer !== 'decadal'
      )
        bad.push(
          `${b.person.id} ${cell.datetime.slice(0, 10)} ${s.name} ← ${saju.id} × ${astro.id}`
        )
    })
    expect(bad.slice(0, 10)).toEqual([])
  })

  golden_it('every cross carries a grade in {A, B} and a layer inside its planet band', () => {
    const bad: string[] = []
    eachCross((b, cell, s) => {
      const astroKey = String(s.evidence?.detail?.astroKey ?? '')
      const grade = s.evidence?.detail?.grade
      if ((grade !== 'A' && grade !== 'B') || !crossLayerAllowed(astroKey, s.layer))
        bad.push(`${b.person.id} ${cell.datetime.slice(0, 10)} ${s.name} ${grade} ${s.layer}`)
    })
    expect(bad.slice(0, 10)).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section F — report cross rows
// ─────────────────────────────────────────────────────────────────────────────
const R = golden.report
const NOW = new Date(R.now)
type ReportInput = (typeof R.karma)['input']
type Ctx = Awaited<ReturnType<typeof buildReportContext>>
type Planet = { name?: string; sign?: string }

async function reportFor(i: ReportInput) {
  const ctx = (await buildReportContext({
    birthDate: i.birthDate,
    birthTime: i.birthTime,
    gender: i.gender as 'male' | 'female',
    latitude: i.latitude,
    longitude: i.longitude,
    timeZone: i.timeZone,
  })) as Ctx & Record<string, unknown>
  ;(ctx as Record<string, unknown>).input = {
    ...((ctx as Record<string, unknown>).input as object),
    gender: i.gender,
    birthDate: i.birthDate,
    birthTime: i.birthTime,
    date: i.birthDate,
  }
  const S = (ctx as Record<string, any>).saju ?? {}
  const A = (ctx as Record<string, any>).astro ?? {}
  const planets: Planet[] = A.chart?.planets ?? A.planets ?? []
  return {
    ctx,
    rows: buildCrossRows(ctx, 'en', NOW).rows,
    gongmang: (S.analyses?.gongmang?.gongmangBranches ?? S.gongmang ?? []) as string[],
    northNode: planets.find((p) => /node/i.test(p.name ?? '') && !/south/i.test(p.name ?? ''))
      ?.sign,
    moon: planets.find((p) => p.name === 'Moon')?.sign,
    yongsin: S.yongsin?.primary as string | undefined,
  }
}

const KO_EN: Record<string, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}
const GEN: Record<string, string> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}
const CTL: Record<string, string> = {
  wood: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'wood',
  water: 'fire',
}
/** Five-element verdict family (natalCrossVerdict.elementVerdict). */
const elementTone = (a: string, b: string) =>
  a === b
    ? 'resonant'
    : GEN[a] === b || GEN[b] === a
      ? 'complement'
      : CTL[a] === b || CTL[b] === a
        ? 'tension'
        : 'neutral'

describe.skipIf(!swissephAvailable)('report cross rows (E0 section F)', () => {
  golden_it(
    'karma inputs match the reference (旬空, North Node)',
    async () => {
      const r = await reportFor(R.karma.input)
      expect([...r.gongmang].sort()).toEqual([...R.karma.gongmang].sort())
      expect(r.northNode).toBe(R.karma.northNode)
    },
    30_000
  )

  golden_it(
    'karma row 1951-05-22 13:38 F Seoul',
    async () => {
      const row = (await reportFor(R.karma.input)).rows.find((x) => x.key === 'karma')
      expect({ tone: row?.tone, karmaAxis: row?.karmaAxis }).toEqual(R.karma.expected)
    },
    30_000
  )

  golden_it(
    'growth inputs match the reference (North Node)',
    async () => {
      const r = await reportFor(R.growth.input)
      expect(r.northNode).toBe(R.growth.northNode)
    },
    30_000
  )

  golden_it(
    'growth row 1960-12-18 21:49 M Los Angeles',
    async () => {
      expect(R.growth.expected).not.toBeNull()
      const row = (await reportFor(R.growth.input)).rows.find((x) => x.key === 'growth')
      expect(row?.tone).toBe(R.growth.expected!.tone)
    },
    30_000
  )

  golden_it('evalVoid is order-invariant', () => {
    const bad: string[] = []
    for (const v of R.voidCases) {
      for (const pair of [v.pair, [...v.pair].reverse()]) {
        const r = evalVoid(pair, v.southNode)
        if (r?.tone !== v.expected || r?.karmaAxis !== true)
          bad.push(`${pair.join('')} SN ${v.southNode} → ${r?.tone} karmaAxis=${r?.karmaAxis}`)
      }
    }
    expect(bad).toEqual([])
  })

  golden_it(
    'needs inputs match the reference (Moon sign)',
    async () => {
      expect((await reportFor(R.needs.input)).moon).toBe(R.needs.moon)
    },
    30_000
  )

  golden_it(
    'sample needs row follows the element relation',
    async () => {
      const r = await reportFor(R.needs.input)
      const need = KO_EN[r.yongsin ?? ''] ?? r.yongsin
      expect(need).toBeTruthy()
      const row = r.rows.find((x) => x.key === 'needs')
      expect(row?.tone).toBe(elementTone(need!, R.needs.moonElement))
    },
    30_000
  )
})

describe('knownDefect bookkeeping', () => {
  it('every KNOWN_DEFECTS key names a test in this file', () => {
    if (!swissephAvailable) return
    expect(Object.keys(KNOWN_DEFECTS).filter((k) => !usedDefects.has(k))).toEqual([])
  })
  it('population dates sit inside the built month', () => {
    const lo = Date.parse(X.month.start)
    const hi = Date.parse(X.month.end)
    for (const p of PEOPLE) {
      for (const d of p.dates) {
        const t = Date.parse(`${d}T00:00:00.000Z`)
        expect(t >= lo && t + DAY_MS - 1 <= hi, `${p.id} ${d}`).toBe(true)
      }
    }
  })
})
