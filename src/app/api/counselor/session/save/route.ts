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
      select: { userId: true },
    })

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
        },
      })
      saveMode = 'update'
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
          select: { userId: true },
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
