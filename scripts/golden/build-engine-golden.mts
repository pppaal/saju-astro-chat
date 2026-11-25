/**
 * Engine golden reference generator (dev only — never run in CI).
 *
 * Writes tests/golden/engine-golden.json. Every value in that file comes from an
 * independent reference, never from engine output. This script imports no
 * engine code (src/lib/**). It reads only the KASI solar-term table text from
 * src/lib/saju/constants.ts, to cross-check astronomy-engine against KASI.
 *
 * References
 *   1. 節 instants: astronomy-engine SearchSunLongitude at λ☉ = 315° + 30°k
 *      (apparent, true ecliptic of date). Cross-checked against the KASI table
 *      to ≤ 90 s for every term used here.
 *   2. Day pillar: JDN of the civil date in the birth zone, anchored at
 *      2000-01-01 = 戊午 (index 54).
 *   3. Hour pillar: mean solar time = UT + lon × 4 min; 五鼠遁 from the civil-day
 *      stem (CONVENTIONS §1).
 *   4. 대운: floor(days / 3), minimum 1 (CONVENTIONS §13, calculationStandards
 *      daeunRounding = floor), measured from the raw UT instant. Current 대운 =
 *      the last one whose start age ≤ 만 나이 on the civil birthday in the birth
 *      zone (§14); null before the first one (OD-12).
 *   5. Planets, node, angles, cusps: astronomy-engine (EQJ → true ecliptic of
 *      date), osculating lunar node, ASC/MC from GAST + true obliquity, and an
 *      independent Placidus solver. Whole Sign above the polar circle.
 *   6. Profection, solar arc, returns, planetary hours, void-of-course, sect and
 *      zodiacal releasing: their classical definitions (cited inline).
 *   7. Derived saju (relations, shinsal, 化氣): cited classical tables, encoded
 *      here, never copied from src/lib/saju.
 *
 * Owner decisions (docs: engine audit plan). Where a value depends on an open
 * owner decision, the fixture stores `proposed` (what the tests read) and, when
 * a written current doctrine exists, `current`:
 *   OD-1  year/month/대운 from the absolute 절입 instant (proposed) vs the
 *         longitude-shifted instant (current, SOLAR_TIME_CONVENTION.md).
 *   OD-2  missing longitude → zone reference longitude (Asia/Seoul 126.978)
 *         (proposed) vs the Seoul 'LMT +30' hour table (current, CONVENTIONS §1).
 *   OD-3  gap → offset in force before the gap, overlap → earlier instant
 *         (RFC 5545 §3.3.5). No written current doctrine, so no `current`.
 *   OD-12 no current 대운 before the first one starts (proposed).
 *
 * Usage:  npm run golden:build        (writes the JSON; review the diff)
 */
import * as AstronomyNs from 'astronomy-engine'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prettier from 'prettier'

// tsx loads the CommonJS build for this package, so the namespace arrives under `default`.
const Astronomy = ((AstronomyNs as unknown as { default?: typeof AstronomyNs }).default ??
  AstronomyNs) as typeof AstronomyNs

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = resolve(ROOT, 'tests/golden/engine-golden.json')

const STEMS = '甲乙丙丁戊己庚辛壬癸'.split('')
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('')
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
] as const
const DAY_MS = 86_400_000
const SEOUL = { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' }

const n360 = (x: number) => ((x % 360) + 360) % 360
const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
const signedDiff = (a: number, b: number) => ((a - b + 540) % 360) - 180
const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d
const signOf = (lon: number) => SIGNS[Math.floor(n360(lon) / 30)]
const iso = (ms: number) => new Date(ms).toISOString()
const at = (ms: number) => Astronomy.MakeTime(new Date(ms))

// ─────────────────────────────────────────────────────────────────────────────
// Time zones (Intl / ICU tzdata only)
// ─────────────────────────────────────────────────────────────────────────────
const dtfCache = new Map<string, Intl.DateTimeFormat>()
function wallParts(ms: number, tz: string) {
  let f = dtfCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    dtfCache.set(tz, f)
  }
  const p: Record<string, number> = {}
  for (const x of f.formatToParts(new Date(ms)))
    if (x.type !== 'literal') p[x.type] = Number(x.value)
  return { y: p.year, mo: p.month, d: p.day, h: p.hour % 24, mi: p.minute, s: p.second }
}
function tzOffsetMin(ms: number, tz: string): number {
  const p = wallParts(ms, tz)
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s)
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000)
}
/** Wall clock → UT ms. RFC 5545 §3.3.5: overlap → earlier instant; gap → offset in force before the gap. */
function resolveWall(date: string, time: string, tz: string) {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  const offs = new Set([
    tzOffsetMin(wall - DAY_MS, tz),
    tzOffsetMin(wall, tz),
    tzOffsetMin(wall + DAY_MS, tz),
  ])
  const valid: number[] = []
  for (const o of offs) {
    const ut = wall - o * 60000
    if (tzOffsetMin(ut, tz) === o) valid.push(ut)
  }
  if (valid.length) {
    return {
      ms: Math.min(...valid),
      kind: valid.length > 1 ? ('overlap' as const) : ('normal' as const),
    }
  }
  return { ms: wall - tzOffsetMin(wall - DAY_MS, tz) * 60000, kind: 'gap' as const }
}

// ─────────────────────────────────────────────────────────────────────────────
// Solar terms (astronomy-engine) + KASI cross-check
// ─────────────────────────────────────────────────────────────────────────────
const sunLon = (ms: number) => Astronomy.SunPosition(new Date(ms)).elon
function searchSun(lon: number, startMs: number, limitDays: number): number {
  const t = Astronomy.SearchSunLongitude(lon, new Date(startMs), limitDays)
  if (!t) throw new Error(`SearchSunLongitude(${lon}) failed from ${iso(startMs)}`)
  return t.date.getTime()
}

/** KASI table text → { 'YYYY-M': utcMs }, parsed from the source (no engine import). */
const KASI = (() => {
  const src = readFileSync(resolve(ROOT, 'src/lib/saju/constants.ts'), 'utf8')
  const start = src.indexOf('export const KASI_SOLAR_TERMS')
  const body = src.slice(start, src.indexOf('\n}\n', start))
  const out = new Map<string, number>()
  for (const m of body.matchAll(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/g)) {
    const [Y, M, D, h, mi] = m.slice(1).map(Number)
    out.set(`${Y}-${M}`, Date.UTC(Y, M - 1, D, h - 9, mi)) // KST → UT
  }
  return out
})()
let kasiChecked = 0
let kasiMaxSec = 0
/** Cross-check one 節 instant against KASI (≤ 90 s). Terms outside the table are skipped. */
function kasiCheck(ms: number, lon: number) {
  const kst = new Date(ms + 9 * 3600_000)
  const m = kst.getUTCMonth() + 1
  if (n360(285 + 30 * (m - 1)) !== n360(lon))
    throw new Error(`term λ ${lon} not the first 節 of KST month ${m}`)
  const k = KASI.get(`${kst.getUTCFullYear()}-${m}`)
  if (k === undefined) return
  const sec = Math.abs(k - ms) / 1000
  kasiChecked++
  kasiMaxSec = Math.max(kasiMaxSec, sec)
  if (sec > 90) throw new Error(`KASI mismatch ${iso(ms)} vs ${iso(k)} (${sec}s)`)
}
function lichun(year: number) {
  const ms = searchSun(315, Date.UTC(year, 0, 25), 20)
  kasiCheck(ms, 315)
  return ms
}
/** 節 bracketing X: prev ≤ X < next. */
function jieBracket(X: number) {
  const k = Math.floor(n360(sunLon(X) - 315) / 30)
  const prevLon = n360(315 + 30 * k)
  const nextLon = n360(prevLon + 30)
  const prev = searchSun(prevLon, X - 40 * DAY_MS, 45)
  const next = searchSun(nextLon, X, 40)
  if (!(prev <= X && X < next)) throw new Error(`jie bracket failed at ${iso(X)}`)
  kasiCheck(prev, prevLon)
  kasiCheck(next, nextLon)
  return { k, prev, next }
}

