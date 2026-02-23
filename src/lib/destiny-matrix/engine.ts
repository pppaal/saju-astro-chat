// src/lib/destiny-matrix/engine.ts
// Destiny Fusion Matrix™ - Calculation Engine

import type {
  DestinyFusionMatrixComputed,
  MatrixCalculationInput,
  MatrixCell,
  MatrixSummary,
  MatrixHighlight,
  MatrixSynergy,
  InteractionCode,
  WesternElement,
  HouseNumber,
  PlanetName,
  TransitCycle,
  BranchRelation,
  GeokgukType,
  ProgressionType,
  AdvancedAnalysisRow,
  TimingCycleRow,
  ShinsalKind,
  AsteroidName,
  ExtraPointName,
} from './types'

import type {
  FiveElement,
  SibsinKind,
  TwelveStageStandard,
  TwelveStage,
  RelationHit,
} from '../Saju/types'

// Note: 건록(建祿)과 임관(臨官)은 별개 개념
// - 건록: 특수격국 (Layer 7에서 처리)
// - 임관: 십이운성의 한 단계 (Layer 6에서 처리)
// TwelveStage 타입이 둘 다 포함하므로, 십이운성만 필터링
function toStandardStage(stage: TwelveStage): TwelveStageStandard | null {
  // 십이운성 12단계만 유효
  const validStages: TwelveStageStandard[] = [
    '장생',
    '목욕',
    '관대',
    '임관',
    '왕지',
    '쇠',
    '병',
    '사',
    '묘',
    '절',
    '태',
    '양',
  ]

  // 건록/제왕이 들어오면 십이운성이 아닌 특수 개념이므로 null 반환
  if (stage === '건록' || stage === '제왕') {
    logger.warn(`"${stage}" is not a twelve stage, but a special concept. Skipping for Layer 6.`)
    return null
  }

  return validStages.includes(stage as TwelveStageStandard) ? (stage as TwelveStageStandard) : null
}
import type { AspectType } from '../astrology/foundation/types'

import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from './data/layer1-element-core'

import { SIBSIN_PLANET_MATRIX } from './data/layer2-sibsin-planet'
import { SIBSIN_HOUSE_MATRIX } from './data/layer3-sibsin-house'
import { TIMING_OVERLAY_MATRIX } from './data/layer4-timing-overlay'
import { ASPECT_INFO, RELATION_ASPECT_MATRIX } from './data/layer5-relation-aspect'
import { TWELVE_STAGE_HOUSE_MATRIX } from './data/layer6-stage-house'
import { ADVANCED_ANALYSIS_MATRIX } from './data/layer7-advanced-analysis'
import { SHINSAL_PLANET_MATRIX } from './data/layer8-shinsal-planet'
import { ASTEROID_HOUSE_MATRIX, ASTEROID_ELEMENT_MATRIX } from './data/layer9-asteroid-house'
import {
  EXTRAPOINT_ELEMENT_MATRIX,
  EXTRAPOINT_SIBSIN_MATRIX,
} from './data/layer10-extrapoint-element'

// Import caching system
import { getCachedMatrix, setCachedMatrix, isCachingEnabled } from './cache'
import { logger } from '@/lib/logger'
import { clamp01 } from './componentScores'
import { calculateAlignmentTerm } from './alignment'
import { calculateTimeOverlapWeight } from './timeOverlap'
import { deriveComponentScoresFromLayers } from './contributionMap'
import { extractDriversAndCautions } from './drivers'
import { deriveCalendarSignals } from './calendarSignals'
import { computeDomainScores, applyTimelineToDomainScores } from './domainScoring'
import { generateMonthlyOverlapTimeline, generateTimelineByDomain } from './monthlyTimeline'

// Import house system configuration
import { HOUSE_SYSTEM_CONFIG } from './house-system'

// ===========================
// System Configuration
// ===========================

/**
 * House System Used: Placidus (default)
 *
 * Rationale:
 * - Most widely used house system globally
 * - Time-based calculations for accuracy
 * - Fallback to Whole Sign for extreme latitudes (>66°)
 *
 * Note: If user provides planetHouses, we assume they are already calculated
 * using their preferred house system. We document our default here for transparency.
 */
