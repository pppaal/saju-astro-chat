import { NextResponse } from 'next/server'
import {
  summarizeGraphRAGEvidence,
  type DestinyMatrixEvidenceSummary,
  type AIPremiumReport,
  type TimingAIPremiumReport,
  type ThemedAIPremiumReport,
} from '@/lib/destiny-matrix/ai-report'
import { persistDestinyPredictionSnapshot } from '@/lib/destiny-matrix/predictionSnapshot'
import type { MatrixSummary } from '@/lib/destiny-matrix/types'
import { HTTP_STATUS } from '@/lib/constants/http'

type GeneratedAiReport =
  | AIPremiumReport
  | TimingAIPremiumReport
  | ThemedAIPremiumReport
  | (AIPremiumReport & {
      crossConsistencyAudit?: unknown
      inputReadinessAudit?: unknown
      patternQualityGate?: unknown
      strategyEngine?: { overallPhase?: string | null; overallPhaseLabel?: string | null } | null
      claims?: Array<{ id?: string | null; text?: string | null }>
      coreHash?: string | null
    })

type PredictionReportLike = {
  focusDomain?: string | null
  actionFocusDomain?: string | null
  topDecisionId?: string | null
  topDecisionAction?: string | null
  topDecisionLabel?: string | null
  strategyEngine?: {
    overallPhase?: string | null
    overallPhaseLabel?: string | null
  } | null
  domainTimingWindows?: Array<{
    domain?: string | null
    window?: Parameters<typeof persistDestinyPredictionSnapshot>[0]['timingWindow']
    timingGranularity?: Parameters<typeof persistDestinyPredictionSnapshot>[0]['timingGranularity']
    precisionReason?: string | null
    timingConflictMode?: Parameters<typeof persistDestinyPredictionSnapshot>[0]['timingConflictMode']
    timingConflictNarrative?: string | null
    readinessScore?: number | null
    triggerScore?: number | null
    convergenceScore?: number | null
  }>
}

function findActionTimingWindow(report: PredictionReportLike) {
  return Array.isArray(report.domainTimingWindows)
    ? report.domainTimingWindows.find(
        (item) =>
          item.domain === (report.actionFocusDomain || report.focusDomain) ||
          item.domain === report.focusDomain
      ) || null
    : null
}

export async function persistReportPredictionSnapshotEntry(input: {
  userId: string
  lang: 'ko' | 'en'
  theme: string
  reportType: string
  reportSummary: string
  report: GeneratedAiReport
  matrixSummaryForGeneration?: MatrixSummary
}): Promise<string | null> {
  const predictionReport = input.report as PredictionReportLike
  const actionTimingWindow = findActionTimingWindow(predictionReport)
  return persistDestinyPredictionSnapshot({
    userId: input.userId,
    service: 'report',
    lang: input.lang,
    theme: input.theme || input.reportType,
    focusDomain: predictionReport.focusDomain,
    actionFocusDomain: predictionReport.actionFocusDomain || predictionReport.focusDomain,
    phase: predictionReport.strategyEngine?.overallPhase,
    phaseLabel: predictionReport.strategyEngine?.overallPhaseLabel,
    topDecisionId: predictionReport.topDecisionId || null,
    topDecisionAction: predictionReport.topDecisionAction || null,
    topDecisionLabel: predictionReport.topDecisionLabel || null,
    timingWindow: actionTimingWindow?.window || null,
    timingGranularity: actionTimingWindow?.timingGranularity || null,
    precisionReason: actionTimingWindow?.precisionReason || null,
    timingConflictMode: actionTimingWindow?.timingConflictMode || null,
    timingConflictNarrative: actionTimingWindow?.timingConflictNarrative || null,
    readinessScore: actionTimingWindow?.readinessScore ?? null,
    triggerScore: actionTimingWindow?.triggerScore ?? null,
    convergenceScore: actionTimingWindow?.convergenceScore ?? null,
    timingReliabilityScore: input.matrixSummaryForGeneration?.timingCalibration?.reliabilityScore ?? null,
    timingReliabilityBand: input.matrixSummaryForGeneration?.timingCalibration?.reliabilityBand ?? null,
    predictionClaim: input.reportSummary,
  })
}

export function buildGeneratedReportJsonResponse(input: {
  predictionId: string | null
  creditsUsed: number
  remainingCredits: number
  reportType: string
  report: GeneratedAiReport
  savedReportId: string
  destinyMatrixEvidenceSummary: DestinyMatrixEvidenceSummary
}) {
  return NextResponse.json({
    success: true,
    predictionId: input.predictionId,
    creditsUsed: input.creditsUsed,
    remainingCredits: input.remainingCredits,
    reportType: input.reportType,
    matrixContract: {
      coreHash: input.report.coreHash,
      overallPhase: input.report.strategyEngine?.overallPhase,
      overallPhaseLabel: input.report.strategyEngine?.overallPhaseLabel,
      topClaimId: input.report.claims?.[0]?.id,
      topClaim: input.report.claims?.[0]?.text,
    },
    report: {
      ...input.report,
      id: input.savedReportId,
      destinyMatrixEvidenceSummary: input.destinyMatrixEvidenceSummary,
      graphRagEvidenceSummary: summarizeGraphRAGEvidence(
        (input.report as AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport)
          .graphRagEvidence
      ),
    },
  })
}

export function buildGeneratedReportPdfResponse(input: {
  savedReportId: string
  pdfBytes: Uint8Array | Buffer
}) {
  return new NextResponse(Buffer.from(input.pdfBytes), {
    status: HTTP_STATUS.OK,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="destiny-matrix-report-${input.savedReportId}.pdf"`,
      'Content-Length': input.pdfBytes.length.toString(),
    },
  })
}
