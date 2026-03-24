import { NextRequest } from 'next/server'
import {
  initializeApiContext,
  createAuthenticatedGuard,
  extractLocale,
  type MiddlewareOptions,
} from '@/lib/api/middleware'
import { createTransformedSSEStream, createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import { sanitizeLocaleText } from '@/lib/destiny-map/sanitize'
import { maskTextWithName } from '@/lib/security'
import { enforceBodySize } from '@/lib/http'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { isValidDate, isValidTime, isValidLatitude, isValidLongitude } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { parseRequestBody } from '@/lib/api/requestParser'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import {
  buildFortuneWithIcpOutputGuide,
  buildFortuneWithIcpSection,
  buildThemeDepthGuide,
  buildEvidenceGroundingGuide,
} from '@/lib/prompts/fortuneWithIcp'
import {
  toChart,
  findNatalAspects,
  calculateExtraPoints,
  calculateAllAsteroids,
  type NatalChartData,
} from '@/lib/astrology'
import {
  computeDestinyMap,
  type CombinedResult as DestinyMapCombinedResult,
} from '@/lib/destiny-map/astrology'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  buildCounselorEvidencePacket,
  formatCounselorEvidencePacket,
} from '@/lib/destiny-matrix/counselorEvidence'
import { persistDestinyPredictionSnapshot } from '@/lib/destiny-matrix/predictionSnapshot'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix'
import { buildAstroTimingIndex } from '@/lib/destiny-matrix/astroTimingIndex'
import { buildPreciseTimelineSummary } from '@/lib/destiny-matrix/monthlyTimelinePrecise'
import { applyRuntimeCalibration } from '@/lib/destiny-matrix/calibrationRuntime'
import { buildCoreEnvelope } from '@/lib/destiny-matrix/core'
import { buildMatrixSemanticContract } from '@/lib/destiny-matrix/layerSemantics'
import { buildLayerThemeProfiles } from '@/lib/destiny-matrix/layerThemeProfiles'
import {
  buildServiceInputCrossAudit,
  ensureMatrixInputCrossCompleteness,
  listMissingCrossKeysForService,
} from '@/lib/destiny-matrix/inputCross'
import type { MatrixCalculationInput, TransitCycle } from '@/lib/destiny-matrix/types'
import { calculateSajuData } from '@/lib/Saju/saju'
import type { FiveElement, PillarData } from '@/lib/Saju/types'
import { STEMS } from '@/lib/Saju/constants'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars, toSajuPillarsLike } from '@/lib/Saju/shinsal'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'

// Local modules
import { clampMessages, counselorSystemPrompt, loadPersonaMemory } from './lib'
import { loadUserProfile, type ProfileLoadResult } from './lib/profileLoader'
import { validateDestinyMapRequest } from './lib/validation'
import { calculateChartData } from './lib/chart-calculator'
import {
  buildContextSections,
  buildPredictionSection,
  buildLongTermMemorySection,
} from './lib/context-builder'
import {
  analyzeCounselorQuestion,
  buildCounselingStructureGuide,
  describeQuestionAnalysis,
  mapFocusDomainToTheme,
} from './lib/focusDomain'
import {
  describeEvidenceConfidence,
  describeExecutionStance,
  describePhaseFlow,
  describeTimingWindowTakeaways,
  describeTimingWindowNarrative,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'
import {
  assembleFinalPrompt,
} from './builders/promptAssembly'
import type { SajuDataStructure, AstroDataStructure } from './lib/types'
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine'
import type { InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import {
  buildCompactPromptSections,
  buildFocusDomainDepthGuide,
  buildFocusDomainVoiceGuide,
  buildMatrixProfileSection,
  mapFocusDomainToPromptTheme,
  type MatrixSnapshot,
} from './routePromptSupport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const GUEST_CHAT_RATE_LIMIT = {
  limit: 12,
  windowSeconds: 60,
} as const

function isCounselorStrictMatrixEnabled(): boolean {
  const raw = process.env.COUNSELOR_STRICT_MATRIX?.trim().toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  return process.env.NODE_ENV !== 'test'
}

type MatrixHighlight = { layer?: number; keyword?: string; score?: number }
type MatrixAspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition'
  | 'semisextile'
  | 'quincunx'
  | 'quintile'
  | 'biquintile'
type MatrixAspectInput = {
  planet1: string
  planet2: string
  type: MatrixAspectType
  angle?: number
  orb?: number
}

const MATRIX_PLANET_SET = new Set([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
])

const ASPECT_ANGLE_MAP: Record<MatrixAspectType, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
  semisextile: 30,
  quincunx: 150,
  quintile: 72,
  biquintile: 144,
}

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

const TRANSIT_CYCLE_SET = new Set<TransitCycle>([
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
])