logger.info('Destiny Matrix using house system:', {
  default: HOUSE_SYSTEM_CONFIG.default,
  fallback: HOUSE_SYSTEM_CONFIG.fallbackForHighLatitude,
  threshold: `${HOUSE_SYSTEM_CONFIG.highLatitudeThreshold}°`,
})

// ===========================
// Helper Functions
// ===========================

function getWesternElementFromSign(sign: string): WesternElement {
  return SIGN_TO_ELEMENT[sign] || 'earth'
}

function mapRelationKindToBranchRelation(kind: string): BranchRelation | null {
  const mapping: Record<string, BranchRelation> = {
    지지삼합: 'samhap',
    지지육합: 'yukhap',
    지지방합: 'banghap',
    지지충: 'chung',
    지지형: 'hyeong',
    지지파: 'pa',
    지지해: 'hae',
    원진: 'wonjin',
    // Fallback mappings for stem-level and void relations.
    // This avoids dropping signals when mixed relation feeds are provided.
    천간합: 'yukhap',
    천간충: 'chung',
    공망: 'hae',
  }
  return mapping[kind] || null
}

function createEmptyCell(): MatrixCell {
  return {
    interaction: {
      level: 'balance',
      score: 5,
      icon: '⚖️',
      colorCode: 'blue',
      keyword: '중립',
      keywordEn: 'Neutral',
    },
  }
}

function clampScore1to10(value: number): number {
  if (value < 1) return 1
  if (value > 10) return 10
  return value
}

function getAspectDefaultMeta(aspectType: AspectType): { angle: number; orb: number } {
  const meta = ASPECT_INFO[aspectType]
  return {
    angle: typeof meta?.angle === 'number' ? meta.angle : 0,
    orb: typeof meta?.orb === 'number' ? meta.orb : 4,
  }
}

function getOrbAdjustedScore(
  baseScore: number,
  actualOrb: number | undefined,
  allowedOrb: number
): number {
  if (typeof actualOrb !== 'number' || actualOrb < 0) {
    return clampScore1to10(baseScore)
  }

  let multiplier: number
  if (actualOrb <= allowedOrb) {
    const fit = 1 - actualOrb / Math.max(allowedOrb, 0.1)
    multiplier = 1 + 0.12 * fit
  } else {
    const overflow = (actualOrb - allowedOrb) / Math.max(allowedOrb, 0.1)
    multiplier = Math.max(0.7, 1 - 0.3 * overflow)
  }

  return clampScore1to10(Math.round(baseScore * multiplier))
}

// ===========================
// Layer Calculators
// ===========================

function calculateLayer1(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}
  const sajuElements = [input.dayMasterElement, ...input.pillarElements]
  const westElement = input.dominantWesternElement || 'earth'

  // Calculate for each saju element vs western element
  for (const sajuEl of sajuElements) {
    const key = `${sajuEl}_${westElement}`
    const gridCell = ELEMENT_CORE_GRID[sajuEl]?.[westElement]
    if (gridCell) {
      results[key] = {
        interaction: gridCell,
        sajuBasis: `사주 ${sajuEl}`,
        astroBasis: `점성 ${westElement}`,
      }
    }
  }

  return results
}

function calculateLayer2(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}
  const sibsinList = Object.keys(input.sibsinDistribution) as SibsinKind[]

  for (const sibsin of sibsinList) {
    for (const [planet, house] of Object.entries(input.planetHouses)) {
      const planetName = planet as PlanetName
      const matrixCell = SIBSIN_PLANET_MATRIX[sibsin]?.[planetName]
      if (matrixCell) {
        const key = `${sibsin}_${planetName}`
        results[key] = {
          interaction: matrixCell,
          sajuBasis: `십신 ${sibsin}`,
          astroBasis: `${planetName} in H${house}`,
        }
      }
    }
  }

  return results
}

function calculateLayer3(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}
  const sibsinList = Object.keys(input.sibsinDistribution) as SibsinKind[]

  for (const sibsin of sibsinList) {
    for (const [planet, house] of Object.entries(input.planetHouses)) {
      const houseNum = house as HouseNumber
      const matrixCell = SIBSIN_HOUSE_MATRIX[sibsin]?.[houseNum]
      if (matrixCell) {
        const key = `${sibsin}_H${houseNum}`
        if (!results[key]) {
          results[key] = {
            interaction: matrixCell,
            sajuBasis: `십신 ${sibsin}`,
            astroBasis: `${planet} in H${houseNum}`,
          }
        }
      }
    }
  }

  return results
}

