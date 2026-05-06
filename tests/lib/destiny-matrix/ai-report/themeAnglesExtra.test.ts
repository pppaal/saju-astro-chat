import { describe, expect, it } from 'vitest'
import {
  THEME_ANGLES_MAP,
  LOVE_ANGLES,
  WEALTH_ANGLES,
  HEALTH_ANGLES,
  FAMILY_ANGLES,
  MOVE_ANGLES,
} from '@/lib/destiny-matrix/ai-report/themeAnglesExtra'
import { renderTheme } from '@/lib/destiny-matrix/ai-report/themeAngles'
import { buildPeriodActivationContext } from '@/lib/destiny-matrix/ai-report/periodSignalContext'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import type { TimingData } from '@/lib/destiny-matrix/ai-report/types'

const TIMING: TimingData = {
  daeun: { heavenlyStem: '乙', earthlyBranch: '亥', element: '목', startAge: 22, endAge: 31, isCurrent: true },
  seun: { year: 2026, heavenlyStem: '丙', earthlyBranch: '午', element: '화' },
  wolun: { month: 5, heavenlyStem: '甲', earthlyBranch: '午', element: '목' },
  iljin: { date: '2026-05-06', heavenlyStem: '甲', earthlyBranch: '午', element: '목' },
}

function makeSignal(overrides: Partial<NormalizedSignal> = {}): NormalizedSignal {
  return {
    id: 'test',
    layer: 5,
    rowKey: 'samhap',
    colKey: 'trine',
    family: 'identity_drive',
    domainHints: ['career'],
    polarity: 'strength',
    score: 10,
    rankScore: 10,
    keyword: '기준선',
    sajuBasis: '신살 천을귀인',
    astroBasis: 'Saturn-True Node trine angle=120deg orb=2.63deg',
    advice: '',
    tags: [],
    ...overrides,
  }
}

const POOL: NormalizedSignal[] = [
  makeSignal({ id: '1', domainHints: ['relationship'], family: 'relationship_growth' }),
  makeSignal({ id: '2', domainHints: ['wealth'], family: 'career_growth' }),
  makeSignal({ id: '3', domainHints: ['health'], family: 'health_recovery' }),
  makeSignal({ id: '4', domainHints: ['family'], family: 'identity_drive' }),
  makeSignal({ id: '5', domainHints: ['move'], family: 'movement_window' }),
  makeSignal({ id: '6', polarity: 'caution', domainHints: ['relationship'], family: 'relationship_guardrail' }),
  makeSignal({ id: '7', polarity: 'balance', domainHints: ['health'], family: 'health_recovery' }),
]

describe('themeAnglesExtra', () => {
  it('exports 5 themes, each with 8 angles', () => {
    expect(LOVE_ANGLES).toHaveLength(8)
    expect(WEALTH_ANGLES).toHaveLength(8)
    expect(HEALTH_ANGLES).toHaveLength(8)
    expect(FAMILY_ANGLES).toHaveLength(8)
    expect(MOVE_ANGLES).toHaveLength(8)
    expect(Object.keys(THEME_ANGLES_MAP)).toEqual(['love', 'wealth', 'health', 'family', 'move'])
  })

  it('every angle defines render for all 3 periods', () => {
    for (const angles of Object.values(THEME_ANGLES_MAP)) {
      for (const angle of angles) {
        expect(angle.key).toBeTruthy()
        expect(angle.label).toBeTruthy()
        expect(typeof angle.render.lifetime).toBe('function')
        expect(typeof angle.render.yearly).toBe('function')
        expect(typeof angle.render.monthly).toBe('function')
      }
    }
  })

  it('renderTheme produces non-empty prose for each (theme, period)', () => {
    const ctx = buildPeriodActivationContext(
      { period: 'monthly', targetDate: '2026-05-06', timingData: TIMING },
      { birthYear: 1995 }
    )
    for (const [name, angles] of Object.entries(THEME_ANGLES_MAP)) {
      const out = renderTheme(angles, POOL, ctx, 'monthly')
      expect(out, `theme=${name} monthly`).toHaveLength(8)
      for (const item of out) {
        expect(item.prose.length, `theme=${name} angle=${item.angle}`).toBeGreaterThan(15)
      }
    }
  })

  it('weaves seun pillar into yearly prose for each theme', () => {
    const ctx = buildPeriodActivationContext(
      { period: 'yearly', targetDate: '2026-05-06', timingData: TIMING },
      { birthYear: 1995 }
    )
    for (const [name, angles] of Object.entries(THEME_ANGLES_MAP)) {
      const out = renderTheme(angles, POOL, ctx, 'yearly')
      const allProse = out.map((o) => o.prose).join(' ')
      expect(allProse, `theme=${name}`).toContain('丙午')
    }
  })

  it('weaves wolun pillar into monthly prose for each theme', () => {
    const ctx = buildPeriodActivationContext(
      { period: 'monthly', targetDate: '2026-05-06', timingData: TIMING },
      { birthYear: 1995 }
    )
    for (const [name, angles] of Object.entries(THEME_ANGLES_MAP)) {
      const out = renderTheme(angles, POOL, ctx, 'monthly')
      const allProse = out.map((o) => o.prose).join(' ')
      expect(allProse, `theme=${name}`).toContain('甲午')
    }
  })

  it('lifetime / yearly / monthly produce different prose for each theme', () => {
    const lifetimeCtx = buildPeriodActivationContext({
      period: 'lifetime',
      targetDate: '2026-05-06',
      timingData: TIMING,
    })
    const monthlyCtx = buildPeriodActivationContext(
      { period: 'monthly', targetDate: '2026-05-06', timingData: TIMING },
      { birthYear: 1995 }
    )
    for (const [name, angles] of Object.entries(THEME_ANGLES_MAP)) {
      const life = renderTheme(angles, POOL, lifetimeCtx, 'lifetime')
      const month = renderTheme(angles, POOL, monthlyCtx, 'monthly')
      let diffCount = 0
      for (let i = 0; i < life.length; i++) {
        if (life[i].prose !== month[i].prose) diffCount++
      }
      expect(diffCount, `theme=${name}`).toBe(8)
    }
  })
})
