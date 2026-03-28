import { beforeEach, describe, expect, it } from 'vitest'

import {
  appendQuestionContextToPath,
  buildQuestionContextPrompt,
  buildStableEntryPath,
  getQuestionIntent,
  loadQuestionAnalysisSnapshot,
  resolveStableTarotEntry,
  storeQuestionAnalysisSnapshot,
  type TarotQuestionAnalysisResult,
} from '@/lib/Tarot/questionFlow'

function createAnalysis(
  overrides: Partial<TarotQuestionAnalysisResult> = {}
): TarotQuestionAnalysisResult {
  return {
    themeId: 'general-insight',
    spreadId: 'quick-reading',
    spreadTitle: 'Quick Reading',
    cardCount: 1,
    userFriendlyExplanation: 'Read the question first.',
    path: '/tarot/general-insight/quick-reading?question=test',
    question_profile: {
      type: { code: 'open_read', label: 'Open question' },
      subject: { code: 'self', label: 'Self' },
      focus: { code: 'focus', label: 'Focus' },
      timeframe: { code: 'open', label: 'Open' },
      tone: { code: 'prediction', label: 'Prediction' },
    },
    ...overrides,
  }
}

describe('questionFlow', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('uses a stable flow spread for current-phase questions', () => {
    const analysis = createAnalysis({
      question_profile: {
        type: { code: 'flow_read', label: 'Flow' },
        subject: { code: 'overall_flow', label: 'Overall flow' },
        focus: { code: 'flow', label: 'Overall flow' },
        timeframe: { code: 'current_phase', label: 'Current phase' },
        tone: { code: 'flow', label: 'Flow' },
      },
    })

    expect(resolveStableTarotEntry('지금 전체 흐름은 어때?', analysis)).toEqual({
      themeId: 'general-insight',
      spreadId: 'past-present-future',
    })
  })

  it('keeps other-person questions on a stable relationship entry path', () => {
    const analysis = createAnalysis({
      question_profile: {
        type: { code: 'other_response', label: 'Other response' },
        subject: { code: 'other_person', label: 'Other person' },
        focus: { code: 'reply', label: 'Reply' },
        timeframe: { code: 'near_term', label: 'Near term' },
        tone: { code: 'prediction', label: 'Prediction' },
      },
    })

    expect(buildStableEntryPath('내일 이차연이 무슨 대답을 할까?', analysis)).toBe(
      '/tarot/love-relationships/crush-feelings?question=%EB%82%B4%EC%9D%BC+%EC%9D%B4%EC%B0%A8%EC%97%B0%EC%9D%B4+%EB%AC%B4%EC%8A%A8+%EB%8C%80%EB%8B%B5%EC%9D%84+%ED%95%A0%EA%B9%8C%3F'
    )
  })

  it('keeps meeting-likelihood questions on a stable yes-no path', () => {
    const analysis = createAnalysis({
      question_profile: {
        type: { code: 'meeting_likelihood', label: 'Meeting likelihood' },
        subject: { code: 'other_person', label: 'Other person' },
        focus: { code: 'contact', label: 'Contact' },
        timeframe: { code: 'near_term', label: 'Near term' },
        tone: { code: 'prediction', label: 'Prediction' },
      },
    })

    expect(resolveStableTarotEntry('걔 연락 올까?', analysis)).toEqual({
      themeId: 'decisions-crossroads',
      spreadId: 'yes-no-why',
    })
  })

  it('prefers analyzed intent over regex fallback', () => {
    const analysis = createAnalysis({
      question_profile: {
        type: { code: 'flow_read', label: 'Flow' },
        subject: { code: 'overall_flow', label: 'Overall flow' },
        focus: { code: 'flow', label: 'Overall flow' },
        timeframe: { code: 'current_phase', label: 'Current phase' },
        tone: { code: 'flow', label: 'Flow' },
      },
    })

    expect(getQuestionIntent('이거 될까?', analysis)).toBe('flow')
  })

  it('round-trips analysis snapshots through session storage', () => {
    const analysis = createAnalysis({
      direct_answer: '지금은 방향 정리가 먼저입니다.',
      question_summary: '흐름형 질문입니다.',
      intent_label: 'Flow',
    })

    const key = storeQuestionAnalysisSnapshot('지금 전체 흐름은 어때?', analysis)

    expect(key).toBeTruthy()
    expect(loadQuestionAnalysisSnapshot(key, '지금 전체 흐름은 어때?')).toEqual({
      question_summary: '흐름형 질문입니다.',
      question_profile: analysis.question_profile,
      direct_answer: '지금은 방향 정리가 먼저입니다.',
      intent: undefined,
      intent_label: 'Flow',
    })
  })

  it('appends both question and analysis key to existing paths', () => {
    expect(
      appendQuestionContextToPath('/tarot/general-insight/quick-reading?foo=bar', '질문', 'abc123')
    ).toBe(
      '/tarot/general-insight/quick-reading?foo=bar&question=%EC%A7%88%EB%AC%B8&analysisKey=abc123'
    )
  })

  it('builds a prompt-friendly question context block', () => {
    const analysis = createAnalysis({
      question_summary: '흐름형 질문입니다.',
      direct_answer: '지금은 정리와 재배치가 먼저입니다.',
      question_profile: {
        type: { code: 'flow_read', label: '흐름 해석 질문' },
        subject: { code: 'overall_flow', label: '전체 흐름' },
        focus: { code: 'flow', label: '현재 국면과 방향' },
        timeframe: { code: 'current_phase', label: '현재 국면' },
        tone: { code: 'flow', label: '흐름 해석 중심' },
      },
    })

    const prompt = buildQuestionContextPrompt('지금 전체 흐름은 어때?', analysis, 'ko')

    expect(prompt).toContain('지금 전체 흐름은 어때?')
    expect(prompt).toContain('[질문 요약] 흐름형 질문입니다.')
    expect(prompt).toContain('[질문 선해석] 지금은 정리와 재배치가 먼저입니다.')
  })
})
