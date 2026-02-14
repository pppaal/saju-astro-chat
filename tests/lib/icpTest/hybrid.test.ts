import { describe, expect, it } from 'vitest'
import { resolveHybridArchetype } from '@/lib/icpTest/hybrid'
import type { IcpResult } from '@/lib/icpTest/types'
import type { PersonaAnalysis } from '@/lib/persona/types'

function makeIcpResult(partial?: Partial<IcpResult>): IcpResult {
  return {
    testVersion: 'icp_v2',
    resultId: 'icp_v2_PA',
    primaryStyle: 'PA',
    secondaryStyle: null,
    axes: { agency: 78, warmth: 72, boundary: 64, resilience: 71 },
    dominanceScore: 78,
    affiliationScore: 72,
    octantScores: { PA: 0.9, BC: 0.2, DE: 0.1, FG: 0.1, HI: 0.2, JK: 0.3, LM: 0.4, NO: 0.7 },
    confidence: 82,
    confidenceLevel: 'high',
    missingAnswerCount: 0,
    summaryKo: '요약',
    summaryEn: 'summary',
    explainability: {
      topAxes: [],
      lowAxes: [],
      evidence: [],
      note: 'non-clinical',
    },
    ...partial,
  }
}

const personaGVHA = {
  typeCode: 'GVHA',
} as PersonaAnalysis

describe('resolveHybridArchetype', () => {
  it('returns fallback archetype when confidence is low', () => {
    const result = resolveHybridArchetype(makeIcpResult({ confidence: 30, confidenceLevel: 'low' }))
    expect(result.id).toBe('HX00')
    expect(result.fallback).toBe(true)
  })

  it('maps to rule-based hybrid archetype when confidence is sufficient', () => {
    const result = resolveHybridArchetype(makeIcpResult(), personaGVHA)
    expect(result.id).toBe('HX01')
    expect(result.fallback).toBe(false)
  })

  it('uses balanced default hybrid when persona result is absent', () => {
    const result = resolveHybridArchetype(makeIcpResult(), null)
    expect(result.id).toBe('HX11')
  })
})
