/**
 * Calendar lifecycle signals, lifecycle crosses and the Life decade overlap read the SAME
 * exact instants as the Life milestones (stage G6, re-audit AC-3 and CC-1).
 *
 * The calendar used to open each lifecycle window from the mean-age table (1 January of
 * birthYear + age, for 2–5 years). The Life page dated the same events from the sky, so the
 * calendar showed "Pluto square Pluto" (decadal −2) years before the real square, and that
 * window crossed with the 대운 into a Life "this decade's overlap" row while the same page
 * dated the square years later. Now every lifecycle signal's window is the milestone's pass
 * window (first approach within 1° of the exact angle → leaving 1° after the last pass) and
 * its peak is the first exact pass.
 *
 * Real Swiss Ephemeris (node environment, swisseph unmocked). Without native swisseph the
 * suite skips locally but fails in CI and in the destiny release gate
 * (tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')

const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine')
const { default: astroLifecycleExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-lifecycle')
const { calculateOuterPlanetMilestones } =
  await import('@/lib/calendar-engine/lifecycle/outerMilestones')
const { assembleLifetime, buildDecadeCross } = await import('@/app/calendar/assembleLifetime')

type Natal = Awaited<ReturnType<typeof buildNatalContext>>
type Cell = Awaited<ReturnType<typeof buildCalendar>>[number]
type ExtractorArg = Parameters<typeof astroLifecycleExtractor.extract>[0]

const DAY_MS = 86_400_000
const dayRange = (day: string) => ({
  start: `${day}T00:00:00.000Z`,
  end: `${day}T23:59:59.999Z`,
  granularity: 'day' as const,
})
const shiftDay = (iso: string, n: number) =>
  new Date(Date.parse(iso) + n * DAY_MS).toISOString().slice(0, 10)

async function natalOf(
  birthDate: string,
  birthTime: string,
  gender: 'male' | 'female',
  latitude: number,
  longitude: number,
  timeZone: string
): Promise<Natal> {
  return buildNatalContext({ birthDate, birthTime, gender, latitude, longitude, timeZone })
}

async function dayCell(natal: Natal, day: string): Promise<Cell> {
  const cells = await buildCalendar(natal, dayRange(day), { includeEvidence: true })
  return cells[0]
}

const parentIds = (s: Cell['signals'][number]) =>
  ((s.evidence?.detail as { parentIds?: unknown } | undefined)?.parentIds as string[]) ?? []

describeRealEphemeris('lifecycle — calendar and Life read the same exact instants', () => {
  it('every lifecycle signal = its milestone: window = pass window, peak = first exact pass', async () => {
    const natal = await natalOf('1988-03-17', '12:00', 'female', 37.5665, 126.978, 'Asia/Seoul')
    const milestones = await calculateOuterPlanetMilestones(natal)
    expect(milestones.map((m) => m.kind)).toContain('pluto_square_pluto')
    for (const m of milestones) {
      // a one-day build on the Life milestone date carries the signal (range-invariant window)
      const signals = await astroLifecycleExtractor.extract({
        natal,
        range: dayRange(m.exactDateISO),
      } as unknown as ExtractorArg)
      const s = signals.find((x) => x.id === `astro.lifecycle.${m.kind}`)
      expect(s, m.kind).toBeDefined()
      expect(s!.active).toEqual({ start: m.window.start, peak: m.exactAt, end: m.window.end })
      const w0 = Date.parse(m.window.start)
      const w1 = Date.parse(m.window.end)
      for (const t of [m.exactAt, m.lastExactAt]) {
        expect(Date.parse(t)).toBeGreaterThanOrEqual(w0)
        expect(Date.parse(t)).toBeLessThanOrEqual(w1)
      }
      // two days past the window the signal is gone
      const after = await astroLifecycleExtractor.extract({
        natal,
        range: dayRange(shiftDay(m.window.end, 2)),
      } as unknown as ExtractorArg)
      expect(
        after.find((x) => x.id === s!.id),
        m.kind
      ).toBeUndefined()
    }
  }, 120_000)

  it('AC-3 repro 1988-03-17 Seoul: no Pluto-square signal in November 2026; it opens around the real square (2031-02-22)', async () => {
    const natal = await natalOf('1988-03-17', '12:00', 'female', 37.5665, 126.978, 'Asia/Seoul')
    const nov = await astroLifecycleExtractor.extract({
      natal,
      range: {
        start: '2026-11-01T00:00:00.000Z',
        end: '2026-11-30T23:59:59.999Z',
        granularity: 'day',
      },
    } as unknown as ExtractorArg)
    expect(nov.map((s) => s.id)).not.toContain('astro.lifecycle.pluto_square_pluto')
    const m = (await calculateOuterPlanetMilestones(natal)).find(
      (x) => x.kind === 'pluto_square_pluto'
    )!
    expect(m.exactDateISO).toBe('2031-02-22')
    expect(m.age).toBe(42)
    expect(m.window.start < '2031-02-22' && m.window.end > '2031-02-22').toBe(true)
  }, 120_000)

  it('CC-1 repro 1988-12-10 Kolkata, 2026-11-19: no Pluto parent, Life overlap empty, milestone Feb 2032', async () => {
    const natal = await natalOf('1988-12-10', '05:28', 'male', 28.6139, 77.209, 'Asia/Kolkata')
    const day = '2026-11-19'
    const cell = await dayCell(natal, day)
    expect(cell.signals.some((s) => s.kind === 'lifecycle')).toBe(false)
    expect(
      cell.signals.some((s) => parentIds(s).some((id) => id.startsWith('astro.lifecycle.')))
    ).toBe(false)
    const { lifetime } = await assembleLifetime({
      natal,
      lang: 'en',
      birthYear: 1988,
      targetYear: 2026,
      sex: '남',
      birthDisplay: '1988.12.10 05:28',
      whoBirthLine: '1988.12.10 05:28',
      place: 'Delhi',
      now: new Date('2026-11-19T06:30:00Z'),
      todayIso: day,
      focusDayCell: cell,
    })
    // decision 13: no qualifying overlap → the honest empty state (no filler row)
    expect(lifetime.decadeCross).toEqual([])
    const pluto = lifetime.milestones.find((m) => m.labelEn === 'Pluto square Pluto')
    expect(pluto).toMatchObject({ year: 2032, age: 43 })
    // the lifecycle signal is there exactly when the sky says so
    const m = (await calculateOuterPlanetMilestones(natal)).find(
      (x) => x.kind === 'pluto_square_pluto'
    )!
    expect(m.exactDateISO).toBe('2032-02-24')
    const inWindow = await dayCell(natal, m.exactDateISO)
    const sig = inWindow.signals.find((s) => s.id === 'astro.lifecycle.pluto_square_pluto')
    expect(sig?.active.start).toBe(m.window.start)
    expect(sig?.active.end).toBe(m.window.end)
  }, 180_000)

  it('a Life overlap row with a lifecycle parent agrees with its milestone, and is gone past the pass window', async () => {
    // 1990-05-15 06:40 Seoul: second Jupiter return exact 2013-08-08 inside the 정인 대운 —
    // a real 정인 × 목성 +2 decade row whose astro parent is the lifecycle signal.
    const natal = await natalOf('1990-05-15', '06:40', 'male', 37.5665, 126.978, 'Asia/Seoul')
    const m = (await calculateOuterPlanetMilestones(natal)).find(
      (x) => x.kind === 'jupiter_return_2'
    )!
    expect(m.exactDateISO).toBe('2013-08-08')
    const cell = await dayCell(natal, m.exactDateISO)
    const rows = buildDecadeCross(cell)
    expect(rows).toContainEqual(
      expect.objectContaining({ saju: '정인', astro: '목성', polarity: 2 })
    )
    // every decadal cross with a lifecycle parent: parent window = milestone window ∋ day
    const byId = new Map(cell.signals.map((s) => [s.id, s]))
    const withLifecycle = cell.signals.filter(
      (s) => s.kind === 'cross-activation' && parentIds(s)[1]?.startsWith('astro.lifecycle.')
    )
    expect(withLifecycle.length).toBeGreaterThan(0)
    const milestones = await calculateOuterPlanetMilestones(natal)
    for (const s of withLifecycle) {
      const parent = byId.get(parentIds(s)[1])!
      const kind = parent.id.replace('astro.lifecycle.', '')
      const ms = milestones.find((x) => x.kind === kind)!
      expect(parent.active.start).toBe(ms.window.start)
      expect(parent.active.end).toBe(ms.window.end)
      expect(ms.window.start.slice(0, 10) <= m.exactDateISO).toBe(true)
      expect(ms.window.end.slice(0, 10) >= m.exactDateISO).toBe(true)
    }
    // two days past the pass window the lifecycle parent — and with it the row — is gone
    const later = await dayCell(natal, shiftDay(m.window.end, 2))
    expect(later.signals.some((s) => s.id === 'astro.lifecycle.jupiter_return_2')).toBe(false)
    expect(buildDecadeCross(later).some((r) => r.astro === '목성' && r.saju === '정인')).toBe(false)
  }, 180_000)
})
