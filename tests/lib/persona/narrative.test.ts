import { describe, expect, it } from 'vitest'
import { buildPersonaNarrative, buildPersonaRenderSample } from '@/lib/persona/narrative'

describe('buildPersonaNarrative', () => {
  it('builds premium narrative fields for RSLA sample', () => {
    const sample = buildPersonaRenderSample('RSLA', 'ko')
    const narrative = buildPersonaNarrative(sample, 'ko')

    expect(narrative.hero.code).toBe('RSLA')
    expect(narrative.confidence.score).toBe(25)
    expect(narrative.snapshot.strengths).toHaveLength(3)
    expect(narrative.snapshot.cautions).toHaveLength(2)
    expect(narrative.axes).toHaveLength(4)
    expect(narrative.relationshipPlaybook.scripts).toHaveLength(2)
  })

  it('uses hypothesis-style guidance when confidence is low', () => {
    const sample = buildPersonaRenderSample('RSLA', 'ko')
    const narrative = buildPersonaNarrative(sample, 'ko')

    expect(narrative.confidence.level).toBe('low')
    expect(narrative.confidence.interpretation).toContain('가설')
    expect(narrative.confidence.experimentRule).toContain('2주')
  })

  it('keeps Korean-first axis labels with English in parentheses', () => {
    const sample = buildPersonaRenderSample('RSLA', 'ko')
    const narrative = buildPersonaNarrative(sample, 'ko')
    const energyAxis = narrative.axes.find((axis) => axis.key === 'energy')

    expect(energyAxis?.leftLabel).toBe('내향 (Grounded)')
    expect(energyAxis?.rightLabel).toBe('외향 (Radiant)')
    expect(narrative.actionPlan.today.metric).toContain('회의 지연률')
  })
})
