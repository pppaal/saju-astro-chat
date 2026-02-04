import { NextRequest, NextResponse } from 'next/server'
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware'
import { createTransformedSSEStream, createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import { sanitizeLocaleText } from '@/lib/destiny-map/sanitize'
import { maskTextWithName } from '@/lib/security'
import { enforceBodySize } from '@/lib/http'
import { jsonErrorResponse } from '@/lib/api/errorHandler'
import { isValidDate, isValidTime, isValidLatitude, isValidLongitude } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { parseRequestBody } from '@/lib/api/requestParser'
import { HTTP_STATUS } from '@/lib/constants/http'

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
import type { SajuDataStructure, AstroDataStructure } from './lib/types'
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  // Declare context at function scope so it's accessible in catch block for credit refund
  let context: Awaited<ReturnType<typeof initializeApiContext>>['context'] | null = null

  try {
    const oversized = enforceBodySize(req, 256 * 1024) // 256KB for large chart data
    if (oversized) {
      return oversized
    }

    // Apply middleware: authentication + rate limiting + credit consumption
    const guardOptions = createAuthenticatedGuard({
      route: 'destiny-map-chat-stream',
      limit: 60,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'reading',
      creditAmount: 1,
    })

    const { context: ctx, error } = await initializeApiContext(req, guardOptions)
    context = ctx
    if (error) {
      return error
    }

    const userId = context.userId

    // Parse and validate request body using Zod
    const body = await parseRequestBody<Record<string, unknown>>(req, {
      context: 'Destiny-map Chat-stream',
    })
    if (!body) {
      return NextResponse.json({ error: 'invalid_body' }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const validation = validateDestinyMapRequest(body)
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[chat-stream] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        { error: 'Validation failed', details: errors, issues: validation.error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
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
    } = validated

    // ========================================
    // 🔄 AUTO-LOAD: Try to load birth info from user profile if missing
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
      return jsonErrorResponse('Invalid or missing birthDate')
    }
    if (!effectiveBirthTime || !isValidTime(effectiveBirthTime)) {
      return jsonErrorResponse('Invalid or missing birthTime')
    }
    if (!isValidLatitude(effectiveLatitude)) {
      return jsonErrorResponse('Invalid or missing latitude')
    }
    if (!isValidLongitude(effectiveLongitude)) {
      return jsonErrorResponse('Invalid or missing longitude')
    }

    // ========================================
    // 🧠 LONG-TERM MEMORY: Load PersonaMemory and recent session summaries
    // ========================================
    let personaMemoryContext = ''
    let recentSessionSummaries = ''

    if (userId) {
      const memoryResult = await loadPersonaMemory(userId, theme, lang)
      personaMemoryContext = memoryResult.personaMemoryContext
      recentSessionSummaries = memoryResult.recentSessionSummaries
    }

    // ========================================
    // 📊 COMPUTE CHART DATA: Saju, Astro, Transits (with caching)
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

    // Messages are already validated by Zod as ChatMessage[]
    const trimmedHistory = clampMessages(messages)

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
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
          },
        }
      )
    }

    // ========================================
    // 📝 BUILD CONTEXT SECTIONS: Using modular context builder
    // ========================================
    const contextSections = buildContextSections({
      saju: finalSaju,
      astro: finalAstro,
      advancedAstro: advancedAstro as Partial<CombinedResult> | undefined,
      natalChartData,
      currentTransits,
      birthDate: effectiveBirthDate,
      gender: effectiveGender,
      theme,
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

    // Theme descriptions for context
    const themeDescriptions: Record<string, { ko: string; en: string }> = {
      love: { ko: '연애/결혼/배우자 관련 질문', en: 'Love, marriage, partner questions' },
      career: { ko: '직업/취업/이직/사업 관련 질문', en: 'Career, job, business questions' },
      wealth: { ko: '재물/투자/재정 관련 질문', en: 'Money, investment, finance questions' },
      health: { ko: '건강/체력/웰빙 관련 질문', en: 'Health, wellness questions' },
      family: { ko: '가족/인간관계 관련 질문', en: 'Family, relationships questions' },
      today: { ko: '오늘의 운세/조언', en: "Today's fortune and advice" },
      month: { ko: '이번 달 운세/조언', en: "This month's fortune" },
      year: { ko: '올해 운세/연간 예측', en: "This year's fortune" },
      life: { ko: '인생 전반/종합 상담', en: 'Life overview, general counseling' },
      chat: { ko: '자유 주제 상담', en: 'Free topic counseling' },
    }
    const themeDesc = themeDescriptions[theme] || themeDescriptions.chat
    const themeContext =
      lang === 'ko'
        ? `현재 상담 테마: ${theme} (${themeDesc.ko})\n이 테마에 맞춰 답변해주세요.`
        : `Current theme: ${theme} (${themeDesc.en})\nFocus your answer on this theme.`

    // Build prompt - FULL analysis with all advanced engines
    const chatPrompt = [
      counselorSystemPrompt(lang),
      `Name: ${name || 'User'}`,
      themeContext,
      '',
      // 기본 사주/점성 데이터
      contextSections.v3Snapshot
        ? `[사주/점성 기본 데이터]\n${contextSections.v3Snapshot.slice(0, 5000)}`
        : '',
      // 🔮 고급 분석 섹션들 (모듈화된 빌더 사용)
      contextSections.timingScoreSection ? `\n${contextSections.timingScoreSection}` : '',
      contextSections.enhancedAnalysisSection ? `\n${contextSections.enhancedAnalysisSection}` : '',
      contextSections.daeunTransitSection ? `\n${contextSections.daeunTransitSection}` : '',
      contextSections.advancedAstroSection ? `\n${contextSections.advancedAstroSection}` : '',
      contextSections.tier4AdvancedSection ? `\n${contextSections.tier4AdvancedSection}` : '',
      contextSections.pastAnalysisSection ? `\n${contextSections.pastAnalysisSection}` : '',
      contextSections.lifePredictionSection ? `\n${contextSections.lifePredictionSection}` : '',
      // 🧠 장기 기억 - 이전 상담 컨텍스트
      longTermMemorySection ? `\n${longTermMemorySection}` : '',
      // 📊 인생 예측 컨텍스트 (프론트엔드에서 전달된 경우)
      predictionSection ? `\n${predictionSection}` : '',
      // 📜 대화 히스토리
      contextSections.historyText ? `\n대화:\n${contextSections.historyText}` : '',
      `\n질문: ${contextSections.userQuestion}`,
    ]
      .filter(Boolean)
      .join('\n')

    // Get session_id from header for RAG cache
    const sessionId = req.headers.get('x-session-id') || undefined

    // Call backend streaming endpoint using apiClient
    const streamResult = await apiClient.postSSEStream(
      '/ask-stream',
      {
        theme,
        prompt: chatPrompt,
        locale: lang,
        // Pass pre-computed chart data if available (instant response)
        saju: finalSaju || undefined,
        astro: finalAstro || undefined,
        // Advanced astrology features (draconic, harmonics, progressions, etc.)
        advanced_astro: advancedAstro || undefined,
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
          ? 'AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
          : 'Could not connect to AI service. Please try again.'

      return createFallbackSSEStream({
        content: fallback,
        done: true,
        'X-Fallback': '1',
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
      },
    })
  } catch (err: unknown) {
    const message = 'Internal Server Error'
    logger.error('[Chat-Stream API error]', err)

    // Refund credits on unexpected errors
    if (context?.refundCreditsOnError) {
      await context.refundCreditsOnError(err instanceof Error ? err.message : 'Unknown error', {
        route: 'destiny-map-chat-stream',
      })
    }

    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
