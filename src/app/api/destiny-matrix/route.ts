// src/app/api/destiny-matrix/route.ts
// Destiny Fusion Matrix™ API Endpoint
// © 2024 All Rights Reserved. Proprietary Technology.

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix'
import { buildAstroTimingIndex } from '@/lib/destiny-matrix/astroTimingIndex'
import {
  buildServiceInputCrossAudit,
  ensureMatrixInputCrossCompleteness,
  listMissingCrossKeysForService,
} from '@/lib/destiny-matrix/inputCross'
import { buildMatrixSemanticContract } from '@/lib/destiny-matrix/layerSemantics'
import { buildLayerThemeProfiles } from '@/lib/destiny-matrix/layerThemeProfiles'
import { buildPremiumActionChecklist } from '@/lib/destiny-matrix/actionChecklist'
import { buildCounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
import { reportGenerator } from '@/lib/destiny-matrix/interpreter'
import { runDestinyCore } from '@/lib/destiny-matrix/core/runDestinyCore'
import { calculateSajuData } from '@/lib/Saju/saju'
import type { FiveElement } from '@/lib/Saju/types'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars, toSajuPillarsLike } from '@/lib/Saju/shinsal'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'
import type { GeokgukType, WesternElement, TransitCycle } from '@/lib/destiny-matrix/types'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { destinyMatrixCalculationSchema, destinyMatrixQuerySchema } from '@/lib/api/zodValidation'

