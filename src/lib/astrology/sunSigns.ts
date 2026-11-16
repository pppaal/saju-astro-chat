/**
 * Tropical sun-sign table — single source of truth for the English SEO
 * surfaces (/horoscope, /compatibility/signs) and any other place that needs
 * sign metadata by slug.
 *
 * Facts only (no interpretation): glyph, element, modality, traditional and
 * modern rulers, polarity, and the approximate calendar span. The span is the
 * usual civil-calendar convention; the exact cusp moves by about a day from
 * year to year, so copy that quotes it should say "around".
 *
 * Order is the zodiacal order starting at Aries, and `index` is 0..11 — the
 * sign-distance arithmetic in the compatibility engine depends on that.
 * Names match `SIGN_KO` in ./signLabels.ts (PascalCase English).
 */

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water'
export type Modality = 'Cardinal' | 'Fixed' | 'Mutable'
export type Polarity = 'Positive' | 'Negative'

export interface SunSign {
  /** 0 = Aries … 11 = Pisces */
  index: number
  /** URL slug — lower-case English name */
  slug: string
  /** PascalCase English name (matches SIGN_KO keys) */
  name: string
  /** Unicode glyph */
  glyph: string
  element: Element
  modality: Modality
  polarity: Polarity
  /** Traditional ruler */
  ruler: string
  /** Modern ruler when it differs from the traditional one */
  modernRuler?: string
  /** Approximate civil-calendar span, e.g. { from: 'March 21', to: 'April 19' } */
  dates: { from: string; to: string }
}

export const SUN_SIGNS: readonly SunSign[] = [
  {
    index: 0,
    slug: 'aries',
    name: 'Aries',
    glyph: '♈',
    element: 'Fire',
    modality: 'Cardinal',
    polarity: 'Positive',
    ruler: 'Mars',
    dates: { from: 'March 21', to: 'April 19' },
  },
  {
    index: 1,
    slug: 'taurus',
    name: 'Taurus',
    glyph: '♉',
    element: 'Earth',
    modality: 'Fixed',
    polarity: 'Negative',
    ruler: 'Venus',
    dates: { from: 'April 20', to: 'May 20' },
  },
  {
    index: 2,
    slug: 'gemini',
    name: 'Gemini',
    glyph: '♊',
    element: 'Air',
    modality: 'Mutable',
    polarity: 'Positive',
    ruler: 'Mercury',
    dates: { from: 'May 21', to: 'June 20' },
  },
  {
    index: 3,
    slug: 'cancer',
    name: 'Cancer',
    glyph: '♋',
    element: 'Water',
    modality: 'Cardinal',
    polarity: 'Negative',
    ruler: 'Moon',
    dates: { from: 'June 21', to: 'July 22' },
  },
  {
    index: 4,
    slug: 'leo',
    name: 'Leo',
    glyph: '♌',
    element: 'Fire',
    modality: 'Fixed',
    polarity: 'Positive',
    ruler: 'Sun',
    dates: { from: 'July 23', to: 'August 22' },
  },
  {
    index: 5,
    slug: 'virgo',
    name: 'Virgo',
    glyph: '♍',
    element: 'Earth',
    modality: 'Mutable',
    polarity: 'Negative',
    ruler: 'Mercury',
    dates: { from: 'August 23', to: 'September 22' },
  },
  {
    index: 6,
    slug: 'libra',
    name: 'Libra',
    glyph: '♎',
    element: 'Air',
    modality: 'Cardinal',
    polarity: 'Positive',
    ruler: 'Venus',
    dates: { from: 'September 23', to: 'October 22' },
  },
  {
    index: 7,
    slug: 'scorpio',
    name: 'Scorpio',
    glyph: '♏',
    element: 'Water',
    modality: 'Fixed',
    polarity: 'Negative',
    ruler: 'Mars',
    modernRuler: 'Pluto',
    dates: { from: 'October 23', to: 'November 21' },
  },
  {
    index: 8,
    slug: 'sagittarius',
    name: 'Sagittarius',
    glyph: '♐',
    element: 'Fire',
    modality: 'Mutable',
    polarity: 'Positive',
    ruler: 'Jupiter',
    dates: { from: 'November 22', to: 'December 21' },
  },
  {
    index: 9,
    slug: 'capricorn',
    name: 'Capricorn',
    glyph: '♑',
    element: 'Earth',
    modality: 'Cardinal',
    polarity: 'Negative',
    ruler: 'Saturn',
    dates: { from: 'December 22', to: 'January 19' },
  },
  {
    index: 10,
    slug: 'aquarius',
    name: 'Aquarius',
    glyph: '♒',
    element: 'Air',
    modality: 'Fixed',
    polarity: 'Positive',
    ruler: 'Saturn',
    modernRuler: 'Uranus',
    dates: { from: 'January 20', to: 'February 18' },
  },
  {
    index: 11,
    slug: 'pisces',
    name: 'Pisces',
    glyph: '♓',
    element: 'Water',
    modality: 'Mutable',
    polarity: 'Negative',
    ruler: 'Jupiter',
    modernRuler: 'Neptune',
    dates: { from: 'February 19', to: 'March 20' },
  },
]

export function getSunSignBySlug(slug: string): SunSign | null {
  const s = slug.toLowerCase()
  return SUN_SIGNS.find((x) => x.slug === s) ?? null
}

export function getSunSignByName(name: string): SunSign | null {
  return SUN_SIGNS.find((x) => x.name === name) ?? null
}

/** Sign that contains an ecliptic longitude (0 ≤ lon < 360, tropical). */
export function sunSignForLongitude(longitude: number): SunSign {
  const norm = ((longitude % 360) + 360) % 360
  return SUN_SIGNS[Math.floor(norm / 30)]
}

/** Longitude of the middle of a sign (15°) — the reference point a sun-sign reading is cast from. */
export function signMidpointLongitude(sign: SunSign): number {
  return sign.index * 30 + 15
}
