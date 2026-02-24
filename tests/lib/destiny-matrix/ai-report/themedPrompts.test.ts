import { describe, expect, it } from 'vitest'
import { buildThemedPrompt } from '@/lib/destiny-matrix/ai-report/prompts/themedPrompts'

describe('themedPrompts guardrails', () => {
  const profile = {
    name: 'Tester',
    birthDate: '1995-02-09',
    dayMaster: '辛',
    dayMasterElement: '금',
    sibsinDistribution: { 정재: 2, 정관: 1 },
  }

  const timingData = {
    daeun: {
      heavenlyStem: '乙',
      earthlyBranch: '亥',
      element: '수',
      startAge: 31,
      endAge: 40,
      isCurrent: true,
    },
    seun: {
      year: 2026,
      heavenlyStem: '丙',
      earthlyBranch: '午',
      element: '화',
    },
  }

  it('includes anti-overclaim rules in Korean themed prompt', () => {
    const prompt = buildThemedPrompt(
      'career',
      'ko',
      profile,
      timingData,
      'matrix summary',
      'astro summary'
    )

    expect(prompt).toContain('절대/확정 표현')
    expect(prompt).toContain('근거:')
    expect(prompt).toContain('100%')
  })

  it('includes anti-overclaim rules in English themed prompt', () => {
    const prompt = buildThemedPrompt(
      'career',
      'en',
      profile,
      timingData,
      'matrix summary',
      'astro summary'
    )

    expect(prompt).toContain('absolute certainty claims')
    expect(prompt).toContain('evidence:')
    expect(prompt).toContain('guaranteed')
  })
})
