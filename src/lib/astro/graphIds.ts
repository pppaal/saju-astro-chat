// src/lib/astrology/graphIds.ts
const PLANETS = [
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

const POINT_ALIASES: Record<string, string> = {
  ASC: 'Asc',
  ASCENDANT: 'Asc',
  MC: 'MC',
  MIDHEAVEN: 'MC',
  IC: 'IC',
  DESC: 'Desc',
  DESCENDANT: 'Desc',
  NODE: 'Node',
  NORTHNODE: 'NorthNode',
  SOUTHNODE: 'SouthNode',
  CHIRON: 'Chiron',
  VERTEX: 'Vertex',
  PARTOFFORTUNE: 'PartOfFortune',
  FORTUNE: 'PartOfFortune',
}

const PLANET_SET = new Set(PLANETS)
const SIGN_SET = new Set(SIGNS)

function matchBySet(value: string | null | undefined, set: Set<string>): string | null {
  if (!value) return null
  if (set.has(value)) return value
  const lowered = value.toLowerCase()
  for (const item of set) {
    if (item.toLowerCase() === lowered) return item
  }
  return null
}

export function toAstroPlanetId(value: string | null | undefined): string | null {
  return matchBySet(value, PLANET_SET)
}

export function toAstroSignId(value: string | null | undefined): string | null {
  return matchBySet(value, SIGN_SET)
}

export function toAstroPointId(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = value.replace(/[^A-Za-z]/g, '').toUpperCase()
  return POINT_ALIASES[cleaned] ?? null
}

export function toAstroHouseId(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    const num = Math.trunc(value)
    if (num >= 1 && num <= 12) return `H${num}`
    return null
  }
  const raw = String(value).trim()
  if (raw.startsWith('H') && /^\d+$/.test(raw.slice(1))) return raw
  if (/^\d+$/.test(raw)) {
    const num = Number(raw)
    if (num >= 1 && num <= 12) return `H${num}`
  }
  return null
}
