import { describe, expect, it } from 'vitest'
import {
  analyzeICP,
  getICPCompatibility,
  getCrossSystemCompatibility,
  ICP_OCTANTS,
} from '@/lib/icp/analysis'
import type { ICPOctantCode } from '@/lib/icp/types'
import { ICP_ARCHETYPE_PROFILES } from '@/lib/icpTest/results'

const OCTANT_CODES: ICPOctantCode[] = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO']

describe('ICP analysis contract', () => {
  it('keeps octant names aligned with profile source-of-truth', () => {
    OCTANT_CODES.forEach((code) => {
      expect(ICP_OCTANTS[code].name).toBe(ICP_ARCHETYPE_PROFILES[code].nameEn)
      expect(ICP_OCTANTS[code].korean).toBe(ICP_ARCHETYPE_PROFILES[code].nameKo)
    })
  })

  it('returns 8 octants and normalized coordinates in range', () => {
    OCTANT_CODES.forEach((code) => {
      expect(ICP_OCTANTS[code]).toBeDefined()
      expect(ICP_OCTANTS[code].dominance).toBeGreaterThanOrEqual(-1)
      expect(ICP_OCTANTS[code].dominance).toBeLessThanOrEqual(1)
      expect(ICP_OCTANTS[code].affiliation).toBeGreaterThanOrEqual(-1)
      expect(ICP_OCTANTS[code].affiliation).toBeLessThanOrEqual(1)
    })
  })

  it('analyzeICP returns bounded metrics for empty answers', () => {
    const result = analyzeICP({})

    expect(result.dominanceScore).toBeGreaterThanOrEqual(0)
    expect(result.dominanceScore).toBeLessThanOrEqual(100)
    expect(result.affiliationScore).toBeGreaterThanOrEqual(0)
    expect(result.affiliationScore).toBeLessThanOrEqual(100)
    expect(result.dominanceNormalized).toBeGreaterThanOrEqual(-1)
    expect(result.dominanceNormalized).toBeLessThanOrEqual(1)
    expect(result.affiliationNormalized).toBeGreaterThanOrEqual(-1)
    expect(result.affiliationNormalized).toBeLessThanOrEqual(1)
    expect(result.primaryOctant.code).toBe(result.primaryStyle)
    expect(result.summaryKo.length).toBeGreaterThan(0)
  })

  it('analyzeICP returns locale-specific summary text', () => {
    const en = analyzeICP({}, 'en')
    const ko = analyzeICP({}, 'ko')

    expect(en.summary).toBe(en.primaryOctant.description)
    expect(ko.summary).toBe(ko.summaryKo)
  })

  it('getICPCompatibility is deterministic and symmetric', () => {
    const a = getICPCompatibility('PA', 'HI', 'en')
    const b = getICPCompatibility('HI', 'PA', 'en')

    expect(a.score).toBe(b.score)
    expect(a.level).toBe(b.level)
    expect(a.description).toBe(b.description)
  })

  it('getICPCompatibility matches current score model for representative pairs', () => {
    expect(getICPCompatibility('PA', 'PA').score).toBe(85)
    expect(getICPCompatibility('PA', 'PA').level).toBe('Excellent Match')

    expect(getICPCompatibility('PA', 'HI').score).toBe(68)
    expect(getICPCompatibility('PA', 'HI').level).toBe('Good Match')

    expect(getICPCompatibility('BC', 'DE').score).toBe(50)
    expect(getICPCompatibility('BC', 'DE').level).toBe('Moderate Match')

    expect(getICPCompatibility('NO', 'JK').score).toBe(83)
    expect(getICPCompatibility('NO', 'JK').level).toBe('Excellent Match')
  })

  it('cross-system compatibility returns explainable insights', () => {
    const result = getCrossSystemCompatibility(
      'PA',
      'HI',
      'RVLA',
      'GSLA',
      {
        energy: { score: 80, pole: 'radiant' },
        cognition: { score: 75, pole: 'visionary' },
        decision: { score: 70, pole: 'logic' },
        rhythm: { score: 60, pole: 'anchor' },
      },
      {
        energy: { score: 30, pole: 'grounded' },
        cognition: { score: 25, pole: 'structured' },
        decision: { score: 30, pole: 'logic' },
        rhythm: { score: 70, pole: 'anchor' },
      },
      'en'
    )

    expect(result.score).toBeGreaterThanOrEqual(30)
    expect(result.score).toBeLessThanOrEqual(95)
    expect(result.description.length).toBeGreaterThan(0)
    expect(result.insights).toContain(
      'Combining ICP and persona axes clarifies conflict-prevention points.'
    )
  })
})
