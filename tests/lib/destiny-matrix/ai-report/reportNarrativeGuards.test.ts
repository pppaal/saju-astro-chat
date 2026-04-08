import { describe, expect, it } from 'vitest'

import {
  renderLifeMissionSection,
  renderPersonalityDeepSection,
} from '@/lib/destiny-matrix/ai-report/reportSectionRenderers'
import {
  renderComprehensiveFutureOutlookSection,
  renderComprehensiveTurningPointsSection,
} from '@/lib/destiny-matrix/ai-report/reportLifeSections'

const rendererDeps = {
  buildEvidenceFooter: () => '',
  normalizeNarrativeCoreText: (text: string) => text,
  getReportDomainLabel: (domain: string | undefined, lang: 'ko' | 'en') => {
    const koMap: Record<string, string> = {
      career: '커리어',
      relationship: '관계',
      wealth: '재정',
      health: '건강',
      move: '이동',
    }
    const enMap: Record<string, string> = {
      career: 'career',
      relationship: 'relationship',
      wealth: 'wealth',
      health: 'health',
      move: 'move',
    }
    return (
      (lang === 'ko' ? koMap : enMap)[domain || 'career'] || (lang === 'ko' ? '커리어' : 'career')
    )
  },
  getTimingWindowLabel: (window: string | null | undefined) => window || '',
  findReportCoreTimingWindow: () => ({
    window: '1-3m',
    timingConflictNarrative: '구조와 촉발 신호를 함께 봐야 합니다.',
  }),
  findReportCoreAdvisory: () => ({ caution: '속도를 서두르지 마세요.' }),
  findReportCoreManifestation: () => ({ baselineThesis: '기준을 먼저 세우는 편이 맞습니다.' }),
  findReportCoreVerdict: () => ({ rationale: '근거를 정리한 뒤 확정해야 합니다.' }),
  findReportCoreDomainVerdict: () => ({}),
  buildPersonalLifeTimelineNarrative: () => '장기 흐름은 기준을 반복할수록 안정됩니다.',
  buildElementMetaphor: () => ({
    archetype: '설계자',
    environment: '질서',
    edge: '',
    risk: '과속 확정',
  }),
  formatScenarioIdForNarrative: (id: string | null | undefined, lang: 'ko' | 'en') => {
    if (!id) return ''
    if (lang !== 'ko') return id
    if (id === 'distance_tuning') return '거리 조절'
    if (id === 'contract_negotiation') return '조건 협상'
    return id
  },
  formatNarrativeParagraphs: (text: string) => text,
  sanitizeUserFacingNarrative: (text: string) => text.replace(/\s+/g, ' ').trim(),
  containsHangul: (text: string | undefined | null) => /[가-힣]/.test(String(text || '')),
  capitalizeFirst: (text: string | undefined | null) => {
    const value = String(text || '')
    return value ? value[0].toUpperCase() + value.slice(1) : ''
  },
  describeDataTrustSummary: () => '',
  describeTimingCalibrationSummary: () => '',
  describeIntraMonthPeakWindow: () => '',
} as const

const lifeDeps = {
  calculateProfileAge: () => 31,
  formatNarrativeParagraphs: (text: string) => text,
  getReportDomainLabel: rendererDeps.getReportDomainLabel,
  localizeReportNarrativeText: (text: string, lang: 'ko' | 'en') => {
    if (lang !== 'ko') return text
    return text
      .replace(/distance tuning/gi, '거리 조절')
      .replace(/contract negotiation/gi, '조건 협상')
      .replace(/specialist track/gi, '전문 트랙')
  },
  sanitizeUserFacingNarrative: (text: string) => text.replace(/\s+/g, ' ').trim(),
} as const

const reportCore = {
  focusDomain: 'career',
  actionFocusDomain: 'career',
  riskAxisDomain: 'relationship',
  riskAxisLabel: '관계 속도',
  topScenarioIds: ['distance_tuning', 'contract_negotiation'],
  branchSet: [
    { label: '', summary: '' },
    { label: 'distance tuning', summary: 'distance tuning' },
    { label: 'contract negotiation', summary: 'contract negotiation' },
  ],
  matrixView: [
    {
      domain: 'career',
      cells: [
        { agreement: 0.85, contradiction: 0.12, summary: '검토 후 전개가 열립니다.' },
        { agreement: 0.82, contradiction: 0.15, summary: '조건 협상이 중요합니다.' },
      ],
    },
  ],
} as any

const matrixInput = {
  profileContext: { birthDate: '1995-02-09' },
  currentDateIso: '2026-04-08',
} as any

describe('report narrative guards', () => {
  it('uses a fallback object phrase when metaphor edge is empty', () => {
    const text = renderPersonalityDeepSection(reportCore, matrixInput, 'ko', rendererDeps as any)
    expect(text).toContain('기준을 빠르게 세우는 데 있고')
    expect(text).not.toContain('강점은 를')
  })

  it('filters empty and raw branch labels in turning points', () => {
    const text = renderComprehensiveTurningPointsSection(
      reportCore,
      matrixInput,
      'ko',
      lifeDeps as any
    )
    expect(text).toContain('거리 조절')
    expect(text).toContain('조건 협상')
    expect(text).not.toContain(', ,')
    expect(text).not.toContain('distance tuning')
  })

  it('filters raw scenario labels in future outlook and life mission', () => {
    const future = renderComprehensiveFutureOutlookSection(
      reportCore,
      matrixInput,
      'ko',
      lifeDeps as any
    )
    const lifeMission = renderLifeMissionSection(reportCore, matrixInput, 'ko', rendererDeps as any)

    expect(future).toContain('거리 조절')
    expect(future).not.toContain('distance tuning')
    expect(future).not.toContain('현실적인 경로는 ,')
    expect(lifeMission).toContain('거리 조절')
    expect(lifeMission).not.toContain('지금 인생 서사를 실제로 앞으로 미는 장면은 ,')
  })
})