// ─────────────────────────────────────────────────────────────────────────────
// Saju reference
// ─────────────────────────────────────────────────────────────────────────────
type Gender = 'male' | 'female'
const pillar = (s: number, b: number) =>
  STEMS[((s % 10) + 10) % 10] + BRANCHES[((b % 12) + 12) % 12]

/** Year + month pillar at absolute instant X. */
function yearMonth(X: number) {
  const yU = new Date(X).getUTCFullYear()
  const Y = X >= lichun(yU) ? yU : yU - 1
  const ys = (((Y - 4) % 10) + 10) % 10
  const { k, prev, next } = jieBracket(X)
  const ms = ((ys % 5) * 2 + 2 + k) % 10 // 五虎遁
  const mb = (2 + k) % 12
  return { ys, year: pillar(ys, Y - 4), month: pillar(ms, mb), msIdx: ms, mb, prev, next }
}
/** JDN day pillar; anchor 2000-01-01 = 戊午 (sexagenary index 54). */
function dayPillar(y: number, mo: number, d: number) {
  const jdn = Math.floor(Date.UTC(y, mo - 1, d) / DAY_MS) + 2440588
  const anchor = Math.floor(Date.UTC(2000, 0, 1) / DAY_MS) + 2440588
  const idx = (((jdn - anchor + 54) % 60) + 60) % 60
  return { idx, stem: idx % 10, name: pillar(idx % 10, idx % 12) }
}
/** Branch index from minutes in a frame where 子 = 23:00–01:00. */
const branchFromMin = (min: number) => Math.floor(((((min + 60) % 1440) + 1440) % 1440) / 120)
const minutesToHourBoundary = (min: number) => {
  const t = ((((min + 60) % 1440) + 1440) % 1440) % 120
  return Math.min(t, 120 - t)
}
const hourPillar = (dayStem: number, hb: number) => pillar((dayStem % 5) * 2 + hb, hb)

function daeun(X: number, ym: ReturnType<typeof yearMonth>, gender: Gender) {
  const yang = ym.ys % 2 === 0
  const forward = (yang && gender === 'male') || (!yang && gender === 'female')
  const days = forward ? (ym.next - X) / DAY_MS : (X - ym.prev) / DAY_MS
  const startAge = Math.max(1, Math.floor(days / 3))
  const nth = (i: number) => pillar(ym.msIdx + (forward ? i : -i), ym.mb + (forward ? i : -i))
  return { forward, days: round(days, 4), startAge, first3: [nth(1), nth(2), nth(3)], nth }
}
/** 만 나이 on the civil birthday in the birth zone (CONVENTIONS §14). */
function manAge(date: string, tz: string, nowMs: number) {
  const [y, mo, d] = date.split('-').map(Number)
  const n = wallParts(nowMs, tz)
  return n.y - y - (n.mo < mo || (n.mo === mo && n.d < d) ? 1 : 0)
}

interface SajuCaseInput {
  id: string
  label: string
  date: string
  time: string
  tz: string
  lon: number
  gender: Gender
  now?: string
  dayOnly?: boolean
  note?: string
}
const SAJU_NOW = '2026-11-24T03:00:00Z'

function sajuProposed(c: SajuCaseInput, lon: number, X: number) {
  const [y, mo, d] = c.date.split('-').map(Number)
  const ym = yearMonth(X)
  const day = dayPillar(y, mo, d)
  const lmtMin = X / 60000 + lon * 4
  const hb = branchFromMin(lmtMin)
  const dw = daeun(X, ym, c.gender)
  const age = manAge(c.date, c.tz, Date.parse(c.now ?? SAJU_NOW))
  let current: { pillar: string; age: number } | null = null
  if (age >= dw.startAge) {
    const i = Math.floor((age - dw.startAge) / 10)
    current = { pillar: dw.nth(i + 1), age: dw.startAge + 10 * i }
  }
  return {
    pillars: [ym.year, ym.month, day.name, hourPillar(day.stem, hb)],
    hourBoundaryDistanceMin: round(minutesToHourBoundary(lmtMin), 2),
    daeun: {
      forward: dw.forward,
      startAge: dw.startAge,
      days: dw.days,
      first3: dw.first3,
      current,
      manAge: age,
    },
  }
}

/** OD-1 current doctrine: year/month/대운 from the longitude-shifted instant. */
function sajuCurrentShifted(c: SajuCaseInput, X: number) {
  const corr = Math.round(c.lon * 4 - tzOffsetMin(X, c.tz))
  const eff = X + corr * 60000
  const ym = yearMonth(eff)
  const dw = daeun(eff, ym, c.gender)
  return {
    year: ym.year,
    month: ym.month,
    daeun: { forward: dw.forward, startAge: dw.startAge, days: dw.days, first3: dw.first3 },
    correctionMin: corr,
  }
}

/** OD-2 current doctrine (Seoul only): CONVENTIONS §1 'LMT +30' hour table. */
function seoulLmt30Hour(c: SajuCaseInput, X: number) {
  const [y, mo, d] = c.date.split('-').map(Number)
  const [h, mi] = c.time.split(':').map(Number)
  const off = tzOffsetMin(X, 'Asia/Seoul')
  // Base (non-DST) offset from the tzdata Asia/Seoul zone lines: KMT +8:30 eras.
  const kmt =
    (X >= Date.UTC(1908, 2, 31, 15, 30) && X < Date.UTC(1911, 11, 31, 15, 30)) ||
    (X >= Date.UTC(1954, 2, 20, 15, 0) && X < Date.UTC(1961, 7, 9, 15, 30))
  const base = kmt ? 510 : 540
  const dst = off - base
  // KST standard time: 子 = 23:30–01:30. KMT era or DST: clock-hour boundaries after removing DST.
  const solarMin = h * 60 + mi - dst - (!kmt && dst === 0 ? 30 : 0)
  return hourPillar(dayPillar(y, mo, d).stem, branchFromMin(solarMin))
}

