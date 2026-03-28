import { logger } from '@/lib/logger'
import {
  generateAIPremiumReport,
  generateTimingReport,
  generateThemedReport,
} from '@/lib/destiny-matrix/ai-report/aiReportService'
import type { AIPremiumReport } from '@/lib/destiny-matrix/ai-report/reportTypes'
import type {
  ReportPeriod,
  ReportTheme,
  TimingAIPremiumReport,
  TimingData,
  ThemedAIPremiumReport,
} from '@/lib/destiny-matrix/ai-report/types'
import {
  evaluateThemedReportQuality,
  buildCalculationDetails,
} from '@/lib/destiny-matrix/ai-report/qualityAudit'
import { buildPreciseTimelineSummary } from '@/lib/destiny-matrix/monthlyTimelinePrecise'
import { applyRuntimeCalibration } from '@/lib/destiny-matrix/calibrationRuntime'
import type { MatrixCalculationInput, MatrixCell, MatrixSummary } from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import type { AIUserPlan } from '@/lib/destiny-matrix/ai-report/reportTypes'
import type { DeterministicProfile } from '@/lib/destiny-matrix/ai-report/deterministicCoreConfig'
import type {
  DestinyTimingGranularity,
  DestinyTimingWindow,
} from '@/lib/destiny-matrix/core/logging'


type RouteAiReport = AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport

type PremiumReportWithTimingWindows = AIPremiumReport & {
  projections?: AIPremiumReport['projections']
}

type RouteReportGenerationContext = {
  matrixInput: MatrixCalculationInput
  baseReport: FusionReport
  theme?: ReportTheme
  period?: ReportPeriod
  timingData: TimingData
  name?: string
  birthDate?: string
  targetDate?: string
  reportLang: 'ko' | 'en'
  userPlan: AIUserPlan
  userQuestion?: string
  deterministicProfile?: DeterministicProfile
  queryDomain?: InsightDomain
  detailLevel?: 'standard' | 'detailed' | 'comprehensive'
  bilingual?: boolean
  targetChars?: number
  tone?: 'friendly' | 'realistic'
  profileContext?: Record<string, unknown>
  layerResults: Record<string, Record<string, MatrixCell>>
  matrixSummaryForGeneration?: MatrixSummary
}

async function buildThemedRouteReport(
  context: RouteReportGenerationContext,
  deterministicOnly = false
): Promise<ThemedAIPremiumReport> {
  const themedReport = await generateThemedReport(
    context.matrixInput,
    context.baseReport,
    context.theme as ReportTheme,
    context.timingData,
    {
      name: context.name,
      birthDate: context.birthDate,
      lang: context.reportLang,
      userPlan: context.userPlan,
      userQuestion: context.userQuestion,
      deterministicProfile: context.deterministicProfile,
      deterministicOnly,
      matrixSummary: context.matrixSummaryForGeneration,
    }
  )
  const qualityAudit = evaluateThemedReportQuality({
    sections:
      themedReport.sections && typeof themedReport.sections === 'object'
        ? (themedReport.sections as unknown as Record<string, unknown>)
        : {},
    keywords: Array.isArray(themedReport.keywords) ? themedReport.keywords : [],
    theme: context.theme as ReportTheme,
    lang: context.reportLang,
  })

  if (deterministicOnly && qualityAudit.shouldBlock) {
    throw new Error('QUALITY_BLOCKED_ON_STRICT_RETRY')
  }

  const calculationDetails = buildCalculationDetails({
    matrixInput: context.matrixInput,
    profileContext: context.profileContext,
    timingData: context.timingData,
    matrixSummary: context.matrixSummaryForGeneration,
    layerResults: context.layerResults,
    topInsights: Array.isArray(context.baseReport.topInsights)
      ? (context.baseReport.topInsights as unknown as Array<Record<string, unknown>>)
      : [],
  })

  return {
    ...themedReport,
    qualityAudit,
    calculationDetails,
  } as ThemedAIPremiumReport
}

