import { describe, expect, it } from 'vitest'
import {
  enrichBirthTimeCandidatesWithCoreDiff,
  shouldBuildPreciseTiming,
} from '@/app/api/destiny-map/chat-stream/routeMatrixSnapshot'

describe('routeMatrixSnapshot precise timing gate', () => {
  it('builds precise timing for timing-heavy themes by default', () => {
    expect(shouldBuildPreciseTiming('today')).toBe(true)
    expect(shouldBuildPreciseTiming('month')).toBe(true)
    expect(shouldBuildPreciseTiming('year')).toBe(true)
    expect(shouldBuildPreciseTiming('life')).toBe(true)
  })

  it('skips precise timing for non-timing themes unless the question asks for timing', () => {
    expect(shouldBuildPreciseTiming('career')).toBe(false)
    expect(shouldBuildPreciseTiming('love')).toBe(false)
    expect(shouldBuildPreciseTiming('career', true)).toBe(true)
  })

  it('enriches top birth-time candidates with core action, timing, and branch cues', async () => {
    const candidates = await enrichBirthTimeCandidatesWithCoreDiff({
      candidates: [
        {
          birthTime: '06:30',
          label: 'Recorded time',
          status: 'current-best',
          fitScore: 0.91,
          confidence: 0.85,
          summary: 'Recorded time remains stable.',
          supportSignals: ['ascendant stable'],
          cautionSignals: ['relationship axis is sensitive'],
        },
        {
          birthTime: '04:30',
          label: 'Comparison time',
          status: 'plausible',
          fitScore: 0.68,
          confidence: 0.54,
          summary: 'Comparison time remains plausible.',
          supportSignals: ['time pillar shift'],
          cautionSignals: ['career axis is more sensitive'],
        },
      ],
      currentBirthTime: '06:30',
      currentSnapshot: {
        directAnswer: 'Move only when the role is clearly framed.',
        actionDomain: 'career',
        riskDomain: 'relationship',
        bestWindow: '1-3m',
        branchSummary: 'The documented-role path remains strongest.',
      },
      fetchCandidateSnapshot: async () => ({
        directAnswer: 'The earlier time tilts more defensive.',
        actionDomain: 'health',
        riskDomain: 'wealth',
        bestWindow: '3-6m',
        branchSummary: 'Stabilize first, then expand.',
      }),
      locale: 'en',
    })

    expect(candidates[0]?.summary).toContain('Move only when the role is clearly framed.')
    expect(candidates[0]?.summary).toContain('Best window: 1-3m.')
    expect(candidates[0]?.supportSignals).toContain('Core action axis: career.')
    expect(
      candidates[0]?.supportSignals.some((line) => line.includes('documented-role path'))
    ).toBe(true)
    expect(candidates[0]?.coreDiff?.actionDomain).toBe('career')
    expect(candidates[0]?.coreDiff?.bestWindow).toBe('1-3m')
    expect(candidates[1]?.summary).toContain('The earlier time tilts more defensive.')
    expect(candidates[1]?.cautionSignals).toContain('Risk axis tilts toward wealth.')
  })
})
