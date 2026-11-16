/**
 * Sun-sign compatibility — deterministic engine (pure, no ephemeris).
 *
 * Content source for /compatibility/signs and /compatibility/signs/[pair].
 * Product philosophy as everywhere else in this repo: the judgment is computed
 * in code from the two signs' facts (shared table in @/lib/astrology/sunSigns);
 * the prose in ./sunSignCompatCopy.ts only puts that judgment into words. No
 * LLM, no clock, no randomness — the same two signs always yield the same
 * object, and the result is symmetric: compute(A, B) equals compute(B, A) in
 * every number.
 *
 * Factors (all read from the shared sign table):
 *   relation        sign distance 0..6 → same sign, semi-sextile, sextile,
 *                   square, trine, quincunx, opposition
 *   element pairing same element / compatible (Fire+Air, Earth+Water) /
 *                   challenging (everything else), with a per-element-pair rule
 *   modality        same modality (both Cardinal, both Fixed, both Mutable) or
 *                   different
 *   polarity        both Positive or both Negative (same) vs mixed
 *   rulers          traditional rulers: same planet / friendly / neutral /
 *                   tense — see RULER_RELATION_TABLE
 *
 * For two sun signs the element pairing, the modality pairing and the polarity
 * match are all fixed by the sign distance (trines are always same-element,
 * squares always same-modality, odd distances always mixed polarity …). They
 * are still reported as separate receipt lines because that is how a reader
 * understands *why* a trine is easy. The ruler relationship is the factor
 * that tells two pairs with the same geometry apart.
 *
 * Scoring. Four dimensions — chemistry, communication, values, longTerm — each
 * start from a base set by the relation (RELATION_BASE), then every other factor
 * adds or subtracts a few points (ELEMENT_PAIR_RULES, MODALITY_RULES,
 * POLARITY_RULES, RULER_RULES). Each dimension is clamped to 0..100. The
 * overall score is a weighted mean:
 *   chemistry 25% · communication 25% · values 20% · longTerm 30%
 * rounded to an integer. Grade labels from the score: ≥85 Natural fit ·
 * ≥75 Easy rapport · ≥65 Spark with friction · ≥55 Takes real work · else
 * Growth pairing. Every adjustment is written into `receipt` so the page can
 * show the arithmetic.
 *
 * URL symmetry: A×B = B×A, so the canonical slug lists the lower `index`
 * first (`canonicalSignPairSlug`). A reversed slug parses, but the page sets
 * its canonical to the canonical slug so the two URLs do not compete.
 */

import {
  SUN_SIGNS,
  getSunSignBySlug,
  type Element,
  type Modality,
  type SunSign,
} from '@/lib/astrology/sunSigns'

export type SignRelation =
  | 'same'
  | 'semi-sextile'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'quincunx'
  | 'opposition'

export type ElementPairing = 'same' | 'compatible' | 'challenging'
export type ModalityPairing = 'same' | 'different'
export type RulerRelation = 'same' | 'friendly' | 'neutral' | 'tense'
export type GradeKey = 'natural' | 'easy' | 'spark' | 'work' | 'growth'
export type BreakdownKey = 'chemistry' | 'communication' | 'values' | 'longTerm'

/** Points added to each dimension by one factor. Missing keys mean 0. */
export type Adjustment = Partial<Record<BreakdownKey, number>>

export interface BreakdownItem {
  key: BreakdownKey
  label: string
  /** 0..100 */
  score: number
  /** The rule that produced this number, in one sentence. */
  rule: string
}

export interface ReceiptItem {
  /** Short factor name, e.g. "Sign distance" */
  factor: string
  /** What was observed, e.g. "4 signs apart — a trine" */
  detail: string
  /** Numbers applied, e.g. "chemistry +4, values +4" */
  effect: string
  adjustment: Adjustment
}

export interface SunSignCompat {
  /** The two signs in canonical order (lower index first). */
  a: SunSign
  b: SunSign
  /** Canonical slug, e.g. "aries-libra". */
  slug: string
  /** 0..100 */
  score: number
  gradeKey: GradeKey
  gradeLabel: string
  breakdown: BreakdownItem[]
  /** 0..6 */
  distance: number
  relation: SignRelation
  relationLabel: string
  elementPairing: ElementPairing
  /** e.g. "Fire + Air" */
  elementPairLabel: string
  modalityPairing: ModalityPairing
  polarityMatch: boolean
  rulerRelation: RulerRelation
  /** Traditional rulers of a and b, in that order. */
  rulers: [string, string]
  receipt: ReceiptItem[]
}

// ── Geometry ──

