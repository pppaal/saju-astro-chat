// @ts-nocheck

import type { FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput } from '../types'
import type { AIPremiumReport, AIReportGenerationOptions } from './reportTypes'
import { runPremiumDeterministicMode } from './aiReportServicePremiumDeterministicSupport'
import { runPremiumRewriteMode } from './aiReportServicePremiumRewriteSupport'
import { runPremiumLiveMode } from './aiReportServicePremiumLiveSupport'

type GenerationDeps = Record<string, unknown>

export async function generateAIPremiumReportWithSupport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  options: AIReportGenerationOptions = {},
  deps: GenerationDeps
): Promise<AIPremiumReport> {
  const {
    buildNormalizedMatrixInput,
    buildGraphRAGEvidence,
    buildDeterministicCore,
    runDestinyCore,
    adaptCoreToReport,
    buildTopMatchedPatterns,
    buildGraphRagSummaryPayload,
    shouldUseDeterministicOnly,
    FORCE_REWRITE_ONLY_MODE,
  } = deps

  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const detailLevel = options.detailLevel || 'detailed'
  const normalizedInput = buildNormalizedMatrixInput(input)
  const graphRagEvidence = buildGraphRAGEvidence(normalizedInput, matrixReport, {
    mode: 'comprehensive',
    focusDomain: options.focusDomain,
  })
  const deterministicCore = buildDeterministicCore({
    matrixInput: normalizedInput,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const coreSeed = runDestinyCore({
    mode: 'comprehensive',
    lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const reportCore = adaptCoreToReport(coreSeed, lang)
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine,
    reportCore
  )
  const deterministicOnly = shouldUseDeterministicOnly(options.deterministicOnly)

  const ctx = {
    ...deps,
    input,
    matrixReport,
    options,
    startTime,
    lang,
    detailLevel,
    normalizedInput,
    graphRagEvidence,
    deterministicCore,
    coreSeed,
    reportCore,
    signalSynthesis,
    strategyEngine,
    topMatchedPatterns,
    graphRagSummary,
  }

  if (deterministicOnly) {
    return runPremiumDeterministicMode(ctx)
  }

  if (FORCE_REWRITE_ONLY_MODE) {
    return runPremiumRewriteMode(ctx)
  }

  return runPremiumLiveMode(ctx)
}
