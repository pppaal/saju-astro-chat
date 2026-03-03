import { describe, expect, it } from 'vitest'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { FiveElement } from '@/lib/Saju/types'
import { generateNarrativeSectionsFromSynthesis } from '@/lib/destiny-matrix/ai-report/narrativeGenerator'
import type { SignalSynthesisResult } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'

function mkInput(): MatrixCalculationInput {
  return {
    dayMasterElement: '\uBAA9' as FiveElement,
    pillarElements: ['\uBAA9', '\uD654', '\uD1A0', '\uAE08'] as FiveElement[],
    sibsinDistribution: {},
    twelveStages: {},
    relations: [],
    dominantWesternElement: 'air',
    planetHouses: {},
    planetSigns: {},
    aspects: [],
    currentDaeunElement: '\uD654' as FiveElement,
    currentSaeunElement: '\uC218' as FiveElement,
    lang: 'ko',
  }
}

function mkSynthesis(): SignalSynthesisResult {
  return {
    normalizedSignals: [
      {
        id: 'L6:imgwan:H10',
        layer: 6,
        rowKey: 'imgwan',
        colKey: 'H10',
        domainHints: ['career'],
        polarity: 'strength',
        score: 10,
        rankScore: 10,
        keyword: 'career-peak',
        sajuBasis: 'imgwan basis',
        astroBasis: 'H10 basis',
        advice: 'lock scope before expansion',
        tags: ['H10'],
      },
      {
        id: 'L6:sa:H10',
        layer: 6,
        rowKey: 'sa',
        colKey: 'H10',
        domainHints: ['career'],
        polarity: 'caution',
        score: 2,
        rankScore: 9,
        keyword: 'career-reset',
        sajuBasis: 'sa basis',
        astroBasis: 'H10 caution',
        advice: 'recheck contract terms',
        tags: ['H10'],
      },
      {
        id: 'L3:siksin:H7',
        layer: 3,
        rowKey: 'siksin',
        colKey: 'H7',
        domainHints: ['relationship'],
        polarity: 'strength',
        score: 8,
        rankScore: 8,
        keyword: 'relation-drive',
        sajuBasis: 'siksin basis',
        astroBasis: 'venus/mars basis',
        advice: 'confirm intent before commitment',
        tags: ['H7'],
      },
    ],
    selectedSignals: [],
    claims: [
      {
        claimId: 'career_growth_with_guardrails',
        domain: 'career',
        thesis: '상승 신호와 리스크 관리가 함께 필요합니다.',
        evidence: ['L6:imgwan:H10', 'L6:sa:H10'],
        riskControl: '결정은 분할하고 조건을 문서로 고정하세요.',
        actions: ['역할·기한·책임을 먼저 합의하세요.'],
      },
      {
        claimId: 'relationship_expansion',
        domain: 'relationship',
        thesis: '관계 확장 신호가 우세합니다.',
        evidence: ['L3:siksin:H7'],
        riskControl: '확인 질문으로 해석 오차를 줄이세요.',
        actions: ['중요 대화는 요약 문장으로 재확인하세요.'],
      },
    ],
    signalsById: {
      'L6:imgwan:H10': {
        id: 'L6:imgwan:H10',
        layer: 6,
        rowKey: 'imgwan',
        colKey: 'H10',
        domainHints: ['career'],
        polarity: 'strength',
        score: 10,
        rankScore: 10,
        keyword: 'career-peak',
        sajuBasis: 'imgwan basis',
        astroBasis: 'H10 basis',
        advice: 'lock scope before expansion',
        tags: ['H10'],
      },
      'L6:sa:H10': {
        id: 'L6:sa:H10',
        layer: 6,
        rowKey: 'sa',
        colKey: 'H10',
        domainHints: ['career'],
        polarity: 'caution',
        score: 2,
        rankScore: 9,
        keyword: 'career-reset',
        sajuBasis: 'sa basis',
        astroBasis: 'H10 caution',
        advice: 'recheck contract terms',
        tags: ['H10'],
      },
      'L3:siksin:H7': {
        id: 'L3:siksin:H7',
        layer: 3,
        rowKey: 'siksin',
        colKey: 'H7',
        domainHints: ['relationship'],
        polarity: 'strength',
        score: 8,
        rankScore: 8,
        keyword: 'relation-drive',
        sajuBasis: 'siksin basis',
        astroBasis: 'venus/mars basis',
        advice: 'confirm intent before commitment',
        tags: ['H7'],
      },
    },
  }
}

describe('generateNarrativeSectionsFromSynthesis', () => {
  it('renders complete sections with timing grounding', () => {
    const sections = generateNarrativeSectionsFromSynthesis({
      lang: 'ko',
      matrixInput: mkInput(),
      synthesis: mkSynthesis(),
    })

    expect(sections.introduction.length).toBeGreaterThan(30)
    expect(sections.careerPath).toContain('상승')
    expect(sections.timingAdvice).toMatch(/대운|세운/)
    expect(sections.actionPlan.length).toBeGreaterThan(30)
    expect(sections.conclusion.length).toBeGreaterThan(20)
  })
})
