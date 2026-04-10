import { describe, expect, it } from 'vitest'
import {
  buildReportQualityMetrics,
  evaluateReportStyleGate,
} from '@/lib/destiny-matrix/ai-report/reportQuality'
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

  it('treats ambiguity and signal-thinness warnings as observational when score stays high', () => {
    const sections = {
      overview: '사주 구조와 점성 타이밍이 함께 열리는 구간입니다.',
      actionPlan: '지금은 조건부터 문서로 정리하고 다음 창을 기다리세요.',
    }
    const sectionPaths = ['overview', 'actionPlan']
    const evidenceRefs: SectionEvidenceRefs = {
      overview: [{ id: 'SIG:overview', keyword: '구조' }],
      actionPlan: [{ id: 'SIG:action', keyword: '조건' }],
    }

    const quality = buildReportQualityMetrics({
      sections,
      sectionPaths,
      evidenceRefs,
      context: {
        requiredPaths: sectionPaths,
        coreQuality: {
          score: 100,
          grade: 'A',
          warnings: [
            'focus_domain_ambiguity_high',
            'verification_bias_active',
            'advanced_astro_signal_coverage_low',
            'timing_signal_coverage_low',
            'top_decision_gap_low',
          ],
        },
      },
      minEvidenceRefsPerSection: 1,
      regex: {
        recheck: /재확인/i,
        absoluteRisk: /절대/i,
        irreversibleAction: /서명/i,
        cautionIndicator: /주의/i,
        immediateForce: /즉시/i,
        mitigation: /점검|조건/i,
        recommendationTone: /우선|먼저|하세요/i,
      },
      hasEvidenceSupport: () => true,
      forbiddenAdditionsPass: true,
    })

    expect(quality.coreQualityWarningCount).toBe(5)
    expect(quality.coreQualityBlockingWarningCount).toBe(0)
    expect(quality.coreQualityBlockingWarnings).toEqual([])
    expect(quality.coreQualityPass).toBe(true)
  })

  it('keeps structural coverage warnings as blocking even with a high score', () => {
    const sections = {
      overview: '사주 구조와 점성 타이밍을 함께 검토한 결과입니다.',
      actionPlan: '지금은 범위와 역할부터 다시 확인하세요.',
    }
    const sectionPaths = ['overview', 'actionPlan']
    const evidenceRefs: SectionEvidenceRefs = {
      overview: [{ id: 'SIG:overview', keyword: '구조' }],
      actionPlan: [{ id: 'SIG:action', keyword: '역할' }],
    }

    const quality = buildReportQualityMetrics({
      sections,
      sectionPaths,
      evidenceRefs,
      context: {
        requiredPaths: sectionPaths,
        coreQuality: {
          score: 96,
          grade: 'A',
          warnings: ['scenario_domain_coverage_low', 'decision_domain_coverage_low'],
        },
      },
      minEvidenceRefsPerSection: 1,
      regex: {
        recheck: /재확인/i,
        absoluteRisk: /절대/i,
        irreversibleAction: /서명/i,
        cautionIndicator: /주의/i,
        immediateForce: /즉시/i,
        mitigation: /점검|조건/i,
        recommendationTone: /우선|먼저|하세요/i,
      },
      hasEvidenceSupport: () => true,
      forbiddenAdditionsPass: true,
    })

    expect(quality.coreQualityBlockingWarningCount).toBe(2)
    expect(quality.coreQualityBlockingWarnings).toEqual([
      'scenario_domain_coverage_low',
      'decision_domain_coverage_low',
    ])
    expect(quality.coreQualityPass).toBe(false)
  })

  it('fails style gate when the report is too abstract and lead patterns repeat', () => {
    const result = evaluateReportStyleGate('themed', {
      sectionCount: 5,
      avgSectionChars: 250,
      evidenceCoverageRatio: 1,
      minEvidenceSatisfiedRatio: 1,
      contradictionCount: 0,
      recheckGuidanceRatio: 0.2,
      overclaimCount: 0,
      repetitiveLeadPatternCount: 2,
      abstractNounRatio: 0.14,
      sentenceLengthVariance: 320,
      bilingualToneSkew: 0.05,
    })

    expect(result.pass).toBe(false)
    expect(result.warnings).toContain('repetitive_lead_patterns_high')
    expect(result.warnings).toContain('abstract_noun_ratio_high')
  })

  it('fails style gate when sentence rhythm is too flat or bilingual skew is high', () => {
    const result = evaluateReportStyleGate('comprehensive', {
      sectionCount: 6,
      avgSectionChars: 420,
      evidenceCoverageRatio: 1,
      minEvidenceSatisfiedRatio: 1,
      contradictionCount: 0,
      recheckGuidanceRatio: 0.2,
      overclaimCount: 0,
      repetitiveLeadPatternCount: 0,
      abstractNounRatio: 0.08,
      sentenceLengthVariance: 12,
      bilingualToneSkew: 0.3,
    })

    expect(result.pass).toBe(false)
    expect(result.warnings).toContain('sentence_length_variance_too_flat')
    expect(result.warnings).toContain('bilingual_tone_skew_high')
  })

  it('does not treat a clean single-language report as bilingual skew', () => {
    const quality = buildReportQualityMetrics({
      sections: {
        introduction:
          'The current phase rewards explicit standards, staged verification, and careful commitment.',
        actionPlan:
          'Review the route, the housing terms, and the daily cost before you choose the next step.',
        conclusion:
          'The stronger outcome comes from verification discipline, not from one fast emotional decision.',
      },
      sectionPaths: ['introduction', 'actionPlan', 'conclusion'],
      evidenceRefs: {
        introduction: [{ claimId: 'c1', sourceType: 'derived' }],
        actionPlan: [{ claimId: 'c2', sourceType: 'derived' }],
        conclusion: [{ claimId: 'c3', sourceType: 'derived' }],
      },
      context: {},
      minEvidenceRefsPerSection: 1,
      regex: {
        recheck: /review|verify/i,
        absoluteRisk: /never/i,
        irreversibleAction: /sign/i,
        cautionIndicator: /risk|caution/i,
        immediateForce: /immediately/i,
        mitigation: /review|verify|condition/i,
        recommendationTone: /start|review|verify/i,
      },
      hasEvidenceSupport: () => true,
      forbiddenAdditionsPass: true,
    })

    expect(quality.bilingualToneSkew || 0).toBeLessThan(0.05)
    expect(evaluateReportStyleGate('comprehensive', quality).warnings).not.toContain(
      'bilingual_tone_skew_high'
    )
  })

  it('infers move event coverage from relocation text even without timeline events', () => {
    const quality = buildReportQualityMetrics({
      sections: {
        timing:
          'This relocation window is best used to compare the route, the living base, and the lease terms before you commit.',
        actionPlan:
          'Review the commute, housing cost, and daily friction first, then narrow the move to one reversible step.',
      },
      sectionPaths: ['timing', 'actionPlan'],
      evidenceRefs: {
        timing: [{ claimId: 'c1', sourceType: 'derived' }],
        actionPlan: [{ claimId: 'c2', sourceType: 'derived' }],
      },
      context: {
        timelineEvents: [],
      },
      minEvidenceRefsPerSection: 1,
      regex: {
        recheck: /review|verify/i,
        absoluteRisk: /never/i,
        irreversibleAction: /sign/i,
        cautionIndicator: /risk|caution/i,
        immediateForce: /immediately/i,
        mitigation: /review|verify|condition/i,
        recommendationTone: /start|review|verify/i,
      },
      hasEvidenceSupport: () => true,
      forbiddenAdditionsPass: true,
    })

    expect(quality.eventCountByDomain?.move).toBe(1)
  })
})
