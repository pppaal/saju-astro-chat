import { describe, expect, it } from 'vitest'
import {
  buildDomainTimingAbortConditions,
  buildDomainTimingEntryConditions,
  buildDomainTimingPrecisionReason,
  buildDomainTimingWhyNow,
  resolveDomainTimingGranularity,
  resolveDomainTimingWindow,
} from '@/lib/destiny-matrix/core/canonicalDomainSupport'

describe('canonicalDomainSupport timing profiles', () => {
  it('uses relationship-specific fortnight cadence for near-term windows', () => {
    expect(
      resolveDomainTimingGranularity({
        domain: 'relationship',
        window: '1-3m',
      })
    ).toBe('fortnight')
  })

  it('pulls health timing closer when trigger pressure is high without a scenario', () => {
    expect(
      resolveDomainTimingWindow({
        domain: 'health',
        window: '6-12m',
        readinessScore: 0.39,
        triggerScore: 0.67,
        convergenceScore: 0.52,
        hasScenario: false,
      })
    ).toBe('3-6m')
  })

  it('keeps move timing from defaulting to now when no scenario anchors it', () => {
    expect(
      resolveDomainTimingWindow({
        domain: 'move',
        window: 'now',
        readinessScore: 0.74,
        triggerScore: 0.69,
        convergenceScore: 0.68,
        hasScenario: false,
      })
    ).toBe('1-3m')
  })

  it('builds domain-specific entry and abort conditions', () => {
    const wealthEntry = buildDomainTimingEntryConditions({ lang: 'ko', domain: 'wealth' })
    const wealthAbort = buildDomainTimingAbortConditions({ lang: 'ko', domain: 'wealth' })

    expect(wealthEntry.join(' ')).toContain('손실 상한')
    expect(wealthAbort.join(' ')).toContain('현금흐름')
  })

  it('builds domain-specific why-now and precision language', () => {
    const relationshipWhyNow = buildDomainTimingWhyNow({
      lang: 'ko',
      domain: 'relationship',
      overlapPoint: { month: '2026-05', overlapStrength: 0.74, timeOverlapWeight: 1.2, peakLevel: 'peak' },
      mode: 'verify',
    })
    const careerPrecision = buildDomainTimingPrecisionReason({
      lang: 'ko',
      domain: 'career',
      timingGranularity: 'fortnight',
    })

    expect(relationshipWhyNow).toContain('연락 리듬')
    expect(careerPrecision).toContain('승인')
  })
})
