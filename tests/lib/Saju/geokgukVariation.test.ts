import { describe, expect, it } from 'vitest'
import { detectGeokgukVariation } from '@/lib/Saju/geokgukVariation'
import type { CalculateSajuDataResult } from '@/lib/Saju/types'

function makeSaju(opts: {
  dayStem: string; dayBranch: string; dayElement: string
  yearStem: string; yearBranch: string
  monthStem: string; monthBranch: string
  timeStem: string; timeBranch: string
}): CalculateSajuDataResult {
  const stem = (name: string, element: string) => ({
    name, element, yin_yang: '음', sibsin: '비견', graphId: `GAN_${name}`, elementGraphId: `EL_${element}`,
  })
  const branch = (name: string, element: string) => ({
    name, element, yin_yang: '음', sibsin: '비견', graphId: `BR_${name}`, elementGraphId: `EL_${element}`,
  })
  const pillar = (s: any, b: any) => ({
    heavenlyStem: s,
    earthlyBranch: b,
    ganjiGraphId: `GAN_${s.name}${b.name}`,
    jijanggan: {},
  })
  return {
    yearPillar: pillar(stem(opts.yearStem, '목'), branch(opts.yearBranch, '수')),
    monthPillar: pillar(stem(opts.monthStem, '토'), branch(opts.monthBranch, '목')),
    dayPillar: pillar(stem(opts.dayStem, opts.dayElement), branch(opts.dayBranch, '토')),
    timePillar: pillar(stem(opts.timeStem, '금'), branch(opts.timeBranch, '목')),
    pillars: {} as any,
    daeWoon: {} as any,
    unse: {} as any,
    fiveElements: {} as any,
    dayMaster: { name: opts.dayStem, element: opts.dayElement as any, yin_yang: '음', graphId: '', elementGraphId: '' },
  } as unknown as CalculateSajuDataResult
}

describe('detectGeokgukVariation', () => {
  it('진종 종재격 — 비겁·인성 0 → integrity true', () => {
    // 일간 辛金, 비겁(금)·인성(토) 모두 X — 모두 재성(목) 또는 다른 원소.
    const saju = makeSaju({
      dayStem: '辛', dayBranch: '亥', dayElement: '금',
      yearStem: '乙', yearBranch: '亥',
      monthStem: '丁', monthBranch: '卯',
      timeStem: '甲', timeBranch: '午',
    })
    const r = detectGeokgukVariation('jongjae', saju)
    expect(r.integrity).toBe('true')
    expect(r.narrative).toMatch(/진종/)
  })

  it('가종 종재격 — 비겁 1개 잔류 → integrity false', () => {
    const saju = makeSaju({
      dayStem: '辛', dayBranch: '亥', dayElement: '금',
      yearStem: '乙', yearBranch: '亥',
      monthStem: '丁', monthBranch: '卯',
      timeStem: '辛', timeBranch: '卯',  // 시간 천간이 비겁(辛)
    })
    const r = detectGeokgukVariation('jongjae', saju)
    expect(r.integrity).toBe('false')
    expect(r.narrative).toMatch(/가종/)
  })

  it('정격 + 천간합 → 변격 표기', () => {
    const saju = makeSaju({
      dayStem: '甲', dayBranch: '寅', dayElement: '목',
      yearStem: '丁', yearBranch: '亥',
      monthStem: '己', monthBranch: '卯',  // 甲己 합 = 토
      timeStem: '丙', timeBranch: '午',
    })
    const r = detectGeokgukVariation('jeongjae', saju)
    expect(r.integrity).toBe('transformed')
    expect(r.reason).toMatch(/합/)
  })
})
