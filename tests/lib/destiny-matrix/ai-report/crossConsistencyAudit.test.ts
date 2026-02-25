import { describe, expect, it } from 'vitest'
import { auditCrossConsistency } from '@/lib/destiny-matrix/ai-report/crossConsistencyAudit'

describe('crossConsistencyAudit', () => {
  it('passes most checks for dense comprehensive data', () => {
    const result = auditCrossConsistency({
      mode: 'comprehensive',
      matrixInput: {
        dayMasterElement: '금',
        pillarElements: ['목', '화', '토', '금'],
        sibsinDistribution: { 정관: 2, 정재: 1, 식신: 1 },
        twelveStages: {},
        relations: [],
        geokguk: 'jeongjae',
        yongsin: '화',
        currentDaeunElement: '수',
        currentSaeunElement: '화',
        shinsalList: ['천을귀인'],
        dominantWesternElement: 'air',
        planetHouses: {
          Sun: 1,
          Moon: 4,
          Mercury: 1,
          Venus: 11,
          Mars: 7,
          Jupiter: 10,
          Saturn: 1,
        },
        planetSigns: {
          Sun: '물병자리',
          Moon: '쌍둥이자리',
          Mercury: '물병자리',
          Venus: '염소자리',
          Mars: '사자자리',
          Jupiter: '사수자리',
          Saturn: '물고기자리',
        },
        aspects: [
          { planet1: 'Sun', planet2: 'Mars', type: 'opposition', orb: 4.5, angle: 180 },
          { planet1: 'Moon', planet2: 'Mercury', type: 'trine', orb: 4.6, angle: 120 },
          { planet1: 'Jupiter', planet2: 'Saturn', type: 'square', orb: 0.4, angle: 90 },
          { planet1: 'Moon', planet2: 'Pluto', type: 'opposition', orb: 4.0, angle: 180 },
          { planet1: 'Sun', planet2: 'Moon', type: 'trine', orb: 6.0, angle: 120 },
        ],
        activeTransits: [],
        asteroidHouses: { Juno: 7 },
        extraPointSigns: { Chiron: '처녀자리', NorthNode: '전갈자리' },
        lang: 'ko',
        profileContext: {
          birthDate: '1995-02-09',
          birthTime: '06:40',
          timezone: 'Asia/Seoul',
        },
      } as any,
      report: {
        sections: {
          introduction: '사주와 점성의 교차 근거를 기반으로 삶의 큰 흐름을 정리합니다.',
          personalityDeep:
            '사주 일간과 점성 1하우스 배치를 함께 보면 성향이 안정적으로 교차됩니다.',
          careerPath: '사주 격국과 점성 10하우스가 함께 커리어 방향을 지지합니다.',
          relationshipDynamics: '사주 대운과 점성 7하우스를 함께 보면 관계 리듬이 보입니다.',
          wealthPotential: '사주 재성 구조와 점성 목성 흐름을 함께 보며 재물 전략을 잡습니다.',
          timingAdvice: '사주 세운과 점성 트랜싯을 함께 맞춰 타이밍을 읽습니다.',
          actionPlan: '사주 근거와 점성 근거를 결합해 현실 실행 계획을 세웁니다.',
          conclusion: '사주 점성 교차 해석으로 실전 결론을 정리합니다.',
        },
      },
      graphEvidence: {
        mode: 'comprehensive',
        anchors: Array.from({ length: 10 }).map((_, idx) => ({
          id: `E${idx + 1}`,
          section: `section-${idx + 1}`,
          sajuEvidence: 'saju basis',
          astrologyEvidence: 'astro basis',
          crossConclusion: 'cross',
          crossEvidenceSets: [
            { id: `X${idx + 1}`, overlapDomains: [], overlapScore: 60, orbFitScore: 60 } as any,
          ],
        })),
      } as any,
    })

    expect(result.score).toBeGreaterThanOrEqual(85)
    expect(result.blockers).toHaveLength(0)
  })

  it('flags blockers when core inputs are missing', () => {
    const result = auditCrossConsistency({
      mode: 'comprehensive',
      matrixInput: {
        dayMasterElement: '금',
        pillarElements: [],
        sibsinDistribution: {},
        twelveStages: {},
        relations: [],
        planetHouses: {},
        planetSigns: {},
        aspects: [],
      } as any,
      report: { sections: { introduction: '짧은 텍스트' } },
      graphEvidence: { mode: 'comprehensive', anchors: [] } as any,
    })

    expect(result.score).toBeLessThan(60)
    expect(result.blockers.length).toBeGreaterThan(0)
  })
})