const SAJU_CASES: SajuCaseInput[] = [
  {
    id: 'G01',
    label: 'product sample',
    date: '1997-03-21',
    time: '14:30',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'female',
  },
  {
    id: 'G02',
    label: 'Seoul 1990',
    date: '1990-05-15',
    time: '10:30',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G03',
    label: '입춘 2024, 13 min after (lon)',
    date: '2024-02-04',
    time: '17:40',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'female',
  },
  {
    id: 'G04',
    label: '입춘 2024, 7 min before',
    date: '2024-02-04',
    time: '17:20',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'female',
  },
  {
    id: 'G05',
    label: 'Tokyo, before 입춘',
    date: '2020-02-04',
    time: '17:50',
    tz: 'Asia/Tokyo',
    lon: 139.69,
    gender: 'male',
  },
  {
    id: 'G06',
    label: 'Kashgar (Shanghai zone), after 입춘',
    date: '2020-02-04',
    time: '19:00',
    tz: 'Asia/Shanghai',
    lon: 75.99,
    gender: 'male',
  },
  {
    id: 'G07',
    label: 'Madrid 대운 count',
    date: '1963-11-02',
    time: '02:17',
    tz: 'Europe/Madrid',
    lon: -3.7,
    gender: 'male',
  },
  {
    id: 'G08',
    label: 'civil day 00:01 (CONVENTIONS §1 golden)',
    date: '1991-01-01',
    time: '00:01',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G09',
    label: 'civil day 23:59 (CONVENTIONS §1 golden)',
    date: '1990-12-31',
    time: '23:59',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G10',
    label: 'KDT 1987',
    date: '1987-07-01',
    time: '12:15',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G11',
    label: 'KMT 1957',
    date: '1957-11-15',
    time: '23:15',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G12',
    label: 'pre-KMT 1954',
    date: '1954-03-01',
    time: '07:35',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G13',
    label: 'New York EDT',
    date: '2000-06-15',
    time: '23:15',
    tz: 'America/New_York',
    lon: -74.006,
    gender: 'male',
  },
  {
    id: 'G14',
    label: 'Los Angeles',
    date: '1990-06-15',
    time: '14:30',
    tz: 'America/Los_Angeles',
    lon: -118.2437,
    gender: 'male',
  },
  {
    id: 'G15',
    label: 'Urumqi (Shanghai zone)',
    date: '1975-03-21',
    time: '02:00',
    tz: 'Asia/Shanghai',
    lon: 87.6,
    gender: 'male',
  },
  {
    id: 'G16',
    label: 'Sydney',
    date: '1980-12-21',
    time: '12:00',
    tz: 'Australia/Sydney',
    lon: 151.2093,
    gender: 'female',
  },
  {
    id: 'G17',
    label: 'Tromsø (polar)',
    date: '1993-06-21',
    time: '03:00',
    tz: 'Europe/Oslo',
    lon: 18.9553,
    gender: 'male',
  },
  {
    id: 'G18',
    label: 'Tokyo 00:15',
    date: '2010-01-01',
    time: '00:15',
    tz: 'Asia/Tokyo',
    lon: 139.6503,
    gender: 'male',
  },
  {
    id: 'G19',
    label: 'Busan',
    date: '2001-07-22',
    time: '04:10',
    tz: 'Asia/Seoul',
    lon: 129.0756,
    gender: 'male',
  },
  {
    id: 'G20',
    label: '節 month 1988',
    date: '1988-07-07',
    time: '06:50',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G21',
    label: 'current 대운 on the civil birthday',
    date: '1990-05-17',
    time: '00:10',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
    now: '2026-05-16T03:00:00Z',
  },
  {
    id: 'G22',
    label: 'child before the first 대운',
    date: '2022-06-15',
    time: '10:00',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G23',
    label: 'New-year birthday 만 나이',
    date: '1962-01-01',
    time: '00:10',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
    now: '1979-12-31T03:00:00Z',
  },
  {
    id: 'G24',
    label: 'KDT gap 1987 (wall time does not exist)',
    date: '1987-05-10',
    time: '02:30',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G25',
    label: 'New York overlap (fall back)',
    date: '2021-11-07',
    time: '01:30',
    tz: 'America/New_York',
    lon: -74.006,
    gender: 'male',
  },
  {
    id: 'G26',
    label: 'KMT→KST midnight gap 1961',
    date: '1961-08-10',
    time: '00:15',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G26b',
    label: 'São Paulo midnight DST gap',
    date: '2018-11-04',
    time: '00:30',
    tz: 'America/Sao_Paulo',
    lon: -46.6333,
    gender: 'male',
    dayOnly: true,
  },
  {
    id: 'G26c',
    label: 'Tehran midnight DST gap',
    date: '2008-03-21',
    time: '00:30',
    tz: 'Asia/Tehran',
    lon: 51.389,
    gender: 'male',
    dayOnly: true,
  },
  {
    id: 'G27',
    label: '대운 9 not 10 (29.9986 days)',
    date: '1990-03-06',
    time: '10:15',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G28',
    label: 'KDT 1949 no-lon hour',
    date: '1949-07-14',
    time: '08:12',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'female',
  },
  {
    id: 'G29',
    label: '1954-01 no-lon hour',
    date: '1954-01-15',
    time: '09:45',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
  {
    id: 'G30',
    label: '1961-10 no-lon hour',
    date: '1961-10-01',
    time: '13:40',
    tz: 'Asia/Seoul',
    lon: 126.978,
    gender: 'male',
  },
]

function buildSaju() {
  return SAJU_CASES.map((c) => {
    const r = resolveWall(c.date, c.time, c.tz)
    const X = r.ms
    const proposed = sajuProposed(c, c.lon, X)
    const out: Record<string, unknown> = {
      id: c.id,
      label: c.label,
      input: {
        date: c.date,
        time: c.time,
        tz: c.tz,
        lon: c.lon,
        gender: c.gender,
        now: c.now ?? SAJU_NOW,
      },
      instant: { utc: iso(X), kind: r.kind },
      ...(c.dayOnly ? { dayOnly: true } : {}),
      proposed,
    }
    if (c.tz === 'Asia/Seoul' && !c.dayOnly) {
      // OD-2 proposed: no longitude → zone reference longitude (Asia/Seoul 126.978).
      const noLon = sajuProposed(c, SEOUL.lon, X)
      const cur = seoulLmt30Hour(c, X)
      out.noLon = {
        proposed: noLon,
        ...(cur !== noLon.pillars[3] ? { current: { hour: cur, decision: 'OD-2' } } : {}),
      }
    }
    if (!c.dayOnly) {
      const cur = sajuCurrentShifted(c, X)
      const p = proposed
      const differs =
        cur.year !== p.pillars[0] ||
        cur.month !== p.pillars[1] ||
        cur.daeun.startAge !== p.daeun.startAge ||
        cur.daeun.forward !== p.daeun.forward ||
        cur.daeun.first3.join() !== p.daeun.first3.join()
      if (differs) out.current = { ...cur, decision: 'OD-1' }
    }
    return out
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Astrology reference
// ─────────────────────────────────────────────────────────────────────────────
const D2R = Math.PI / 180
const R2D = 180 / Math.PI
const BODIES = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const

function planetLon(name: string, ms: number): number {
  const date = new Date(ms)
  if (name === 'Sun') return Astronomy.SunPosition(date).elon
  if (name === 'Moon') return Astronomy.EclipticGeoMoon(date).lon
  const v = Astronomy.GeoVector(name as AstronomyNs.Body, date, true)
  return Astronomy.Ecliptic(v).elon
}
/** Osculating (true) lunar node, true ecliptic of date. */
function trueNode(ms: number): number {
  const date = new Date(ms)
  const st = Astronomy.GeoMoonState(date)
  const rot = Astronomy.Rotation_EQJ_ECT(date)
  const r = Astronomy.RotateVector(rot, new Astronomy.Vector(st.x, st.y, st.z, st.t))
  const v = Astronomy.RotateVector(rot, new Astronomy.Vector(st.vx, st.vy, st.vz, st.t))
  const hx = r.y * v.z - r.z * v.y
  const hy = r.z * v.x - r.x * v.z
  return n360(Math.atan2(hx, -hy) * R2D)
}
function angles(ms: number, lat: number, lon: number) {
  const gast = Astronomy.SiderealTime(new Date(ms))
  const ramc = n360(gast * 15 + lon)
  const eps = Astronomy.e_tilt(at(ms)).tobl
  const e = eps * D2R
  const r = ramc * D2R
  const mc = n360(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) * R2D)
  const asc = n360(
    Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(lat * D2R) * Math.sin(e))) * R2D
  )
  return { ramc, eps, mc, asc }
}
/** Placidus by fixed-point iteration on the semi-arc trisection. */
function placidus(ms: number, lat: number, lon: number): number[] {
  const { ramc, eps, mc, asc } = angles(ms, lat, lon)
  const phi = lat * D2R
  const raToLon = (ra: number) =>
    n360(Math.atan2(Math.sin(ra * D2R), Math.cos(ra * D2R) * Math.cos(eps * D2R)) * R2D)
  const decOfLon = (l: number) => Math.asin(Math.sin(eps * D2R) * Math.sin(l * D2R))
  const cusp = (above: boolean, f: number) => {
    let ra = above ? ramc + 90 * f : ramc + 180 - 90 * f
    for (let i = 0; i < 60; i++) {
      const x = Math.tan(phi) * Math.tan(decOfLon(raToLon(ra)))
      const ad = Math.asin(Math.max(-1, Math.min(1, x))) * R2D
      const dsa = 90 + ad
      ra = above ? ramc + f * dsa : ramc + 180 - f * (180 - dsa)
    }
    return raToLon(ra)
  }
  const c11 = cusp(true, 1 / 3)
  const c12 = cusp(true, 2 / 3)
  const c2 = cusp(false, 2 / 3)
  const c3 = cusp(false, 1 / 3)
  return [
    asc,
    c2,
    c3,
    n360(mc + 180),
    n360(c11 + 180),
    n360(c12 + 180),
    n360(asc + 180),
    n360(c2 + 180),
    n360(c3 + 180),
    mc,
    c11,
    c12,
  ]
}
function houseOf(l: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    if (n360(l - cusps[i]) < n360(cusps[(i + 1) % 12] - cusps[i])) return i + 1
  }
  throw new Error('houseOf failed')
}
const isRetro = (name: string, ms: number) =>
  name !== 'Sun' &&
  name !== 'Moon' &&
  signedDiff(planetLon(name, ms + 3600_000), planetLon(name, ms - 3600_000)) < 0

