// Essential dignities (Lilly + modern rulers) +
// Hellenistic 5-tier extensions: Triplicity / Term (Bound) / Face (Decan).
//
// Single source of truth for which sign each planet rules / is exalted /
// is in detriment / falls in. Both English and Korean sign names are
// included so callers can pass either form.
//
// Used by:
// - cross-rules astro adapter (essential dignity + mutual reception)
// - calendar-engine astro-dignity extractor (5-tier Almuten scoring)
// - any direct consumer of the astrology library that needs dignity
//   without going through the rule engine

export type DignityStatus = 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'peregrine'

// Hellenistic 정통화 (Phase 2): 외행성 (Uranus/Neptune/Pluto) 은 전통 7행성에
// 없으므로 essential dignity 를 부여하지 않는다. 외행성의 transit/position 자체는
// 살리지만 (다른 모듈에서 활용), domicile/exaltation/detriment/fall 에서는 빠짐.
// 노드/Chiron 도 dignity 없음.
export const DOMICILE: Record<string, string[]> = {
  Sun: ['Leo', '사자자리'],
  Moon: ['Cancer', '게자리'],
  Mercury: ['Gemini', '쌍둥이자리', 'Virgo', '처녀자리'],
  Venus: ['Taurus', '황소자리', 'Libra', '천칭자리'],
  Mars: ['Aries', '양자리', 'Scorpio', '전갈자리'],
  Jupiter: ['Sagittarius', '사수자리', 'Pisces', '물고기자리'],
  Saturn: ['Capricorn', '염소자리', 'Aquarius', '물병자리'],
  // Uranus/Neptune/Pluto: 전통 헬레니즘 dignity 없음 (modern 점성 추가). 제거.
}

export const EXALTATION: Record<string, string[]> = {
  Sun: ['Aries', '양자리'],
  Moon: ['Taurus', '황소자리'],
  Mercury: ['Virgo', '처녀자리'],
  Venus: ['Pisces', '물고기자리'],
  Mars: ['Capricorn', '염소자리'],
  Jupiter: ['Cancer', '게자리'],
  Saturn: ['Libra', '천칭자리'],
}

export const DETRIMENT: Record<string, string[]> = {
  Sun: ['Aquarius', '물병자리'],
  Moon: ['Capricorn', '염소자리'],
  Mercury: ['Sagittarius', '사수자리', 'Pisces', '물고기자리'],
  Venus: ['Aries', '양자리', 'Scorpio', '전갈자리'],
  Mars: ['Libra', '천칭자리', 'Taurus', '황소자리'],
  Jupiter: ['Gemini', '쌍둥이자리', 'Virgo', '처녀자리'],
  Saturn: ['Cancer', '게자리', 'Leo', '사자자리'],
}

export const FALL: Record<string, string[]> = {
  Sun: ['Libra', '천칭자리'],
  Moon: ['Scorpio', '전갈자리'],
  Mercury: ['Pisces', '물고기자리'],
  Venus: ['Virgo', '처녀자리'],
  Mars: ['Cancer', '게자리'],
  Jupiter: ['Capricorn', '염소자리'],
  Saturn: ['Aries', '양자리'],
}

export function dignityOf(planet: string, sign: string): DignityStatus {
  if (DOMICILE[planet]?.includes(sign)) return 'domicile'
  if (EXALTATION[planet]?.includes(sign)) return 'exaltation'
  if (DETRIMENT[planet]?.includes(sign)) return 'detriment'
  if (FALL[planet]?.includes(sign)) return 'fall'
  return 'peregrine'
}

// ============================================================================
// Hellenistic minor dignities — Triplicity / Term / Face
// ============================================================================

type SignKey =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces'

/** English-or-Korean name → canonical English key. Returns null if unrecognised. */
function toSignKey(sign: string): SignKey | null {
  const map: Record<string, SignKey> = {
    Aries: 'Aries', '양자리': 'Aries',
    Taurus: 'Taurus', '황소자리': 'Taurus',
    Gemini: 'Gemini', '쌍둥이자리': 'Gemini',
    Cancer: 'Cancer', '게자리': 'Cancer',
    Leo: 'Leo', '사자자리': 'Leo',
    Virgo: 'Virgo', '처녀자리': 'Virgo',
    Libra: 'Libra', '천칭자리': 'Libra',
    Scorpio: 'Scorpio', '전갈자리': 'Scorpio',
    Sagittarius: 'Sagittarius', '사수자리': 'Sagittarius',
    Capricorn: 'Capricorn', '염소자리': 'Capricorn',
    Aquarius: 'Aquarius', '물병자리': 'Aquarius',
    Pisces: 'Pisces', '물고기자리': 'Pisces',
  }
  return map[sign] ?? null
}

