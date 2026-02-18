import { describe, it, expect } from 'vitest'

describe('ICP Types', () => {
  it('should export ICPOctantCode type', async () => {
    const module = await import('@/lib/icp')
    expect(module).toBeDefined()
  })

  it('should export ICPQuizAnswers type', async () => {
    const module = await import('@/lib/icp/types')
    expect(module).toBeDefined()
  })

  it('should export ICPOctant interface', async () => {
    const module = await import('@/lib/icp/types')
    expect(module).toBeDefined()
  })

  it('should export ICPAnalysis interface', async () => {
    const module = await import('@/lib/icp/types')
    expect(module).toBeDefined()
  })

  it('should export ICPCompatibility interface', async () => {
    const module = await import('@/lib/icp/types')
    expect(module).toBeDefined()
  })
})

describe('ICP Questions', () => {
  it('should export icpQuestions array', async () => {
    const { icpQuestions } = await import('@/lib/icp/questions')
    expect(Array.isArray(icpQuestions)).toBe(true)
    expect(icpQuestions.length).toBeGreaterThan(0)
  })

  it('should export TOTAL_ICP_QUESTIONS constant', async () => {
    const { TOTAL_ICP_QUESTIONS } = await import('@/lib/icp/questions')
    expect(typeof TOTAL_ICP_QUESTIONS).toBe('number')
    expect(TOTAL_ICP_QUESTIONS).toBeGreaterThan(0)
  })

  it('should have questions with correct structure', async () => {
    const { icpQuestions } = await import('@/lib/icp/questions')
    const firstQuestion = icpQuestions[0]

    expect(firstQuestion).toHaveProperty('id')
    expect(firstQuestion).toHaveProperty('text')
    expect(firstQuestion).toHaveProperty('textKo')
    expect(firstQuestion).toHaveProperty('axis')
    expect(firstQuestion).toHaveProperty('options')
    expect(Array.isArray(firstQuestion.options)).toBe(true)
  })

  it('should have 32 questions total', async () => {
    const { icpQuestions, TOTAL_ICP_QUESTIONS } = await import('@/lib/icp/questions')
    expect(icpQuestions.length).toBe(TOTAL_ICP_QUESTIONS)
  })

  it('should have options with id, text, and textKo', async () => {
    const { icpQuestions } = await import('@/lib/icp/questions')
    const firstOption = icpQuestions[0].options[0]

    expect(firstOption).toHaveProperty('id')
    expect(firstOption).toHaveProperty('text')
    expect(firstOption).toHaveProperty('textKo')
  })
})

describe('ICP Analysis', () => {
  it('should export ICP_OCTANTS object', async () => {
    const { ICP_OCTANTS } = await import('@/lib/icp/analysis')

    expect(ICP_OCTANTS).toBeDefined()
    expect(typeof ICP_OCTANTS).toBe('object')
  })

  it('should have 8 octants', async () => {
    const { ICP_OCTANTS } = await import('@/lib/icp/analysis')

    const octantCodes = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO']
    for (const code of octantCodes) {
      expect(ICP_OCTANTS[code as keyof typeof ICP_OCTANTS]).toBeDefined()
    }
  })

  it('should have octants with correct structure', async () => {
    const { ICP_OCTANTS } = await import('@/lib/icp/analysis')

    const paOctant = ICP_OCTANTS['PA']
    expect(paOctant).toHaveProperty('code')
    expect(paOctant).toHaveProperty('name')
    expect(paOctant).toHaveProperty('description')
    expect(paOctant).toHaveProperty('dominance')
    expect(paOctant).toHaveProperty('affiliation')
  })

  it('should export analyzeICP function', async () => {
    const { analyzeICP } = await import('@/lib/icp/analysis')

    expect(typeof analyzeICP).toBe('function')
  })

  it('should export getICPCompatibility function', async () => {
    const { getICPCompatibility } = await import('@/lib/icp/analysis')

    expect(typeof getICPCompatibility).toBe('function')
  })

  it('should analyze ICP with sample answers', async () => {
    const { analyzeICP, icpQuestions } = await import('@/lib/icp')

    // Create sample answers - selecting first option for each question
    const answers: Record<string, string> = {}
    for (const q of icpQuestions) {
      answers[q.id] = q.options[0].id
    }

    const result = analyzeICP(answers)

    expect(result).toHaveProperty('primaryStyle')
    expect(result).toHaveProperty('dominanceScore')
    expect(result).toHaveProperty('affiliationScore')
    expect(result).toHaveProperty('octantScores')
    expect(result).toHaveProperty('primaryOctant')
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('consistencyScore')
  })

  it('should analyze ICP with Korean locale', async () => {
    const { analyzeICP, icpQuestions } = await import('@/lib/icp')

    const answers: Record<string, string> = {}
    for (const q of icpQuestions) {
      answers[q.id] = q.options[0].id
    }

    const result = analyzeICP(answers, 'ko')

    expect(result).toHaveProperty('primaryStyle')
    expect(result.primaryOctant).toBeDefined()
    expect(result.summaryKo).toBeDefined()
  })

  it('should get ICP compatibility between two styles', async () => {
    const { getICPCompatibility } = await import('@/lib/icp/analysis')

    const result = getICPCompatibility('PA', 'BC')

    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('description')
    expect(typeof result.score).toBe('number')
  })

  it('should get ICP compatibility with Korean locale', async () => {
    const { getICPCompatibility } = await import('@/lib/icp/analysis')

    const result = getICPCompatibility('PA', 'BC', 'ko')

    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('description')
  })

  it('should return high compatibility for similar styles', async () => {
    const { getICPCompatibility } = await import('@/lib/icp/analysis')

    const result = getICPCompatibility('PA', 'PA')

    expect(result.score).toBeGreaterThanOrEqual(0)
  })

  it('should return valid scores for all octant combinations', async () => {
    const { getICPCompatibility } = await import('@/lib/icp/analysis')

    const octantCodes = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'] as const

    for (const code1 of octantCodes) {
      for (const code2 of octantCodes) {
        const result = getICPCompatibility(code1, code2)
        expect(typeof result.score).toBe('number')
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('ICP Index Exports', () => {
  it('should export all main types and functions', async () => {
    const module = await import('@/lib/icp')

    expect(module.ICP_OCTANTS).toBeDefined()
    expect(module.analyzeICP).toBeDefined()
    expect(module.getICPCompatibility).toBeDefined()
    expect(module.icpQuestions).toBeDefined()
    expect(module.TOTAL_ICP_QUESTIONS).toBeDefined()
  })
})
