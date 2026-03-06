import { describe, expect, it } from 'vitest'
import { buildUnifiedEnvelope } from '@/lib/destiny-matrix/ai-report/unifiedReport'
import type { SectionEvidenceRefs } from '@/lib/destiny-matrix/ai-report/evidenceRefs'
import type { SignalSynthesisResult } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'

function createMockSynthesis(): SignalSynthesisResult {
  const selectedSignals = [
    {
      id: 'L6:imgwan:H10',
      layer: 6,
      rowKey: 'imgwan',
      colKey: 'H10',
      domainHints: ['career'] as any,
      polarity: 'strength' as const,
      score: 9,
      rankScore: 9,
      keyword: 'career peak',
      sajuBasis: 'imgwan saju',
      astroBasis: 'H10 astro',
      advice: 'focus priorities',
      tags: ['H10', 'career'],
    },
    {
      id: 'L5:chung:square',
      layer: 5,
      rowKey: 'chung',
      colKey: 'square',
      domainHints: ['relationship'] as any,
      polarity: 'caution' as const,
      score: 3,
      rankScore: 8,
      keyword: 'relationship caution',
      sajuBasis: 'chung saju',
      astroBasis: 'square astro',
      advice: 'verify communication',
      tags: ['relationship'],
    },
  ] as any

  return {
    normalizedSignals: selectedSignals,
    selectedSignals,
    claims: [
      {
        claimId: 'career_main',
        domain: 'career',
        thesis: '커리어 확장 신호가 강하지만 구조 정렬이 필요합니다.',
        evidence: ['L6:imgwan:H10'],
        riskControl: '기한/역할/책임을 먼저 고정하세요.',
        actions: ['핵심 과업 1개 완결'],
      },
      {
        claimId: 'relationship_guard',
        domain: 'relationship',
        thesis: '관계는 속도보다 해석 일치가 중요합니다.',
        evidence: ['L5:chung:square'],
        riskControl: '요약 확인 후 확정하세요.',
        actions: ['중요 대화 전 체크리스트 적용'],
      },
    ] as any,
    signalsById: {
      'L6:imgwan:H10': selectedSignals[0],
      'L5:chung:square': selectedSignals[1],
    },
  }
}

function createEvidenceRefs(): SectionEvidenceRefs {
  return {
    introduction: [
      {
        id: 'L6:imgwan:H10',
        domain: 'career',
        layer: 6,
        rowKey: 'imgwan',
        colKey: 'H10',
        keyword: 'career peak',
        sajuBasis: 'imgwan saju',
        astroBasis: 'H10 astro',
        score: 90,
      },
    ],
    careerPath: [
      {
        id: 'L6:imgwan:H10',
        domain: 'career',
        layer: 6,
        rowKey: 'imgwan',
        colKey: 'H10',
        keyword: 'career peak',
        sajuBasis: 'imgwan saju',
        astroBasis: 'H10 astro',
        score: 90,
      },
    ],
    relationshipDynamics: [
      {
        id: 'L5:chung:square',
        domain: 'relationship',
        layer: 5,
        rowKey: 'chung',
        colKey: 'square',
        keyword: 'relationship caution',
        sajuBasis: 'chung saju',
        astroBasis: 'square astro',
        score: 30,
      },
    ],
    timingAdvice: [
      {
        id: 'L6:imgwan:H10',
        domain: 'career',
        layer: 6,
        rowKey: 'imgwan',
        colKey: 'H10',
        keyword: 'career peak',
        sajuBasis: 'imgwan saju',
        astroBasis: 'H10 astro',
        score: 90,
      },
      {
        id: 'L5:chung:square',
        domain: 'relationship',
        layer: 5,
        rowKey: 'chung',
        colKey: 'square',
        keyword: 'relationship caution',
        sajuBasis: 'chung saju',
        astroBasis: 'square astro',
        score: 30,
      },
    ],
    actionPlan: [
      {
        id: 'L6:imgwan:H10',
        domain: 'career',
        layer: 6,
        rowKey: 'imgwan',
        colKey: 'H10',
        keyword: 'career peak',
        sajuBasis: 'imgwan saju',
        astroBasis: 'H10 astro',
        score: 90,
      },
    ],
  }
}

