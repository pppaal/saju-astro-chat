/**
 * Destiny Match Block API
 * 유저 차단 / 차단 해제
 */
import { NextRequest, NextResponse } from 'next/server';
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

// POST - 유저 차단
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!;
    const { blockedUserId, reason } = await req.json();

    if (!blockedUserId) {
      return NextResponse.json(
        { error: 'blockedUserId is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (blockedUserId === userId) {
      return NextResponse.json(
        { error: '자기 자신을 차단할 수 없습니다' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 이미 차단했는지 확인
    const existing = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: blockedUserId },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, message: '이미 차단된 사용자입니다' });
    }

    // 차단 생성
    await prisma.userBlock.create({
      data: {
        blockerId: userId,
        blockedId: blockedUserId,
        reason: reason || null,
      },
    });

    // 기존 매치 연결이 있으면 blocked로 변경
    const myProfile = await prisma.matchProfile.findUnique({ where: { userId } });
    const blockedProfile = await prisma.matchProfile.findUnique({ where: { userId: blockedUserId } });

    if (myProfile && blockedProfile) {
      await prisma.matchConnection.updateMany({
        where: {
          OR: [
            { user1Id: myProfile.id, user2Id: blockedProfile.id },
            { user1Id: blockedProfile.id, user2Id: myProfile.id },
          ],
          status: 'active',
        },
        data: { status: 'blocked' },
      });
    }

    logger.info('[destiny-match/block] User blocked', { blockerId: userId, blockedId: blockedUserId });

    return NextResponse.json({ success: true });
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/block',
    limit: 30,
    windowSeconds: 60,
  })
);

// DELETE - 차단 해제
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!;
    const { blockedUserId } = await req.json();

    if (!blockedUserId) {
      return NextResponse.json(
        { error: 'blockedUserId is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    await prisma.userBlock.deleteMany({
      where: {
        blockerId: userId,
        blockedId: blockedUserId,
      },
    });

    logger.info('[destiny-match/block] User unblocked', { blockerId: userId, blockedId: blockedUserId });

    return NextResponse.json({ success: true });
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/block',
    limit: 30,
    windowSeconds: 60,
  })
);