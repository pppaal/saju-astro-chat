import { NextRequest } from 'next/server'
import { initializeApiContext, createAuthenticatedGuard, extractLocale } from '@/lib/api/middleware'
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
  buildFortuneWithIcpOutputGuide,
  buildFortuneWithIcpSection,
} from '@/lib/prompts/fortuneWithIcp'

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

type MatrixHighlight = { layer?: number; keyword?: string; score?: number }
type MatrixSynergy = { description?: string; score?: number; layers?: number[] }

interface MatrixSnapshot {
  totalScore: number
  topLayers: Array<{ layer: number; score: number }>
  highlights: string[]
  synergies: string[]
}

function mapElementToWestern(
  element: string | undefined
): 'fire' | 'earth' | 'air' | 'water' | undefined {
  if (!element) {
    return undefined
  }
  const e = element.toLowerCase()
  if (e.includes('fire') || e.includes('화')) {
    return 'fire'
  }
  if (e.includes('earth') || e.includes('토')) {
    return 'earth'
  }
  if (e.includes('air') || e.includes('금')) {
    return 'air'
  }
  if (e.includes('water') || e.includes('수')) {
    return 'water'
  }
  return undefined
}

function normalizePlanetName(name: string): string {
  const key = name.toLowerCase()
  const mapping: Record<string, string> = {
    sun: 'Sun',
    moon: 'Moon',
    mercury: 'Mercury',
    venus: 'Venus',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn',
    uranus: 'Uranus',
    neptune: 'Neptune',
    pluto: 'Pluto',
  }
  return mapping[key] || name
}

function collectPlanetData(astro: AstroDataStructure | undefined): {
  planetSigns: Record<string, string>
  planetHouses: Record<string, number>
} {
  const planetSigns: Record<string, string> = {}
  const planetHouses: Record<string, number> = {}
  if (!astro || typeof astro !== 'object') {
    return { planetSigns, planetHouses }
  }

  const directPlanets = [
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ]
  for (const key of directPlanets) {
    const item = (astro as Record<string, unknown>)[key] as Record<string, unknown> | undefined
    if (!item || typeof item !== 'object') {
      continue
    }
    const pName = normalizePlanetName(key)
    const sign = typeof item.sign === 'string' ? item.sign : undefined
    const house = typeof item.house === 'number' ? item.house : Number(item.house)
    if (sign) {
      planetSigns[pName] = sign
    }
    if (Number.isFinite(house) && house >= 1 && house <= 12) {
      planetHouses[pName] = house
    }
  }

  return { planetSigns, planetHouses }
}

function buildTopLayers(highlights: MatrixHighlight[]): Array<{ layer: number; score: number }> {
  const grouped = new Map<number, number[]>()
  for (const item of highlights) {
    const layer = Number(item.layer || 0)
    const score = Number(item.score || 0)
    if (!layer || !score) {
      continue
    }
    if (!grouped.has(layer)) {
      grouped.set(layer, [])
    }
    grouped.get(layer)!.push(score)
  }

  return Array.from(grouped.entries())
    .map(([layer, scores]) => ({
      layer,
      score: Number((scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)).toFixed(2)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

function buildMatrixProfileSection(snapshot: MatrixSnapshot | null, lang: string): string {
  if (!snapshot) {
    return ''
  }

  const layerText = snapshot.topLayers.map((l) => `L${l.layer}:${l.score}`).join(', ') || 'none'
  const highlightText = snapshot.highlights.slice(0, 5).join(' | ') || 'none'
  const synergyText = snapshot.synergies.slice(0, 3).join(' | ') || 'none'

  if (lang === 'ko') {
    return [
      '[Destiny Matrix Profile Context]',
      `total_score=${snapshot.totalScore}`,
      `top_layers=${layerText}`,
      `highlights=${highlightText}`,
      `synergies=${synergyText}`,
      '응답 초반에 "Matrix snapshot:" 소제목으로 2-3문장으로 요약하고, 이후 기존 사주/점성/교차 해석을 이어가세요.',
    ].join('\n')
  }

  return [
    '[Destiny Matrix Profile Context]',
    `total_score=${snapshot.totalScore}`,
    `top_layers=${layerText}`,
    `highlights=${highlightText}`,
    `synergies=${synergyText}`,
    'Start with a short "Matrix snapshot:" section (2-3 sentences), then continue with the existing saju/astro/cross narrative.',
  ].join('\n')
}

async function fetchMatrixSnapshot(
  req: NextRequest,
  input: {
    birthDate: string
    birthTime: string
    gender: 'male' | 'female'
    lang: string
    astro: AstroDataStructure | undefined
  }
): Promise<MatrixSnapshot | null> {
  try {
    const { planetSigns, planetHouses } = collectPlanetData(input.astro)
    const dominantWesternElement = mapElementToWestern(
      ((input.astro as Record<string, unknown> | undefined)?.dominantElement as
        | string
        | undefined) ||
        ((input.astro as Record<string, unknown> | undefined)?.dominantWesternElement as
          | string
          | undefined)
    )

    const response = await fetch(new URL('/api/destiny-matrix', req.nextUrl.origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        gender: input.gender,
        lang: input.lang === 'ko' ? 'ko' : 'en',
        dominantWesternElement,
        planetSigns,
        planetHouses,
      }),
    })

    if (!response.ok) {
      return null
    }
    const data = (await response.json()) as {
      success?: boolean
      summary?: { totalScore?: number }
      highlights?: { strengths?: MatrixHighlight[]; cautions?: MatrixHighlight[] }
      synergies?: MatrixSynergy[]
    }
    if (!data?.success) {
      return null
    }

    const strengths = Array.isArray(data.highlights?.strengths)
      ? (data.highlights?.strengths ?? [])
      : []
    const cautions = Array.isArray(data.highlights?.cautions)
      ? (data.highlights?.cautions ?? [])
      : []
    const merged = [...strengths, ...cautions]
    const topLayers = buildTopLayers(merged)
    const highlights = merged
      .map((h) => `${h.keyword || 'n/a'}(${Number(h.score || 0).toFixed(1)})`)
      .slice(0, 5)
    const synergies = (Array.isArray(data.synergies) ? data.synergies : [])
      .map(
        (s) => `${s.description || 'synergy'}${s.score ? `(${Number(s.score).toFixed(1)})` : ''}`
      )
      .slice(0, 3)

    return {
      totalScore: Number(data.summary?.totalScore || 0),
      topLayers,
      highlights,
      synergies,
    }
  } catch (error) {
    logger.warn('[chat-stream] Matrix snapshot fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

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
    const matrixSnapshot = await fetchMatrixSnapshot(req, {
      birthDate: effectiveBirthDate,
      birthTime: effectiveBirthTime,
      gender: effectiveGender,
      lang,
      astro: finalAstro,
    })
    const matrixProfileSection = buildMatrixProfileSection(matrixSnapshot, lang)

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

    const fortuneIcpSection = buildFortuneWithIcpSection(counselingBrief, lang)
    const fortuneGuide = buildFortuneWithIcpOutputGuide(lang)

    // Build prompt - FULL analysis with all advanced engines
    const chatPrompt = [
      counselorSystemPrompt(lang),
      fortuneGuide,
      `Name: ${name || 'User'}`,
      themeContext,
      fortuneIcpSection,
      '',
      // 기본 사주/점성 데이터
      contextSections.v3Snapshot
        ? `[사주/점성 기본 데이터]\n${contextSections.v3Snapshot.slice(0, 5000)}`
        : '',
      matrixProfileSection ? `\n${matrixProfileSection}` : '',
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
