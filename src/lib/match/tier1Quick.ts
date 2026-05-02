/**
 * Tier 1 — Quick Match Score
 *
 * Microsecond-level integer math on two pre-computed MatchProfiles.
 * Designed for discover feed ranking where 50-100 candidates need to
 * be sorted in real time.
 *
 * Range: 0-100. Calibrated so most random pairs land 55-75 (matches
 * the score distribution in scoreContext.ts).
 */

import type { MatchProfile, Element } from './matchProfile'

const ELEMENT_GENERATES: Record<Element, Element> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}

const ELEMENT_CONTROLS: Record<Element, Element> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
}

type DmRelation = 'same' | 'support' | 'drain' | 'control' | 'controlled'

function dayMasterRelation(a: Element, b: Element): DmRelation {
  if (a === b) return 'same'
  if (ELEMENT_GENERATES[b] === a) return 'support'
  if (ELEMENT_GENERATES[a] === b) return 'drain'
  if (ELEMENT_CONTROLS[a] === b) return 'control'
  if (ELEMENT_CONTROLS[b] === a) return 'controlled'
  return 'same'
}

const ZODIAC_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

function signDistance(s1: string, s2: string): number {
  const i1 = ZODIAC_ORDER.indexOf(s1 as (typeof ZODIAC_ORDER)[number])
  const i2 = ZODIAC_ORDER.indexOf(s2 as (typeof ZODIAC_ORDER)[number])
  if (i1 < 0 || i2 < 0) return -1
  const diff = Math.abs(i1 - i2) % 12
  return Math.min(diff, 12 - diff)
}

const COMPATIBLE_ELEMENT: Record<string, string> = {
  fire: 'air',
  air: 'fire',
  earth: 'water',
  water: 'earth',
}

export type MatchBand = 'soulmate' | 'strong' | 'compatible' | 'worth' | 'different'

export interface QuickMatchResult {
  score: number
  band: MatchBand
}

function bandFor(score: number): MatchBand {
  if (score >= 88) return 'soulmate'
  if (score >= 78) return 'strong'
  if (score >= 68) return 'compatible'
  if (score >= 56) return 'worth'
  return 'different'
}

/**
 * Quick compatibility score (0-100). Pure integer math, ~5μs per call.
 *
 * Weighted blend of:
 *  - 사주 day-master relation     (-10 ~ +15)
 *  - 음양 complement               (+0 / +6)
 *  - 5행 element complement        (+0 ~ +8)
 *  - Sun sign element              (-3 ~ +10)
 *  - Moon sign match               (+0 ~ +8)
 *  - Venus-Mars cross element      (+0 ~ +5)
 */
export function tier1QuickScore(me: MatchProfile, other: MatchProfile): QuickMatchResult {
  let score = 50

  // === 사주 일간 relation ===
  const dmRel = dayMasterRelation(me.saju.dayMasterEl, other.saju.dayMasterEl)
  if (dmRel === 'same') score += 5
  else if (dmRel === 'support') score += 12
  else if (dmRel === 'drain') score += 8
  else if (dmRel === 'control') score -= 4
  else if (dmRel === 'controlled') score -= 6

  // === 음양 보완 ===
  if (me.saju.yinYang !== other.saju.yinYang) score += 6

  // === 5행 보완 (한쪽 weak, 다른쪽 strong) ===
  const allEl: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']
  let fillCount = 0
  for (const el of allEl) {
    const a = me.saju.elements[el] || 0
    const b = other.saju.elements[el] || 0
    if (a <= 1 && b >= 3) fillCount += 1
    if (b <= 1 && a >= 3) fillCount += 1
  }
  score += Math.min(fillCount * 3, 8)

  // === Sun sign element ===
  const sunDist = signDistance(me.astro.sun.sign, other.astro.sun.sign)
  if (sunDist === 0) score += 8 // exact same sun sign — rare
  else if (me.astro.sun.element === other.astro.sun.element) score += 6
  else if (COMPATIBLE_ELEMENT[me.astro.sun.element] === other.astro.sun.element) score += 4
  else if (sunDist === 3) score -= 3 // Sun square

  // === Moon sign similarity ===
  const moonDist = signDistance(me.astro.moon.sign, other.astro.moon.sign)
  if (moonDist === 0) score += 8
  else if (me.astro.moon.element === other.astro.moon.element) score += 4

  // === Venus-Mars cross element ===
  if (
    me.astro.venus.element === other.astro.mars.element ||
    other.astro.venus.element === me.astro.mars.element
  ) {
    score += 5
  }

  // Clamp + band
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  return {
    score: clamped,
    band: bandFor(clamped),
  }
}

/** Bulk variant — returns sorted candidates by score, descending. */
export function tier1RankCandidates<T extends { profile: MatchProfile }>(
  me: MatchProfile,
  candidates: T[]
): Array<T & { match: QuickMatchResult }> {
  return candidates
    .map((c) => ({ ...c, match: tier1QuickScore(me, c.profile) }))
    .sort((a, b) => b.match.score - a.match.score)
}
