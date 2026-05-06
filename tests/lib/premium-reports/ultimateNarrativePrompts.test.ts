import { describe, expect, it } from 'vitest'

import {
  buildUltimateNarrativeSystemPrompt,
  buildUltimateNarrativeUserPrompt,
} from '@/lib/premium-reports/ultimateNarrativePrompts'
import type { UltimateComputed } from '@/lib/premium-reports/ultimateReport'

const computed: UltimateComputed = {
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
  ],
  fiveElements: { wood: 1, fire: 4, earth: 1, metal: 1, water: 1 },
}

describe('buildUltimateNarrativeSystemPrompt', () => {
  it('mentions the period-specific framing', () => {
    expect(buildUltimateNarrativeSystemPrompt('monthly')).toContain('Monthly')
    expect(buildUltimateNarrativeSystemPrompt('yearly')).toContain('Yearly')
    expect(buildUltimateNarrativeSystemPrompt('comprehensive')).toContain('Lifetime')
  })

  it('demands JSON-only output and length rules', () => {
    const prompt = buildUltimateNarrativeSystemPrompt('monthly')
    expect(prompt).toContain('JSON')
    expect(prompt).toContain('summary')
    expect(prompt).toContain('keyDates')
    expect(prompt).toContain('radar')
  })
})

describe('buildUltimateNarrativeUserPrompt', () => {
  it('embeds computed pillars + placements and the period label', () => {
    const userPrompt = buildUltimateNarrativeUserPrompt({
      period: 'monthly',
      periodLabel: '2026년 5월',
      targetDate: '2026-05-01',
      computed,
      legacySections: {
        overview: '5월은 활동 에너지가 강하게 올라오는 시기입니다.',
        energy: '중순 이후 변동성이 커집니다.',
      },
      matrixHints: {
        overallScore: 72,
        topInsights: ['추진력 강화'],
        keyChallenges: ['과음과 무리한 일정'],
      },
    })
    expect(userPrompt).toContain('2026년 5월')
    expect(userPrompt).toContain('일주(日柱)')
    expect(userPrompt).toContain('태양 in 황소자리')
    expect(userPrompt).toContain('상위 인사이트')
    expect(userPrompt).toContain('overview')
  })

  it('handles missing legacy sections gracefully', () => {
    const userPrompt = buildUltimateNarrativeUserPrompt({
      period: 'comprehensive',
      periodLabel: '인생 전체',
      computed,
      legacySections: {},
    })
    expect(userPrompt).toContain('이전 단계 분석 텍스트 없음')
  })
})
