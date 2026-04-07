import type { MatrixCalculationInput } from '@/lib/destiny-matrix'
import type { FiveElement, RelationHit } from '@/lib/Saju/types'
import { STEMS } from '@/lib/Saju/constants'
import { getRetrogradePlanetsForDate } from '@/lib/destiny-map/calendar/astrology/retrograde'
import type {
  GeokgukType,
  ShinsalKind,
  PlanetName,
  HouseNumber,
  ZodiacKo,
  AspectType,
  TransitCycle,
  AsteroidName,
  ExtraPointName,
} from '@/lib/destiny-matrix/types'
const ELEMENT_MAP: Record<string, FiveElement> = {
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

const PLANET_ALIASES: Record<string, PlanetName> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
}

const ASPECT_TYPES: AspectType[] = [
  'conjunction',
  'sextile',
  'square',
  'trine',
  'opposition',
  'semisextile',
  'quincunx',
  'quintile',
  'biquintile',
]

const ASPECT_TYPE_SET = new Set<string>(ASPECT_TYPES)

const TRANSIT_CYCLES: TransitCycle[] = [
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
]

const TRANSIT_CYCLE_SET = new Set<string>(TRANSIT_CYCLES)
const FIVE_ELEMENT_SET = new Set<FiveElement>(['목', '화', '토', '금', '수'])

const MATRIX_SHINSAL_SET = new Set<string>([
  '천을귀인',
  '태극귀인',
  '천덕귀인',
  '월덕귀인',
  '문창귀인',
  '학당귀인',
  '금여록',
  '천주귀인',
  '암록',
  '건록',
  '제왕',
  '도화',
  '홍염살',
  '양인',
  '백호',
  '겁살',
  '재살',
  '천살',
  '지살',
  '년살',
  '월살',
  '망신',
  '고신',
  '괴강',
  '현침',
  '귀문관',
  '병부',
  '효신살',
  '상문살',
  '역마',
  '화개',
  '장성',
  '반안',
  '천라지망',
  '공망',
  '삼재',
  '원진',
])

const SHINSAL_ALIASES: Record<string, string> = {
  금여성: '금여록',
  문창: '문창귀인',
}

const GEOKGUK_ALIASES: Partial<Record<string, GeokgukType>> = {
  정관격: 'jeonggwan',
  편관격: 'pyeongwan',
  정인격: 'jeongin',
  편인격: 'pyeongin',
  식신격: 'siksin',
  상관격: 'sanggwan',
  정재격: 'jeongjae',
  편재격: 'pyeonjae',
  건록격: 'geonrok',
  양인격: 'yangin',
  종아격: 'jonga',
  종재격: 'jongjae',
  종살격: 'jongsal',
  종강격: 'jonggang',
  종왕격: 'jonggang',
}

const RELATION_ALIASES: Record<string, string> = {
  합: '지지육합',
  충: '지지충',
  형: '지지형',
  파: '지지파',
  해: '지지해',
}

const ASTEROID_ALIASES: Record<string, AsteroidName> = {
  ceres: 'Ceres',
  pallas: 'Pallas',
  juno: 'Juno',
  vesta: 'Vesta',
}

const EXTRA_POINT_ALIASES: Record<string, ExtraPointName> = {
  chiron: 'Chiron',
  lilith: 'Lilith',
  partoffortune: 'PartOfFortune',
  part_of_fortune: 'PartOfFortune',
  vertex: 'Vertex',
  northnode: 'NorthNode',
  north_node: 'NorthNode',
  southnode: 'SouthNode',
  south_node: 'SouthNode',
}

type TransitSyncSnapshot = {
  date: string
  age: number
  activeTransits: TransitCycle[]
}

function toDatePartsInTimeZone(
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

function calculateAgeAtDate(birthDate: string, targetDate: Date, timeZone: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim())
  if (!match) {
    return 0
  }
  const birthYear = Number(match[1])
  const birthMonth = Number(match[2])
  const birthDay = Number(match[3])
  const { year, month, day } = toDatePartsInTimeZone(targetDate, timeZone)

  let age = year - birthYear
  if (month < birthMonth || (month === birthMonth && day < birthDay)) {
    age -= 1
  }
  return Math.max(0, age)
}

