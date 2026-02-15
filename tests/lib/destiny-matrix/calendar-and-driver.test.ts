import { describe, expect, it } from 'vitest'
import { extractDriversAndCautions } from '@/lib/destiny-matrix/drivers'
import { deriveCalendarSignals } from '@/lib/destiny-matrix/calendarSignals'

describe('calendar and driver extraction', () => {
  it('drivers_include_high_agreement_when_alignment_high', () => {
    const result = extractDriversAndCautions({
      alignmentScore: 0.9,
      timeOverlapWeight: 1.0,
      overlapStrength: 0.2,
      confidenceScore: 0.8,
    })

    expect(result.drivers).toContain('High cross-system agreement')
  })

  it('cautions_include_disagreement_when_alignment_low', () => {
    const result = extractDriversAndCautions({
      alignmentScore: 0.2,
      timeOverlapWeight: 1.0,
      overlapStrength: 0.2,
      confidenceScore: 0.8,
    })

    expect(result.cautions).toContain('System disagreement')
  })

  it('calendar_signal_high_when_score_and_time_overlap_high', () => {
    const signals = deriveCalendarSignals({
      finalScoreAdjusted: 8.0,
      timeOverlapWeight: 1.2,
      alignmentScore: 0.8,
      confidenceScore: 0.9,
    })

    expect(signals.some((s) => s.level === 'high' && s.trigger === 'Peak Convergence Window')).toBe(
      true
    )
  })

  it('calendar_signal_caution_when_confidence_low', () => {
    const signals = deriveCalendarSignals({
      finalScoreAdjusted: 7.8,
      timeOverlapWeight: 1.2,
      alignmentScore: 0.8,
      confidenceScore: 0.3,
    })

    expect(signals.some((s) => s.level === 'caution' && s.trigger === 'Low certainty window')).toBe(
      true
    )
  })
})