describe('buildUnifiedEnvelope', () => {
  it('builds LIFE envelope with timeline priority, blocks, and p1~p3 para refs', () => {
    const result = buildUnifiedEnvelope({
      mode: 'comprehensive',
      lang: 'ko',
      generatedAt: '2026-03-05T00:00:00.000Z',
      matrixInput: {
        dayMasterElement: '수',
        dominantWesternElement: 'Fire',
      } as any,
      matrixReport: {
        overallScore: { total: 82, grade: 'A' },
        topInsights: [],
        domainAnalysis: [
          { domain: 'career', score: 81 },
          { domain: 'relationship', score: 66 },
          { domain: 'wealth', score: 75 },
        ],
      } as any,
      signalSynthesis: createMockSynthesis(),
      graphRagEvidence: {
        anchors: [
          {
            id: 'E1',
            section: 'careerPath',
            sajuEvidence: 'saju',
            astrologyEvidence: 'astro',
            crossConclusion: 'cross',
            crossEvidenceSets: [{ overlapScore: 80, orbFitScore: 78 }],
          },
        ],
      } as any,
      birthDate: '1995-02-09',
      sectionPaths: [
        'introduction',
        'careerPath',
        'relationshipDynamics',
        'timingAdvice',
        'actionPlan',
      ],
      evidenceRefs: createEvidenceRefs(),
    })

    expect(result.timeWindow.scope).toBe('LIFE')
    expect(result.timelinePriority).toBe('life_first')
    expect(result.mappingRulebook.countryFit.length).toBe(3)
    expect(result.mappingRulebook.incomeBands.length).toBeGreaterThan(0)
    expect(result.timelineEvents.some((event) => event.id.startsWith('EVT_TURN_'))).toBe(true)
    expect(
      result.timelineEvents.some(
        (event) => event.timeHint?.ageRange === '0-19' || event.timeHint?.ageRange === '20-34'
      )
    ).toBe(true)
    expect(Object.keys(result.evidenceRefsByPara).some((key) => key.endsWith('.p1'))).toBe(true)
    expect(Object.keys(result.evidenceRefsByPara).some((key) => key.endsWith('.p2'))).toBe(true)
    expect(Object.keys(result.evidenceRefsByPara).some((key) => key.endsWith('.p3'))).toBe(true)
    expect(result.blocksBySection.relationshipDynamics?.[0]?.heading).toContain('배우자 아키타입')
    const allBlocks = Object.values(result.blocksBySection).flat()
    expect(allBlocks.length).toBeGreaterThan(0)
    expect(allBlocks.some((block) => (block.mustKeepTokens || []).length > 0)).toBe(true)
  })

  it('uses default timeline priority for daily timing scope', () => {
    const result = buildUnifiedEnvelope({
      mode: 'timing',
      period: 'daily',
      targetDate: '2026-02-25',
      lang: 'ko',
      generatedAt: '2026-03-05T00:00:00.000Z',
      matrixInput: { dayMasterElement: '수', dominantWesternElement: 'Fire' } as any,
      matrixReport: {
        overallScore: { total: 82, grade: 'A' },
        topInsights: [],
        domainAnalysis: [{ domain: 'career', score: 81 }],
      } as any,
      signalSynthesis: createMockSynthesis(),
      graphRagEvidence: { anchors: [] } as any,
      birthDate: '1995-02-09',
      sectionPaths: ['overview', 'energy', 'opportunities', 'cautions', 'actionPlan'],
      evidenceRefs: {
        overview: createEvidenceRefs().introduction || [],
        energy: createEvidenceRefs().introduction || [],
        opportunities: createEvidenceRefs().careerPath || [],
        cautions: createEvidenceRefs().relationshipDynamics || [],
        actionPlan: createEvidenceRefs().actionPlan || [],
      },
    })

    expect(result.timeWindow.scope).toBe('DAY')
    expect(result.timelinePriority).toBe('default')
  })
})
