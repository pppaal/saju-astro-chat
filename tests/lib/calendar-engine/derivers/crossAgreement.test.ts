/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

import { deriveCrossAgreement } from '@/lib/calendar-engine/derivers/crossAgreement'
import type { ActiveSignal } from '@/lib/calendar-engine/types'

function sig(
  source: 'saju' | 'astro',
  polarity: number,
  weight = 0.8,
  layer: ActiveSignal['layer'] = 'daily'
): ActiveSignal {
  return {
    id: `${source}.${polarity}.${Math.random()}`,
    source,
    kind: 'pillar-sibsin' as ActiveSignal['kind'],
    name: 'x',
    polarity: polarity as ActiveSignal['polarity'],
    layer,
    active: { start: '', peak: '', end: '' },
    weight,
    evidence: { module: 't', detail: {} },
  }
}

describe('deriveCrossAgreement (v2-native)', () => {
  it('aligned when both axes push the same direction', () => {
    const r = deriveCrossAgreement({
      signals: [sig('saju', 3), sig('saju', 2), sig('astro', 3), sig('astro', 2)],
      derivedScore: 80,
    })
    expect(r.axisAgreement).toBe('aligned')
    expect(r.crossAgreementPercent).toBeGreaterThanOrEqual(60)
    expect(r.crossVerified).toBe(true)
    expect(r.sajuAxis).toBeGreaterThan(50)
    expect(r.astroAxis).toBeGreaterThan(50)
    expect(r.finalScore).toBe(80)
  })

  it('opposed when axes conflict', () => {
    const r = deriveCrossAgreement({
      signals: [sig('saju', 3), sig('saju', 3), sig('astro', -3), sig('astro', -3)],
      derivedScore: 50,
    })
    expect(r.axisAgreement).toBe('opposed')
    expect(r.crossAgreementPercent).toBeLessThan(50)
    expect(r.crossVerified).toBe(false)
  })

  it('neutral 50% agreement when one axis is absent', () => {
    const r = deriveCrossAgreement({ signals: [sig('saju', 3), sig('saju', 2)], derivedScore: 70 })
    expect(r.crossAgreementPercent).toBe(50)
    expect(r.crossVerified).toBe(false)
    expect(r.astroAxis).toBe(50) // 점성 신호 없음 → 중립
  })

  it('confidence stays within 0..100 and grows with heavy signals', () => {
    const light = deriveCrossAgreement({
      signals: [sig('saju', 1), sig('astro', 1)],
      derivedScore: 55,
    })
    const heavy = deriveCrossAgreement({
      signals: [sig('saju', 3), sig('saju', 3), sig('astro', 3), sig('astro', 3)],
      derivedScore: 85,
    })
    expect(light.confidence).toBeGreaterThanOrEqual(0)
    expect(heavy.confidence).toBeLessThanOrEqual(100)
    expect(heavy.confidence).toBeGreaterThan(light.confidence)
  })

  it('raw axes equal display axes (no override shift in v2)', () => {
    const r = deriveCrossAgreement({
      signals: [sig('saju', 2), sig('astro', -1)],
      derivedScore: 60,
    })
    expect(r.sajuAxisRaw).toBe(r.sajuAxis)
    expect(r.astroAxisRaw).toBe(r.astroAxis)
  })

  it('produces well-formed output across a real built month', async () => {
    const { getOrBuildNatalContext } = await import('@/lib/calendar-engine/context/cache')
    const { calculateSajuData } = await import('@/lib/saju/saju')
    const { calculateNatalChart } = await import('@/lib/astrology/foundation/astrologyService')
    const { buildCalendar } = await import('@/lib/calendar-engine')

    const saju = calculateSajuData('1990-05-15', '10:30', 'male', 'solar', 'Asia/Seoul')
    const astroChart = await calculateNatalChart({
      year: 1990,
      month: 5,
      date: 15,
      hour: 10,
      minute: 30,
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })
    const { context } = await getOrBuildNatalContext(
      {
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'male',
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: 'Asia/Seoul',
      },
      { saju, astroChart: astroChart as never }
    )
    const cells = await buildCalendar(
      context,
      {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-31T23:59:59.000Z',
        granularity: 'day',
      },
      { includeEvidence: true }
    )

    expect(cells.length).toBe(31)
    let verifiedCount = 0
    for (const c of cells) {
      const r = deriveCrossAgreement(c)
      expect(r.crossAgreementPercent).toBeGreaterThanOrEqual(0)
      expect(r.crossAgreementPercent).toBeLessThanOrEqual(100)
      expect(r.confidence).toBeGreaterThanOrEqual(0)
      expect(r.confidence).toBeLessThanOrEqual(100)
      expect(['aligned', 'mixed', 'opposed']).toContain(r.axisAgreement)
      expect(r.finalScore).toBe(c.derivedScore)
      if (r.crossVerified) verifiedCount++
    }
    // 실데이터엔 양 시스템이 모두 활성인 날이 흔해 일부는 crossVerified 여야 함.
    expect(verifiedCount).toBeGreaterThan(0)
  }, 120000)
})