function calculateLayer4(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}
  const activeTransits = input.activeTransits || []

  // Determine timing row based on current luck cycle element
  let timingRow: TimingCycleRow = 'shortTerm'
  if (input.currentDaeunElement) {
    timingRow = input.currentDaeunElement
  } else if (input.currentSaeunElement) {
    timingRow = input.currentSaeunElement
  }

  for (const transit of activeTransits) {
    const matrixCell = TIMING_OVERLAY_MATRIX[timingRow]?.[transit]
    if (matrixCell) {
      const key = `${timingRow}_${transit}`
      results[key] = {
        interaction: matrixCell,
        sajuBasis: `운 ${timingRow}`,
        astroBasis: `트랜짓 ${transit}`,
      }
    }
  }

  return results
}

function calculateLayer5(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}

  for (const relation of input.relations) {
    const branchRel = mapRelationKindToBranchRelation(relation.kind)
    if (!branchRel) {
      continue
    }

    for (const aspect of input.aspects) {
      const aspectType = aspect.type
      const matrixCell = RELATION_ASPECT_MATRIX[branchRel]?.[aspectType]
      if (matrixCell) {
        const key = `${branchRel}_${aspectType}`
        const defaults = getAspectDefaultMeta(aspectType)
        const angle = typeof aspect.angle === 'number' ? aspect.angle : defaults.angle
        const allowedOrb = defaults.orb
        const adjustedScore = getOrbAdjustedScore(matrixCell.score, aspect.orb, allowedOrb)

        const candidate: MatrixCell = {
          interaction: {
            ...matrixCell,
            score: adjustedScore,
          },
          sajuBasis: `${relation.kind} (${relation.detail || ''})`,
          astroBasis: `${aspect.planet1}-${aspect.planet2} ${aspectType} angle=${angle}deg orb=${typeof aspect.orb === 'number' ? aspect.orb : 'n/a'}deg allowed=${allowedOrb}deg`,
        }

        if (!results[key] || candidate.interaction.score > results[key].interaction.score) {
          results[key] = candidate
        }
      }
    }
  }

  return results
}

function calculateLayer6(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}
  const stageList = Object.keys(input.twelveStages) as TwelveStage[]

  for (const rawStage of stageList) {
    const stage = toStandardStage(rawStage)

    // Skip if not a valid twelve stage (e.g., 건록, 제왕)
    if (!stage) {
      continue
    }

    for (const [planet, house] of Object.entries(input.planetHouses)) {
      const houseNum = house as HouseNumber
      const matrixCell = TWELVE_STAGE_HOUSE_MATRIX[stage]?.[houseNum]
      if (matrixCell) {
        const key = `${stage}_H${houseNum}`
        if (!results[key]) {
          results[key] = {
            interaction: matrixCell,
            sajuBasis: `십이운성 ${stage}`,
            astroBasis: `${planet} in H${houseNum}`,
          }
        }
      }
    }
  }

  return results
}

function calculateLayer7(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}

  // Get geokguk row
  const geokgukRow = input.geokguk || 'jeonggwan'

  // Get yongsin row if available
  const yongsinRow = input.yongsin ? (`yongsin_${input.yongsin}` as AdvancedAnalysisRow) : null

  const progressionTypes: ProgressionType[] = [
    'secondary',
    'solarArc',
    'solarReturn',
    'lunarReturn',
    'draconic',
    'harmonics',
  ]

  for (const progType of progressionTypes) {
    // Geokguk analysis
    const geokgukCell = ADVANCED_ANALYSIS_MATRIX[geokgukRow]?.[progType]
    if (geokgukCell) {
      const key = `${geokgukRow}_${progType}`
      results[key] = {
        interaction: geokgukCell,
        sajuBasis: `격국 ${geokgukRow}`,
        astroBasis: `프로그레션 ${progType}`,
      }
    }

    // Yongsin analysis
    if (yongsinRow) {
      const yongsinCell = ADVANCED_ANALYSIS_MATRIX[yongsinRow]?.[progType]
      if (yongsinCell) {
        const key = `${yongsinRow}_${progType}`
        results[key] = {
          interaction: yongsinCell,
          sajuBasis: `용신 ${input.yongsin}`,
          astroBasis: `프로그레션 ${progType}`,
        }
      }
    }
  }

  return results
}

