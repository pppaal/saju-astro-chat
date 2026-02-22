// src/lib/destiny-matrix/ai-report/index.ts
// Destiny Fusion Matrix™ - AI Report Module Export

export {
  generateAIPremiumReport,
  generateTimingReport,
  generateThemedReport,
} from './aiReportService'

export type { AIPremiumReport, AIReportGenerationOptions } from './reportTypes'

export { generateFivePagePDF, generatePremiumPDF, type PDFGenerationOptions } from './pdfGenerator'
export {
  buildGraphRAGEvidence,
  formatGraphRAGEvidenceForPrompt,
  summarizeGraphRAGEvidence,
  summarizeDestinyMatrixEvidence,
  type GraphRAGEvidenceAnchor,
  type GraphRAGEvidenceBundle,
  type GraphRAGEvidenceSummary,
  type GraphRAGAnchorSummary,
  type GraphRAGCrossEvidenceSet,
  type DestinyMatrixEvidenceSummary,
  type DestinyMatrixEvidenceSummaryItem,
} from './graphRagEvidence'

export {
  type ReportPeriod,
  type ReportTheme,
  type TimingData,
  type TimingAIPremiumReport,
  type ThemedAIPremiumReport,
  type TimingReportSections,
  type ThemedReportSections,
  type ExtendedReportOptions,
  REPORT_CREDIT_COSTS,
  PERIOD_META,
  THEME_META,
} from './types'

export { buildTimingPrompt, buildThemedPrompt } from './prompts'
