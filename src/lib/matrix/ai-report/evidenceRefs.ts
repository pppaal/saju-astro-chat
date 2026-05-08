export interface ReportEvidenceRef {
  id: string
  domain?: string
  layer?: number
  rowKey?: string
  colKey?: string
  keyword?: string
  sajuBasis?: string
  astroBasis?: string
  score?: number
}

export type SectionEvidenceRefs = Record<string, ReportEvidenceRef[]>