export const RELATION_BY_DISTANCE: readonly SignRelation[] = [
  'same',
  'semi-sextile',
  'sextile',
  'square',
  'trine',
  'quincunx',
  'opposition',
]

export const RELATION_LABEL: Record<SignRelation, string> = {
  same: 'Same sign',
  'semi-sextile': 'Semi-sextile (1 sign apart)',
  sextile: 'Sextile (2 signs apart)',
  square: 'Square (3 signs apart)',
  trine: 'Trine (4 signs apart)',
  quincunx: 'Quincunx (5 signs apart)',
  opposition: 'Opposition (6 signs apart)',
}

/** Shortest distance around the wheel, 0..6. */
export function signDistance(a: SunSign, b: SunSign): number {
  const raw = Math.abs(a.index - b.index) % 12
  return raw > 6 ? 12 - raw : raw
}

export function relationForDistance(distance: number): SignRelation {
  const d = Math.max(0, Math.min(6, Math.round(distance)))
  return RELATION_BY_DISTANCE[d]
}

const COMPATIBLE_ELEMENTS: ReadonlyArray<readonly [Element, Element]> = [
  ['Fire', 'Air'],
  ['Earth', 'Water'],
]

export function elementPairingFor(x: Element, y: Element): ElementPairing {
  if (x === y) {
    return 'same'
  }
  const compatible = COMPATIBLE_ELEMENTS.some(
    ([p, q]) => (p === x && q === y) || (p === y && q === x)
  )
  return compatible ? 'compatible' : 'challenging'
}

// ── Weights ──

export const DIMENSIONS: ReadonlyArray<{ key: BreakdownKey; label: string; weight: number }> = [
  { key: 'chemistry', label: 'Chemistry', weight: 0.25 },
  { key: 'communication', label: 'Communication', weight: 0.25 },
  { key: 'values', label: 'Shared values', weight: 0.2 },
  { key: 'longTerm', label: 'Long-term ease', weight: 0.3 },
]

/** Starting point per dimension, set by the relation alone. */
export const RELATION_BASE: Record<SignRelation, Required<Adjustment>> = {
  same: { chemistry: 62, communication: 80, values: 86, longTerm: 68 },
  'semi-sextile': { chemistry: 50, communication: 52, values: 48, longTerm: 54 },
  sextile: { chemistry: 72, communication: 84, values: 70, longTerm: 76 },
  square: { chemistry: 78, communication: 50, values: 54, longTerm: 56 },
  trine: { chemistry: 80, communication: 82, values: 90, longTerm: 86 },
  quincunx: { chemistry: 56, communication: 48, values: 46, longTerm: 50 },
  opposition: { chemistry: 88, communication: 64, values: 58, longTerm: 66 },
}

const ELEMENT_ORDER: readonly Element[] = ['Fire', 'Earth', 'Air', 'Water']

function elementPairKey(x: Element, y: Element): string {
  const [p, q] =
    ELEMENT_ORDER.indexOf(x) <= ELEMENT_ORDER.indexOf(y) ? ([x, y] as const) : ([y, x] as const)
  return `${p}+${q}`
}

/**
 * Per element-pair rule. Same-element pairs lean on shared values, compatible
 * pairs on communication, challenging pairs lose ease but some keep heat.
 */
export const ELEMENT_PAIR_RULES: Record<string, { pairing: ElementPairing; adj: Adjustment }> = {
  'Fire+Fire': { pairing: 'same', adj: { chemistry: 4, values: 4, longTerm: 1 } },
  'Earth+Earth': { pairing: 'same', adj: { communication: 1, values: 5, longTerm: 5 } },
  'Air+Air': { pairing: 'same', adj: { chemistry: 1, communication: 5, values: 4, longTerm: 1 } },
  'Water+Water': {
    pairing: 'same',
    adj: { chemistry: 3, communication: 2, values: 5, longTerm: 3 },
  },
  'Fire+Air': {
    pairing: 'compatible',
    adj: { chemistry: 4, communication: 5, values: 1, longTerm: 1 },
  },
  'Earth+Water': {
    pairing: 'compatible',
    adj: { chemistry: 2, communication: 3, values: 3, longTerm: 5 },
  },
  'Fire+Earth': {
    pairing: 'challenging',
    adj: { chemistry: -1, communication: -3, values: -2, longTerm: 1 },
  },
  'Fire+Water': {
    pairing: 'challenging',
    adj: { chemistry: 2, communication: -4, values: -2, longTerm: -2 },
  },
  'Earth+Air': {
    pairing: 'challenging',
    adj: { chemistry: -2, communication: -3, values: -1 },
  },
  'Air+Water': {
    pairing: 'challenging',
    adj: { chemistry: 1, communication: -3, values: -3, longTerm: -1 },
  },
}