export async function applyPreciseTimingSummaryIfNeeded(input: {
  theme?: ReportTheme
  period?: ReportPeriod
  detailLevel?: 'standard' | 'detailed' | 'comprehensive'
  normalizedMatrixInput: MatrixCalculationInput
  matrixSummary?: MatrixSummary
  calculateSummary: (timelineInput: MatrixCalculationInput) => MatrixSummary
}): Promise<MatrixSummary | undefined> {
  const shouldUsePreciseTiming =
    !input.theme &&
    (!input.period || input.period === 'comprehensive') &&
    input.detailLevel === 'comprehensive'

  if (!shouldUsePreciseTiming || !input.matrixSummary) {
    return input.matrixSummary
  }

  try {
    const preciseTimelineSummary = await buildPreciseTimelineSummary(
      input.normalizedMatrixInput,
      input.matrixSummary,
      input.calculateSummary
    )
    const mergedSummary = {
      ...input.matrixSummary,
      ...preciseTimelineSummary,
    }
    logger.info('[destiny-matrix/ai-report] Applied precise monthly timing summary', {
      overlapTimelineCount: mergedSummary.overlapTimeline?.length || 0,
      reliabilityBand: mergedSummary.timingCalibration?.reliabilityBand || null,
    })
    return mergedSummary
  } catch (preciseTimingError) {
    logger.warn(
      '[destiny-matrix/ai-report] Precise monthly timing summary failed; using base summary',
      {
        error:
          preciseTimingError instanceof Error
            ? preciseTimingError.message
            : String(preciseTimingError),
      }
    )
    return input.matrixSummary
  }
}

export async function generateRouteAiReport(context: RouteReportGenerationContext): Promise<{
  aiReport: RouteAiReport
  premiumReport: AIPremiumReport | null
}> {
  if (context.theme) {
    return {
      aiReport: await buildThemedRouteReport(context),
      premiumReport: null,
    }
  }

  if (context.period && context.period !== 'comprehensive') {
    return {
      aiReport: await generateTimingReport(
        context.matrixInput,
        context.baseReport,
        context.period,
        context.timingData,
        {
          name: context.name,
          birthDate: context.birthDate,
          targetDate: context.targetDate,
          lang: context.reportLang,
          userPlan: context.userPlan,
          userQuestion: context.userQuestion,
          deterministicProfile: context.deterministicProfile,
          matrixSummary: context.matrixSummaryForGeneration,
        }
      ),
      premiumReport: null,
    }
  }

  const premiumReport = await generateAIPremiumReport(context.matrixInput, context.baseReport, {
    name: context.name,
    birthDate: context.birthDate,
    lang: context.reportLang,
    focusDomain: context.queryDomain,
    detailLevel: context.detailLevel || 'detailed',
    bilingual: context.bilingual,
    targetChars: context.targetChars ? Math.floor(context.targetChars) : undefined,
    tone: context.tone,
    timingData: context.timingData,
    userPlan: context.userPlan,
    userQuestion: context.userQuestion,
    deterministicProfile: context.deterministicProfile,
    matrixSummary: context.matrixSummaryForGeneration,
  })

  let calibratedReport = premiumReport
  if (context.matrixSummaryForGeneration?.timingCalibration) {
    const premiumReportWithTiming = premiumReport as PremiumReportWithTimingWindows
    const timingProjection = premiumReportWithTiming.projections?.timing
    const calibratedTiming = await applyRuntimeCalibration(
      context.matrixSummaryForGeneration.timingCalibration,
      {
        service: 'report',
        actionFocusDomain:
          premiumReportWithTiming.actionFocusDomain || premiumReportWithTiming.focusDomain,
        timingWindow: (timingProjection?.window as DestinyTimingWindow | undefined) ?? undefined,
        timingGranularity:
          (timingProjection?.granularity as DestinyTimingGranularity | undefined) ?? undefined,
        overlapTimeline: context.matrixSummaryForGeneration.overlapTimeline,
        overlapTimelineByDomain: context.matrixSummaryForGeneration.overlapTimelineByDomain,
      }
    )
    if (
      calibratedTiming &&
      (calibratedTiming.reliabilityScore !== context.matrixSummaryForGeneration.timingCalibration.reliabilityScore ||
        calibratedTiming.reliabilityBand !== context.matrixSummaryForGeneration.timingCalibration.reliabilityBand)
    ) {
      const calibratedSummary = {
        ...context.matrixSummaryForGeneration,
        timingCalibration: calibratedTiming,
      }
      calibratedReport = await generateAIPremiumReport(context.matrixInput, context.baseReport, {
        name: context.name,
        birthDate: context.birthDate,
        lang: context.reportLang,
        focusDomain: context.queryDomain,
        detailLevel: context.detailLevel || 'detailed',
        bilingual: context.bilingual,
        targetChars: context.targetChars ? Math.floor(context.targetChars) : undefined,
        tone: context.tone,
        timingData: context.timingData,
        userPlan: context.userPlan,
        userQuestion: context.userQuestion,
        deterministicProfile: context.deterministicProfile,
        matrixSummary: calibratedSummary,
      })
    }
  }

  return {
    aiReport: calibratedReport,
    premiumReport: calibratedReport,
  }
}

