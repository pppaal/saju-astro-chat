/**
 * Couple Tarot Reading API
 * 커플 타로 - 매칭된 파트너와 함께 보는 타로
 * 한 사람이 결제하면 둘 다 볼 수 있음
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { sendPushNotification } from '@/lib/notifications/pushService';
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

// GET - 커플 타로 리딩 목록 조회 (내가 만들었거나 공유받은 것)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const searchParams = req.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    // 내가 만들었거나 공유받은 커플 타로 리딩 조회
    const readings = await prisma.tarotReading.findMany({
      where: {
        isSharedReading: true,
        OR: [
          { userId: session.user.id },
          { sharedWithUserId: session.user.id },
        ],
        ...(connectionId ? { matchConnectionId: connectionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 파트너 정보 추가
    const readingsWithPartner = await Promise.all(
      readings.map(async (reading) => {
        const partnerId = reading.userId === session.user.id
          ? reading.sharedWithUserId
          : reading.userId;

        let partnerInfo = null;
        if (partnerId) {
          const partner = await prisma.user.findUnique({
            where: { id: partnerId },
            select: { id: true, name: true, image: true },
          });
          partnerInfo = partner;
        }

        return {
          ...reading,
          isMyReading: reading.userId === session.user.id,
          isPaidByMe: reading.paidByUserId === session.user.id,
          partner: partnerInfo,
        };
      })
    );

    return NextResponse.json({ readings: readingsWithPartner });
  } catch (error) {
    logger.error('[couple-reading] GET error:', { error: error });
    return NextResponse.json(
      { error: 'Failed to fetch couple readings' },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}

// POST - 커플 타로 리딩 생성
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`couple-tarot:${ip}`, { limit: 5, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers }
      );
    }

    const body = await req.json();
    const {
      connectionId,   // MatchConnection ID
      spreadId,
      spreadTitle,
      cards,
      question,
      theme,
      overallMessage,
      cardInsights,
      guidance,
      affirmation,
    } = body;

    // 필수 필드 검증
    if (!connectionId || !spreadId || !cards) {
      return NextResponse.json(
        { error: 'connectionId, spreadId, cards are required' },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      );
    }

    // 매치 연결 확인
    const connection = await prisma.matchConnection.findUnique({
      where: { id: connectionId },
      include: {
        user1Profile: { select: { userId: true } },
        user2Profile: { select: { userId: true } },
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: '매치를 찾을 수 없습니다' },
        { status: HTTP_STATUS.NOT_FOUND, headers: limit.headers }
      );
    }

    // 매치된 사용자인지 확인
    const isUser1 = connection.user1Profile.userId === session.user.id;
    const isUser2 = connection.user2Profile.userId === session.user.id;

    if (!isUser1 && !isUser2) {
      return NextResponse.json(
        { error: '이 매치에 대한 권한이 없습니다' },
        { status: HTTP_STATUS.FORBIDDEN, headers: limit.headers }
      );
    }

    // 파트너 ID
    const partnerId = isUser1
      ? connection.user2Profile.userId
      : connection.user1Profile.userId;

    // 크레딧 확인 및 차감
    const userCredits = await prisma.userCredits.findUnique({
      where: { userId: session.user.id },
    });

    if (!userCredits) {
      return NextResponse.json(
        { error: '크레딧 정보를 찾을 수 없습니다' },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      );
    }

    // 커플 타로는 compatibilityLimit 사용 (또는 보너스 크레딧)
    const availableCredits =
      (userCredits.compatibilityLimit - userCredits.compatibilityUsed) +
      userCredits.bonusCredits;

    if (availableCredits < 1) {
      return NextResponse.json(
        { error: '크레딧이 부족합니다. 크레딧을 충전해주세요.' },
        { status: HTTP_STATUS.PAYMENT_REQUIRED, headers: limit.headers }
      );
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 크레딧 차감 (compatibilityUsed 또는 bonusCredits)
      if (userCredits.compatibilityUsed < userCredits.compatibilityLimit) {
        await tx.userCredits.update({
          where: { userId: session.user.id },
          data: { compatibilityUsed: { increment: 1 } },
        });
      } else {
        await tx.userCredits.update({
          where: { userId: session.user.id },
          data: { bonusCredits: { decrement: 1 } },
        });
      }

      // 2. 타로 리딩 저장
      const reading = await tx.tarotReading.create({
        data: {
          userId: session.user.id,
          question: question || '커플 타로',
          theme: theme || 'love',
          spreadId,
          spreadTitle: spreadTitle || '커플 스프레드',
          cards,
          overallMessage,
          cardInsights,
          guidance,
          affirmation,
          source: 'couple',
          isSharedReading: true,
          sharedWithUserId: partnerId,
          matchConnectionId: connectionId,
          paidByUserId: session.user.id,
          locale: 'ko',
        },
      });

      // 3. MatchConnection 상호작용 시간 업데이트
      await tx.matchConnection.update({
        where: { id: connectionId },
        data: { lastInteractionAt: new Date() },
      });

      return reading;
    });

    // 파트너에게 푸시 알림 보내기 (비동기로 처리)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    const senderName = user?.name || '파트너';

    sendPushNotification(partnerId, {
      title: '💕 커플 타로가 도착했어요!',
      message: `${senderName}님이 함께 볼 커플 타로를 봤어요. 지금 확인해보세요!`,
      icon: '/icon-192.png',
      tag: 'couple-tarot',
      data: {
        url: `/tarot/couple/${result.id}`,
        type: 'couple-tarot',
        readingId: result.id,
      },
    }).catch((err) => {
      logger.warn('[couple-reading] Failed to send push notification:', { err });
    });

    const res = NextResponse.json({
      success: true,
      readingId: result.id,
      message: '커플 타로가 저장되었습니다. 파트너도 볼 수 있어요!',
    });

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch (error) {
    logger.error('[couple-reading] POST error:', { error: error });
    return NextResponse.json(
      { error: 'Failed to create couple reading' },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}

// DELETE - 커플 타로 리딩 삭제 (결제한 사람만 가능)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const { readingId } = await req.json();

    if (!readingId) {
      return NextResponse.json(
        { error: 'readingId is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 리딩 조회
    const reading = await prisma.tarotReading.findUnique({
      where: { id: readingId },
    });

    if (!reading) {
      return NextResponse.json(
        { error: '리딩을 찾을 수 없습니다' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // 결제한 사람만 삭제 가능
    if (reading.paidByUserId !== session.user.id) {
      return NextResponse.json(
        { error: '결제한 사람만 삭제할 수 있습니다' },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    await prisma.tarotReading.delete({
      where: { id: readingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[couple-reading] DELETE error:', { error: error });
    return NextResponse.json(
      { error: 'Failed to delete reading' },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