/**
 * Triplicity rulers — Dorothean / Ptolemaic system used in Hellenistic practice.
 * Each element has a day ruler, night ruler, and participating (cooperating)
 * ruler. We expose day/night because that's what most modern sect-based
 * scoring engines reference.
 */
export const TRIPLICITY: Record<'fire' | 'earth' | 'air' | 'water', {
  day: string
  night: string
  participating: string
}> = {
  fire: { day: 'Sun', night: 'Jupiter', participating: 'Saturn' },     // Aries / Leo / Sagittarius
  earth: { day: 'Venus', night: 'Moon', participating: 'Mars' },        // Taurus / Virgo / Capricorn
  air: { day: 'Saturn', night: 'Mercury', participating: 'Jupiter' },   // Gemini / Libra / Aquarius
  water: { day: 'Venus', night: 'Mars', participating: 'Moon' },        // Cancer / Scorpio / Pisces
}

const SIGN_ELEMENT: Record<SignKey, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

/**
 * Returns which triplicity ruler tier the planet holds for this sign.
 * - 'day'   — planet rules the triplicity by day, and dayBirth = true
 * - 'night' — planet rules the triplicity by night, and dayBirth = false
 * - 'participating' — planet is the cooperating (3rd) ruler regardless of sect
 * - null    — planet is not a triplicity ruler of this sign
 */
export function triplicityOf(
  planet: string,
  sign: string,
  dayBirth: boolean,
): 'day' | 'night' | 'participating' | null {
  const key = toSignKey(sign)
  if (!key) return null
  const t = TRIPLICITY[SIGN_ELEMENT[key]]
  if (dayBirth && t.day === planet) return 'day'
  if (!dayBirth && t.night === planet) return 'night'
  if (t.participating === planet) return 'participating'
  return null
}

/**
 * Egyptian Bounds (Terms). Each sign is divided into 5 unequal arcs;
 * each arc has a single ruler among the seven traditional planets.
 *
 * Source: Vettius Valens / Ptolemy (Egyptian system).
 * Entries: [endDegree, ruler] — endDegree is the upper bound (exclusive of next).
 * Degrees are within-sign 0..30.
 */
const EGYPTIAN_TERMS: Record<SignKey, Array<[number, string]>> = {
  Aries:       [[6, 'Jupiter'], [12, 'Venus'],   [20, 'Mercury'], [25, 'Mars'],    [30, 'Saturn']],
  Taurus:      [[8, 'Venus'],   [14, 'Mercury'], [22, 'Jupiter'], [27, 'Saturn'],  [30, 'Mars']],
  Gemini:      [[6, 'Mercury'], [12, 'Jupiter'], [17, 'Venus'],   [24, 'Mars'],    [30, 'Saturn']],
  Cancer:      [[7, 'Mars'],    [13, 'Venus'],   [19, 'Mercury'], [26, 'Jupiter'], [30, 'Saturn']],
  Leo:         [[6, 'Jupiter'], [11, 'Venus'],   [18, 'Saturn'],  [24, 'Mercury'], [30, 'Mars']],
  Virgo:       [[7, 'Mercury'], [17, 'Venus'],   [21, 'Jupiter'], [28, 'Mars'],    [30, 'Saturn']],
  Libra:       [[6, 'Saturn'],  [14, 'Mercury'], [21, 'Jupiter'], [28, 'Venus'],   [30, 'Mars']],
  Scorpio:     [[7, 'Mars'],    [11, 'Venus'],   [19, 'Mercury'], [24, 'Jupiter'], [30, 'Saturn']],
  Sagittarius: [[12, 'Jupiter'],[17, 'Venus'],   [21, 'Mercury'], [26, 'Saturn'],  [30, 'Mars']],
  Capricorn:   [[7, 'Mercury'], [14, 'Jupiter'], [22, 'Venus'],   [26, 'Saturn'],  [30, 'Mars']],
  Aquarius:    [[7, 'Mercury'], [13, 'Venus'],   [20, 'Jupiter'], [25, 'Mars'],    [30, 'Saturn']],
  Pisces:      [[12, 'Venus'],  [16, 'Jupiter'], [19, 'Mercury'], [28, 'Mars'],    [30, 'Saturn']],
}

/**
 * Returns the term (bound) ruler the planet matches inside this sign at
 * the given within-sign degree, or null if the planet does not rule that arc.
 * `degree` is the 0..30 position within the sign.
 */
