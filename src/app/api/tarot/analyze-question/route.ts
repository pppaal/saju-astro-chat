// src/app/api/tarot/analyze-question/route.ts
// GPT-4o-mini를 사용해서 사용자 질문을 분석하고 적절한 스프레드 추천 (비용 효율적)

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createTarotGuard } from '@/lib/api/middleware'
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data'
import { logger } from '@/lib/logger'
import { PATTERN_MAPPINGS, getExamInterviewMapping } from './pattern-mappings'
import { HTTP_STATUS } from '@/lib/constants/http'
import { tarotAnalyzeQuestionSchema as AnalyzeQuestionSchema } from '@/lib/api/zodValidation'
import { prepareForMatching } from '@/lib/Tarot/utils/koreanTextNormalizer'
import { recommendSpreads } from '@/lib/Tarot/tarot-recommend'
import { fetchWithRetry } from '@/lib/http'

// ============================================================
// Types
// ============================================================
interface ParsedResult {
  themeId: string
  spreadId: string
  reason: string
  userFriendlyExplanation: string
}

interface SpreadOption {
  id: string
  themeId: string
  title: string
  titleKo: string
  description: string
  cardCount: number
}

interface PatternMatch {
  parsed: ParsedResult
  priority: number
  matchedQuestion: string
}

type AnalyzeSource = 'pattern' | 'llm' | 'fallback'
type AnalyzeFallbackReason =
  | 'auth_failed'
  | 'rate_limited'
  | 'server_error'
  | 'parse_failed'
  | 'no_candidate'
  | 'invalid_spread'

type TarotQuestionIntent =
  | 'self_decision'
  | 'other_person_response'
  | 'meeting_likelihood'
  | 'near_term_outcome'
  | 'timing'
  | 'reconciliation'
  | 'inner_feelings'
  | 'unknown'

// ============================================================
// OpenAI API 호출 헬퍼
// ============================================================
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
function getSpreadOptions(): SpreadOption[] {
  const options: SpreadOption[] = []

  for (const theme of tarotThemes) {
    for (const spread of theme.spreads) {
      options.push({
        id: spread.id,
        themeId: theme.id,
        title: spread.title,
        titleKo: spread.titleKo || spread.title,
        description: spread.descriptionKo || spread.description,
        cardCount: spread.cardCount,
      })
    }
  }

  return options
}

// 위험한 질문 체크
const dangerousKeywords = [
  '자살',
  '죽고 싶',
  '죽을래',
  '살기 싫',
  '끝내고 싶',
  '죽어버릴',
  '자해',
  '목숨',
  '생을 마감',
  '세상 떠나',
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
]

