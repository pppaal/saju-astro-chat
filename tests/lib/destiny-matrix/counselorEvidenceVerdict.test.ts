import { describe, expect, it } from 'vitest'

import {
  buildCounselorCrossSystemSummary,
  buildCounselorWhyStack,
  buildCounselorVerdictContext,
  buildCounselorVerdictTimingLine,
} from '@/lib/destiny-matrix/counselorEvidenceVerdict'

describe('counselorEvidenceVerdict', () => {
  it('explains cross-system alignment in practical Korean', () => {
    const text = buildCounselorCrossSystemSummary({
      lang: 'ko',
      domainLabel: '\uCEE4\uB9AC\uC5B4',
      crossAgreement: 0.81,
      topTimingWindow: {
        domain: 'career',
        window: '1-3m',
        whyNow: '',
        entryConditions: [],
        abortConditions: [],
      },
    })

    expect(text).toContain('\uC0AC\uC8FC')
    expect(text).toContain('\uC810\uC131')
    expect(text).toContain('1-3m')
  })

  it('folds thesis, alignment, and timing rationale into one verdict context', () => {
    const text = buildCounselorVerdictContext({
      lang: 'en',
      domainLabel: 'career',
      crossAgreement: 0.78,
      topDomainAdvisory: {
        domain: 'career',
        thesis: 'the next move works best through role clarity',
        action: '',
        caution: '',
        timingHint: '',
        strategyLine: '',
      },
      topTimingWindow: {
        domain: 'career',
        window: '1-3m',
        whyNow: 'the trigger stack is tightening around review and approval',
        entryConditions: [],
        abortConditions: [],
      },
      topManifestation: null,
    })

    expect(text).toContain('core read on career')
    expect(text).toContain('same directional push')
    expect(text).toContain('1-3m')
  })

  it('turns timing conditions into an actionable timing line', () => {
    const text = buildCounselorVerdictTimingLine({
      lang: 'en',
      topTimingWindow: {
        domain: 'relationship',
        window: 'now',
        timingReliabilityBand: 'low',
        whyNow: '',
        entryConditions: ['message cadence stays steady', 'plans stay explicit'],
        abortConditions: ['signals turn inconsistent'],
      },
      topManifestation: null,
    })

    expect(text).toContain('now')
    expect(text).toContain('message cadence stays steady')
    expect(text).toContain('window-level read')
  })

  it('orders why-stack by source, cross, timing, and trust', () => {
    const lines = buildCounselorWhyStack({
      lang: 'ko',
      domain: 'relationship',
      sajuReasons: ['기준과 역할선이 먼저 굳어집니다'],
      astroReasons: ['트리거는 메시지 왕복이 붙을 때 살아납니다'],
      crossSummary: '관계는 구조와 촉발이 같은 방향으로 겹칩니다.',
      timingSummary: '지금은 확인과 진입이 같은 창으로 모입니다.',
      decisionSummary: '행동축은 관계 쪽이 앞섭니다.',
      trustSummary: '핵심 필드는 충분하지만 확정 전 재확인이 유리합니다.',
      provenanceSummary: '대운 흐름과 교차 근거 묶음을 함께 봤습니다.',
    })

    expect(lines[0]).toContain('관계 흐름을 묶어서 보면')
    expect(lines[1]).toContain('사주 쪽에서는 관계 기준선이')
    expect(lines[2]).toContain('점성 쪽에서는 관계 트리거가')
    expect(lines.some((line) => line.includes('관계 타이밍은'))).toBe(true)
    expect(lines.some((line) => line.includes('관계 해석 신뢰도는'))).toBe(true)
  })
})