/** Same modality = both push the same way (heat, friction); different = complementary roles. */
export const MODALITY_RULES: Record<ModalityPairing, Adjustment> = {
  same: { chemistry: 3, communication: -4, longTerm: -3 },
  different: { communication: 3, longTerm: 3 },
}

/** Same polarity = same tempo; mixed = complementary charge. */
export const POLARITY_RULES: Record<'same' | 'mixed', Adjustment> = {
  same: { communication: 3 },
  mixed: { chemistry: 3, communication: -2 },
}

/** Ruler relationship → points. */
export const RULER_RULES: Record<RulerRelation, Adjustment> = {
  same: { chemistry: -2, communication: 4, values: 6, longTerm: 4 },
  friendly: { chemistry: 4, communication: 4, values: 4, longTerm: 4 },
  neutral: {},
  tense: { chemistry: 4, communication: -4, values: -3, longTerm: -4 },
}

/**
 * Traditional-ruler relationships (seven classical planets).
 *   friendly — the luminaries, the benefics and Mercury among themselves
 *   tense    — planets that rule opposite signs (each is in detriment in the
 *              other's domicile): Sun–Saturn, Moon–Saturn, Venus–Mars,
 *              Mercury–Jupiter; plus the two traditional malefics together
 *   neutral  — every other pair
 * Keys are alphabetical "A|B".
 */
const FRIENDLY_RULERS = new Set([
  'Moon|Sun',
  'Sun|Venus',
  'Jupiter|Sun',
  'Mercury|Sun',
  'Moon|Venus',
  'Jupiter|Moon',
  'Mercury|Moon',
  'Jupiter|Venus',
  'Mercury|Venus',
])
const TENSE_RULERS = new Set([
  'Saturn|Sun',
  'Moon|Saturn',
  'Mars|Venus',
  'Jupiter|Mercury',
  'Mars|Saturn',
])

export function rulerRelationFor(x: string, y: string): RulerRelation {
  if (x === y) {
    return 'same'
  }
  const key = [x, y].sort().join('|')
  if (FRIENDLY_RULERS.has(key)) {
    return 'friendly'
  }
  if (TENSE_RULERS.has(key)) {
    return 'tense'
  }
  return 'neutral'
}

export const RULER_RELATION_LABEL: Record<RulerRelation, string> = {
  same: 'same ruling planet',
  friendly: 'friendly rulers',
  neutral: 'neutral rulers',
  tense: 'rulers in tension',
}

// ── Grades ──

export const GRADES: ReadonlyArray<{ min: number; key: GradeKey; label: string }> = [
  { min: 85, key: 'natural', label: 'Natural fit' },
  { min: 75, key: 'easy', label: 'Easy rapport' },
  { min: 65, key: 'spark', label: 'Spark with friction' },
  { min: 55, key: 'work', label: 'Takes real work' },
  { min: 0, key: 'growth', label: 'Growth pairing' },
]

export function gradeForScore(score: number): { key: GradeKey; label: string } {
  const g = GRADES.find((x) => score >= x.min) ?? GRADES[GRADES.length - 1]
  return { key: g.key, label: g.label }
}

// ── Slugs ──

/** Canonical slug — lower zodiacal index first, so A×B and B×A share one URL. */
export function canonicalSignPairSlug(x: SunSign, y: SunSign): string {
  return x.index <= y.index ? `${x.slug}-${y.slug}` : `${y.slug}-${x.slug}`
}

/** "aries-libra" or "libra-aries" → both signs (order as written). Null if invalid. */
export function parseSignPairSlug(slug: string): { a: SunSign; b: SunSign } | null {
  const parts = (slug || '').toLowerCase().split('-')
  if (parts.length !== 2) {
    return null
  }
  const a = getSunSignBySlug(parts[0])
  const b = getSunSignBySlug(parts[1])
  if (!a || !b) {
    return null
  }
  return { a, b }
}

/** All 78 canonical slugs (12 same-sign + 66 distinct pairs), for sitemaps and hubs. */
export function allSignPairSlugs(): string[] {
  const out: string[] = []
  for (let i = 0; i < SUN_SIGNS.length; i++) {
    for (let j = i; j < SUN_SIGNS.length; j++) {
      out.push(`${SUN_SIGNS[i].slug}-${SUN_SIGNS[j].slug}`)
    }
  }
  return out
}

// ── Scoring ──