function checkDangerous(question: string): boolean {
  const normalized = question.toLowerCase()
  return dangerousKeywords.some((kw) => normalized.includes(kw.toLowerCase()))
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function detectQuestionIntent(questionVariants: string[]): TarotQuestionIntent {
  const joined = questionVariants
    .map((variant) => variant.toLowerCase().replace(/\s+/g, ' ').trim())
    .join(' || ')

  const reconciliationPatterns = [
    /재회/,
    /다시 만나/,
    /돌아오/,
    /복합/,
    /헤어졌/,
    /get back together/,
    /reconcil/,
    /come back/,
    /ex\b/,
  ]
  if (hasPattern(joined, reconciliationPatterns)) {
    return 'reconciliation'
  }

  const innerFeelingPatterns = [
    /속마음/,
    /그 사람 마음/,
    /상대(방)? 마음/,
    /어떻게 생각/,
    /좋아하/,
    /관심 있/,
    /feelings?/,
    /feel about me/,
    /think of me/,
    /into me/,
  ]
  if (hasPattern(joined, innerFeelingPatterns)) {
    return 'inner_feelings'
  }

  const timingPatterns = [
    /언제/,
    /시기/,
    /타이밍/,
    /몇 월/,
    /\bwhen\b/,
    /\btiming\b/,
    /what time/,
    /right moment/,
    /best time/,
  ]
  if (hasPattern(joined, timingPatterns)) {
    return 'timing'
  }

  const otherSubjectPatterns = [
    /그 사람|그사람|상대(방)?|그분|그녀|그가|걔|얘|전남친|전여친/,
    /\bthey\b|\bhe\b|\bshe\b|\bpartner\b|\bex\b/,
  ]
  const namedOtherSubjectPatterns = [
    /[가-힣]{2,4}(이|가)\s*(나|내|저|제)를/,
    /[가-힣]{2,4}(이|가)\s*(나|내|저|제)에게/,
    /[가-힣]{2,4}(이|가)\s*(나|내|저|제)한테/,
    /[가-힣]{2,4}(이|가)\s*(내일|오늘|이번|곧)/,
    /[가-힣]{2,4}(이|가)\s*(연락|답장|만나|올|답할|말할|뭐라|무슨 말)/,
  ]
  const hasOtherSubject =
    hasPattern(joined, otherSubjectPatterns) || hasPattern(joined, namedOtherSubjectPatterns)

  const meetingLikelihoodPatterns = [
    /만날까|만날 수|만날 가능/,
    /성사될까|가능성/,
    /연락 올까|답장 올까/,
    /\bmeet\b|\bmeeting\b|\bshow up\b/,
    /\breply\b|\brespond\b/,
  ]
  if (hasOtherSubject && hasPattern(joined, meetingLikelihoodPatterns)) {
    return 'meeting_likelihood'
  }

  const otherResponsePatterns = [
    /해줄까|올까|볼까|답할까|받아줄까|반응|말할까|무슨 말|뭐라(고)? 할까|어떻게 말할까/,
    /will (they|he|she)/,
    /would (they|he|she)/,
    /do (they|he|she)/,
    /what will (they|he|she) say/,
  ]
  if (hasOtherSubject && hasPattern(joined, otherResponsePatterns)) {
    return 'other_person_response'
  }

  const selfDecisionPatterns = [
    /할까|해야 할까|해도 될까|할지 말지|가도 될까|보내도 될까/,
    /\bshould i\b|\bshall i\b|\bcan i\b|\bmay i\b/,
    /thinking about/,
    /not sure if i should/,
  ]
  if (hasPattern(joined, selfDecisionPatterns)) {
    return 'self_decision'
  }

  const nearTermOutcomePatterns = [
    /결과|성공|실패|붙을까|합격|될까/,
    /가능성|확률|전망/,
    /\boutcome\b|\bchance\b|\blikely\b|\bprobability\b/,
    /\bwill it\b/,
  ]
  if (hasPattern(joined, nearTermOutcomePatterns)) {
    return 'near_term_outcome'
  }

  return 'unknown'
}

// ============================================================
// GPT System Prompt
// ============================================================
function buildSystemPrompt(spreadListForPrompt: string): string {
  return `You are an expert tarot question router. Your task is to select the single best spread for the user's question.

## Core behavior
- Focus on user intent, not surface form.
- Handle Korean/English typos, no-spacing text, slang, and indirect wording.
- Choose the spread autonomously from the full list below.
- Do NOT force one spread based on one keyword.
- Prefer semantic fit over rigid keyword mapping.

## Intent distinctions (important)
- Self decision: "내가 할까/말까"
- Other person's response/action: "상대가 할까/올까/답할까"
- Meeting likelihood / near-term outcome
- Timing / when
- Reconciliation
- Inner feelings
- General insight

## Critical disambiguation
- Questions like "이차연이 나를 내일 만날까?" are about the OTHER person's near-term action, not self decision.
- Questions like "이차연이 나에게 무슨 말을 할까?" are also OTHER-person response, not self decision.
- If the subject is someone else (name + 이/가, 그사람이, 상대가), do not route to self-decision even if "할까" appears.
- If two options are explicitly compared (A vs B), prefer a comparison spread.
- If the question is mainly about "when", prefer timing-oriented spread.
- If uncertain, choose a broadly valid general spread.

## Available spreads
${spreadListForPrompt}

## Output format (JSON only)
{
  "themeId": "exact theme ID from list",
  "spreadId": "exact spread ID from list",
  "reason": "why this spread fits",
  "userFriendlyExplanation": "short user-facing explanation"
}

Return JSON only.`
}

// ============================================================
// Pattern Matching Corrections (Data-Driven)
// ============================================================
function findPatternMatch(questionVariants: string[], language: string): PatternMatch | null {
  for (const variant of questionVariants) {
    const examMapping = getExamInterviewMapping(variant, language)
    if (examMapping) {
      return {
        parsed: examMapping,
        priority: 0,
        matchedQuestion: variant,
      }
    }

    for (const mapping of PATTERN_MAPPINGS) {
      if (mapping.check(variant)) {
        return {
          parsed: {
            themeId: mapping.themeId,
            spreadId: mapping.targetSpread,
            reason: mapping.reason,
            userFriendlyExplanation:
              language === 'ko' ? mapping.koExplanation : mapping.enExplanation,
          },
          priority: mapping.priority,
          matchedQuestion: variant,
        }
      }
    }
  }

  return null
}

function buildQuestionVariants(question: string): string[] {
  const variants = prepareForMatching(question)
  const trimmed = variants.map((entry) => entry.trim()).filter(Boolean)
  const unique = Array.from(new Set(trimmed))
  return unique.slice(0, 6)
}

function formatQuestionForPrompt(
  questionVariants: string[],
  detectedIntent: TarotQuestionIntent
): string {
  const [raw, ...rest] = questionVariants
  const hintLine =
    detectedIntent !== 'unknown'
      ? `Intent hint (heuristic, non-binding): ${detectedIntent}`
      : 'Intent hint (heuristic, non-binding): unknown'
  if (rest.length === 0) {
    return `${hintLine}\n사용자 질문: "${raw}"`
  }
  return `${hintLine}\n사용자 질문(원문): "${raw}"\n정규화/보정 버전: ${rest.map((q) => `"${q}"`).join(', ')}`
}

function revalidateWithRecommendations(
  parsed: ParsedResult,
  question: string,
  language: string,
  spreadOptions: SpreadOption[]
): ParsedResult {
  const selectedExists = spreadOptions.some(
    (s) => s.themeId === parsed.themeId && s.id === parsed.spreadId
  )

  // Keep AI autonomy: if AI picked a valid spread, don't override it with recommender heuristics.
  if (selectedExists) {
    return parsed
  }

  const recommended = recommendSpreads(question, 3)
  if (!recommended.length) {
    return parsed
  }

  const top = recommended[0]
  logger.info(
    `[analyze-question] Invalid AI spread replaced by recommender: "${question}" -> ${top.themeId}/${top.spreadId} (was: ${parsed.themeId}/${parsed.spreadId})`
  )

  return {
    themeId: top.themeId,
    spreadId: top.spreadId,
    reason: top.reasonKo || top.reason,
    userFriendlyExplanation:
      language === 'ko'
        ? '질문 의도와 가장 가까운 스프레드로 조정했어요'
        : "Adjusted to the spread that best matches your question's intent.",
  }
}

function resolveDeterministicFallback(
  question: string,
  language: string,
  spreadOptions: SpreadOption[],
  questionVariants: string[] = []
): ParsedResult {
  const candidates = Array.from(
    new Set([question, ...questionVariants].map((q) => q.trim()))
  ).filter(Boolean)

  const ranked = candidates.flatMap((q) =>
    recommendSpreads(q, 3).map((rec) => ({
      ...rec,
      sourceQuestion: q,
    }))
  )

  const sorted = ranked.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore
    }
    // Prefer non-default general fallback when scores tie
    const aIsDefault = a.themeId === 'general-insight' && a.spreadId === 'past-present-future'
    const bIsDefault = b.themeId === 'general-insight' && b.spreadId === 'past-present-future'
    if (aIsDefault !== bIsDefault) {
      return aIsDefault ? 1 : -1
    }
    return 0
  })

  if (sorted.length > 0) {
    const top = sorted[0]
    return {
      themeId: top.themeId,
      spreadId: top.spreadId,
      reason: top.reasonKo || top.reason,
      userFriendlyExplanation:
        language === 'ko'
          ? '질문과 가장 가까운 기본 스프레드로 연결했어요'
          : 'Routed to the closest default spread for your question.',
    }
  }

  const defaultSpread =
    spreadOptions.find((s) => s.themeId === 'general-insight' && s.id === 'quick-reading') ||
    spreadOptions[0]

  if (defaultSpread) {
    return {
      themeId: defaultSpread.themeId,
      spreadId: defaultSpread.id,
      reason: language === 'ko' ? '기본 스프레드 추천' : 'Default spread recommendation',
      userFriendlyExplanation:
        language === 'ko'
          ? '질문을 해석할 수 있는 기본 스프레드로 연결했어요'
          : 'Routed to a default spread that can interpret your question.',
    }
  }

  return {
    themeId: 'general-insight',
    spreadId: 'past-present-future',
    reason: language === 'ko' ? '기본 흐름 확인' : 'General flow check',
    userFriendlyExplanation:
      language === 'ko' ? '기본 흐름 스프레드를 사용했어요' : 'Using general flow spread.',
  }
}