function buildApproximateIljinTiming(
  targetDate: Date,
  timeZone: string
): { element?: MatrixCalculationInput['currentIljinElement']; date: string } {
  const { year, month, day } = toDatePartsInTimeZone(targetDate, timeZone)
  const baseDate = new Date(1900, 0, 1)
  const target = new Date(year, month - 1, day)
  const dayDiff = Math.floor((target.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
  const stemElements: MatrixCalculationInput['pillarElements'] = [
    '목',
    '목',
    '화',
    '화',
    '토',
    '토',
    '금',
    '금',
    '수',
    '수',
  ]
  const stemIdx = (((dayDiff + 10) % 10) + 10) % 10

  return {
    element: stemElements[stemIdx],
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  }
}

function inferLifecycleTransitCycles(age: number): TransitCycle[] {
  const results = new Set<TransitCycle>()

  const withinOneYear = (value: number, target: number) => Math.abs(value - target) <= 1

  for (let trigger = 12; trigger <= 96; trigger += 12) {
    if (withinOneYear(age, trigger)) {
      results.add('jupiterReturn')
      break
    }
  }

  for (const trigger of [29, 58, 87]) {
    if (withinOneYear(age, trigger)) {
      results.add('saturnReturn')
      break
    }
  }

  for (const trigger of [21, 42, 63]) {
    if (withinOneYear(age, trigger)) {
      results.add('uranusSquare')
      break
    }
  }

  for (const trigger of [41, 82]) {
    if (withinOneYear(age, trigger)) {
      results.add('neptuneSquare')
      break
    }
  }

  for (const trigger of [18, 37, 56, 74]) {
    if (withinOneYear(age, trigger)) {
      results.add('nodeReturn')
      break
    }
  }

  if (age >= 36 && age <= 44) {
    results.add('plutoTransit')
  }

  return [...results]
}

function inferRetrogradeTransitCycles(targetDate: Date): TransitCycle[] {
  const retrogrades = getRetrogradePlanetsForDate(targetDate)
  const map: Record<string, TransitCycle> = {
    mercury: 'mercuryRetrograde',
    venus: 'venusRetrograde',
    mars: 'marsRetrograde',
    jupiter: 'jupiterRetrograde',
    saturn: 'saturnRetrograde',
  }
  return retrogrades
    .map((planet) => map[planet])
    .filter((cycle): cycle is TransitCycle => Boolean(cycle))
}

function inferTransitSnapshotForDate(
  birthDate: string,
  targetDate: Date,
  timeZone: string
): TransitSyncSnapshot {
  const age = calculateAgeAtDate(birthDate, targetDate, timeZone)
  const merged = new Set<TransitCycle>([
    ...inferLifecycleTransitCycles(age),
    ...inferRetrogradeTransitCycles(targetDate),
  ])
  const date = toDatePartsInTimeZone(targetDate, timeZone)
  return {
    date: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
    age,
    activeTransits: [...merged],
  }
}

function inferElementFromStemName(stemName?: string): FiveElement | undefined {
  if (!stemName) {
    return undefined
  }
  const stem = STEMS.find((item) => item.name === stemName)
  const element = stem?.element
  return element && FIVE_ELEMENT_SET.has(element) ? element : undefined
}

function normalizePlanetName(value: unknown): PlanetName | null {
  if (typeof value !== 'string') {
    return null
  }
  return PLANET_ALIASES[value.trim().toLowerCase()] || null
}

function normalizeAspectType(value: unknown): AspectType | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim().toLowerCase()
  return ASPECT_TYPE_SET.has(normalized) ? (normalized as AspectType) : null
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return undefined
}

function normalizeTwelveStagesInput(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (['year', 'month', 'day', 'time'].includes(key) && typeof value === 'string') {
      normalized[value] = (normalized[value] || 0) + 1
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      normalized[key] = value
    }
  }
  return normalized
}

function normalizeRelationsInput(raw: unknown): RelationHit[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const normalized: RelationHit[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const kind = RELATION_ALIASES[item] || item
      normalized.push({ kind: kind as RelationHit['kind'], pillars: [] })
      continue
    }
    if (item && typeof item === 'object' && typeof (item as { kind?: unknown }).kind === 'string') {
      const kind =
        RELATION_ALIASES[(item as { kind: string }).kind] || (item as { kind: string }).kind
      const pillars = Array.isArray((item as { pillars?: unknown }).pillars)
        ? (item as { pillars: unknown[] }).pillars.filter(
            (p): p is RelationHit['pillars'][number] => typeof p === 'string'
          )
        : []
      normalized.push({
        kind: kind as RelationHit['kind'],
        pillars,
        detail:
          typeof (item as { detail?: unknown }).detail === 'string'
            ? (item as { detail: string }).detail
            : undefined,
        note:
          typeof (item as { note?: unknown }).note === 'string'
            ? (item as { note: string }).note
            : undefined,
      })
    }
  }
  return normalized
}

function normalizeShinsalListInput(raw: unknown): ShinsalKind[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const dedup = new Set<ShinsalKind>()
  for (const item of raw) {
    if (typeof item !== 'string') {
      continue
    }
    const normalized = SHINSAL_ALIASES[item] || item
    if (MATRIX_SHINSAL_SET.has(normalized)) {
      dedup.add(normalized as ShinsalKind)
    }
  }
  return [...dedup]
}

function normalizePlanetHousesInput(raw: unknown): Partial<Record<PlanetName, HouseNumber>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Partial<Record<PlanetName, HouseNumber>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const planet = normalizePlanetName(key)
    if (!planet || typeof value !== 'number') {
      continue
    }
    const house = Math.trunc(value)
    if (house >= 1 && house <= 12) {
      normalized[planet] = house as HouseNumber
    }
  }
  return normalized
}

