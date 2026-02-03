/**
 * Match Chat API
 * 매치된 사용자 간의 채팅
 */
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/notifications/pushService'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { destinyMatchChatSchema } from '@/lib/api/zodValidation'

// GET - 특정 매치의 채팅 메시지 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const connectionId = searchParams.get('connectionId')
    const cursor = searchParams.get('cursor') // 페이지네이션용
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 연결 확인 및 권한 검증
    const connection = await prisma.matchConnection.findUnique({
      where: { id: connectionId },
      include: {
        user1Profile: { select: { userId: true } },
        user2Profile: { select: { userId: true } },
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: '매치를 찾을 수 없습니다' },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

    const isUser1 = connection.user1Profile.userId === userId
    const isUser2 = connection.user2Profile.userId === userId

    if (!isUser1 && !isUser2) {
      return NextResponse.json(
        { error: '이 채팅에 대한 권한이 없습니다' },
        { status: HTTP_STATUS.FORBIDDEN }
      )
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

    return NextResponse.json({
      messages: messages.reverse(), // 시간순으로 정렬
      hasMore,
      nextCursor: hasMore ? messages[0]?.id : null,
    })
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

    // Validate with Zod
    const validationResult = destinyMatchChatSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Destiny match chat] validation failed', {
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

    const { connectionId, content, messageType } = validationResult.data

    // 연결 확인
    const connection = await prisma.matchConnection.findUnique({
      where: { id: connectionId },
      include: {
        user1Profile: {
          select: {
            userId: true,
            displayName: true,
          },
        },
        user2Profile: {
          select: {
            userId: true,
            displayName: true,
          },
        },
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: '매치를 찾을 수 없습니다' },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

    if (connection.status !== 'active') {
      return NextResponse.json(
        { error: '이 매치는 더 이상 활성 상태가 아닙니다' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const isUser1 = connection.user1Profile.userId === userId
    const isUser2 = connection.user2Profile.userId === userId

    if (!isUser1 && !isUser2) {
      return NextResponse.json(
        { error: '이 채팅에 대한 권한이 없습니다' },
        { status: HTTP_STATUS.FORBIDDEN }
      )
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
      return NextResponse.json(
        { error: '차단된 사용자에게 메시지를 보낼 수 없습니다' },
        { status: HTTP_STATUS.FORBIDDEN }
      )
    }

    // 메시지 저장 및 연결 업데이트
    const [message] = await prisma.$transaction([
      prisma.matchMessage.create({
        data: {
          connectionId,
          senderId: userId,
          content: content.trim(),
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

    // 푸시 알림 전송 (비동기)
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
      logger.warn('[match-chat] Failed to send push notification:', { err })
    })

    return NextResponse.json({
      success: true,
      message,
    })
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

    const { messageId } = await req.json()

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 메시지 조회
    const message = await prisma.matchMessage.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json(
        { error: '메시지를 찾을 수 없습니다' },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

    // 본인 메시지만 삭제 가능
    if (message.senderId !== userId) {
      return NextResponse.json(
        { error: '본인이 보낸 메시지만 삭제할 수 있습니다' },
        { status: HTTP_STATUS.FORBIDDEN }
      )
    }

    // 이미 삭제된 메시지
    if (message.isDeleted) {
      return NextResponse.json(
        { error: '이미 삭제된 메시지입니다' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // soft delete
    await prisma.matchMessage.update({
      where: { id: messageId },
      data: {
        content: '삭제된 메시지입니다',
        isDeleted: true,
      },
    })

    return NextResponse.json({ success: true })
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/chat',
    limit: 20,
    windowSeconds: 60,
  })
)
