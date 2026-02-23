import { describe, expect, it } from 'vitest'
import {
  buildBCRenderSample,
  buildIcpRenderSample,
  buildIcpNarrative,
  ICP_SAMPLE_STYLE_CODES,
  sanitizeNarrativeList,
  sanitizeNarrativeText,
} from '@/lib/icp/narrative'

describe('icp narrative', () => {
  it('removes control chars and normalizes line breaks', () => {
    const raw = '안녕\u0000하세요\r\n\r\n\r\n테스트\u0007'
    expect(sanitizeNarrativeText(raw)).toBe('안녕하세요\n\n테스트')
  })

  it('deduplicates repeated bullet-like text', () => {
    const input = ['직접문항 반영', '직접문항  반영', '역문항 반영']
    expect(sanitizeNarrativeList(input)).toEqual(['직접문항 반영', '역문항 반영'])
  })

  it('falls back from mojibake korean summary and builds actionable sections', () => {
    const sample = buildBCRenderSample('ko')
    sample.summaryKo = 'ì£¼ë„ì  ì†Œí†µ'
    const narrative = buildIcpNarrative(sample)

    expect(narrative.hero.oneLiner).toContain('승부처에서 집중력이 올라가는 타입')
    expect(narrative.actions.todayOneThing.length).toBeGreaterThan(5)
    expect(narrative.actions.thisWeek).toHaveLength(3)
    expect(narrative.actions.twoWeekChecklist.length).toBeGreaterThanOrEqual(5)
  })

  it('maps axis score band labels by threshold', () => {
    const sample = buildBCRenderSample('ko')
    sample.dominanceScore = 20
    sample.affiliationScore = 50
    sample.boundaryScore = 85
    sample.resilienceScore = 69

    const narrative = buildIcpNarrative(sample)
    const agency = narrative.axes.find((axis) => axis.key === 'agency')
    const boundary = narrative.axes.find((axis) => axis.key === 'boundary')
    const resilience = narrative.axes.find((axis) => axis.key === 'resilience')

    expect(agency?.levelLabel).toBe('낮음')
    expect(boundary?.levelLabel).toBe('높음')
    expect(resilience?.levelLabel).toBe('중간')
  })

  it('builds valid narrative for all 8 style samples', () => {
    ICP_SAMPLE_STYLE_CODES.forEach((code) => {
      const sample = buildIcpRenderSample(code, 'ko')
      const narrative = buildIcpNarrative(sample)

      expect(narrative.archetypes.primary.code).toBe(code)
      expect(narrative.hero.title).toContain(`(${code})`)
      expect(narrative.snapshot.strengths.length).toBeGreaterThan(0)
      expect(narrative.archetypes.scenarioExamples.length).toBeGreaterThanOrEqual(2)
      expect(narrative.actions.thisWeek).toHaveLength(3)
      expect(narrative.actions.todayOneThing).toContain('오늘 10분')
      expect(narrative.axes).toHaveLength(4)
      expect(narrative.archetypes.ranked).toHaveLength(8)
      expect(narrative.confidence.score).toBeGreaterThanOrEqual(0)
      expect(narrative.confidence.score).toBeLessThanOrEqual(100)
      expect(narrative.hero.oneLiner).not.toMatch(/(?:\u00C3|\u00C2|\u00EC|\u00EB)/)
    })
  })
})
