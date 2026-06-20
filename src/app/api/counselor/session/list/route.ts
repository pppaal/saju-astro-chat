import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import {
  counselorSessionListQuerySchema,
  counselorSessionDeleteQuerySchema,
  counselorSessionRenameRequestSchema,
  createValidationErrorResponse,
} from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

// 사이드바 목록은 부제로 '인물 이름'만 쓴다(destiny: profile.name / compat:
// persons[].name). 그런데 세션 meta 에는 궁합의 경우 두 사람의 전체 사주+점성
// 차트(person1Saju/2Saju/1Astro/2Astro)가 통째로 들어있어, 그대로 내려주면
// 목록 한 번 로드에 수십~수백 KB 가 낭비된다(재개는 session/load 가 풀 meta 를
// 따로 준다). 목록 응답에선 이름만 남기고 무거운 필드를 버린다.
function slimSidebarMeta(
  meta: unknown
): { profile?: { name?: string }; persons?: Array<{ name?: string }> } | null {
  if (!meta || typeof meta !== 'object') return null
  const m = meta as Record<string, unknown>
  const out: { profile?: { name?: string }; persons?: Array<{ name?: string }> } = {}
  const profileName = (m.profile as { name?: unknown } | undefined)?.name
  if (typeof profileName === 'string') out.profile = { name: profileName }
  if (Array.isArray(m.persons)) {
    out.persons = m.persons.map((p) => {
      const name = (p as { name?: unknown } | null)?.name
      return { name: typeof name === 'string' ? name : undefined }
    })
  }
  return out.profile || out.persons ? out : null
}

// GET: List all chat sessions for a user
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const queryValidation = counselorSessionListQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      type: searchParams.get('type') ?? undefined,
    })
    if (!queryValidation.success) {
      return createValidationErrorResponse(queryValidation.error, {
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }
    const { limit, type } = queryValidation.data

    // Single query to get user's sessions, optionally scoped to one
    // service type (destiny / compat).
    //
    // We fetch `messages` here just to derive a fallback title for
    // sessions that predate the auto-titler (PR #193). The sidebar
    // shouldn't render the entire conversation, so we strip `messages`
    // before sending and only keep the derived 30-char title.
    // 사이드바 리스트는 메타데이터만 필요 — messages JSON (수십 KB ~ MB) 은
    // 제외. 이전엔 title fallback 용으로 전체 messages 를 들고와서 1000명 ×
    // 30 세션 × 평균 50KB = 약 1.5GB egress / 페이지 진입 회당. meta 는 fetch 하되
    // 응답에선 slimSidebarMeta 로 인물 이름만 남긴다(궁합 meta 의 차트 블롭 제외).
    const rows = await prisma.counselorChatSession.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        locale: true,
        messageCount: true,
        summary: true,
        keyTopics: true,
        meta: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
      },
    })

    // title 빈 행만 별도로 첫 user 메시지 조회 — auto-titler PR #193 이전 행
    // (대부분 옛 데이터). 새 행은 backfillTitle 로 채워져 있어 추가 query X.
    type ChatMsg = { role?: string; content?: string }
    const untitledIds = rows.filter((r) => !r.title || !r.title.trim()).map((r) => r.id)
    let titleFallbacks: Record<string, string> = {}
    if (untitledIds.length > 0) {
      const withMessages = await prisma.counselorChatSession.findMany({
        where: { id: { in: untitledIds } },
        select: { id: true, messages: true },
      })
      titleFallbacks = Object.fromEntries(
        withMessages.map((r) => {
          const msgs = Array.isArray(r.messages) ? (r.messages as ChatMsg[]) : []
          const firstUser = msgs.find((m) => m && m.role === 'user')?.content
          let derived = ''
          if (firstUser && typeof firstUser === 'string') {
            const cleaned = firstUser.replace(/\s+/g, ' ').trim()
            derived = cleaned.length <= 30 ? cleaned : `${cleaned.slice(0, 29).trim()}…`
          }
          return [r.id, derived]
        })
      )
    }

    const sessions = rows.map((row) => ({
      ...row,
      title: row.title || titleFallbacks[row.id] || row.title,
      meta: slimSidebarMeta(row.meta),
    }))

    return NextResponse.json({ sessions })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/list',
    limit: 60,
    windowSeconds: 60,
  })
)

// DELETE: Delete a specific chat session
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const deleteValidation = counselorSessionDeleteQuerySchema.safeParse({
      sessionId: searchParams.get('sessionId') ?? undefined,
    })
    if (!deleteValidation.success) {
      return createValidationErrorResponse(deleteValidation.error, {
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }
    const { sessionId } = deleteValidation.data

    // Verify ownership and delete
    const chatSession = await prisma.counselorChatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    })

    if (!chatSession) {
      return createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
        message: 'Session not found',
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }

    await prisma.counselorChatSession.delete({
      where: { id: sessionId },
    })

    return NextResponse.json({ success: true })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/list',
    limit: 30,
    windowSeconds: 60,
  })
)

// PATCH: rename a chat session. Body: { sessionId, title }
export const PATCH = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid JSON body',
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }

    const validation = counselorSessionRenameRequestSchema.safeParse(rawBody)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }
    const { sessionId, title } = validation.data

    // Verify ownership before update.
    const existing = await prisma.counselorChatSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    })
    if (!existing) {
      return createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
        message: 'Session not found',
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }

    const updated = await prisma.counselorChatSession.update({
      where: { id: sessionId },
      data: { title },
      select: { id: true, title: true, updatedAt: true },
    })

    return NextResponse.json({ success: true, session: updated })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/list',
    limit: 30,
    windowSeconds: 60,
  })
)