export function termOf(planet: string, sign: string, degree: number): string | null {
  const key = toSignKey(sign)
  if (!key) return null
  const arcs = EGYPTIAN_TERMS[key]
  const deg = Math.max(0, Math.min(degree, 29.999_999))
  for (const [upper, ruler] of arcs) {
    if (deg < upper) {
      return ruler === planet ? ruler : null
    }
  }
  return null
}

/** Same as termOf but always returns the bound's ruler regardless of planet. */
export function termRulerAt(sign: string, degree: number): string | null {
  const key = toSignKey(sign)
  if (!key) return null
  const arcs = EGYPTIAN_TERMS[key]
  const deg = Math.max(0, Math.min(degree, 29.999_999))
  for (const [upper, ruler] of arcs) {
    if (deg < upper) return ruler
  }
  return null
}

/**
 * Chaldean Faces (Decans). Each sign is divided into 3 equal 10° arcs,
 * each ruled by a planet following the Chaldean order:
 *   Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon
 * starting from Mars at 0° Aries.
 */
const CHALDEAN_FACES: Record<SignKey, [string, string, string]> = {
  Aries:       ['Mars',    'Sun',     'Venus'],
  Taurus:      ['Mercury', 'Moon',    'Saturn'],
  Gemini:      ['Jupiter', 'Mars',    'Sun'],
  Cancer:      ['Venus',   'Mercury', 'Moon'],
  Leo:         ['Saturn',  'Jupiter', 'Mars'],
  Virgo:       ['Sun',     'Venus',   'Mercury'],
  Libra:       ['Moon',    'Saturn',  'Jupiter'],
  Scorpio:     ['Mars',    'Sun',     'Venus'],
  Sagittarius: ['Mercury', 'Moon',    'Saturn'],
  Capricorn:   ['Jupiter', 'Mars',    'Sun'],
  Aquarius:   ['Venus',   'Mercury', 'Moon'],
  Pisces:      ['Saturn',  'Jupiter', 'Mars'],
}

/**
 * Returns the face (decan) ruler if the planet matches the 10° decan at
 * `degree`. Returns null otherwise.
 */
export function faceOf(planet: string, sign: string, degree: number): string | null {
  const key = toSignKey(sign)
  if (!key) return null
  const deg = Math.max(0, Math.min(degree, 29.999_999))
  const idx = Math.floor(deg / 10) as 0 | 1 | 2
  const ruler = CHALDEAN_FACES[key][idx]
  return ruler === planet ? ruler : null
}

/** Same as faceOf but always returns the decan's ruler regardless of planet. */
export function faceRulerAt(sign: string, degree: number): string | null {
  const key = toSignKey(sign)
  if (!key) return null
  const deg = Math.max(0, Math.min(degree, 29.999_999))
  const idx = Math.floor(deg / 10) as 0 | 1 | 2
  return CHALDEAN_FACES[key][idx]
}

// ============================================================================
// Almuten / 5-tier composite score
// ============================================================================

export interface DignityTiers {
  domicile: boolean      // classical +5 → polarity +1
  exaltation: boolean    // +4 → +1
  triplicity: boolean    // +3 → +0.5
  term: boolean          // +2 → +0.3
  face: boolean          // +1 → +0.2
  detriment: boolean     // → -1
  fall: boolean          // → -1
}

/**
 * Combined 5-tier evaluation. Pass the planet's within-sign degree
 * (0..30) and the natal sect ('day'|'night') for triplicity scoring.
 */
export function dignityTiers(
  planet: string,
  sign: string,
  degree: number,
  sect: 'day' | 'night',
): DignityTiers {
  return {
    domicile:   DOMICILE[planet]?.includes(sign) ?? false,
    exaltation: EXALTATION[planet]?.includes(sign) ?? false,
    triplicity: triplicityOf(planet, sign, sect === 'day') !== null,
    term:       termOf(planet, sign, degree) !== null,
    face:       faceOf(planet, sign, degree) !== null,
    detriment:  DETRIMENT[planet]?.includes(sign) ?? false,
    fall:       FALL[planet]?.includes(sign) ?? false,
  }
}

/** Polarity-style numeric score (Almuten-ish): + dignities raise, debilities lower. */
export function dignityScore(tiers: DignityTiers): number {
  let s = 0
  if (tiers.domicile) s += 1
  if (tiers.exaltation) s += 1
  if (tiers.triplicity) s += 0.5
  if (tiers.term) s += 0.3
  if (tiers.face) s += 0.2
  if (tiers.detriment) s -= 1
  if (tiers.fall) s -= 1
  return s
}