const GEOKGUK_ALIASES: Partial<Record<string, MatrixCalculationInput['geokguk']>> = {
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

type CounselorUiEvidencePayload = {
  title: string
  summary: string
  bullets: string[]
}

function encodeCounselorUiEvidence(
  snapshot: MatrixSnapshot | null,
  lang: 'ko' | 'en'
): string | null {
  const core = snapshot?.core
  const packet = core?.counselorEvidence
  if (!core || !packet) return null

  const topClaim = (packet.topClaims?.[0]?.text || '').replace(/\s+/g, ' ').trim().slice(0, 140)
  const topAnchor = (packet.topAnchors?.[0]?.summary || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  const cautionSignal = (packet.selectedSignals || [])
    .find((signal) => signal.polarity === 'caution')
    ?.summary?.replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  const phase =
    core.overallPhaseLabel?.trim() || packet.strategyBrief?.overallPhaseLabel?.trim() || ''
  const focus = packet.focusDomain?.trim() || ''
  const phaseText = describePhaseFlow(phase, lang)
  const stanceText = describeExecutionStance(core.attackPercent, core.defensePercent, lang)
  const confidenceText = describeEvidenceConfidence(snapshot?.confidenceScore, lang)
  const whyStack = (packet.whyStack || []).slice(0, 2)
  const actionFocus =
    packet.actionFocusDomain?.trim() || packet.canonicalBrief?.actionFocusDomain?.trim() || ''
  const latentTopAxes = (packet.canonicalBrief?.latentTopAxes || []).slice(0, 2)
  const projectionPacket = packet as typeof packet & {
    projections?: {
      structure?: { summary?: string }
      timing?: { summary?: string }
      conflict?: { summary?: string }
      action?: { summary?: string }
      risk?: { summary?: string }
    }
  }
  const projectionStructure = projectionPacket.projections?.structure?.summary || ''
  const projectionTiming = projectionPacket.projections?.timing?.summary || ''
  const projectionConflict = projectionPacket.projections?.conflict?.summary || ''
  const projectionAction = projectionPacket.projections?.action?.summary || ''
  const projectionRisk = projectionPacket.projections?.risk?.summary || ''
  const timingTakeaways = packet.topTimingWindow
    ? describeTimingWindowTakeaways({
        domainLabel: focus || packet.topTimingWindow.domain,
        window: packet.topTimingWindow.window,
        whyNow: packet.topTimingWindow.whyNow,
        entryConditions: packet.topTimingWindow.entryConditions,
        abortConditions: packet.topTimingWindow.abortConditions,
        lang,
      })
    : []
  const timingText =
    timingTakeaways[0] ||
    (packet.topTimingWindow
      ? describeTimingWindowNarrative({
          domainLabel: focus || packet.topTimingWindow.domain,
          window: packet.topTimingWindow.window,
          whyNow: packet.topTimingWindow.whyNow,
          entryConditions: packet.topTimingWindow.entryConditions,
          abortConditions: packet.topTimingWindow.abortConditions,
          lang,
        })
      : '')
  const payload: CounselorUiEvidencePayload =
    lang === 'ko'
      ? {
          title: '왜 이런 답변이 나왔는지',
          summary: topClaim || `${focus || '지금 질문'}을 먼저 보기 위해 ${phaseText}`,
          bullets: [
            projectionStructure ? `구조 해석: ${projectionStructure}` : '',
            projectionTiming ? `타이밍 해석: ${projectionTiming}` : '',
            projectionConflict ? `충돌 해석: ${projectionConflict}` : '',
            projectionAction ? `행동 해석: ${projectionAction}` : '',
            projectionRisk ? `리스크 해석: ${projectionRisk}` : '',
            phase ? `현재 흐름: ${phaseText}` : '',
            actionFocus && actionFocus !== focus ? `행동축: 지금 우선 행동축은 ${actionFocus}` : '',
            timingText ? `타이밍 해석: ${timingText}` : '',
            timingTakeaways[1] ? `들어갈 조건: ${timingTakeaways[1]}` : '',
            timingTakeaways[2] ? `늦출 신호: ${timingTakeaways[2]}` : '',
            stanceText ? `실행 감각: ${stanceText}` : '',
            confidenceText ? `근거 상태: ${confidenceText}` : '',
            latentTopAxes.length > 0 ? `핵심 작동층: ${latentTopAxes.join(', ')}` : '',
            ...whyStack.map((line) => `왜 이렇게 보나: ${line}`),
            topAnchor ? `핵심 근거: ${topAnchor}` : '',
            cautionSignal ? `주의 신호: ${cautionSignal}` : '',
          ].filter(Boolean),
        }
      : {
          title: 'Why this answer',
          summary:
            topClaim ||
            `This answer prioritizes ${focus || 'your current concern'} because ${phaseText.toLowerCase()}`,
          bullets: [
            projectionStructure ? `Structure read: ${projectionStructure}` : '',
            projectionTiming ? `Timing read: ${projectionTiming}` : '',
            projectionConflict ? `Conflict read: ${projectionConflict}` : '',
            projectionAction ? `Action read: ${projectionAction}` : '',
            projectionRisk ? `Risk read: ${projectionRisk}` : '',
            phase ? `Current flow: ${phaseText}` : '',
            actionFocus && actionFocus !== focus ? `Action axis: ${actionFocus}` : '',
            timingText ? `Timing read: ${timingText}` : '',
            timingTakeaways[1] ? `Go conditions: ${timingTakeaways[1]}` : '',
            timingTakeaways[2] ? `Slow-down signal: ${timingTakeaways[2]}` : '',
            stanceText ? `Execution stance: ${stanceText}` : '',
            confidenceText ? `Evidence read: ${confidenceText}` : '',
            latentTopAxes.length > 0 ? `Active layers: ${latentTopAxes.join(', ')}` : '',
            ...whyStack.map((line) => `Why this matters: ${line}`),
            topAnchor ? `Primary anchor: ${topAnchor}` : '',
            cautionSignal ? `Caution signal: ${cautionSignal}` : '',
          ].filter(Boolean),
        }

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function normalizeStringList(value: unknown, limit = 6): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .slice(0, limit)
}

function mapElementToWestern(
  element: string | undefined
): 'fire' | 'earth' | 'air' | 'water' | undefined {
  if (!element) {
    return undefined
  }
  const e = element.toLowerCase()
  if (e.includes('fire') || e.includes('화')) {
    return 'fire'
  }
  if (e.includes('earth') || e.includes('토')) {
    return 'earth'
  }
  if (e.includes('air') || e.includes('금')) {
    return 'air'
  }
  if (e.includes('water') || e.includes('수')) {
    return 'water'
  }
  return undefined
}

function normalizePlanetName(name: string): string {
  const key = name.toLowerCase()
  const mapping: Record<string, string> = {
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
  return mapping[key] || name
}

function collectPlanetData(astro: AstroDataStructure | undefined): {
  planetSigns: Record<string, string>
  planetHouses: Record<string, number>
} {
  const planetSigns: Record<string, string> = {}
  const planetHouses: Record<string, number> = {}
  if (!astro || typeof astro !== 'object') {
    return { planetSigns, planetHouses }
  }

  const directPlanets = [
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ]
  for (const key of directPlanets) {
    const item = (astro as Record<string, unknown>)[key] as Record<string, unknown> | undefined
    if (!item || typeof item !== 'object') {
      continue
    }
    const pName = normalizePlanetName(key)
    const sign = typeof item.sign === 'string' ? item.sign : undefined
    const house = typeof item.house === 'number' ? item.house : Number(item.house)
    if (sign) {
      planetSigns[pName] = sign
    }
    if (Number.isFinite(house) && house >= 1 && house <= 12) {
      planetHouses[pName] = house
    }
  }

  return { planetSigns, planetHouses }
}

function deriveAdvancedAstroSignals(
  advancedAstro?: Partial<CombinedResult>
): Record<string, boolean> {
  if (!advancedAstro || typeof advancedAstro !== 'object') {
    return {}
  }
  return {
    solarReturn: !!advancedAstro.solarReturn,
    lunarReturn: !!advancedAstro.lunarReturn,
    progressions: !!advancedAstro.progressions,
    draconic: !!advancedAstro.draconic,
    harmonics: !!advancedAstro.harmonics,
    fixedStars: !!advancedAstro.fixedStars,
    eclipses: !!advancedAstro.eclipses,
    midpoints: !!advancedAstro.midpoints,
    asteroids: !!advancedAstro.asteroids,
    extraPoints: !!advancedAstro.extraPoints,
  }
}

const ADVANCED_ASTRO_REQUIRED_KEYS: Array<keyof CombinedResult> = [
  'extraPoints',
  'asteroids',
  'solarReturn',
  'lunarReturn',
  'progressions',
  'draconic',
  'harmonics',
  'fixedStars',
  'eclipses',
  'midpoints',
]

function hasAdvancedAstroCoverage(advancedAstro?: Partial<CombinedResult>): boolean {
  if (!advancedAstro || typeof advancedAstro !== 'object') {
    return false
  }
  return ADVANCED_ASTRO_REQUIRED_KEYS.every((key) => Boolean(advancedAstro[key]))
}

function pickAdvancedAstroFields(
  value: Partial<CombinedResult> | DestinyMapCombinedResult | undefined
): Partial<CombinedResult> {
  if (!value || typeof value !== 'object') {
    return {}
  }
  return {
    extraPoints: value.extraPoints,
    asteroids: value.asteroids,
    solarReturn: value.solarReturn,
    lunarReturn: value.lunarReturn,
    progressions: value.progressions,
    draconic: value.draconic,
    harmonics: value.harmonics,
    fixedStars: value.fixedStars,
    eclipses: value.eclipses,
    electional: value.electional,
    midpoints: value.midpoints,
  }
}

async function ensureAdvancedAstroData(input: {
  name?: string
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  theme: string
  advancedAstro?: Partial<CombinedResult>
}): Promise<Partial<CombinedResult> | undefined> {
  if (hasAdvancedAstroCoverage(input.advancedAstro)) {
    return input.advancedAstro
  }

  try {
    const computed = await computeDestinyMap({
      name: input.name,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      latitude: input.latitude,
      longitude: input.longitude,
      gender: input.gender,
      theme: input.theme,
    })

    const computedAdvanced = pickAdvancedAstroFields(computed)
    if (input.advancedAstro && typeof input.advancedAstro === 'object') {
      return {
        ...computedAdvanced,
        ...pickAdvancedAstroFields(input.advancedAstro),
      }
    }
    return computedAdvanced
  } catch (error) {
    logger.warn('[chat-stream] advanced astro auto-compute failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return input.advancedAstro
  }
}

async function deriveMatrixAstroInputs(natalChartData?: NatalChartData): Promise<{
  aspects: MatrixAspectInput[]
  asteroidHouses: Record<string, number>
  extraPointSigns: Record<string, string>
}> {
  const empty = {
    aspects: [] as MatrixAspectInput[],
    asteroidHouses: {} as Record<string, number>,
    extraPointSigns: {} as Record<string, string>,
  }
  if (!natalChartData) return empty

  try {
    const chart = toChart(natalChartData)
    const natalAspectsRaw = findNatalAspects(chart, { includeMinor: true, maxResults: 120 })
    const aspects: MatrixAspectInput[] = natalAspectsRaw
      .filter((a) => MATRIX_PLANET_SET.has(a.from.name) && MATRIX_PLANET_SET.has(a.to.name))
      .map((a) => {
        const t = a.type as MatrixAspectType
        return {
          planet1: a.from.name,
          planet2: a.to.name,
          type: t,
          angle: ASPECT_ANGLE_MAP[t],
          orb: typeof a.orb === 'number' ? a.orb : undefined,
        }
      })
      .slice(0, 60)

    const meta = natalChartData.meta
    if (
      !meta?.jdUT ||
      !Array.isArray(natalChartData.houses) ||
      natalChartData.houses.length === 0
    ) {
      return { ...empty, aspects }
    }

    const houseCusps = natalChartData.houses.map((h) => h.cusp)
    const asteroidHouses: Record<string, number> = {}
    try {
      const asteroids = calculateAllAsteroids(meta.jdUT, houseCusps)
      for (const key of ['Ceres', 'Pallas', 'Juno', 'Vesta'] as const) {
        const house = asteroids[key]?.house
        if (typeof house === 'number' && house >= 1 && house <= 12) {
          asteroidHouses[key] = house
        }
      }
    } catch (error) {
      logger.warn('[chat-stream] asteroid derivation failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const sun = natalChartData.planets.find((p) => p.name === 'Sun')
    const moon = natalChartData.planets.find((p) => p.name === 'Moon')
    const extraPointSigns: Record<string, string> = {}

    if (
      meta.latitude != null &&
      meta.longitude != null &&
      sun &&
      moon &&
      natalChartData.ascendant &&
      houseCusps.length > 0
    ) {
      try {
        const extras = await calculateExtraPoints(
          meta.jdUT,
          meta.latitude,
          meta.longitude,
          natalChartData.ascendant.longitude,
          sun.longitude,
          moon.longitude,
          sun.house,
          houseCusps
        )
        extraPointSigns.Chiron = extras.chiron.sign
        extraPointSigns.Lilith = extras.lilith.sign
        extraPointSigns.PartOfFortune = extras.partOfFortune.sign
        extraPointSigns.Vertex = extras.vertex.sign
      } catch (error) {
        logger.warn('[chat-stream] extra-point derivation failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { aspects, asteroidHouses, extraPointSigns }
  } catch (error) {
    logger.warn('[chat-stream] matrix astro derivation failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return empty
  }
}

function normalizeElementToFiveElement(value: unknown): FiveElement | undefined {
  if (typeof value !== 'string') return undefined
  return ELEMENT_MAP[value.trim().toLowerCase()] || ELEMENT_MAP[value.trim()]
}

function inferElementFromStemName(stemName: string | undefined): FiveElement | undefined {
  if (!stemName) return undefined
  const stem = STEMS.find((item) => item.name === stemName)
  return normalizeElementToFiveElement(stem?.element)
}

function normalizeTransitCycles(value: unknown): MatrixCalculationInput['activeTransits'] {
  if (!Array.isArray(value)) return []

  const out: TransitCycle[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      if (TRANSIT_CYCLE_SET.has(item as TransitCycle)) {
        out.push(item as TransitCycle)
      }
      continue
    }
    if (!item || typeof item !== 'object') {
      continue
    }
    const record = item as Record<string, unknown>
    const cycleCandidate =
      typeof record.cycle === 'string'
        ? record.cycle
        : typeof record.type === 'string'
          ? record.type
          : typeof record.id === 'string'
            ? record.id
            : undefined
    if (cycleCandidate && TRANSIT_CYCLE_SET.has(cycleCandidate as TransitCycle)) {
      out.push(cycleCandidate as TransitCycle)
    }
  }

  return Array.from(new Set(out))
}

function pickSajuPillars(raw: Record<string, unknown>): {
  yearPillar?: PillarData
  monthPillar?: PillarData
  dayPillar?: PillarData
  timePillar?: PillarData
} {
  const nested = raw.pillars as Record<string, unknown> | undefined
  const yearPillar = (raw.yearPillar || nested?.year) as PillarData | undefined
  const monthPillar = (raw.monthPillar || nested?.month) as PillarData | undefined
  const dayPillar = (raw.dayPillar || nested?.day) as PillarData | undefined
  const timePillar = (raw.timePillar || nested?.time) as PillarData | undefined
  return { yearPillar, monthPillar, dayPillar, timePillar }
}

function buildSibsinDistributionFromPillars(input: {
  yearPillar?: PillarData
  monthPillar?: PillarData
  dayPillar?: PillarData
  timePillar?: PillarData
}): MatrixCalculationInput['sibsinDistribution'] {
  const out: Record<string, number> = {}
  const pillars = [input.yearPillar, input.monthPillar, input.dayPillar, input.timePillar]
  for (const pillar of pillars) {
    const cheon = pillar?.heavenlyStem?.sibsin
    const ji = pillar?.earthlyBranch?.sibsin
    if (typeof cheon === 'string' && cheon.trim().length > 0) {
      out[cheon] = (out[cheon] || 0) + 1
    }
    if (typeof ji === 'string' && ji.trim().length > 0) {
      out[ji] = (out[ji] || 0) + 1
    }
  }
  return out as MatrixCalculationInput['sibsinDistribution']
}

function normalizeCalendarSignalLines(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out = value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (!item || typeof item !== 'object') return ''
      const signal = item as { level?: string; trigger?: string; score?: number }
      const trigger = signal.trigger || ''
      if (!trigger) return ''
      const scoreText =
        typeof signal.score === 'number' && Number.isFinite(signal.score)
          ? `(${signal.score.toFixed(1)})`
          : ''
      const levelText = signal.level ? `[${signal.level}] ` : ''
      return `${levelText}${trigger}${scoreText}`.trim()
    })
    .filter(Boolean)
  return Array.from(new Set(out)).slice(0, 6)
}

function normalizeOverlapTimelineLines(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out = value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (!item || typeof item !== 'object') return ''
      const point = item as {
        month?: string
        overlapStrength?: number
        peakLevel?: 'peak' | 'high' | 'normal'
      }
      const month = point.month || ''
      if (!month) return ''
      const overlapText =
        typeof point.overlapStrength === 'number' && Number.isFinite(point.overlapStrength)
          ? point.overlapStrength.toFixed(2)
          : '-'
      return `${month}:${point.peakLevel || 'normal'}:${overlapText}`
    })
    .filter(Boolean)
  return Array.from(new Set(out)).slice(0, 6)
}

function normalizeDomainScoreMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw
      continue
    }
    if (!raw || typeof raw !== 'object') continue
    const candidate = raw as { finalScoreAdjusted?: number; baseFinalScore?: number }
    if (
      typeof candidate.finalScoreAdjusted === 'number' &&
      Number.isFinite(candidate.finalScoreAdjusted)
    ) {
      out[key] = candidate.finalScoreAdjusted
      continue
    }
    if (typeof candidate.baseFinalScore === 'number' && Number.isFinite(candidate.baseFinalScore)) {
      out[key] = candidate.baseFinalScore
    }
  }
  return out
}

function buildTopLayers(highlights: MatrixHighlight[]): Array<{ layer: number; score: number }> {
  const grouped = new Map<number, number[]>()
  for (const item of highlights) {
    const layer = Number(item.layer || 0)
    const score = Number(item.score || 0)
    if (!layer || !score) {
      continue
    }
    if (!grouped.has(layer)) {
      grouped.set(layer, [])
    }
    grouped.get(layer)!.push(score)
  }

  return Array.from(grouped.entries())
    .map(([layer, scores]) => ({
      layer,
      score: Number((scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)).toFixed(2)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

async function fetchMatrixSnapshot(input: {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  lang: string
  saju?: SajuDataStructure
  astro: AstroDataStructure | undefined
  natalChartData?: NatalChartData
  advancedAstro?: Partial<CombinedResult>
  currentTransits?: unknown[]
  theme: string
  focusDomain?: InsightDomain
}): Promise<MatrixSnapshot | null> {
  try {
    const { planetSigns, planetHouses } = collectPlanetData(input.astro)
    const derived = await deriveMatrixAstroInputs(input.natalChartData)
    const advancedAstroSignals = deriveAdvancedAstroSignals(input.advancedAstro)
    const dominantWesternElement = mapElementToWestern(
      ((input.astro as Record<string, unknown> | undefined)?.dominantElement as
        | string
        | undefined) ||
        ((input.astro as Record<string, unknown> | undefined)?.dominantWesternElement as
          | string
          | undefined)
    )
    const matrixLang: 'ko' | 'en' = input.lang === 'ko' ? 'ko' : 'en'

    const hasInlineSaju = input.saju && typeof input.saju === 'object'
    let rawSaju = hasInlineSaju ? (input.saju as Record<string, unknown>) : null
    if (!rawSaju || typeof rawSaju !== 'object') {
      rawSaju = calculateSajuData(
        input.birthDate,
        input.birthTime,
        input.gender,
        'solar',
        'Asia/Seoul'
      ) as unknown as Record<string, unknown>
    }
    const { yearPillar, monthPillar, dayPillar, timePillar } = pickSajuPillars(rawSaju)

    const dayMasterElement =
      normalizeElementToFiveElement(dayPillar?.heavenlyStem?.element) ||
      normalizeElementToFiveElement(
        ((rawSaju.dayMaster as Record<string, unknown> | undefined)?.element as
          | string
          | undefined) ||
          ((rawSaju.dayMaster as Record<string, unknown> | undefined)?.heavenlyStem as
            | string
            | undefined)
      )
    if (!dayMasterElement) {
      return null
    }

    const pillarElements = [
      normalizeElementToFiveElement(yearPillar?.heavenlyStem?.element),
      normalizeElementToFiveElement(yearPillar?.earthlyBranch?.element),
      normalizeElementToFiveElement(monthPillar?.heavenlyStem?.element),
      normalizeElementToFiveElement(monthPillar?.earthlyBranch?.element),
      normalizeElementToFiveElement(dayPillar?.heavenlyStem?.element),
      normalizeElementToFiveElement(dayPillar?.earthlyBranch?.element),
      normalizeElementToFiveElement(timePillar?.heavenlyStem?.element),
      normalizeElementToFiveElement(timePillar?.earthlyBranch?.element),
    ].filter((value): value is FiveElement => Boolean(value))

    const sibsinDistribution = buildSibsinDistributionFromPillars({
      yearPillar,
      monthPillar,
      dayPillar,
      timePillar,
    })

    const dayMasterStemName = dayPillar?.heavenlyStem?.name
    let twelveStages: MatrixCalculationInput['twelveStages'] = {}
    let relations: MatrixCalculationInput['relations'] = []
    let shinsalList: MatrixCalculationInput['shinsalList']
    let geokguk: MatrixCalculationInput['geokguk']
    let yongsin: MatrixCalculationInput['yongsin']

    if (yearPillar && monthPillar && dayPillar && timePillar && dayMasterStemName) {
      try {
        const sajuLike = toSajuPillarsLike({ yearPillar, monthPillar, dayPillar, timePillar })
        const byPillar = getTwelveStagesForPillars(sajuLike, 'day')
        const stageCounts: Record<string, number> = {}
        for (const stage of Object.values(byPillar)) {
          stageCounts[stage] = (stageCounts[stage] || 0) + 1
        }
        twelveStages = stageCounts as MatrixCalculationInput['twelveStages']

        const relationInput = toAnalyzeInputFromSaju(
          {
            year: yearPillar,
            month: monthPillar,
            day: dayPillar,
            time: timePillar,
          },
          dayMasterStemName
        )
        relations = analyzeRelations(relationInput)

        const shinsalHits = getShinsalHits(sajuLike, {
          includeLuckyDetails: true,
          includeGeneralShinsal: true,
          includeTwelveAll: true,
          useMonthCompletion: true,
        })
        const normalizedShinsal = shinsalHits
          .map((hit) => {
            if (hit.kind === '금여성') return '금여록'
            if (hit.kind === '문창') return '문창귀인'
            return hit.kind
          })
          .filter((kind) => typeof kind === 'string' && kind.trim().length > 0)
        shinsalList = Array.from(
          new Set(normalizedShinsal)
        ) as MatrixCalculationInput['shinsalList']
      } catch (error) {
        logger.warn('[chat-stream] Failed to derive relation/stage/shinsal snapshot', {
          error: error instanceof Error ? error.message : String(error),
        })
      }

      try {
        const advanced = analyzeAdvancedSaju(
          {
            name: dayPillar.heavenlyStem.name,
            element: dayPillar.heavenlyStem.element,
            yin_yang: dayPillar.heavenlyStem.yin_yang || '양',
          },
          { yearPillar, monthPillar, dayPillar, timePillar }
        )
        const mappedGeokguk = GEOKGUK_ALIASES[advanced.geokguk.type]
        if (mappedGeokguk) {
          geokguk = mappedGeokguk
        }
        yongsin = normalizeElementToFiveElement(advanced.yongsin.primary)
      } catch (error) {
        logger.warn('[chat-stream] Failed to derive advanced saju snapshot', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const unse = rawSaju.unse as
      | {
          annual?: Array<{ year?: number; element?: FiveElement }>
          monthly?: Array<{ year?: number; month?: number; element?: FiveElement }>
        }
      | undefined
    const daeWoon = rawSaju.daeWoon as { current?: { heavenlyStem?: string } } | undefined
    const currentAnnual =
      unse?.annual?.find((item) => item?.year === currentYear) || unse?.annual?.[0]
    const currentMonthly =
      unse?.monthly?.find((item) => item?.year === currentYear && item?.month === currentMonth) ||
      unse?.monthly?.[0]

    const currentDaeunElement = inferElementFromStemName(daeWoon?.current?.heavenlyStem)
    const currentSaeunElement = normalizeElementToFiveElement(currentAnnual?.element)
    const currentWolunElement = normalizeElementToFiveElement(currentMonthly?.element)
    const currentIljinDate = new Date().toISOString().slice(0, 10)
    const fallbackIljinElement = currentWolunElement || currentSaeunElement || currentDaeunElement
    const astroTimingIndex = buildAstroTimingIndex({
      activeTransits: normalizeTransitCycles(input.currentTransits),
      advancedAstroSignals,
    })

    const matrixInput: MatrixCalculationInput = {
      dayMasterElement,
      pillarElements,
      sibsinDistribution,
      twelveStages,
      relations,
      geokguk,
      yongsin,
      currentDaeunElement,
      currentSaeunElement,
      currentWolunElement,
      currentIljinElement: fallbackIljinElement,
      currentIljinDate,
      shinsalList,
      dominantWesternElement,
      planetHouses: planetHouses as MatrixCalculationInput['planetHouses'],
      planetSigns: planetSigns as MatrixCalculationInput['planetSigns'],
      aspects: derived.aspects as MatrixCalculationInput['aspects'],
      activeTransits: normalizeTransitCycles(input.currentTransits),
      astroTimingIndex,
      asteroidHouses: derived.asteroidHouses as MatrixCalculationInput['asteroidHouses'],
      extraPointSigns: derived.extraPointSigns as MatrixCalculationInput['extraPointSigns'],
      advancedAstroSignals,
      sajuSnapshot: rawSaju,
      astrologySnapshot: input.natalChartData
        ? ({ natalChart: input.natalChartData } as MatrixCalculationInput['astrologySnapshot'])
        : undefined,
      crossSnapshot: {
        source: 'chat-stream',
        theme: input.theme,
      } satisfies NonNullable<MatrixCalculationInput['crossSnapshot']>,
      currentDateIso: new Date().toISOString().slice(0, 10),
      profileContext: {
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        analysisAt: new Date().toISOString(),
      },
      lang: matrixLang,
      startYearMonth: `${new Date().getFullYear()}-01`,
    }
    const crossCompleteInput = ensureMatrixInputCrossCompleteness(matrixInput)
    const crossAudit = buildServiceInputCrossAudit(crossCompleteInput, 'counselor')
    const crossMissingKeys = listMissingCrossKeysForService(crossAudit, 'counselor')
    const coreEnvelope = buildCoreEnvelope({
      mode: 'comprehensive',
      lang: matrixLang,
      matrixInput: crossCompleteInput,
      matrixCalculator: calculateDestinyMatrix,
    })
    const normalizedMatrixInput = coreEnvelope.normalizedInput
    const matrix = coreEnvelope.matrix
    const matrixReport = coreEnvelope.matrixReport
    const core = coreEnvelope.coreSeed
    let matrixSummaryForCounselor =
      matrix && typeof matrix === 'object' && 'summary' in matrix ? matrix.summary : undefined

    if (matrixSummaryForCounselor) {
      try {
        const preciseTimelineSummary = await buildPreciseTimelineSummary(
          normalizedMatrixInput,
          matrixSummaryForCounselor,
          (timelineInput) =>
            calculateDestinyMatrix(timelineInput, { skipTimelineRecompute: true }).summary
        )
        matrixSummaryForCounselor = {
          ...matrixSummaryForCounselor,
          ...preciseTimelineSummary,
        }
        logger.info('[chat-stream] Applied precise monthly timing summary', {
          overlapTimelineCount: matrixSummaryForCounselor.overlapTimeline?.length || 0,
          reliabilityBand: matrixSummaryForCounselor.timingCalibration?.reliabilityBand || null,
        })
      } catch (preciseTimingError) {
        logger.warn('[chat-stream] Precise monthly timing summary failed; using base summary', {
          error:
            preciseTimingError instanceof Error
              ? preciseTimingError.message
              : String(preciseTimingError),
        })
      }
    }
    if (matrixSummaryForCounselor?.timingCalibration) {
      const actionTimingWindow = core.canonical.domainTimingWindows.find(
        (item) => item.domain === core.canonical.actionFocusDomain
      )
      const calibratedTiming = await applyRuntimeCalibration(
        matrixSummaryForCounselor.timingCalibration,
        {
          service: 'counselor',
          actionFocusDomain: core.canonical.actionFocusDomain,
          timingWindow: actionTimingWindow?.window,
          timingGranularity: actionTimingWindow?.timingGranularity,
          overlapTimeline: matrixSummaryForCounselor.overlapTimeline,
          overlapTimelineByDomain: matrixSummaryForCounselor.overlapTimelineByDomain,
        }
      )
      if (calibratedTiming) {
        matrixSummaryForCounselor = {
          ...matrixSummaryForCounselor,
          timingCalibration: calibratedTiming,
        }
      }
    }

    const counselorEvidence = buildCounselorEvidencePacket({
      theme: input.theme as Parameters<typeof buildCounselorEvidencePacket>[0]['theme'],
      lang: matrixLang,
      focusDomainOverride: input.focusDomain,
      matrixInput: normalizedMatrixInput,
      matrixReport,
      matrixSummary: matrixSummaryForCounselor || matrix.summary,
      signalSynthesis: core.signalSynthesis,
      strategyEngine: core.strategyEngine,
      birthDate: input.birthDate,
    })
    const semantics = buildMatrixSemanticContract(matrix)
    const layerThemeProfiles = buildLayerThemeProfiles(matrix, normalizedMatrixInput)

    const strengths: MatrixHighlight[] = (
      (matrixSummaryForCounselor || matrix.summary).strengthPoints || []
    ).map((point) => ({
      layer: point.layer,
      keyword: point.cell?.interaction?.keyword || '',
      score: point.cell?.interaction?.score || 0,
    }))
    const cautions: MatrixHighlight[] = (
      (matrixSummaryForCounselor || matrix.summary).cautionPoints || []
    ).map((point) => ({
      layer: point.layer,
      keyword: point.cell?.interaction?.keyword || '',
      score: point.cell?.interaction?.score || 0,
    }))
    const merged = [...strengths, ...cautions]
    const topLayers = buildTopLayers(merged)
    const highlights = merged
      .map((item) => `${item.keyword || 'n/a'}(${Number(item.score || 0).toFixed(1)})`)
      .slice(0, 5)
    const synergies = ((matrixSummaryForCounselor || matrix.summary).topSynergies || [])
      .map(
        (item) =>
          `${item.description || 'synergy'}${
            typeof item.score === 'number' ? `(${Number(item.score).toFixed(1)})` : ''
          }`
      )
      .slice(0, 3)
    const semanticHints = (semantics.layers || [])
      .filter((layer) => layer.active)
      .slice(0, 6)
      .map((layer) => {
        const name = matrixLang === 'ko' ? layer.nameKo : layer.nameEn
        const meaning = matrixLang === 'ko' ? layer.meaningKo : layer.meaningEn
        return `${name || layer.id}[${layer.signalStrength}/${layer.matchedCells}] ${meaning || ''}`.trim()
      })
    const themeDomainMap: Record<string, string> = {
      love: 'love',
      family: 'love',
      career: 'career',
      wealth: 'money',
      health: 'health',
      today: 'career',
      month: 'career',
      year: 'career',
      life: 'career',
      chat: 'general',
    }
    const themeDomain = input.focusDomain || themeDomainMap[input.theme] || 'career'
    const layerThemeBriefs = (layerThemeProfiles || [])
      .slice(0, 6)
      .map((layer) => {
        const insight = (layer.themeInsights || []).find((item) => item.domain === themeDomain)
        const summary = matrixLang === 'ko' ? insight?.summaryKo : insight?.summaryEn
        if (!summary) return ''
        return `${layer.layerNameKo || layer.layerId || 'layer'}: ${summary}`
      })
      .filter(Boolean)

    return {
      totalScore: Number((matrixSummaryForCounselor || matrix.summary).totalScore || 0),
      topLayers,
      highlights,
      synergies,
      drivers: normalizeStringList((matrixSummaryForCounselor || matrix.summary).drivers, 6),
      cautions: normalizeStringList((matrixSummaryForCounselor || matrix.summary).cautions, 6),
      calendarSignals: normalizeCalendarSignalLines(
        (matrixSummaryForCounselor || matrix.summary).calendarSignals
      ),
      overlapTimeline: normalizeOverlapTimelineLines(
        (matrixSummaryForCounselor || matrix.summary).overlapTimeline
      ),
      domainScores: normalizeDomainScoreMap(
        (matrixSummaryForCounselor || matrix.summary).domainScores
      ),
      confidenceScore:
        typeof (matrixSummaryForCounselor || matrix.summary).confidenceScore === 'number'
          ? (matrixSummaryForCounselor || matrix.summary).confidenceScore
          : undefined,
      finalScoreAdjusted:
        typeof (matrixSummaryForCounselor || matrix.summary).finalScoreAdjusted === 'number'
          ? (matrixSummaryForCounselor || matrix.summary).finalScoreAdjusted
          : undefined,
      semanticHints,
      layerThemeBriefs,
      core: {
        coreHash: core.coreHash,
        overallPhase: core.strategyEngine.overallPhase,
        overallPhaseLabel: core.strategyEngine.overallPhaseLabel,
        attackPercent: core.strategyEngine.attackPercent,
        defensePercent: core.strategyEngine.defensePercent,
        topClaimIds: core.canonical.claimIds.slice(0, 8),
        topCautionSignalIds: core.canonical.cautions.slice(0, 8),
        counselorEvidence,
        quality: {
          score: core.quality.score,
          grade: core.quality.grade,
          warnings: core.quality.warnings.slice(0, 8),
          dataQuality: {
            missingFields: core.quality.dataQuality.missingFields.slice(0, 8),
            derivedFields: core.quality.dataQuality.derivedFields.slice(0, 8),
            conflictingFields: core.quality.dataQuality.conflictingFields.slice(0, 8),
            qualityPenalties: core.quality.dataQuality.qualityPenalties.slice(0, 10),
            confidenceReason: core.quality.dataQuality.confidenceReason,
          },
        },
      },
      globalConflictPolicy: semantics.globalConflictPolicy,
      lowConfidencePolicy: semantics.lowConfidencePolicy,
      inputCrossMissing: crossMissingKeys,
    }
  } catch (error) {
    logger.warn('[chat-stream] Matrix snapshot build failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export async function POST(req: NextRequest) {
  // Declare context at function scope so it's accessible in catch block for credit refund
  let context: Awaited<ReturnType<typeof initializeApiContext>>['context'] | null = null
  let isGuestMode = true

  try {
    const oversized = enforceBodySize(req, 256 * 1024) // 256KB for large chart data
    if (oversized) {
      return oversized
    }

    // Build both guard presets up front.
    // Logged-in users keep the existing auth + credit policy.
    const authedGuardOptions = createAuthenticatedGuard({
      route: 'destiny-map-chat-stream',
      limit: 60,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'reading',
      creditAmount: 1,
    })

    const guestGuardOptions: MiddlewareOptions = {
      route: 'destiny-map-chat-stream-guest',
      rateLimit: {
        limit: GUEST_CHAT_RATE_LIMIT.limit,
        windowSeconds: GUEST_CHAT_RATE_LIMIT.windowSeconds,
      },
    }

    let prefersAuthedGuard = false
    try {
      const session = await getServerSession(authOptions)
      prefersAuthedGuard = Boolean(session?.user)
    } catch {
      prefersAuthedGuard = false
    }

    let initialized = await initializeApiContext(
      req,
      prefersAuthedGuard ? authedGuardOptions : guestGuardOptions
    )

    // If auth precheck was stale, fall back to guest mode instead of hard-blocking.
    if (prefersAuthedGuard && initialized.error && initialized.error.status === 401) {
      initialized = await initializeApiContext(req, guestGuardOptions)
    }

    const { context: ctx, error } = initialized
    context = ctx
    if (error) {
      return error
    }
    isGuestMode = !context.userId

    const userId = context.userId

    // Parse and validate request body using Zod
    const body = await parseRequestBody<Record<string, unknown>>(req, {
      context: 'Destiny-map Chat-stream',
    })
    if (!body) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }

    const validation = validateDestinyMapRequest(body)
    if (!validation.success) {
      logger.warn('[chat-stream] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }

    const validated = validation.data
    const {
      name,
      birthDate,
      birthTime,
      gender,
      latitude,
      longitude,
      theme,
      lang,
      messages,
      saju,
      astro,
      advancedAstro,
      predictionContext,
      userContext,
      cvText,
      counselingBrief,
    } = validated
    const trimmedHistory = clampMessages(messages)
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
    const questionAnalysis = analyzeCounselorQuestion({
      lastUserMessage: lastUser?.content,
      theme,
    })
    const inferredTheme = mapFocusDomainToTheme(questionAnalysis.primaryDomain)
    const effectiveTheme = theme === 'chat' ? inferredTheme : theme

    // ========================================
    // AUTO-LOAD: Try to load birth info from user profile if missing
    // ========================================
    let effectiveBirthDate = birthDate || ''
    let effectiveBirthTime = birthTime || ''
    let effectiveLatitude = latitude || 0
    let effectiveLongitude = longitude || 0
    let effectiveGender = gender
    let effectiveSaju = saju
    let effectiveAstro = astro

    const needsProfileLoad = userId && (!birthDate || !birthTime || !latitude || !longitude)

    if (needsProfileLoad) {
      try {
        const profileResult: ProfileLoadResult = await loadUserProfile(
          userId,
          birthDate,
          birthTime,
          latitude,
          longitude,
          saju as SajuDataStructure | undefined,
          astro as AstroDataStructure | undefined
        )
        if (profileResult.saju) {
          effectiveSaju = profileResult.saju
        }
        if (profileResult.astro) {
          effectiveAstro = profileResult.astro
        }
        if (profileResult.birthDate) {
          effectiveBirthDate = profileResult.birthDate
        }
        if (profileResult.birthTime) {
          effectiveBirthTime = profileResult.birthTime
        }
        if (profileResult.latitude) {
          effectiveLatitude = profileResult.latitude
        }
        if (profileResult.longitude) {
          effectiveLongitude = profileResult.longitude
        }
        if (profileResult.gender) {
          effectiveGender = profileResult.gender as 'male' | 'female'
        }
      } catch (profileError) {
        logger.warn('[chat-stream] Failed to load user profile, proceeding with provided data', {
          userId,
          error: profileError instanceof Error ? profileError.message : 'Unknown error',
        })
      }
    }

    // Validate effective values
    if (!effectiveBirthDate || !isValidDate(effectiveBirthDate)) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_DATE,
        message: 'Invalid or missing birthDate',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }
    if (!effectiveBirthTime || !isValidTime(effectiveBirthTime)) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_TIME,
        message: 'Invalid or missing birthTime',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }
    if (!isValidLatitude(effectiveLatitude)) {
      return createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid or missing latitude',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }
    if (!isValidLongitude(effectiveLongitude)) {
      return createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid or missing longitude',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }

    // ========================================
    // LONG-TERM MEMORY: Load PersonaMemory and recent session summaries
    // ========================================
    let personaMemoryContext = ''
    let recentSessionSummaries = ''

    if (userId) {
      const memoryResult = await loadPersonaMemory(userId, effectiveTheme, lang)
      personaMemoryContext = memoryResult.personaMemoryContext
      recentSessionSummaries = memoryResult.recentSessionSummaries
    }

    // ========================================
    // COMPUTE CHART DATA: Saju, Astro, Transits (with caching)
    // ========================================
    const chartResult = await calculateChartData(
      {
        birthDate: effectiveBirthDate,
        birthTime: effectiveBirthTime,
        gender: effectiveGender,
        latitude: effectiveLatitude,
        longitude: effectiveLongitude,
      },
      effectiveSaju as SajuDataStructure | undefined,
      effectiveAstro as AstroDataStructure | undefined
    )

    const finalSaju = chartResult.saju
    const finalAstro = chartResult.astro
    const { natalChartData, currentTransits } = chartResult
    const enrichedAdvancedAstro = await ensureAdvancedAstroData({
      name,
      birthDate: effectiveBirthDate,
      birthTime: effectiveBirthTime,
      gender: effectiveGender,
      latitude: effectiveLatitude,
      longitude: effectiveLongitude,
      theme: effectiveTheme,
      advancedAstro: advancedAstro as Partial<CombinedResult> | undefined,
    })

    // Safety check
    if (lastUser && containsForbidden(lastUser.content)) {
      const encoder = new TextEncoder()
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${safetyMessage(lang)}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Guest-Mode': isGuestMode ? '1' : '0',
          },
        }
      )
    }

    // ========================================
    // BUILD CONTEXT SECTIONS: Using modular context builder
    // ========================================
    const contextSections = buildContextSections({
      saju: finalSaju,
      astro: finalAstro,
      advancedAstro: enrichedAdvancedAstro,
      natalChartData,
      currentTransits,
      birthDate: effectiveBirthDate,
      gender: effectiveGender,
      theme: effectiveTheme,
      lang,
      trimmedHistory,
      lastUserMessage: lastUser?.content,
    })

    const predictionSection = buildPredictionSection(predictionContext, lang)
    const longTermMemorySection = buildLongTermMemorySection(
      personaMemoryContext,
      recentSessionSummaries,
      lang
    )
    const matrixSnapshot = await fetchMatrixSnapshot({
      birthDate: effectiveBirthDate,
      birthTime: effectiveBirthTime,
      gender: effectiveGender,
      lang,
      saju: finalSaju,
      astro: finalAstro,
      natalChartData,
      advancedAstro: enrichedAdvancedAstro,
      currentTransits,
      theme: effectiveTheme,
      focusDomain: questionAnalysis.primaryDomain,
    })
    if (isCounselorStrictMatrixEnabled() && !matrixSnapshot) {
      logger.error('[chat-stream] Matrix snapshot unavailable (strict mode)', {
        userId: userId || 'guest',
        theme: effectiveTheme,
        lang,
      })
      if (context?.refundCreditsOnError) {
        await context.refundCreditsOnError('Matrix snapshot unavailable in strict mode', {
          route: 'destiny-map-chat-stream',
          stage: 'matrix-snapshot',
          strictMode: true,
        })
      }
      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message:
          lang === 'ko'
            ? '공통 메트릭스 스냅샷을 불러오지 못해 상담을 중단했습니다. 잠시 후 다시 시도해 주세요.'
            : 'Counseling stopped because the shared matrix snapshot is unavailable. Please try again.',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
        headers: {
          'X-Matrix-Strict': '1',
          'X-Matrix-Snapshot': 'missing',
        },
      })
    }
    const coreCounselorPacket = matrixSnapshot?.core?.counselorEvidence || null
    const coreFocusDomain =
      coreCounselorPacket?.focusDomain || questionAnalysis.primaryDomain || null
    const promptTheme = mapFocusDomainToPromptTheme(coreFocusDomain, effectiveTheme)
    const sessionId = req.headers.get('x-session-id') || undefined
    const canonicalCounselorSection = formatCounselorEvidencePacket(
      coreCounselorPacket as Parameters<typeof formatCounselorEvidencePacket>[0],
      lang === 'ko' ? 'ko' : 'en'
    )
    const matrixProfileSection = buildMatrixProfileSection(matrixSnapshot, lang, promptTheme)
    const counselorUiEvidence = encodeCounselorUiEvidence(matrixSnapshot, lang)
    const predictionPacket = coreCounselorPacket as
      | (typeof coreCounselorPacket & {
          canonicalBrief?: {
            topDecisionId?: string
            topDecisionAction?: string
            topDecisionLabel?: string
          }
          topTimingWindow?: {
            window?: import('@/lib/destiny-matrix/core/logging').DestinyTimingWindow
            timingGranularity?: import('@/lib/destiny-matrix/core/logging').DestinyTimingGranularity
            precisionReason?: string
            timingConflictMode?: import('@/lib/destiny-matrix/core/logging').DestinyTimingConflictMode
            timingConflictNarrative?: string
            readinessScore?: number
            triggerScore?: number
            convergenceScore?: number
            timingReliabilityScore?: number
            timingReliabilityBand?: import('@/lib/destiny-matrix/core/logging').DestinyReliabilityBand
          }
          verdictLead?: string
        })
      | null
    const predictionId = await persistDestinyPredictionSnapshot({
      userId,
      service: 'counselor',
      lang: lang === 'ko' ? 'ko' : 'en',
      theme: promptTheme,
      sessionId,
      questionText: lastUser?.content,
      focusDomain: predictionPacket?.focusDomain,
      actionFocusDomain: predictionPacket?.actionFocusDomain,
      phase: predictionPacket?.strategyBrief?.overallPhase,
      phaseLabel: predictionPacket?.strategyBrief?.overallPhaseLabel,
      topDecisionId: predictionPacket?.canonicalBrief?.topDecisionId,
      topDecisionAction: predictionPacket?.canonicalBrief?.topDecisionAction,
      topDecisionLabel: predictionPacket?.canonicalBrief?.topDecisionLabel,
      timingWindow: predictionPacket?.topTimingWindow?.window,
      timingGranularity: predictionPacket?.topTimingWindow?.timingGranularity,
      precisionReason: predictionPacket?.topTimingWindow?.precisionReason,
      timingConflictMode: predictionPacket?.topTimingWindow?.timingConflictMode,
      timingConflictNarrative: predictionPacket?.topTimingWindow?.timingConflictNarrative,
      readinessScore: predictionPacket?.topTimingWindow?.readinessScore,
      triggerScore: predictionPacket?.topTimingWindow?.triggerScore,
      convergenceScore: predictionPacket?.topTimingWindow?.convergenceScore,
      timingReliabilityScore: predictionPacket?.topTimingWindow?.timingReliabilityScore,
      timingReliabilityBand: predictionPacket?.topTimingWindow?.timingReliabilityBand,
      predictionClaim: predictionPacket?.verdictLead || canonicalCounselorSection,
    })
    const questionAnalysisSection = describeQuestionAnalysis(
      questionAnalysis,
      lang === 'ko' ? 'ko' : 'en'
    )
    const counselingStructureGuide = buildCounselingStructureGuide(
      questionAnalysis,
      lang === 'ko' ? 'ko' : 'en'
    )

    const themeDescriptions: Record<string, { ko: string; en: string }> = {
      love: { ko: '연애/배우자/관계 상담', en: 'Love, marriage, partner questions' },
      career: { ko: '커리어/직업/이직 상담', en: 'Career, job, business questions' },
      wealth: { ko: '재정/투자/돈 관리 상담', en: 'Money, investment, finance questions' },
      health: { ko: '건강/회복/루틴 상담', en: 'Health, wellness questions' },
      family: { ko: '가족/인간관계 상담', en: 'Family, relationships questions' },
      today: { ko: '오늘 운세 상담', en: "Today's fortune and advice" },
      month: { ko: '이번 달 운세 상담', en: "This month's fortune" },
      year: { ko: '올해 운세 상담', en: "This year's fortune" },
      life: { ko: '인생 총운/종합 상담', en: 'Life overview, general counseling' },
      chat: { ko: '자유 주제 상담', en: 'Free topic counseling' },
    }
    const themeDesc = themeDescriptions[promptTheme] || themeDescriptions.chat
    const themeContext =
      lang === 'ko'
        ? [
            `현재 상담 요청 테마: ${effectiveTheme}`,
            coreFocusDomain ? `현재 코어 초점 도메인: ${coreFocusDomain}` : '',
            `우선 답변 축: ${promptTheme} (${themeDesc.ko})`,
            '질문에 먼저 답하고, 코어 초점과 직접 관련된 근거를 우선 사용하세요.',
          ]
            .filter(Boolean)
            .join('\n')
        : [
            `Requested theme: ${effectiveTheme}`,
            coreFocusDomain ? `Current core focus domain: ${coreFocusDomain}` : '',
            `Primary answer track: ${promptTheme} (${themeDesc.en})`,
            'Answer the question first and prioritize evidence aligned with the core focus.',
          ]
            .filter(Boolean)
            .join('\n')

    const fortuneIcpSection = buildFortuneWithIcpSection(counselingBrief, lang)
    const fortuneGuide = buildFortuneWithIcpOutputGuide(lang)
    const themeDepthGuide = buildThemeDepthGuide(promptTheme, lang)
    const focusDepthGuide = buildFocusDomainDepthGuide(coreFocusDomain, lang)
    const focusVoiceGuide = buildFocusDomainVoiceGuide(coreFocusDomain, lang)
    const evidenceGuide = buildEvidenceGroundingGuide(lang)

    const responseDensityContract =
      lang === 'ko'
        ? [
            '[Response Contract: Projection-first]',
            '- 첫 1~2문장에서 질문에 직접 답하세요.',
            '- 소제목은 반드시 이 순서를 따르세요: "## 직접 답", "## 구조와 상황", "## 타이밍과 충돌", "## 실행", "## 리스크와 재확인".',
            '- 불릿을 남발하지 말고 짧은 문단으로 쓰세요.',
            '- "구조와 상황"에서는 지금 실제로 작동하는 구조와 질문에 가장 직접 연결되는 축을 설명하세요.',
            '- "타이밍과 충돌"에서는 readiness, trigger, convergence, timing conflict를 사람 말로 풀어 설명하세요.',
            '- "실행"에서는 지금 해야 할 행동과 미뤄야 할 행동을 2~3문장으로 분명히 나누세요.',
            '- "리스크와 재확인"에서는 과속, 지속성, 검증 리스크를 분명히 적으세요.',
            '- 기술 용어를 그대로 던지지 말고 자연어로 번역하세요.',
            '- 같은 문장을 반복하지 마세요.',
            '- core phase, projection, cautions를 답변 본문 속에 녹여 쓰세요.',
            '- 총 길이는 520~900자 사이로 유지하세요.',
          ].join('\n')
        : [
            '[Response Contract: Projection-first]',
            '- Answer the user question directly within the first two sentences.',
            '- Use headings in this exact order: "## Direct Answer", "## Structure and Situation", "## Timing and Tension", "## Action Plan", "## Risk and Recheck".',
            '- Prefer short paragraphs over bullet dumping.',
            '- In "Structure and Situation", explain the active structure and the part most relevant to the question.',
            '- In "Timing and Tension", translate readiness, trigger, convergence, and timing conflict into natural language.',
            '- In "Action Plan", give the next move in 2-3 assertive sentences.',
            '- In "Risk and Recheck", state overreach, persistence, and verification risk clearly.',
            '- Translate technical signals into natural language instead of dumping jargon.',
            '- Do not repeat sentences across sections.',
            '- Final verdict must align with core phase / top claims / cautions.',
            '- Keep total length around 130-220 words.',
          ].join('\n')

    const compactSections = buildCompactPromptSections({
      contextSections,
      longTermMemorySection,
      predictionSection,
      theme: promptTheme,
    })

    const baseContext = [
      fortuneGuide,
      evidenceGuide,
      responseDensityContract,
      `Name: ${name || 'User'}`,
      questionAnalysisSection,
      counselingStructureGuide,
      canonicalCounselorSection,
      themeContext,
      focusDepthGuide,
      focusVoiceGuide,
      fortuneIcpSection,
      themeDepthGuide,
      matrixProfileSection,
    ]
      .filter(Boolean)
      .join('\n\n')

    const chatPrompt = assembleFinalPrompt({
      systemPrompt: counselorSystemPrompt(lang),
      baseContext,
      memoryContext: '',
      sections: compactSections,
      messages: trimmedHistory.filter((m) => m.role !== 'system'),
      userQuestion: contextSections.userQuestion,
    })
    // Call backend streaming endpoint using apiClient
    const streamResult = await apiClient.postSSEStream(
      '/ask-stream',
      {
        theme: promptTheme,
        prompt: chatPrompt,
        locale: lang,
        // Pass pre-computed chart data if available (instant response)
        saju: finalSaju || undefined,
        astro: finalAstro || undefined,
        // Advanced astrology features (draconic, harmonics, progressions, etc.)
        advanced_astro: enrichedAdvancedAstro || undefined,
        // Fallback: Pass birth info for backend to compute if needed
        birth: {
          date: effectiveBirthDate,
          time: effectiveBirthTime,
          gender: effectiveGender,
          lat: effectiveLatitude,
          lon: effectiveLongitude,
        },
        // Conversation history for context-aware responses
        history: trimmedHistory.filter((m) => m.role !== 'system'),
        // Session ID for RAG cache
        session_id: sessionId,
        // Premium: user context for returning users
        user_context: userContext || undefined,
        // CV/Resume text for career-related questions
        cv_text: cvText || undefined,
      },
      { timeout: 60000 }
    )

    if (!streamResult.ok) {
      logger.error('[DestinyMapChatStream] Backend error:', {
        status: streamResult.status,
        error: streamResult.error,
      })

      // Refund credits on backend failure
      if (context.refundCreditsOnError) {
        await context.refundCreditsOnError(`Backend stream error: ${streamResult.status}`, {
          route: 'destiny-map-chat-stream',
          status: streamResult.status,
        })
      }

      const fallback =
        lang === 'ko'
          ? 'AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
          : 'Could not connect to AI service. Please try again.'

      return createFallbackSSEStream({
        content: fallback,
        done: true,
        'X-Fallback': '1',
        ...(counselorUiEvidence ? { 'X-Counselor-Evidence': counselorUiEvidence } : {}),
        ...(predictionId ? { 'X-Destiny-Prediction-Id': predictionId } : {}),
        'X-Guest-Mode': isGuestMode ? '1' : '0',
      })
    }

    // Relay the stream from backend to frontend with sanitization
    return createTransformedSSEStream({
      source: streamResult.response,
      transform: (chunk) => {
        const masked = maskTextWithName(sanitizeLocaleText(chunk, lang), name)
        return masked
      },
      route: 'DestinyMapChatStream',
      additionalHeaders: {
        'X-Fallback': streamResult.response.headers.get('x-fallback') || '0',
        ...(counselorUiEvidence ? { 'X-Counselor-Evidence': counselorUiEvidence } : {}),
        ...(predictionId ? { 'X-Destiny-Prediction-Id': predictionId } : {}),
        'X-Guest-Mode': isGuestMode ? '1' : '0',
      },
    })
  } catch (err: unknown) {
    logger.error('[Chat-Stream API error]', err)

    // Refund credits on unexpected errors
    if (context?.refundCreditsOnError) {
      await context.refundCreditsOnError(err instanceof Error ? err.message : 'Unknown error', {
        route: 'destiny-map-chat-stream',
      })
    }

    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'destiny-map/chat-stream',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}
