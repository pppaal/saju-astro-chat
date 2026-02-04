// src/app/api/destiny-matrix/route.ts
// Destiny Fusion Matrix™ API Endpoint
// © 2024 All Rights Reserved. Proprietary Technology.

import { NextRequest, NextResponse } from 'next/server'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix'
import { calculateSajuData } from '@/lib/Saju/saju'
import type { FiveElement, RelationHit } from '@/lib/Saju/types'
import type {
  GeokgukType,
  ShinsalKind,
  WesternElement,
  PlanetName,
  HouseNumber,
  ZodiacKo,
  AspectType,
  TransitCycle,
  AsteroidName,
  ExtraPointName,
} from '@/lib/destiny-matrix/types'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { destinyMatrixCalculationSchema, destinyMatrixQuerySchema } from '@/lib/api/zodValidation'

// Map Korean element names to standard format
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

/**
 * GET - Returns only summary metadata (NO raw matrix data)
 * Protected: Does not expose proprietary matrix cell data
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Validate query parameters
    const validationResult = destinyMatrixQuerySchema.safeParse({
      format: searchParams.get('format') || 'summary',
    })

    if (!validationResult.success) {
      logger.warn('[Destiny Matrix] GET validation failed', {
        errors: validationResult.error.issues,
      })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { format } = validationResult.data

    // Only return summary - NEVER expose raw data
    if (format === 'summary' || format === 'full') {
      return NextResponse.json({
        name: 'Destiny Fusion Matrix™',
        version: '2.0',
        copyright: '© 2024 All Rights Reserved',
        layers: [
          { layer: 1, name: 'Element Core Grid', nameKo: '기운핵심격자', cells: 20 },
          { layer: 2, name: 'Sibsin-Planet Matrix', nameKo: '십신-행성 매트릭스', cells: 100 },
          { layer: 3, name: 'Sibsin-House Matrix', nameKo: '십신-하우스 매트릭스', cells: 120 },
          {
            layer: 4,
            name: 'Timing Overlay Matrix',
            nameKo: '타이밍 오버레이 매트릭스',
            cells: 108,
          },
          {
            layer: 5,
            name: 'Relation-Aspect Matrix',
            nameKo: '형충회합-애스펙트 매트릭스',
            cells: 72,
          },
          {
            layer: 6,
            name: 'TwelveStage-House Matrix',
            nameKo: '십이운성-하우스 매트릭스',
            cells: 144,
          },
          { layer: 7, name: 'Advanced Analysis Matrix', nameKo: '고급분석 매트릭스', cells: 144 },
          { layer: 8, name: 'Shinsal-Planet Matrix', nameKo: '신살-행성 매트릭스', cells: 340 },
          { layer: 9, name: 'Asteroid-House Matrix', nameKo: '소행성-하우스 매트릭스', cells: 68 },
          {
            layer: 10,
            name: 'ExtraPoint-Element Matrix',
            nameKo: '엑스트라포인트 매트릭스',
            cells: 90,
          },
        ],
        totalCells: 1206,
        interactionLevels: [
          { level: 'extreme', meaning: '극강 시너지', scoreRange: '9-10' },
          { level: 'amplify', meaning: '증폭/강화', scoreRange: '7-8' },
          { level: 'balance', meaning: '균형/안정', scoreRange: '5-6' },
          { level: 'clash', meaning: '충돌/주의', scoreRange: '3-4' },
          { level: 'conflict', meaning: '갈등/위험', scoreRange: '1-2' },
        ],
        // NO raw data exposed - only metadata
        notice: 'Raw matrix data is proprietary and not publicly accessible.',
      })
    }

    return NextResponse.json(
      {
        error: 'Invalid format parameter',
        validFormats: ['summary'],
      },
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  } catch (error) {
    logger.error('Destiny Matrix GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve matrix info' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

/**
 * POST - Process user data and return ONLY final results
 * Protected: Calculations happen server-side, only results are returned
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`matrix-calc:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again soon.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const rawBody = await req.json()

    // Validate with Zod
    const validationResult = destinyMatrixCalculationSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Destiny Matrix] POST validation failed', {
        errors: validationResult.error.issues,
      })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const {
      birthDate,
      birthTime = '12:00',
      gender = 'male',
      timezone = 'Asia/Seoul',
      dayMasterElement: providedDayMaster,
      pillarElements = [],
      sibsinDistribution: providedSibsin = {},
      twelveStages = {},
      relations = [],
      geokguk,
      yongsin,
      currentDaeunElement,
      currentSaeunElement,
      shinsalList = [],
      dominantWesternElement,
      planetHouses = {},
      planetSigns = {},
      aspects = [],
      activeTransits = [],
      asteroidHouses = {},
      extraPointSigns = {},
      lang = 'ko',
    } = validationResult.data

    let dayMasterElement = providedDayMaster
    let sibsinDistribution = providedSibsin
    let calculatedPillarElements = pillarElements

    // If birthDate is provided, calculate saju automatically
    if (birthDate && !dayMasterElement) {
      try {
        const sajuData = calculateSajuData(
          birthDate,
          birthTime,
          gender as 'male' | 'female',
          'solar',
          timezone
        )

        // Extract day master element
        const dayElement = sajuData.dayPillar?.heavenlyStem?.element
        dayMasterElement = dayElement ? ELEMENT_MAP[dayElement] || dayElement : undefined

        // Extract pillar elements
        calculatedPillarElements = [
          sajuData.yearPillar?.heavenlyStem?.element,
          sajuData.yearPillar?.earthlyBranch?.element,
          sajuData.monthPillar?.heavenlyStem?.element,
          sajuData.monthPillar?.earthlyBranch?.element,
          sajuData.dayPillar?.heavenlyStem?.element,
          sajuData.dayPillar?.earthlyBranch?.element,
          sajuData.timePillar?.heavenlyStem?.element,
          sajuData.timePillar?.earthlyBranch?.element,
        ]
          .filter((e): e is FiveElement => Boolean(e))
          .map((e) => ELEMENT_MAP[e] || e)

        // Build sibsin distribution from pillars
        const sibsinMap: Record<string, number> = {}
        const pillars = ['yearPillar', 'monthPillar', 'dayPillar', 'timePillar'] as const
        for (const pillar of pillars) {
          const p = sajuData[pillar]
          if (p?.heavenlyStem?.sibsin) {
            sibsinMap[p.heavenlyStem.sibsin] = (sibsinMap[p.heavenlyStem.sibsin] || 0) + 1
          }
          if (p?.earthlyBranch?.sibsin) {
            sibsinMap[p.earthlyBranch.sibsin] = (sibsinMap[p.earthlyBranch.sibsin] || 0) + 1
          }
        }
        sibsinDistribution = sibsinMap
      } catch (sajuError) {
        logger.error('Saju calculation failed:', sajuError)
        return NextResponse.json(
          { error: 'Failed to calculate saju from birth data' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
    }

    // Note: Zod schema already validates that either birthDate or dayMasterElement is provided

    // Ensure dayMasterElement is defined
    if (!dayMasterElement) {
      return NextResponse.json(
        { error: 'Day master element could not be determined' },
        { status: 400, headers: limit.headers }
      )
    }

    // Build input
    const input: MatrixCalculationInput = {
      dayMasterElement,
      pillarElements: calculatedPillarElements,
      sibsinDistribution,
      twelveStages,
      relations: relations as unknown as RelationHit[],
      geokguk: geokguk as GeokgukType | undefined,
      yongsin: yongsin?.[0] as FiveElement | undefined,
      currentDaeunElement,
      currentSaeunElement,
      shinsalList: shinsalList as unknown as ShinsalKind[] | undefined,
      dominantWesternElement: dominantWesternElement as WesternElement | undefined,
      planetHouses: planetHouses as Partial<Record<PlanetName, HouseNumber>>,
      planetSigns: planetSigns as Partial<Record<PlanetName, ZodiacKo>>,
      aspects: aspects as unknown as Array<{
        planet1: PlanetName
        planet2: PlanetName
        type: AspectType
      }>,
      activeTransits: activeTransits as unknown as TransitCycle[] | undefined,
      asteroidHouses: asteroidHouses as Partial<Record<AsteroidName, HouseNumber>> | undefined,
      extraPointSigns: extraPointSigns as Partial<Record<ExtraPointName, ZodiacKo>> | undefined,
      lang,
    }

    // Calculate matrix (server-side only)
    const matrix = calculateDestinyMatrix(input)

    // Count matched cells per layer
    const cellCounts = {
      layer1: Object.keys(matrix.layer1_elementCore).length,
      layer2: Object.keys(matrix.layer2_sibsinPlanet).length,
      layer3: Object.keys(matrix.layer3_sibsinHouse).length,
      layer4: Object.keys(matrix.layer4_timing).length,
      layer5: Object.keys(matrix.layer5_relationAspect).length,
      layer6: Object.keys(matrix.layer6_stageHouse).length,
      layer7: Object.keys(matrix.layer7_advanced).length,
      layer8: Object.keys(matrix.layer8_shinsalPlanet).length,
      layer9: Object.keys(matrix.layer9_asteroidHouse).length,
      layer10: Object.keys(matrix.layer10_extraPointElement).length,
    }
    const totalCells = Object.values(cellCounts).reduce((a, b) => a + b, 0)

    // Return ONLY processed results - NOT raw matrix data
    const res = NextResponse.json({
      success: true,
      summary: {
        totalScore: matrix.summary.totalScore,
        layersProcessed: Object.keys(cellCounts).filter(
          (k) => cellCounts[k as keyof typeof cellCounts] > 0
        ).length,
        cellsMatched: totalCells,
        strengthCount: matrix.summary.strengthPoints?.length || 0,
        cautionCount: matrix.summary.cautionPoints?.length || 0,
      },
      // Return only high-level highlights, not raw cell data
      highlights: {
        strengths: matrix.summary.strengthPoints?.slice(0, 3).map((h) => ({
          layer: h.layer,
          keyword: h.cell.interaction.keyword,
          score: h.cell.interaction.score,
        })),
        cautions: matrix.summary.cautionPoints?.slice(0, 3).map((h) => ({
          layer: h.layer,
          keyword: h.cell.interaction.keyword,
          score: h.cell.interaction.score,
        })),
      },
      synergies: matrix.summary.topSynergies?.slice(0, 3),
      // Copyright notice
      copyright: '© 2024 Destiny Fusion Matrix™. All Rights Reserved.',
    })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    return res
  } catch (error) {
    logger.error('Destiny Matrix POST error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate matrix' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
