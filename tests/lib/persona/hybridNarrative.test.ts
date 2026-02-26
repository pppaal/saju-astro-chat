import { describe, expect, it } from 'vitest'
import {
  buildHybridNarrative,
  buildHybridSampleInput,
  sanitizeHybridList,
  sanitizeHybridText,
} from '@/lib/persona/hybridNarrative'

describe('hybrid narrative', () => {
  it('sanitizes control characters and duplicate lines', () => {
    expect(sanitizeHybridText('안녕\u0000하세요\r\n\r\n\r\n테스트\u0007')).toBe(
      '안녕하세요\n\n테스트'
    )
    expect(sanitizeHybridList(['중복 문장', '중복  문장', '다른 문장'])).toEqual([
      '중복 문장',
      '다른 문장',
    ])
  })

  it('builds premium structure for BC + RSLA sample', () => {
    const narrative = buildHybridNarrative(buildHybridSampleInput('ko'))

    expect(narrative.hero.combination).toContain('돌파 전략가(BC)')
    expect(narrative.hero.combination).toContain('(RSLA)')
    expect(narrative.hero.hybridCode).toContain('HX08')
    expect(narrative.hero.definitionLine).toContain('기준 수호형(HX08)')
    expect(narrative.snapshot.strengths).toHaveLength(3)
    expect(narrative.snapshot.risks).toHaveLength(2)
    expect(narrative.snapshot.bestFitEnvironments).toHaveLength(2)
    expect(narrative.snapshot.breakdownConditions).toHaveLength(2)
    expect(narrative.insights.length).toBeGreaterThanOrEqual(3)
    expect(narrative.insights.length).toBeLessThanOrEqual(5)
    expect(narrative.actionPlan.thisWeek).toHaveLength(3)
    expect(narrative.playbook.scripts).toHaveLength(2)
  })

  it('keeps every insight in 4-part template form', () => {
    const narrative = buildHybridNarrative(buildHybridSampleInput('ko'))

    narrative.insights.forEach((insight) => {
      expect(insight.name.length).toBeGreaterThan(3)
      expect(insight.evidence).toMatch(/ICP/)
      expect(insight.evidence).toMatch(/Persona/)
      expect(insight.strengthWhen.length).toBeGreaterThan(8)
      expect(insight.riskAndAdjustment.length).toBeGreaterThan(8)
      expect(insight.quickAction).toContain('10')
    })
  })

  it('falls back from mojibake persona name and keeps neutral CTA tone', () => {
    const sample = buildHybridSampleInput('ko')
    sample.persona.personaName = 'Ã¬Â² Ã«Â²½Ã¬Â Ã¬Â§€Ã­œ˜Ãª´€'

    const narrative = buildHybridNarrative(sample)
    expect(narrative.hero.combination).toContain('철벽의 지휘관')
    expect(narrative.nextAction.optionalCta).toContain('원하면 궁합 분석')
    expect(narrative.nextAction.optionalCta).not.toContain('반드시')
  })
})
