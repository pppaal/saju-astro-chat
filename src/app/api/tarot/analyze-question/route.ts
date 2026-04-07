// src/app/api/tarot/analyze-question/route.ts
// GPT-4o-mini를 사용해서 사용자 질문을 분석하고 적절한 스프레드 추천 (비용 효율적)

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createTarotGuard } from '@/lib/api/middleware'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { tarotAnalyzeQuestionSchema as AnalyzeQuestionSchema } from '@/lib/api/zodValidation'
import { fetchWithRetry } from '@/lib/http'
import {
  type AnalyzeFallbackReason,
  type AnalyzeSource,
  type IntentAnalysisResult,
  type ParsedResult,
  buildAnswerAndSpreadPrompt,
  buildDirectAnswer,
  buildIntentAnalysisPrompt,
  buildPath,
  buildQuestionProfile,
  buildQuestionSummary,
  buildQuestionVariants,
  buildRecommendedSpreads,
  checkDangerous,
  detectQuestionIntent,
  detectQuestionSubject,
  detectQuestionTimeframe,
  detectQuestionTone,
  findPatternMatch,
  formatQuestionForPrompt,
  getFocusLabel,
  getIntentLabel,
  getSpreadOptions,
  repairIntentAnalysis,
  revalidateWithRecommendations,
  resolveDeterministicFallback,
} from './routeSupport'

