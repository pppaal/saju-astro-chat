import { NextRequest, NextResponse } from 'next/server'
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { logger } from '@/lib/logger'
import {
  calculateFusionCompatibility,
  type FusionCompatibilityResult,
} from '@/lib/compatibility/compatibilityFusion'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import { performExtendedAstrologyAnalysis } from '@/lib/compatibility/astrology/comprehensive'
import { HTTP_STATUS } from '@/lib/constants/http'
import { compatibilityCounselorRequestSchema } from '@/lib/api/zodValidation'
import { buildThemeDepthGuide, buildEvidenceGroundingGuide } from '@/lib/prompts/fortuneWithIcp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

import {
  clampMessages,
  stringifyForPrompt,
  countObjectKeys,
  extractTimingDetails,
  buildPersonSeed,
  buildAutoSajuContext,
  buildAutoAstroContext,
  collectMissingSajuKeys,
  collectMissingAstroKeys,
  mergeSajuContext,
  mergeAstroContext,
  buildSajuProfile,
  buildAstroProfile,
  buildExtendedAstroProfile,
  getAgeFromBirthDate,
  formatFusionForPrompt,
} from './routeSupport'

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: authentication + rate limiting + credit consumption
    const guardOptions = createAuthenticatedGuard({
      route: 'compatibility-counselor',
      limit: 30,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'compatibility', // 궁합 상담은 compatibility 타입 사용
      creditAmount: 1,
    })

    const { context, error } = await initializeApiContext(req, guardOptions)
    if (error) {
      return error
    }

    const rawBody = await req.json()
    const validationResult = compatibilityCounselorRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[compatibility/counselor] validation failed', {
        errors: validationResult.error.issues,
      })
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
      persons,
      person1Saju = null,
      person2Saju = null,
      person1Astro = null,
      person2Astro = null,
      fullContext,
      useRag = true,
      lang = context.locale,
      messages = [],
      theme = 'general',
    } = validationResult.data

    const trimmedHistory = clampMessages(messages)

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
    if (lastUser && containsForbidden(lastUser.content)) {
      return createFallbackSSEStream({
        content: safetyMessage(lang),
        done: true,
      })
    }

    // Build profiles and run Fusion analysis
    let fusionResult: FusionCompatibilityResult | null = null
    let fusionContext = ''
    let extendedSajuCompatibility: ReturnType<typeof performExtendedSajuAnalysis> | null = null
    let extendedAstroCompatibility: ReturnType<typeof performExtendedAstrologyAnalysis> | null =
      null
    const person1Seed = buildPersonSeed((persons?.[0] as Record<string, unknown>) || null)
    const person2Seed = buildPersonSeed((persons?.[1] as Record<string, unknown>) || null)
    const now = new Date()
    const autoPerson1Saju = await buildAutoSajuContext(person1Seed, now)
    const autoPerson2Saju = await buildAutoSajuContext(person2Seed, now)
    const autoPerson1Astro = await buildAutoAstroContext(person1Seed, now)
    const autoPerson2Astro = await buildAutoAstroContext(person2Seed, now)
    const effectivePerson1Saju = mergeSajuContext(person1Saju, autoPerson1Saju)
    const effectivePerson2Saju = mergeSajuContext(person2Saju, autoPerson2Saju)
    const effectivePerson1Astro = mergeAstroContext(person1Astro, autoPerson1Astro)
    const effectivePerson2Astro = mergeAstroContext(person2Astro, autoPerson2Astro)
    const strictCompleteness =
      process.env.NODE_ENV !== 'test' && process.env.COMPATIBILITY_COUNSELOR_STRICT === 'true'
    const completenessMissing = [
      ...collectMissingSajuKeys('person1', effectivePerson1Saju),
      ...collectMissingSajuKeys('person2', effectivePerson2Saju),
      ...collectMissingAstroKeys('person1', effectivePerson1Astro),
      ...collectMissingAstroKeys('person2', effectivePerson2Astro),
    ]
    if (strictCompleteness && completenessMissing.length > 0) {
      logger.error('[compatibility/counselor] strict completeness failed', {
        missing: completenessMissing,
      })
      return createFallbackSSEStream({
        content:
          lang === 'ko'
            ? `필수 데이터 누락으로 리포트 생성을 중단했습니다. 누락: ${completenessMissing.join(', ')}`
            : `Report generation stopped due to missing required data: ${completenessMissing.join(', ')}`,
        done: true,
      })
    }
    if (!strictCompleteness && completenessMissing.length > 0) {
      logger.warn('[compatibility/counselor] continuing with partial context', {
        missing: completenessMissing,
      })
    }
    const p1Age = getAgeFromBirthDate(persons?.[0]?.date)
    const p2Age = getAgeFromBirthDate(persons?.[1]?.date)
    const currentYear = now.getFullYear()
    const timingDetails = {
      person1: extractTimingDetails(effectivePerson1Saju, p1Age, now),
      person2: extractTimingDetails(effectivePerson2Saju, p2Age, now),
    }

    try {
      const p1Saju = buildSajuProfile(effectivePerson1Saju)
      const p2Saju = buildSajuProfile(effectivePerson2Saju)
      const p1Astro = buildAstroProfile(effectivePerson1Astro)
      const p2Astro = buildAstroProfile(effectivePerson2Astro)
      const p1ExtendedAstro = buildExtendedAstroProfile(effectivePerson1Astro)
      const p2ExtendedAstro = buildExtendedAstroProfile(effectivePerson2Astro)

      if (p1Saju && p2Saju && p1Astro && p2Astro) {
        fusionResult = calculateFusionCompatibility(p1Saju, p1Astro, p2Saju, p2Astro)
        fusionContext = formatFusionForPrompt(fusionResult, lang)
        extendedSajuCompatibility = performExtendedSajuAnalysis(
          p1Saju,
          p2Saju,
          p1Age,
          p2Age,
          currentYear
        )
      }

      if (p1ExtendedAstro && p2ExtendedAstro) {
        extendedAstroCompatibility = performExtendedAstrologyAnalysis(
          p1ExtendedAstro,
          p2ExtendedAstro,
          Math.abs(p1Age - p2Age)
        )
      }
    } catch (fusionError) {
      logger.error('[Compatibility Counselor] Fusion error:', { error: fusionError })
    }

    const resolvedFullContext =
      fullContext ||
      ({
        persons,
        person1Saju: effectivePerson1Saju,
        person2Saju: effectivePerson2Saju,
        person1Astro: effectivePerson1Astro,
        person2Astro: effectivePerson2Astro,
        autoEnrichment: {
          person1: {
            seed: person1Seed,
            hasAutoSaju: !!autoPerson1Saju,
            hasAutoAstro: !!autoPerson1Astro,
          },
          person2: {
            seed: person2Seed,
            hasAutoSaju: !!autoPerson2Saju,
            hasAutoAstro: !!autoPerson2Astro,
          },
        },
        fusionResult,
        extendedSajuCompatibility,
        extendedAstroCompatibility,
        timingDetails,
        theme,
      } as Record<string, unknown>)
    const fullContextText = stringifyForPrompt(resolvedFullContext)
    const contextTrace = {
      currentDateIso: new Date().toISOString().slice(0, 10),
      hasFusionResult: !!fusionResult,
      hasExtendedSajuCompatibility: !!extendedSajuCompatibility,
      hasExtendedAstroCompatibility: !!extendedAstroCompatibility,
      hasDaeun: Boolean(timingDetails.person1.hasDaeun) || Boolean(timingDetails.person2.hasDaeun),
      hasSaeun: Boolean(timingDetails.person1.hasSaeun) || Boolean(timingDetails.person2.hasSaeun),
      hasWolun: Boolean(timingDetails.person1.hasWolun) || Boolean(timingDetails.person2.hasWolun),
      hasIlun: Boolean(timingDetails.person1.hasIlun) || Boolean(timingDetails.person2.hasIlun),
      timingCoverage: {
        person1: (timingDetails.person1.counts as Record<string, number>) || {},
        person2: (timingDetails.person2.counts as Record<string, number>) || {},
      },
      autoEnrichment: {
        person1: {
          hasSeed: !!person1Seed,
          hasAutoSaju: !!autoPerson1Saju,
          hasAutoAstro: !!autoPerson1Astro,
        },
        person2: {
          hasSeed: !!person2Seed,
          hasAutoSaju: !!autoPerson2Saju,
          hasAutoAstro: !!autoPerson2Astro,
        },
      },
      person1SajuKeys: countObjectKeys(effectivePerson1Saju),
      person2SajuKeys: countObjectKeys(effectivePerson2Saju),
      person1AstroKeys: countObjectKeys(effectivePerson1Astro),
      person2AstroKeys: countObjectKeys(effectivePerson2Astro),
      fullContextKeys: countObjectKeys(resolvedFullContext),
      strictCompleteness,
      missingFields: completenessMissing,
    }

    // Build conversation context
    const historyText = trimmedHistory
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${guardText(m.content, 400)}`)
      .join('\n')
      .slice(0, 2000)

    const userQuestion = lastUser ? guardText(lastUser.content, 600) : ''

    // Format persons info
    const personsInfo = persons
      .map(
        (p: { name?: string; date?: string; time?: string; relation?: string }, i: number) =>
          `Person ${i + 1}: ${p.name || `Person ${i + 1}`} (${p.date} ${p.time})${i > 0 ? ` - ${p.relation || 'partner'}` : ''}`
      )
      .join('\n')

    // Theme-specific context
    const themeContextMap: Record<string, string> = {
      general: lang === 'ko' ? '전반적인 궁합 상담' : 'General compatibility counseling',
      love: lang === 'ko' ? '연애/결혼 궁합 전문 상담' : 'Romance/Marriage compatibility',
      business:
        lang === 'ko' ? '비즈니스 파트너십 궁합 상담' : 'Business partnership compatibility',
      family: lang === 'ko' ? '가족 관계 궁합 상담' : 'Family relationship compatibility',
    }
    const themeContext =
      themeContextMap[theme as string] || (lang === 'ko' ? '궁합 상담' : 'Compatibility counseling')
    const normalizedLang = lang === 'ko' ? 'ko' : 'en'
    const themeDepthGuide = buildThemeDepthGuide(String(theme || 'general'), normalizedLang)
    const evidenceGuide = buildEvidenceGroundingGuide(normalizedLang)

    // Build enhanced prompt for counselor
    const counselorPrompt = [
      `== 프리미엄 궁합 상담사 ==`,
      `테마: ${themeContext}`,
      ``,
      `== 참여자 정보 ==`,
      personsInfo,
      fusionContext ? `\n${fusionContext}` : '',
      extendedSajuCompatibility
        ? `\n== EXTENDED SAJU COMPATIBILITY ==\n${stringifyForPrompt(extendedSajuCompatibility)}`
        : '',
      extendedAstroCompatibility
        ? `\n== EXTENDED ASTROLOGY COMPATIBILITY ==\n${stringifyForPrompt(extendedAstroCompatibility)}`
        : '',
      `\n== TIMING DETAIL (DAEUN/SEUN/WOLUN/ILUN) ==\n${stringifyForPrompt(timingDetails)}`,
      `\n== DETERMINISTIC CONTEXT TRACE ==\n${stringifyForPrompt(contextTrace)}`,
      fullContextText ? `\n== FULL RAW CONTEXT (SAJU + ASTRO) ==\n${fullContextText}` : '',
      historyText ? `\n== 이전 대화 ==\n${historyText}` : '',
      `\n== 사용자 질문 ==\n${userQuestion}`,
      ``,
      `== INTERPRETATION QUALITY CONTRACT ==\n${themeDepthGuide}`,
      `\n== EVIDENCE GATE ==\n${evidenceGuide}`,
      ``,
      `== 상담사 지침 ==`,
      lang === 'ko'
        ? `당신은 사주명리학과 점성학을 결합한 전문 궁합 상담사입니다.
