import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, type ApiContext } from '@/lib/api/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { LIMITS } from '@/lib/validation'
import { sanitizeString } from '@/lib/api/sanitizers'
import { logger } from '@/lib/logger'
import { calculateAstrologyCompatibilityOnly, calculateSajuCompatibilityOnly } from '@/lib/compatibility/cosmicCompatibility'
import { calculateFusionCompatibility } from '@/lib/compatibility/compatibilityFusion'
import { performCrossSystemAnalysis } from '@/lib/compatibility/crossSystemAnalysis'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import { performExtendedAstrologyAnalysis } from '@/lib/compatibility/astrology/comprehensive'
import { calculateSynastry } from '@/lib/astrology/foundation/synastry'
import type { PersonInput } from './types'
import { compatibilityRequestSchema } from '@/lib/api/zodValidation'
import { normalizeMojibakePayload } from '@/lib/text/mojibake'
import {
  MAX_NOTE,
  ageFromDate,
  buildAstrologyProfileFromBirth,
  buildGroupPayload,
  buildInterpretationMarkdown,
  buildPairInsights,
  buildSajuProfileFromBirth,
  buildTimingPayload,
  formatAspectLine,
  normalizeLocale,
  pickFusionInsights,
  relationLabel,
  relationWeight,
  unique,
  type PairAnalysis,
  type PairFusionInsights,
  type PairScore,
  type PersonAnalysis,
} from './routeSupport'
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
    const locale = normalizeLocale(body.locale || 'en')
    const persons: PersonInput[] = body.persons.map(
      (person, index) =>
        ({
          name: sanitizeString(person.name, LIMITS.NAME),
          date: person.date,
          time: person.time,
          gender: person.gender,
          latitude: person.latitude,
          longitude: person.longitude,
          timeZone: person.timeZone,
          city: sanitizeString(person.city, LIMITS.CITY),
          relationToP1: index > 0 ? person.relationToP1 : undefined,
          relationNoteToP1: sanitizeString(person.relationNoteToP1, MAX_NOTE),
        }) as PersonInput
    )

    const names = persons.map(
      (person, index) =>
        person.name?.trim() || (locale === 'ko' ? `사람 ${index + 1}` : `Person ${index + 1}`)
    )
    const pairs: [number, number][] = []

    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        pairs.push([i, j])
      }
    }

    const personAnalyses: PersonAnalysis[] = await Promise.all(
      persons.map(async (person) => {
        const sajuProfile = buildSajuProfileFromBirth(
          person.date,
          person.time,
          person.timeZone,
          person.gender
        )
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
      let fusionInsights: PairFusionInsights | null = null

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
          fusionInsights = pickFusionInsights(fusion)
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
          top.forEach((aspect) => topAspects.push(formatAspectLine(aspect, locale)))

          harmonyAspectCount = synastry.aspects.filter((aspect) =>
            ['conjunction', 'trine', 'sextile'].includes(aspect.type)
          ).length
          tensionAspectCount = synastry.aspects.filter((aspect) =>
            ['square', 'opposition', 'quincunx'].includes(aspect.type)
          ).length

          synastry.houseOverlaysAtoB.slice(0, 2).forEach((overlay) => {
            topHouseOverlays.push(
              locale === 'ko'
                ? `${names[a]}의 ${overlay.planet} → ${names[b]} 하우스 ${overlay.inHouse}`
                : `${names[a]}'s ${overlay.planet} in ${names[b]}'s House ${overlay.inHouse}`
            )
          })
          synastry.houseOverlaysBtoA.slice(0, 2).forEach((overlay) => {
            topHouseOverlays.push(
              locale === 'ko'
                ? `${names[b]}의 ${overlay.planet} → ${names[a]} 하우스 ${overlay.inHouse}`
                : `${names[b]}'s ${overlay.planet} in ${names[a]}'s House ${overlay.inHouse}`
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
        locale,
      })

      const pairLabel = `${names[a]} & ${names[b]}`
      pairAnalyses.push({
        pair: [a, b],
        pairLabel,
        relationLabel: relationLabel(locale, relation, relationNote),
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
        fusionInsights,
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
    const isGroup = persons.length > 2
    const { groupAnalysis, synergyBreakdown } = buildGroupPayload(
      names,
      personAnalyses,
      pairAnalyses,
      locale
    )
    const timing = buildTimingPayload(primaryPair, persons, personAnalyses, isGroup, locale)
    const interpretation = buildInterpretationMarkdown({
      locale,
      names,
      persons,
      analyses: personAnalyses,
      pairAnalyses,
      finalScore,
      timing,
    })
    const actionItems = unique(
      pairAnalyses.flatMap((pair) => [
        ...pair.advice,
        ...(pair.fusionInsights?.recommendedActions || []),
      ])
    ).slice(0, 10)
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

    const responsePayload = normalizeMojibakePayload({
      interpretation,
      aiInterpretation: interpretation,
      aiModelUsed: 'local-fusion-v2',
      pairs: pairScores,
      pair_details: pairAnalyses,
      average: finalScore,
      overall_score: finalScore,
      relationship_dynamics: primaryPair?.fusionInsights
        ? {
            emotionalIntensity: primaryPair.fusionInsights.emotionalIntensity,
            intellectualAlignment: primaryPair.fusionInsights.intellectualAlignment,
            spiritualConnection: primaryPair.fusionInsights.spiritualConnection,
            conflictResolutionStyle: primaryPair.fusionInsights.conflictResolutionStyle,
          }
        : null,
      future_guidance: primaryPair?.fusionInsights
        ? {
            shortTerm: primaryPair.fusionInsights.shortTerm,
            mediumTerm: primaryPair.fusionInsights.mediumTerm,
            longTerm: primaryPair.fusionInsights.longTerm,
          }
        : null,
      timing,
      action_items: actionItems,
      fusion_enabled: fusionEnabled,
      is_group: isGroup,
      group_analysis: isGroup ? groupAnalysis : null,
      synergy_breakdown: isGroup ? synergyBreakdown : null,
    })
    const response = NextResponse.json(responsePayload)

    response.headers.set('Cache-Control', 'no-store')
    return response
  },
  createPublicStreamGuard({
    route: 'compatibility',
    limit: 30,
    windowSeconds: 60,
  })
)