function calculateLayer8(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}
  const shinsalList = input.shinsalList || []

  for (const shinsal of shinsalList) {
    for (const [planet, house] of Object.entries(input.planetHouses)) {
      const planetName = planet as PlanetName
      const matrixCell = SHINSAL_PLANET_MATRIX[shinsal]?.[planetName]
      if (matrixCell) {
        const key = `${shinsal}_${planetName}`
        results[key] = {
          interaction: matrixCell,
          sajuBasis: `신살 ${shinsal}`,
          astroBasis: `${planetName} in H${house}`,
        }
      }
    }
  }

  return results
}

function calculateLayer9(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}
  const asteroidHouses = input.asteroidHouses || {}

  // Asteroid-House interactions
  for (const [asteroid, house] of Object.entries(asteroidHouses)) {
    const asteroidName = asteroid as AsteroidName
    const houseNum = house as HouseNumber
    const matrixCell = ASTEROID_HOUSE_MATRIX[asteroidName]?.[houseNum]
    if (matrixCell) {
      const key = `${asteroidName}_H${houseNum}`
      results[key] = {
        interaction: matrixCell,
        sajuBasis: `소행성 ${asteroidName}`,
        astroBasis: `H${houseNum}`,
      }
    }

    // Asteroid-Element interactions
    const elementCell = ASTEROID_ELEMENT_MATRIX[asteroidName]?.[input.dayMasterElement]
    if (elementCell) {
      const elementKey = `${asteroidName}_${input.dayMasterElement}`
      results[elementKey] = {
        interaction: elementCell,
        sajuBasis: `일간 ${input.dayMasterElement}`,
        astroBasis: `소행성 ${asteroidName}`,
      }
    }
  }

  return results
}

function calculateLayer10(input: MatrixCalculationInput): Record<string, MatrixCell> {
  const results: Record<string, MatrixCell> = {}
  const extraPointSigns = input.extraPointSigns || {}

  // Extra Point - Element interactions
  for (const [point, sign] of Object.entries(extraPointSigns)) {
    const pointName = point as ExtraPointName

    // Map zodiac sign to western element, then use that to find saju element correlation
    const westElement = getWesternElementFromSign(sign)
    const elementCell = EXTRAPOINT_ELEMENT_MATRIX[pointName]?.[input.dayMasterElement]
    if (elementCell) {
      const key = `${pointName}_${input.dayMasterElement}`
      results[key] = {
        interaction: elementCell,
        sajuBasis: `일간 ${input.dayMasterElement}`,
        astroBasis: `${pointName} in ${sign}`,
      }
    }

    // Extra Point - Sibsin interactions
    const sibsinList = Object.keys(input.sibsinDistribution) as SibsinKind[]
    for (const sibsin of sibsinList) {
      const sibsinCell = EXTRAPOINT_SIBSIN_MATRIX[pointName]?.[sibsin]
      if (sibsinCell) {
        const sibsinKey = `${pointName}_${sibsin}`
        if (!results[sibsinKey]) {
          results[sibsinKey] = {
            interaction: sibsinCell,
            sajuBasis: `십신 ${sibsin}`,
            astroBasis: `${pointName} in ${sign}`,
          }
        }
      }
    }
  }

  return results
}

// ===========================
// Summary Calculator
// ===========================

