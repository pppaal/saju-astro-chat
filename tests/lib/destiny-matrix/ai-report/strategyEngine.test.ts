import { describe, expect, it } from 'vitest'
import type { SignalSynthesisResult } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import { buildPhaseStrategyEngine } from '@/lib/destiny-matrix/ai-report/strategyEngine'

function createSynthesisFixture(): SignalSynthesisResult {
  const selectedSignals = [
    {
      id: 'L6:im-gwan:H10',
      layer: 6,
      rowKey: 'im-gwan',
      colKey: 'H10',
      domainHints: ['career'],
      polarity: 'strength' as const,
      score: 10,
      rankScore: 10,
      keyword: 'career peak',
      sajuBasis: '임관',
      astroBasis: 'H10',
      advice: '핵심 과업 먼저 완결',
      tags: ['H10'],
    },
    {
      id: 'L5:chung:square',
      layer: 5,
      rowKey: 'chung',
      colKey: 'square',
      domainHints: ['career'],
      polarity: 'caution' as const,
      score: 7,
      rankScore: 4,
      keyword: 'tension',
      sajuBasis: '충',
      astroBasis: 'square',
      advice: '재확인',
      tags: ['square'],
    },
    {
      id: 'L2:pyeonjae:jupiter',
      layer: 2,
      rowKey: 'pyeonjae',
      colKey: 'jupiter',
      domainHints: ['wealth'],
      polarity: 'strength' as const,
      score: 8,
      rankScore: 8,
      keyword: 'opportunity',
      sajuBasis: '편재',
      astroBasis: 'Jupiter',
      advice: '조건 검증',
      tags: ['Jupiter'],
    },
    {
      id: 'L5:relation:square',
      layer: 5,
      rowKey: 'relation',
      colKey: 'square',
      domainHints: ['relationship'],
      polarity: 'caution' as const,
      score: 9,
      rankScore: 2,
      keyword: 'friction',
      sajuBasis: '상관',
      astroBasis: 'Mars',
      advice: '속도 조절',
      tags: ['Mars'],
    },
  ]

  return {
    normalizedSignals: selectedSignals,
    selectedSignals,
    claims: [
      {
        claimId: 'career_growth_with_guardrails',
        domain: 'career',
        thesis: '상승 신호와 리스크가 함께 존재합니다.',
        evidence: ['L6:im-gwan:H10', 'L5:chung:square'],
        riskControl: '확정 전 재확인',
        actions: ['우선순위 고정'],
      },
      {
        claimId: 'wealth_expansion',
        domain: 'wealth',
        thesis: '재정 기회가 열립니다.',
        evidence: ['L2:pyeonjae:jupiter'],
        riskControl: '금액/기한 확인',
        actions: ['소액 검증'],
      },
      {
        claimId: 'relationship_risk_control',
        domain: 'relationship',
        thesis: '관계는 해석 오차 관리가 필요합니다.',
        evidence: ['L5:relation:square'],
        riskControl: '속도 조절',
        actions: ['확인 질문'],
      },
    ],
    signalsById: selectedSignals.reduce<Record<string, (typeof selectedSignals)[number]>>(
      (acc, item) => {
        acc[item.id] = item
        return acc
      },
      {}
    ),
  }
}

describe('buildPhaseStrategyEngine', () => {
  it('builds overall and domain strategies with attack/defense split', () => {
    const result = buildPhaseStrategyEngine(createSynthesisFixture(), 'ko')
    expect(result).toBeTruthy()
    expect(result?.overallPhaseLabel).toBeTruthy()
    expect((result?.attackPercent || 0) + (result?.defensePercent || 0)).toBe(100)
    expect(result?.domainStrategies.length || 0).toBeGreaterThan(0)
  })

  it('marks high momentum + high caution career as high_tension_expansion', () => {
    const result = buildPhaseStrategyEngine(createSynthesisFixture(), 'ko')
    const career = result?.domainStrategies.find((item) => item.domain === 'career')
    expect(career).toBeTruthy()
    expect(career?.phase).toBe('high_tension_expansion')
    expect((career?.attackPercent || 0) + (career?.defensePercent || 0)).toBe(100)
  })

  it('applies timing activation multiplier to effective scores', () => {
    const base = buildPhaseStrategyEngine(createSynthesisFixture(), 'ko', {
      daeunActive: false,
      seunActive: false,
      activeTransitCount: 0,
    })
    const boosted = buildPhaseStrategyEngine(createSynthesisFixture(), 'ko', {
      daeunActive: true,
      seunActive: true,
      activeTransitCount: 2,
    })
    const baseCareer = base?.domainStrategies.find((item) => item.domain === 'career')
    const boostedCareer = boosted?.domainStrategies.find((item) => item.domain === 'career')
    expect(baseCareer?.metrics.timeActivation).toBe(1)
    expect(boostedCareer?.metrics.timeActivation).toBeGreaterThan(1)
    expect(boostedCareer?.metrics.effectiveStrength || 0).toBeGreaterThan(
      baseCareer?.metrics.effectiveStrength || 0
    )
    expect(boostedCareer?.metrics.effectiveCaution || 0).toBeGreaterThan(
      baseCareer?.metrics.effectiveCaution || 0
    )
  })
})