// ============================================================
// Main POST Handler
// ============================================================
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
      let source: AnalyzeSource = 'fallback'
      let fallbackReason: AnalyzeFallbackReason | null = null
      let hasStructuredLLMResult = false
      // GPT-4o-mini로 분석
      const systemPrompt = buildSystemPrompt(spreadListForPrompt)

      let responseText = ''
      let openAiFailed = false
      try {
        responseText = await callOpenAI([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: formatQuestionForPrompt(questionVariants, detectedIntent) },
        ])
      } catch (error) {
        openAiFailed = true
        fallbackReason =
          error instanceof Error && /OPENAI_API_KEY_MISSING/.test(error.message)
            ? 'auth_failed'
            : 'server_error'
        logger.warn('[analyze-question] OpenAI unavailable, using fallback routing', error)
      }

      try {
        if (responseText) {
          const maybeParsed = JSON.parse(responseText) as Partial<ParsedResult>
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
            }
            source = 'llm'
            fallbackReason = null
          } else {
            fallbackReason = 'parse_failed'
          }
        } else if (!openAiFailed) {
          fallbackReason = 'no_candidate'
        }
      } catch {
        fallbackReason = 'parse_failed'
      }

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
            path: `/tarot/${fallbackParsed.themeId}/${fallbackParsed.spreadId}?question=${encodeURIComponent(trimmedQuestion)}`,
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
          path: `/tarot/general-insight/past-present-future?question=${encodeURIComponent(trimmedQuestion)}`,
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
        path: `/tarot/${parsed.themeId}/${parsed.spreadId}?question=${encodeURIComponent(trimmedQuestion)}`,
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
