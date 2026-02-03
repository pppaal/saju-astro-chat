import { NextRequest, NextResponse } from 'next/server'
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { logger } from '@/lib/logger'
import { type ChatMessage } from '@/lib/api'
import {
  calculateFusionCompatibility,
  interpretCompatibilityScore,
  type FusionCompatibilityResult,
} from '@/lib/compatibility/compatibilityFusion'
import type { SajuProfile, AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility'
import type { FiveElement } from '@/lib/Saju/types'
import { HTTP_STATUS } from '@/lib/constants/http'
import { compatibilityCounselorRequestSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

function clampMessages(messages: ChatMessage[], max = 8) {
  return messages.slice(-max)
}

// Build SajuProfile from raw saju data
function buildSajuProfile(saju: Record<string, unknown>): SajuProfile | null {
  if (!saju) {
    return null
  }

  const dayMasterName =
    ((saju?.dayMaster as Record<string, unknown>)?.name as string) ||
    ((saju?.dayMaster as Record<string, unknown>)?.heavenlyStem as string) ||
    '갑'
  const dayMasterElement = ((saju?.dayMaster as Record<string, unknown>)?.element as string) || '목'
  const dayMasterYinYang =
    ((saju?.dayMaster as Record<string, unknown>)?.yin_yang as string) || '양'

  const pillars = (saju?.pillars as Record<string, Record<string, string>>) || {}

  const elements = (saju?.fiveElements ||
    saju?.elements || {
      wood: 20,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 20,
    }) as SajuProfile['elements']

  return {
    dayMaster: {
      name: dayMasterName,
      element: dayMasterElement as FiveElement,
      yin_yang: (dayMasterYinYang === 'yin' ? 'yin' : 'yang') as 'yin' | 'yang',
    },
    pillars: {
      year: {
        stem: pillars?.year?.heavenlyStem || '甲',
        branch: pillars?.year?.earthlyBranch || '子',
      },
      month: {
        stem: pillars?.month?.heavenlyStem || '甲',
        branch: pillars?.month?.earthlyBranch || '子',
      },
      day: {
        stem: pillars?.day?.heavenlyStem || '甲',
        branch: pillars?.day?.earthlyBranch || '子',
      },
      time: {
        stem: pillars?.time?.heavenlyStem || '甲',
        branch: pillars?.time?.earthlyBranch || '子',
      },
    },
    elements,
  }
}

// Build AstrologyProfile from raw astro data
function buildAstroProfile(astro: Record<string, unknown>): AstrologyProfile | null {
  if (!astro) {
    return null
  }

  const getElementFromSign = (sign: string): string => {
    const elementMap: Record<string, string> = {
      aries: 'fire',
      leo: 'fire',
      sagittarius: 'fire',
      taurus: 'earth',
      virgo: 'earth',
      capricorn: 'earth',
      gemini: 'air',
      libra: 'air',
      aquarius: 'air',
      cancer: 'water',
      scorpio: 'water',
      pisces: 'water',
    }
    return elementMap[sign.toLowerCase()] || 'fire'
  }

  const getSignData = (source: Record<string, unknown>, planetName: string) => {
    const planets = source?.planets as Record<string, Record<string, string>> | undefined
    if (planets?.[planetName]?.sign) {
      const sign = planets[planetName].sign.toLowerCase()
      return { sign, element: getElementFromSign(sign) }
    }
    const direct = source?.[planetName] as Record<string, string> | undefined
    if (direct?.sign) {
      const sign = direct.sign.toLowerCase()
      return { sign, element: getElementFromSign(sign) }
    }
    return { sign: 'aries', element: 'fire' }
  }

  return {
    sun: getSignData(astro, 'sun'),
    moon: getSignData(astro, 'moon'),
    venus: getSignData(astro, 'venus'),
    mars: getSignData(astro, 'mars'),
    ascendant: getSignData(astro, 'ascendant'),
  }
}

// Format fusion result for AI prompt
function formatFusionForPrompt(fusion: FusionCompatibilityResult, lang: string): string {
  const isKo = lang === 'ko'
  const scoreInfo = interpretCompatibilityScore(fusion.overallScore)

  const lines = [
    `## ${isKo ? '종합 궁합 분석' : 'Comprehensive Compatibility Analysis'}`,
    `${isKo ? '등급' : 'Grade'}: ${scoreInfo.grade} ${scoreInfo.emoji} - ${scoreInfo.title}`,
    `${isKo ? '점수' : 'Score'}: ${fusion.overallScore}/100`,
    ``,
    `### ${isKo ? 'AI 심층 분석' : 'AI Deep Analysis'}`,
    fusion.aiInsights.deepAnalysis,
    ``,
  ]

  if (fusion.aiInsights.hiddenPatterns.length > 0) {
    lines.push(`### ${isKo ? '숨겨진 패턴' : 'Hidden Patterns'}`)
    fusion.aiInsights.hiddenPatterns.forEach((p) => lines.push(`- ${p}`))
    lines.push(``)
  }

  if (fusion.aiInsights.synergySources.length > 0) {
    lines.push(`### ${isKo ? '시너지 요소' : 'Synergy Sources'}`)
    fusion.aiInsights.synergySources.forEach((s) => lines.push(`- ${s}`))
    lines.push(``)
  }

  if (fusion.aiInsights.growthOpportunities.length > 0) {
    lines.push(`### ${isKo ? '성장 기회' : 'Growth Opportunities'}`)
    fusion.aiInsights.growthOpportunities.forEach((g) => lines.push(`- ${g}`))
    lines.push(``)
  }

  // Relationship Dynamics
  lines.push(`### ${isKo ? '관계 역학' : 'Relationship Dynamics'}`)
  lines.push(
    `- ${isKo ? '감정적 강도' : 'Emotional Intensity'}: ${fusion.relationshipDynamics.emotionalIntensity}%`
  )
  lines.push(
    `- ${isKo ? '지적 조화' : 'Intellectual Alignment'}: ${fusion.relationshipDynamics.intellectualAlignment}%`
  )
  lines.push(
    `- ${isKo ? '영적 연결' : 'Spiritual Connection'}: ${fusion.relationshipDynamics.spiritualConnection}%`
  )
  lines.push(
    `- ${isKo ? '갈등 해결 스타일' : 'Conflict Style'}: ${fusion.relationshipDynamics.conflictResolutionStyle}`
  )
  lines.push(``)

  // Future Guidance
  lines.push(`### ${isKo ? '미래 가이던스' : 'Future Guidance'}`)
  lines.push(`**${isKo ? '단기(1-6개월)' : 'Short-term'}**: ${fusion.futureGuidance.shortTerm}`)
  lines.push(`**${isKo ? '중기(6개월-2년)' : 'Medium-term'}**: ${fusion.futureGuidance.mediumTerm}`)
  lines.push(`**${isKo ? '장기(2년+)' : 'Long-term'}**: ${fusion.futureGuidance.longTerm}`)
  lines.push(``)

  // Recommended Actions
  if (fusion.recommendedActions.length > 0) {
    lines.push(`### ${isKo ? '추천 행동' : 'Recommended Actions'}`)
    fusion.recommendedActions.forEach((action) => {
      const priority =
        action.priority === 'high' ? '🔴' : action.priority === 'medium' ? '🟡' : '🟢'
      lines.push(`${priority} [${action.category}] ${action.action}`)
      lines.push(`   ${isKo ? '이유' : 'Why'}: ${action.reasoning}`)
    })
  }

  return lines.join('\n')
}

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

    try {
      const p1Saju = buildSajuProfile(person1Saju as any) // TODO: Fix type compatibility
      const p2Saju = buildSajuProfile(person2Saju as any)
      const p1Astro = buildAstroProfile(person1Astro as any)
      const p2Astro = buildAstroProfile(person2Astro as any)

      if (p1Saju && p2Saju && p1Astro && p2Astro) {
        fusionResult = calculateFusionCompatibility(p1Saju, p1Astro, p2Saju, p2Astro)
        fusionContext = formatFusionForPrompt(fusionResult, lang)
      }
    } catch (fusionError) {
      logger.error('[Compatibility Counselor] Fusion error:', { error: fusionError })
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

    // Build enhanced prompt for counselor
    const counselorPrompt = [
      `== 프리미엄 궁합 상담사 ==`,
      `테마: ${themeContext}`,
      ``,
      `== 참여자 정보 ==`,
      personsInfo,
      fusionContext ? `\n${fusionContext}` : '',
      historyText ? `\n== 이전 대화 ==\n${historyText}` : '',
      `\n== 사용자 질문 ==\n${userQuestion}`,
      ``,
      `== 상담사 지침 ==`,
      lang === 'ko'
        ? `당신은 사주명리학과 점성학을 결합한 전문 궁합 상담사입니다.
위의 심층 분석 데이터를 바탕으로 친근하지만 전문적인 어조로 답변하세요.
- 구체적인 조언과 실천 가능한 팁을 제공하세요
- 숨겨진 패턴과 시너지를 쉽게 설명해주세요
- 미래 가이던스를 시기별로 안내하세요
- 긍정적이면서도 현실적인 조언을 해주세요`
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
            ? '죄송합니다. 응답을 생성할 수 없습니다. 다시 시도해 주세요.'
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
          ? 'AI 서버 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
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
