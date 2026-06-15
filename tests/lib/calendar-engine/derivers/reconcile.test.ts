import { describe, it, expect } from 'vitest'
import {
  scoreToBand,
  countStrong,
  reconcileDayTone,
  STRONG_POLARITY,
} from '@/lib/calendar-engine/derivers/reconcile'

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

describe('countStrong', () => {
  it('counts |polarity| >= STRONG_POLARITY by sign', () => {
    const { strongPos, strongNeg } = countStrong([3, 2, 1, 0, -1, -2, -3])
    expect(strongPos).toBe(2) // +3, +2
    expect(strongNeg).toBe(2) // -2, -3
  })
  it('treats the threshold as inclusive', () => {
    expect(countStrong([STRONG_POLARITY]).strongPos).toBe(1)
    expect(countStrong([-STRONG_POLARITY]).strongNeg).toBe(1)
    expect(countStrong([STRONG_POLARITY - 1]).strongPos).toBe(0)
  })
})

describe('reconcileDayTone', () => {
  const clean = { strongPos: 0, strongNeg: 0, hasGoodReason: true, hasCautionReason: false }

  it('good day with clean signals stays positive', () => {
    const v = reconcileDayTone({ score: 72, ...clean })
    expect(v.band).toBe('good')
    expect(v.tone).toBe('positive')
    expect(v.tense).toBe(false)
    expect(v.bright).toBe(false)
  })

  it('good day undercut by strong negatives → tense, tone downgraded to mixed', () => {
    const v = reconcileDayTone({
      score: 72,
      strongPos: 1,
      strongNeg: 2,
      hasGoodReason: true,
      hasCautionReason: true,
    })
    expect(v.band).toBe('good')
    expect(v.tense).toBe(true)
    expect(v.tone).toBe('mixed') // no longer a false "순풍/밀어붙여"
  })

  it('good day where the only shown reason is a caution → tense', () => {
    const v = reconcileDayTone({
      score: 66,
      strongPos: 0,
      strongNeg: 0,
      hasGoodReason: false,
      hasCautionReason: true,
    })
    expect(v.tense).toBe(true)
    expect(v.tone).toBe('mixed')
  })

  it('low day with clean signals stays caution', () => {
    const v = reconcileDayTone({
      score: 20,
      strongPos: 0,
      strongNeg: 1,
      hasGoodReason: false,
      hasCautionReason: true,
    })
    expect(v.band).toBe('low')
    expect(v.tone).toBe('caution')
    expect(v.bright).toBe(false)
  })

  it('low day lifted by strong positives → bright, tone upgraded to mixed', () => {
    const v = reconcileDayTone({
      score: 20,
      strongPos: 2,
      strongNeg: 1,
      hasGoodReason: true,
      hasCautionReason: true,
    })
    expect(v.band).toBe('low')
    expect(v.bright).toBe(true)
    expect(v.tone).toBe('mixed')
  })

  it('low day where the only shown reason is a good one → bright', () => {
    const v = reconcileDayTone({
      score: 30,
      strongPos: 0,
      strongNeg: 0,
      hasGoodReason: true,
      hasCautionReason: false,
    })
    expect(v.bright).toBe(true)
    expect(v.tone).toBe('mixed')
  })

  it('mid day with strong negatives is tense (generalized old midButTense)', () => {
    const v = reconcileDayTone({
      score: 50,
      strongPos: 0,
      strongNeg: 2,
      hasGoodReason: true,
      hasCautionReason: true,
    })
    expect(v.band).toBe('mid')
    expect(v.tense).toBe(true)
    expect(v.tone).toBe('mixed')
  })

  it('mid day with balanced signals stays plain mixed (no tense/bright)', () => {
    const v = reconcileDayTone({
      score: 50,
      strongPos: 1,
      strongNeg: 1,
      hasGoodReason: true,
      hasCautionReason: true,
    })
    expect(v.tone).toBe('mixed')
    expect(v.tense).toBe(false)
    expect(v.bright).toBe(false)
  })

  it('mid band never gets a bright upgrade (bright is low-band only)', () => {
    const v = reconcileDayTone({
      score: 50,
      strongPos: 3,
      strongNeg: 0,
      hasGoodReason: true,
      hasCautionReason: false,
    })
    expect(v.bright).toBe(false)
  })
})
