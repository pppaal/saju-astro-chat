import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, type ApiContext } from '@/lib/api/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { LIMITS } from '@/lib/validation'
import { sanitizeString } from '@/lib/api/sanitizers'
import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/Saju/saju'
import {
  calculateAstrologyCompatibilityOnly,
  calculateSajuCompatibilityOnly,
  type AstrologyProfile,
  type SajuProfile,
} from '@/lib/compatibility/cosmicCompatibility'
import { calculateFusionCompatibility } from '@/lib/compatibility/compatibilityFusion'
import { performCrossSystemAnalysis } from '@/lib/compatibility/crossSystemAnalysis'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import {
  performExtendedAstrologyAnalysis,
  type ExtendedAstrologyProfile,
} from '@/lib/compatibility/astrology/comprehensive'
import {
  calculateNatalChart,
  toChart,
  type NatalChartData,
} from '@/lib/astrology/foundation/astrologyService'
import { calculateSynastry } from '@/lib/astrology/foundation/synastry'
import type { Chart, AspectType } from '@/lib/astrology/foundation/types'
import type { Relation, PersonInput } from './types'
import { compatibilityRequestSchema } from '@/lib/api/zodValidation'

const MAX_NOTE = LIMITS.NOTE
const SIGN_ORDER = [
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

const SIGN_TO_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire',
  Taurus: 'earth',
  Gemini: 'air',
  Cancer: 'water',
  Leo: 'fire',
  Virgo: 'earth',
  Libra: 'air',
  Scorpio: 'water',
  Sagittarius: 'fire',
  Capricorn: 'earth',
  Aquarius: 'air',
  Pisces: 'water',
}

const ASPECT_LABEL: Record<AspectType, string> = {
  conjunction: 'Conjunction',
  sextile: 'Sextile',
  square: 'Square',
  trine: 'Trine',
  opposition: 'Opposition',
  semisextile: 'Semi-sextile',
  quincunx: 'Quincunx',
  quintile: 'Quintile',
  biquintile: 'Bi-quintile',
}

type PairScore = {
  pair: [number, number]
  score: number
}

type PairAnalysis = {
  pair: [number, number]
  pairLabel: string
  relationLabel: string
  rawScore: number
  weightedScore: number
  sajuScore: number | null
  astrologyScore: number | null
  fusionScore: number | null
  crossScore: number | null
  strengths: string[]
  challenges: string[]
  advice: string[]
  topAspects: string[]
  topHouseOverlays: string[]
}

type PersonAnalysis = {
  sajuProfile: SajuProfile | null
  astroProfile: AstrologyProfile | null
  extendedAstroProfile: ExtendedAstrologyProfile | null
  natalChart: NatalChartData | null
  synastryChart: Chart | null
  errors: string[]
}

function relationWeight(relation?: Relation) {
  if (!relation) {
    return 1.0
  }
  if (relation === 'lover') {
    return 1.0
  }
  if (relation === 'friend') {
    return 0.95
  }
  return 0.9
}

function relationLabel(relation?: Relation, note?: string) {
  if (relation === 'lover') {
    return 'lover'
  }
  if (relation === 'friend') {
    return 'friend'
  }
  if (relation === 'other') {
    return note?.trim() || 'other'
  }
  return 'related'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))]
}

function normalizeSign(rawSign: string) {
  const clean = String(rawSign || '')
    .trim()
    .toLowerCase()
  const found = SIGN_ORDER.find((s) => s.toLowerCase() === clean)
  return found || 'Aries'
}

function oppositeSign(sign: string) {
  const normalized = normalizeSign(sign)
  const index = SIGN_ORDER.findIndex((s) => s === normalized)
  if (index < 0) {
    return 'Libra'
  }
  return SIGN_ORDER[(index + 6) % 12]
}

function elementFromSign(sign: string): 'fire' | 'earth' | 'air' | 'water' {
  return SIGN_TO_ELEMENT[normalizeSign(sign)] || 'fire'
}

function elementEnFromSaju(value: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === '목' || normalized === 'wood') {
    return 'wood'
  }
  if (normalized === '화' || normalized === 'fire') {
    return 'fire'
  }
  if (normalized === '토' || normalized === 'earth') {
    return 'earth'
  }
  if (normalized === '금' || normalized === 'metal') {
    return 'metal'
  }
  if (normalized === '수' || normalized === 'water') {
    return 'water'
  }
  return normalized || 'earth'
}

