import { describe, it, expect } from 'vitest'
import { scoreToBand, reconcileDayTone } from '@/lib/calendar-engine/derivers/reconcile'

describe('scoreToBand', () => {
  it('maps score to the same bands DayTier shows (60/35)', () => {
    expect(scoreToBand(80)).toBe('good')
    expect(scoreToBand(60)).toBe('good')
    expect(scoreToBand(59)).toBe('mid')
    expect(scoreToBand(35)).toBe('mid')
    expect(scoreToBand(34)).toBe('low')
    expect(scoreToBand(0)).toBe('low')
  })
})

describe('reconcileDayTone', () => {
  const base = { hasGoodReason: true, hasCautionReason: true }

  it('good day whose reasons lean positive stays positive (no over-firing)', () => {
    const v = reconcileDayTone({ score: 72, reasonNet: 8.4, ...base })
    expect(v.band).toBe('good')
    expect(v.tone).toBe('positive')
    expect(v.tense).toBe(false)
  })

  it('good day whose curated reasons net negative → tense, downgraded to mixed', () => {
    const v = reconcileDayTone({ score: 72, reasonNet: -3.2, ...base })
    expect(v.band).toBe('good')
    expect(v.tense).toBe(true)
    expect(v.tone).toBe('mixed')
  })

  it('good day with no good reason to show (only cautions) → tense', () => {
    const v = reconcileDayTone({
      score: 66,
      reasonNet: 5,
      hasGoodReason: false,
      hasCautionReason: true,
    })
    expect(v.tense).toBe(true)
    expect(v.tone).toBe('mixed')
  })

  it('low day whose curated reasons net negative stays caution', () => {
    const v = reconcileDayTone({ score: 24, reasonNet: -1.0, ...base })
    expect(v.band).toBe('low')
    expect(v.tone).toBe('caution')
    expect(v.bright).toBe(false)
  })

  it('low day whose curated reasons net positive → bright, upgraded to mixed', () => {
    const v = reconcileDayTone({ score: 30, reasonNet: 4.4, ...base })
    expect(v.band).toBe('low')
    expect(v.bright).toBe(true)
    expect(v.tone).toBe('mixed')
  })

  it('mid day stays mixed; tense flag tracks the reason net sign', () => {
    const flat = reconcileDayTone({ score: 50, reasonNet: 3, ...base })
    expect(flat.tone).toBe('mixed')
    expect(flat.tense).toBe(false)

    const tense = reconcileDayTone({ score: 50, reasonNet: -2, ...base })
    expect(tense.tone).toBe('mixed')
    expect(tense.tense).toBe(true)
  })

  it('reasonNet sign is what matters, not magnitude (chart-independent)', () => {
    expect(reconcileDayTone({ score: 90, reasonNet: 0.01, ...base }).tone).toBe('positive')
    expect(reconcileDayTone({ score: 90, reasonNet: -0.01, ...base }).tone).toBe('mixed')
  })

  it('exactly-zero net does not trip tense/bright on its own', () => {
    expect(reconcileDayTone({ score: 90, reasonNet: 0, ...base }).tense).toBe(false)
    expect(reconcileDayTone({ score: 20, reasonNet: 0, ...base }).bright).toBe(false)
  })
})