function normalizePlanetSignsInput(raw: unknown): Partial<Record<PlanetName, ZodiacKo>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Partial<Record<PlanetName, ZodiacKo>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const planet = normalizePlanetName(key)
    if (!planet || typeof value !== 'string') {
      continue
    }
    normalized[planet] = value as ZodiacKo
  }
  return normalized
}

function normalizeAspectsInput(raw: unknown): MatrixCalculationInput['aspects'] {
  if (!Array.isArray(raw)) {
    return []
  }
  const normalized: MatrixCalculationInput['aspects'] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const record = item as Record<string, unknown>
    const directPlanet1 = normalizePlanetName(record.planet1)
    const directPlanet2 = normalizePlanetName(record.planet2)
    const fromPlanet = normalizePlanetName((record.from as { name?: unknown } | undefined)?.name)
    const toPlanet = normalizePlanetName((record.to as { name?: unknown } | undefined)?.name)
    const planet1 = directPlanet1 || fromPlanet
    const planet2 = directPlanet2 || toPlanet
    const type = normalizeAspectType(record.type)
    if (!planet1 || !planet2 || !type) {
      continue
    }
    normalized.push({
      planet1,
      planet2,
      type,
      angle: normalizeNumber(record.angle),
      orb: normalizeNumber(record.orb),
    })
  }
  return normalized
}

function inferTransitCycle(record: Record<string, unknown>): TransitCycle | null {
  const directType = typeof record.type === 'string' ? record.type : null
  if (directType && TRANSIT_CYCLE_SET.has(directType)) {
    return directType as TransitCycle
  }

  const tp = typeof record.transitPlanet === 'string' ? record.transitPlanet.toLowerCase() : ''
  const np = typeof record.natalPlanet === 'string' ? record.natalPlanet.toLowerCase() : ''
  const aspectType = typeof record.aspectType === 'string' ? record.aspectType.toLowerCase() : ''

  if (tp === 'saturn' && np === 'saturn' && aspectType === 'conjunction') return 'saturnReturn'
  if (tp === 'jupiter' && np === 'jupiter' && aspectType === 'conjunction') return 'jupiterReturn'
  if (tp === 'uranus' && aspectType === 'square') return 'uranusSquare'
  if (tp === 'neptune' && aspectType === 'square') return 'neptuneSquare'
  if (tp === 'pluto') return 'plutoTransit'
  if ((tp === 'northnode' || tp === 'southnode') && aspectType === 'conjunction')
    return 'nodeReturn'

  return null
}

function normalizeActiveTransitsInput(raw: unknown): TransitCycle[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const dedup = new Set<TransitCycle>()
  for (const item of raw) {
    if (typeof item === 'string' && TRANSIT_CYCLE_SET.has(item)) {
      dedup.add(item as TransitCycle)
      continue
    }
    if (item && typeof item === 'object') {
      const inferred = inferTransitCycle(item as Record<string, unknown>)
      if (inferred) {
        dedup.add(inferred)
      }
    }
  }
  return [...dedup]
}

function normalizeAsteroidHousesInput(raw: unknown): Partial<Record<AsteroidName, HouseNumber>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Partial<Record<AsteroidName, HouseNumber>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const asteroid = ASTEROID_ALIASES[key.trim().toLowerCase()]
    if (!asteroid || typeof value !== 'number') {
      continue
    }
    const house = Math.trunc(value)
    if (house >= 1 && house <= 12) {
      normalized[asteroid] = house as HouseNumber
    }
  }
  return normalized
}

function normalizeExtraPointSignsInput(raw: unknown): Partial<Record<ExtraPointName, ZodiacKo>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Partial<Record<ExtraPointName, ZodiacKo>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalizedKey = key.replace(/\s+/g, '').toLowerCase()
    const point = EXTRA_POINT_ALIASES[normalizedKey]
    if (!point || typeof value !== 'string') {
      continue
    }
    normalized[point] = value as ZodiacKo
  }
  return normalized
}

/**
 * GET - Returns only summary metadata (NO raw matrix data)
 * Protected: Does not expose proprietary matrix cell data
 */

export {
  ELEMENT_MAP,
  GEOKGUK_ALIASES,
  FIVE_ELEMENT_SET,
  toDatePartsInTimeZone,
  buildApproximateIljinTiming,
  inferTransitSnapshotForDate,
  inferElementFromStemName,
  normalizeTwelveStagesInput,
  normalizeRelationsInput,
  normalizeShinsalListInput,
  normalizePlanetHousesInput,
  normalizePlanetSignsInput,
  normalizeAspectsInput,
  normalizeActiveTransitsInput,
  normalizeAsteroidHousesInput,
  normalizeExtraPointSignsInput,
}
export type { TransitSyncSnapshot }
