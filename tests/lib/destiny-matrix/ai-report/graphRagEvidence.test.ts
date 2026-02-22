import { describe, expect, it } from 'vitest'
import {
  buildGraphRAGEvidence,
  formatGraphRAGEvidenceForPrompt,
  summarizeGraphRAGEvidence,
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
      aspects: [{ planet1: 'Sun', type: 'trine', planet2: 'Jupiter', angle: 120, orb: 1.2 }],
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
      expect(anchor.crossEvidenceSets.length).toBeGreaterThan(0)
      expect(anchor.crossEvidenceSets[0].astrologyEvidence).toContain('angle=')
      expect(anchor.crossEvidenceSets[0].astrologyEvidence).toContain('orb=')
      expect(anchor.crossEvidenceSets[0].astrologyEvidence).toContain('allowed=')
      expect(anchor.crossEvidenceSets[0].orbFitScore).toBeGreaterThanOrEqual(0)
    }

    const prompt = formatGraphRAGEvidenceForPrompt(evidence, 'en')
    expect(prompt).toContain('Each section must include')
    expect(prompt).toContain('set X')
    expect(prompt).toContain('angle=')
    expect(prompt).toContain('orb=')
    expect(prompt).toContain('allowed=')
    expect(prompt).toContain('orbFit=')
    expect(prompt).not.toContain('Hero Title')
    expect(prompt).not.toContain('TODO')
  })

  it('keeps cross evidence score high for a golden section set', () => {
    const result = evaluateThemedReportQuality({
      theme: 'career',
      lang: 'en',
      sections: {
        deepAnalysis:
          'Saju day-master and ten-god pattern indicates discipline; astrology transit and house focus confirms timing with angle=120deg orb=1.2deg allowed=6deg.',
        patterns:
          'Saju structure shows stable wealth flow, while astrology planetary aspects indicate expansion windows with angle=60deg orb=2.0deg allowed=5deg.',
        timing:
          'Saju luck-cycle turning point aligns with astrology transit activation in career houses and highlights angle=90deg orb=1.5deg allowed=6deg timing pressure.',
        recommendations:
          'Use saju timing checkpoints and astrology transit windows to sequence decisions. Keep weekly checkpoints and monthly review notes to track outcomes.',
        actionPlan:
          'Week 1: define one goal. Week 2: execute one experiment during the indicated timing window. Week 3: review risk and adjust. Week 4: lock one practical routine.',
        strategy:
          'Combine saju baseline risk profile with astrology momentum signals before commitment, then validate the decision with one measurable KPI and one fallback option.',
      },
    })

    expect(result.crossEvidenceScore).toBeGreaterThanOrEqual(80)
    expect(result.overallQualityScore).toBeGreaterThanOrEqual(75)
  })

  it('creates compact summary for API response reuse', () => {
    const evidence = buildGraphRAGEvidence(
      {
        dayMasterElement: 'Wood',
        geokguk: '정관격',
        yongsin: 'Fire',
        sibsinDistribution: { 정관: 30, 편재: 20 },
        dominantWesternElement: 'Fire',
        planetHouses: { Sun: 1, Moon: 7 },
        aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'conjunction', angle: 0, orb: 0.8 }],
      } as any,
      {
        overallScore: { total: 84, grade: 'A' },
        topInsights: [{ title: 'Career momentum', score: 88 }],
      } as any,
      { mode: 'comprehensive' }
    )

    const summary = summarizeGraphRAGEvidence(evidence)
    expect(summary).not.toBeNull()
    expect(summary?.totalAnchors).toBeGreaterThan(0)
    expect(summary?.totalSets).toBeGreaterThan(0)
    expect(summary?.anchors[0].sets[0].astrologyEvidence).toContain('angle=')
    expect(summary?.anchors[0].sets[0].astrologyEvidence).toContain('orb=')
  })

  it('keeps birth context and transit evidence in cross sets', () => {
    const evidence = buildGraphRAGEvidence(
      {
        dayMasterElement: 'Wood',
        geokguk: 'ì •ê´€ê²©',
        yongsin: 'Fire',
        sibsinDistribution: { career: 30, wealth: 20 },
        dominantWesternElement: 'Fire',
        planetHouses: { Sun: 1, Moon: 7 },
        aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'conjunction', angle: 0, orb: 0.8 }],
        activeTransits: ['saturnReturn'],
        profileContext: {
          birthDate: '1991-08-20',
          birthTime: '14:30',
          birthCity: 'Seoul',
          timezone: 'Asia/Seoul',
          latitude: 37.5665,
          longitude: 126.978,
          analysisAt: '2026-02-20T09:30:00.000Z',
        },
      } as any,
      {
        overallScore: { total: 84, grade: 'A' },
        topInsights: [{ title: 'Career momentum', score: 88 }],
      } as any,
      { mode: 'timing', period: 'monthly' }
    )

    const firstAnchor = evidence.anchors[0]
    expect(firstAnchor.sajuEvidence).toContain('birthDate=1991-08-20')
    expect(firstAnchor.sajuEvidence).toContain('birthTime=14:30')
    expect(firstAnchor.crossEvidenceSets.some((set) => set.id.startsWith('T'))).toBe(true)

    const prompt = formatGraphRAGEvidenceForPrompt(evidence, 'en')
    expect(prompt).toContain('[T1]')
  })
})
