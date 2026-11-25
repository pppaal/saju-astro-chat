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
 * Every invariant holds since engine stages E6–E13 and F3. Without native swisseph the
 * blocks skip locally but fail in CI and in the destiny release gate
 * (tests/helpers/realEphemeris.ts); tests/golden/goldenMarkers.guard.test.ts keeps
 * expected-failure and known-defect markers out (stage E16).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import golden from './engine-golden.json'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../helpers/realEphemeris')

const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine/index')
const { buildReportContext } = await import('@/lib/report/buildReportContext')
const { buildCrossRows } = await import('@/lib/report/integratedAdapter')
const { evalVoid } = await import('@/lib/report/natalCrossEvaluators')
const { crossLayerAllowed } = await import('@/lib/calendar-engine/data/saju-astro-mapping')
const { buildDecadeCross } = await import('@/app/calendar/assembleLifetime')
const { crossKeys, pickDayReason, pickDayReasonSignal, reasonSignForMark } =
  await import('@/app/calendar/crossPair')
const { deriveLayeredScores } = await import('@/lib/calendar-engine/derivers/layeredScore')
const { bandMarkForScore } = await import('@/lib/calendar-view/toMonth')

type Cell = Awaited<ReturnType<typeof buildCalendar>>[number]
type Signal = Cell['signals'][number]

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

