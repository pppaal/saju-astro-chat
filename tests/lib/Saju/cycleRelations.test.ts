/**
 * cycleRelations — 운(대운/세운/월운/일운) 갑자 조립 + 충·합·형 상호작용
 *
 * Pure, deterministic 사주 갑자 math shared across the calendar engines. The
 * file had 0% coverage; these golden tests pin the doctrine-correct output of
 * every exported function so the engine can't silently drift.
 */

import {
  getSibsinKo,
  sewoonForYear,
  wolwoonFromPillar,
  buildCycleInteractions,
} from '@/lib/saju/cycleRelations'

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

describe('sewoonForYear (세운 60갑자)', () => {
  it('resolves the year pillar from the 60-cycle anchor (1984 = 甲子)', () => {
    expect(sewoonForYear(1984, '甲').ganji).toBe('甲子')
    expect(sewoonForYear(2024, '甲').ganji).toBe('甲辰')
    expect(sewoonForYear(1994, '甲').ganji).toBe('甲戌')
  })

  it('carries the 십성 of the year stem relative to the day master', () => {
    const s = sewoonForYear(1984, '甲') // year stem 甲 vs day master 甲
    expect(s.year).toBe(1984)
    expect(s.sibsinStem).toBe('비견')
  })
})

describe('wolwoonFromPillar (월운)', () => {
  it('assembles ganji and 십성 from the month pillar', () => {
    const w = wolwoonFromPillar('丙', '寅', '甲')
    expect(w.ganji).toBe('丙寅')
    expect(w.sibsinStem).toBe('식신') // 甲 vs 丙
  })
})

describe('buildCycleInteractions (충·합·형)', () => {
  it('detects stem/branch combine and clash across slots', () => {
    // 본명 甲子, 대운 己丑, 세운 庚午, 월운 乙未, 일운 丙申
    const out = buildCycleInteractions(
      '甲',
      '子',
      { ganji: '己丑' },
      { ganji: '庚午' },
      { ganji: '乙未' },
      { ganji: '丙申' }
    )
    expect(out).toBeDefined()
    const kinds = (out ?? []).map((i) => i.kind)
    expect(kinds).toContain('천간합') // 甲↔己
    expect(kinds).toContain('지지합') // 子↔丑
    expect(kinds).toContain('천간충') // 甲↔庚
    expect(kinds).toContain('지지충') // 子↔午
    // every interaction carries a human-readable blurb
    expect((out ?? []).every((i) => typeof i.blurb === 'string' && i.blurb.length > 0)).toBe(true)
  })

  it('reports a completed 三合 when three slots share a triad (申子辰 수국)', () => {
    const out = buildCycleInteractions(
      '甲',
      '子', // natal branch 子
      null,
      { ganji: '甲申' }, // 申
      { ganji: '甲辰' }, // 辰  → 申子辰 삼합 완성
      { ganji: '甲午' }
    )
    const samhap = (out ?? []).filter((i) => i.kind === '지지합' && i.blurb.includes('삼합'))
    expect(samhap.length).toBeGreaterThan(0)
  })

  it('detects 해/파 friction pairs', () => {
    // natal 子 ↔ wolwoon 酉 = 파 ; natal 子 ↔ sewoon 未 = 해
    const out = buildCycleInteractions(
      '甲',
      '子',
      null,
      { ganji: '甲未' },
      { ganji: '甲酉' },
      { ganji: '甲寅' }
    )
    const kinds = (out ?? []).map((i) => i.kind)
    expect(kinds).toContain('지지파') // 子↔酉
    expect(kinds).toContain('지지해') // 子↔未
  })

  it('returns undefined when no interaction exists (all identical, no daeun)', () => {
    const out = buildCycleInteractions(
      '甲',
      '子',
      null,
      { ganji: '甲子' },
      { ganji: '甲子' },
      { ganji: '甲子' }
    )
    expect(out).toBeUndefined()
  })
})
