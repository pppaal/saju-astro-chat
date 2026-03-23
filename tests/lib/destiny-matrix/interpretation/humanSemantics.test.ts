import { describe, expect, it } from 'vitest'

import {
  describeCrossAgreement,
  describeCrossEvidenceBridge,
  describeEvidenceConfidence,
  describeExecutionStance,
  describeGraphEvidenceWhy,
  describeDataTrustSummary,
  describeIntraMonthPeakWindow,
  describeProvenanceSummary,
  describePhaseFlow,
  describeSajuAstroConflictByDomain,
  describeSajuAstroRole,
  describeTimingCalibrationSummary,
  describeTimingWindowBrief,
  describeTimingWindowNarrative,
  describeTimingWindowTakeaways,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'

describe('humanSemantics', () => {
  it('describes expansion flow in practical Korean', () => {
    expect(describePhaseFlow('expansion', 'ko')).toContain('중요한 결정')
  })

  it('describes defensive stance without engine jargon', () => {
    const text = describeExecutionStance(30, 70, 'ko')
    expect(text).toContain('누락')
    expect(text).not.toContain('공격')
    expect(text).not.toContain('방어')
  })

  it('describes medium confidence as usable but checkable', () => {
    expect(describeEvidenceConfidence(55, 'ko')).toContain('확인')
  })

  it('describes cross agreement in realistic language', () => {
    expect(describeCrossAgreement(80, 'ko')).toContain('큰 흐름')
    expect(describeCrossAgreement(30, 'ko')).toContain('속도를 늦추는')
  })

  it('describes saju and astrology roles distinctly', () => {
    const text = describeSajuAstroRole({
      hasSaju: true,
      hasAstro: true,
      crossVerified: true,
      crossAgreementPercent: 80,
      lang: 'ko',
    })
    expect(text).toContain('큰 흐름')
    expect(text).toContain('타이밍')
  })

  it('describes negative cross bridge in concrete terms', () => {
    const text = describeCrossEvidenceBridge({ tone: 'negative', aligned: false, lang: 'ko' })
    expect(text).toContain('계약')
    expect(text).toContain('확인')
  })

  it('cleans timing details into practical Korean', () => {
    const text = describeTimingWindowNarrative({
      domainLabel: '일',
      window: '1-3m',
      whyNow: '지금 구간에 여러 조건이 겹치며 Career Pattern이 활성화됩니다.',
      entryConditions: ['핵심 조건이나 역할 범위가 문서로 정리되지 않으면'],
      abortConditions: ['시나리오 확률이 71.1% 흐려지면 속도를 줄일 것'],
      lang: 'ko',
    })

    expect(text).toContain('여러 조건이 한 방향으로 모여')
    expect(text).toContain('역할과 기준')
    expect(text).not.toContain('Pattern')
    expect(text).not.toContain('71.1%')
  })

  it('builds a shorter timing brief for presentation surfaces', () => {
    const text = describeTimingWindowBrief({
      domainLabel: '관계',
      window: 'now',
      whyNow: '지금 구간에 여러 조건이 겹치며 핵심 흐름이 활성화됩니다.',
      entryConditions: ['핵심 조건이 유지될 때'],
      abortConditions: ['시나리오 확률이 55% 흐려지면 속도를 줄일 것'],
      lang: 'ko',
    })

    expect(text).toContain('관계는')
    expect(text).toContain('실제로 움직이려면')
    expect(text).not.toContain('55%')
  })

  it('breaks timing into why now, go conditions, and slow-down signals', () => {
    const lines = describeTimingWindowTakeaways({
      domainLabel: '재정',
      window: '1-3m',
      whyNow: '지금 구간에 여러 조건이 겹치며 핵심 흐름이 활성화됩니다.',
      entryConditions: ['금액과 기한이 먼저 정리될 때', '손실 상한이 분명할 때'],
      abortConditions: ['현금흐름이 흔들리면', '조건이 다시 열리면'],
      lang: 'ko',
    })

    expect(lines).toHaveLength(4)
    expect(lines[0]).toContain('재정은')
    expect(lines[1]).toContain('실제로 움직이려면')
    expect(lines[2]).toContain('범위를 줄이고 확정을 늦추는 편이 안전합니다')
    expect(lines[3]).toContain('금액')
  })
  it('describes timing calibration as strongest intra-month windows, not flat month averages', () => {
    const ko = describeTimingCalibrationSummary({
      reliabilityBand: 'medium',
      pastStability: 0.71,
      futureStability: 0.66,
      backtestConsistency: 0.69,
      lang: 'ko',
    })
    const en = describeTimingCalibrationSummary({
      reliabilityBand: 'high',
      reliabilityScore: 0.82,
      lang: 'en',
    })

    expect(ko).toContain('월중 강한 창')
    expect(en).toContain('stronger intra-month window')
  })

  it('describes a domain-specific intra-month peak window', () => {
    const ko = describeIntraMonthPeakWindow({
      domainLabel: '건강',
      points: [{ probeDay: 22, peakLevel: 'peak' }],
      lang: 'ko',
    })
    const en = describeIntraMonthPeakWindow({
      domainLabel: 'career',
      points: [{ probeDay: 8, peakLevel: 'high' }],
      lang: 'en',
    })

    expect(ko).toContain('월중')
    expect(ko).toContain('특히 강하게')
    expect(en).toContain('early-month window')
  })

  it('describes graph evidence in domain-specific finance language', () => {
    const text = describeGraphEvidenceWhy({
      focusDomainLabel: '재정',
      overlapDomains: ['wealth', 'timing'],
      overlapScore: 0.82,
      orbFitScore: 0.71,
      lang: 'ko',
    })

    expect(text.focusReason).toContain('재정')
    expect(text.graphReason).toContain('손실 상한')
  })

  it('describes data trust in practical Korean', () => {
    const text = describeDataTrustSummary({
      score: 62,
      missingFields: ['birthTime'],
      derivedFields: [],
      conflictingFields: [],
      confidenceReason: 'missing birthTime',
      lang: 'ko',
    })

    expect(text).toContain('출생시간')
    expect(text).toContain('큰 흐름')
  })

  it('describes provenance in user-facing language', () => {
    const text = describeProvenanceSummary({
      sourceFields: ['currentDaeunElement', 'activeTransits'],
      sourceSetIds: ['X1', 'T2'],
      sourceRuleIds: [],
      lang: 'ko',
    })

    expect(text).toContain('대운 흐름')
    expect(text).toContain('교차 근거 묶음')
  })
  it('describes graph evidence in practical relationship language', () => {
    const text = describeGraphEvidenceWhy({
      focusDomainLabel: '관계',
      overlapDomains: ['relationship', 'timing'],
      overlapScore: 0.77,
      orbFitScore: 0.66,
      lang: 'ko',
    })

    expect(text.focusReason).toContain('누가 먼저 묻고')
    expect(text.graphReason).toContain('확인 포인트')
  })

  it('describes cross conflict in practical career language', () => {
    const text = describeSajuAstroConflictByDomain({
      crossAgreement: 0.51,
      focusDomainLabel: '커리어',
      lang: 'ko',
    })

    expect(text).toContain('책임')
    expect(text).toContain('결정권')
  })
})