function formatEffect(adj: Adjustment): string {
  const parts = DIMENSIONS.filter((d) => (adj[d.key] ?? 0) !== 0).map((d) => {
    const v = adj[d.key] ?? 0
    return `${d.label.toLowerCase()} ${v > 0 ? '+' : '−'}${Math.abs(v)}`
  })
  return parts.length > 0 ? parts.join(', ') : 'no change'
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function elementPairLabelFor(x: Element, y: Element): string {
  const [p, q] = elementPairKey(x, y).split('+')
  return `${p} + ${q}`
}

function modalityLabel(x: Modality, y: Modality): string {
  return x === y ? `both ${x}` : `${x} + ${y}`
}

/** Compute the compatibility of two sun signs. Pure and symmetric. */
export function computeSunSignCompat(x: SunSign, y: SunSign): SunSignCompat {
  // Canonical order so every field (not just the score) is order-independent.
  const [a, b] = x.index <= y.index ? [x, y] : [y, x]

  const distance = signDistance(a, b)
  const relation = relationForDistance(distance)
  const elementRule = ELEMENT_PAIR_RULES[elementPairKey(a.element, b.element)]
  const elementPairing = elementRule.pairing
  const modalityPairing: ModalityPairing = a.modality === b.modality ? 'same' : 'different'
  const polarityMatch = a.polarity === b.polarity
  const rulerRelation = rulerRelationFor(a.ruler, b.ruler)

  const totals: Record<BreakdownKey, number> = { ...RELATION_BASE[relation] }
  const receipt: ReceiptItem[] = []

  const apply = (factor: string, detail: string, adj: Adjustment) => {
    for (const d of DIMENSIONS) {
      totals[d.key] += adj[d.key] ?? 0
    }
    receipt.push({ factor, detail, effect: formatEffect(adj), adjustment: adj })
  }

  receipt.push({
    factor: 'Sign distance',
    detail:
      distance === 0
        ? `${a.name} and ${b.name} are the same sign`
        : `${a.name} and ${b.name} sit ${distance} sign${distance === 1 ? '' : 's'} apart — ${RELATION_LABEL[relation].split(' (')[0].toLowerCase()}`,
    effect: `base ${DIMENSIONS.map((d) => `${d.label.toLowerCase()} ${RELATION_BASE[relation][d.key]}`).join(', ')}`,
    adjustment: RELATION_BASE[relation],
  })
  apply(
    'Elements',
    `${a.element} (${a.name}) + ${b.element} (${b.name}) — ${elementPairing === 'same' ? 'same element' : `${elementPairing} pairing`}`,
    elementRule.adj
  )
  apply(
    'Modality',
    `${modalityLabel(a.modality, b.modality)} — ${modalityPairing === 'same' ? 'same way of acting' : 'complementary ways of acting'}`,
    MODALITY_RULES[modalityPairing]
  )
  apply(
    'Polarity',
    polarityMatch
      ? `both ${a.polarity.toLowerCase()} (${a.polarity === 'Positive' ? 'outward' : 'receptive'}) signs`
      : 'one outward, one receptive sign',
    POLARITY_RULES[polarityMatch ? 'same' : 'mixed']
  )
  apply(
    'Rulers',
    `${a.ruler} (${a.name}) and ${b.ruler} (${b.name}) — ${RULER_RELATION_LABEL[rulerRelation]}`,
    RULER_RULES[rulerRelation]
  )

  const breakdown: BreakdownItem[] = DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    score: clamp100(totals[d.key]),
    rule: BREAKDOWN_RULE[d.key](relation, elementPairing, modalityPairing, rulerRelation),
  }))

  const weighted = breakdown.reduce((sum, item) => {
    const w = DIMENSIONS.find((d) => d.key === item.key)?.weight ?? 0
    return sum + item.score * w
  }, 0)
  const score = clamp100(weighted)
  const grade = gradeForScore(score)

  return {
    a,
    b,
    slug: canonicalSignPairSlug(a, b),
    score,
    gradeKey: grade.key,
    gradeLabel: grade.label,
    breakdown,
    distance,
    relation,
    relationLabel: RELATION_LABEL[relation],
    elementPairing,
    elementPairLabel: elementPairLabelFor(a.element, b.element),
    modalityPairing,
    polarityMatch,
    rulerRelation,
    rulers: [a.ruler, b.ruler],
    receipt,
  }
}

type RuleWriter = (
  relation: SignRelation,
  element: ElementPairing,
  modality: ModalityPairing,
  ruler: RulerRelation
) => string

const RELATION_WORD: Record<SignRelation, string> = {
  same: 'a same-sign pair',
  'semi-sextile': 'a semi-sextile',
  sextile: 'a sextile',
  square: 'a square',
  trine: 'a trine',
  quincunx: 'a quincunx',
  opposition: 'an opposition',
}

