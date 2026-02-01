/**
 * Destiny Match Swipe API
 * 좋아요/패스/슈퍼라이크 처리
 */
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { calculateDetailedCompatibility } from '@/lib/destiny-match/quickCompatibility'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'

// POST - 스와이프 처리
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!

      const { targetProfileId, action, compatibilityScore } = await req.json()

      // 유효성 검증
      if (!targetProfileId) {
        return NextResponse.json(
          { error: 'targetProfileId is required' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      if (!['like', 'pass', 'super_like'].includes(action)) {
        return NextResponse.json(
          { error: 'Invalid action. Must be like, pass, or super_like' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // ✅ N+1 쿼리 최적화: 내 프로필과 대상 프로필을 병렬로 조회
      const [myProfile, targetProfile] = await Promise.all([
        prisma.matchProfile.findUnique({
          where: { userId },
          include: {
            user: {
              select: {
                birthDate: true,
                birthTime: true,
                gender: true,
              },
            },
          },
        }),
        prisma.matchProfile.findUnique({
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
        }),
      ])

      if (!myProfile) {
        return NextResponse.json(
          { error: '먼저 매칭 프로필을 설정해주세요' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      if (!targetProfile) {
        return NextResponse.json(
          { error: '대상 프로필을 찾을 수 없습니다' },
          { status: HTTP_STATUS.NOT_FOUND }
        )
      }

      // Super Like 일일 리셋 체크 (myProfile을 let으로 변경)
      let updatedMyProfile = myProfile
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const lastReset = myProfile.superLikeResetAt ? new Date(myProfile.superLikeResetAt) : null

      if (!lastReset || lastReset < today) {
        // 오늘 첫 접속이거나 마지막 리셋이 어제 이전이면 리셋
        const updated = await prisma.matchProfile.update({
          where: { userId },
          data: {
            superLikeCount: 3, // 일일 3개로 리셋
            superLikeResetAt: new Date(),
          },
        })
        // user 정보는 유지
        updatedMyProfile = { ...updated, user: myProfile.user }
      }

      // 자기 자신 스와이프 방지
      if (targetProfile.userId === userId) {
        return NextResponse.json(
          { error: '자신에게 스와이프할 수 없습니다' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // 슈퍼라이크 카운트 확인
      if (action === 'super_like' && updatedMyProfile.superLikeCount <= 0) {
        return NextResponse.json(
          { error: '슈퍼라이크를 모두 사용했습니다' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // 이미 스와이프했는지 확인
      const existingSwipe = await prisma.matchSwipe.findUnique({
        where: {
          swiperId_targetId: {
            swiperId: updatedMyProfile.id,
            targetId: targetProfileId,
          },
        },
      })

      if (existingSwipe) {
        return NextResponse.json(
          { error: '이미 스와이프한 프로필입니다' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // 상대방이 나에게 이미 like 했는지 확인
      const reverseSwipe = await prisma.matchSwipe.findUnique({
        where: {
          swiperId_targetId: {
            swiperId: targetProfileId,
            targetId: updatedMyProfile.id,
          },
        },
      })

      const isMatch =
        (action === 'like' || action === 'super_like') &&
        reverseSwipe &&
        (reverseSwipe.action === 'like' || reverseSwipe.action === 'super_like')

      // 트랜잭션으로 처리
      const result = await prisma.$transaction(async (tx) => {
        // 1. 스와이프 생성
        const swipe = await tx.matchSwipe.create({
          data: {
            swiperId: updatedMyProfile.id,
            targetId: targetProfileId,
            action,
            compatibilityScore: compatibilityScore || null,
            isMatched: isMatch ?? false,
            matchedAt: isMatch ? new Date() : undefined,
          },
        })

        // 2. 프로필 통계 업데이트
        if (action === 'like' || action === 'super_like') {
          // 내 likesGiven 증가
          await tx.matchProfile.update({
            where: { id: updatedMyProfile.id },
            data: { likesGiven: { increment: 1 } },
          })

          // 상대방 likesReceived 증가
          await tx.matchProfile.update({
            where: { id: targetProfileId },
            data: { likesReceived: { increment: 1 } },
          })
        }

        // 3. 슈퍼라이크 사용 시 카운트 감소
        if (action === 'super_like') {
          await tx.matchProfile.update({
            where: { id: updatedMyProfile.id },
            data: { superLikeCount: { decrement: 1 } },
          })
        }

        // 4. 매치 성사 시
        let connection = null
        if (isMatch) {
          // 상대방 스와이프도 isMatched로 업데이트
          await tx.matchSwipe.update({
            where: { id: reverseSwipe!.id },
            data: {
              isMatched: true,
              matchedAt: new Date(),
            },
          })

          // 양쪽 matchCount 증가
          await tx.matchProfile.update({
            where: { id: updatedMyProfile.id },
            data: { matchCount: { increment: 1 } },
          })
          await tx.matchProfile.update({
            where: { id: targetProfileId },
            data: { matchCount: { increment: 1 } },
          })

          // 상세 궁합 분석 (매치 성사 시)
          let detailedCompatibility = null
          if (updatedMyProfile.user.birthDate && targetProfile.user.birthDate) {
            try {
              detailedCompatibility = await calculateDetailedCompatibility(
                {
                  birthDate: updatedMyProfile.user.birthDate,
                  birthTime: updatedMyProfile.user.birthTime || undefined,
                  gender: updatedMyProfile.user.gender || undefined,
                },
                {
                  birthDate: targetProfile.user.birthDate,
                  birthTime: targetProfile.user.birthTime || undefined,
                  gender: targetProfile.user.gender || undefined,
                }
              )
            } catch (e) {
              logger.warn('[swipe] Detailed compatibility failed:', { e })
            }
          }

          // MatchConnection 생성
          const [user1Id, user2Id] =
            updatedMyProfile.id < targetProfileId
              ? [updatedMyProfile.id, targetProfileId]
              : [targetProfileId, updatedMyProfile.id]

          connection = await tx.matchConnection.create({
            data: {
              user1Id,
              user2Id,
              compatibilityScore: detailedCompatibility?.score || compatibilityScore || null,
              compatibilityData: detailedCompatibility || undefined,
              isSuperLikeMatch: action === 'super_like' || reverseSwipe!.action === 'super_like',
            },
          })
        }

        // 5. 마지막 활동 시간 업데이트
        await tx.matchProfile.update({
          where: { id: updatedMyProfile.id },
          data: { lastActiveAt: new Date() },
        })

        return { swipe, connection }
      })

      return NextResponse.json({
        success: true,
        isMatch,
        swipeId: result.swipe.id,
        connectionId: result.connection?.id || null,
      })
    } catch (error) {
      logger.error('[destiny-match/swipe] POST error:', { error: error })
      return NextResponse.json(
        { error: 'Failed to process swipe' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/swipe',
    limit: 30,
    windowSeconds: 60,
  })
)

// DELETE - 스와이프 되돌리기 (Undo)
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!

      const { swipeId } = await req.json()

      if (!swipeId) {
        return NextResponse.json(
          { error: 'swipeId is required' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // 내 프로필 조회
      const myProfile = await prisma.matchProfile.findUnique({
        where: { userId },
      })

      if (!myProfile) {
        return NextResponse.json(
          { error: '매칭 프로필을 찾을 수 없습니다' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // 스와이프 조회
      const swipe = await prisma.matchSwipe.findUnique({
        where: { id: swipeId },
      })

      if (!swipe) {
        return NextResponse.json(
          { error: '스와이프를 찾을 수 없습니다' },
          { status: HTTP_STATUS.NOT_FOUND }
        )
      }

      // 본인 스와이프만 되돌리기 가능
      if (swipe.swiperId !== myProfile.id) {
        return NextResponse.json(
          { error: '본인의 스와이프만 되돌릴 수 있습니다' },
          { status: HTTP_STATUS.FORBIDDEN }
        )
      }

      // 5분 이내만 되돌리기 가능
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      if (swipe.createdAt < fiveMinutesAgo) {
        return NextResponse.json(
          { error: '5분 이내의 스와이프만 되돌릴 수 있습니다' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // 이미 매칭된 경우 되돌리기 불가
      if (swipe.isMatched) {
        return NextResponse.json(
          { error: '이미 매칭된 스와이프는 되돌릴 수 없습니다' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // 트랜잭션으로 되돌리기
      await prisma.$transaction(async (tx) => {
        // 스와이프 삭제
        await tx.matchSwipe.delete({ where: { id: swipeId } })

        // 통계 롤백
        if (swipe.action === 'like' || swipe.action === 'super_like') {
          await tx.matchProfile.update({
            where: { id: myProfile.id },
            data: { likesGiven: { decrement: 1 } },
          })
          await tx.matchProfile.update({
            where: { id: swipe.targetId },
            data: { likesReceived: { decrement: 1 } },
          })
        }

        // 슈퍼라이크 복원
        if (swipe.action === 'super_like') {
          await tx.matchProfile.update({
            where: { id: myProfile.id },
            data: { superLikeCount: { increment: 1 } },
          })
        }
      })

      logger.info('[destiny-match/swipe] Undo swipe', {
        userId,
        swipeId,
        action: swipe.action,
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      logger.error('[destiny-match/swipe] DELETE error:', { error })
      return NextResponse.json(
        { error: 'Failed to undo swipe' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/swipe',
    limit: 10,
    windowSeconds: 60,
  })
)