function elementKo(value: string) {
  if (value === 'wood') return 'Wood(木)'
  if (value === 'fire') return 'Fire(火)'
  if (value === 'earth') return 'Earth(土)'
  if (value === 'metal') return 'Metal(金)'
  if (value === 'water') return 'Water(水)'
  return value
}

function parseBirthParts(date: string, time: string) {
  const [year, month, day] = date.split('-').map((v) => Number(v))
  const [hourText = '0', minuteText = '0'] = String(time).split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null
  }

  return { year, month, day, hour, minute }
}

function ageFromDate(date: string) {
  const [year, month, day] = date.split('-').map((v) => Number(v))
  if (!year || !month || !day) return 30

  const now = new Date()
  let age = now.getFullYear() - year
  const birthdayNotPassed =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)

  if (birthdayNotPassed) {
    age -= 1
  }
  return clamp(age, 1, 120)
}

function buildSajuProfileFromBirth(
  date: string,
  time: string,
  timezone: string
): SajuProfile | null {
  try {
    const result = calculateSajuData(date, time, 'male', 'solar', timezone)
    return {
      dayMaster: {
        name: result.dayMaster.name,
        element: result.dayMaster.element,
        yin_yang: result.dayMaster.yin_yang === '양' ? 'yang' : 'yin',
      },
      pillars: {
        year: {
          stem: result.yearPillar.heavenlyStem.name,
          branch: result.yearPillar.earthlyBranch.name,
        },
        month: {
          stem: result.monthPillar.heavenlyStem.name,
          branch: result.monthPillar.earthlyBranch.name,
        },
        day: {
          stem: result.dayPillar.heavenlyStem.name,
          branch: result.dayPillar.earthlyBranch.name,
        },
        time: {
          stem: result.timePillar.heavenlyStem.name,
          branch: result.timePillar.earthlyBranch.name,
        },
      },
      elements: result.fiveElements,
    }
  } catch (error) {
    logger.warn('[Compatibility] Failed to build Saju profile', { error })
    return null
  }
}

async function buildAstrologyProfileFromBirth(person: PersonInput): Promise<PersonAnalysis> {
  const errors: string[] = []
  const parts = parseBirthParts(person.date, person.time)

  if (!parts) {
    return {
      sajuProfile: null,
      astroProfile: null,
      extendedAstroProfile: null,
      natalChart: null,
      synastryChart: null,
      errors: ['Invalid birth date/time format'],
    }
  }

  try {
    const natal = await calculateNatalChart({
      year: parts.year,
      month: parts.month,
      date: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      latitude: person.latitude,
      longitude: person.longitude,
      timeZone: person.timeZone,
    })

    const planetMap = new Map(
      natal.planets.map((planet) => [String(planet.name).toLowerCase(), planet] as const)
    )

    const buildPlanet = (name: string, includeDegree = false) => {
      const planet = planetMap.get(name.toLowerCase())
      if (!planet) return undefined
      const sign = normalizeSign(String(planet.sign))
      const base = {
        sign,
        element: elementFromSign(sign),
      }
      return includeDegree ? { ...base, degree: planet.degree } : base
    }

    const sun = buildPlanet('Sun')
    const moon = buildPlanet('Moon')
    const venus = buildPlanet('Venus')
    const mars = buildPlanet('Mars')

    if (!sun || !moon || !venus || !mars) {
      errors.push('Missing required planets (Sun/Moon/Venus/Mars)')
      return {
        sajuProfile: null,
        astroProfile: null,
        extendedAstroProfile: null,
        natalChart: natal,
        synastryChart: null,
        errors,
      }
    }

    const ascSign = normalizeSign(String(natal.ascendant.sign))
    const northNode = buildPlanet('True Node')

    const extended: ExtendedAstrologyProfile = {
      sun,
      moon,
      venus,
      mars,
      ascendant: {
        sign: ascSign,
        element: elementFromSign(ascSign),
      },
      mercury: buildPlanet('Mercury', true),
      jupiter: buildPlanet('Jupiter'),
      saturn: buildPlanet('Saturn'),
      uranus: buildPlanet('Uranus'),
      neptune: buildPlanet('Neptune'),
      pluto: buildPlanet('Pluto'),
      northNode,
      southNode: northNode
        ? {
            sign: oppositeSign(northNode.sign),
            element: elementFromSign(oppositeSign(northNode.sign)),
          }
        : undefined,
    }

    return {
      sajuProfile: null,
      astroProfile: extended,
      extendedAstroProfile: extended,
      natalChart: natal,
      synastryChart: toChart(natal),
      errors,
    }
  } catch (error) {
    logger.warn('[Compatibility] Failed to build astrology profile', { error })
    return {
      sajuProfile: null,
      astroProfile: null,
      extendedAstroProfile: null,
      natalChart: null,
      synastryChart: null,
      errors: ['Astrology chart calculation failed'],
    }
  }
}