describeRealEphemeris('calendar cross invariants (E0 section E)', () => {
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

  it('range invariance: 1-day build = month cell', () => {
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
  it('子時 2026-11-02 00:00–01:32 is 丙子', () => {
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

  it('no previous-day 子時 parent on 2026-11-02', () => {
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

  it('cross parents resolve inside the cell', () => {
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
  // are directed points, not planets moving in the sky. Solar and lunar returns are
  // cycle periods (owner decision 15): standalone astro signals, never cross parents.
  const SYMBOLIC_ASTRO_KINDS = new Set([
    'planetary-hour',
    'solar-arc',
    'progression',
    'progressed-moon',
    'solar-return',
    'lunar-return',
  ])
  it('no element-flow / jijanggan / symbolic astro parents', () => {
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

  it('return signals stay standalone: present in the build, never a cross parent (decision 15)', () => {
    const returnKinds = new Set(['solar-return', 'lunar-return'])
    const seen = new Set<string>()
    const bad: string[] = []
    for (const b of built) {
      for (const cell of b.month) {
        const byId = new Map(cell.signals.map((x) => [x.id, x]))
        for (const s of cell.signals) {
          if (returnKinds.has(s.kind)) seen.add(s.kind)
          if (!isCross(s)) continue
          const astroId = parentIds(s)[1]
          const astroKind = byId.get(astroId)?.kind ?? s.evidence?.detail?.parentAstroKind
          if (
            returnKinds.has(String(astroKind)) ||
            /^astro\.(solar|lunar)-return\./.test(astroId ?? '')
          )
            bad.push(`${b.person.id} ${cell.datetime.slice(0, 10)} ${s.name} ← ${astroId}`)
        }
      }
    }
    // The build really carries both return kinds, so the check is not vacuous.
    expect([...seen].sort()).toEqual(['lunar-return', 'solar-return'])
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('(name, layer) unique per cell', () => {
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

  it('sign coherence with both parents', () => {
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

  it('cross layer = narrowest parent layer', () => {
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

  it('an hourly parent keeps the cross hourly (out of TONE_LAYERS)', () => {
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

  it('a decadal cross has a 대운 saju parent and a decade-scale astro parent', () => {
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

  // Life 'This decade's overlap' (plan B3 #8, audit X7): every row traces to a decadal cross
  // whose saju parent is a 대운 pillar and whose astro parent is a decade-scale body (no
  // 시진 / planetary-hour), both carrying the row's nonzero sign.
  it('Life decadeCross rows have a 대운 parent and a decade-scale astro parent of the same sign', () => {
    const bad: string[] = []
    let rows = 0
    for (const b of built) {
      for (const cell of b.month) {
        const byId = new Map(cell.signals.map((x) => [x.id, x]))
        for (const row of buildDecadeCross(cell)) {
          rows++
          const sign = sgn(row.polarity)
          const ok = cell.signals.some((s) => {
            if (!isCross(s) || s.layer !== 'decadal' || s.polarity !== row.polarity) return false
            const k = crossKeys(s)
            if (k.sajuKo !== row.saju || k.astroKo !== row.astro) return false
            const [saju, astro] = parentIds(s).map((id) => byId.get(id))
            return (
              !!saju &&
              !!astro &&
              /\.daeun-(stem|branch)\./.test(saju.id) &&
              saju.layer === 'decadal' &&
              astro.layer === 'decadal' &&
              astro.kind !== 'planetary-hour' &&
              sgn(saju.polarity) === sign &&
              sgn(astro.polarity) === sign
            )
          })
          if (sign === 0 || !ok)
            bad.push(
              `${b.person.id} ${cell.datetime.slice(0, 10)} ${row.saju} × ${row.astro} ${row.polarity}`
            )
        }
      }
    }
    // The population has real rows (P05: 정인 × 목성 +2, 丁 대운 × third Jupiter return).
    expect(rows).toBeGreaterThan(0)
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('sample 2026-11-19 has no decade overlap (plan B3: 정재 × 토성 parents disagree)', () => {
    const sample = built.find((b) => b.person.id === X.sample.id)!
    expect(buildDecadeCross(cellOf(sample, '2026-11-19'))).toEqual([])
  })

  // Day 'why' (stage F3, OD-10): a 2-hour 시진 cross never heads the day's reason while a
  // daily or instant cross of the mark's sign exists. The mark is the grid band of the
  // layered day score, as assembleDayTier computes it.
  const dayMarkOf = (b: Built, date: string) => {
    const score = deriveLayeredScores(b.month).daily.get(date)?.score
    return score != null ? bandMarkForScore(score) : null
  }

  it('sample 2026-11-19: the day reason is a daily cross, not a 시진 cross', () => {
    const sample = built.find((b) => b.person.id === X.sample.id)!
    const cell = cellOf(sample, '2026-11-19')
    const mark = dayMarkOf(sample, '2026-11-19')
    // Before F3 the hourly 편관 × 화성 −2 (己酉 시진 parent) headed the reason over the
    // daily 정재 × 화성 −1 because hourly shared the day-layer bonus.
    const strongHourly = cell.signals.some(
      (s) => isCross(s) && s.layer === 'hourly' && s.name === '편관 × 화성' && s.polarity === -2
    )
    expect(strongHourly).toBe(true)
    const sig = pickDayReasonSignal(cell, mark)
    expect(sig?.layer).toBe('daily')
    const reason = pickDayReason(cell, mark)
    expect(mark).toBeNull()
    expect({ saju: reason?.saju, astro: reason?.astro, polarity: reason?.polarity }).toEqual({
      saju: '정재',
      astro: '화성',
      polarity: -1,
    })
  })

  it('a 시진 cross is the day reason only when no daily/instant cross agrees', () => {
    const bad: string[] = []
    let hourlyReasons = 0
    let reasons = 0
    for (const b of built) {
      for (const cell of b.month) {
        const date = cell.datetime.slice(0, 10)
        const mark = dayMarkOf(b, date)
        const sig = pickDayReasonSignal(cell, mark)
        if (!sig) continue
        reasons++
        if (sig.layer !== 'hourly') continue
        hourlyReasons++
        const need = reasonSignForMark(mark)
        const agreeing = cell.signals.find(
          (s) =>
            isCross(s) &&
            (s.layer === 'daily' || s.layer === 'instant') &&
            s.polarity !== 0 &&
            (need === 0 || sgn(s.polarity) === need)
        )
        if (agreeing)
          bad.push(
            `${b.person.id} ${date} ${sig.name} hourly over ${agreeing.name} ${agreeing.layer}`
          )
      }
    }
    expect(reasons).toBeGreaterThan(0)
    expect(hourlyReasons).toBeLessThan(reasons)
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('every cross carries a grade in {A, B} and a layer inside its planet band', () => {
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
  // ctx.input 은 computeIsMinor 가 읽는 숫자 꼴(year·month·date)을 유지한다 — 예전엔
  // date 를 'YYYY-MM-DD' 문자열로 덮어써 미성년 판정이 늘 false 였다(F5).
  ;(ctx as Record<string, unknown>).input = {
    ...((ctx as Record<string, unknown>).input as object),
    gender: i.gender,
    birthDate: i.birthDate,
    birthTime: i.birthTime,
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

describeRealEphemeris('report cross rows (E0 section F)', () => {
  it('karma inputs match the reference (旬空, North Node)', async () => {
    const r = await reportFor(R.karma.input)
    expect([...r.gongmang].sort()).toEqual([...R.karma.gongmang].sort())
    expect(r.northNode).toBe(R.karma.northNode)
  }, 30_000)

  it('karma row 1951-05-22 13:38 F Seoul', async () => {
    const row = (await reportFor(R.karma.input)).rows.find((x) => x.key === 'karma')
    expect({ tone: row?.tone, karmaAxis: row?.karmaAxis }).toEqual(R.karma.expected)
  }, 30_000)

  it('growth inputs match the reference (North Node)', async () => {
    const r = await reportFor(R.growth.input)
    expect(r.northNode).toBe(R.growth.northNode)
  }, 30_000)

  it('growth row 1960-12-18 21:49 M Los Angeles', async () => {
    expect(R.growth.expected).not.toBeNull()
    const row = (await reportFor(R.growth.input)).rows.find((x) => x.key === 'growth')
    expect(row?.tone).toBe(R.growth.expected!.tone)
  }, 30_000)

  it('evalVoid is order-invariant', () => {
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

  it('needs inputs match the reference (Moon sign)', async () => {
    expect((await reportFor(R.needs.input)).moon).toBe(R.needs.moon)
  }, 30_000)

  it('sample needs row follows the element relation', async () => {
    const r = await reportFor(R.needs.input)
    const need = KO_EN[r.yongsin ?? ''] ?? r.yongsin
    expect(need).toBeTruthy()
    const row = r.rows.find((x) => x.key === 'needs')
    expect(row?.tone).toBe(elementTone(need!, R.needs.moonElement))
  }, 30_000)

  // 미성년 마스킹 경로 — 만 14세 미만이면 연애·재물 행을 내지 않는다(MINOR_AGE_THRESHOLD).
  // 같은 출생 정보를 성인 생년으로 바꾼 대조군은 연애·재물 행을 낼 수 있고, ctx.input 은
  // 숫자 꼴이라 computeIsMinor 가 실제로 판정한다.
  it('minor chart 2015-06-10 08:20 F Seoul hides romance and wealth rows', async () => {
    const minor = {
      ...R.needs.input,
      birthDate: '2015-06-10',
      birthTime: '08:20',
      gender: 'female',
    }
    const r = await reportFor(minor as ReportInput)
    const input = (r.ctx as Record<string, any>).input
    expect([input.year, input.month, input.date]).toEqual([2015, 6, 10])
    const keys = r.rows.map((x) => x.key)
    expect(keys.length).toBeGreaterThan(0)
    expect(keys).not.toContain('romance')
    expect(keys).not.toContain('wealth')
    // 대조군 — 같은 차트를 성인 생년으로 판정하면 연애·재물 행이 나온다(마스킹 경로가
    // 실제로 행을 가렸다는 뜻). 예전 helper 는 date 문자열 때문에 늘 이 꼴이었다.
    const asAdult = buildCrossRows(
      { ...(r.ctx as Record<string, any>), input: { ...input, year: 1990 } } as never,
      'en',
      NOW
    ).rows.map((x) => x.key)
    expect(asAdult.filter((k) => k === 'romance' || k === 'wealth').length).toBeGreaterThan(0)
  }, 30_000)
})

describe('golden fixture sanity', () => {
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
