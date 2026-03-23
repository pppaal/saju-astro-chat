import { getRetrogradePlanetsForDate } from '@/lib/destiny-map/calendar/astrology/retrograde'
import { calculateDailyGanji } from '@/lib/destiny-map/calendar/utils'
import { buildAstroTimingIndex } from './astroTimingIndex'
import type { MatrixCalculationInput, TransitCycle } from './types'

const EN_TO_KO_ELEMENT: Record<string, MatrixCalculationInput['pillarElements'][number]> = {
  wood: '\uBAA9',
  fire: '\uD654',
  earth: '\uD1A0',
  metal: '\uAE08',
  water: '\uC218',
  甲: '\uBAA9',
  乙: '\uBAA9',
  丙: '\uD654',
  丁: '\uD654',
  戊: '\uD1A0',
  己: '\uD1A0',
  庚: '\uAE08',
  辛: '\uAE08',
  壬: '\uC218',
  癸: '\uC218',
  '\u00E7\u201D\u00B2': '\uBAA9',
  '\u00E4\u00B9\u2122': '\uBAA9',
  '\u00E4\u00B8\u2122': '\uD654',
  '\u00E4\u00B8\u0081': '\uD654',
  '\u00E6\u02C6\u0160': '\uD1A0',
  '\u00E5\u00B7\u00B1': '\uD1A0',
  '\u00E5\u00BA\u0161': '\uAE08',
  '\u00E8\u00BE\u203A': '\uAE08',
  '\u00E5\u00A3\u00AC': '\uC218',
  '\u00E7\u2122\u00B8': '\uC218',
}

const DIRECT_ELEMENTS: MatrixCalculationInput['pillarElements'] = [
  '\uBAA9',
  '\uD654',
  '\uD1A0',
  '\uAE08',
  '\uC218',
]

const SHORT_LIVED_ADVANCED_KEYS = new Set(['solarReturn', 'lunarReturn', 'eclipses'])

const TRANSIT_CYCLE_SET = new Set<TransitCycle>([
  'saturnReturn',
  'jupiterReturn',
  'uranusSquare',
  'neptuneSquare',
  'plutoTransit',
  'nodeReturn',
  'eclipse',
  'mercuryRetrograde',
  'venusRetrograde',
  'marsRetrograde',
  'jupiterRetrograde',
  'saturnRetrograde',
])

const RETROGRADE_TRANSIT_MAP: Record<string, TransitCycle> = {
  mercury: 'mercuryRetrograde',
  venus: 'venusRetrograde',
  mars: 'marsRetrograde',
  jupiter: 'jupiterRetrograde',
  saturn: 'saturnRetrograde',
}

const PERSISTENT_TRANSIT_SET = new Set<TransitCycle>(['plutoTransit'])

function toKoElement(
  value?: unknown
): MatrixCalculationInput['pillarElements'][number] | undefined {
  if (typeof value !== 'string' || !value) return undefined
  if ((DIRECT_ELEMENTS as string[]).includes(value)) {
    return value as MatrixCalculationInput['pillarElements'][number]
  }
  return EN_TO_KO_ELEMENT[value.trim().toLowerCase()]
}

export function toDatePartsInTimeZone(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const getPart = (type: 'year' | 'month' | 'day') =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  }
}

export function calculateAgeAtDate(birthDate: string, targetDate: Date, timeZone: string): number {
  const normalized = birthDate.trim().replace(/[./]/g, '-')
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized)
  if (!match) return 0

  const birthYear = Number(match[1])
  const birthMonth = Number(match[2])
  const birthDay = Number(match[3])
  const { year, month, day } = toDatePartsInTimeZone(targetDate, timeZone)

  let age = year - birthYear
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1
  return Math.max(0, age)
}

export function buildRuntimeIljinTiming(
  targetDate: Date,
  timeZone: string
): { element?: MatrixCalculationInput['currentIljinElement']; date: string } {
  const { year, month, day } = toDatePartsInTimeZone(targetDate, timeZone)
  const ganji = calculateDailyGanji(new Date(Date.UTC(year, month - 1, day)))
  const stemElement = toKoElement(ganji.stem)

  return {
    element: stemElement,
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  }
}

export const buildApproximateIljinTiming = buildRuntimeIljinTiming

export function inferLifecycleTransitCycles(
  age: number
): NonNullable<MatrixCalculationInput['activeTransits']> {
  const out = new Set<TransitCycle>()
  const withinOneYear = (value: number, target: number) => Math.abs(value - target) <= 1

  for (let trigger = 12; trigger <= 96; trigger += 12) {
    if (withinOneYear(age, trigger)) {
      out.add('jupiterReturn')
      break
    }
  }
  for (const trigger of [29, 58, 87]) {
    if (withinOneYear(age, trigger)) {
      out.add('saturnReturn')
      break
    }
  }
  for (const trigger of [21, 42, 63]) {
    if (withinOneYear(age, trigger)) {
      out.add('uranusSquare')
      break
    }
  }
  for (const trigger of [41, 82]) {
    if (withinOneYear(age, trigger)) {
      out.add('neptuneSquare')
      break
    }
  }
  for (const trigger of [18, 37, 56, 74]) {
    if (withinOneYear(age, trigger)) {
      out.add('nodeReturn')
      break
    }
  }
  if (age >= 36 && age <= 44) out.add('plutoTransit')
  return [...out]
}