async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 400) {
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
        model: 'gpt-4o-mini', // 질문 분류는 단순 작업이므로 mini 사용 (96% 저렴)
        messages,
        max_tokens: maxTokens,
        temperature: 0.3, // 복잡한 뉘앙스 파악을 위해 약간 높임
        response_format: { type: 'json_object' },
      }),
    },
    {
      maxRetries: 2,
      initialDelayMs: 600,
      maxDelayMs: 2500,
      timeoutMs: 15000,
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
      onRetry: (attempt, error, delayMs) => {
        logger.warn('[analyze-question] OpenAI retry scheduled', {
          attempt,
          delayMs,
          reason: error.message,
        })
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// 스프레드 정보를 GPT에게 전달할 형식으로 변환

export const POST = withApiMiddleware(
  async (request: NextRequest) => {
    try {
      // Validate request body with Zod
      const body = await request.json()
      const validation = AnalyzeQuestionSchema.safeParse(body)

      if (!validation.success) {
        const errors = validation.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')
        logger.warn('[tarot/analyze-question] Validation failed', {
          errors: validation.error.issues,
        })
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const { question, language } = validation.data
      const trimmedQuestion = question.trim()
      const questionVariants = buildQuestionVariants(trimmedQuestion)

      // 위험한 질문 체크
      if (checkDangerous(trimmedQuestion)) {
        return NextResponse.json({
          isDangerous: true,
          message:
            language === 'ko'
              ? '힘든 시간을 보내고 계신 것 같아요. 전문가의 도움을 받으시길 권해드려요. 자살예방상담전화: 1393 (24시간)'
              : 'I sense you might be going through a difficult time. Please reach out to a professional who can help. Crisis helpline: 1393 (Korea) or your local emergency services.',
        })
      }

      // 스프레드 옵션 목록
      const spreadOptions = getSpreadOptions()
      const detectedIntent = detectQuestionIntent(questionVariants)
      const spreadListForPrompt = spreadOptions
        .map((s) => `- ${s.themeId}/${s.id}: ${s.titleKo} (${s.cardCount}장) - ${s.description}`)
        .join('\n')

      let parsed: ParsedResult = resolveDeterministicFallback(
        trimmedQuestion,
        language,
        spreadOptions,
        questionVariants
      )
      let llmQuestionFields: IntentAnalysisResult = {}
      let source: AnalyzeSource = 'fallback'
      let fallbackReason: AnalyzeFallbackReason | null = null
      let hasStructuredLLMResult = false
      const formattedQuestion = formatQuestionForPrompt(questionVariants, detectedIntent)
      const intentPrompt = buildIntentAnalysisPrompt()
      const answerPrompt = buildAnswerAndSpreadPrompt(spreadListForPrompt)

      let intentResponseText = ''
      let answerResponseText = ''
      let openAiFailed = false

      try {
        intentResponseText = await callOpenAI(
          [
            { role: 'system', content: intentPrompt },
            { role: 'user', content: formattedQuestion },
          ],
          220
        )
      } catch (error) {
        openAiFailed = true
        fallbackReason =
          error instanceof Error && /OPENAI_API_KEY_MISSING/.test(error.message)
            ? 'auth_failed'
            : 'server_error'
        logger.warn('[analyze-question] Intent analysis unavailable, using fallback routing', error)
      }

      if (intentResponseText) {
        try {
          llmQuestionFields = repairIntentAnalysis(
            questionVariants,
            detectedIntent,
            JSON.parse(intentResponseText) as IntentAnalysisResult
          )
        } catch {
          fallbackReason = 'parse_failed'
        }
      }

      if (!openAiFailed) {
        const intentContext = JSON.stringify(
          {
            questionType: llmQuestionFields.questionType || detectedIntent,
            subject:
              llmQuestionFields.subject || detectQuestionSubject(questionVariants, detectedIntent),
            focus: llmQuestionFields.focus || getFocusLabel(detectedIntent, language),
            timeframe: llmQuestionFields.timeframe || detectQuestionTimeframe(questionVariants),
            tone: llmQuestionFields.tone || detectQuestionTone(detectedIntent, questionVariants),
          },
          null,
          2
        )

        try {
          answerResponseText = await callOpenAI([
            { role: 'system', content: answerPrompt },
            {
              role: 'user',
              content: `${formattedQuestion}\n\nStructured intent analysis:\n${intentContext}`,
            },
          ])
        } catch (error) {
          fallbackReason =
            error instanceof Error && /OPENAI_API_KEY_MISSING/.test(error.message)
              ? 'auth_failed'
              : 'server_error'
          logger.warn(
            '[analyze-question] Direct answer/spread routing unavailable, using fallback',
            error
          )
        }
      }

      try {
        if (answerResponseText) {
          const maybeParsed = JSON.parse(answerResponseText) as Partial<ParsedResult>
          hasStructuredLLMResult = Boolean(
            maybeParsed &&
            typeof maybeParsed.themeId === 'string' &&
            typeof maybeParsed.spreadId === 'string'
          )

          if (hasStructuredLLMResult) {
            parsed = {
              themeId: maybeParsed.themeId as string,
              spreadId: maybeParsed.spreadId as string,
              reason:
                typeof maybeParsed.reason === 'string'
                  ? maybeParsed.reason
                  : language === 'ko'
                    ? '질문 의도 기반 추천'
                    : 'Intent-based recommendation',
              userFriendlyExplanation:
                typeof maybeParsed.userFriendlyExplanation === 'string'
                  ? maybeParsed.userFriendlyExplanation
                  : language === 'ko'
                    ? '질문 의도와 가까운 스프레드를 선택했어요'
                    : 'Selected the spread closest to your intent.',
              questionType: llmQuestionFields.questionType,
              subject: llmQuestionFields.subject,
              focus: llmQuestionFields.focus,
              timeframe: llmQuestionFields.timeframe,
              tone: llmQuestionFields.tone,
              directAnswer:
                typeof maybeParsed.directAnswer === 'string' ? maybeParsed.directAnswer : undefined,
            }
            source = 'llm'
            fallbackReason = null
          } else {
            fallbackReason = 'parse_failed'
          }
        } else if (!openAiFailed) {
          fallbackReason = fallbackReason || 'no_candidate'
        }
      } catch {
        fallbackReason = 'parse_failed'
      }

      const questionProfile = buildQuestionProfile(
        questionVariants,
        detectedIntent,
        language,
        llmQuestionFields
      )
      const directAnswer = buildDirectAnswer(
        detectedIntent,
        questionVariants,
        language,
        parsed.directAnswer
      )

      if (!hasStructuredLLMResult) {
        const patternMatch = findPatternMatch(questionVariants, language)
        if (patternMatch) {
          parsed = patternMatch.parsed
          source = 'pattern'
          fallbackReason = null
        } else {
          parsed = resolveDeterministicFallback(
            trimmedQuestion,
            language,
            spreadOptions,
            questionVariants
          )
          source = 'fallback'
        }
      } else {
        // Keep AI-picked spread when valid; only repair invalid IDs.
        parsed = revalidateWithRecommendations(parsed, trimmedQuestion, language, spreadOptions)
      }

      // 선택된 스프레드 정보 찾기
      const selectedSpread = spreadOptions.find(
        (s) => s.themeId === parsed.themeId && s.id === parsed.spreadId
      )

      if (!selectedSpread) {
        const fallbackParsed = resolveDeterministicFallback(
          trimmedQuestion,
          language,
          spreadOptions,
          questionVariants
        )
        const fallbackSpread = spreadOptions.find(
          (s) => s.themeId === fallbackParsed.themeId && s.id === fallbackParsed.spreadId
        )

        if (fallbackSpread) {
          return NextResponse.json({
            isDangerous: false,
            themeId: fallbackParsed.themeId,
            spreadId: fallbackParsed.spreadId,
            spreadTitle: fallbackSpread.titleKo || fallbackSpread.title,
            cardCount: fallbackSpread.cardCount,
            reason: fallbackParsed.reason,
            userFriendlyExplanation: fallbackParsed.userFriendlyExplanation,
            source: 'fallback' as AnalyzeSource,
            fallback_reason: 'invalid_spread' as AnalyzeFallbackReason,
            intent: detectedIntent,
            intent_label: getIntentLabel(detectedIntent, language),
            question_summary: buildQuestionSummary(trimmedQuestion, detectedIntent, language),
            question_profile: questionProfile,
            direct_answer: directAnswer,
            recommended_spreads: buildRecommendedSpreads(
              trimmedQuestion,
              language,
              spreadOptions,
              fallbackParsed
            ),
            path: buildPath(fallbackParsed.themeId, fallbackParsed.spreadId, trimmedQuestion),
          })
        }

        return NextResponse.json({
          isDangerous: false,
          themeId: 'general-insight',
          spreadId: 'past-present-future',
          spreadTitle: '과거, 현재, 미래',
          cardCount: 3,
          reason: language === 'ko' ? '기본 흐름 확인' : 'General flow check',
          userFriendlyExplanation:
            language === 'ko' ? '기본 흐름 스프레드를 사용했어요' : 'Using general flow spread.',
          source: 'fallback' as AnalyzeSource,
          fallback_reason: 'invalid_spread' as AnalyzeFallbackReason,
          intent: detectedIntent,
          intent_label: getIntentLabel(detectedIntent, language),
          question_summary: buildQuestionSummary(trimmedQuestion, detectedIntent, language),
          question_profile: questionProfile,
          direct_answer: directAnswer,
          recommended_spreads: buildRecommendedSpreads(trimmedQuestion, language, spreadOptions, {
            themeId: 'general-insight',
            spreadId: 'past-present-future',
            reason: language === 'ko' ? '기본 흐름 확인' : 'General flow check',
            userFriendlyExplanation:
              language === 'ko' ? '기본 흐름 스프레드를 사용했어요' : 'Using general flow spread.',
          }),
          path: buildPath('general-insight', 'past-present-future', trimmedQuestion),
        })
      }

      const res = NextResponse.json({
        isDangerous: false,
        themeId: parsed.themeId,
        spreadId: parsed.spreadId,
        spreadTitle: selectedSpread.titleKo,
        cardCount: selectedSpread.cardCount,
        reason: parsed.reason,
        userFriendlyExplanation: parsed.userFriendlyExplanation,
        source,
        fallback_reason: source === 'fallback' ? fallbackReason || 'no_candidate' : null,
        intent: detectedIntent,
        intent_label: getIntentLabel(detectedIntent, language),
        question_summary: buildQuestionSummary(trimmedQuestion, detectedIntent, language),
        question_profile: questionProfile,
        direct_answer: directAnswer,
        recommended_spreads: buildRecommendedSpreads(
          trimmedQuestion,
          language,
          spreadOptions,
          parsed
        ),
        path: buildPath(parsed.themeId, parsed.spreadId, trimmedQuestion),
      })
      return res
    } catch (error) {
      logger.error('Error analyzing question:', error)
      return NextResponse.json(
        { error: 'Failed to analyze question' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createTarotGuard({
    route: '/api/tarot/analyze-question',
    limit: 10,
    windowSeconds: 60,
  })
)