위의 심층 분석 데이터를 바탕으로 친근하지만 전문적인 어조로 답변하세요.
- 구체적인 조언과 실천 가능한 팁을 제공합니다.
- 숨겨진 패턴과 시너지를 쉽게 설명합니다.
- 미래 가이던스를 시기별로 안내합니다.
- 긍정적이면서도 현실적인 조언을 제공합니다.`
        : `You are an expert compatibility counselor combining Saju and Astrology.
Based on the deep analysis above, provide friendly but professional guidance.
- Give specific, actionable advice
- Explain hidden patterns and synergies simply
- Provide time-based future guidance
- Be positive yet realistic`,
    ]
      .filter(Boolean)
      .join('\n')

    // Call backend AI (extended timeout for fusion analysis)
    try {
      const response = await apiClient.post<Record<string, unknown>>(
        '/api/compatibility/chat',
        {
          persons,
          prompt: counselorPrompt,
          question: userQuestion,
          history: trimmedHistory,
          locale: lang,
          compatibility_context: fusionContext,
          compatibility_saju_extended: extendedSajuCompatibility,
          compatibility_astrology_extended: extendedAstroCompatibility,
          compatibility_timing_detail: timingDetails,
          full_context: resolvedFullContext,
          full_context_text: fullContextText,
          use_rag: useRag,
          theme,
          is_premium: true,
        },
        { timeout: 80000 }
      )

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`)
      }

      const aiData = response.data as Record<string, unknown>
      const answer = String(
        (aiData?.data as Record<string, unknown>)?.response ||
          aiData?.response ||
          aiData?.interpretation ||
          (lang === 'ko'
            ? '\uC8C4\uC1A1\uD569\uB2C8\uB2E4. \uC751\uB2F5\uC744 \uC0DD\uC131\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'
            : "Sorry, couldn't generate response. Please try again.")
      )

      // Stream response in chunks for better UX
      const encoder = new TextEncoder()
      return new Response(
        new ReadableStream({
          start(controller) {
            const chunks = answer.match(/.{1,60}/g) || [answer]
            chunks.forEach((chunk: string, index: number) => {
              setTimeout(() => {
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
                if (index === chunks.length - 1) {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                }
              }, index * 15)
            })
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
    } catch (fetchError) {
      logger.error('[Compatibility Counselor] Backend error:', { error: fetchError })

      const fallback =
        lang === 'ko'
          ? 'AI \uC11C\uBC84 \uC5F0\uACB0\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'
          : 'AI server connection issue. Please try again later.'

      return createFallbackSSEStream({
        content: fallback,
        done: true,
      })
    }
  } catch (error) {
    logger.error('[Compatibility Counselor] Error:', { error: error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
