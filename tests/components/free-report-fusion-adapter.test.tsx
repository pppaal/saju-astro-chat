import { describe, it, expect } from 'vitest'
import { toBuilderFusion, type FusionFragments } from '@/components/destiny-map/FreeReport'

// Guards the seam that previously rendered the whole report blank: the
// /api/destiny-map response ships a compact fusion projection
// ({ id, meaning, narrative, intensity }), but buildLifeReport's domain
// builders read m.rule.id / m.rule.narrative.confirm. The adapter must
// rehydrate that nesting.
const compact: FusionFragments = {
  generatedAt: '2026-05-21T00:00:00.000Z',
  byDomain: {
    career: {
      tone: 'mixed',
      confirms: [{ id: 'career.x', meaning: '직업 소명', narrative: '직업 방향이 또렷', intensity: 'strong' }],
      conflicts: [],
    },
  },
  themes: [{ id: 'theme.roots', meaning: '뿌리로의 회귀', narrative: '원가족 신호' }],
}

describe('toBuilderFusion — compact fusion → builder shape', () => {
  it('rehydrates confirms into the rule.{id,meaning,narrative.confirm} nesting', () => {
    const out = toBuilderFusion(compact) as unknown as {
      byDomain: Record<string, { tone: string; confirms: Array<{ rule: { id: string; meaning: string; narrative: { confirm: string } } }> }>
    }
    const c = out.byDomain.career.confirms[0]
    expect(out.byDomain.career.tone).toBe('mixed')
    expect(c.rule.id).toBe('career.x')
    expect(c.rule.meaning).toBe('직업 소명')
    expect(c.rule.narrative.confirm).toBe('직업 방향이 또렷')
  })

  it('returns undefined when there is no fusion data', () => {
    expect(toBuilderFusion(null)).toBeUndefined()
    expect(toBuilderFusion({} as FusionFragments)).toBeUndefined()
  })
})
