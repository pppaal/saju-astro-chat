// 대화 후 PersonaMemory 자동 업데이트 API
// 채팅 완료 후 프론트엔드에서 호출하여 사용자 컨텍스트 축적

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { summarizeConversation } from '@/lib/ai/summarize'
import { logger } from '@/lib/logger'

import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

// summarize.ts의 ChatMessage와 호환되는 타입 (system role 제외)
type ChatMessageForSummary = {
  role: 'user' | 'assistant'
  content: string
}

// 실제 요청에서는 system 메시지도 포함될 수 있음
type IncomingChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

type RequestBody = {
  sessionId: string
  theme: string
  locale: string
  messages: IncomingChatMessage[]
  saju?: Record<string, unknown>
  astro?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`persona-update:${ip}`, { limit: 30, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again soon.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null
    if (!body || !body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'invalid_body' }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const { sessionId, theme, locale, messages, saju, astro } = body
    const userId = session.user.id

    // 1. 대화 요약 생성 (system role 제외)
    const filteredMessages = messages.filter(
      (m): m is ChatMessageForSummary => m.role === 'user' || m.role === 'assistant'
    )
    const summary = await summarizeConversation(filteredMessages, theme, locale)

    // 2. 기존 PersonaMemory 조회
    const existingMemory = await prisma.personaMemory.findUnique({
      where: { userId },
    })

    // 3. 기존 데이터와 병합
    const existingTopics = (existingMemory?.dominantThemes as string[]) || []
    const existingInsights = (existingMemory?.keyInsights as string[]) || []
    const existingIssues = (existingMemory?.recurringIssues as string[]) || []
    const existingGrowth = (existingMemory?.growthAreas as string[]) || []
    const existingLastTopics = (existingMemory?.lastTopics as string[]) || []

    // 새 데이터 병합 (중복 제거, 최대 10개 유지)
    const _mergedTopics = mergeAndLimit([...existingTopics, ...(summary?.keyTopics || [])], 10)
    const mergedInsights = mergeAndLimit([...existingInsights, ...(summary?.keyInsights || [])], 10)
    const mergedIssues = mergeAndLimit([...existingIssues, ...(summary?.recurringIssues || [])], 10)
    const mergedGrowth = mergeAndLimit([...existingGrowth, ...(summary?.growthAreas || [])], 5)

    // 최근 토픽 업데이트 (최신 5개 유지)
    const updatedLastTopics = [
      theme,
      ...existingLastTopics.filter((t: string) => t !== theme),
    ].slice(0, 5)

    // 지배적인 테마 계산 (가장 많이 나온 주제들)
    const topicCounts = countOccurrences([...existingTopics, ...(summary?.keyTopics || [])])
    const dominantThemes = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic)

    // 4. PersonaMemory 업데이트 또는 생성
    const updatedMemory = await prisma.personaMemory.upsert({
      where: { userId },
      create: {
        userId,
        sessionCount: 1,
        dominantThemes: dominantThemes,
        keyInsights: mergedInsights,
        emotionalTone: summary?.emotionalTone || 'neutral',
        growthAreas: mergedGrowth,
        lastTopics: updatedLastTopics,
        recurringIssues: mergedIssues,
        // 사주/점성술 프로필 캐싱 - JSON 타입으로 명시적 캐스팅
        ...(saju && { sajuProfile: saju as object }),
        ...(astro && { birthChart: astro as object }),
      },
      update: {
        sessionCount: { increment: 1 },
        dominantThemes: dominantThemes,
        keyInsights: mergedInsights,
        emotionalTone: summary?.emotionalTone || existingMemory?.emotionalTone || 'neutral',
        growthAreas: mergedGrowth,
        lastTopics: updatedLastTopics,
        recurringIssues: mergedIssues,
        // 사주/점성술 프로필 캐싱 (새 데이터가 있으면 업데이트)
        ...(saju && { sajuProfile: saju as object }),
        ...(astro && { birthChart: astro as object }),
      },
    })

    // 5. CounselorChatSession에 요약 저장
    if (sessionId && summary) {
      await prisma.counselorChatSession.updateMany({
        where: { id: sessionId, userId },
        data: {
          summary: summary.summary,
          keyTopics: summary.keyTopics,
        },
      })
    }

    const res = NextResponse.json({
      success: true,
      data: {
        sessionCount: updatedMemory.sessionCount,
        dominantThemes: updatedMemory.dominantThemes,
        emotionalTone: updatedMemory.emotionalTone,
        lastTopics: updatedMemory.lastTopics,
      },
      summary: summary?.summary,
    })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    return res
  } catch (err: unknown) {
    logger.error('[PersonaMemory update-from-chat error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

/**
 * 배열 병합 및 중복 제거, 최대 개수 제한
 */
function mergeAndLimit(arr: string[], max: number): string[] {
  return [...new Set(arr)].slice(0, max)
}

/**
 * 배열에서 각 항목 출현 횟수 계산
 */
function countOccurrences(arr: string[]): Record<string, number> {
  return arr.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
}