function formatAspectLine(aspect: {
  from: { name: string }
  to: { name: string }
  type: AspectType
  orb: number
}) {
  const label = ASPECT_LABEL[aspect.type] || aspect.type
  return `${aspect.from.name} ${label} ${aspect.to.name} (orb ${aspect.orb.toFixed(2)}deg)`
}

function describeScoreBand(score: number) {
  if (score >= 85) return 'Excellent'
  if (score >= 75) return 'Very Good'
  if (score >= 65) return 'Good'
  if (score >= 55) return 'Workable'
  return 'Challenging'
}

function buildPairInsights(input: {
  sajuScore: number | null
  astrologyScore: number | null
  crossScore: number | null
  finalScore: number
  harmonyAspectCount: number
  tensionAspectCount: number
}) {
  const strengths: string[] = []
  const challenges: string[] = []
  const advice: string[] = []

  if (input.sajuScore !== null) {
    if (input.sajuScore >= 75) {
      strengths.push('Saju day-master and elemental flow support long-term stability.')
    } else if (input.sajuScore < 55) {
      challenges.push('Saju pattern shows different life rhythm and needs active adjustment.')
    }
  }

  if (input.astrologyScore !== null) {
    if (input.astrologyScore >= 75) {
      strengths.push('Astrology synastry supports emotional and romantic chemistry.')
    } else if (input.astrologyScore < 55) {
      challenges.push('Astrology shows communication or emotional style mismatch.')
    }
  }

  if (input.crossScore !== null) {
    if (input.crossScore >= 70) {
      strengths.push('Cross-system signal (Saju x Astrology) is consistent and coherent.')
    } else if (input.crossScore < 50) {
      challenges.push('Cross-system signal diverges, so interpretation must be handled carefully.')
    }
  }

  if (input.harmonyAspectCount >= input.tensionAspectCount) {
    strengths.push('More harmonious synastry aspects than tense aspects.')
  } else {
    challenges.push('Tense synastry aspects are dominant in current chart comparison.')
  }

  if (input.finalScore >= 80) {
    advice.push('Protect the current strengths with regular emotional check-ins.')
    advice.push('Plan shared long-term goals while momentum is strong.')
  } else if (input.finalScore >= 65) {
    advice.push('Set a weekly communication ritual to reduce misunderstandings.')
    advice.push('Use role-sharing in practical matters to reduce friction.')
  } else {
    advice.push('Define boundaries and expectations explicitly before major commitments.')
    advice.push('Treat conflict resolution as a repeatable process, not a one-time fix.')
  }

  if (input.tensionAspectCount > input.harmonyAspectCount) {
    advice.push('When conflict rises, pause first and revisit with structured dialogue.')
  }

  return {
    strengths: unique(strengths).slice(0, 4),
    challenges: unique(challenges).slice(0, 4),
    advice: unique(advice).slice(0, 5),
  }
}

function scoreText(value: number | null) {
  return value === null ? 'N/A' : `${value}/100`
}

