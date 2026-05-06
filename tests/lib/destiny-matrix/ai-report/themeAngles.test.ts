import { describe, expect, it } from 'vitest'
import { CAREER_ANGLES, renderTheme } from '@/lib/destiny-matrix/ai-report/themeAngles'
import { buildPeriodActivationContext } from '@/lib/destiny-matrix/ai-report/periodSignalContext'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
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
  seun: { year: 2026, heavenlyStem: '丙', earthlyBranch: '午', element: '화' },
  wolun: { month: 5, heavenlyStem: '甲', earthlyBranch: '午', element: '목' },
  iljin: { date: '2026-05-06', heavenlyStem: '甲', earthlyBranch: '午', element: '목' },
}

function makeSignal(overrides: Partial<NormalizedSignal> = {}): NormalizedSignal {
  return {
    id: 'test-signal',
    layer: 5,
    rowKey: 'samhap',
    colKey: 'trine',
    family: 'identity_drive',
    domainHints: ['career'],
    polarity: 'strength',
    score: 10,
    rankScore: 10,
    keyword: '기준선',
    sajuBasis: '지지삼합 (亥·卯·未 삼합(목))',
    astroBasis: 'Saturn-True Node trine angle=120deg orb=2.63deg',
    advice: '',
    tags: [],
    ...overrides,
  }
}

describe('themeAngles/CAREER_ANGLES', () => {
  const signals: NormalizedSignal[] = [
    makeSignal({ id: 'a', layer: 1, keyword: '구조', polarity: 'strength', family: 'identity_drive' }),
    makeSignal({ id: 'b', layer: 5, keyword: '천을귀인', polarity: 'strength', family: 'support_bridge', sajuBasis: '신살 천을귀인' }),
    makeSignal({ id: 'c', layer: 5, keyword: '과속', polarity: 'caution', family: 'career_guardrail', sajuBasis: '천간충 (乙-辛 충)' }),
    makeSignal({ id: 'd', layer: 4, keyword: '회복', polarity: 'balance', family: 'health_recovery' }),
    makeSignal({ id: 'e', layer: 7, keyword: '결정', polarity: 'strength', family: 'career_growth', tags: ['state:peak'] }),
  ]

  it('exposes 8 angles', () => {
    expect(CAREER_ANGLES).toHaveLength(8)
    const keys = CAREER_ANGLES.map((a) => a.key)
    expect(keys).toEqual([
      'essence',
      'strength',
      'weakness',
      'timing',
      'people',
      'moneyVsMeaning',
      'recovery',
      'nextAction',
    ])
  })

  it('renderTheme returns one rendered angle per definition', () => {
    const ctx = buildPeriodActivationContext(
      { period: 'monthly', targetDate: '2026-05-06', timingData: TIMING },
      { birthYear: 1995 }
    )
    const out = renderTheme(CAREER_ANGLES, signals, ctx, 'monthly')
    expect(out).toHaveLength(8)
    for (const item of out) {
      expect(item.prose.length).toBeGreaterThan(20)
      expect(item.label).toBeTruthy()
    }
  })

  it('produces different prose per period (lifetime vs monthly)', () => {
    const lifetimeCtx = buildPeriodActivationContext({
      period: 'lifetime',
      targetDate: '2026-05-06',
      timingData: TIMING,
    })
    const monthlyCtx = buildPeriodActivationContext(
      { period: 'monthly', targetDate: '2026-05-06', timingData: TIMING },
      { birthYear: 1995 }
    )
    const lifetime = renderTheme(CAREER_ANGLES, signals, lifetimeCtx, 'lifetime')
    const monthly = renderTheme(CAREER_ANGLES, signals, monthlyCtx, 'monthly')

    let differentParagraphs = 0
    for (let i = 0; i < lifetime.length; i++) {
      if (lifetime[i].prose !== monthly[i].prose) differentParagraphs++
    }
    // All 8 paragraphs should differ between lifetime and monthly.
    expect(differentParagraphs).toBe(8)
  })

  it('weaves wolun pillar into monthly prose', () => {
    const ctx = buildPeriodActivationContext(
      { period: 'monthly', targetDate: '2026-05-06', timingData: TIMING },
      { birthYear: 1995 }
    )
    const out = renderTheme(CAREER_ANGLES, signals, ctx, 'monthly')
    const allProse = out.map((o) => o.prose).join(' ')
    expect(allProse).toContain('甲午') // wolun pillar
  })

  it('weaves seun pillar into yearly prose', () => {
    const ctx = buildPeriodActivationContext(
      { period: 'yearly', targetDate: '2026-05-06', timingData: TIMING },
      { birthYear: 1995 }
    )
    const out = renderTheme(CAREER_ANGLES, signals, ctx, 'yearly')
    const allProse = out.map((o) => o.prose).join(' ')
    expect(allProse).toContain('丙午') // seun pillar
  })

  it('attaches evidence (3 signals) under each angle', () => {
    const ctx = buildPeriodActivationContext({
      period: 'lifetime',
      targetDate: '2026-05-06',
      timingData: TIMING,
    })
    const out = renderTheme(CAREER_ANGLES, signals, ctx, 'lifetime')
    for (const item of out) {
      expect(item.evidence.length).toBeLessThanOrEqual(3)
      for (const ev of item.evidence) {
        expect(ev.id).toBeTruthy()
        expect(ev.keyword).toBeTruthy()
      }
    }
  })

  it('strength angle picks polarity:strength signals', () => {
    const ctx = buildPeriodActivationContext({ period: 'lifetime', targetDate: '2026-05-06' })
    const strength = CAREER_ANGLES.find((a) => a.key === 'strength')!
    const picked = strength.selectSignals(signals, ctx)
    for (const s of picked) {
      expect(s.polarity).toBe('strength')
    }
  })

  it('weakness angle picks polarity:caution signals', () => {
    const ctx = buildPeriodActivationContext({ period: 'lifetime', targetDate: '2026-05-06' })
    const weakness = CAREER_ANGLES.find((a) => a.key === 'weakness')!
    const picked = weakness.selectSignals(signals, ctx)
    for (const s of picked) {
      expect(s.polarity).toBe('caution')
    }
  })
})
