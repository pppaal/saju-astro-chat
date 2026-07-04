import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import { isCounselorSessionDeleted } from '@/lib/counselor/sessionTombstone'
import {
  GetChatHistorySchema,
  PostChatHistorySchema,
  PatchChatHistorySchema,
  type ChatMessage,
} from './validation'

export const dynamic = 'force-dynamic'

// Sidebar shows the title in a narrow column on mobile — anything past
// ~30 chars wraps or clips. Trim whitespace, collapse runs of inner
// whitespace, and ellipsize. We keep the cap modest so even an
// unbroken Korean question fits on one line.
const CHAT_TITLE_MAX = 30
function truncateChatTitle(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= CHAT_TITLE_MAX) return cleaned
  return `${cleaned.slice(0, CHAT_TITLE_MAX - 1).trim()}…`
}

// GET: 채팅 세션 히스토리 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    // Validate query parameters with Zod
    const searchParams = req.nextUrl.searchParams
    const validation = GetChatHistorySchema.safeParse({
      limit: searchParams.get('limit'),
    })

    if (!validation.success) {
      logger.warn('[chat-history GET] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const { limit } = validation.data

    const chatSessions = await prisma.counselorChatSession.findMany({
      where: {
        userId,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      // messages(JSON, 세션당 수십~수백 KB)는 제외 — 이 GET 의 유일한 소비자
      // (useCounselorData)는 id/summary/keyTopics/lastMessageAt 만 읽고, 전체
      // 대화는 /api/counselor/session/load 가 따로 제공한다. 포함 시 사이드바
      // 로드마다 수 MB 직렬화로 200~500ms 낭비.
      select: {
        id: true,
        summary: true,
        keyTopics: true,
        messageCount: true,
        lastMessageAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      sessions: chatSessions,
    })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/chat-history',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST: 새 메시지 추가 (세션 생성/업데이트)
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    // Validate request body with Zod
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const validation = PostChatHistorySchema.safeParse(body)
    if (!validation.success) {
      logger.warn('[chat-history POST] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const { sessionId, locale, userMessage, assistantMessage, type, meta, create } = validation.data
    const sessionType = type ?? 'destiny'

    const now = new Date()
    const newMessages: ChatMessage[] = []

    if (userMessage) {
      newMessages.push({
        role: 'user',
        content: userMessage,
        timestamp: now.toISOString(),
      })
    }
    if (assistantMessage) {
      newMessages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: now.toISOString(),
      })
    }

    if (sessionId) {
      const firstUserContent = newMessages.find((m) => m.role === 'user')?.content?.trim() || ''
      const candidateTitle = firstUserContent ? truncateChatTitle(firstUserContent) : null
      const metaJson = meta ? JSON.stringify(meta) : null

      // 원자적 append — 예전엔 findFirst 로 messages 를 읽어 메모리에서 이어붙인 뒤
      // 통째로 update 했는데(read-modify-write), 같은 세션에 두 turn 이 겹치면
      // (두 탭/기기, completeTurn↔복원 저장 경합) 둘 다 같은 기존 배열을 읽고
      // 서로를 덮어써 한쪽의 *유료* turn 이 영구 소실됐다(lost update). DB 측
      // jsonb concat 단일 UPDATE 로 경쟁창을 없앤다. 소유권은 WHERE userId 로
      // 강제(남의/없는 세션이면 0행). title 은 null 일 때만 backfill(COALESCE),
      // meta 는 클라가 실어 보내면 갱신(COALESCE(new, 기존)). updatedAt 은 raw 가
      // @updatedAt 을 우회하므로 명시적으로 설정.
      const appendSql = (): Promise<number> =>
        prisma.$executeRaw`
          UPDATE "CounselorChatSession"
          SET "messages" = COALESCE("messages", '[]'::jsonb) || ${JSON.stringify(newMessages)}::jsonb,
              "messageCount" = jsonb_array_length(COALESCE("messages", '[]'::jsonb)) + ${newMessages.length},
              "lastMessageAt" = ${now},
              "updatedAt" = ${now},
              "title" = COALESCE("title", ${candidateTitle}),
              "meta" = COALESCE(CAST(${metaJson} AS jsonb), "meta")
          WHERE "id" = ${sessionId} AND "userId" = ${userId}
        `

      const affected = await appendSql()
      if (affected > 0) {
        // 클라이언트는 session.id 만 사용하므로 전체 messages 를 되돌리지 않는다
        // (턴당 대화 전체 재전송 = O(N) 페이로드 회피).
        return NextResponse.json({ success: true, session: { id: sessionId }, action: 'updated' })
      }

      // 0행 = 이 사용자 소유의 세션이 없음. create 옵트인이 아니면 404
      // (임의 id 주입 방지, 정보 누출 없음).
      if (!create) {
        return createErrorResponse({
          code: ErrorCodes.NOT_FOUND,
          message: 'Session not found',
          locale: extractLocale(req),
          route: 'counselor/chat-history',
        })
      }

      // 삭제된 세션 부활 방지 — 스트리밍/디바운스 중 사용자가 삭제한 세션에
      // 지연 도착한 fire-and-forget POST 가 create 로 되살리던 구멍을 막는다
      // (session/save·ensureSessionRecord 와 동일한 tombstone 가드).
      if (await isCounselorSessionDeleted(sessionId)) {
        return NextResponse.json({ success: true, session: { id: sessionId }, skipped: 'deleted' })
      }

      // 클라 지정 id 로 생성. 안전망(ensureCounselorSessionRecord)이나 동시
      // 요청이 UPDATE~CREATE 사이에 행을 만드는 레이스는 P2002 로 잡아, 옛 코드처럼
      // 무조건 404 로 오처리(=유료 turn 내용 영구 유실)하지 않고 원자적 append 를
      // 재시도한다 — 남의 세션이면 0행 → 404, 내 세션(안전망)이면 append 성공.
      try {
        const created = await prisma.counselorChatSession.create({
          data: {
            id: sessionId,
            userId,
            locale,
            type: sessionType,
            ...(candidateTitle ? { title: candidateTitle } : {}),
            ...(meta ? { meta: meta as Prisma.InputJsonValue } : {}),
            messages: newMessages,
            messageCount: newMessages.length,
            lastMessageAt: now,
          },
        })
        return NextResponse.json({ success: true, session: { id: created.id }, action: 'created' })
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
          const recovered = await appendSql()
          if (recovered > 0) {
            return NextResponse.json({
              success: true,
              session: { id: sessionId },
              action: 'created',
            })
          }
          return createErrorResponse({
            code: ErrorCodes.NOT_FOUND,
            message: 'Session not found',
            locale: extractLocale(req),
            route: 'counselor/chat-history',
          })
        }
        throw err
      }
    } else {
      // 새 세션 생성 — auto-derive a title from the first user turn
      // so the sidebar shows the question, not "Untitled chat".
      // User can still rename via the pencil action.
      const autoTitle = userMessage ? truncateChatTitle(userMessage) : null
      const created = await prisma.counselorChatSession.create({
        data: {
          userId,
          locale,
          type: sessionType,
          ...(autoTitle ? { title: autoTitle } : {}),
          // Prisma expects Prisma.InputJsonValue for Json columns; the
          // zod parse output is Record<string, unknown> which is
          // structurally compatible but typed loosely.
          ...(meta ? { meta: meta as Prisma.InputJsonValue } : {}),
          messages: newMessages,
          messageCount: newMessages.length,
          lastMessageAt: now,
        },
      })

      return NextResponse.json({
        success: true,
        session: created,
        action: 'created',
      })
    }
  },
  createAuthenticatedGuard({
    route: '/api/counselor/chat-history',
    limit: 30,
    windowSeconds: 60,
  })
)

// PATCH: 세션 메타 정보 업데이트 (요약, 주요 주제)
export const PATCH = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    // Validate request body with Zod
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const validation = PatchChatHistorySchema.safeParse(body)
    if (!validation.success) {
      logger.warn('[chat-history PATCH] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const { sessionId, summary, keyTopics } = validation.data

    const existingSession = await prisma.counselorChatSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    })

    if (!existingSession) {
      return createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
        message: 'Session not found',
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const updated = await prisma.counselorChatSession.update({
      where: { id: sessionId },
      data: {
        ...(summary && { summary }),
        ...(keyTopics && { keyTopics }),
      },
    })

    return NextResponse.json({
      success: true,
      session: updated,
    })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/chat-history',
    limit: 30,
    windowSeconds: 60,
  })
)
