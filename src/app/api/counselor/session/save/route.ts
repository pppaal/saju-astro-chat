import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { enforceBodySize } from '@/lib/http'
import { BODY_LIMITS } from '@/lib/constants/api-limits'
import {
  counselorSessionSaveRequestSchema,
  createValidationErrorResponse,
} from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { isCounselorSessionDeleted } from '@/lib/counselor/sessionTombstone'
import { deriveChatTitleFromMessages } from '@/lib/counselor/chatTitle'

export const dynamic = 'force-dynamic'

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const oversized = enforceBodySize(req, BODY_LIMITS.LARGE)
    if (oversized) {
      return oversized
    }

    // Safe JSON parsing
    let rawBody
    try {
      const text = await req.text()
      if (!text || text.trim() === '') {
        return createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          message: 'Empty request body',
          locale: extractLocale(req),
          route: 'counselor/session/save',
        })
      }
      rawBody = JSON.parse(text)
    } catch {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid JSON',
        locale: extractLocale(req),
        route: 'counselor/session/save',
      })
    }

    // Validate with Zod
    const validationResult = counselorSessionSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Counselor session save] validation failed', {
        errors: validationResult.error.issues,
      })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(req),
        route: 'counselor/session/save',
      })
    }

    const { sessionId, messages, locale = 'ko', subject } = validationResult.data

    // 세션을 "사람"에 묶는다 — 사이드바 부제(누구 채팅인지)와 후속 재개의 기준.
    // 생성 시 한 번만 저장한다(대화 도중 대상자는 안 바뀜). name/birth 가 전혀
    // 없으면 meta 를 만들지 않는다. profile.name 은 사이드바가 읽는 위치라 같이 둔다.
    const subjectName = subject?.name?.trim() || ''
    const hasSubject = Boolean(
      subjectName || subject?.birthDate?.trim() || subject?.birthTime?.trim()
    )
    const sessionMeta = hasSubject
      ? {
          ...(subjectName ? { profile: { name: subjectName } } : {}),
          subject: {
            ...(subjectName ? { name: subjectName } : {}),
            ...(subject?.birthDate?.trim() ? { birthDate: subject.birthDate.trim() } : {}),
            ...(subject?.birthTime?.trim() ? { birthTime: subject.birthTime.trim() } : {}),
            ...(typeof subject?.birthTimeUnknown === 'boolean'
              ? { birthTimeUnknown: subject.birthTimeUnknown }
              : {}),
            ...(subject?.gender?.trim() ? { gender: subject.gender.trim() } : {}),
            ...(typeof subject?.latitude === 'number' ? { latitude: subject.latitude } : {}),
            ...(typeof subject?.longitude === 'number' ? { longitude: subject.longitude } : {}),
            ...(subject?.city?.trim() ? { city: subject.city.trim() } : {}),
            ...(subject?.timeZone?.trim() ? { timeZone: subject.timeZone.trim() } : {}),
          },
        }
      : undefined

    if (!sessionId || !messages.length) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request - sessionId and messages are required',
        locale: extractLocale(req),
        route: 'counselor/session/save',
      })
    }

    const existing = await prisma.counselorChatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, meta: true, title: true },
    })

    // 사이드바 제목 — 생성 시 박아 둔다. 안 그러면 자동저장이 안전망보다 먼저
    // 행을 만들 때 title 이 NULL 로 남아 목록이 매번 fallback 쿼리로 제목을
    // 다시 뽑는다(auto-titler PR #193 회귀). update 경로는 비어 있을 때만 backfill.
    const derivedTitle = deriveChatTitleFromMessages(messages)

    if (existing && existing.userId !== userId) {
      return createErrorResponse({
        code: ErrorCodes.FORBIDDEN,
        locale: extractLocale(req),
        route: 'counselor/session/save',
      })
    }

    let chatSession
    let saveMode: 'create' | 'update' | 'create-race-recovery'

    if (existing) {
      chatSession = await prisma.counselorChatSession.update({
        where: { id: sessionId },
        data: {
          messages: messages as never,
          messageCount: messages.length,
          lastMessageAt: new Date(),
          // 서버 안전망(ensureCounselorSessionRecord)이 답변 완료 시점에 meta
          // 없이 행을 먼저 만들면, 이 클라 저장이 update 로 떨어진다. 예전엔
          // update 가 meta 를 안 건드려 대상자(subject)가 영영 저장되지 않았다
          // (사이드바 이름·재개 복원이 깨짐). 행에 meta 가 아직 없을 때만
          // backfill — 이미 있으면 덮어쓰지 않는다(클라가 갱신 권한 보유).
          ...(!existing.meta && sessionMeta ? { meta: sessionMeta } : {}),
          ...(!existing.title && derivedTitle ? { title: derivedTitle } : {}),
        },
      })
      saveMode = 'update'
    } else if (await isCounselorSessionDeleted(sessionId)) {
      // 스트리밍/디바운스 도중 사용자가 이 채팅을 삭제했다면, 지연 도착한 이
      // 자동저장이 세션을 되살리면 안 된다 — 생성 스킵하고 조용히 성공 반환
      // (클라는 이미 목록에서 지웠으므로 에러로 만들 필요 없음).
      return NextResponse.json({ success: true, sessionId, skipped: 'deleted' })
    } else {
      try {
        chatSession = await prisma.counselorChatSession.create({
          data: {
            id: sessionId,
            userId,
            locale,
            messages,
            messageCount: messages.length,
            lastMessageAt: new Date(),
            ...(sessionMeta ? { meta: sessionMeta } : {}),
            ...(derivedTitle ? { title: derivedTitle } : {}),
          },
        })
        saveMode = 'create'
      } catch (error) {
        // Race-safe path: another request may create the same sessionId first.
        if (!isUniqueConstraintError(error)) {
          throw error
        }
        logger.warn('[Counselor session save] create race detected (P2002), attempting recovery', {
          sessionId,
          userId,
        })

        const collided = await prisma.counselorChatSession.findUnique({
          where: { id: sessionId },
          select: { userId: true, meta: true, title: true },
        })

        if (collided && collided.userId !== userId) {
          logger.warn('[Counselor session save] create race belongs to another user', {
            sessionId,
            ownerUserId: collided.userId,
            userId,
          })
          return createErrorResponse({
            code: ErrorCodes.FORBIDDEN,
            locale: extractLocale(req),
            route: 'counselor/session/save',
          })
        }

        chatSession = await prisma.counselorChatSession.update({
          where: { id: sessionId },
          data: {
            messages: messages as never,
            messageCount: messages.length,
            lastMessageAt: new Date(),
            // 동시 생성자가 안전망(meta 없음)이었을 수 있으니 여기서도 backfill.
            ...(!collided?.meta && sessionMeta ? { meta: sessionMeta } : {}),
            ...(!collided?.title && derivedTitle ? { title: derivedTitle } : {}),
          },
        })
        saveMode = 'create-race-recovery'
      }
    }

    logger.info('[Counselor session save] session persisted', {
      sessionId,
      userId,
      saveMode,
      messageCount: messages.length,
    })

    return NextResponse.json({ success: true, sessionId: chatSession.id })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/save',
    limit: 30,
    windowSeconds: 60,
  })
)
