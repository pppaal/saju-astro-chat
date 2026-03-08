import { describe, expect, it } from 'vitest'
import { buildReportQualityMetrics } from '@/lib/destiny-matrix/ai-report/reportQuality'
import type { SectionEvidenceRefs } from '@/lib/destiny-matrix/ai-report/evidenceRefs'

describe('reportQuality.buildReportQualityMetrics', () => {
  it('caps scenario bundle coverage to expected domain set only', () => {
    const sections = {
      introduction: '근거 기반 소개',
      actionPlan: '실행 계획',
    }
    const sectionPaths = ['introduction', 'actionPlan']
    const evidenceRefs: SectionEvidenceRefs = {
      introduction: [{ id: 'SIG:intro', keyword: '소개' }],
      actionPlan: [{ id: 'SIG:plan', keyword: '실행' }],
    }

    const quality = buildReportQualityMetrics({
      sections,
      sectionPaths,
      evidenceRefs,
      context: {
        requiredPaths: sectionPaths,
        scenarioBundles: [
          {
            id: 'S1',
            domain: 'career',
            main: { eventIds: [], summaryTokens: [] },
            alt: [],
            selectionWhy: { claimIds: [], signalIds: [], anchorIds: [] },
          },
          {
            id: 'S2',
            domain: 'relationship',
            main: { eventIds: [], summaryTokens: [] },
            alt: [],
            selectionWhy: { claimIds: [], signalIds: [], anchorIds: [] },
          },
          {
            id: 'S3',
            domain: 'wealth',
            main: { eventIds: [], summaryTokens: [] },
            alt: [],
            selectionWhy: { claimIds: [], signalIds: [], anchorIds: [] },
          },
          {
            id: 'S4',
            domain: 'move',
            main: { eventIds: [], summaryTokens: [] },
            alt: [],
            selectionWhy: { claimIds: [], signalIds: [], anchorIds: [] },
          },
          {
            id: 'S5',
            domain: 'timing',
            main: { eventIds: [], summaryTokens: [] },
            alt: [],
            selectionWhy: { claimIds: [], signalIds: [], anchorIds: [] },
          },
        ],
      },
      minEvidenceRefsPerSection: 1,
      regex: {
        recheck: /재확인/i,
        absoluteRisk: /절대/i,
        irreversibleAction: /서명/i,
        cautionIndicator: /주의/i,
        immediateForce: /즉시/i,
        mitigation: /점검/i,
        recommendationTone: /권장/i,
      },
      hasEvidenceSupport: () => true,
      forbiddenAdditionsPass: true,
    })

    expect(quality.scenarioBundleCoverage).toBe(1)
  })
})
