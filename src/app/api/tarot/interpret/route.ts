// src/app/api/tarot/interpret/route.ts
// Premium Tarot Interpretation API using Hybrid RAG

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { enforceBodySize, fetchWithRetry } from '@/lib/http'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { tarotInterpretRequestSchema } from '@/lib/api/zodValidation'
import { buildQuestionContextPrompt } from '@/lib/Tarot/questionFlow'
import { recordCounter, recordTiming } from '@/lib/metrics'
import {
  type CardInput,
  asRecord,
  buildActionableGuidance,
  buildAnchoredCardInsights,
  buildEmergencyFallbackResult,
  buildMinimumInsight,
  contextForPrompt,
  enforceInterpretationQuality,
  ensureActionAndTimeAnchor,
  ensureCardAnchoring,
  generateSimpleFallback,
  normalizeCombinations,
  normalizeInterpretRequestBody,
  normalizeQuestionContext,
  parseStructuredContextFromString,
  tryParseJsonCandidate,
} from './routeSupport'

const MAX_CARD_MEANING_LENGTH = 500
const OPENAI_TIMEOUT_MS = 40000
const OPENAI_MAX_RETRIES = 1
const LARGE_SPREAD_THRESHOLD = 8
const LARGE_SPREAD_BACKEND_TIMEOUT_MS = 12000
const LARGE_SPREAD_GPT_TIMEOUT_MS = 16000
const LARGE_SPREAD_GPT_MAX_TOKENS = 1600

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    let fallbackCards: CardInput[] = []
    let fallbackLanguage = 'ko'
    let fallbackQuestion: string | undefined
    let creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null = null
    const startedAt = Date.now()
    let interpretationSource: 'backend_rag' | 'gpt_fallback' | 'emergency_fallback' = 'backend_rag'

    try {
      recordCounter('tarot.interpret.request_total', 1, { stage: 'received' })

      const oversized = enforceBodySize(req, 256 * 1024)
      if (oversized) {
        recordCounter('tarot.interpret.request_total', 1, { stage: 'rejected_oversized' })
        return oversized
      }

      let rawBody: unknown
      try {
        rawBody = await req.json()
      } catch (parseErr) {
        logger.warn('[Tarot interpret] invalid JSON request body', {
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        })
        recordCounter('tarot.interpret.request_total', 1, { stage: 'invalid_json' })
        return NextResponse.json(
          { error: 'invalid_json_body' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
      const { body: normalizedBody, truncatedCount } = normalizeInterpretRequestBody(rawBody)
      if (truncatedCount > 0) {
        logger.info('[Tarot interpret] truncated oversized card meaning fields', {
          truncatedCount,
          max: MAX_CARD_MEANING_LENGTH,
        })
      }

      // Validate with Zod
      const validationResult = tarotInterpretRequestSchema.safeParse(normalizedBody)
      if (!validationResult.success) {
        logger.warn('[Tarot interpret] validation failed', {
          errors: validationResult.error.issues,
        })
        recordCounter('tarot.interpret.request_total', 1, { stage: 'validation_failed' })
        return NextResponse.json(
          {
            error: 'validation_failed',
            details: validationResult.error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const {
        categoryId,
        spreadId,
        spreadTitle,
        cards: validatedCards,
        userQuestion,
        language = 'ko',
        birthdate,
        moonPhase,
        includeAstrology = true,
        includeSaju = true,
        sajuContext,
        astroContext,
        questionContext,
      } = validationResult.data

      fallbackCards = validatedCards
      fallbackLanguage = language
      const normalizedQuestionContext = normalizeQuestionContext(questionContext)
      const enrichedUserQuestion = buildQuestionContextPrompt(
        userQuestion || '',
        normalizedQuestionContext,
        language
      )
      fallbackQuestion = enrichedUserQuestion

      const parsedSajuContext =
        includeSaju && sajuContext
          ? parseStructuredContextFromString(sajuContext, 'saju_context')
          : undefined
      const parsedAstroContext =
        includeAstrology && astroContext
          ? parseStructuredContextFromString(astroContext, 'astro_context')
          : undefined
      const promptSajuContext = includeSaju
        ? contextForPrompt(sajuContext, parsedSajuContext)
        : undefined
      const promptAstroContext = includeAstrology
        ? contextForPrompt(astroContext, parsedAstroContext)
        : undefined

      creditResult = await checkAndConsumeCredits('reading', 1, req)
      if (!creditResult.allowed) {
        recordCounter('tarot.interpret.request_total', 1, { stage: 'credit_denied' })
        return creditErrorResponse(creditResult)
      }

      // Call Python backend for Hybrid RAG interpretation (with fallback on connection failure)
      let interpretation = null
      const isLargeSpread = validatedCards.length >= LARGE_SPREAD_THRESHOLD
      const backendRequestOptions = isLargeSpread
        ? { timeout: LARGE_SPREAD_BACKEND_TIMEOUT_MS, retries: 0, retryDelay: 500 }
        : { timeout: 60000, retries: 2, retryDelay: 1200 }
      if (isLargeSpread) {
        logger.info('[Tarot interpret] large spread detected; using fast backend fallback policy', {
          spreadId,
          cardCount: validatedCards.length,
          timeout: backendRequestOptions.timeout,
          retries: backendRequestOptions.retries,
        })
      }
      try {
        const response = await apiClient.post(
          '/api/tarot/interpret',
          {
            category: categoryId,
            spread_id: spreadId,
            spread_title: spreadTitle,
            cards: validatedCards.map((c) => ({
              name: c.name,
              is_reversed: c.isReversed,
              position: c.position,
            })),
            user_question: enrichedUserQuestion,
            language,
            birthdate: includeAstrology ? birthdate : undefined,
            moon_phase: moonPhase,
            saju_context: parsedSajuContext,
            astro_context: parsedAstroContext,
          },
          backendRequestOptions
        )

        if (response.ok) {
          interpretation = response.data
        } else {
          logger.warn('[Tarot interpret] backend response not ok', {
            status: response.status,
            error: response.error,
          })
        }
      } catch (fetchError) {
        logger.warn('Backend connection failed, using fallback:', fetchError)
      }

      // Use backend response or GPT fallback
      let result
      if (interpretation && !(interpretation as Record<string, unknown>).error) {
        result = interpretation
        interpretationSource = 'backend_rag'
      } else {
        logger.warn('Backend unavailable, using GPT interpretation')
        recordCounter('tarot.interpret.fallback_total', 1, { from: 'backend_rag', to: 'gpt' })
        try {
          result = await generateGPTInterpretation(
            validatedCards,
            spreadTitle,
            language,
            enrichedUserQuestion,
            promptSajuContext,
            promptAstroContext
          )
          interpretationSource = 'gpt_fallback'
        } catch (gptErr) {
          logger.error('GPT interpretation failed:', gptErr)
          result = buildEmergencyFallbackResult(validatedCards, language, enrichedUserQuestion)
          interpretationSource = 'emergency_fallback'
          recordCounter('tarot.interpret.fallback_total', 1, { from: 'gpt', to: 'emergency' })
        }
      }

      result = enforceInterpretationQuality({
        rawResult: result,
        cards: validatedCards,
        language,
        userQuestion: enrichedUserQuestion,
      })

      if (
        interpretationSource === 'gpt_fallback' &&
        Boolean((result as { fallback?: boolean }).fallback)
      ) {
        interpretationSource = 'emergency_fallback'
      }

      const finalizedResult = {
        ...result,
        interpretation_source: interpretationSource,
      }

      const elapsedMs = Date.now() - startedAt
      recordCounter('tarot.interpret.source_total', 1, {
        source: interpretationSource,
        fallback: String(Boolean(finalizedResult.fallback)),
      })
      recordTiming('tarot.interpret.duration_ms', elapsedMs, {
        source: interpretationSource,
      })

      logger.info('[Tarot interpret] response finalized', {
        source: interpretationSource,
        cardCount: validatedCards.length,
        elapsedMs,
        fallback: Boolean(finalizedResult.fallback),
      })

      // ======== ?? ?? (??? ????) ========
      const session = context.session
      if (session?.user?.id) {
        try {
          await prisma.reading.create({
            data: {
              userId: session.user.id,
              type: 'tarot',
              title: `${spreadTitle} - ${validatedCards.map((c: CardInput) => c.nameKo || c.name).join(', ')}`,
              content: JSON.stringify({
                categoryId,
                spreadId,
                spreadTitle,
                cards: validatedCards.map((c: CardInput) => ({
                  name: c.name,
                  nameKo: c.nameKo,
                  isReversed: c.isReversed,
                  position: c.position,
                })),
                userQuestion,
              }),
            },
          })
        } catch (saveErr) {
          logger.warn('[Tarot API] Failed to save reading:', saveErr)
        }
      }

      const response = NextResponse.json(finalizedResult)
      return applyCreditResultCookies(response, creditResult)
    } catch (err: unknown) {
      captureServerError(err as Error, { route: '/api/tarot/interpret' })

      // Return fallback even on error
      logger.error('Tarot interpretation error:', err)
      const fallback = buildEmergencyFallbackResult(
        fallbackCards,
        fallbackLanguage,
        fallbackQuestion
      )
      const elapsedMs = Date.now() - startedAt
      const fallbackWithSource = {
        ...fallback,
        interpretation_source: 'emergency_fallback' as const,
      }
      recordCounter('tarot.interpret.source_total', 1, {
        source: 'emergency_fallback',
        fallback: 'true',
      })
      recordTiming('tarot.interpret.duration_ms', elapsedMs, {
        source: 'emergency_fallback',
      })
      logger.warn('[Tarot interpret] emergency fallback returned', {
        cardCount: fallbackCards.length,
        elapsedMs,
      })
      const response = NextResponse.json(fallbackWithSource, { status: HTTP_STATUS.OK })
      return applyCreditResultCookies(response, creditResult)
    }
  },
  createPublicStreamGuard({
    route: 'tarot/interpret',
    limit: 10,
    windowSeconds: 60,
  })
)

// GPT-4o-mini API ?? ?? (?? ???)
async function callGPT(
  prompt: string,
  maxTokens = 400,
  timeoutMs = OPENAI_TIMEOUT_MS
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
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
        messages: [
          {
            role: 'system',
            content:
              'Return a single valid JSON object only. Do not include markdown fences, comments, or trailing text.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.75,
        response_format: { type: 'json_object' },
      }),
    },
    {
      maxRetries: OPENAI_MAX_RETRIES,
      initialDelayMs: 700,
      maxDelayMs: 4000,
      timeoutMs,
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
      onRetry: (attempt, error, delayMs) => {
        logger.warn('[Tarot interpret] OpenAI retry scheduled', {
          attempt,
          delayMs,
          reason: error.message,
        })
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`OpenAI API error: ${response.status} ${errorText.slice(0, 280)}`)
  }

  // Read the body once as text to avoid stream-consumption issues on JSON parse fallback.
  const rawText = await response.text().catch(() => '')
  let data: { choices?: Array<{ message?: { content?: string } }> } | null = null
  try {
    data = JSON.parse(rawText) as { choices?: Array<{ message?: { content?: string } }> }
  } catch (parseErr) {
    logger.warn('[Tarot interpret] OpenAI JSON parse failed', {
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      preview: rawText.slice(0, 280),
    })
    throw new Error('OpenAI response parse failed')
  }

  return data?.choices?.[0]?.message?.content || ''
}

type PromptBudget = {
  overallGuide: string
  perCardGuide: string
  adviceGuide: string
  maxTokens: number
  timeoutMs: number
}

function getPromptBudget(cardCount: number, isKorean: boolean): PromptBudget {
  if (cardCount >= LARGE_SPREAD_THRESHOLD) {
    return isKorean
      ? {
          overallGuide: '180-300?',
          perCardGuide: '90-160?',
          adviceGuide: '120-180?',
          maxTokens: LARGE_SPREAD_GPT_MAX_TOKENS,
          timeoutMs: LARGE_SPREAD_GPT_TIMEOUT_MS,
        }
      : {
          overallGuide: '100-170 words',
          perCardGuide: '40-70 words',
          adviceGuide: '60-100 words',
          maxTokens: LARGE_SPREAD_GPT_MAX_TOKENS,
          timeoutMs: LARGE_SPREAD_GPT_TIMEOUT_MS,
        }
  }

  if (cardCount >= 5) {
    return isKorean
      ? {
          overallGuide: '320-520?',
          perCardGuide: '180-320?',
          adviceGuide: '140-220?',
          maxTokens: 2600,
          timeoutMs: 55000,
        }
      : {
          overallGuide: '180-300 words',
          perCardGuide: '90-150 words',
          adviceGuide: '90-130 words',
          maxTokens: 2600,
          timeoutMs: 55000,
        }
  }

  return isKorean
    ? {
        overallGuide: '500-850?',
        perCardGuide: '260-480?',
        adviceGuide: '160-260?',
        maxTokens: 3000,
        timeoutMs: OPENAI_TIMEOUT_MS,
      }
    : {
        overallGuide: '260-420 words',
        perCardGuide: '120-220 words',
        adviceGuide: '100-150 words',
        maxTokens: 3000,
        timeoutMs: OPENAI_TIMEOUT_MS,
      }
}

function truncatePromptContext(input: string | undefined, maxLength = 1200): string {
  if (!input) return ''
  const normalized = input.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}\n...[truncated]`
}

// GPT? ??? ?? ?? (??? ?? ?? ??) - ?? ????? ?? ???
async function generateGPTInterpretation(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string,
  sajuContext?: string,
  astroContext?: string
) {
  const isKorean = language === 'ko'
  const isLargeSpread = cards.length >= LARGE_SPREAD_THRESHOLD
  const budget = getPromptBudget(cards.length, isKorean)

  // ??? ?? ??
  const cardListText = cards
    .map((c, i) => {
      const name = isKorean && c.nameKo ? c.nameKo : c.name
      const pos = isKorean && c.positionKo ? c.positionKo : c.position
      const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || []
      return `${i + 1}. [${pos}] ${name}${c.isReversed ? '(???)' : ''} - ${keywords.slice(0, 3).join(', ')}`
    })
    .join('\n')

  let q = userQuestion || (isKorean ? '?? ??' : 'general reading')
  const compactSaju = truncatePromptContext(sajuContext)
  const compactAstro = truncatePromptContext(astroContext)
  const contextBlock = [compactSaju, compactAstro].filter(Boolean).join('\n')
  if (contextBlock) {
    q = `${q}\n${contextBlock}`
  }

  const cardExamples = isLargeSpread
    ? ''
    : cards
        .map((c, i) => {
          const pos = isKorean && c.positionKo ? c.positionKo : c.position
          const ordinal = isKorean
            ? `${i + 1}??`
            : i === 0
              ? 'First'
              : i === 1
                ? 'Second'
                : i === 2
                  ? 'Third'
                  : `${i + 1}th`
          return isKorean
            ? `    {
      "position": "${pos}",
      "interpretation": "${ordinal} ?? ?? (${budget.perCardGuide})"
    }`
            : `    {
      "position": "${pos}",
      "interpretation": "${ordinal} card interpretation (${budget.perCardGuide})"
    }`
        })
        .join(',\n')

  const outputSchemaKo = isLargeSpread
    ? `{
  "overall": "?? ??? (${budget.overallGuide})",
  "advice": "?? ?? (150-230?)"
}`
    : `{
  "overall": "?? ??? (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "advice": "?? ?? (${budget.adviceGuide})"
}`

  const outputSchemaEn = isLargeSpread
    ? `{
  "overall": "Overall message (${budget.overallGuide})",
  "advice": "Practical action steps (80-130 words)"
}`
    : `{
  "overall": "Overall message (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "advice": "Practical action steps (${budget.adviceGuide})"
}`

  // ?? ???? (?? ?? + ??? ?? + ??)
  const unifiedPrompt = isKorean
    ? `??? ??? ?? ?????. ??? ???? ???? ?????.

## ????: ${spreadTitle}
## ??: "${q}"

## ?? ??
${cardListText}

## ??
- ??? ?? ???, ??? ??? ?????.
- ??? ?? JSON???.
- ${
        isLargeSpread
          ? '?? ??????? cards ??? ???? ??, ?? ???? ?? ??? ??? ?????.'
          : `??? ?? ${cards.length}? ?? ??? ?????.`
      }

## ?? ?? (JSON)
?? ???? ??? JSON ??:
${outputSchemaKo}

## ?? ??
- ${isLargeSpread ? '?? ???? ?? ???? ????, ?? ??? 3??? ???' : '? ?? ??? ?? ?? + ?? ?? ?? + ?? ?? ???? ??'}
- ??? ??? ??/??/??? ???? ???
- ??? ?? ??, ?? ?? ??? ?? ??`
    : `You are a practical tarot reader. Be precise, warm, and concise.

## Spread: ${spreadTitle}
## Question: "${q}"

## Cards Drawn
${cardListText}

## IMPORTANT
- Answer the user question directly with concise, practical language.
- Output JSON only.
- ${
        isLargeSpread
          ? 'For large spreads, do not output cards array. Return only overall + advice.'
          : `Include all ${cards.length} card interpretations.`
      }

## Output Format (JSON)
Respond in this exact JSON format:
${outputSchemaEn}

## Rules
- ${
        isLargeSpread
          ? 'Advice must be concrete and step-based.'
          : 'Each card interpretation must include: position meaning + current situation link + one concrete action.'
      }
- For reversed cards, explain blockage/delay/internalization explicitly.
- Avoid generic platitudes; keep it actionable.
- Include at least one time anchor in each card insight (today/this week/within 7 days).`

  try {
    const result = await callGPT(unifiedPrompt, budget.maxTokens, budget.timeoutMs)

    const parsed = tryParseJsonCandidate(result)
    if (parsed) {
      const card_insights = isLargeSpread
        ? buildAnchoredCardInsights(cards, language, userQuestion)
        : cards.map((card, i) => {
            const parsedCards = Array.isArray(parsed.cards) ? parsed.cards : []
            const cardData = asRecord(parsedCards[i])
            let interpretation =
              typeof cardData.interpretation === 'string' ? cardData.interpretation : ''

            // ??? ?? ??? ???, ???/???/?? ??? ?? ?? ?? ???? ??
            if (!interpretation || interpretation.length < 80) {
              interpretation = ensureCardAnchoring(
                language,
                card,
                buildMinimumInsight(language, card),
                userQuestion
              )
            }

            const anchoredInterpretation = ensureActionAndTimeAnchor(
              language,
              ensureCardAnchoring(language, card, interpretation, userQuestion)
            )

            return {
              position: card.position,
              card_name: card.name,
              is_reversed: card.isReversed,
              interpretation: anchoredInterpretation,
              spirit_animal: null,
              chakra: null,
              element: null,
              shadow: null,
            }
          })

      return {
        overall_message: typeof parsed.overall === 'string' ? parsed.overall : '',
        card_insights,
        guidance:
          (typeof parsed.advice === 'string' && parsed.advice) ||
          buildActionableGuidance(language, userQuestion),
        affirmation: isKorean ? '?? ??? ??? ?? ??.' : 'Just be yourself today.',
        combinations: normalizeCombinations(parsed.combinations, cards, language),
        followup_questions: [],
        fallback: false,
      }
    }

    logger.warn('[Tarot interpret] GPT returned non-JSON content; using text fallback payload', {
      preview: result.slice(0, 280),
    })

    // JSON ?? ?? ? ?? ???? overall? ??
    return {
      overall_message: result,
      card_insights: buildAnchoredCardInsights(cards, language, userQuestion),
      guidance: isKorean ? '??? ???? ? ??????.' : 'Listen to the cards.',
      affirmation: isKorean ? '??? ???!' : 'You got this!',
      combinations: normalizeCombinations(undefined, cards, language),
      followup_questions: [],
      fallback: false,
    }
  } catch (error) {
    logger.error('GPT interpretation failed:', error)
    return generateSimpleFallback(cards, spreadTitle, language, userQuestion)
  }
}
