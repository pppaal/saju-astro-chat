/**
 * Destiny Match Swipe API
 * 좋아요/패스/슈퍼라이크 처리
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { calculateDetailedCompatibility } from '@/lib/destiny-match/quickCompatibility';
import { logger } from '@/lib/logger';

// POST - 스와이프 처리
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetProfileId, action, compatibilityScore } = await req.json();

    // 유효성 검증
    if (!targetProfileId) {
      return NextResponse.json(
        { error: 'targetProfileId is required' },
        { status: 400 }
      );
    }

    if (!['like', 'pass', 'super_like'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be like, pass, or super_like' },
        { status: 400 }
      );
    }

    // 내 프로필 조회 (생년월일 포함)
    let myProfile = await prisma.matchProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            birthDate: true,
            birthTime: true,
            gender: true,
          },
        },
      },
    });

    if (!myProfile) {
      return NextResponse.json(
        { error: '먼저 매칭 프로필을 설정해주세요' },
        { status: 400 }
      );
    }

    // Super Like 일일 리셋 체크
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = myProfile.superLikeResetAt ? new Date(myProfile.superLikeResetAt) : null;

    if (!lastReset || lastReset < today) {
      // 오늘 첫 접속이거나 마지막 리셋이 어제 이전이면 리셋
      const updated = await prisma.matchProfile.update({
        where: { userId: session.user.id },
        data: {
          superLikeCount: 3, // 일일 3개로 리셋
          superLikeResetAt: new Date(),
        },
      });
      // user 정보는 유지
      myProfile = { ...updated, user: myProfile.user };
    }

    // 대상 프로필 확인 (생년월일 포함)
    const targetProfile = await prisma.matchProfile.findUnique({
      where: { id: targetProfileId },
      include: {
        user: {
          select: {
            birthDate: true,
            birthTime: true,
            gender: true,
          },
        },
      },
    });

    if (!targetProfile) {
      return NextResponse.json(
        { error: '대상 프로필을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 자기 자신 스와이프 방지
    if (targetProfile.userId === session.user.id) {
      return NextResponse.json(
        { error: '자신에게 스와이프할 수 없습니다' },
        { status: 400 }
      );
    }

    // 슈퍼라이크 카운트 확인
    if (action === 'super_like' && myProfile.superLikeCount <= 0) {
      return NextResponse.json(
        { error: '슈퍼라이크를 모두 사용했습니다' },
        { status: 400 }
      );
    }

    // 이미 스와이프했는지 확인
    const existingSwipe = await prisma.matchSwipe.findUnique({
      where: {
        swiperId_targetId: {
          swiperId: myProfile.id,
          targetId: targetProfileId,
        },
      },
    });

    if (existingSwipe) {
      return NextResponse.json(
        { error: '이미 스와이프한 프로필입니다' },
        { status: 400 }
      );
    }

    // 상대방이 나에게 이미 like 했는지 확인
    const reverseSwipe = await prisma.matchSwipe.findUnique({
      where: {
        swiperId_targetId: {
          swiperId: targetProfileId,
          targetId: myProfile.id,
        },
      },
    });

    const isMatch =
      (action === 'like' || action === 'super_like') &&
      reverseSwipe &&
      (reverseSwipe.action === 'like' || reverseSwipe.action === 'super_like');

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 스와이프 생성
      const swipe = await tx.matchSwipe.create({
        data: {
          swiperId: myProfile.id,
          targetId: targetProfileId,
          action,
          compatibilityScore: compatibilityScore || null,
          isMatched: isMatch ?? false,
          matchedAt: isMatch ? new Date() : undefined,
        },
      });

      // 2. 프로필 통계 업데이트
      if (action === 'like' || action === 'super_like') {
        // 내 likesGiven 증가
        await tx.matchProfile.update({
          where: { id: myProfile.id },
          data: { likesGiven: { increment: 1 } },
        });

        // 상대방 likesReceived 증가
        await tx.matchProfile.update({
          where: { id: targetProfileId },
          data: { likesReceived: { increment: 1 } },
        });
      }

      // 3. 슈퍼라이크 사용 시 카운트 감소
      if (action === 'super_like') {
        await tx.matchProfile.update({
          where: { id: myProfile.id },
          data: { superLikeCount: { decrement: 1 } },
        });
      }

      // 4. 매치 성사 시
      let connection = null;
      if (isMatch) {
        // 상대방 스와이프도 isMatched로 업데이트
        await tx.matchSwipe.update({
          where: { id: reverseSwipe!.id },
          data: {
            isMatched: true,
            matchedAt: new Date(),
          },
        });

        // 양쪽 matchCount 증가
        await tx.matchProfile.update({
          where: { id: myProfile.id },
          data: { matchCount: { increment: 1 } },
        });
        await tx.matchProfile.update({
          where: { id: targetProfileId },
          data: { matchCount: { increment: 1 } },
        });

        // 상세 궁합 분석 (매치 성사 시)
        let detailedCompatibility = null;
        if (myProfile.user.birthDate && targetProfile.user.birthDate) {
          try {
            detailedCompatibility = await calculateDetailedCompatibility(
              {
                birthDate: myProfile.user.birthDate,
                birthTime: myProfile.user.birthTime || undefined,
                gender: myProfile.user.gender || undefined,
              },
              {
                birthDate: targetProfile.user.birthDate,
                birthTime: targetProfile.user.birthTime || undefined,
                gender: targetProfile.user.gender || undefined,
              }
            );
          } catch (e) {
            logger.warn('[swipe] Detailed compatibility failed:', { e });
          }
        }

        // MatchConnection 생성
        const [user1Id, user2Id] =
          myProfile.id < targetProfileId
            ? [myProfile.id, targetProfileId]
            : [targetProfileId, myProfile.id];

        connection = await tx.matchConnection.create({
          data: {
            user1Id,
            user2Id,
            compatibilityScore: detailedCompatibility?.score || compatibilityScore || null,
            compatibilityData: detailedCompatibility || undefined,
            isSuperLikeMatch:
              action === 'super_like' || reverseSwipe!.action === 'super_like',
          },
        });
      }

      // 5. 마지막 활동 시간 업데이트
      await tx.matchProfile.update({
        where: { id: myProfile.id },
        data: { lastActiveAt: new Date() },
      });

      return { swipe, connection };
    });

    return NextResponse.json({
      success: true,
      isMatch,
      swipeId: result.swipe.id,
      connectionId: result.connection?.id || null,
    });
  } catch (error) {
    logger.error('[destiny-match/swipe] POST error:', { error: error });
    return NextResponse.json(
      { error: 'Failed to process swipe' },
      { status: 500 }
    );
  }
}