function buildTimingPayload(
  pair: PairAnalysis | null,
  persons: PersonInput[],
  analyses: PersonAnalysis[],
  isGroup: boolean
) {
  if (!pair) return null

  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date())
  const firstPersonElement = analyses[0]?.sajuProfile
    ? elementKo(elementEnFromSaju(analyses[0].sajuProfile.dayMaster.element))
    : 'Mixed'

  const base = {
    current_month: {
      branch: monthLabel,
      element: firstPersonElement,
      analysis:
        pair.weightedScore >= 75
          ? 'Good month for transparent communication and shared plans.'
          : 'Use this month for pacing, boundary setting, and trust recovery.',
    },
  }

  if (isGroup) {
    return {
      ...base,
      group_activities: [
        {
          type: 'collaboration',
          days: 'Tue, Thu',
          activities: ['Planning sessions', 'Creative workshops'],
          reason: 'Balances strategic and emotional participation in group dynamics.',
        },
        {
          type: 'bonding',
          days: 'Sat',
          activities: ['Long-form conversation', 'Team leisure activity'],
          reason: 'Improves weaker pair links without high pressure.',
        },
      ],
    }
  }

  const firstName = persons[pair.pair[0]]?.name || `Person ${pair.pair[0] + 1}`
  const secondName = persons[pair.pair[1]]?.name || `Person ${pair.pair[1] + 1}`

  return {
    ...base,
    good_days: [
      {
        type: 'connection',
        days: 'Mon, Fri',
        activities: ['Deep talk', 'Date night'],
        reason: `${firstName} and ${secondName} can improve emotional clarity on these days.`,
      },
      {
        type: 'planning',
        days: 'Wed',
        activities: ['Financial planning', 'Routine alignment'],
        reason: 'Best for reducing practical friction and expectation mismatch.',
      },
    ],
  }
}

function buildGroupPayload(
  names: string[],
  analyses: PersonAnalysis[],
  pairAnalyses: PairAnalysis[]
): {
  groupAnalysis: Record<string, unknown> | null
  synergyBreakdown: Record<string, unknown> | null
} {
  if (names.length <= 2) {
    return { groupAnalysis: null, synergyBreakdown: null }
  }

  const oheng = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const astro = { fire: 0, earth: 0, air: 0, water: 0 }

  analyses.forEach((analysis) => {
    if (analysis.sajuProfile) {
      const key = elementEnFromSaju(analysis.sajuProfile.dayMaster.element)
      if (key in oheng) {
        oheng[key as keyof typeof oheng] += 1
      }
    }
    if (analysis.astroProfile) {
      const key = analysis.astroProfile.sun.element
      if (key in astro) {
        astro[key as keyof typeof astro] += 1
      }
    }
  })

  const dominantOheng = Object.entries(oheng).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const dominantAstro = Object.entries(astro).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const lackingOheng = Object.entries(oheng).find(([, v]) => v === 0)?.[0] ?? null
  const lackingAstro = Object.entries(astro).find(([, v]) => v === 0)?.[0] ?? null

  const roles = {
    leader: [] as string[],
    mediator: [] as string[],
    catalyst: [] as string[],
    stabilizer: [] as string[],
    creative: [] as string[],
    emotional: [] as string[],
  }

  analyses.forEach((analysis, idx) => {
    const name = names[idx]
    const sunElement = analysis.astroProfile?.sun.element
    const sajuElement = analysis.sajuProfile
      ? elementEnFromSaju(analysis.sajuProfile.dayMaster.element)
      : null

    if (sunElement === 'fire') roles.leader.push(name)
    if (sunElement === 'water') roles.emotional.push(name)
    if (sunElement === 'air') roles.catalyst.push(name)
    if (sunElement === 'earth' || sajuElement === 'metal') roles.stabilizer.push(name)
    if (sunElement === 'water' || sajuElement === 'water') roles.mediator.push(name)
    if (sunElement === 'air' || sajuElement === 'wood') roles.creative.push(name)
  })

  const pairwiseMatrix = pairAnalyses.map((pair) => ({
    pair: pair.pairLabel,
    index: pair.pair,
    saju: scoreText(pair.sajuScore),
    astro: scoreText(pair.astrologyScore),
    score: pair.weightedScore,
    summary: `${describeScoreBand(pair.weightedScore)} fit with relation weight applied.`,
    saju_details: pair.sajuScore ? [`Saju score ${pair.sajuScore}/100`] : [],
    astro_details: pair.astrologyScore ? [`Astrology score ${pair.astrologyScore}/100`] : [],
    fusion_insights: pair.strengths.slice(0, 2),
  }))

  const rawAverage = Math.round(
    pairAnalyses.reduce((sum, pair) => sum + pair.rawScore, 0) / Math.max(pairAnalyses.length, 1)
  )
  const ohengBonus = lackingOheng ? 0 : 4
  const astroBonus = lackingAstro ? 1 : 4
  const roleBonus = Object.values(roles).filter((list) => list.length > 0).length >= 4 ? 3 : 1
  const samhapBonus =
    pairAnalyses.filter((pair) => pair.crossScore !== null && (pair.crossScore || 0) >= 70)
      .length >= 2
      ? 3
      : 0
  const sizeAdjustment = names.length === 4 ? -2 : 0
  const totalScore = clamp(
    rawAverage + ohengBonus + astroBonus + roleBonus + samhapBonus + sizeAdjustment,
    0,
    100
  )

  const sortedPairs = [...pairAnalyses].sort((a, b) => b.weightedScore - a.weightedScore)
  const best = sortedPairs[0] || null
  const weakest = sortedPairs[sortedPairs.length - 1] || null

  const specialFormations: string[] = []
  if (!lackingOheng) specialFormations.push('Balanced five-element coverage')
  if (!lackingAstro) specialFormations.push('Balanced astro element coverage')
  if (pairAnalyses.some((p) => (p.crossScore || 0) >= 80)) {
    specialFormations.push('Strong cross-system resonance')
  }

  return {
    groupAnalysis: {
      element_distribution: {
        oheng,
        astro,
        dominant_oheng: dominantOheng,
        lacking_oheng: lackingOheng,
        dominant_astro: dominantAstro,
        lacking_astro: lackingAstro,
      },
      pairwise_matrix: pairwiseMatrix,
      group_roles: Object.fromEntries(
        Object.entries(roles).map(([key, value]) => [key, unique(value)])
      ),
    },
    synergyBreakdown: {
      total_score: totalScore,
      overall_score: totalScore,
      avg_pair_score: rawAverage,
      oheng_bonus: ohengBonus,
      astro_bonus: astroBonus,
      role_bonus: roleBonus,
      samhap_bonus: samhapBonus,
      size_adjustment: sizeAdjustment,
      special_formations: specialFormations,
      best_pair: {
        pair: best?.pairLabel || 'N/A',
        score: best?.weightedScore || 0,
        summary: best?.strengths?.[0] || 'No data',
      },
      weakest_pair: {
        pair: weakest?.pairLabel || 'N/A',
        score: weakest?.weightedScore || 0,
        summary: weakest?.challenges?.[0] || 'No data',
      },
    },
  }
}

