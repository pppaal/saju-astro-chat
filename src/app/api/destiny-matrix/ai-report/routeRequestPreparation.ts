import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import { validateReportRequest } from '@/lib/destiny-matrix/validation'
import type { InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import {
  type ReportPeriod,
  type ReportTheme,
  type TimingData,
} from '@/lib/destiny-matrix/ai-report/types'
import { mapMajorTransitsToActiveTransits } from '@/lib/destiny-matrix/ai-report/transitMapping'
import { buildAstroTimingIndex } from '@/lib/destiny-matrix/astroTimingIndex'
import {
  buildAutoDaeunTiming,
  buildTimingData,
  buildTimingDataFromDerivedSaju,
  enrichRequestWithDerivedAstrology,
  enrichRequestWithDerivedSaju,
  ensureDerivedDominantWesternElement,
  ensureDerivedSnapshots,
} from './routeDerivedContext'

const REQUIRED_ADVANCED_ASTRO_SIGNAL_KEYS = [
  'solarReturn',
  'lunarReturn',
  'progressions',
  'draconic',
  'harmonics',
  'fixedStars',
  'eclipses',
  'midpoints',
  'asteroids',
  'extraPoints',
] as const

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const toOptionalRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function mergeTimingData(
  autoTiming: TimingData,
  requestTiming?: Record<string, unknown>
): TimingData {
  const req = requestTiming || {}
  return {
    daeun: (toOptionalRecord(req.daeun) as TimingData['daeun']) || autoTiming.daeun,
    seun: (toOptionalRecord(req.seun) as TimingData['seun']) || autoTiming.seun,
    wolun: (toOptionalRecord(req.wolun) as TimingData['wolun']) || autoTiming.wolun,
    iljin: (toOptionalRecord(req.iljin) as TimingData['iljin']) || autoTiming.iljin,
  }
}

function listAiReportMissing(
  matrixInput: MatrixCalculationInput,
  timingData: TimingData
): string[] {
  const missing: string[] = []
  if (!matrixInput.sajuSnapshot || Object.keys(matrixInput.sajuSnapshot).length === 0) {
    missing.push('sajuSnapshot')
  }
  if (!matrixInput.astrologySnapshot || Object.keys(matrixInput.astrologySnapshot).length === 0) {
    missing.push('astrologySnapshot')
  }
  if (!matrixInput.crossSnapshot || Object.keys(matrixInput.crossSnapshot).length === 0) {
    missing.push('crossSnapshot')
  }
  if (!timingData.seun) missing.push('timingData.seun')
  if (!timingData.wolun) missing.push('timingData.wolun')
  if (!timingData.iljin) missing.push('timingData.iljin')
  if (!timingData.daeun) missing.push('timingData.daeun')

  const hasBirthProfile =
    !!matrixInput.profileContext?.birthDate && !!matrixInput.profileContext?.birthTime
  if (hasBirthProfile) {
    if (!matrixInput.asteroidHouses || Object.keys(matrixInput.asteroidHouses).length === 0) {
      missing.push('asteroidHouses')
    }
    if (!matrixInput.extraPointSigns || Object.keys(matrixInput.extraPointSigns).length === 0) {
      missing.push('extraPointSigns')
    }
    const signals = (matrixInput.advancedAstroSignals || {}) as Record<string, unknown>
    for (const key of REQUIRED_ADVANCED_ASTRO_SIGNAL_KEYS) {
      if (signals[key] !== true) {
        missing.push(`advancedAstroSignals.${key}`)
      }
    }
  }
  return missing
}

export interface PreparedAiReportRequest {
  requestBody: Record<string, unknown>
  validatedInput: NonNullable<ReturnType<typeof validateReportRequest>['data']>
  period?: ReportPeriod
  theme?: ReportTheme
  name?: string
  birthDate?: string
  format?: 'json' | 'pdf'
  detailLevel?: 'standard' | 'detailed' | 'comprehensive'
  bilingual: boolean
  targetChars?: number
  userQuestion?: string
  deterministicProfile: 'strict' | 'balanced' | 'aggressive'
  tone?: 'realistic' | 'friendly'
  targetDate?: string
  profileContext: {
    birthDate?: string
    birthTime?: string
    birthCity?: string
    timezone?: string
    latitude?: number
    longitude?: number
    houseSystem?: string
    analysisAt: string
  }
  matrixInput: MatrixCalculationInput
  timingData: TimingData
  missingKeys: string[]
  queryDomain?: InsightDomain
  maxInsights?: number
  includeVisualizations?: boolean
  includeDetailedData?: boolean
}

export async function prepareAiReportRequest(
  body: unknown
): Promise<
  | { success: true; data: PreparedAiReportRequest }
  | { success: false; validationErrors: string[] }
> {
  let requestBody = enrichRequestWithDerivedSaju({ ...(body as Record<string, unknown>) })
  requestBody = await enrichRequestWithDerivedAstrology(requestBody)
  requestBody = ensureDerivedDominantWesternElement(requestBody)
  requestBody = ensureDerivedSnapshots(requestBody)

  const validation = validateReportRequest(requestBody)
  if (!validation.success) {
    return {
      success: false,
      validationErrors: (validation.errors || []).map((error) => error.message),
    }
  }

  const validatedInput = validation.data!
  const { queryDomain, maxInsights, includeVisualizations, includeDetailedData, ...rest } =
    validatedInput

  const period = requestBody.period as ReportPeriod | undefined
  const theme = requestBody.theme as ReportTheme | undefined
  const name = requestBody.name as string | undefined
  const birthDate = requestBody.birthDate as string | undefined
  const format = requestBody.format as 'json' | 'pdf' | undefined
  const detailLevel = requestBody.detailLevel as 'standard' | 'detailed' | 'comprehensive' | undefined
  const bilingual = requestBody.bilingual === true
  const targetChars = toOptionalNumber(requestBody.targetChars)
  const userQuestion = toOptionalString(requestBody.userQuestion)
  const deterministicProfile =
    requestBody.deterministicProfile === 'strict' ||
    requestBody.deterministicProfile === 'balanced' ||
    requestBody.deterministicProfile === 'aggressive'
      ? requestBody.deterministicProfile
      : 'balanced'
  const tone =
    requestBody.tone === 'realistic' || requestBody.tone === 'friendly'
      ? (requestBody.tone as 'realistic' | 'friendly')
      : undefined
  const targetDate = requestBody.targetDate as string | undefined

  const profileContext = {
    birthDate: toOptionalString(requestBody.birthDate),
    birthTime: toOptionalString(requestBody.birthTime),
    birthCity: toOptionalString(requestBody.birthCity),
    timezone: toOptionalString(requestBody.timezone),
    latitude: toOptionalNumber(requestBody.latitude),
    longitude: toOptionalNumber(requestBody.longitude),
    houseSystem: toOptionalString(requestBody.houseSystem),
    analysisAt: toOptionalString(requestBody.analysisAt) || new Date().toISOString(),
  }
  const sajuSnapshot =
    toOptionalRecord(requestBody.sajuSnapshot) || toOptionalRecord(requestBody.saju)
  const astrologySnapshot =
    toOptionalRecord(requestBody.astrologySnapshot) || toOptionalRecord(requestBody.astrology)
  const crossSnapshot =
    toOptionalRecord(requestBody.crossSnapshot) ||
    toOptionalRecord(requestBody.graphRagEvidence) ||
    toOptionalRecord(requestBody.matrixSummary)
  const currentDateIso =
    toOptionalString(requestBody.currentDateIso) ||
    (profileContext.analysisAt
      ? profileContext.analysisAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10))

  const rawMajorTransits =
    (astrologySnapshot?.currentTransits as Record<string, unknown> | undefined)?.majorTransits
  const derivedActiveTransits = mapMajorTransitsToActiveTransits(rawMajorTransits, 8)
  const normalizedActiveTransits: NonNullable<MatrixCalculationInput['activeTransits']> =
    Array.isArray((rest as MatrixCalculationInput).activeTransits)
      ? ((rest as MatrixCalculationInput).activeTransits as NonNullable<
          MatrixCalculationInput['activeTransits']
        >)
      : []
  const resolvedActiveTransits =
    normalizedActiveTransits.length > 0 ? normalizedActiveTransits : derivedActiveTransits
  const resolvedAstroTimingIndex =
    (rest as MatrixCalculationInput).astroTimingIndex ||
    buildAstroTimingIndex({
      activeTransits: resolvedActiveTransits,
      advancedAstroSignals: (rest as MatrixCalculationInput).advancedAstroSignals,
    })
  const mergedCrossSnapshot = {
    ...(crossSnapshot || {}),
    astroTimingIndex: resolvedAstroTimingIndex,
  }
  const matrixInput = {
    ...(rest as MatrixCalculationInput),
    activeTransits: resolvedActiveTransits,
    astroTimingIndex: resolvedAstroTimingIndex,
    profileContext,
    sajuSnapshot,
    astrologySnapshot,
    crossSnapshot: mergedCrossSnapshot,
    currentDateIso,
  } as MatrixCalculationInput

  const autoTimingData: TimingData = buildTimingData(targetDate)
  const derivedTiming = buildTimingDataFromDerivedSaju(requestBody, targetDate)
  autoTimingData.daeun = buildAutoDaeunTiming(requestBody, targetDate)
  const mergedAutoTiming = mergeTimingData(
    autoTimingData,
    derivedTiming as Record<string, unknown>
  )
  const timingData: TimingData = mergeTimingData(
    mergedAutoTiming,
    toOptionalRecord(requestBody.timingData)
  )
  const missingKeys = listAiReportMissing(matrixInput, timingData)

  return {
    success: true,
    data: {
      requestBody,
      validatedInput,
      period,
      theme,
      name,
      birthDate,
      format,
      detailLevel,
      bilingual,
      targetChars,
      userQuestion,
      deterministicProfile,
      tone,
      targetDate,
      profileContext,
      matrixInput,
      timingData,
      missingKeys,
      queryDomain: queryDomain as InsightDomain | undefined,
      maxInsights,
      includeVisualizations,
      includeDetailedData,
    },
  }
}
