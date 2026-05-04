// Activity-aware transit modifiers.
//
// Different life activities respond to different transit signatures:
//   결혼   → Venus / Moon aspects to natal Venus / Moon
//   커리어 → Mercury / Sun aspects to natal Mercury / Sun
//   투자   → Jupiter aspects + Mercury retrograde (penalty)
//   이사   → Mars / Uranus aspects, retrograde Mercury (penalty)
//   수술   → Mars / Saturn aspects (avoid hard aspects)
//   학업   → Mercury aspects, Mercury retrograde (penalty)
//
// Take a base 0-100 score and a list of tightest transit aspects +
// retrograde planets and emit an adjusted score plus a one-line note
// describing the dominant modifier so the panel can show "🪐 +5" or
// "↩ -8 수성역행" next to the activity.

interface TransitAspect {
  transitPlanet: string
  natalPoint: string
  aspect: string
  orb: number
}

const HARMONIOUS = new Set(['trine', 'sextile'])
const HARSH = new Set(['square', 'opposition'])

interface ActivityProfile {
  /** Planets whose aspects move the activity score (in or out). */
  relevantPlanets: string[]
  /** Specific natal points to weight extra (e.g. "Venus" for marriage). */
  weightedNatal: string[]
  /** Retrograde planets that drag the activity down. */
  retrogradePenalty: Record<string, number>
}

const PROFILES: Record<string, ActivityProfile> = {
  marriage: {
    relevantPlanets: ['Venus', 'Moon', 'Jupiter'],
    weightedNatal: ['Venus', 'Moon'],
    retrogradePenalty: { Venus: 8, Mercury: 4 },
  },
  career: {
    relevantPlanets: ['Mercury', 'Sun', 'Saturn'],
    weightedNatal: ['Mercury', 'Sun', 'MC'],
    retrogradePenalty: { Mercury: 6, Saturn: 3 },
  },
  investment: {
    relevantPlanets: ['Jupiter', 'Saturn', 'Mercury'],
    weightedNatal: ['Jupiter', 'Sun'],
    retrogradePenalty: { Mercury: 8, Jupiter: 5 },
  },
  moving: {
    relevantPlanets: ['Mars', 'Uranus', 'Mercury'],
    weightedNatal: ['Mars', 'IC', 'Ascendant'],
    retrogradePenalty: { Mercury: 6 },
  },
  surgery: {
    relevantPlanets: ['Mars', 'Saturn', 'Moon'],
    weightedNatal: ['Mars', 'Saturn'],
    retrogradePenalty: { Mars: 8, Mercury: 5 },
  },
  study: {
    relevantPlanets: ['Mercury', 'Saturn', 'Jupiter'],
    weightedNatal: ['Mercury', 'Saturn'],
    retrogradePenalty: { Mercury: 10 },
  },
}

export interface ActivityAdjustment {
  adjusted: number
  delta: number // signed adjustment from base
  note?: string // user-readable one-liner
}

export function adjustActivityForTransit(
  activityKey: string,
  baseScore: number,
  tightest: TransitAspect[] | undefined,
  retrogrades: string[] | undefined
): ActivityAdjustment {
  const profile = PROFILES[activityKey]
  if (!profile) return { adjusted: baseScore, delta: 0 }
  let delta = 0
  const notes: string[] = []

  for (const aspect of tightest || []) {
    if (!profile.relevantPlanets.includes(aspect.transitPlanet)) continue
    const tightness = Math.max(0, 1 - aspect.orb / 6) // 6° max orb
    const natalWeight = profile.weightedNatal.includes(aspect.natalPoint) ? 1.5 : 1
    let bump = 0
    if (HARMONIOUS.has(aspect.aspect)) bump = 4 * tightness * natalWeight
    else if (HARSH.has(aspect.aspect)) bump = -4 * tightness * natalWeight
    else if (aspect.aspect === 'conjunction') {
      // Conjunction polarity by activity:
      const conjunctionGood: Record<string, string[]> = {
        marriage: ['Venus', 'Moon', 'Jupiter'],
        career: ['Mercury', 'Sun', 'Jupiter'],
        investment: ['Jupiter'],
        moving: ['Mars'],
        surgery: [],
        study: ['Mercury', 'Jupiter'],
      }
      const goodSet = conjunctionGood[activityKey] || []
      bump = (goodSet.includes(aspect.transitPlanet) ? 3 : -2) * tightness * natalWeight
    }
    delta += bump
  }

  for (const planet of retrogrades || []) {
    const penalty = profile.retrogradePenalty[planet] || 0
    if (penalty > 0) {
      delta -= penalty
      notes.push(
        `${planet === 'Mercury' ? '수성' : planet === 'Venus' ? '금성' : planet === 'Mars' ? '화성' : planet} 역행 -${penalty}`
      )
    }
  }

  const adjusted = Math.max(0, Math.min(100, baseScore + Math.round(delta)))
  if (Math.abs(delta) >= 1.5 && notes.length === 0) {
    notes.push(
      delta > 0
        ? `점성 ${Math.round(delta)} 부스트`
        : `점성 ${Math.round(delta)} 감점`
    )
  }
  return {
    adjusted,
    delta: Math.round(delta),
    note: notes.length > 0 ? notes.join(' · ') : undefined,
  }
}
