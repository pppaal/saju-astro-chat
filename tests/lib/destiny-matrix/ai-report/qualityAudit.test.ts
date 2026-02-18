import { describe, it, expect } from 'vitest'
import {
  evaluateThemedReportQuality,
  toQualityMarkdown,
} from '@/lib/destiny-matrix/ai-report/qualityAudit'

describe('qualityAudit', () => {
  it('lowers completeness when required sections are missing', () => {
    const result = evaluateThemedReportQuality({
      sections: {
        deepAnalysis: '사주 근거와 점성 근거를 함께 봅니다.',
      },
      theme: 'love',
      lang: 'ko',
    })

    expect(result.completenessScore).toBeLessThan(80)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('lowers cross evidence when mixed basis is missing', () => {
    const result = evaluateThemedReportQuality({
      sections: {
        deepAnalysis: '사주 오행 분석만 제공합니다.',
        patterns: '사주 대운 분석만 제공합니다.',
        timing: '점성 트랜싯 분석만 제공합니다.',
        recommendations: ['행동 계획 1', '행동 계획 2'],
        actionPlan: '첫째 실행. 둘째 실행.',
      },
      theme: 'career',
      lang: 'ko',
    })

    expect(result.crossEvidenceScore).toBeLessThan(70)
  })

  it('lowers actionability when action guidance is thin', () => {
    const result = evaluateThemedReportQuality({
      sections: {
        deepAnalysis: '사주와 점성의 교차 근거를 제공합니다.',
        patterns: '사주와 점성의 흐름을 함께 분석합니다.',
        timing: '사주 대운과 점성 트랜싯을 함께 확인합니다.',
        recommendations: ['짧은 권고'],
        actionPlan: '실행',
        strategy: '간단 전략',
      },
      theme: 'career',
      lang: 'ko',
    })

    expect(result.actionabilityScore).toBeLessThan(60)
  })

  it('creates markdown report with key score lines', () => {
    const md = toQualityMarkdown({
      reportId: 'r1',
      title: 'Themed report',
      createdAt: '2026-02-18T00:00:00.000Z',
      quality: {
        completenessScore: 90,
        crossEvidenceScore: 88,
        actionabilityScore: 80,
        clarityScore: 85,
        overallQualityScore: 86,
        issues: ['issue 1'],
        strengths: ['strength 1'],
        recommendations: ['recommendation 1'],
      },
    })

    expect(md).toContain('Report ID: r1')
    expect(md).toContain('Overall: 86/100')
    expect(md).toContain('## Issues')
  })
})