const BREAKDOWN_RULE: Record<BreakdownKey, RuleWriter> = {
  chemistry: (relation, element, modality, ruler) => {
    const heat =
      relation === 'opposition' || relation === 'square'
        ? 'high-tension angles pull hardest'
        : relation === 'trine' || relation === 'sextile'
          ? 'easy angles attract without strain'
          : relation === 'same'
            ? 'a mirror is comfortable more than electric'
            : 'awkward angles start slow'
    const extras = [
      modality === 'same' ? 'same modality adds heat' : null,
      ruler === 'tense' ? 'rulers in tension add charge' : null,
      element === 'compatible' ? 'compatible elements add spark' : null,
    ].filter(Boolean)
    return `Starts from ${RELATION_WORD[relation]} (${heat})${extras.length ? '; ' + extras.join(', ') : ''}.`
  },
  communication: (relation, element, modality, ruler) => {
    const base =
      relation === 'sextile' || relation === 'trine' || relation === 'same'
        ? 'you speak a related language'
        : relation === 'opposition'
          ? 'you argue the two ends of one axis'
          : 'you default to different wavelengths'
    const extras = [
      element === 'compatible' || element === 'same'
        ? 'elements that understand each other'
        : 'elements that need translation',
      modality === 'different'
        ? 'complementary modalities'
        : 'same modality competes for the wheel',
      ruler === 'friendly' || ruler === 'same' ? 'rulers on good terms' : null,
      ruler === 'tense' ? 'rulers at odds' : null,
    ].filter(Boolean)
    return `${RELATION_WORD[relation][0].toUpperCase()}${RELATION_WORD[relation].slice(1)}: ${base}; ${extras.join(', ')}.`
  },
  values: (relation, element, _modality, ruler) => {
    const base =
      relation === 'trine' || relation === 'same'
        ? 'same element, same priorities'
        : relation === 'sextile'
          ? 'neighboring priorities'
          : relation === 'opposition'
            ? 'opposite ends of the same concern'
            : 'different priorities to reconcile'
    const extras = [
      element === 'same' ? 'shared element lifts this' : null,
      ruler === 'same' ? 'a shared ruler lifts this most' : null,
      ruler === 'friendly' ? 'friendly rulers help' : null,
      ruler === 'tense' ? 'tense rulers pull it down' : null,
    ].filter(Boolean)
    return `${base}${extras.length ? '; ' + extras.join(', ') : ''}.`.replace(/^./, (c) =>
      c.toUpperCase()
    )
  },
  longTerm: (relation, element, modality, ruler) => {
    const base =
      relation === 'trine' || relation === 'sextile'
        ? 'easy angles wear well'
        : relation === 'same'
          ? 'familiarity is stable but needs fresh air'
          : relation === 'opposition'
            ? 'oppositions last when the axis becomes a team'
            : 'friction angles need deliberate routines'
    const extras = [
      element === 'compatible' || element === 'same' ? 'elements that rest easily together' : null,
      modality === 'different' ? 'different modalities share the load' : 'same modality doubles up',
      ruler === 'same' || ruler === 'friendly' ? 'rulers that cooperate' : null,
      ruler === 'tense' ? 'rulers that need refereeing' : null,
    ].filter(Boolean)
    return `${base}; ${extras.join(', ')}.`.replace(/^./, (c) => c.toUpperCase())
  },
}

// ── Hub helpers ──

export interface SignMatch {
  other: SunSign
  score: number
  gradeLabel: string
  slug: string
}

/** Best partner signs for one sign, by engine score (ties broken by zodiacal order). */
export function bestMatchesFor(
  sign: SunSign,
  options: { count?: number; includeSame?: boolean } = {}
): SignMatch[] {
  const { count = 3, includeSame = false } = options
  return SUN_SIGNS.filter((s) => includeSame || s.index !== sign.index)
    .map((other) => {
      const c = computeSunSignCompat(sign, other)
      return { other, score: c.score, gradeLabel: c.gradeLabel, slug: c.slug }
    })
    .sort((p, q) => q.score - p.score || p.other.index - q.other.index)
    .slice(0, count)
}

/** Every canonical pair, computed. 78 entries. */
export function computeAllSunSignCompat(): SunSignCompat[] {
  const out: SunSignCompat[] = []
  for (let i = 0; i < SUN_SIGNS.length; i++) {
    for (let j = i; j < SUN_SIGNS.length; j++) {
      out.push(computeSunSignCompat(SUN_SIGNS[i], SUN_SIGNS[j]))
    }
  }
  return out
}
