// src/app/api/destiny-matrix/route.ts
// Destiny Fusion Matrix™ API Endpoint
// © 2024 All Rights Reserved. Proprietary Technology.

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix'
import { calculateSajuData } from '@/lib/Saju/saju'
import type { FiveElement, RelationHit } from '@/lib/Saju/types'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars, toSajuPillarsLike } from '@/lib/Saju/shinsal'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'
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

const PLANET_ALIASES: Record<string, PlanetName> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
}

const ASPECT_TYPES: AspectType[] = [
  'conjunction',
  'sextile',
  'square',
  'trine',
  'opposition',
  'semisextile',
  'quincunx',
  'quintile',
  'biquintile',
]

const ASPECT_TYPE_SET = new Set<string>(ASPECT_TYPES)

const TRANSIT_CYCLES: TransitCycle[] = [
  'saturnReturn',
  'jupiterReturn',
  'uranusSquare',
  'neptuneSquare',
  'plutoTransit',
  'nodeReturn',
  'eclipse',
  'mercuryRetrograde',
  'venusRetrograde',
  'marsRetrograde',
  'jupiterRetrograde',
  'saturnRetrograde',
]

const TRANSIT_CYCLE_SET = new Set<string>(TRANSIT_CYCLES)

const MATRIX_SHINSAL_SET = new Set<string>([
  '천을귀인',
  '태극귀인',
  '천덕귀인',
  '월덕귀인',
  '문창귀인',
  '학당귀인',
  '금여록',
  '천주귀인',
  '암록',
  '건록',
  '제왕',
  '도화',
  '홍염살',
  '양인',
  '백호',
  '겁살',
  '재살',
  '천살',
  '지살',
  '년살',
  '월살',
  '망신',
  '고신',
  '괴강',
  '현침',
  '귀문관',
  '병부',
  '효신살',
  '상문살',
  '역마',
  '화개',
  '장성',
  '반안',
  '천라지망',
  '공망',
  '삼재',
  '원진',
])

const SHINSAL_ALIASES: Record<string, string> = {
  금여성: '금여록',
  문창: '문창귀인',
}

const GEOKGUK_ALIASES: Partial<Record<string, GeokgukType>> = {
  정관격: 'jeonggwan',
  편관격: 'pyeongwan',
  정인격: 'jeongin',
  편인격: 'pyeongin',
  식신격: 'siksin',
  상관격: 'sanggwan',
  정재격: 'jeongjae',
  편재격: 'pyeonjae',
  건록격: 'geonrok',
  양인격: 'yangin',
  종아격: 'jonga',
  종재격: 'jongjae',
  종살격: 'jongsal',
  종강격: 'jonggang',
  종왕격: 'jonggang',
}

const RELATION_ALIASES: Record<string, string> = {
  합: '지지육합',
  충: '지지충',
  형: '지지형',
  파: '지지파',
  해: '지지해',
}

const ASTEROID_ALIASES: Record<string, AsteroidName> = {
  ceres: 'Ceres',
  pallas: 'Pallas',
  juno: 'Juno',
  vesta: 'Vesta',
}

const EXTRA_POINT_ALIASES: Record<string, ExtraPointName> = {
  chiron: 'Chiron',
  lilith: 'Lilith',
  partoffortune: 'PartOfFortune',
  part_of_fortune: 'PartOfFortune',
  vertex: 'Vertex',
  northnode: 'NorthNode',
  north_node: 'NorthNode',
  southnode: 'SouthNode',
  south_node: 'SouthNode',
}

function normalizePlanetName(value: unknown): PlanetName | null {
  if (typeof value !== 'string') {
    return null
  }
  return PLANET_ALIASES[value.trim().toLowerCase()] || null
}

function normalizeAspectType(value: unknown): AspectType | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim().toLowerCase()
  return ASPECT_TYPE_SET.has(normalized) ? (normalized as AspectType) : null
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return undefined
}

function normalizeTwelveStagesInput(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (['year', 'month', 'day', 'time'].includes(key) && typeof value === 'string') {
      normalized[value] = (normalized[value] || 0) + 1
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      normalized[key] = value
    }
  }
  return normalized
}