/** Polar circle: Placidus is undefined where part of the ecliptic never rises. */
const POLAR_LAT = 66.56

interface AstroChartInput {
  id: string
  date: string
  time: string
  tz: string
  lat: number
  lon: number
}
const ASTRO_CHARTS: AstroChartInput[] = [
  { id: 'R01', date: '1990-05-15', time: '10:30', tz: 'Asia/Seoul', lat: 37.5665, lon: 126.978 },
  { id: 'R07', date: '1987-07-01', time: '12:15', tz: 'Asia/Seoul', lat: 37.5665, lon: 126.978 },
  {
    id: 'R11',
    date: '1990-06-15',
    time: '14:30',
    tz: 'America/Los_Angeles',
    lat: 34.0522,
    lon: -118.2437,
  },
  {
    id: 'R13',
    date: '1980-12-21',
    time: '12:00',
    tz: 'Australia/Sydney',
    lat: -33.8688,
    lon: 151.2093,
  },
  { id: 'R14', date: '1993-06-21', time: '03:00', tz: 'Europe/Oslo', lat: 69.6492, lon: 18.9553 },
  { id: 'R16', date: '1997-03-21', time: '14:30', tz: 'Asia/Seoul', lat: 37.5665, lon: 126.978 },
  { id: 'R18', date: '2023-05-01', time: '12:00', tz: 'Asia/Seoul', lat: 37.5665, lon: 126.978 },
]