export async function regenerateRouteAiReportStrict(
  context: RouteReportGenerationContext
): Promise<{
  aiReport: RouteAiReport
  premiumReport: AIPremiumReport | null
}> {
  if (context.theme) {
    return {
      aiReport: await buildThemedRouteReport(context, true),
      premiumReport: null,
    }
  }

  if (context.period && context.period !== 'comprehensive') {
    return {
      aiReport: await generateTimingReport(
        context.matrixInput,
        context.baseReport,
        context.period,
        context.timingData,
        {
          name: context.name,
          birthDate: context.birthDate,
          targetDate: context.targetDate,
          lang: context.reportLang,
          userPlan: context.userPlan,
          userQuestion: context.userQuestion,
          deterministicProfile: context.deterministicProfile,
          deterministicOnly: true,
          matrixSummary: context.matrixSummaryForGeneration,
        }
      ),
      premiumReport: null,
    }
  }

  const premiumReport = await generateAIPremiumReport(context.matrixInput, context.baseReport, {
    name: context.name,
    birthDate: context.birthDate,
    lang: context.reportLang,
    focusDomain: context.queryDomain,
    detailLevel: context.detailLevel || 'detailed',
    bilingual: context.bilingual,
    targetChars: context.targetChars ? Math.floor(context.targetChars) : undefined,
    tone: context.tone,
    timingData: context.timingData,
    userPlan: context.userPlan,
    userQuestion: context.userQuestion,
    deterministicProfile: context.deterministicProfile,
    deterministicOnly: true,
    matrixSummary: context.matrixSummaryForGeneration,
  })

  let calibratedReport = premiumReport
  if (context.matrixSummaryForGeneration?.timingCalibration) {
    const premiumReportWithTiming = premiumReport as PremiumReportWithTimingWindows
    const timingProjection = premiumReportWithTiming.projections?.timing
    const calibratedTiming = await applyRuntimeCalibration(
      context.matrixSummaryForGeneration.timingCalibration,
      {
        service: 'report',
        actionFocusDomain:
          premiumReportWithTiming.actionFocusDomain || premiumReportWithTiming.focusDomain,
        timingWindow: (timingProjection?.window as DestinyTimingWindow | undefined) ?? undefined,
        timingGranularity:
          (timingProjection?.granularity as DestinyTimingGranularity | undefined) ?? undefined,
        overlapTimeline: context.matrixSummaryForGeneration.overlapTimeline,
        overlapTimelineByDomain: context.matrixSummaryForGeneration.overlapTimelineByDomain,
      }
    )
    if (
      calibratedTiming &&
      (calibratedTiming.reliabilityScore !== context.matrixSummaryForGeneration.timingCalibration.reliabilityScore ||
        calibratedTiming.reliabilityBand !== context.matrixSummaryForGeneration.timingCalibration.reliabilityBand)
    ) {
      const calibratedSummary = {
        ...context.matrixSummaryForGeneration,
        timingCalibration: calibratedTiming,
      }
      calibratedReport = await generateAIPremiumReport(context.matrixInput, context.baseReport, {
        name: context.name,
        birthDate: context.birthDate,
        lang: context.reportLang,
        focusDomain: context.queryDomain,
        detailLevel: context.detailLevel || 'detailed',
        bilingual: context.bilingual,
        targetChars: context.targetChars ? Math.floor(context.targetChars) : undefined,
        tone: context.tone,
        timingData: context.timingData,
        userPlan: context.userPlan,
        userQuestion: context.userQuestion,
        deterministicProfile: context.deterministicProfile,
        deterministicOnly: true,
        matrixSummary: calibratedSummary,
      })
    }
  }

  return {
    aiReport: calibratedReport,
    premiumReport: calibratedReport,
  }
}
