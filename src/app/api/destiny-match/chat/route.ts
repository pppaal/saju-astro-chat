/**
 * Match Chat API
 * 매치된 사용자 간의 채팅
 */
import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/notifications/pushService'
import { logger } from '@/lib/logger'
import { destinyMatchChatSchema, destinyMatchChatGetQuerySchema } from '@/lib/api/zodValidation'
import { sanitizeHtml } from '@/lib/api/sanitizers'
import { z } from 'zod'

const deleteMessageSchema = z.object({
  messageId: z.string().min(1, 'messageId is required'),
})

// GET - 특정 매치의 채팅 메시지 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const queryValidation = destinyMatchChatGetQuerySchema.safeParse({
      connectionId: searchParams.get('connectionId'),
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || undefined,
    })
    if (!queryValidation.success) {
      logger.warn('[destiny-match/chat GET] query validation failed', {
        errors: queryValidation.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${queryValidation.error.issues.map((e) => e.message).join(', ')}`
      )
    }
    const { connectionId, cursor, limit } = queryValidation.data

    try {
      // 연결 확인 및 권한 검증
      const connection = await prisma.matchConnection.findUnique({
        where: { id: connectionId },
        include: {
          user1Profile: { select: { userId: true } },
          user2Profile: { select: { userId: true } },
        },
      })

      if (!connection) {
        return apiError(ErrorCodes.NOT_FOUND, '매치를 찾을 수 없습니다')
      }

      const isUser1 = connection.user1Profile.userId === userId
      const isUser2 = connection.user2Profile.userId === userId

      if (!isUser1 && !isUser2) {
        return apiError(ErrorCodes.FORBIDDEN, '이 채팅에 대한 권한이 없습니다')
      }

      // 메시지 조회 (최신순, 페이지네이션)
      const messages = await prisma.matchMessage.findMany({
        where: { connectionId },
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // 다음 페이지 확인용
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          sender: {
            select: { id: true, name: true, image: true },
          },
        },
      })

      const hasMore = messages.length > limit
      if (hasMore) {
        messages.pop()
      }

      // 상대방이 보낸 읽지 않은 메시지들 읽음 처리
      await prisma.matchMessage.updateMany({
        where: {
          connectionId,
          senderId: { not: userId },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

      return apiSuccess({
        messages: messages.reverse(), // 시간순으로 정렬
        hasMore,
        nextCursor: hasMore ? messages[0]?.id : null,
      })
    } catch (err) {
      logger.error('[destiny-match/chat GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch chat messages')
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/chat',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST - 메시지 전송
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!
    const userName = context.session?.user?.name

    const rawBody = await req.json()

    const validationResult = destinyMatchChatSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[destiny-match/chat POST] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { connectionId, content: rawContent, messageType } = validationResult.data
    const content = sanitizeHtml(rawContent, 2000)

    try {
      // 연결 확인
      const connection = await prisma.matchConnection.findUnique({
        where: { id: connectionId },
        include: {
          user1Profile: {
            select: { userId: true, displayName: true },
          },
          user2Profile: {
            select: { userId: true, displayName: true },
          },
        },
      })

      if (!connection) {
        return apiError(ErrorCodes.NOT_FOUND, '매치를 찾을 수 없습니다')
      }

      if (connection.status !== 'active') {
        const statusMessages: Record<string, string> = {
          blocked: '차단된 매치에서는 메시지를 보낼 수 없습니다',
          unmatched: '매치가 해제되어 메시지를 보낼 수 없습니다',
          expired: '만료된 매치에서는 메시지를 보낼 수 없습니다',
        }
        const message =
          statusMessages[connection.status] ?? '이 매치는 더 이상 활성 상태가 아닙니다'
        return apiError(ErrorCodes.BAD_REQUEST, message)
      }

      const isUser1 = connection.user1Profile.userId === userId
      const isUser2 = connection.user2Profile.userId === userId

      if (!isUser1 && !isUser2) {
        return apiError(ErrorCodes.FORBIDDEN, '이 채팅에 대한 권한이 없습니다')
      }

      // 상대방 ID
      const recipientId = isUser1 ? connection.user2Profile.userId : connection.user1Profile.userId

      // 차단 여부 확인
      const block = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: recipientId },
            { blockerId: recipientId, blockedId: userId },
          ],
        },
      })

      if (block) {
        return apiError(ErrorCodes.FORBIDDEN, '차단된 사용자에게 메시지를 보낼 수 없습니다')
      }

      // 메시지 저장 및 연결 업데이트
      const [message] = await prisma.$transaction([
        prisma.matchMessage.create({
          data: {
            connectionId,
            senderId: userId,
            content,
            messageType,
          },
          include: {
            sender: {
              select: { id: true, name: true, image: true },
            },
          },
        }),
        prisma.matchConnection.update({
          where: { id: connectionId },
          data: {
            chatStarted: true,
            lastInteractionAt: new Date(),
          },
        }),
      ])

      // 푸시 알림 전송 (비동기, 실패 시 경고 로그만)
      const senderName = userName || '누군가'
      sendPushNotification(recipientId, {
        title: `💬 ${senderName}님의 메시지`,
        message: content.length > 50 ? content.substring(0, 50) + '...' : content,
        icon: '/icon-192.png',
        tag: `chat-${connectionId}`,
        data: {
          url: `/destiny-match/chat/${connectionId}`,
          type: 'match-chat',
          connectionId,
        },
      }).catch((err) => {
        logger.warn('[match-chat] Failed to send push notification', { error: err })
      })

      return apiSuccess({ message })
    } catch (err) {
      logger.error('[destiny-match/chat POST] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to send message')
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/chat',
    limit: 30,
    windowSeconds: 60,
  })
)

// DELETE - 메시지 삭제 (soft delete)
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const rawBody = await req.json()

    const validationResult = deleteMessageSchema.safeParse(rawBody)
    if (!validationResult.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { messageId } = validationResult.data

    try {
      // 메시지 조회
      const message = await prisma.matchMessage.findUnique({
        where: { id: messageId },
      })

      if (!message) {
        return apiError(ErrorCodes.NOT_FOUND, '메시지를 찾을 수 없습니다')
      }

      // 본인 메시지만 삭제 가능
      if (message.senderId !== userId) {
        return apiError(ErrorCodes.FORBIDDEN, '본인이 보낸 메시지만 삭제할 수 있습니다')
      }

      // 이미 삭제된 메시지
      if (message.isDeleted) {
        return apiError(ErrorCodes.BAD_REQUEST, '이미 삭제된 메시지입니다')
      }

      // soft delete
      await prisma.matchMessage.update({
        where: { id: messageId },
        data: {
          content: '삭제된 메시지입니다',
          isDeleted: true,
        },
      })

      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('[destiny-match/chat DELETE] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to delete message')
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/chat',
    limit: 20,
    windowSeconds: 60,
  })
)
