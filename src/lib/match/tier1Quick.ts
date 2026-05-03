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
import {
  signDistance,
  elementRel,
  COMPATIBLE_ASTRO_ELEMENT as COMPATIBLE_ELEMENT,
  type ElementRel,
} from '@/lib/compatibility/_shared/signMath'

type DmRelation = Exclude<ElementRel, 'unknown'>

function dayMasterRelation(a: Element, b: Element): DmRelation {
  const r = elementRel(a, b)
  return r === 'unknown' ? 'same' : r
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