function buildAstro() {
  return ASTRO_CHARTS.map((c) => {
    const { ms } = resolveWall(c.date, c.time, c.tz)
    const ang = angles(ms, c.lat, c.lon)
    const polar = Math.abs(c.lat) >= POLAR_LAT
    const ascSign = Math.floor(ang.asc / 30)
    const cusps = polar
      ? Array.from({ length: 12 }, (_, i) => n360((ascSign + i) * 30))
      : placidus(ms, c.lat, c.lon)
    const house = (l: number) =>
      polar ? ((Math.floor(n360(l) / 30) - ascSign + 12) % 12) + 1 : houseOf(l, cusps)
    const planets: Record<string, unknown> = {}
    for (const b of BODIES) {
      const l = planetLon(b, ms)
      planets[b] = {
        lon: round(l, 4),
        sign: signOf(l),
        house: house(l),
        retrograde: isRetro(b, ms),
      }
    }
    const node = trueNode(ms)
    return {
      id: c.id,
      input: { date: c.date, time: c.time, tz: c.tz, lat: c.lat, lon: c.lon },
      utc: iso(ms),
      houseSystem: polar ? 'WholeSign' : 'Placidus',
      planets,
      trueNode: { lon: round(node, 4), sign: signOf(node) },
      ascendant: { lon: round(ang.asc, 4), sign: signOf(ang.asc) },
      mc: { lon: round(ang.mc, 4), sign: signOf(ang.mc) },
      cusps: cusps.map((x) => round(x, 4)),
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Timing references
// ─────────────────────────────────────────────────────────────────────────────
/** Traditional (domicile) rulers. */
const RULER: Record<string, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
}

function profection() {
  // Annual profection: one whole sign per year from the ASC sign (Valens, Anthology IV.11;
  // Brennan, Hellenistic Astrology ch. 11).
  const ms = Date.UTC(1990, 9, 9, 14, 18)
  const asc = angles(ms, SEOUL.lat, SEOUL.lon).asc
  const a0 = Math.floor(asc / 30)
  const ages = Array.from({ length: 12 }, (_, age) => {
    const sign = SIGNS[(a0 + age) % 12]
    return { age, sign, lord: RULER[sign] }
  })
  return {
    source: 'Valens, Anthology IV.11; Brennan 2017 ch. 11 (whole-sign annual profection)',
    input: { utc: iso(ms), lat: SEOUL.lat, lon: SEOUL.lon, timeZone: 'UTC' },
    ascendant: { lon: round(asc, 4), sign: signOf(asc) },
    ages,
  }
}

const ASPECTS = [
  { name: 'conjunction', angle: 0 },
  { name: 'sextile', angle: 60 },
  { name: 'square', angle: 90 },
  { name: 'trine', angle: 120 },
  { name: 'opposition', angle: 180 },
] as const

function solarArc() {
  // Solar arc = progressed Sun (secondary, 1 day = 1 year) − natal Sun.
  const input = {
    date: '1960-07-04',
    time: '12:00',
    tz: 'Asia/Seoul',
    lat: SEOUL.lat,
    lon: SEOUL.lon,
  }
  const { ms } = resolveWall(input.date, input.time, input.tz)
  const sun0 = planetLon('Sun', ms)
  const arcs = [20, 40, 60].map((age) => ({
    age,
    arc: round(n360(planetLon('Sun', ms + age * DAY_MS) - sun0), 4),
  }))
  const natal: Record<string, number> = {}
  for (const b of BODIES) natal[b] = planetLon(b, ms)
  natal['True Node'] = trueNode(ms)
  const arc60 = n360(planetLon('Sun', ms + 60 * DAY_MS) - sun0)
  const orb = 0.5
  const hits: string[] = []
  for (const [a, la] of Object.entries(natal)) {
    for (const [n, ln] of Object.entries(natal)) {
      if (a === n) continue // a directed body over its own natal place only restates the arc
      const ang = angDiff(la + arc60, ln)
      const asp = ASPECTS.find((x) => Math.abs(ang - x.angle) <= orb)
      if (asp) hits.push(`${a} ${asp.name} ${n}`)
    }
  }
  return {
    source:
      'Solar arc = Sun(birth + age days) − natal Sun (secondary progression), majors at orb 0.5°',
    input: { ...input, utc: iso(ms) },
    toleranceDeg: 0.01,
    arcs,
    age60: { orb, hits: hits.sort() },
  }
}

function saturnReturns() {
  const lonAt = (ms: number) => planetLon('Saturn', ms)
  const births = ['1980-01-25', '1957-03-20', '1995-09-13', '1953-07-17']
  return {
    source: 'First exact transit of Saturn over natal Saturn (daily scan + bisection)',
    toleranceDays: 2,
    cases: births.map((date) => {
      const { ms } = resolveWall(date, '12:00', SEOUL.tz)
      const natal = lonAt(ms)
      const from = ms + 25 * 365.25 * DAY_MS
      const to = ms + 33 * 365.25 * DAY_MS
      let prev = signedDiff(lonAt(from), natal)
      let first: number | null = null
      for (let t = from + DAY_MS; t <= to && first === null; t += DAY_MS) {
        const cur = signedDiff(lonAt(t), natal)
        if (Math.sign(prev) !== Math.sign(cur) && Math.abs(cur - prev) < 10) {
          let lo = t - DAY_MS
          let hi = t
          for (let i = 0; i < 40; i++) {
            const mid = (lo + hi) / 2
            if (Math.sign(signedDiff(lonAt(mid), natal)) === Math.sign(prev)) lo = mid
            else hi = mid
          }
          first = (lo + hi) / 2
        }
        prev = cur
      }
      if (first === null) throw new Error(`no Saturn return for ${date}`)
      return {
        birth: { date, time: '12:00', tz: SEOUL.tz, lat: SEOUL.lat, lon: SEOUL.lon, utc: iso(ms) },
        natalSaturn: round(natal, 4),
        firstExactPass: iso(first),
        age: manAge(date, SEOUL.tz, first),
      }
    }),
  }
}

function transitInstant() {
  const instant = '2026-11-24T05:00:00.000Z'
  const ms = Date.parse(instant)
  const moon = planetLon('Moon', ms)
  const asc = angles(ms, SEOUL.lat, SEOUL.lon).asc
  return {
    source:
      'astronomy-engine at the absolute instant; a trailing Z must win over the zone argument',
    instant,
    moon: { lon: round(moon, 4), sign: signOf(moon) },
    seoulAscendant: { lon: round(asc, 4), sign: signOf(asc) },
  }
}

const CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']
const DAY_RULER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] // by weekday, Sunday = 0

function planetaryHours() {
  const obs = new Astronomy.Observer(SEOUL.lat, SEOUL.lon, 0)
  const rise = (fromMs: number) =>
    Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, new Date(fromMs), 2)!.date.getTime()
  const set = (fromMs: number) =>
    Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, new Date(fromMs), 2)!.date.getTime()
  const rulerAt = (ms: number) => {
    let r = rise(ms - 30 * 3600_000)
    let nr = rise(r + 3600_000)
    while (nr <= ms) {
      r = nr
      nr = rise(r + 3600_000)
    }
    const s = set(r)
    const weekday = new Date(r + 9 * 3600_000).getUTCDay() // planetary day = weekday of its sunrise (KST)
    const idx =
      ms < s ? Math.floor((ms - r) / ((s - r) / 12)) : 12 + Math.floor((ms - s) / ((nr - s) / 12))
    return CHALDEAN[(CHALDEAN.indexOf(DAY_RULER[weekday]) + idx) % 7]
  }
  const day = '2026-11-23'
  const base = Date.UTC(2026, 10, 23) - 9 * 3600_000 // 00:00 KST
  const hours = Array.from({ length: 24 }, (_, h) => {
    const r0 = rulerAt(base + h * 3600_000 + 1000)
    const r30 = rulerAt(base + h * 3600_000 + 30 * 60_000)
    const r59 = rulerAt(base + (h + 1) * 3600_000 - 1000)
    return { localHour: h, rulerAtHalfPast: r30, wholeClockHour: r0 === r30 && r30 === r59 }
  })
  const sunrise = rise(base)
  return {
    source:
      'Planetary day starts at sunrise; 12 unequal day and night hours; Chaldean order (astronomy-engine rise/set)',
    location: { ...SEOUL },
    date: day,
    sunriseUtc: iso(sunrise),
    sunsetUtc: iso(set(sunrise)),
    hours,
    pinned: [3, 5, 10].map((h) => ({
      localTime: `${String(h).padStart(2, '0')}:30`,
      ruler: hours[h].rulerAtHalfPast,
    })),
  }
}

function voidOfCourseEnd() {
  // VoC ends when the Moon enters the next sign. The day chart instant is local noon.
  const fromMs = Date.UTC(2026, 10, 5, 3, 0)
  const moonSign = (ms: number) => Math.floor(planetLon('Moon', ms) / 30)
  const s0 = moonSign(fromMs)
  let t = fromMs
  while (moonSign(t) === s0) t += 600_000
  let lo = t - 600_000
  let hi = t
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2
    if (moonSign(m) === s0) lo = m
    else hi = m
  }
  return {
    source: 'Moon sign ingress after the local-noon chart instant (astronomy-engine)',
    location: { ...SEOUL },
    date: '2026-11-05',
    chartInstant: iso(fromMs),
    ingressUtc: iso(hi),
    enteredSign: SIGNS[(s0 + 1) % 12],
    toleranceMin: 5,
  }
}

function sect() {
  // Sect: day chart iff the Sun is above the horizon (Hellenistic definition).
  const ms = Date.UTC(1920, 2, 24, 1, 38)
  const lat = 67.12
  const lon = -91.36
  const obs = new Astronomy.Observer(lat, lon, 0)
  const eq = Astronomy.Equator(Astronomy.Body.Sun, at(ms), obs, true, true)
  const alt = Astronomy.Horizon(at(ms), obs, eq.ra, eq.dec).altitude
  return {
    source: 'Sect = Sun above the horizon (geometric altitude, astronomy-engine)',
    input: { utc: iso(ms), lat, lon, timeZone: 'UTC' },
    sunAltitude: round(alt, 2),
    sect: alt > 0 ? 'day' : 'night',
  }
}

