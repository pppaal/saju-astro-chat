import { NextRequest } from 'next/server'
import {
  initializeApiContext,
  createAuthenticatedGuard,
  extractLocale,
  type MiddlewareOptions,
} from '@/lib/api/middleware'
import { createTransformedSSEStream, createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import { sanitizeLocaleText } from '@/lib/destiny-map/sanitize'
import { maskTextWithName } from '@/lib/security'
import { enforceBodySize } from '@/lib/http'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { isValidDate, isValidTime, isValidLatitude, isValidLongitude } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { parseRequestBody } from '@/lib/api/requestParser'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import {
  buildFortuneWithIcpSection,
} from '@/lib/prompts/fortuneWithIcp'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  formatCounselorEvidencePacket,
} from '@/lib/destiny-matrix/counselorEvidence'
import { persistDestinyPredictionSnapshot } from '@/lib/destiny-matrix/predictionSnapshot'

// Local modules
import { clampMessages, counselorSystemPrompt, loadPersonaMemory } from './lib'
import { loadUserProfile, type ProfileLoadResult } from './lib/profileLoader'
import { validateDestinyMapRequest } from './lib/validation'
import { calculateChartData } from './lib/chart-calculator'
import {
  buildContextSections,
  buildPredictionSection,
  buildLongTermMemorySection,
} from './lib/context-builder'
import {
  analyzeCounselorQuestion,
  buildCounselingStructureGuide,
  describeQuestionAnalysis,
  mapFocusDomainToTheme,
} from './lib/focusDomain'
import {
  assembleFinalPrompt,
} from './builders/promptAssembly'
import type { SajuDataStructure, AstroDataStructure } from './lib/types'
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine'
import {
  buildCompactPromptSections,
  buildMatrixProfileSection,
  mapFocusDomainToPromptTheme,
} from './routePromptSupport'
import {
  encodeCounselorUiEvidence,
  ensureAdvancedAstroData,
  fetchMatrixSnapshot,
} from './routeMatrixSnapshot'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const GUEST_CHAT_RATE_LIMIT = {
  limit: 12,
  windowSeconds: 60,
} as const

function isCounselorStrictMatrixEnabled(): boolean {
  const raw = process.env.COUNSELOR_STRICT_MATRIX?.trim().toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  return process.env.NODE_ENV !== 'test'
}

