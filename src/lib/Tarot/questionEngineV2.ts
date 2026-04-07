import { fetchWithRetry } from '@/lib/http'
import { prepareForMatching } from './utils/koreanTextNormalizer'

export type {
  QuestionEngineV2FallbackReason,
  QuestionEngineV2Result,
} from './questionEngineV2Support'

import {
  buildPath,
  getSpreadOptions,
  isDangerousQuestion,
  type AnalyzeSource,
  type EngineLanguage,
  type EngineSpreadOption,
  type LLMAnalysisPayload,
  type PrimarySelection,
  type QuestionProfile,
  type QuestionEngineV2FallbackReason,
  type QuestionEngineV2Result,
  type SpreadOption,
  type StructuredIntent,
} from './questionEngineV2Support'
import { getIntentLabel } from './questionEngineV2Heuristics'
import {
  buildHeuristicDirectAnswer,
  buildHeuristicIntent,
  buildQuestionProfile,
  buildQuestionSummary,
  buildQuestionVariants,
  buildRecommendedSpreads,
  buildResult,
  chooseResolvedIntent,
  classifyOpenAIFailure,
  findSpread,
  resolveDeterministicSpread,
  repairIntentAnalysis,
  shouldPreferHeuristicSpread,
} from './questionEngineV2Helpers'
async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 420) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_MISSING')
  }

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    },
    {
      // Question routing already has a deterministic heuristic fallback.
      // Fail fast here so the UI gets a stable answer instead of timing out locally.
      maxRetries: 0,
      initialDelayMs: 250,
      maxDelayMs: 600,
      timeoutMs: 4200,
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
    }
  )

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

function buildAnalysisPrompt(spreadList: string) {
  return `You are a tarot question understanding engine.

Understand the user's actual intent before any reading starts.
Even if the wording is messy, abbreviated, playful, or indirect, interpret it as a real human question.

Return JSON only with:
- questionType: self_decision | other_person_response | meeting_likelihood | near_term_outcome | timing | reconciliation | inner_feelings | unknown
- subject: self | other_person | relationship | overall_flow | external_situation
- focus: short phrase
- timeframe: immediate | near_term | current_phase | mid_term | open
- tone: prediction | advice | emotion | flow
- directAnswer: 1-2 sentence opener that answers the real question
- userFriendlyExplanation: short explanation of what reading posture fits
- reason: why the chosen spread fits
- themeId: exact theme ID from the list
- spreadId: exact spread ID from the list

Rules:
- When the subject is someone else, do not answer as if it were about the user.
- Broad questions should stay broad.
- Timing questions should talk about timing posture, not fake certainty.
- Weird questions should still be interpreted as human intent, not dismissed as nonsense.
- Use a stable spread from the list.

Available spreads:
${spreadList}`
}