function zodiacalReleasing() {
  // Valens, Anthology IV (minor years); each level is 1/12 of the one above:
  // L1 years, L2 months (1/12 year), L3 = 2.5 days, L4 = 5 hours (Brennan 2017 ch. 17).
  const minorYears: Record<string, number> = {
    Aries: 15,
    Taurus: 8,
    Gemini: 20,
    Cancer: 25,
    Leo: 19,
    Virgo: 20,
    Libra: 8,
    Scorpio: 15,
    Sagittarius: 12,
    Capricorn: 27,
    Aquarius: 30,
    Pisces: 12,
  }
  const total = Object.values(minorYears).reduce((a, b) => a + b, 0)
  const l3UnitDays = 30 / 12
  return {
    source: 'Valens, Anthology IV; Brennan, Hellenistic Astrology (2017) ch. 17',
    minorYears,
    l3UnitDays,
    marsL3Days: minorYears.Aries * l3UnitDays,
    // An L3 loosing of the bond needs the L3 run to pass all 12 signs inside one L2.
    l3LoosingMinL2Months: round((total * l3UnitDays) / (365.25 / 12), 2),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived saju — cited classical tables
// ─────────────────────────────────────────────────────────────────────────────
const BRANCH_EL: Record<string, string> = {
  子: '수',
  丑: '토',
  寅: '목',
  卯: '목',
  辰: '토',
  巳: '화',
  午: '화',
  未: '토',
  申: '금',
  酉: '금',
  戌: '토',
  亥: '수',
}
const STEM_EL: Record<string, string> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
}
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const genBy = (el: string) => Object.keys(GEN).find((k) => GEN[k] === el)!
/** 三合 局 (三命通會 論三合). */
const SAMHAP: Record<string, string> = { 申子辰: '수', 亥卯未: '목', 寅午戌: '화', 巳酉丑: '금' }
/** 方合 (方局): 寅卯辰 東方木, 巳午未 南方火, 申酉戌 西方金, 亥子丑 北方水. */
const BANGHAP: Record<string, string> = { 寅卯辰: '목', 巳午未: '화', 申酉戌: '금', 亥子丑: '수' }
/** 自刑 (三命通會): 辰午酉亥 only. */
const SELF_PUNISH = new Set(['辰', '午', '酉', '亥'])
/** 天干沖 4쌍 (relationTables canon '4쌍(기본)'): 甲庚 乙辛 丙壬 丁癸; 戊己 無沖. */
const STEM_CLASH = [
  ['甲', '庚'],
  ['乙', '辛'],
  ['丙', '壬'],
  ['丁', '癸'],
]
/** 太極貴人 (三命通會): 甲乙生人子午中，丙丁雞兔定亨通，戊己兩干臨四季，庚辛寅亥祿豐隆，壬癸巳申偏喜美. */
const TAEGEUK: Record<string, string[]> = {
  甲: ['子', '午'],
  乙: ['子', '午'],
  丙: ['卯', '酉'],
  丁: ['卯', '酉'],
  戊: ['辰', '戌', '丑', '未'],
  己: ['辰', '戌', '丑', '未'],
  庚: ['寅', '亥'],
  辛: ['寅', '亥'],
  壬: ['巳', '申'],
  癸: ['巳', '申'],
}
/** 鬼門關 6 pairs: 子酉 丑午 寅未 卯申 辰亥 巳戌. */
const GWIMUN = ['子酉', '丑午', '寅未', '卯申', '辰亥', '巳戌']
/** 桃花(咸池) = 年殺 position of the 三合 group: 寅午戌→卯, 申子辰→酉, 巳酉丑→午, 亥卯未→子. */
const DOHWA: Record<string, string> = {
  寅: '卯',
  午: '卯',
  戌: '卯',
  申: '酉',
  子: '酉',
  辰: '酉',
  巳: '午',
  酉: '午',
  丑: '午',
  亥: '子',
  卯: '子',
  未: '子',
}
/** 天干合 化神: 甲己土 乙庚金 丙辛水 丁壬木 戊癸火. */
const STEM_HAP: Record<string, string> = {
  甲己: '토',
  乙庚: '금',
  丙辛: '수',
  丁壬: '목',
  戊癸: '화',
}
const POS = ['year', 'month', 'day', 'time'] as const

function analyzePillars(gz: string[]) {
  const stems = gz.map((p) => p[0])
  const branches = gz.map((p) => p[1])
  const has = (set: string) => [...set].every((b) => branches.includes(b))
  const samhap = Object.entries(SAMHAP)
    .filter(([k]) => has(k))
    .map(([k, el]) => ({ members: k, element: el }))
  const banghap = Object.entries(BANGHAP)
    .filter(([k]) => has(k))
    .map(([k, el]) => ({ members: k, element: el }))
  const selfPunish = [
    ...new Set(branches.filter((b, i) => branches.indexOf(b) !== i && SELF_PUNISH.has(b))),
  ]
  const stemClash: string[] = []
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++)
      if (
        STEM_CLASH.some(
          ([a, b]) => (stems[i] === a && stems[j] === b) || (stems[i] === b && stems[j] === a)
        )
      )
        stemClash.push(`${stems[i]}-${stems[j]}`)
  const dm = stems[2]
  const taegeuk = POS.filter((_, i) => TAEGEUK[dm].includes(branches[i])).map((p, _i) => ({
    pillar: p,
    branch: branches[POS.indexOf(p)],
  }))
  const gwimun: string[] = []
  for (const basis of [2, 0]) {
    for (let j = 0; j < 4; j++) {
      if (j === basis) continue
      const pair = [branches[basis], branches[j]]
      if (
        GWIMUN.some(
          (g) => (g[0] === pair[0] && g[1] === pair[1]) || (g[0] === pair[1] && g[1] === pair[0])
        )
      ) {
        const key = [...pair].sort().join('-')
        if (!gwimun.includes(key)) gwimun.push(key)
      }
    }
  }
  const dohwaTarget = DOHWA[branches[2]]
  const dohwa = POS.filter((_, i) => i !== 2 && branches[i] === dohwaTarget).map((p) => ({
    pillar: p,
    branch: dohwaTarget,
  }))
  // 化氣格: DM's 合 partner in the adjacent month or hour stem, and 月令 (month branch) of the 化神 element.
  let hwagi: { partner: string; element: string; monthSupport: boolean; formed: boolean } | null =
    null
  for (const j of [1, 3]) {
    const key = Object.keys(STEM_HAP).find(
      (k) => k.includes(dm) && k.includes(stems[j]) && dm !== stems[j]
    )
    if (key) {
      const el = STEM_HAP[key]
      const monthSupport = BRANCH_EL[branches[1]] === el
      hwagi = { partner: `${POS[j]}:${stems[j]}`, element: el, monthSupport, formed: monthSupport }
      break
    }
  }
  return { samhap, banghap, selfPunish, stemClash, taegeuk, gwimun, dohwa, hwagi }
}