function buildInterpretationMarkdown(params: {
  names: string[]
  persons: PersonInput[]
  analyses: PersonAnalysis[]
  pairAnalyses: PairAnalysis[]
  finalScore: number
}) {
  const { names, persons, analyses, pairAnalyses, finalScore } = params
  const primaryPair = pairAnalyses[0]

  if (!primaryPair) {
    return [
      '## Overall Score',
      '',
      'No pair result could be generated from the input.',
      '',
      '## Advice',
      '',
      '- Please verify date, time, latitude/longitude, and timezone for all people.',
    ].join('\n')
  }

  const [aIndex, bIndex] = primaryPair.pair
  const p1Name = names[aIndex]
  const p2Name = names[bIndex]
  const p1Saju = analyses[aIndex]?.sajuProfile
  const p2Saju = analyses[bIndex]?.sajuProfile
  const p1Astro = analyses[aIndex]?.astroProfile
  const p2Astro = analyses[bIndex]?.astroProfile

  const lines: string[] = []
  lines.push('## Overall Score')
  lines.push('')
  lines.push(
    `${primaryPair.pairLabel}: ${primaryPair.weightedScore}/100 (${describeScoreBand(primaryPair.weightedScore)})`
  )
  lines.push(`Global average across ${pairAnalyses.length} pair(s): ${finalScore}/100`)
  lines.push('This result is computed locally from Saju + Astrology + cross-system scoring.')
  lines.push('')

  lines.push('## Relationship Analysis')
  lines.push('')
  for (let i = 1; i < persons.length; i++) {
    lines.push(
      `${names[0]} ↔ ${names[i]}: ${relationLabel(persons[i].relationToP1, persons[i].relationNoteToP1)}`
    )
  }
  lines.push('')

  lines.push('## Detailed Scores')
  lines.push('')
  pairAnalyses.forEach((pair) => {
    lines.push(
      `${pair.pairLabel}: ${pair.weightedScore}/100 (Saju ${scoreText(pair.sajuScore)}, Astrology ${scoreText(pair.astrologyScore)}, Cross ${scoreText(pair.crossScore)})`
    )
  })
  lines.push('')

  lines.push('## Saju Analysis')
  lines.push('')
  if (p1Saju && p2Saju) {
    lines.push(
      `Day Master: ${p1Name} ${p1Saju.dayMaster.name} (${elementKo(elementEnFromSaju(p1Saju.dayMaster.element))}) vs ${p2Name} ${p2Saju.dayMaster.name} (${elementKo(elementEnFromSaju(p2Saju.dayMaster.element))})`
    )
    lines.push(`Saju compatibility score: ${scoreText(primaryPair.sajuScore)}`)
    lines.push(
      `Month branch interaction: ${p1Saju.pillars.month.branch} ↔ ${p2Saju.pillars.month.branch}`
    )
  } else {
    lines.push('Saju profile could not be fully computed for this pair.')
  }
  lines.push('')

  lines.push('## Astrology Analysis')
  lines.push('')
  if (p1Astro && p2Astro) {
    lines.push(
      `${p1Name}: Sun ${p1Astro.sun.sign}, Moon ${p1Astro.moon.sign}, Venus ${p1Astro.venus.sign}, Mars ${p1Astro.mars.sign}`
    )
    lines.push(
      `${p2Name}: Sun ${p2Astro.sun.sign}, Moon ${p2Astro.moon.sign}, Venus ${p2Astro.venus.sign}, Mars ${p2Astro.mars.sign}`
    )
    lines.push(`Astrology compatibility score: ${scoreText(primaryPair.astrologyScore)}`)

    if (primaryPair.topAspects.length > 0) {
      lines.push('Top synastry aspects:')
      primaryPair.topAspects.slice(0, 6).forEach((aspect) => lines.push(`- ${aspect}`))
    }
    if (primaryPair.topHouseOverlays.length > 0) {
      lines.push('Key house overlays:')
      primaryPair.topHouseOverlays.slice(0, 4).forEach((overlay) => lines.push(`- ${overlay}`))
    }
  } else {
    lines.push('Astrology profile could not be fully computed for this pair.')
  }
  lines.push('')

  lines.push('## Cross-System Analysis')
  lines.push('')
  lines.push(`Fusion score (Saju + Astrology): ${scoreText(primaryPair.fusionScore)}`)
  lines.push(`Cross-system consistency score: ${scoreText(primaryPair.crossScore)}`)
  if (primaryPair.crossScore !== null) {
    if (primaryPair.crossScore >= 75) {
      lines.push('Saju and Astrology are pointing in a similar direction.')
    } else if (primaryPair.crossScore >= 55) {
      lines.push('Saju and Astrology are partially aligned; practical tuning is important.')
    } else {
      lines.push('Saju and Astrology show different emphasis; communication quality is critical.')
    }
  }
  lines.push('')

  lines.push('## Strengths')
  lines.push('')
  primaryPair.strengths.forEach((item) => lines.push(`- ${item}`))
  lines.push('')

  lines.push('## Challenges')
  lines.push('')
  if (primaryPair.challenges.length === 0) {
    lines.push('- No major challenge signal detected from current calculations.')
  } else {
    primaryPair.challenges.forEach((item) => lines.push(`- ${item}`))
  }
  lines.push('')

  lines.push('## Advice')
  lines.push('')
  primaryPair.advice.forEach((item) => lines.push(`- ${item}`))
  lines.push('')

  lines.push('## Summary')
  lines.push('')
  lines.push(
    `${p1Name} & ${p2Name} currently rate ${primaryPair.weightedScore}/100. Focus on consistent communication and role clarity to improve long-term compatibility.`
  )

  return lines.join('\n')
}

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const rawBody = await req.json()
    const validationResult = compatibilityRequestSchema.safeParse(rawBody)

    if (!validationResult.success) {
      logger.warn('[Compatibility] validation failed', { errors: validationResult.error.issues })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const body = validationResult.data
    const persons: PersonInput[] = body.persons.map(
      (person, index) =>
        ({
          name: sanitizeString(person.name, LIMITS.NAME),
          date: person.date,
          time: person.time,
          latitude: person.latitude,
          longitude: person.longitude,
          timeZone: person.timeZone,
          city: sanitizeString(person.city, LIMITS.CITY),
          relationToP1: index > 0 ? person.relationToP1 : undefined,
          relationNoteToP1: sanitizeString(person.relationNoteToP1, MAX_NOTE),
        }) as PersonInput
    )

    const names = persons.map((person, index) => person.name?.trim() || `Person ${index + 1}`)
    const pairs: [number, number][] = []

    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        pairs.push([i, j])
      }
    }

    const personAnalyses: PersonAnalysis[] = await Promise.all(
      persons.map(async (person) => {
        const sajuProfile = buildSajuProfileFromBirth(person.date, person.time, person.timeZone)
        const astroBundle = await buildAstrologyProfileFromBirth(person)
        return {
          sajuProfile,
          astroProfile: astroBundle.astroProfile,
          extendedAstroProfile: astroBundle.extendedAstroProfile,
          natalChart: astroBundle.natalChart,
          synastryChart: astroBundle.synastryChart,
          errors: [
            ...(sajuProfile ? [] : ['Saju calculation failed']),
            ...(astroBundle.errors || []),
          ],
        }
      })
    )

    const pairAnalyses: PairAnalysis[] = []
    const pairScores: PairScore[] = []

    for (const [a, b] of pairs) {
      const analysisA = personAnalyses[a]
      const analysisB = personAnalyses[b]

      const sajuA = analysisA.sajuProfile
      const sajuB = analysisB.sajuProfile
      const astroA = analysisA.astroProfile
      const astroB = analysisB.astroProfile
      const extAstroA = analysisA.extendedAstroProfile
      const extAstroB = analysisB.extendedAstroProfile
      const chartA = analysisA.synastryChart
      const chartB = analysisB.synastryChart

      let sajuScore: number | null = null
      let astrologyScore: number | null = null
      let fusionScore: number | null = null
      let crossScore: number | null = null

      if (sajuA && sajuB) {
        try {
          const ageA = ageFromDate(persons[a].date)
          const ageB = ageFromDate(persons[b].date)
          const sajuAnalysis = performExtendedSajuAnalysis(
            sajuA,
            sajuB,
            ageA,
            ageB,
            new Date().getFullYear()
          )
          sajuScore = Math.round(sajuAnalysis.overallScore)
        } catch (error) {
          logger.warn('[Compatibility] Extended Saju analysis failed', { pair: [a, b], error })
          const fallback = calculateSajuCompatibilityOnly(sajuA, sajuB)
          sajuScore = fallback.score
        }
      }

      if (extAstroA && extAstroB) {
        try {
          const astroAnalysis = performExtendedAstrologyAnalysis(extAstroA, extAstroB, 0)
          astrologyScore = Math.round(astroAnalysis.extendedScore)
        } catch (error) {
          logger.warn('[Compatibility] Extended Astrology analysis failed', { pair: [a, b], error })
          const fallback = calculateAstrologyCompatibilityOnly(extAstroA, extAstroB)
          astrologyScore = fallback.score
        }
      }

      if (sajuA && sajuB && astroA && astroB) {
        try {
          const fusion = calculateFusionCompatibility(sajuA, astroA, sajuB, astroB)
          fusionScore = Math.round(fusion.overallScore)
        } catch (error) {
          logger.warn('[Compatibility] Fusion analysis failed', { pair: [a, b], error })
        }

        try {
          const cross = performCrossSystemAnalysis(sajuA, sajuB, astroA, astroB)
          crossScore = cross ? Math.round(cross.crossSystemScore) : null
        } catch (error) {
          logger.warn('[Compatibility] Cross-system analysis failed', { pair: [a, b], error })
        }
      }

      let rawScore = 65
      if (fusionScore !== null) {
        rawScore = fusionScore
      } else if (sajuScore !== null && astrologyScore !== null) {
        rawScore = Math.round(sajuScore * 0.55 + astrologyScore * 0.45)
      } else if (sajuScore !== null) {
        rawScore = sajuScore
      } else if (astrologyScore !== null) {
        rawScore = astrologyScore
      }

      let relationFactor = 1.0
      if (a === 0) {
        relationFactor = relationWeight(persons[b].relationToP1)
      } else if (b === 0) {
        relationFactor = relationWeight(persons[a].relationToP1)
      } else {
        relationFactor =
          (relationWeight(persons[a].relationToP1) + relationWeight(persons[b].relationToP1)) / 2
      }

      const weightedScore = Math.round(rawScore * relationFactor)
      const relation = a === 0 ? persons[b].relationToP1 : persons[a].relationToP1
      const relationNote = a === 0 ? persons[b].relationNoteToP1 : persons[a].relationNoteToP1

      const topAspects: string[] = []
      const topHouseOverlays: string[] = []
      let harmonyAspectCount = 0
      let tensionAspectCount = 0

      if (chartA && chartB) {
        try {
          const synastry = calculateSynastry({ chartA, chartB })
          const top = synastry.aspects.slice(0, 8)
          top.forEach((aspect) => topAspects.push(formatAspectLine(aspect)))

          harmonyAspectCount = synastry.aspects.filter((aspect) =>
            ['conjunction', 'trine', 'sextile'].includes(aspect.type)
          ).length
          tensionAspectCount = synastry.aspects.filter((aspect) =>
            ['square', 'opposition', 'quincunx'].includes(aspect.type)
          ).length

          synastry.houseOverlaysAtoB.slice(0, 2).forEach((overlay) => {
            topHouseOverlays.push(
              `${names[a]}'s ${overlay.planet} in ${names[b]}'s House ${overlay.inHouse}`
            )
          })
          synastry.houseOverlaysBtoA.slice(0, 2).forEach((overlay) => {
            topHouseOverlays.push(
              `${names[b]}'s ${overlay.planet} in ${names[a]}'s House ${overlay.inHouse}`
            )
          })
        } catch (error) {
          logger.warn('[Compatibility] Synastry failed', { pair: [a, b], error })
        }
      }

      const insight = buildPairInsights({
        sajuScore,
        astrologyScore,
        crossScore,
        finalScore: weightedScore,
        harmonyAspectCount,
        tensionAspectCount,
      })

      const pairLabel = `${names[a]} & ${names[b]}`
      pairAnalyses.push({
        pair: [a, b],
        pairLabel,
        relationLabel: relationLabel(relation, relationNote),
        rawScore,
        weightedScore,
        sajuScore,
        astrologyScore,
        fusionScore,
        crossScore,
        strengths: insight.strengths,
        challenges: insight.challenges,
        advice: insight.advice,
        topAspects,
        topHouseOverlays,
      })

      pairScores.push({
        pair: [a, b],
        score: weightedScore,
      })
    }

    const finalScore = pairScores.length
      ? Math.round(pairScores.reduce((sum, row) => sum + row.score, 0) / pairScores.length)
      : 0

    const primaryPair = pairAnalyses[0] || null
    const interpretation = buildInterpretationMarkdown({
      names,
      persons,
      analyses: personAnalyses,
      pairAnalyses,
      finalScore,
    })

    const isGroup = persons.length > 2
    const { groupAnalysis, synergyBreakdown } = buildGroupPayload(
      names,
      personAnalyses,
      pairAnalyses
    )
    const timing = buildTimingPayload(primaryPair, persons, personAnalyses, isGroup)
    const actionItems = unique(pairAnalyses.flatMap((pair) => pair.advice)).slice(0, 8)
    const fusionEnabled = pairAnalyses.some((pair) => pair.fusionScore !== null)

    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      try {
        await prisma.reading.create({
          data: {
            userId: session.user.id,
            type: 'compatibility',
            title: `${names.slice(0, 2).join(' & ')} Compatibility (${finalScore})`,
            content: JSON.stringify({
              score: finalScore,
              pairScores,
              interpretation: interpretation.substring(0, 1200),
              personLabels: names.map((name, index) => ({
                label: name,
                relation: index > 0 ? persons[index].relationToP1 : 'self',
              })),
            }),
          },
        })
      } catch (saveError) {
        logger.warn('[Compatibility API] Failed to save reading', { saveError })
      }
    }

    const response = NextResponse.json({
      interpretation,
      aiInterpretation: interpretation,
      aiModelUsed: 'local-fusion-v2',
      pairs: pairScores,
      pair_details: pairAnalyses,
      average: finalScore,
      overall_score: finalScore,
      timing,
      action_items: actionItems,
      fusion_enabled: fusionEnabled,
      is_group: isGroup,
      group_analysis: isGroup ? groupAnalysis : null,
      synergy_breakdown: isGroup ? synergyBreakdown : null,
    })

    response.headers.set('Cache-Control', 'no-store')
    return response
  },
  createPublicStreamGuard({
    route: 'compatibility',
    limit: 30,
    windowSeconds: 60,
  })
)