export async function analyzeTarotQuestionV2(input: {
  question: string
  language: EngineLanguage
}): Promise<QuestionEngineV2Result> {
  const { question, language } = input
  const trimmedQuestion = question.trim()
  const spreadOptions = getSpreadOptions()
  const questionVariants = buildQuestionVariants(trimmedQuestion)
  const heuristicIntent = buildHeuristicIntent(questionVariants, language)
  const heuristicSelection = resolveDeterministicSpread(
    trimmedQuestion,
    language,
    spreadOptions,
    questionVariants,
    heuristicIntent
  )
  const responseQuestion =
    /((내가|먼저).*(연락|사과).*(반응|답장|어때|어떤)|호감표시.*부담|반응 어떨까)/.test(
      trimmedQuestion
    ) ||
    /((내가|먼저).*(연락|사과).*(반응|답장|어때|어떤)|호감표시.*부담|반응 어떨까)/.test(
      questionVariants.join(' ')
    )
  const impressionQuestion =
    /(눈에.*내가|나를.*어떻게|어떤 사람|어때 보|어떻게 보)/.test(trimmedQuestion) ||
    /(눈에.*내가|나를.*어떻게|어떤 사람|어때 보|어떻게 보)/.test(questionVariants.join(' '))
  const effectiveSelection = responseQuestion
    ? {
        themeId: 'love-relationships',
        spreadId: 'crush-feelings',
        reason:
          language === 'ko'
            ? '상대가 어떻게 반응할지 읽는 질문으로 보고 관계 감정 스프레드로 연결했어요.'
            : 'Routed to a relationship feelings spread for response intent.',
        userFriendlyExplanation:
          language === 'ko'
            ? '내 행동보다 상대 반응을 읽는 질문이라 감정 스프레드가 더 잘 맞습니다.'
            : 'A feelings spread fits better when the question is about the other person’s response.',
      }
    : impressionQuestion && heuristicSelection.themeId === 'general-insight'
      ? {
          themeId: 'love-relationships',
          spreadId: 'crush-feelings',
          reason:
            language === 'ko'
              ? '상대가 나를 어떻게 느끼는지 읽는 질문으로 보고 관계 감정 스프레드로 연결했어요.'
              : 'Routed to a relationship feelings spread for how-they-see-me intent.',
          userFriendlyExplanation:
            language === 'ko'
              ? '상대의 시선과 내면 반응을 읽는 질문이라 감정 스프레드가 더 잘 맞습니다.'
              : 'A feelings spread fits better when the question is about how the other person sees you.',
        }
      : heuristicSelection
  const defaultSpread =
    findSpread(effectiveSelection.themeId, effectiveSelection.spreadId, spreadOptions) ||
    findSpread('general-insight', 'quick-reading', spreadOptions) ||
    spreadOptions[0]

  if (!defaultSpread) {
    return {
      isDangerous: false,
      themeId: 'general-insight',
      spreadId: 'quick-reading',
      spreadTitle: language === 'ko' ? '빠른 리딩' : 'Quick Reading',
      cardCount: 1,
      userFriendlyExplanation:
        language === 'ko'
          ? '기본 스프레드를 찾지 못해 최소 설정으로 연결했어요.'
          : 'A minimal default spread was used because no spread could be resolved.',
      question_summary: buildQuestionSummary(heuristicIntent, language),
      question_profile: buildQuestionProfile(heuristicIntent, language),
      direct_answer: buildHeuristicDirectAnswer(heuristicIntent, questionVariants, language),
      intent: heuristicIntent.questionType,
      intent_label: getIntentLabel(heuristicIntent.questionType, language),
      recommended_spreads: [],
      path: buildPath('general-insight', 'quick-reading', trimmedQuestion),
      source: 'fallback',
      fallback_reason: 'no_candidate',
    }
  }

  if (isDangerousQuestion(trimmedQuestion)) {
    return buildResult({
      question: trimmedQuestion,
      language,
      intent: heuristicIntent,
      primarySpread: defaultSpread,
      reason: heuristicSelection.reason,
      userFriendlyExplanation: '',
      directAnswer: '',
      source: 'fallback',
      fallbackReason: 'no_candidate',
      isDangerous: true,
      message:
        language === 'ko'
          ? '힘든 시간을 보내고 계신 것 같아요. 전문가의 도움을 받으시길 권해드려요. 자살예방상담전화: 1393 (24시간)'
          : 'I sense you may be going through a difficult time. Please reach out to a professional or local crisis service.',
      recommended_spreads: [],
    })
  }

  const heuristicResult = buildResult({
    question: trimmedQuestion,
    language,
    intent: (responseQuestion && heuristicIntent.questionType === 'self_decision'
      ? { ...heuristicIntent, questionType: 'other_person_response', subject: 'relationship' }
      : heuristicIntent) as StructuredIntent,
    primarySpread: defaultSpread,
    reason: effectiveSelection.reason,
    userFriendlyExplanation: effectiveSelection.userFriendlyExplanation,
    directAnswer: buildHeuristicDirectAnswer(heuristicIntent, questionVariants, language),
    source: 'heuristic',
    fallbackReason: null,
  })

  const spreadList = spreadOptions
    .map(
      (spread) =>
        `- ${spread.themeId}/${spread.id}: ${spread.titleKo || spread.title} (${spread.cardCount} cards)`
    )
    .join('\n')

  try {
    const responseText = await callOpenAI(
      [
        { role: 'system', content: buildAnalysisPrompt(spreadList) },
        {
          role: 'user',
          content: [
            `Raw question: ${trimmedQuestion}`,
            `Normalized variants: ${questionVariants.join(' || ')}`,
            `Heuristic intent hint: ${JSON.stringify(heuristicIntent)}`,
          ].join('\n'),
        },
      ],
      420
    )

    const parsed = JSON.parse(responseText) as LLMAnalysisPayload
    const repairedLlmIntent = repairIntentAnalysis(
      questionVariants,
      heuristicIntent,
      parsed,
      language
    )
    const resolvedIntent = chooseResolvedIntent(heuristicIntent, repairedLlmIntent)
    const finalResolvedIntent: StructuredIntent =
      responseQuestion && resolvedIntent.questionType === 'self_decision'
        ? { ...resolvedIntent, questionType: 'other_person_response', subject: 'relationship' }
        : resolvedIntent
    const parsedPrimarySpread =
      (parsed.themeId &&
        parsed.spreadId &&
        findSpread(parsed.themeId, parsed.spreadId, spreadOptions)) ||
      defaultSpread
    const preferHeuristicSpread = shouldPreferHeuristicSpread(
      heuristicIntent,
      resolvedIntent,
      defaultSpread,
      parsedPrimarySpread
    )
    const primarySpread = preferHeuristicSpread ? defaultSpread : parsedPrimarySpread
    const shouldUseHeuristicCopy =
      preferHeuristicSpread &&
      primarySpread.id === defaultSpread.id &&
      primarySpread.themeId === defaultSpread.themeId

    return buildResult({
      question: trimmedQuestion,
      language,
      intent: finalResolvedIntent,
      primarySpread,
      reason: shouldUseHeuristicCopy
        ? effectiveSelection.reason
        : parsed.reason?.trim() || effectiveSelection.reason,
      userFriendlyExplanation: shouldUseHeuristicCopy
        ? effectiveSelection.userFriendlyExplanation
        : parsed.userFriendlyExplanation?.trim() || effectiveSelection.userFriendlyExplanation,
      directAnswer:
        shouldUseHeuristicCopy && heuristicIntent.questionType !== 'unknown'
          ? buildHeuristicDirectAnswer(resolvedIntent, questionVariants, language)
          : parsed.directAnswer?.trim() ||
            buildHeuristicDirectAnswer(resolvedIntent, questionVariants, language),
      source: 'llm',
      fallbackReason: null,
      recommended_spreads: buildRecommendedSpreads(
        trimmedQuestion,
        language,
        {
          themeId: primarySpread.themeId,
          spreadId: primarySpread.id,
          reason: shouldUseHeuristicCopy
            ? effectiveSelection.reason
            : parsed.reason?.trim() || effectiveSelection.reason,
        },
        spreadOptions
      ),
    })
  } catch (error) {
    const fallbackReason = classifyOpenAIFailure(error)

    if (
      fallbackReason === 'auth_failed' ||
      fallbackReason === 'parse_failed' ||
      fallbackReason === 'server_error'
    ) {
      return heuristicResult
    }

    return {
      ...heuristicResult,
      source: 'fallback',
      fallback_reason: fallbackReason,
    }
  }
}