export async function POST(req: NextRequest) {
  // Declare context at function scope so it's accessible in catch block for credit refund
  let context: Awaited<ReturnType<typeof initializeApiContext>>['context'] | null = null
  let isGuestMode = true

  try {
    const oversized = enforceBodySize(req, 256 * 1024) // 256KB for large chart data
    if (oversized) {
      return oversized
    }

    // Build both guard presets up front.
    // Logged-in users keep the existing auth + credit policy.
    const authedGuardOptions = createAuthenticatedGuard({
      route: 'destiny-map-chat-stream',
      limit: 60,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'reading',
      creditAmount: 1,
    })

    const guestGuardOptions: MiddlewareOptions = {
      route: 'destiny-map-chat-stream-guest',
      rateLimit: {
        limit: GUEST_CHAT_RATE_LIMIT.limit,
        windowSeconds: GUEST_CHAT_RATE_LIMIT.windowSeconds,
      },
    }

    let prefersAuthedGuard = false
    try {
      const session = await getServerSession(authOptions)
      prefersAuthedGuard = Boolean(session?.user)
    } catch {
      prefersAuthedGuard = false
    }

    let initialized = await initializeApiContext(
      req,
      prefersAuthedGuard ? authedGuardOptions : guestGuardOptions
    )

    // If auth precheck was stale, fall back to guest mode instead of hard-blocking.
    if (prefersAuthedGuard && initialized.error && initialized.error.status === 401) {
      initialized = await initializeApiContext(req, guestGuardOptions)
    }

    const { context: ctx, error } = initialized
    context = ctx
    if (error) {
      return error
    }
    isGuestMode = !context.userId

    const userId = context.userId

    // Parse and validate request body using Zod
    const body = await parseRequestBody<Record<string, unknown>>(req, {
      context: 'Destiny-map Chat-stream',
    })
    if (!body) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }

    const validation = validateDestinyMapRequest(body)
    if (!validation.success) {
      logger.warn('[chat-stream] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }

    const validated = validation.data
    const {
      name,
      birthDate,
      birthTime,
      gender,
      latitude,
      longitude,
      theme,
      lang,
      messages,
      saju,
      astro,
      advancedAstro,
      predictionContext,
      userContext,
      cvText,
      counselingBrief,
    } = validated
    const trimmedHistory = clampMessages(messages)
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
    const questionAnalysis = analyzeCounselorQuestion({
      lastUserMessage: lastUser?.content,
      theme,
    })
    const inferredTheme = mapFocusDomainToTheme(questionAnalysis.primaryDomain)
    const effectiveTheme = theme === 'chat' ? inferredTheme : theme

    // ========================================
    // AUTO-LOAD: Try to load birth info from user profile if missing
    // ========================================
    let effectiveBirthDate = birthDate || ''
    let effectiveBirthTime = birthTime || ''
    let effectiveLatitude = latitude || 0
    let effectiveLongitude = longitude || 0
    let effectiveGender = gender
    let effectiveSaju = saju
    let effectiveAstro = astro

    const needsProfileLoad = userId && (!birthDate || !birthTime || !latitude || !longitude)

    if (needsProfileLoad) {
      try {
        const profileResult: ProfileLoadResult = await loadUserProfile(
          userId,
          birthDate,
          birthTime,
          latitude,
          longitude,
          saju as SajuDataStructure | undefined,
          astro as AstroDataStructure | undefined
        )
        if (profileResult.saju) {
          effectiveSaju = profileResult.saju
        }
        if (profileResult.astro) {
          effectiveAstro = profileResult.astro
        }
        if (profileResult.birthDate) {
          effectiveBirthDate = profileResult.birthDate
        }
        if (profileResult.birthTime) {
          effectiveBirthTime = profileResult.birthTime
        }
        if (profileResult.latitude) {
          effectiveLatitude = profileResult.latitude
        }
        if (profileResult.longitude) {
          effectiveLongitude = profileResult.longitude
        }
        if (profileResult.gender) {
          effectiveGender = profileResult.gender as 'male' | 'female'
        }
      } catch (profileError) {
        logger.warn('[chat-stream] Failed to load user profile, proceeding with provided data', {
          userId,
          error: profileError instanceof Error ? profileError.message : 'Unknown error',
        })
      }
    }

    // Validate effective values
    if (!effectiveBirthDate || !isValidDate(effectiveBirthDate)) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_DATE,
        message: 'Invalid or missing birthDate',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }
    if (!effectiveBirthTime || !isValidTime(effectiveBirthTime)) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_TIME,
        message: 'Invalid or missing birthTime',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }
    if (!isValidLatitude(effectiveLatitude)) {
      return createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid or missing latitude',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }
    if (!isValidLongitude(effectiveLongitude)) {
      return createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid or missing longitude',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }

    // ========================================
    // LONG-TERM MEMORY: Load PersonaMemory and recent session summaries
    // ========================================
    let personaMemoryContext = ''
    let recentSessionSummaries = ''

    if (userId) {
      const memoryResult = await loadPersonaMemory(userId, effectiveTheme, lang)
      personaMemoryContext = memoryResult.personaMemoryContext
      recentSessionSummaries = memoryResult.recentSessionSummaries
    }

    // ========================================
    // COMPUTE CHART DATA: Saju, Astro, Transits (with caching)
    // ========================================
    const chartResult = await calculateChartData(
      {
        birthDate: effectiveBirthDate,
        birthTime: effectiveBirthTime,
        gender: effectiveGender,
        latitude: effectiveLatitude,
        longitude: effectiveLongitude,
      },
      effectiveSaju as SajuDataStructure | undefined,
      effectiveAstro as AstroDataStructure | undefined
    )

    const finalSaju = chartResult.saju
    const finalAstro = chartResult.astro
    const { natalChartData, currentTransits } = chartResult
    const enrichedAdvancedAstro = await ensureAdvancedAstroData({
      name,
      birthDate: effectiveBirthDate,
      birthTime: effectiveBirthTime,
      gender: effectiveGender,
      latitude: effectiveLatitude,
      longitude: effectiveLongitude,
      theme: effectiveTheme,
      advancedAstro: advancedAstro as Partial<CombinedResult> | undefined,
    })

    // Safety check
    if (lastUser && containsForbidden(lastUser.content)) {
      const encoder = new TextEncoder()
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${safetyMessage(lang)}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Guest-Mode': isGuestMode ? '1' : '0',
          },
        }
      )
    }

    // ========================================
    // BUILD CONTEXT SECTIONS: Using modular context builder
    // ========================================
    const contextSections = buildContextSections({
      saju: finalSaju,
      astro: finalAstro,
      advancedAstro: enrichedAdvancedAstro,
      natalChartData,
      currentTransits,
      birthDate: effectiveBirthDate,
      gender: effectiveGender,
      theme: effectiveTheme,
      lang,
      trimmedHistory,
      lastUserMessage: lastUser?.content,
    })

    const predictionSection = buildPredictionSection(predictionContext, lang)
    const longTermMemorySection = buildLongTermMemorySection(
      personaMemoryContext,
      recentSessionSummaries,
      lang
    )
    const matrixSnapshot = await fetchMatrixSnapshot({
      birthDate: effectiveBirthDate,
      birthTime: effectiveBirthTime,
      gender: effectiveGender,
      lang,
      saju: finalSaju,
      astro: finalAstro,
      natalChartData,
      advancedAstro: enrichedAdvancedAstro,
      currentTransits,
      theme: effectiveTheme,
      focusDomain: questionAnalysis.primaryDomain,
    })
    if (isCounselorStrictMatrixEnabled() && !matrixSnapshot) {
      logger.error('[chat-stream] Matrix snapshot unavailable (strict mode)', {
        userId: userId || 'guest',
        theme: effectiveTheme,
        lang,
      })
      if (context?.refundCreditsOnError) {
        await context.refundCreditsOnError('Matrix snapshot unavailable in strict mode', {
          route: 'destiny-map-chat-stream',
          stage: 'matrix-snapshot',
          strictMode: true,
        })
      }
      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message:
          lang === 'ko'
            ? '?? ???? ???? ???? ?? ??? ??????. ?? ? ?? ??? ???.'
            : 'Counseling stopped because the shared matrix snapshot is unavailable. Please try again.',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
        headers: {
          'X-Matrix-Strict': '1',
          'X-Matrix-Snapshot': 'missing',
        },
      })
    }
    const coreCounselorPacket = matrixSnapshot?.core?.counselorEvidence || null
    const coreFocusDomain =
      coreCounselorPacket?.focusDomain || questionAnalysis.primaryDomain || null
    const promptTheme = mapFocusDomainToPromptTheme(coreFocusDomain, effectiveTheme)
    const sessionId = req.headers.get('x-session-id') || undefined
    const canonicalCounselorSection = formatCounselorEvidencePacket(
      coreCounselorPacket as Parameters<typeof formatCounselorEvidencePacket>[0],
      lang === 'ko' ? 'ko' : 'en'
    )
    const matrixProfileSection = buildMatrixProfileSection(matrixSnapshot, lang, promptTheme)
    const counselorUiEvidence = encodeCounselorUiEvidence(matrixSnapshot, lang)
    const predictionPacket = coreCounselorPacket as
      | (typeof coreCounselorPacket & {
          canonicalBrief?: {
            topDecisionId?: string
            topDecisionAction?: string
            topDecisionLabel?: string
          }
          topTimingWindow?: {
            window?: import('@/lib/destiny-matrix/core/logging').DestinyTimingWindow
            timingGranularity?: import('@/lib/destiny-matrix/core/logging').DestinyTimingGranularity
            precisionReason?: string
            timingConflictMode?: import('@/lib/destiny-matrix/core/logging').DestinyTimingConflictMode
            timingConflictNarrative?: string
            readinessScore?: number
            triggerScore?: number
            convergenceScore?: number
            timingReliabilityScore?: number
            timingReliabilityBand?: import('@/lib/destiny-matrix/core/logging').DestinyReliabilityBand
          }
          verdictLead?: string
        })
      | null
    const predictionId = await persistDestinyPredictionSnapshot({
      userId,
      service: 'counselor',
      lang: lang === 'ko' ? 'ko' : 'en',
      theme: promptTheme,
      sessionId,
      questionText: lastUser?.content,
      focusDomain: predictionPacket?.focusDomain,
      actionFocusDomain: predictionPacket?.actionFocusDomain,
      phase: predictionPacket?.strategyBrief?.overallPhase,
      phaseLabel: predictionPacket?.strategyBrief?.overallPhaseLabel,
      topDecisionId: predictionPacket?.canonicalBrief?.topDecisionId,
      topDecisionAction: predictionPacket?.canonicalBrief?.topDecisionAction,
      topDecisionLabel: predictionPacket?.canonicalBrief?.topDecisionLabel,
      timingWindow: predictionPacket?.topTimingWindow?.window,
      timingGranularity: predictionPacket?.topTimingWindow?.timingGranularity,
      precisionReason: predictionPacket?.topTimingWindow?.precisionReason,
      timingConflictMode: predictionPacket?.topTimingWindow?.timingConflictMode,
      timingConflictNarrative: predictionPacket?.topTimingWindow?.timingConflictNarrative,
      readinessScore: predictionPacket?.topTimingWindow?.readinessScore,
      triggerScore: predictionPacket?.topTimingWindow?.triggerScore,
      convergenceScore: predictionPacket?.topTimingWindow?.convergenceScore,
      timingReliabilityScore: predictionPacket?.topTimingWindow?.timingReliabilityScore,
      timingReliabilityBand: predictionPacket?.topTimingWindow?.timingReliabilityBand,
      predictionClaim: predictionPacket?.verdictLead || canonicalCounselorSection,
    })
    const questionAnalysisSection = describeQuestionAnalysis(
      questionAnalysis,
      lang === 'ko' ? 'ko' : 'en'
    )
    const counselingStructureGuide = buildCounselingStructureGuide(
      questionAnalysis,
      lang === 'ko' ? 'ko' : 'en'
    )

    const themeDescriptions: Record<string, { ko: string; en: string }> = {
      love: { ko: '??/???/?? ??', en: 'Love, marriage, partner questions' },
      career: { ko: '???/??/?? ??', en: 'Career, job, business questions' },
      wealth: { ko: '??/??/? ?? ??', en: 'Money, investment, finance questions' },
      health: { ko: '??/??/?? ??', en: 'Health, wellness questions' },
      family: { ko: '??/???? ??', en: 'Family, relationships questions' },
      today: { ko: '?? ?? ??', en: "Today's fortune and advice" },
      month: { ko: '?? ? ?? ??', en: "This month's fortune" },
      year: { ko: '?? ?? ??', en: "This year's fortune" },
      life: { ko: '?? ??/?? ??', en: 'Life overview, general counseling' },
      chat: { ko: '?? ?? ??', en: 'Free topic counseling' },
    }
    const themeDesc = themeDescriptions[promptTheme] || themeDescriptions.chat
    const themeContext =
      lang === 'ko'
        ? [
            `?? ?? ?? ??: ${effectiveTheme}`,
            coreFocusDomain ? `?? ?? ?? ???: ${coreFocusDomain}` : '',
            `?? ?? ?: ${promptTheme} (${themeDesc.ko})`,
            '??? ?? ???, ?? ??? ?? ??? ??? ?? ?????.',
          ]
            .filter(Boolean)
            .join('\n')
        : [
            `Requested theme: ${effectiveTheme}`,
            coreFocusDomain ? `Current core focus domain: ${coreFocusDomain}` : '',
            `Primary answer track: ${promptTheme} (${themeDesc.en})`,
            'Answer the question first and prioritize evidence aligned with the core focus.',
          ]
            .filter(Boolean)
            .join('\n')

    const fortuneIcpSection = buildFortuneWithIcpSection(counselingBrief, lang)

    const responseDensityContract =
      lang === 'ko'
        ? [
            '[Response Contract: Projection-first]',
            '- ? 1~2???? ??? ?? ????.',
            '- ???? ??? ? ??? ????: "## ?? ?", "## ??? ??", "## ???? ??", "## ??", "## ???? ???".',
            '- ??? ???? ?? ?? ???? ???.',
            '- ? ???? 2~4??? ??, ?? ??? ?? ???.',
            '- "??? ??"??? structure_detail? structure_driver? ?? ????, summary? ???? ?????.',
            '- "???? ??"??? timing_detail, timing_driver, timing_counterweight, timing_next? ?? ???? readiness/trigger/convergence? ???? ?? ?????.',
            '- "??"??? action_detail? action_next? ?? ????, ?? ?? ? ??? ??? ? ??? 2~3???? ??? ????.',
            '- "???? ???"??? risk_detail? risk_counterweight? ?? ????, ??·???·?? ???? ??? ????.',
            '- ?? ??? ??? ??? ?? ???? ?????.',
            '- ?? ??? ???? ??, ? ???? ??? ?? ??? ?????.',
            '- projection summary? ??? ?? ????? ??, detail/driver/counterweight/next lines? ?? ?????.',
            '- ??? ??, ???, ?? ??? ?????.',
            '- core phase, projection, cautions? ?? ?? ?? ?? ???.',
            '- ? ??? 650~1100? ??? ?????.',
          ].join('\n')
        : [
            '[Response Contract: Projection-first]',
            '- Answer the user question directly within the first two sentences.',
            '- Use headings in this exact order: "## Direct Answer", "## Structure and Situation", "## Timing and Tension", "## Action Plan", "## Risk and Recheck".',
            '- Prefer short paragraphs over bullet dumping.',
            '- Keep each section to 2-4 sentences and do not mix section roles.',
            '- In "Structure and Situation", use structure_detail and structure_driver first; use summary only as backup.',
            '- In "Timing and Tension", use timing_detail, timing_driver, timing_counterweight, and timing_next first; translate readiness, trigger, convergence, and timing conflict into natural language.',
            '- In "Action Plan", use action_detail and action_next first, then state the next move in 2-3 assertive sentences.',
            '- In "Risk and Recheck", use risk_detail and risk_counterweight first, then state overreach, persistence, and verification risk clearly.',
            '- Translate technical signals into natural language instead of dumping jargon.',
            '- Do not repeat sentences across sections; each paragraph must add a new piece of information.',
            '- Treat projection summaries as fallback only; prefer detail/driver/counterweight/next lines.',
            '- Avoid generic encouragement and abstract self-help phrasing.',
            '- Final verdict must align with core phase / top claims / cautions.',
            '- Keep total length around 170-280 words.',
          ].join('\n')

    const compactSections = buildCompactPromptSections({
      contextSections,
      longTermMemorySection,
      predictionSection,
      theme: promptTheme,
    })

    const baseContext = [
      responseDensityContract,
      `Name: ${name || 'User'}`,
      questionAnalysisSection,
      counselingStructureGuide,
      canonicalCounselorSection,
      themeContext,
      fortuneIcpSection,
      matrixProfileSection,
    ]
      .filter(Boolean)
      .join('\n\n')

    const chatPrompt = assembleFinalPrompt({
      systemPrompt: counselorSystemPrompt(lang),
      baseContext,
      memoryContext: '',
      sections: compactSections,
      messages: trimmedHistory.filter((m) => m.role !== 'system'),
      userQuestion: contextSections.userQuestion,
    })
    // Call backend streaming endpoint using apiClient
    const streamResult = await apiClient.postSSEStream(
      '/ask-stream',
      {
        theme: promptTheme,
        prompt: chatPrompt,
        locale: lang,
        // Pass pre-computed chart data if available (instant response)
        saju: finalSaju || undefined,
        astro: finalAstro || undefined,
        // Advanced astrology features (draconic, harmonics, progressions, etc.)
        advanced_astro: enrichedAdvancedAstro || undefined,
        // Fallback: Pass birth info for backend to compute if needed
        birth: {
          date: effectiveBirthDate,
          time: effectiveBirthTime,
          gender: effectiveGender,
          lat: effectiveLatitude,
          lon: effectiveLongitude,
        },
        // Conversation history for context-aware responses
        history: trimmedHistory.filter((m) => m.role !== 'system'),
        // Session ID for RAG cache
        session_id: sessionId,
        // Premium: user context for returning users
        user_context: userContext || undefined,
        // CV/Resume text for career-related questions
        cv_text: cvText || undefined,
      },
      { timeout: 60000 }
    )

    if (!streamResult.ok) {
      logger.error('[DestinyMapChatStream] Backend error:', {
        status: streamResult.status,
        error: streamResult.error,
      })

      // Refund credits on backend failure
      if (context.refundCreditsOnError) {
        await context.refundCreditsOnError(`Backend stream error: ${streamResult.status}`, {
          route: 'destiny-map-chat-stream',
          status: streamResult.status,
        })
      }

      const fallback =
        lang === 'ko'
          ? 'AI ???? ??? ? ????. ?? ? ?? ??? ???.'
          : 'Could not connect to AI service. Please try again.'

      return createFallbackSSEStream({
        content: fallback,
        done: true,
        'X-Fallback': '1',
        ...(counselorUiEvidence ? { 'X-Counselor-Evidence': counselorUiEvidence } : {}),
        ...(predictionId ? { 'X-Destiny-Prediction-Id': predictionId } : {}),
        'X-Guest-Mode': isGuestMode ? '1' : '0',
      })
    }

    // Relay the stream from backend to frontend with sanitization
    return createTransformedSSEStream({
      source: streamResult.response,
      transform: (chunk) => {
        const masked = maskTextWithName(sanitizeLocaleText(chunk, lang), name)
        return masked
      },
      route: 'DestinyMapChatStream',
      additionalHeaders: {
        'X-Fallback': streamResult.response.headers.get('x-fallback') || '0',
        ...(counselorUiEvidence ? { 'X-Counselor-Evidence': counselorUiEvidence } : {}),
        ...(predictionId ? { 'X-Destiny-Prediction-Id': predictionId } : {}),
        'X-Guest-Mode': isGuestMode ? '1' : '0',
      },
    })
  } catch (err: unknown) {
    logger.error('[Chat-Stream API error]', err)

    // Refund credits on unexpected errors
    if (context?.refundCreditsOnError) {
      await context.refundCreditsOnError(err instanceof Error ? err.message : 'Unknown error', {
        route: 'destiny-map-chat-stream',
      })
    }

    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'destiny-map/chat-stream',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}
