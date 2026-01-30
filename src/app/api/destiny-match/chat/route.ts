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

// GET - 특정 매치의 채팅 메시지 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
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
    } catch (error) {
      logger.error('[match-chat] GET error:', { error: error })
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
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
    try {
      const userId = context.userId!
      const userName = context.session?.user?.name

      const body = await req.json()
      const { connectionId, content, messageType = 'text' } = body

      if (!connectionId || !content?.trim()) {
        return NextResponse.json(
          { error: 'connectionId and content are required' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // 메시지 길이 제한
      if (content.length > 2000) {
        return NextResponse.json(
          { error: '메시지가 너무 깁니다 (최대 2000자)' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

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
    } catch (error) {
      logger.error('[match-chat] POST error:', { error: error })
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/chat',
    limit: 30,
    windowSeconds: 60,
  })
)
