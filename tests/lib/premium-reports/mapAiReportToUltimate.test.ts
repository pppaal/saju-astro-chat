import { describe, expect, it } from 'vitest'

import {
  mapAiReportToUltimate,
  type LegacyReportLike,
} from '@/lib/premium-reports/mapAiReportToUltimate'
import type { UltimateComputed } from '@/lib/premium-reports/ultimateReport'

const baseComputed: UltimateComputed = {
  dayMaster: { stem: '丁', element: '화', yinYang: '음' },
  sajuPillars: [
    {
      label: 'year',
      labelKo: '연주(年柱)',
      stem: '丙',
      branch: '午',
      stemElement: '화',
      branchElement: '화',
    },
    {
      label: 'month',
      labelKo: '월주(月柱)',
      stem: '癸',
      branch: '巳',
      stemElement: '수',
      branchElement: '화',
    },
    {
      label: 'day',
      labelKo: '일주(日柱)',
      stem: '丁',
      branch: '卯',
      stemElement: '화',
      branchElement: '목',
    },
    {
      label: 'time',
      labelKo: '시주(時柱)',
      stem: '庚',
      branch: '戌',
      stemElement: '금',
      branchElement: '토',
    },
  ],
  astroPlacements: [
    { body: 'Sun', bodyKo: '태양', sign: 'Taurus', signKo: '황소자리', house: 1 },
    { body: 'Moon', bodyKo: '달', sign: 'Scorpio', signKo: '전갈자리', house: 7 },
    { body: 'Venus', bodyKo: '금성', sign: 'Taurus', signKo: '황소자리', house: 1 },
    { body: 'Mars', bodyKo: '화성', sign: 'Leo', signKo: '사자자리', house: 4 },
  ],
  fiveElements: { wood: 1, fire: 4, earth: 1, metal: 1, water: 1 },
}

describe('mapAiReportToUltimate', () => {
  it('builds a monthly UltimateReport from a TimingAIPremiumReport-like payload', () => {
    const legacy: LegacyReportLike = {
      id: 'legacy-monthly-1',
      generatedAt: '2026-05-01T00:00:00.000Z',
      lang: 'ko',
      profile: { name: '테스터', dayMaster: '丁', dominantElement: '화' },
      period: 'monthly',
      targetDate: '2026-05-01',
      periodLabel: '2026년 5월',
      sections: {
        overview: '5월은 활동 에너지가 강하게 올라오는 시기입니다.\n\n주요 흐름은 사람과의 만남에서 발생합니다.',
        energy: '중순 이후 갈등 변동성이 커질 수 있으니 일정 분산이 필요합니다.',
        opportunities: '- 새 사람과의 협업 시도\n- 평소 미루던 결정 마무리',
        cautions: '- 과음과 무리한 일정\n- 즉흥적 금전 결정',
        domains: {
          career: '커리어 영역에서는 추진력이 높아지고 작은 결과가 큰 신뢰로 이어집니다.',
          love: '관계 영역에서는 정서적 교감이 깊어지며 새로운 인연 가능성도 열려 있습니다.',
          wealth: '재물 흐름은 안정적이지만 변동성 자산은 신중하게 다뤄야 합니다.',
          health: '건강은 회복기에 들어서며 가벼운 운동과 수면 리듬 회복이 효과적입니다.',
        },
        actionPlan: '- 핵심 약속만 살리기\n- 매주 한 번 점검 루틴 만들기',
      },
      timelineEvents: [
        {
          id: 'ev-1',
          thesis: '중순 협업 미팅에서 결정이 빨라지는 시기',
          timeHint: { date: '2026-05-12' },
        },
        {
          id: 'ev-2',
          thesis: '하순 갈등 가능성, 의사결정 보류 권장',
          timeHint: { date: '2026-05-22' },
        },
      ],
      matrixSummary: {
        overallScore: 72,
        grade: 'B',
        topInsights: ['추진력 강화', '관계 정합도 상승'],
        keyStrengths: ['새 사람과의 협업 시도'],
        keyChallenges: ['과음과 무리한 일정'],
      },
      periodScore: { overall: 72, career: 78, love: 80, wealth: 65, health: 60 },
      meta: { modelUsed: 'claude-test' },
    }

    const ult = mapAiReportToUltimate({
      reportId: 'r-1',
      period: 'monthly',
      targetDate: '2026-05-01',
      legacy,
      computed: baseComputed,
    })

    expect(ult.meta.period).toBe('monthly')
    expect(ult.meta.targetDate).toBe('2026-05-01')
    expect(ult.meta.lang).toBe('ko')
    expect(ult.meta.modelUsed).toBe('claude-test')

    expect(ult.core.theme).toContain('2026년 5월')
    expect(ult.core.summary.length).toBeGreaterThan(0)
    expect(ult.core.summary.length).toBeLessThanOrEqual(4)

    expect(ult.core.insights).toHaveLength(4)
    const careerInsight = ult.core.insights.find((i) => i.id === 'career')
    expect(careerInsight).toBeDefined()
    expect(careerInsight?.content[0]).toContain('추진력')

    expect(ult.core.keyDates.length).toBeGreaterThan(0)
    expect(ult.core.keyDates[0].date).toBe('2026-05-12')

    expect(ult.core.dosAndDonts.dos.length).toBeGreaterThan(0)
    expect(ult.core.dosAndDonts.donts.length).toBeGreaterThan(0)

    expect(ult.core.radar).toHaveLength(5)
    const careerAxis = ult.core.radar.find((r) => r.subject === '커리어')
    expect(careerAxis?.value).toBe(78)

    expect(ult.narrative.crossMatrix).toHaveLength(4)
    const personalityRow = ult.narrative.crossMatrix[0]
    expect(personalityRow.sajuVariable).toContain('일주')
    expect(personalityRow.astroVariable).toContain('Sun')
    expect(personalityRow.score).toBeGreaterThanOrEqual(0)

    expect(ult.narrative.volatility.points).toHaveLength(5)
    expect(ult.narrative.volatility.primaryLabel).toBe('에너지 지수')

    expect(ult.computed).toEqual(baseComputed)
  })

  it('falls back gracefully when sections are missing', () => {
    const legacy: LegacyReportLike = {
      id: 'legacy-empty',
      lang: 'ko',
      profile: { dayMaster: '丁', dominantElement: '화' },
      sections: {},
      matrixSummary: {},
    }

    const ult = mapAiReportToUltimate({
      reportId: 'r-empty',
      period: 'comprehensive',
      legacy,
      computed: baseComputed,
    })

    expect(ult.core.summary.length).toBeGreaterThan(0)
    expect(ult.core.insights).toHaveLength(4)
    expect(ult.core.radar).toHaveLength(5)
    // Comprehensive radar uses domain keys (성격/자아 etc.)
    expect(ult.core.radar[0].subject).toBe('성격/자아')
    // Volatility for comprehensive uses age buckets
    expect(ult.narrative.volatility.points.map((p) => p.axis)).toEqual([
      '10대',
      '20대',
      '30대',
      '40대',
      '50대+',
    ])
  })
})
