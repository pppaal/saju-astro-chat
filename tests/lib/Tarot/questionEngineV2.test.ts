import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/http', () => ({
  fetchWithRetry: vi.fn(),
}))

import { analyzeTarotQuestionV2 } from '@/lib/Tarot/questionEngineV2'
import { fetchWithRetry } from '@/lib/http'

function createOpenAIResponse(payload: Record<string, unknown>) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
    text: vi.fn().mockResolvedValue(''),
  }
}

describe('questionEngineV2', () => {
  const mockFetchWithRetry = vi.mocked(fetchWithRetry)

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  it('keeps a strong local interpretation when the LLM is unavailable', async () => {
    mockFetchWithRetry.mockRejectedValueOnce(new Error('OpenAI timeout'))

    const result = await analyzeTarotQuestionV2({
      question: '\uB0B4\uC77C \uC774\uCC28\uC5F0\uC774 \uB098\uB97C \uB9CC\uB0A0\uAE4C?',
      language: 'ko',
    })

    expect(result.source).toBe('heuristic')
    expect(result.fallback_reason).toBeNull()
    expect(result.intent).toBe('meeting_likelihood')
    expect(result.question_profile.subject.code).toBe('other_person')
    expect(result.question_profile.timeframe.code).toBe('near_term')
    expect(result.direct_answer.length).toBeGreaterThan(0)
  })

  it('understands unusual self-state questions without dropping to fallback', async () => {
    mockFetchWithRetry.mockRejectedValueOnce(new Error('OpenAI timeout'))

    const result = await analyzeTarotQuestionV2({
      question: '\uB0B4\uC77C \uB625\uC744 \uC2F8\uBA74 \uBB34\uC2A8 \uAC10\uC815\uC77C\uAE4C?',
      language: 'ko',
    })

    expect(result.source).toBe('heuristic')
    expect(result.fallback_reason).toBeNull()
    expect(result.question_profile.subject.code).toBe('self')
    expect(['emotion', 'flow']).toContain(result.question_profile.tone.code)
    expect(result.direct_answer.length).toBeGreaterThan(0)
  })

  it('uses llm output when a valid structured response is returned', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(
      createOpenAIResponse({
        questionType: 'unknown',
        subject: 'overall_flow',
        focus: '\uD604\uC7AC \uAD6D\uBA74\uACFC \uC804\uCCB4 \uD750\uB984',
        timeframe: 'current_phase',
        tone: 'flow',
        themeId: 'general-insight',
        spreadId: 'past-present-future',
        reason: '\uC804\uCCB4 \uD750\uB984 \uC9C8\uBB38\uC5D0 \uC801\uD569\uD569\uB2C8\uB2E4.',
        userFriendlyExplanation:
          '\uD604\uC7AC \uD750\uB984\uC744 \uC2DC\uAC04\uCD95\uC73C\uB85C \uC77D\uB294 \uD3B8\uC774 \uC798 \uB9DE\uC2B5\uB2C8\uB2E4.',
        directAnswer:
          '\uC9C0\uAE08\uC740 \uBC00\uC5B4\uBD99\uC774\uAE30\uBCF4\uB2E4 \uD750\uB984\uC744 \uC815\uB9AC\uD558\uB294 \uD3B8\uC774 \uC88B\uC544 \uBCF4\uC5EC\uC694.',
      }) as never
    )

    const result = await analyzeTarotQuestionV2({
      question: '\uC9C0\uAE08 \uB098\uB97C \uB458\uB7EC\uC2FC \uC804\uCCB4 \uD750\uB984\uC740 \uC5B4\uB54C?',
      language: 'ko',
    })

    expect(result.source).toBe('llm')
    expect(result.fallback_reason).toBeNull()
    expect(result.themeId).toBe('general-insight')
    expect(result.spreadId).toBe('past-present-future')
    expect(result.question_profile.subject.code).toBe('overall_flow')
    expect(result.question_profile.tone.code).toBe('flow')
  })

  it('keeps the heuristic decision route when llm collapses a specific question into generic flow', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(
      createOpenAIResponse({
        questionType: 'unknown',
        subject: 'overall_flow',
        focus: '\uC804\uCCB4 \uD750\uB984',
        timeframe: 'open',
        tone: 'flow',
        themeId: 'general-insight',
        spreadId: 'past-present-future',
        reason: '\uC804\uCCB4 \uD750\uB984\uC73C\uB85C \uBCF4\uBA74 \uB429\uB2C8\uB2E4.',
        userFriendlyExplanation:
          '\uD750\uB984 \uC911\uC2EC \uD574\uC11D\uC774 \uC801\uD569\uD569\uB2C8\uB2E4.',
        directAnswer: '\uD750\uB984\uC744 \uBA3C\uC800 \uBCF4\uC138\uC694.',
      }) as never
    )

    const result = await analyzeTarotQuestionV2({
      question: '\uB0B4\uAC00 \uBA3C\uC800 \uC5F0\uB77D\uD558\uB294 \uAC8C \uB9DE\uC544?',
      language: 'ko',
    })

    expect(result.source).toBe('llm')
    expect(result.intent).toBe('self_decision')
    expect(result.spreadId).toBe('yes-no-why')
  })

  it('rejects off-theme llm spread picks for relationship questions', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(
      createOpenAIResponse({
        questionType: 'other_person_response',
        subject: 'relationship',
        focus: '\uACB0\uD63C \uAC00\uB2A5\uC131',
        timeframe: 'mid_term',
        tone: 'prediction',
        themeId: 'self-discovery',
        spreadId: 'identity-core',
        reason: '\uC815\uCCB4\uC131 \uAD00\uC810\uC5D0\uC11C \uBCF4\uBA74 \uB429\uB2C8\uB2E4.',
        userFriendlyExplanation: '\uC790\uC544 \uD574\uC11D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.',
        directAnswer: '\uC790\uC2E0\uC744 \uBA3C\uC800 \uBD10\uC57C \uD569\uB2C8\uB2E4.',
      }) as never
    )

    const result = await analyzeTarotQuestionV2({
      question: '\uC9C0\uAE08 \uB9CC\uB098\uB294 \uC0AC\uB78C\uACFC \uACB0\uD63C \uAC00\uB2A5\uC131 \uC788\uC5B4?',
      language: 'ko',
    })

    expect(result.source).toBe('llm')
    expect(result.themeId).not.toBe('self-discovery')
    expect(result.spreadId).not.toBe('identity-core')
    expect(result.themeId).toBe('love-relationships')
  })

  it('routes job change questions to the career decision spread without the LLM', async () => {
    mockFetchWithRetry.mockRejectedValueOnce(new Error('OpenAI timeout'))

    const result = await analyzeTarotQuestionV2({
      question: '\uB2E4\uC74C \uB2EC\uC5D0 \uC9C1\uC7A5 \uC62E\uAE30\uBA74 \uB098\uC744\uAE4C?',
      language: 'ko',
    })

    expect(result.source).toBe('heuristic')
    expect(result.question_profile.subject.code).toBe('external_situation')
    expect(result.spreadId).toBe('job-change')
  })

  it('keeps meeting-likelihood questions on a direct yes-no spread', async () => {
    mockFetchWithRetry.mockRejectedValueOnce(new Error('OpenAI timeout'))

    const result = await analyzeTarotQuestionV2({
      question: '\uC774\uBC88 \uC8FC \uC911\uC694\uD55C \uC5F0\uB77D \uC62C\uAE4C?',
      language: 'ko',
    })

    expect(result.source).toBe('heuristic')
    expect(result.intent).toBe('meeting_likelihood')
    expect(result.spreadId).toBe('yes-no-why')
  })

  it('treats meeting atmosphere as an external situation rather than a contact question', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(
      createOpenAIResponse({
        questionType: 'meeting_likelihood',
        subject: 'other_person',
        focus: '\uD68C\uC758 \uC131\uC0AC \uAC00\uB2A5\uC131',
        timeframe: 'near_term',
        tone: 'prediction',
        themeId: 'general-insight',
        spreadId: 'past-present-future',
        reason: '\uB2E8\uAE30 \uC774\uBCA4\uD2B8\uB97C \uBCF4\uBA74 \uB429\uB2C8\uB2E4.',
        userFriendlyExplanation: '\uD750\uB984\uC744 \uBCF4\uBA74 \uB429\uB2C8\uB2E4.',
        directAnswer: '\uBC18\uC751 \uD655\uB960\uC744 \uBCF4\uC138\uC694.',
      }) as never
    )

    const result = await analyzeTarotQuestionV2({
      question: '\uB0B4\uC77C \uD68C\uC758 \uBD84\uC704\uAE30 \uC5B4\uB54C?',
      language: 'ko',
    })

    expect(result.source).toBe('llm')
    expect(result.intent).not.toBe('meeting_likelihood')
    expect(result.question_profile.subject.code).toBe('external_situation')
  })

  it('keeps direct contact questions on the heuristic spread when llm drifts to a daily card', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(
      createOpenAIResponse({
        questionType: 'meeting_likelihood',
        subject: 'other_person',
        focus: '\uC624\uB298 \uC5F0\uB77D \uD655\uB960',
        timeframe: 'immediate',
        tone: 'prediction',
        themeId: 'daily-reading',
        spreadId: 'day-card',
        reason: '\uC624\uB298 \uC6B4\uC744 \uBCF4\uBA74 \uB429\uB2C8\uB2E4.',
        userFriendlyExplanation: '\uD558\uB8E8 \uAE30\uC6B4\uC744 \uBCF4\uBA74 \uB429\uB2C8\uB2E4.',
        directAnswer: '\uC624\uB298 \uD750\uB984\uC744 \uBCF4\uC138\uC694.',
      }) as never
    )

    const result = await analyzeTarotQuestionV2({
      question: '\uAC54\uAC00 \uC624\uB298 \uC5F0\uB77D\uD560 \uD655\uB960 \uC788\uC5B4?',
      language: 'ko',
    })

    expect(result.source).toBe('llm')
    expect(result.intent).toBe('meeting_likelihood')
    expect(result.spreadId).toBe('yes-no-why')
  })

  it('does not let relationship future questions collapse into reconciliation intent', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(
      createOpenAIResponse({
        questionType: 'reconciliation',
        subject: 'relationship',
        focus: '\uACB0\uD63C \uAC00\uB2A5\uC131',
        timeframe: 'mid_term',
        tone: 'prediction',
        themeId: 'love-relationships',
        spreadId: 'relationship-cross',
        reason: '\uAD00\uACC4 \uD68C\uBCF5 \uAD00\uC810\uC73C\uB85C \uBCF4\uBA74 \uB429\uB2C8\uB2E4.',
        userFriendlyExplanation: '\uAD00\uACC4 \uD68C\uBCF5 \uAC00\uB2A5\uC131\uC744 \uBCF4\uBA74 \uB429\uB2C8\uB2E4.',
        directAnswer: '\uB2E4\uC2DC \uC774\uC5B4\uC9C8 \uC218 \uC788\uB294\uC9C0 \uBCF4\uC138\uC694.',
      }) as never
    )

    const result = await analyzeTarotQuestionV2({
      question: '\uC9C0\uAE08 \uB9CC\uB098\uB294 \uC0AC\uB78C\uACFC \uACB0\uD63C \uAC00\uB2A5\uC131 \uC788\uC5B4?',
      language: 'ko',
    })

    expect(result.source).toBe('llm')
    expect(result.intent).toBe('near_term_outcome')
    expect(result.spreadId).toBe('relationship-cross')
  })

  it('surfaces broad flow questions with a dedicated intent instead of unknown', async () => {
    mockFetchWithRetry.mockRejectedValueOnce(new Error('OpenAI timeout'))

    const result = await analyzeTarotQuestionV2({
      question: '\uC9C0\uAE08 \uB0B4 \uD750\uB984\uC774 \uC5B4\uB5A4\uC9C0 \uC54C\uACE0 \uC2F6\uC5B4',
      language: 'ko',
    })

    expect(result.source).toBe('heuristic')
    expect(result.intent).toBe('broad_flow')
    expect(result.question_profile.type.code).toBe('broad_flow')
  })
})