function calculateSummary(
  input: MatrixCalculationInput,
  layer1: Record<string, MatrixCell>,
  layer2: Record<string, MatrixCell>,
  layer3: Record<string, MatrixCell>,
  layer4: Record<string, MatrixCell>,
  layer5: Record<string, MatrixCell>,
  layer6: Record<string, MatrixCell>,
  layer7: Record<string, MatrixCell>,
  layer8: Record<string, MatrixCell>,
  layer9: Record<string, MatrixCell>,
  layer10: Record<string, MatrixCell>
): MatrixSummary {
  const allCells: { layer: number; key: string; cell: MatrixCell }[] = []

  // Collect all cells with their layer info
  Object.entries(layer1).forEach(([key, cell]) => allCells.push({ layer: 1, key, cell }))
  Object.entries(layer2).forEach(([key, cell]) => allCells.push({ layer: 2, key, cell }))
  Object.entries(layer3).forEach(([key, cell]) => allCells.push({ layer: 3, key, cell }))
  Object.entries(layer4).forEach(([key, cell]) => allCells.push({ layer: 4, key, cell }))
  Object.entries(layer5).forEach(([key, cell]) => allCells.push({ layer: 5, key, cell }))
  Object.entries(layer6).forEach(([key, cell]) => allCells.push({ layer: 6, key, cell }))
  Object.entries(layer7).forEach(([key, cell]) => allCells.push({ layer: 7, key, cell }))
  Object.entries(layer8).forEach(([key, cell]) => allCells.push({ layer: 8, key, cell }))
  Object.entries(layer9).forEach(([key, cell]) => allCells.push({ layer: 9, key, cell }))
  Object.entries(layer10).forEach(([key, cell]) => allCells.push({ layer: 10, key, cell }))

  // Calculate total score
  const totalScore = allCells.reduce((sum, { cell }) => sum + cell.interaction.score, 0)
  const avgScore = allCells.length > 0 ? totalScore / allCells.length : 5
  const baseFinalScore = Math.round(avgScore * 10) / 10

  const layerAverages: Record<string, number> = {
    layer1: averageLayerScore(layer1),
    layer2: averageLayerScore(layer2),
    layer3: averageLayerScore(layer3),
    layer4: averageLayerScore(layer4),
    layer5: averageLayerScore(layer5),
    layer6: averageLayerScore(layer6),
    layer7: averageLayerScore(layer7),
    layer8: averageLayerScore(layer8),
    layer9: averageLayerScore(layer9),
    layer10: averageLayerScore(layer10),
  }
  const layerScoresNorm: Record<string, number> = {
    ...layerAverages,
  }

  // Categorize highlights
  const strengthPoints: MatrixHighlight[] = []
  const balancePoints: MatrixHighlight[] = []
  const cautionPoints: MatrixHighlight[] = []

  for (const { layer, key, cell } of allCells) {
    const [rowKey, colKey] = key.split('_')
    const highlight: MatrixHighlight = { layer, rowKey, colKey, cell }

    if (cell.interaction.level === 'extreme' || cell.interaction.level === 'amplify') {
      if (cell.interaction.score >= 7) {
        strengthPoints.push(highlight)
      }
    } else if (cell.interaction.level === 'balance') {
      balancePoints.push(highlight)
    } else if (cell.interaction.level === 'clash' || cell.interaction.level === 'conflict') {
      cautionPoints.push(highlight)
    }
  }

  // Sort by score
  strengthPoints.sort((a, b) => b.cell.interaction.score - a.cell.interaction.score)
  cautionPoints.sort((a, b) => a.cell.interaction.score - b.cell.interaction.score)

  // Find top synergies (cells with extreme level across multiple layers)
  const topSynergies: MatrixSynergy[] = []
  const extremeCells = allCells.filter((c) => c.cell.interaction.level === 'extreme')

  if (extremeCells.length >= 2) {
    topSynergies.push({
      layers: extremeCells.slice(0, 3).map((c) => c.layer),
      description: `${extremeCells.length}개의 극강 시너지 발견`,
      score:
        extremeCells.reduce((sum, c) => sum + c.cell.interaction.score, 0) / extremeCells.length,
    })
  }

  const componentScores = deriveComponentScoresFromLayers(layerAverages)
  const alignmentScore = calculateAlignmentTerm(
    componentScores.sajuComponentScore,
    componentScores.astroComponentScore
  )
  const { overlapStrength, timeOverlapWeight } = calculateTimeOverlapWeight(input, layer4, layer7)

  const baseFinalNorm = clamp01(baseFinalScore / 10)
  const finalScoreAdjustedNorm = clamp01(
    baseFinalNorm * (0.85 + 0.15 * alignmentScore) * timeOverlapWeight
  )
  const finalScoreAdjusted = Math.round(finalScoreAdjustedNorm * 10 * 10) / 10
  const disagreement = Math.abs(
    componentScores.sajuComponentScore - componentScores.astroComponentScore
  )
  const confidenceScore =
    Math.round(
      clamp01(0.4 + 0.4 * calculateDataCoverage(layerAverages) + 0.2 * (1 - disagreement)) * 1000
    ) / 1000
  const driverAndCaution = extractDriversAndCautions({
    alignmentScore,
    timeOverlapWeight,
    overlapStrength,
    confidenceScore,
  })
  const calendarSignals = deriveCalendarSignals({
    finalScoreAdjusted,
    timeOverlapWeight,
    alignmentScore,
    confidenceScore,
  })

  const initialDomainScores = computeDomainScores({
    input,
    layerScores: layerScoresNorm,
    baseFinalScore,
    sajuComponentScore: componentScores.sajuComponentScore,
    astroComponentScore: componentScores.astroComponentScore,
    alignmentScore,
    overlapStrength,
    timeOverlapWeight,
    confidenceScore,
  })

  const overlapTimeline = generateMonthlyOverlapTimeline({
    input,
    layer4,
    layer7,
    startYearMonth: input.startYearMonth,
    baseOverlapStrength: overlapStrength,
  })
  const overlapTimelineByDomain = generateTimelineByDomain(overlapTimeline, initialDomainScores)
  const domainScores = applyTimelineToDomainScores(initialDomainScores, overlapTimelineByDomain)

  const calendarSignalsWithTimeline = deriveCalendarSignals({
    finalScoreAdjusted,
    timeOverlapWeight,
    alignmentScore,
    confidenceScore,
    overlapTimeline,
    overlapTimelineByDomain,
  })

  return {
    totalScore: baseFinalScore,
    sajuComponentScore: Math.round(componentScores.sajuComponentScore * 1000) / 1000,
    astroComponentScore: Math.round(componentScores.astroComponentScore * 1000) / 1000,
    alignmentScore: Math.round(alignmentScore * 1000) / 1000,
    overlapStrength: Math.round(overlapStrength * 1000) / 1000,
    timeOverlapWeight: Math.round(timeOverlapWeight * 1000) / 1000,
    finalScoreAdjusted,
    confidenceScore,
    drivers: driverAndCaution.drivers,
    cautions: driverAndCaution.cautions,
    calendarSignals:
      calendarSignalsWithTimeline.length > 0 ? calendarSignalsWithTimeline : calendarSignals,
    domainScores,
    overlapTimeline,
    overlapTimelineByDomain,
    strengthPoints: strengthPoints.slice(0, 10),
    balancePoints: balancePoints.slice(0, 5),
    cautionPoints: cautionPoints.slice(0, 10),
    topSynergies: topSynergies.slice(0, 5),
  }
}

