// src/lib/destiny-matrix/ai-report/index.ts
// Destiny Fusion Matrix™ - AI Report Module Export

export {
  generateAIPremiumReport,
  generateTimingReport,
  generateThemedReport,
} from './aiReportService'

export type { AIPremiumReport, AIReportGenerationOptions } from './reportTypes'

export { generatePremiumPDF, type PDFGenerationOptions } from './pdfGenerator'

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
