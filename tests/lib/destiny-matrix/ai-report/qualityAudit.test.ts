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
        orbEvidenceScore: 70,
        actionabilityScore: 80,
        clarityScore: 85,
        antiOverclaimScore: 100,
        overclaimIssueCount: 0,
        overclaimFindings: [],
        shouldBlock: false,
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

  it('blocks when absolute/exaggerated claims appear without evidence or hedging', () => {
    const result = evaluateThemedReportQuality({
      sections: {
        deepAnalysis: '당신은 반드시 대박난다. 절대 실패하지 않는다.',
        patterns: '이 선택은 100% 성공이다. 무조건 이긴다.',
        timing: '지금 아니면 인생 파탄이다.',
        recommendations: ['그냥 바로 투자해라.'],
        actionPlan: '당장 실행.',
        strategy: '한 번에 끝낸다.',
      },
      theme: 'career',
      lang: 'ko',
    })

    expect(result.overclaimIssueCount).toBeGreaterThanOrEqual(2)
    expect(result.antiOverclaimScore).toBeLessThan(60)
    expect(result.shouldBlock).toBe(true)
    expect(result.overclaimFindings.length).toBeGreaterThan(0)
    expect(result.overclaimFindings.some((item) => item.section === 'deepAnalysis')).toBe(true)
  })

  it('does not block when strong claims include evidence markers or hedging', () => {
    const result = evaluateThemedReportQuality({
      sections: {
        deepAnalysis: '가능성이 큽니다. 근거: 사주 대운 변화와 점성 트랜싯이 동시에 활성화됩니다.',
        patterns: '상승 경향이 있습니다. evidence: saju cycle shift + astrology house activation.',
        timing:
          '변동 가능성이 있으므로 보수적으로 접근하세요. source: angle=90deg orb=1.5deg allowed=6deg.',
        recommendations: '사주와 점성 근거를 함께 확인하며 주간 점검을 권장합니다.',
        actionPlan: '1주 목표 설정. 2주 실행. 3주 점검. 4주 보정.',
        strategy: 'likely outcome 기준으로 리스크를 단계적으로 줄입니다.',
      },
      theme: 'career',
      lang: 'ko',
    })

    expect(result.overclaimIssueCount).toBe(0)
    expect(result.antiOverclaimScore).toBe(100)
    expect(result.shouldBlock).toBe(false)
    expect(result.overclaimFindings).toHaveLength(0)
  })
})