function averageLayerScore(layer: Record<string, MatrixCell>): number {
  const cells = Object.values(layer)
  if (cells.length === 0) {
    return 0
  }
  const total = cells.reduce((sum, cell) => sum + clamp01((cell.interaction?.score || 0) / 10), 0)
  return clamp01(total / cells.length)
}

function calculateDataCoverage(layerAverages: Record<string, number>): number {
  const nonZeroLayers = Object.values(layerAverages).filter((value) => value > 0).length
  return clamp01(nonZeroLayers / 10)
}

// ===========================
// Main Calculator
// ===========================

export function calculateDestinyMatrix(input: MatrixCalculationInput): DestinyFusionMatrixComputed {
  // Check cache first (if enabled)
  if (isCachingEnabled()) {
    const cached = getCachedMatrix(input)
    if (cached) {
      logger.debug('Returning cached matrix result')
      return cached
    }
  }

  // Calculate each layer
  const startTime = Date.now()

  const layer1Results = calculateLayer1(input)
  const layer2Results = calculateLayer2(input)
  const layer3Results = calculateLayer3(input)
  const layer4Results = calculateLayer4(input)
  const layer5Results = calculateLayer5(input)
  const layer6Results = calculateLayer6(input)
  const layer7Results = calculateLayer7(input)
  const layer8Results = calculateLayer8(input)
  const layer9Results = calculateLayer9(input)
  const layer10Results = calculateLayer10(input)

  // Calculate summary
  const summary = calculateSummary(
    input,
    layer1Results,
    layer2Results,
    layer3Results,
    layer4Results,
    layer5Results,
    layer6Results,
    layer7Results,
    layer8Results,
    layer9Results,
    layer10Results
  )

  const result: DestinyFusionMatrixComputed = {
    layer1_elementCore: layer1Results,
    layer2_sibsinPlanet: layer2Results,
    layer3_sibsinHouse: layer3Results,
    layer4_timing: layer4Results,
    layer5_relationAspect: layer5Results,
    layer6_stageHouse: layer6Results,
    layer7_advanced: layer7Results,
    layer8_shinsalPlanet: layer8Results,
    layer9_asteroidHouse: layer9Results,
    layer10_extraPointElement: layer10Results,
    summary,
  }

  const calculationTime = Date.now() - startTime
  logger.debug('Matrix calculation completed', { calculationTimeMs: calculationTime })

  // Store in cache (if enabled)
  if (isCachingEnabled()) {
    setCachedMatrix(input, result)
  }

  // Return calculated results for the specific input (filtered/computed cells)
  // This returns only the cells relevant to the user's data, not the full static matrices
  return result
}