function buildSajuDerived() {
  const cases: Array<{ id: string; pillars: string; checks: string[]; note?: string }> = [
    {
      id: 'D01',
      pillars: '辛亥 丁酉 癸亥 己未',
      checks: ['samhap'],
      note: '亥卯未 needs 卯; two 亥 are not two members',
    },
    { id: 'D02', pillars: '甲午 乙亥 辛丑 戊子', checks: ['banghap'] },
    {
      id: 'D03',
      pillars: '戊子 丁巳 丁未 庚子',
      checks: ['selfPunish'],
      note: '子 is not a 自刑 branch',
    },
    {
      id: 'D04',
      pillars: '丙午 甲午 戊寅 戊午',
      checks: ['stemClash', 'samhap'],
      note: '甲-戊 is not a 天干沖; 寅午戌 needs 戌',
    },
    { id: 'D05', pillars: '戊辰 癸亥 庚午 甲申', checks: ['taegeuk'] },
    { id: 'D06', pillars: '辛未 辛丑 壬寅 庚戌', checks: ['taegeuk'] },
    { id: 'D07', pillars: '丙申 庚子 己未 己巳', checks: ['gwimun'] },
    { id: 'D08', pillars: '丁未 丙午 丙寅 戊戌', checks: ['gwimun'] },
    { id: 'D09', pillars: '癸酉 戊午 癸未 壬戌', checks: ['dohwa'] },
    {
      id: 'D10',
      pillars: '壬辰 乙巳 壬申 丁未',
      checks: ['hwagi'],
      note: '丁壬→木 but 月令 巳 is fire',
    },
  ]
  const yongsin = [
    {
      id: 'Y01',
      pillars: '丙戌 辛卯 乙未 壬午',
      strength: 'strong' as const,
      check: 'primaryNotSupport',
    },
    { id: 'Y02', pillars: '庚午 庚辰 戊申 辛酉', strength: null, check: 'secondaryNotKibsin' },
    { id: 'Y03', pillars: '辛未 癸巳 丁亥 戊申', strength: null, check: 'primaryNotAvoid' },
    {
      id: 'Y04',
      pillars: '甲寅 戊辰 癸未 辛酉',
      strength: 'weak' as const,
      check: 'primarySupportOrJohu',
    },
  ].map((y) => {
    const dmEl = STEM_EL[y.pillars.split(' ')[2][0]]
    // 억부: 인성 (generates DM) and 비겁 (same element) support the DM.
    const support = [genBy(dmEl), dmEl]
    return { ...y, dayMasterElement: dmEl, supportElements: support }
  })
  return {
    source: {
      samhap:
        '三命通會 論三合: 申子辰 水, 亥卯未 木, 寅午戌 火, 巳酉丑 金 — all three distinct members',
      banghap: '方合: 寅卯辰 木, 巳午未 火, 申酉戌 金, 亥子丑 水',
      selfPunish: '三命通會: 自刑 = 辰辰 午午 酉酉 亥亥',
      stemClash: '天干沖 4쌍: 甲庚 乙辛 丙壬 丁癸 (relationTables canon)',
      taegeuk:
        '三命通會 太極貴人: 甲乙 子午 / 丙丁 卯酉 / 戊己 辰戌丑未 / 庚辛 寅亥 / 壬癸 巳申 (day stem)',
      gwimun: '鬼門關: 子酉 丑午 寅未 卯申 辰亥 巳戌, read from 日支 and 年支',
      dohwa: '桃花 = 年殺 of the 日支 三合 group: 寅午戌→卯 申子辰→酉 巳酉丑→午 亥卯未→子',
      hwagi: '化氣格: DM 合 partner in the adjacent month/hour stem and 月令 of the 化神 element',
      yongsin:
        'CONVENTIONS §10 억부: strong DM → not 인성/비겁; weak DM → 인성/비겁 unless a flagged 조후 override',
    },
    cases: cases.map((c) => {
      const all = analyzePillars(c.pillars.split(' '))
      const expected = Object.fromEntries(c.checks.map((k) => [k, all[k as keyof typeof all]]))
      return { ...c, expected }
    }),
    yongsin,
    extremeWeak: {
      pillars: '庚申 庚申 甲申 庚申',
      maxScore: 20,
      note: '甲 day master with seven metal characters: 극신약 band (≤ 20) of the §10 five-step scale',
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross population (seeded inputs) and report rows
// ─────────────────────────────────────────────────────────────────────────────
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const PLACES: Array<{ lat: number; lon: number; tz: string }> = [
  { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' },
  { lat: 35.1796, lon: 129.0756, tz: 'Asia/Seoul' },
  { lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles' },
  { lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
  { lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
]

function buildCross() {
  const seed = 20261124
  const rnd = mulberry32(seed)
  const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1))
  const pad = (n: number) => String(n).padStart(2, '0')
  const births = Array.from({ length: 20 }, (_, i) => {
    const by = ri(1950, 2005)
    const bm = ri(1, 12)
    const bd = ri(1, 28)
    const bh = ri(0, 23)
    const bmin = ri(0, 59)
    const place = PLACES[ri(0, PLACES.length - 1)]
    const gender: Gender = rnd() < 0.5 ? 'male' : 'female'
    const dates = new Set<string>()
    while (dates.size < 3) dates.add(`2026-11-${pad(ri(1, 30))}`)
    return {
      id: `P${pad(i + 1)}`,
      birthDate: `${by}-${pad(bm)}-${pad(bd)}`,
      birthTime: `${pad(bh)}:${pad(bmin)}`,
      gender,
      latitude: place.lat,
      longitude: place.lon,
      timeZone: place.tz,
      dates: [...dates].sort(),
    }
  })
  // 子時 golden for the sample month (CONVENTIONS §1: stem from the civil day).
  const d1 = dayPillar(2026, 11, 1)
  const d2 = dayPillar(2026, 11, 2)
  const lmtOffsetMin = (135 - SEOUL.lon) * 4 // KST clock − LMT
  const endClock = 60 + lmtOffsetMin
  return {
    seed,
    month: { start: '2026-11-01T00:00:00.000Z', end: '2026-11-30T23:59:59.999Z' },
    sample: {
      id: 'SAMPLE',
      birthDate: '1997-03-21',
      birthTime: '14:30',
      gender: 'female' as Gender,
      latitude: SEOUL.lat,
      longitude: SEOUL.lon,
      timeZone: SEOUL.tz,
      dates: ['2026-11-02', '2026-11-19', '2026-11-24'],
    },
    births,
    ziHour: {
      source:
        'CONVENTIONS §1: 00:00–01:00 belongs to the civil day, whose stem gives the 子時 stem (五鼠遁)',
      date: '2026-11-02',
      dayPillar: d2.name,
      hourPillar: hourPillar(d2.stem, 0),
      windowLocal: {
        start: '00:00',
        end: `${pad(Math.floor(endClock / 60))}:${pad(Math.floor(endClock % 60))}`,
      },
      previousDay: { date: '2026-11-01', dayPillar: d1.name, ziHourPillar: hourPillar(d1.stem, 0) },
    },
  }
}

const SIGN_EL: Record<string, string> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
  Gemini: 'wood',
  Libra: 'wood',
  Aquarius: 'wood',
}
const KO_EN: Record<string, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}
const EN_GEN: Record<string, string> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}
const EN_CTL: Record<string, string> = {
  wood: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'wood',
  water: 'fire',
}
/** Five-element verdict family used by every element axis (natalCrossVerdict.elementVerdict). */
function elementTone(a: string, b: string) {
  if (a === b) return 'resonant'
  if (EN_GEN[a] === b || EN_GEN[b] === a) return 'complement'
  if (EN_CTL[a] === b || EN_CTL[b] === a) return 'tension'
  return 'neutral'
}
const opposite = (sign: string) => SIGNS[(SIGNS.indexOf(sign as (typeof SIGNS)[number]) + 6) % 12]

function buildReport() {
  const chart = (
    date: string,
    time: string,
    tz: string,
    lat: number,
    lon: number,
    gender: Gender
  ) => {
    const { ms } = resolveWall(date, time, tz)
    const [y, mo, d] = date.split('-').map(Number)
    const ym = yearMonth(ms)
    const day = dayPillar(y, mo, d)
    const hp = hourPillar(day.stem, branchFromMin(ms / 60000 + lon * 4))
    const pillars = [ym.year, ym.month, day.name, hp]
    // 旬空: the two branches after the 旬 (10-day block) of the day pillar.
    const xunStart = day.idx - (day.idx % 10)
    const gongmang = [BRANCHES[(xunStart + 10) % 12], BRANCHES[(xunStart + 11) % 12]]
    const counts: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
    for (const p of pillars) {
      counts[KO_EN[STEM_EL[p[0]]]]++
      counts[KO_EN[BRANCH_EL[p[1]]]]++
    }
    const nn = signOf(trueNode(ms))
    const moon = signOf(planetLon('Moon', ms))
    return {
      input: {
        birthDate: date,
        birthTime: time,
        timeZone: tz,
        latitude: lat,
        longitude: lon,
        gender,
      },
      utc: iso(ms),
      pillars,
      gongmang,
      visibleCounts: counts,
      northNode: nn,
      southNode: opposite(nn),
      moon,
    }
  }
  const karma = chart('1951-05-22', '13:38', 'Asia/Seoul', SEOUL.lat, SEOUL.lon, 'female')
  const snEl = SIGN_EL[karma.southNode]
  const karmaExpected = karma.gongmang.some((b) => KO_EN[BRANCH_EL[b]] === snEl)
    ? 'resonant'
    : 'not-resonant'
  const growth = chart('1960-12-18', '21:49', 'America/Los_Angeles', 34.0522, -118.2437, 'male')
  const min = Math.min(...Object.values(growth.visibleCounts))
  const weakest = Object.keys(growth.visibleCounts).filter((k) => growth.visibleCounts[k] === min)
  const sample = chart('1997-03-21', '14:30', 'Asia/Seoul', SEOUL.lat, SEOUL.lon, 'female')
  // evalVoid order invariance: a South Node whose element equals either void branch's element.
  const SN_FOR_EL: Record<string, string> = {
    water: 'Cancer',
    earth: 'Taurus',
    fire: 'Leo',
    wood: 'Gemini',
  }
  const voidPairs = [
    ['戌', '亥'],
    ['申', '酉'],
    ['午', '未'],
    ['辰', '巳'],
    ['寅', '卯'],
    ['子', '丑'],
  ]
  const voidCases: Array<{ pair: string[]; southNode: string; expected: 'resonant' }> = []
  for (const pair of voidPairs) {
    for (const sn of new Set(pair.map((b) => SN_FOR_EL[KO_EN[BRANCH_EL[b]]]).filter(Boolean))) {
      voidCases.push({ pair, southNode: sn, expected: 'resonant' })
    }
  }
  return {
    source:
      'Five-element verdict family (same → resonant, 生 → complement, 剋 → tension); 旬空 from the day pillar; signs → saju elements with air → wood (natalCrossShared.signToSajuElement convention)',
    now: '2026-11-24T00:00:00Z',
    karma: { ...karma, expected: { tone: karmaExpected, karmaAxis: true } },
    growth: {
      ...growth,
      weakest,
      expected:
        weakest.length === 1 ? { tone: elementTone(weakest[0], SIGN_EL[growth.northNode]) } : null,
    },
    needs: {
      ...sample,
      moonElement: SIGN_EL[sample.moon],
      rule: 'needs tone = elementTone(용신 primary element, Moon sign element)',
    },
    voidCases,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
function gitCommit(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim()
    const dirty = execSync('git status --porcelain -- scripts/golden', { cwd: ROOT })
      .toString()
      .trim()
    return dirty ? `${sha}+dirty` : sha
  } catch {
    return 'unknown'
  }
}

async function main() {
  const saju = buildSaju()
  const golden = {
    schema: 1,
    provenance: {
      generator: 'scripts/golden/build-engine-golden.mts',
      generatorCommit: gitCommit(),
      astronomyEngine: JSON.parse(
        readFileSync(resolve(ROOT, 'node_modules/astronomy-engine/package.json'), 'utf8')
      ).version as string,
      tzdata: process.versions.tz ?? 'unknown',
      icu: process.versions.icu ?? 'unknown',
      node: process.version,
      kasiCrossCheck: { terms: 0, maxDeviationSec: 0 },
      decisions: {
        'OD-1':
          'proposed: year/month/대운 from the absolute 절입 instant; current: longitude-shifted instant',
        'OD-2':
          'proposed: no longitude → zone reference longitude (Asia/Seoul 126.978); current: Seoul LMT +30 table',
        'OD-3':
          'proposed: gap → pre-transition offset, overlap → earlier instant (RFC 5545); no written current doctrine',
        'OD-12': 'proposed: no current 대운 before the first one starts',
      },
    },
    saju: { now: SAJU_NOW, seoulReferenceLon: SEOUL.lon, cases: saju },
    astro: {
      tolerance: { planetDeg: 0.02, nodeDeg: 0.02, angleDeg: 0.02, cuspDeg: 0.03 },
      charts: buildAstro(),
    },
    timing: {
      profection: profection(),
      solarArc: solarArc(),
      saturnReturn: saturnReturns(),
      transit: transitInstant(),
      planetaryHours: planetaryHours(),
      voidOfCourse: voidOfCourseEnd(),
      sect: sect(),
      zodiacalReleasing: zodiacalReleasing(),
    },
    sajuDerived: buildSajuDerived(),
    cross: buildCross(),
    report: buildReport(),
  }
  golden.provenance.kasiCrossCheck = { terms: kasiChecked, maxDeviationSec: round(kasiMaxSec, 1) }
  mkdirSync(dirname(OUT), { recursive: true })
  // Format like lint-staged would, so a regenerated file diffs cleanly against the committed one.
  const options = (await prettier.resolveConfig(OUT)) ?? {}
  writeFileSync(OUT, await prettier.format(JSON.stringify(golden), { ...options, parser: 'json' }))
  console.log(`wrote ${OUT}`)
  console.log(`KASI cross-check: ${kasiChecked} terms, max ${kasiMaxSec.toFixed(1)} s`)
}

await main()
