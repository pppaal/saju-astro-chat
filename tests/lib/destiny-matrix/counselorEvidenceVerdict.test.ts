import { describe, expect, it } from 'vitest'

import {
  buildCounselorCrossSystemSummary,
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
})