// ===========================
// Individual Layer Accessors
// ===========================

export function getElementCoreInteraction(
  sajuElement: FiveElement,
  westElement: WesternElement
): InteractionCode | null {
  return ELEMENT_CORE_GRID[sajuElement]?.[westElement] || null
}

export function getSibsinPlanetInteraction(
  sibsin: SibsinKind,
  planet: PlanetName
): InteractionCode | null {
  return SIBSIN_PLANET_MATRIX[sibsin]?.[planet] || null
}

export function getSibsinHouseInteraction(
  sibsin: SibsinKind,
  house: HouseNumber
): InteractionCode | null {
  return SIBSIN_HOUSE_MATRIX[sibsin]?.[house] || null
}

export function getTimingInteraction(
  timingRow: TimingCycleRow,
  transit: TransitCycle
): InteractionCode | null {
  return TIMING_OVERLAY_MATRIX[timingRow]?.[transit] || null
}

export function getRelationAspectInteraction(
  relation: BranchRelation,
  aspect: AspectType
): InteractionCode | null {
  return RELATION_ASPECT_MATRIX[relation]?.[aspect] || null
}

export function getStageHouseInteraction(
  stage: TwelveStageStandard,
  house: HouseNumber
): InteractionCode | null {
  return TWELVE_STAGE_HOUSE_MATRIX[stage]?.[house] || null
}

export function getAdvancedAnalysisInteraction(
  row: AdvancedAnalysisRow,
  progression: ProgressionType
): InteractionCode | null {
  return ADVANCED_ANALYSIS_MATRIX[row]?.[progression] || null
}

export function getShinsalPlanetInteraction(
  shinsal: ShinsalKind,
  planet: PlanetName
): InteractionCode | null {
  return SHINSAL_PLANET_MATRIX[shinsal]?.[planet] || null
}

export function getAsteroidHouseInteraction(
  asteroid: AsteroidName,
  house: HouseNumber
): InteractionCode | null {
  return ASTEROID_HOUSE_MATRIX[asteroid]?.[house] || null
}

export function getAsteroidElementInteraction(
  asteroid: AsteroidName,
  element: FiveElement
): InteractionCode | null {
  return ASTEROID_ELEMENT_MATRIX[asteroid]?.[element] || null
}

export function getExtraPointElementInteraction(
  point: ExtraPointName,
  element: FiveElement
): InteractionCode | null {
  return EXTRAPOINT_ELEMENT_MATRIX[point]?.[element] || null
}

export function getExtraPointSibsinInteraction(
  point: ExtraPointName,
  sibsin: SibsinKind
): InteractionCode | null {
  return EXTRAPOINT_SIBSIN_MATRIX[point]?.[sibsin] || null
}

// ===========================
// Utility Functions
// ===========================

export function getInteractionColor(level: InteractionCode['level']): string {
  const colors: Record<InteractionCode['level'], string> = {
    extreme: '#9333ea', // purple
    amplify: '#22c55e', // green
    balance: '#3b82f6', // blue
    clash: '#eab308', // yellow
    conflict: '#ef4444', // red
  }
  return colors[level]
}

export function getInteractionEmoji(level: InteractionCode['level']): string {
  const emojis: Record<InteractionCode['level'], string> = {
    extreme: '💥',
    amplify: '🚀',
    balance: '⚖️',
    clash: '⚡',
    conflict: '❌',
  }
  return emojis[level]
}

export function scoreToLevel(score: number): InteractionCode['level'] {
  if (score >= 9) {
    return 'extreme'
  }
  if (score >= 7) {
    return 'amplify'
  }
  if (score >= 5) {
    return 'balance'
  }
  if (score >= 3) {
    return 'clash'
  }
  return 'conflict'
}
