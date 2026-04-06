import { NextResponse } from 'next/server'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix/engine'
import { FusionReportGenerator } from '@/lib/destiny-matrix/interpreter/report-generator'
import { buildCoreEnvelope } from '@/lib/destiny-matrix/core/buildCoreEnvelope'
import { buildSharedSurface } from '@/lib/destiny-matrix/core/adaptersPayload'
import type { AIPremiumReport } from '@/lib/destiny-matrix/ai-report/reportTypes'
import { type TimingAIPremiumReport, type ThemedAIPremiumReport } from '@/lib/destiny-matrix/ai-report/types'
import { auditMatrixInputReadiness } from '@/lib/destiny-matrix/ai-report/qualityAudit'
import { consumeCredits, getCreditBalance } from '@/lib/credits/creditService'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import {
  extractOverallScore,
  extractReportSummary,
  normalizeReportTier,
} from './routeReportPersistence'
import { buildRichFreeDigestReport as buildRichFreeDigestReportExternal } from './routeFreeDigest'
import {
  applyPreciseTimingSummaryIfNeeded,
  generateRouteAiReport,
  regenerateRouteAiReportStrict,
} from './routeReportGeneration'
import {
  buildGeneratedReportResponse,
  persistFreeDigestReport,
  persistGeneratedReport,
} from './routeExecutionPersistence'
import type { PreparedAiReportRequest } from './routeRequestPreparation'
import { summarizeDestinyMatrixEvidence } from '@/lib/destiny-matrix/ai-report/graphRagEvidence'
import type { InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import {
  calculateCreditCost,
  isStrictGateEnabled,
  normalizeAIUserPlan,
  resolveGeneratedReportMode,
  resolvePersistedReportType,
} from './routeExecutionHelpers'
import { enforceThemeQualityGate, finalizeReportQuality } from './routeExecutionQuality'

type RouteAiReport = AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport

export async function executeAiReportRequest(input: {
  userId: string
  preparedRequest: PreparedAiReportRequest
}) {
  const {
    requestBody,
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
    queryDomain,
    maxInsights,
    includeVisualizations,
    includeDetailedData,
  } = input.preparedRequest
  const userId = input.userId
  const reportTier = normalizeReportTier(requestBody.reportTier)
  const isFreeTier = reportTier === 'free'

  const creditCost = isFreeTier ? 0 : calculateCreditCost(period, theme)
  const balance = await getCreditBalance(userId)
  const userPlan = isFreeTier ? 'free' : normalizeAIUserPlan(balance.plan)

  if (!isFreeTier && balance.remainingCredits < creditCost) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: `AI \uB9AC\uD3EC\uD2B8 \uC0DD\uC131\uC5D0 ${creditCost} \uD06C\uB808\uB51B\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. (\uD604\uC7AC: ${balance.remainingCredits})`,
          required: creditCost,
          current: balance.remainingCredits,
        },
      },
      { status: HTTP_STATUS.PAYMENT_REQUIRED }
    )
  }

  const detailBasedMaxInsights =
    detailLevel === 'comprehensive' ? 20 : detailLevel === 'detailed' ? 10 : 5
  const resolvedMaxInsights = Math.min(20, Math.max(1, maxInsights ?? detailBasedMaxInsights))

  const strictCompleteness = isStrictGateEnabled('AI_REPORT_STRICT_COMPLETENESS')
  if (strictCompleteness && missingKeys.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INCOMPLETE_CONTEXT',
          message: '\uD544\uC218 \uB370\uC774\uD130 \uB204\uB77D\uC73C\uB85C AI report \uC0DD\uC131\uC744 \uC911\uB2E8\uD588\uC2B5\uB2C8\uB2E4.',
          missing: missingKeys,
        },
      },
      { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
    )
  }
  if (!strictCompleteness && missingKeys.length > 0) {
    logger.warn('[destiny-matrix/ai-report] Incomplete context detected; continuing in soft mode', {
      missing: missingKeys,
    })
  }

  const inputReadinessAudit = auditMatrixInputReadiness(matrixInput)
  const strictInputReadiness = isStrictGateEnabled('AI_REPORT_STRICT_INPUT_READINESS')
  if (strictInputReadiness && !inputReadinessAudit.ready) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INPUT_QUALITY_BLOCKED',
          message: '\uC785\uB825 \uB370\uC774\uD130 \uBB34\uACB0\uC131 \uC810\uAC80\uC5D0\uC11C \uCE58\uBA85 \uC624\uB958\uAC00 \uAC10\uC9C0\uB418\uC5B4 \uC0DD\uC131\uC744 \uC911\uB2E8\uD588\uC2B5\uB2C8\uB2E4.',
          blockers: inputReadinessAudit.blockers,
          inputReadinessAudit,
        },
      },
      { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
    )
  }
  if (!strictInputReadiness && !inputReadinessAudit.ready) {
    logger.warn('[destiny-matrix/ai-report] Input readiness not ideal; continuing in soft mode', {
      blockers: inputReadinessAudit.blockers,
      score: inputReadinessAudit.score,
    })
  }
  if (inputReadinessAudit.score < 75 || inputReadinessAudit.warnings.length > 0) {
    logger.warn('[destiny-matrix/ai-report] Input readiness below ideal', {
      score: inputReadinessAudit.score,
      warnings: inputReadinessAudit.warnings,
    })
  }

  const generator = new FusionReportGenerator({
    lang: matrixInput.lang || 'ko',
    maxTopInsights: resolvedMaxInsights,
    includeVisualizations,
    includeDetailedData,
    weightConfig: {
      baseWeights: {
        layer1_elementCore: 1.0,
        layer2_sibsinPlanet: 0.9,
        layer3_sibsinHouse: 0.85,
        layer4_timing: 0.95,
        layer5_relationAspect: 0.8,
        layer6_stageHouse: 0.75,
        layer7_advanced: 0.7,
        layer8_shinsal: 0.65,
        layer9_asteroid: 0.5,
        layer10_extraPoint: 0.55,
      },
      contextModifiers: [],
      temporalModifiers: [],
    },
    narrativeStyle: 'friendly',
  })

  const reportMode = resolveGeneratedReportMode(period, theme)
  const coreEnvelope = buildCoreEnvelope({
    mode: reportMode,
    lang: ((matrixInput.lang || 'ko') as 'ko' | 'en') || 'ko',
    matrixInput,
    queryDomain: queryDomain as InsightDomain | undefined,
    reportGeneratorInstance: generator,
    matrixCalculator: calculateDestinyMatrix,
  })
  const matrix = coreEnvelope.matrix
  const layerResults = coreEnvelope.layerResults
  const baseReport = coreEnvelope.matrixReport
  const normalizedMatrixInput = coreEnvelope.normalizedInput
  const sharedSurface = buildSharedSurface(
    coreEnvelope.coreSeed,
    (((normalizedMatrixInput.lang || 'ko') as 'ko' | 'en') || 'ko')
  )

  if (isFreeTier) {
    const freeReport = buildRichFreeDigestReportExternal({
      overallScore: {
        total: baseReport.overallScore.total,
        grade: baseReport.overallScore.grade,
        gradeDescription: baseReport.overallScore.gradeDescription,
      },
      topInsights: baseReport.topInsights.map((insight) => ({
        title: insight.title,
        description: insight.description,
        actionItems: insight.actionItems?.map((action) => ({ text: action.text })),
        category: insight.category,
      })),
      domainAnalysis: baseReport.domainAnalysis.map((domain) => ({
        domain: domain.domain,
        score: domain.score,
        summary: domain.summary,
        hasData: domain.hasData,
      })),
      personModel: sharedSurface.personModel,
      lang: normalizedMatrixInput.lang || 'ko',
      theme,
      period,
      queryDomain: queryDomain as InsightDomain | undefined,
    })

    const freeReportType = resolvePersistedReportType(reportTier, period, theme)
    return persistFreeDigestReport({
      userId,
      reportType: freeReportType,
      period,
      theme,
      freeReport,
      locale: normalizedMatrixInput.lang || 'ko',
      targetDate,
    })
  }

  let aiReport: RouteAiReport
  let premiumReport: AIPremiumReport | null = null
  const reportLang = normalizedMatrixInput.lang || 'ko'
  let matrixSummaryForGeneration =
    matrix && typeof matrix === 'object' && 'summary' in matrix
      ? (matrix.summary as typeof matrix.summary)
      : undefined

  matrixSummaryForGeneration = await applyPreciseTimingSummaryIfNeeded({
    theme,
    period,
    detailLevel,
    normalizedMatrixInput,
    matrixSummary: matrixSummaryForGeneration,
    calculateSummary: (timelineInput) =>
      calculateDestinyMatrix(timelineInput, { skipTimelineRecompute: true }).summary,
  })

  logger.info('[destiny-matrix/ai-report] Starting premium report generation', {
    reportMode,
    theme: theme || null,
    period: period || null,
    lang: reportLang,
    userPlan,
    deterministicProfile: deterministicProfile || null,
    hasUserQuestion: typeof userQuestion === 'string' && userQuestion.trim().length > 0,
  })

  ;({ aiReport, premiumReport } = await generateRouteAiReport({
    matrixInput,
    baseReport,
    theme,
    period,
    timingData,
    name,
    birthDate,
    targetDate,
    reportLang,
    userPlan,
    userQuestion,
    deterministicProfile,
    queryDomain: queryDomain as InsightDomain | undefined,
    detailLevel,
    bilingual,
    targetChars,
    tone,
    profileContext,
    layerResults,
    matrixSummaryForGeneration,
  }))

  const themeQualityGate = enforceThemeQualityGate({ theme, aiReport })
  if (themeQualityGate) return themeQualityGate.response

  logger.info('[destiny-matrix/ai-report] Report generation completed', {
    reportMode,
    theme: theme || null,
    period: period || null,
    metaModel:
      typeof (aiReport as { meta?: { modelUsed?: string } })?.meta?.modelUsed === 'string'
        ? (aiReport as { meta?: { modelUsed?: string } }).meta?.modelUsed
        : null,
  })

  const finalizedQuality = await finalizeReportQuality({
    reportMode,
    matrixInput,
    aiReport,
    premiumReport,
    inputReadinessScore: inputReadinessAudit.score,
    regenerate: async () =>
      regenerateRouteAiReportStrict({
        matrixInput,
        baseReport,
        theme,
        period,
        timingData,
        name,
        birthDate,
        targetDate,
        reportLang,
        userPlan,
        userQuestion,
        deterministicProfile,
        queryDomain: queryDomain as InsightDomain | undefined,
        detailLevel,
        bilingual,
        targetChars,
        tone,
        profileContext,
        layerResults,
        matrixSummaryForGeneration,
      }),
  })
  if ('response' in finalizedQuality) return finalizedQuality.response

  aiReport = finalizedQuality.aiReport
  premiumReport = finalizedQuality.premiumReport
  const { crossConsistencyAudit, patternQualityGate, strictRetryAttempted } = finalizedQuality

  const aiReportWithAudits = {
    ...aiReport,
    crossConsistencyAudit,
    inputReadinessAudit,
    patternQualityGate: {
      ...patternQualityGate,
      strictRetryAttempted,
    },
  }

  const consumeResult = await consumeCredits(userId, 'reading', creditCost)
  if (!consumeResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREDIT_DEDUCTION_FAILED',
          message: '\uD06C\uB808\uB51B \uCC28\uAC10\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
        },
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }

  const reportType = resolvePersistedReportType(reportTier, period, theme)
  const reportSummary = extractReportSummary(aiReportWithAudits)
  const overallScore = extractOverallScore(aiReportWithAudits)
  const destinyMatrixEvidenceSummary = summarizeDestinyMatrixEvidence(baseReport)

  logger.info('[destiny-matrix/ai-report] Persisting generated report', {
    reportMode,
    reportType,
    theme: theme || null,
    period: period || null,
    overallScore,
  })

  let savedReport
  try {
    ;({ savedReport } = await persistGeneratedReport({
      userId,
      reportType,
      period,
      theme,
      targetDate,
      locale: normalizedMatrixInput.lang || 'ko',
      report: aiReportWithAudits,
    }))
  } catch (persistError) {
    logger.error('[destiny-matrix/ai-report] Failed to persist generated report', {
      reportMode,
      reportType,
      theme: theme || null,
      period: period || null,
      message: persistError instanceof Error ? persistError.message : String(persistError),
      name: persistError instanceof Error ? persistError.name : 'Unknown',
    })
    throw persistError
  }

  logger.info('[destiny-matrix/ai-report] Report persisted successfully', {
    reportId: savedReport.id,
    reportMode,
    reportType,
  })

  return buildGeneratedReportResponse({
    userId,
    format,
    savedReportId: savedReport.id,
    reportType,
    creditsUsed: creditCost,
    remainingCredits: balance.remainingCredits - creditCost,
    themeOrType: theme || reportType,
    locale: (normalizedMatrixInput.lang || 'ko') === 'en' ? 'en' : 'ko',
    reportSummary,
    report: aiReportWithAudits,
    premiumReport,
    matrixSummaryForGeneration,
    destinyMatrixEvidenceSummary,
  })
}