function normalizeRelationsInput(raw: unknown): RelationHit[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const normalized: RelationHit[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const kind = RELATION_ALIASES[item] || item
      normalized.push({ kind: kind as RelationHit['kind'], pillars: [] })
      continue
    }
    if (item && typeof item === 'object' && typeof (item as { kind?: unknown }).kind === 'string') {
      const kind = RELATION_ALIASES[(item as { kind: string }).kind] || (item as { kind: string }).kind
      const pillars = Array.isArray((item as { pillars?: unknown }).pillars)
        ? ((item as { pillars: unknown[] }).pillars.filter((p): p is RelationHit['pillars'][number] =>
            typeof p === 'string'
          ))
        : []
      normalized.push({
        kind: kind as RelationHit['kind'],
        pillars,
        detail: typeof (item as { detail?: unknown }).detail === 'string' ? (item as { detail: string }).detail : undefined,
        note: typeof (item as { note?: unknown }).note === 'string' ? (item as { note: string }).note : undefined,
      })
    }
  }
  return normalized
}

function normalizeShinsalListInput(raw: unknown): ShinsalKind[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const dedup = new Set<ShinsalKind>()
  for (const item of raw) {
    if (typeof item !== 'string') {
      continue
    }
    const normalized = SHINSAL_ALIASES[item] || item
    if (MATRIX_SHINSAL_SET.has(normalized)) {
      dedup.add(normalized as ShinsalKind)
    }
  }
  return [...dedup]
}

function normalizePlanetHousesInput(raw: unknown): Partial<Record<PlanetName, HouseNumber>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Partial<Record<PlanetName, HouseNumber>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const planet = normalizePlanetName(key)
    if (!planet || typeof value !== 'number') {
      continue
    }
    const house = Math.trunc(value)
    if (house >= 1 && house <= 12) {
      normalized[planet] = house as HouseNumber
    }
  }
  return normalized
}

function normalizePlanetSignsInput(raw: unknown): Partial<Record<PlanetName, ZodiacKo>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Partial<Record<PlanetName, ZodiacKo>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const planet = normalizePlanetName(key)
    if (!planet || typeof value !== 'string') {
      continue
    }
    normalized[planet] = value as ZodiacKo
  }
  return normalized
}

function normalizeAspectsInput(raw: unknown): MatrixCalculationInput['aspects'] {
  if (!Array.isArray(raw)) {
    return []
  }
  const normalized: MatrixCalculationInput['aspects'] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const record = item as Record<string, unknown>
    const directPlanet1 = normalizePlanetName(record.planet1)
    const directPlanet2 = normalizePlanetName(record.planet2)
    const fromPlanet = normalizePlanetName((record.from as { name?: unknown } | undefined)?.name)
    const toPlanet = normalizePlanetName((record.to as { name?: unknown } | undefined)?.name)
    const planet1 = directPlanet1 || fromPlanet
    const planet2 = directPlanet2 || toPlanet
    const type = normalizeAspectType(record.type)
    if (!planet1 || !planet2 || !type) {
      continue
    }
    normalized.push({
      planet1,
      planet2,
      type,
      angle: normalizeNumber(record.angle),
      orb: normalizeNumber(record.orb),
    })
  }
  return normalized
}

function inferTransitCycle(record: Record<string, unknown>): TransitCycle | null {
  const directType = typeof record.type === 'string' ? record.type : null
  if (directType && TRANSIT_CYCLE_SET.has(directType)) {
    return directType as TransitCycle
  }

  const tp = typeof record.transitPlanet === 'string' ? record.transitPlanet.toLowerCase() : ''
  const np = typeof record.natalPlanet === 'string' ? record.natalPlanet.toLowerCase() : ''
  const aspectType = typeof record.aspectType === 'string' ? record.aspectType.toLowerCase() : ''

  if (tp === 'saturn' && np === 'saturn' && aspectType === 'conjunction') return 'saturnReturn'
  if (tp === 'jupiter' && np === 'jupiter' && aspectType === 'conjunction') return 'jupiterReturn'
  if (tp === 'uranus' && aspectType === 'square') return 'uranusSquare'
  if (tp === 'neptune' && aspectType === 'square') return 'neptuneSquare'
  if (tp === 'pluto') return 'plutoTransit'
  if ((tp === 'northnode' || tp === 'southnode') && aspectType === 'conjunction') return 'nodeReturn'

  return null
}

function normalizeActiveTransitsInput(raw: unknown): TransitCycle[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const dedup = new Set<TransitCycle>()
  for (const item of raw) {
    if (typeof item === 'string' && TRANSIT_CYCLE_SET.has(item)) {
      dedup.add(item as TransitCycle)
      continue
    }
    if (item && typeof item === 'object') {
      const inferred = inferTransitCycle(item as Record<string, unknown>)
      if (inferred) {
        dedup.add(inferred)
      }
    }
  }
  return [...dedup]
}

function normalizeAsteroidHousesInput(raw: unknown): Partial<Record<AsteroidName, HouseNumber>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Partial<Record<AsteroidName, HouseNumber>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const asteroid = ASTEROID_ALIASES[key.trim().toLowerCase()]
    if (!asteroid || typeof value !== 'number') {
      continue
    }
    const house = Math.trunc(value)
    if (house >= 1 && house <= 12) {
      normalized[asteroid] = house as HouseNumber
    }
  }
  return normalized
}