// Map Korean element names to standard format
import {
  toDatePartsInTimeZone,
  buildApproximateIljinTiming,
  inferTransitSnapshotForDate,
  inferElementFromStemName,
  normalizeTwelveStagesInput,
  normalizeRelationsInput,
  normalizeShinsalListInput,
  normalizePlanetHousesInput,
  normalizePlanetSignsInput,
  normalizeAspectsInput,
  normalizeActiveTransitsInput,
  normalizeAsteroidHousesInput,
  normalizeExtraPointSignsInput,
  ELEMENT_MAP,
  GEOKGUK_ALIASES,
  FIVE_ELEMENT_SET,
  type TransitSyncSnapshot,
} from './routeSupport'

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
        currentWolunElement,
        currentIljinElement,
        currentIljinDate,
        astroTimingIndex,
        shinsalList = [],
        dominantWesternElement,
        planetHouses = {},
        planetSigns = {},
        aspects = [],
        activeTransits = [],
        asteroidHouses = {},
        extraPointSigns = {},
        advancedAstroSignals,
        lang = 'ko',
        startYearMonth,
      } = validationResult.data

      let dayMasterElement = providedDayMaster
      let sibsinDistribution = providedSibsin
      let calculatedPillarElements = pillarElements
      let normalizedCurrentDaeunElement = currentDaeunElement
      let normalizedCurrentSaeunElement = currentSaeunElement
      let normalizedCurrentWolunElement = currentWolunElement
      let normalizedCurrentIljinElement = currentIljinElement
      let normalizedCurrentIljinDate = currentIljinDate
      let normalizedActiveTransits = normalizeActiveTransitsInput(activeTransits)
      let normalizedAstroTimingIndex = astroTimingIndex
      let normalizedTwelveStages = normalizeTwelveStagesInput(twelveStages)
      let normalizedRelations = normalizeRelationsInput(relations)
      let normalizedShinsals = normalizeShinsalListInput(shinsalList)
      let normalizedGeokguk = geokguk
      let normalizedYongsin = yongsin
      const normalizedPlanetHouses = normalizePlanetHousesInput(planetHouses)
      const normalizedPlanetSigns = normalizePlanetSignsInput(planetSigns)
      const normalizedAspects = normalizeAspectsInput(aspects)
      const normalizedAsteroidHouses = normalizeAsteroidHousesInput(asteroidHouses)
      const normalizedExtraPointSigns = normalizeExtraPointSignsInput(extraPointSigns)
      let autoSajuData: ReturnType<typeof calculateSajuData> | null = null
      let autoTimingSync:
        | {
            today: TransitSyncSnapshot
            tomorrow: TransitSyncSnapshot
            appliedTransits: TransitCycle[]
          }
        | undefined

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

            if (!normalizedCurrentDaeunElement) {
              normalizedCurrentDaeunElement = inferElementFromStemName(
                sajuData.daeWoon?.current?.heavenlyStem
              )
            }
            if (!normalizedCurrentSaeunElement) {
              const { year: currentYear } = toDatePartsInTimeZone(new Date(), timezone)
              const currentAnnualElement =
                sajuData.unse?.annual?.find((item) => item.year === currentYear)?.element ||
                sajuData.unse?.annual?.[0]?.element
              if (currentAnnualElement && FIVE_ELEMENT_SET.has(currentAnnualElement)) {
                normalizedCurrentSaeunElement = currentAnnualElement
              }
            }
            if (!normalizedCurrentWolunElement) {
              const { year: currentYear, month: currentMonth } = toDatePartsInTimeZone(
                new Date(),
                timezone
              )
              const currentMonthlyElement =
                sajuData.unse?.monthly?.find(
                  (item) => item.year === currentYear && item.month === currentMonth
                )?.element || sajuData.unse?.monthly?.[0]?.element
              if (currentMonthlyElement && FIVE_ELEMENT_SET.has(currentMonthlyElement)) {
                normalizedCurrentWolunElement = currentMonthlyElement
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

      if (birthDate) {
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const todaySnapshot = inferTransitSnapshotForDate(birthDate, now, timezone)
        const tomorrowSnapshot = inferTransitSnapshotForDate(birthDate, tomorrow, timezone)
        const appliedTransits =
          normalizedActiveTransits.length > 0
            ? normalizedActiveTransits
            : todaySnapshot.activeTransits

        if (normalizedActiveTransits.length === 0) {
          normalizedActiveTransits = appliedTransits
        }

        autoTimingSync = {
          today: todaySnapshot,
          tomorrow: tomorrowSnapshot,
          appliedTransits,
        }
      }

      if (!normalizedAstroTimingIndex) {
        normalizedAstroTimingIndex = buildAstroTimingIndex({
          activeTransits: normalizedActiveTransits,
          advancedAstroSignals,
        })
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

      if (!normalizedCurrentIljinElement || !normalizedCurrentIljinDate) {
        const iljin = buildApproximateIljinTiming(new Date(), timezone)
        if (!normalizedCurrentIljinElement && iljin.element) {
          normalizedCurrentIljinElement = iljin.element
        }
        if (!normalizedCurrentIljinDate) {
          normalizedCurrentIljinDate = iljin.date
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
        currentDaeunElement: normalizedCurrentDaeunElement,
        currentSaeunElement: normalizedCurrentSaeunElement,
        currentWolunElement: normalizedCurrentWolunElement,
        currentIljinElement: normalizedCurrentIljinElement,
        currentIljinDate: normalizedCurrentIljinDate,
        shinsalList: normalizedShinsals,
        dominantWesternElement: dominantWesternElement as WesternElement | undefined,
        planetHouses: normalizedPlanetHouses,
        planetSigns: normalizedPlanetSigns,
        aspects: normalizedAspects,
        activeTransits: normalizedActiveTransits,
        astroTimingIndex: normalizedAstroTimingIndex,
        asteroidHouses: normalizedAsteroidHouses,
        extraPointSigns: normalizedExtraPointSigns,
        advancedAstroSignals,
        lang,
        startYearMonth,
      }
      const crossCompleteInput = ensureMatrixInputCrossCompleteness(input)
      const matrixInputCrossAudit = buildServiceInputCrossAudit(crossCompleteInput, 'matrix')
      const matrixInputCrossMissing = listMissingCrossKeysForService(
        matrixInputCrossAudit,
        'matrix'
      )

      // Calculate matrix (server-side only)
      const matrix = calculateDestinyMatrix(crossCompleteInput)
      let coreSnapshot:
        | {
            coreHash: string
            overallPhase: string
            overallPhaseLabel: string
            attackPercent: number
            defensePercent: number
            topClaimIds: string[]
            topCautionSignalIds: string[]
            canonicalConfidence: number
            topDecisionOptions: Array<{
              id: string
              domain: string
              action: string
              score: number
              confidence: number
              reversible: boolean
            }>
            quality: {
              score: number
              grade: 'A' | 'B' | 'C' | 'D'
              warnings: string[]
            }
            counselorEvidence?: ReturnType<typeof buildCounselorEvidencePacket>
          }
        | undefined
      try {
        const matrixReport = reportGenerator.generateReport(crossCompleteInput, {
          layer1_elementCore: matrix.layer1_elementCore,
          layer2_sibsinPlanet: matrix.layer2_sibsinPlanet,
          layer3_sibsinHouse: matrix.layer3_sibsinHouse,
          layer4_timing: matrix.layer4_timing,
          layer5_relationAspect: matrix.layer5_relationAspect,
          layer6_stageHouse: matrix.layer6_stageHouse,
          layer7_advanced: matrix.layer7_advanced,
          layer8_shinsalPlanet: matrix.layer8_shinsalPlanet,
          layer9_asteroidHouse: matrix.layer9_asteroidHouse,
          layer10_extraPointElement: matrix.layer10_extraPointElement,
        })
        const core = runDestinyCore({
          mode: 'comprehensive',
          lang,
          matrixInput: crossCompleteInput,
          matrixReport,
          matrixSummary: matrix.summary,
        })
        const counselorEvidence = buildCounselorEvidencePacket({
          theme: 'chat',
          lang,
          matrixInput: input,
          matrixReport,
          matrixSummary: matrix.summary,
          signalSynthesis: core.signalSynthesis,
          strategyEngine: core.strategyEngine,
          birthDate: birthDate || undefined,
        })
        coreSnapshot = {
          coreHash: core.coreHash,
          overallPhase: core.strategyEngine.overallPhase,
          overallPhaseLabel: core.strategyEngine.overallPhaseLabel,
          attackPercent: core.strategyEngine.attackPercent,
          defensePercent: core.strategyEngine.defensePercent,
          topClaimIds: core.canonical.claimIds.slice(0, 8),
          topCautionSignalIds: core.canonical.cautions.slice(0, 8),
          canonicalConfidence: core.canonical.confidence,
          topDecisionOptions: core.decisionEngine.options.slice(0, 6).map((option) => ({
            id: option.id,
            domain: option.domain,
            action: option.action,
            score: option.scores.total,
            confidence: option.confidence,
            reversible: option.reversible,
          })),
          quality: {
            score: core.quality.score,
            grade: core.quality.grade,
            warnings: core.quality.warnings.slice(0, 8),
          },
          counselorEvidence,
        }
      } catch (coreError) {
        logger.warn('Destiny Matrix core snapshot build failed (non-fatal):', coreError)
      }
      const semanticContract = buildMatrixSemanticContract(matrix)
      const layerThemeProfiles = buildLayerThemeProfiles(matrix, crossCompleteInput)
      const now = new Date()
      const tomorrowDate = new Date(now)
      tomorrowDate.setDate(tomorrowDate.getDate() + 1)
      const todayParts = toDatePartsInTimeZone(now, timezone)
      const tomorrowParts = toDatePartsInTimeZone(tomorrowDate, timezone)
      const actionChecklist = buildPremiumActionChecklist({
        summary: matrix.summary,
        locale: lang,
        todayDate: `${todayParts.year}-${String(todayParts.month).padStart(2, '0')}-${String(
          todayParts.day
        ).padStart(2, '0')}`,
        todayTransits: autoTimingSync?.today.activeTransits || normalizedActiveTransits,
        tomorrowDate: `${tomorrowParts.year}-${String(tomorrowParts.month).padStart(
          2,
          '0'
        )}-${String(tomorrowParts.day).padStart(2, '0')}`,
        tomorrowTransits: autoTimingSync?.tomorrow.activeTransits || normalizedActiveTransits,
      })

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
          actionChecklist,
          timingSync: autoTimingSync
            ? {
                today: autoTimingSync.today,
                tomorrow: autoTimingSync.tomorrow,
                appliedTransits: autoTimingSync.appliedTransits,
                currentDaeunElement: normalizedCurrentDaeunElement || null,
                currentSaeunElement: normalizedCurrentSaeunElement || null,
                currentWolunElement: normalizedCurrentWolunElement || null,
                currentIljinElement: normalizedCurrentIljinElement || null,
                currentIljinDate: normalizedCurrentIljinDate || null,
                astroTimingIndex: normalizedAstroTimingIndex || null,
              }
            : undefined,
          matrixInputCrossMissing,
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
        core: coreSnapshot,
        semantics: semanticContract,
        layerThemeProfiles,
        matrixInputCrossAudit,
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