export function inferRetrogradeTransitCycles(
  targetDate: Date
): NonNullable<MatrixCalculationInput['activeTransits']> {
  const retrogrades = getRetrogradePlanetsForDate(targetDate)
  const out = new Set<TransitCycle>()
  for (const planet of retrogrades) {
    const cycle = RETROGRADE_TRANSIT_MAP[planet]
    if (cycle && TRANSIT_CYCLE_SET.has(cycle)) out.add(cycle)
  }
  return [...out]
}

function getSajuSnapshotRecord(input: MatrixCalculationInput): Record<string, unknown> | undefined {
  const snapshot = input.sajuSnapshot
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    ? (snapshot as Record<string, unknown>)
    : undefined
}

function getUnseRows(
  input: MatrixCalculationInput,
  key: 'annual' | 'monthly'
): Array<Record<string, unknown>> {
  const snapshot = getSajuSnapshotRecord(input)
  const unse = snapshot?.unse
  if (!unse || typeof unse !== 'object' || Array.isArray(unse)) return []
  const rows = (unse as Record<string, unknown>)[key]
  return Array.isArray(rows)
    ? rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    : []
}

function deriveAnnualElement(
  input: MatrixCalculationInput,
  year: number
): MatrixCalculationInput['currentSaeunElement'] {
  const annualRows = getUnseRows(input, 'annual')
  const match = annualRows.find((row) => Number(row.year) === year)
  return toKoElement(match?.element) || input.currentSaeunElement
}

function deriveMonthlyElement(
  input: MatrixCalculationInput,
  year: number,
  month: number
): MatrixCalculationInput['currentWolunElement'] {
  const monthlyRows = getUnseRows(input, 'monthly')
  const match = monthlyRows.find((row) => Number(row.year) === year && Number(row.month) === month)
  return toKoElement(match?.element) || input.currentWolunElement
}

function deriveAdvancedSignalsForDate(
  input: MatrixCalculationInput,
  targetDateIso: string,
  currentDateIso?: string
): MatrixCalculationInput['advancedAstroSignals'] {
  const signals = input.advancedAstroSignals
  if (!signals) return signals

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(signals)) {
    if (!SHORT_LIVED_ADVANCED_KEYS.has(key)) {
      out[key] = value
      continue
    }

    if (!currentDateIso) continue
    if (key === 'solarReturn') {
      const baseMonth = currentDateIso.slice(5, 7)
      const targetMonth = targetDateIso.slice(5, 7)
      if (baseMonth === targetMonth) out[key] = value
      continue
    }

    if (key === 'lunarReturn') {
      const baseYm = currentDateIso.slice(0, 7)
      const targetYm = targetDateIso.slice(0, 7)
      if (baseYm === targetYm) out[key] = value
      continue
    }

    if (key === 'eclipses') {
      const baseYm = currentDateIso.slice(0, 7)
      const targetYm = targetDateIso.slice(0, 7)
      if (baseYm === targetYm) out[key] = value
      continue
    }
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function derivePersistentTransits(
  input: MatrixCalculationInput,
  targetDateIso: string,
  currentDateIso?: string
): NonNullable<MatrixCalculationInput['activeTransits']> {
  const base = input.activeTransits || []
  const out = new Set<TransitCycle>()

  for (const transit of base) {
    if (PERSISTENT_TRANSIT_SET.has(transit)) {
      out.add(transit)
      continue
    }

    if (transit === 'eclipse' && currentDateIso?.slice(0, 7) === targetDateIso.slice(0, 7)) {
      out.add(transit)
    }
  }

  return [...out]
}

export function deriveRuntimeTimingForDate(
  input: MatrixCalculationInput,
  targetDate: Date,
  opts?: { targetDateIso?: string }
): Pick<
  MatrixCalculationInput,
  | 'currentDateIso'
  | 'currentSaeunElement'
  | 'currentWolunElement'
  | 'currentIljinElement'
  | 'currentIljinDate'
  | 'activeTransits'
  | 'astroTimingIndex'
  | 'advancedAstroSignals'
> {
  const timezone = input.profileContext?.timezone || 'Asia/Seoul'
  const { year, month } = toDatePartsInTimeZone(targetDate, timezone)
  const iljin = buildRuntimeIljinTiming(targetDate, timezone)
  const targetDateIso = opts?.targetDateIso || iljin.date

  const lifecycle = input.profileContext?.birthDate
    ? inferLifecycleTransitCycles(
        calculateAgeAtDate(input.profileContext.birthDate, targetDate, timezone)
      )
    : []
  const retrograde = inferRetrogradeTransitCycles(targetDate)
  const persistent = derivePersistentTransits(input, targetDateIso, input.currentDateIso)
  const activeTransits = Array.from(
    new Set<TransitCycle>([...persistent, ...lifecycle, ...retrograde])
  )
  const advancedAstroSignals = deriveAdvancedSignalsForDate(
    input,
    targetDateIso,
    input.currentDateIso
  )

  return {
    currentDateIso: targetDateIso,
    currentSaeunElement: deriveAnnualElement(input, year),
    currentWolunElement: deriveMonthlyElement(input, year, month),
    currentIljinElement: iljin.element,
    currentIljinDate: iljin.date,
    activeTransits,
    astroTimingIndex: buildAstroTimingIndex({
      activeTransits,
      advancedAstroSignals,
    }),
    advancedAstroSignals,
  }
}