function normalizeExtraPointSignsInput(raw: unknown): Partial<Record<ExtraPointName, ZodiacKo>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const normalized: Partial<Record<ExtraPointName, ZodiacKo>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalizedKey = key.replace(/\s+/g, '').toLowerCase()
    const point = EXTRA_POINT_ALIASES[normalizedKey]
    if (!point || typeof value !== 'string') {
      continue
    }
    normalized[point] = value as ZodiacKo
  }
  return normalized
}

/**
 * GET - Returns only summary metadata (NO raw matrix data)
 * Protected: Does not expose proprietary matrix cell data
 */
export const GET = withApiMiddleware(
  async (req: NextRequest) => {
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
            {
              layer: 9,
              name: 'Asteroid-House Matrix',
              nameKo: '소행성-하우스 매트릭스',
              cells: 68,
            },
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
  },
  createPublicStreamGuard({
    route: '/api/destiny-matrix',
    limit: 60,
    windowSeconds: 60,
  })
)

/**
 * POST - Process user data and return ONLY final results
 * Protected: Calculations happen server-side, only results are returned
 */
export const POST = withApiMiddleware(
  async (req: NextRequest) => {
    try {
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
          { status: HTTP_STATUS.BAD_REQUEST }
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
        startYearMonth,
      } = validationResult.data

      let dayMasterElement = providedDayMaster
      let sibsinDistribution = providedSibsin
      let calculatedPillarElements = pillarElements
      let normalizedTwelveStages = normalizeTwelveStagesInput(twelveStages)
      let normalizedRelations = normalizeRelationsInput(relations)
      let normalizedShinsals = normalizeShinsalListInput(shinsalList)
      let normalizedGeokguk = geokguk
      let normalizedYongsin = yongsin
      const normalizedPlanetHouses = normalizePlanetHousesInput(planetHouses)
      const normalizedPlanetSigns = normalizePlanetSignsInput(planetSigns)
      const normalizedAspects = normalizeAspectsInput(aspects)
      const normalizedActiveTransits = normalizeActiveTransitsInput(activeTransits)
      const normalizedAsteroidHouses = normalizeAsteroidHousesInput(asteroidHouses)
      const normalizedExtraPointSigns = normalizeExtraPointSignsInput(extraPointSigns)
      let autoSajuData: ReturnType<typeof calculateSajuData> | null = null

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
          autoSajuData = sajuData

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

          const normalizedPillars =
            sajuData.pillars ||
            ({
              year: sajuData.yearPillar,
              month: sajuData.monthPillar,
              day: sajuData.dayPillar,
              time: sajuData.timePillar,
            } as const)

          // Non-fatal auto enrichment: keep base matrix generation resilient.
          try {
            // Auto-compute twelve stages if missing or invalid shape.
            if (Object.keys(normalizedTwelveStages).length === 0) {
              const sajuLike = toSajuPillarsLike({
                yearPillar: sajuData.yearPillar,
                monthPillar: sajuData.monthPillar,
                dayPillar: sajuData.dayPillar,
                timePillar: sajuData.timePillar,
              })
              const stageByPillar = getTwelveStagesForPillars(sajuLike, 'day')
              normalizedTwelveStages = Object.values(stageByPillar).reduce<Record<string, number>>(
                (acc, stage) => {
                  acc[stage] = (acc[stage] || 0) + 1
                  return acc
                },
                {}
              )
            }

            // Auto-compute branch/stem relations if caller did not provide.
            if (normalizedRelations.length === 0) {
              const relationInput = toAnalyzeInputFromSaju(
                {
                  year: normalizedPillars.year,
                  month: normalizedPillars.month,
                  day: normalizedPillars.day,
                  time: normalizedPillars.time,
                },
                sajuData.dayPillar?.heavenlyStem?.name
              )
              normalizedRelations = analyzeRelations(relationInput)
            }

            // Auto-compute shinsal and normalize aliases to matrix keys.
            if (normalizedShinsals.length === 0) {
              const sajuLike = toSajuPillarsLike({
                yearPillar: sajuData.yearPillar,
                monthPillar: sajuData.monthPillar,
                dayPillar: sajuData.dayPillar,
                timePillar: sajuData.timePillar,
              })
              const autoShinsalHits = getShinsalHits(sajuLike, {
                includeLuckyDetails: true,
                includeGeneralShinsal: true,
                includeTwelveAll: true,
                useMonthCompletion: true,
              })
              normalizedShinsals = normalizeShinsalListInput(autoShinsalHits.map((hit) => hit.kind))
            }

            // Auto-populate geokguk/yongsin when omitted.
            if (!normalizedGeokguk || !normalizedYongsin || normalizedYongsin.length === 0) {
              const advanced = analyzeAdvancedSaju(
                {
                  name: sajuData.dayPillar.heavenlyStem.name,
                  element: sajuData.dayPillar.heavenlyStem.element,
                  yin_yang: sajuData.dayPillar.heavenlyStem.yin_yang || '양',
                },
                {
                  yearPillar: sajuData.yearPillar,
                  monthPillar: sajuData.monthPillar,
                  dayPillar: sajuData.dayPillar,
                  timePillar: sajuData.timePillar,
                }
              )
              if (!normalizedGeokguk) {
                normalizedGeokguk =
                  GEOKGUK_ALIASES[advanced.geokguk.type] ||
                  (normalizedGeokguk as GeokgukType | undefined)
              }
              if (!normalizedYongsin || normalizedYongsin.length === 0) {
                normalizedYongsin = [advanced.yongsin.primary]
              }
            }
          } catch (enrichmentError) {
            logger.warn('[Destiny Matrix] Auto enrichment skipped', { error: enrichmentError })
          }
        } catch (sajuError) {
          logger.error('Saju calculation failed:', sajuError)
          return NextResponse.json(
            { error: 'Failed to calculate saju from birth data' },
            { status: HTTP_STATUS.BAD_REQUEST }
          )
        }
      }

      // Keep geokguk/yongsin mapping robust in manual-input mode too.
      if (typeof normalizedGeokguk === 'string') {
        normalizedGeokguk = GEOKGUK_ALIASES[normalizedGeokguk] || normalizedGeokguk
      }
      if (Array.isArray(normalizedYongsin) && normalizedYongsin.length > 0) {
        normalizedYongsin = normalizedYongsin.map((v) => ELEMENT_MAP[v] || v)
      }

      // If callers send parsed saju objects directly, derive defaults when missing.
      if (!autoSajuData && birthDate && dayMasterElement) {
        try {
          const sajuData = calculateSajuData(
            birthDate,
            birthTime,
            gender as 'male' | 'female',
            'solar',
            timezone
          )
          autoSajuData = sajuData
        } catch {
          // No-op: manual mode may still be valid.
        }
      }

      // Note: Zod schema already validates that either birthDate or dayMasterElement is provided

      // Ensure dayMasterElement is defined
      if (!dayMasterElement) {
        return NextResponse.json(
          { error: 'Day master element could not be determined' },
          { status: 400 }
        )
      }

      // Build input
      const input: MatrixCalculationInput = {
        dayMasterElement,
        pillarElements: calculatedPillarElements,
        sibsinDistribution,
        twelveStages: normalizedTwelveStages,
        relations: normalizedRelations,
        geokguk: normalizedGeokguk as GeokgukType | undefined,
        yongsin: normalizedYongsin?.[0] as FiveElement | undefined,
        currentDaeunElement,
        currentSaeunElement,
        shinsalList: normalizedShinsals,
        dominantWesternElement: dominantWesternElement as WesternElement | undefined,
        planetHouses: normalizedPlanetHouses,
        planetSigns: normalizedPlanetSigns,
        aspects: normalizedAspects,
        activeTransits: normalizedActiveTransits,
        asteroidHouses: normalizedAsteroidHouses,
        extraPointSigns: normalizedExtraPointSigns,
        lang,
        startYearMonth,
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
          sajuComponentScore: matrix.summary.sajuComponentScore,
          astroComponentScore: matrix.summary.astroComponentScore,
          alignmentScore: matrix.summary.alignmentScore,
          overlapStrength: matrix.summary.overlapStrength,
          timeOverlapWeight: matrix.summary.timeOverlapWeight,
          finalScoreAdjusted: matrix.summary.finalScoreAdjusted,
          confidenceScore: matrix.summary.confidenceScore,
          drivers: matrix.summary.drivers || [],
          cautions: matrix.summary.cautions || [],
          calendarSignals: matrix.summary.calendarSignals || [],
          domainScores: matrix.summary.domainScores,
          overlapTimeline: matrix.summary.overlapTimeline,
          overlapTimelineByDomain: matrix.summary.overlapTimelineByDomain,
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
      return res
    } catch (error) {
      logger.error('Destiny Matrix POST error:', error)
      return NextResponse.json(
        { error: 'Failed to calculate matrix' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createPublicStreamGuard({
    route: '/api/destiny-matrix',
    limit: 20,
    windowSeconds: 60,
  })
)
