import { describe, expect, it } from 'vitest'
import { buildPeriodActivationContext } from '@/lib/destiny-matrix/ai-report/periodSignalContext'
import type { TimingData } from '@/lib/destiny-matrix/ai-report/types'

const TIMING: TimingData = {
  daeun: {
    heavenlyStem: '乙',
    earthlyBranch: '亥',
    element: '목',
    startAge: 22,
    endAge: 31,
    isCurrent: true,
  },
  seun: {
    year: 2026,
    heavenlyStem: '丙',
    earthlyBranch: '午',
    element: '화',
  },
  wolun: {
    month: 5,
    heavenlyStem: '甲',
    earthlyBranch: '午',
    element: '목',
  },
  iljin: {
    date: '2026-05-06',
    heavenlyStem: '甲',
    earthlyBranch: '午',
    element: '목',
  },
}

describe('buildPeriodActivationContext', () => {
  it('lifetime drops pillar refs entirely', () => {
    const ctx = buildPeriodActivationContext({
      period: 'lifetime',
      targetDate: '2026-05-06',
      timingData: TIMING,
    })
    expect(ctx.daeun).toBeUndefined()
    expect(ctx.seun).toBeUndefined()
    expect(ctx.wolun).toBeUndefined()
    expect(ctx.iljin).toBeUndefined()
    expect(ctx.targetDate).toBe('2026-05-06')
  })

  it('yearly includes daeun + seun, drops wolun/iljin', () => {
    const ctx = buildPeriodActivationContext(
      {
        period: 'yearly',
        targetDate: '2026-05-06',
        timingData: TIMING,
      },
      { birthYear: 1995 }
    )
    expect(ctx.daeun?.pillar).toBe('乙亥')
    expect(ctx.daeun?.startDate).toBe('2017-01-01') // 1995 + 22
    expect(ctx.daeun?.endDate).toBe('2026-12-31') // 1995 + 31
    expect(ctx.seun?.pillar).toBe('丙午')
    expect(ctx.seun?.startDate).toBe('2026-01-01')
    expect(ctx.seun?.endDate).toBe('2026-12-31')
    expect(ctx.wolun).toBeUndefined()
    expect(ctx.iljin).toBeUndefined()
  })

  it('monthly includes everything', () => {
    const ctx = buildPeriodActivationContext(
      {
        period: 'monthly',
        targetDate: '2026-05-06',
        timingData: TIMING,
      },
      { birthYear: 1995 }
    )
    expect(ctx.daeun?.pillar).toBe('乙亥')
    expect(ctx.seun?.pillar).toBe('丙午')
    expect(ctx.wolun?.pillar).toBe('甲午')
    expect(ctx.wolun?.startDate).toBe('2026-05-01')
    expect(ctx.wolun?.endDate).toBe('2026-05-31')
    expect(ctx.iljin?.pillar).toBe('甲午')
    expect(ctx.iljin?.startDate).toBe('2026-05-06')
    expect(ctx.iljin?.endDate).toBe('2026-05-06')
  })

  it('handles missing birthYear gracefully (no daeun window)', () => {
    const ctx = buildPeriodActivationContext({
      period: 'yearly',
      targetDate: '2026-05-06',
      timingData: TIMING,
    })
    expect(ctx.daeun?.pillar).toBe('乙亥')
    expect(ctx.daeun?.startDate).toBeUndefined()
    expect(ctx.daeun?.endDate).toBeUndefined()
  })

  it('passes through activeTransits when provided', () => {
    const ctx = buildPeriodActivationContext({
      period: 'monthly',
      targetDate: '2026-05-06',
      timingData: TIMING,
      activeTransits: [
        { cycle: 'saturnReturn', influence: 'positive', description: '', descriptionEn: '' },
      ],
    })
    expect(ctx.activeTransits).toHaveLength(1)
    expect(ctx.activeTransits?.[0].cycle).toBe('saturnReturn')
  })

  it('omits activeTransits when empty', () => {
    const ctx = buildPeriodActivationContext({
      period: 'monthly',
      targetDate: '2026-05-06',
      timingData: TIMING,
      activeTransits: [],
    })
    expect(ctx.activeTransits).toBeUndefined()
  })

  it('returns proper end-of-month for February (28 vs 29 days)', () => {
    const febTiming: TimingData = {
      ...TIMING,
      wolun: { month: 2, heavenlyStem: '戊', earthlyBranch: '寅', element: '토' },
      seun: { year: 2025, heavenlyStem: '乙', earthlyBranch: '巳', element: '목' }, // non-leap
    }
    const ctx = buildPeriodActivationContext({
      period: 'monthly',
      targetDate: '2025-02-15',
      timingData: febTiming,
    })
    expect(ctx.wolun?.endDate).toBe('2025-02-28')

    const leapTiming: TimingData = {
      ...febTiming,
      seun: { year: 2024, heavenlyStem: '甲', earthlyBranch: '辰', element: '목' }, // leap
    }
    const ctx2 = buildPeriodActivationContext({
      period: 'monthly',
      targetDate: '2024-02-15',
      timingData: leapTiming,
    })
    expect(ctx2.wolun?.endDate).toBe('2024-02-29')
  })
})
