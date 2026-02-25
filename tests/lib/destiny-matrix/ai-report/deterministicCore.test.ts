import { describe, expect, it } from 'vitest'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import { buildDeterministicCore } from '@/lib/destiny-matrix/ai-report/deterministicCore'

function mockInput(): MatrixCalculationInput {
  return {
    dayMasterElement: '금' as any,
    pillarElements: ['목', '토', '금', '수'] as any,
    sibsinDistribution: { A: 2, B: 1 } as any,
    twelveStages: {},
    relations: [{ kind: '지지삼합', pillars: ['year'], detail: 'test' }] as any,
    geokguk: 'jeongjae',
    yongsin: '화' as any,
    currentDaeunElement: '화' as any,
    currentSaeunElement: '화' as any,
    shinsalList: ['도화', '천을귀인'] as any,
    dominantWesternElement: 'air',
    planetHouses: { Sun: 1, Moon: 4, Mercury: 1, Mars: 7, Jupiter: 10, Saturn: 1, Venus: 11 } as any,
    planetSigns: { Sun: '물병자리', Moon: '쌍둥이자리', Mercury: '물병자리' } as any,
    aspects: [
      { planet1: 'Sun', planet2: 'Moon', type: 'trine', orb: 1.2, angle: 120 },
      { planet1: 'Jupiter', planet2: 'Saturn', type: 'square', orb: 0.4, angle: 90 },
    ] as any,
    asteroidHouses: { Ceres: 7 } as any,
    extraPointSigns: { Chiron: '처녀자리' } as any,
    sajuSnapshot: { pillars: {} },
    astrologySnapshot: { natal: {} },
    crossSnapshot: { anchors: [] },
    currentDateIso: '2026-02-25',
    profileContext: { birthDate: '1995-02-09', birthTime: '06:40' },
    lang: 'ko',
  }
}

function mockReport(): FusionReport {
  return {
    overallScore: {
      total: 76,
      grade: 'A',
      drivers: ['driver1'],
      cautions: ['c1'],
    } as any,
    topInsights: [{ title: 't1' }] as any,
    domainAnalysis: [{ domain: 'career', score: 80, grade: 'A' }] as any,
  } as FusionReport
}

describe('deterministicCore', () => {
  it('builds all-data coverage and decision for binary question', () => {
    const core = buildDeterministicCore({
      matrixInput: mockInput(),
      matrixReport: mockReport(),
      graphEvidence: {
        mode: 'comprehensive',
        anchors: [
          {
            id: 'A1',
            section: 'intro',
            sajuEvidence: '',
            astrologyEvidence: '',
            crossConclusion: '',
            crossEvidenceSets: [{ id: 'x1' } as any],
          },
          {
            id: 'A2',
            section: 'career',
            sajuEvidence: '',
            astrologyEvidence: '',
            crossConclusion: '',
            crossEvidenceSets: [{ id: 'x2' } as any],
          },
        ],
      } as any,
      userQuestion: '여기로 가는게 맞냐?',
      lang: 'ko',
    })

    expect(core.coverage.saju.hasDayMaster).toBe(true)
    expect(core.coverage.astrology.aspectCount).toBe(2)
    expect(core.coverage.cross.graphAnchorCount).toBe(2)
    expect(core.coverage.cross.currentDateIso).toBe('2026-02-25')
    expect(core.decision.enabled).toBe(true)
    expect(core.decision.score).toBeGreaterThan(0)
    expect(core.promptBlock).toContain('Deterministic Core')
    expect(core.promptBlock).toContain('currentDate=2026-02-25')
  })

  it('applies profile weights (strict <= balanced <= aggressive score tendency)', () => {
    const common = {
      matrixInput: mockInput(),
      matrixReport: mockReport(),
      graphEvidence: {
        mode: 'comprehensive',
        anchors: [
          { id: 'A1', section: 'intro', sajuEvidence: '', astrologyEvidence: '', crossConclusion: '', crossEvidenceSets: [{ id: 'x1' } as any] },
          { id: 'A2', section: 'career', sajuEvidence: '', astrologyEvidence: '', crossConclusion: '', crossEvidenceSets: [{ id: 'x2' } as any] },
          { id: 'A3', section: 'timing', sajuEvidence: '', astrologyEvidence: '', crossConclusion: '', crossEvidenceSets: [{ id: 'x3' } as any] },
          { id: 'A4', section: 'wealth', sajuEvidence: '', astrologyEvidence: '', crossConclusion: '', crossEvidenceSets: [{ id: 'x4' } as any] },
          { id: 'A5', section: 'health', sajuEvidence: '', astrologyEvidence: '', crossConclusion: '', crossEvidenceSets: [{ id: 'x5' } as any] },
          { id: 'A6', section: 'relation', sajuEvidence: '', astrologyEvidence: '', crossConclusion: '', crossEvidenceSets: [{ id: 'x6' } as any] },
        ],
      } as any,
      userQuestion: '이 길로 가도 되나요?',
      lang: 'ko' as const,
    }

    const strict = buildDeterministicCore({ ...common, profile: 'strict' })
    const balanced = buildDeterministicCore({ ...common, profile: 'balanced' })
    const aggressive = buildDeterministicCore({ ...common, profile: 'aggressive' })

    expect(strict.profile).toBe('strict')
    expect(aggressive.profile).toBe('aggressive')
    expect(strict.decision.score).toBeLessThanOrEqual(balanced.decision.score)
    expect(balanced.decision.score).toBeLessThanOrEqual(aggressive.decision.score)
  })
})
