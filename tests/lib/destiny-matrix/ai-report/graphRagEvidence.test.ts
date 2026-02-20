import { describe, expect, it } from 'vitest'
import {
  buildGraphRAGEvidence,
  formatGraphRAGEvidenceForPrompt,
} from '@/lib/destiny-matrix/ai-report/graphRagEvidence'
import { evaluateThemedReportQuality } from '@/lib/destiny-matrix/ai-report/qualityAudit'

describe('graphRagEvidence quality guardrail', () => {
  it('builds anchors with deterministic saju+astrology+cross fields', () => {
    const input = {
      dayMasterElement: 'Wood',
      geokguk: '정관격',
      yongsin: 'Fire',
      sibsinDistribution: { 정관: 30, 편재: 20, 식신: 10 },
      dominantWesternElement: 'Fire',
      planetHouses: { Sun: 1, Moon: 7, Jupiter: 10 },
      aspects: [{ planet1: 'Sun', type: 'trine', planet2: 'Jupiter' }],
      currentDaeunElement: 'Metal',
      currentSaeunElement: 'Water',
    } as any

    const report = {
      overallScore: { total: 84, grade: 'A' },
      topInsights: [
        { title: 'Career momentum', score: 88 },
        { title: 'Relationship balance', score: 80 },
      ],
    } as any

    const evidence = buildGraphRAGEvidence(input, report, { mode: 'comprehensive' })
    expect(evidence.anchors.length).toBe(10)
    for (const anchor of evidence.anchors) {
      expect(anchor.sajuEvidence.length).toBeGreaterThan(20)
      expect(anchor.astrologyEvidence.length).toBeGreaterThan(20)
      expect(anchor.crossConclusion.length).toBeGreaterThan(20)
    }

    const prompt = formatGraphRAGEvidenceForPrompt(evidence, 'en')
    expect(prompt).toContain('Each section must include')
    expect(prompt).not.toContain('Hero Title')
    expect(prompt).not.toContain('TODO')
  })

  it('keeps cross evidence score high for a golden section set', () => {
    const result = evaluateThemedReportQuality({
      theme: 'career',
      lang: 'en',
      sections: {
        deepAnalysis:
          'Saju day-master and ten-god pattern indicates discipline; astrology transit and house focus confirms timing.',
        patterns:
          'Saju structure shows stable wealth flow, while astrology planetary aspects indicate expansion windows.',
        timing:
          'Saju luck-cycle turning point aligns with astrology transit activation in career houses.',
        recommendations:
          'Use saju timing checkpoints and astrology transit windows to sequence decisions.',
        actionPlan:
          'Week 1: define one goal. Week 2: execute one experiment during the indicated timing window.',
        strategy:
          'Combine saju baseline risk profile with astrology momentum signals before commitment.',
      },
    })

    expect(result.crossEvidenceScore).toBeGreaterThanOrEqual(80)
    expect(result.overallQualityScore).toBeGreaterThanOrEqual(75)
  })
})
