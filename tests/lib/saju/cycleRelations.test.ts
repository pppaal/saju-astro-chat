/**
 * cycleRelations — 운(대운/세운/월운/일운) 갑자 조립 + 충·합·형 상호작용
 *
 * Pure, deterministic 사주 갑자 math shared across the calendar engines. The
 * file had 0% coverage; these golden tests pin the doctrine-correct output of
 * every exported function so the engine can't silently drift.
 */

import { getSibsinKo, wolwoonFromPillar } from '@/lib/saju/cycleRelations'

describe('getSibsinKo (십성)', () => {
  it('maps every stem against a 甲 day master to the canonical 십성', () => {
    // 甲(목 양) day master vs each heavenly stem
    expect(getSibsinKo('甲', '甲')).toBe('비견')
    expect(getSibsinKo('甲', '乙')).toBe('겁재')
    expect(getSibsinKo('甲', '丙')).toBe('식신')
    expect(getSibsinKo('甲', '丁')).toBe('상관')
    expect(getSibsinKo('甲', '戊')).toBe('편재')
    expect(getSibsinKo('甲', '己')).toBe('정재')
    expect(getSibsinKo('甲', '庚')).toBe('편관')
    expect(getSibsinKo('甲', '辛')).toBe('정관')
    expect(getSibsinKo('甲', '壬')).toBe('편인')
    expect(getSibsinKo('甲', '癸')).toBe('정인')
  })

  it('returns empty string for unknown stems', () => {
    expect(getSibsinKo('X', '甲')).toBe('')
    expect(getSibsinKo('甲', 'Z')).toBe('')
  })
})

describe('wolwoonFromPillar (월운)', () => {
  it('assembles ganji and 십성 from the month pillar', () => {
    const w = wolwoonFromPillar('丙', '寅', '甲')
    expect(w.ganji).toBe('丙寅')
    expect(w.sibsinStem).toBe('식신') // 甲 vs 丙
  })
})
