import { prisma } from '@/lib/db/prisma'
import type { AIPremiumReport } from '@/lib/destiny-matrix/ai-report/reportTypes'
import type { DestinyMatrixEvidenceSummary } from '@/lib/destiny-matrix/ai-report/graphRagEvidence'
import type { TimingAIPremiumReport, ThemedAIPremiumReport } from '@/lib/destiny-matrix/ai-report/types'
import { canUseFeature } from '@/lib/credits/creditService'
import { HTTP_STATUS } from '@/lib/constants/http'
import { NextResponse } from 'next/server'
import {
  buildGeneratedReportJsonResponse,
  buildGeneratedReportPdfResponse,
  persistReportPredictionSnapshotEntry,
} from './routeReportOutput'
import {
  extractOverallScore,
  extractReportSummary,
  generateReportTitle,
  scoreToGrade,
} from './routeReportPersistence'
import type { PersistedReportType } from './routeExecutionHelpers'

export async function persistFreeDigestReport(input: {
  userId: string
  reportType: PersistedReportType
  period?: string
  theme?: string
  freeReport: {
    summary: string
    overallScore: number
    grade: string
  } & Record<string, unknown>
  locale: string
  targetDate?: string
}) {
  const savedFreeReport = await prisma.destinyMatrixReport.create({
    data: {
      userId: input.userId,
      reportType: input.reportType,
      period: input.period || null,
      theme: input.theme || null,
      reportData: input.freeReport as object,
      title: generateReportTitle(input.reportType, input.period as never, input.theme as never, input.targetDate),
      summary: input.freeReport.summary,
      overallScore: input.freeReport.overallScore,
      grade: input.freeReport.grade,
      locale: input.locale,
    },
  })

  return NextResponse.json({
    success: true,
    creditsUsed: 0,
    reportType: input.reportType,
    report: {
      ...input.freeReport,
      id: savedFreeReport.id,
    },
  })
}

export async function persistGeneratedReport(input: {
  userId: string
  reportType: PersistedReportType
  period?: string
  theme?: string
  targetDate?: string
  locale: string
  report: AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
}) {
  const reportSummary = extractReportSummary(input.report)
  const overallScore = extractOverallScore(input.report)
  const savedReport = await prisma.destinyMatrixReport.create({
    data: {
      userId: input.userId,
      reportType: input.reportType,
      period: input.period || null,
      theme: input.theme || null,
      reportData: input.report as object,
      title: generateReportTitle(input.reportType, input.period as never, input.theme as never, input.targetDate),
      summary: reportSummary,
      overallScore,
      grade: scoreToGrade(overallScore),
      locale: input.locale,
    },
  })

  return { savedReport, reportSummary, overallScore }
}

export async function buildGeneratedReportResponse(input: {
  userId: string
  format?: 'json' | 'pdf'
  savedReportId: string
  reportType: PersistedReportType
  creditsUsed: number
  remainingCredits: number
  themeOrType: string
  locale: 'ko' | 'en'
  reportSummary: string
  report: AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
  premiumReport: AIPremiumReport | null
  matrixSummaryForGeneration?: import('@/lib/destiny-matrix/types').MatrixSummary
  destinyMatrixEvidenceSummary: DestinyMatrixEvidenceSummary
}) {
  if (input.format === 'pdf') {
    const canUsePdfFeature = await canUseFeature(input.userId, 'pdfReport')
    if (!canUsePdfFeature) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FEATURE_LOCKED',
            message: 'PDF 기능은 Pro 이상 플랜에서만 사용할 수 있습니다.',
            upgrade: true,
          },
        },
        { status: HTTP_STATUS.FORBIDDEN }
      )
    }

    const { generateFivePagePDF, generatePremiumPDF } = await import('@/lib/destiny-matrix/ai-report/pdfGenerator')
    const pdfBytes = input.premiumReport
      ? await generatePremiumPDF(input.premiumReport)
      : await generateFivePagePDF(input.report)

    await prisma.destinyMatrixReport.update({
      where: { id: input.savedReportId },
      data: { pdfGenerated: true },
    })

    return buildGeneratedReportPdfResponse({
      savedReportId: input.savedReportId,
      pdfBytes,
    })
  }

  const predictionId = await persistReportPredictionSnapshotEntry({
    userId: input.userId,
    lang: input.locale,
    theme: input.themeOrType,
    reportType: input.reportType,
    reportSummary: input.reportSummary,
    report: input.report,
    matrixSummaryForGeneration: input.matrixSummaryForGeneration,
  })

  return buildGeneratedReportJsonResponse({
    predictionId,
    creditsUsed: input.creditsUsed,
    remainingCredits: input.remainingCredits,
    reportType: input.reportType,
    report: input.report,
    savedReportId: input.savedReportId,
    destinyMatrixEvidenceSummary: input.destinyMatrixEvidenceSummary,
  })
}
