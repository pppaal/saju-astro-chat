import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { addBonusCredits, claimBonusPurchaseForRefund } from '@/lib/credits/creditService'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
// 추천 보상 — 친구의 첫 결제 시점에 지급. 액수는 rewards.ts(SSOT)에서 —
// 노출 카피(ReferralInviteButton)와 지급 로직이 같은 숫자를 읽게 한다.
// 양쪽 모두 받게 해서 추천 동기 + 친구의 결제 동기 둘 다 잡는다.
import { REFERRER_CREDITS, REFEREE_CREDITS } from './rewards'
// 후방 호환 — linkReferrer 가 pending 행에 기록하는 추천인 보상 액수.
const REFERRAL_CREDITS = REFERRER_CREDITS

// 고유 추천 코드 생성 (8자리)
export function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

// 유저의 추천 코드 조회 (없으면 생성)
export async function getUserReferralCode(userId: string): Promise<string> {
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { referralCode: true },
  })

  if (userSettings?.referralCode) {
    return userSettings.referralCode
  }

  // 새 코드 생성
  const newCode = generateReferralCode()
  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, referralCode: newCode },
    update: { referralCode: newCode },
  })

  return newCode
}

// 추천 코드로 추천인 찾기
export async function findUserByReferralCode(code: string) {
  const settings = await prisma.userSettings.findFirst({
    where: { referralCode: code.toUpperCase() },
    select: { userId: true, referralCode: true, user: { select: { id: true, name: true } } },
  })

  if (!settings) {
    return null
  }

  return {
    id: settings.userId,
    name: settings.user.name,
    referralCode: settings.referralCode,
  }
}

// 회원가입 시 추천인 연결
export async function linkReferrer(
  newUserId: string,
  referralCode: string
): Promise<{ success: boolean; referrerId?: string; error?: string }> {
  try {
    const referrer = await findUserByReferralCode(referralCode)
    if (!referrer) {
      return { success: false, error: 'invalid_code' }
    }

    // 자기 자신 추천 방지
    if (referrer.id === newUserId) {
      return { success: false, error: 'self_referral' }
    }

    // 멱등성 + race 가드 (한 번에)
    //
    // 이전엔 findUnique 로 referrerId 확인 → update 였는데, 두 동시 요청이
    // 그 사이에 인터리브 되면 둘 다 통과해서 ReferralReward 가 두 번
    // 생성될 수 있었음 (서로 추천 시도하는 두 계정 동시 가입 시 1 회 가입
    // 으로 15+15 = 30 크레딧 파밍 가능).
    //
    // updateMany 의 where 절에 `referrerId: null` 을 넣어서 "아직 비어
    // 있을 때만" 채우게 만들면 race 한 쪽이 진 경우 count=0 으로 돌아옴
    // → 보상 생성 안 함.
    const linkResult = await prisma.user.updateMany({
      where: { id: newUserId, referrerId: null },
      data: { referrerId: referrer.id },
    })
    if (linkResult.count === 0) {
      // 이미 다른 요청이 referrerId 를 채움 (또는 사용자가 없음).
      return { success: false, error: 'already_linked' }
    }

    // 어뷰징(멀티 계정 파밍) 방지: 가입만으로는 지급하지 않고 보상을 pending
    // 으로 예약한다. 피추천자가 첫 크레딧팩 결제를 완료하면(웹훅에서
    // grantReferralRewardOnFirstPurchase 호출) 그때 추천인에게 지급한다.
    // ReferralReward 의 (userId, referredUserId, rewardType) UNIQUE 가 2차
    // 가드 — updateMany race 가 뚫려도 P2002 로 두 번째 create 막힘.
    try {
      await prisma.referralReward.create({
        data: {
          userId: referrer.id,
          referredUserId: newUserId,
          creditsAwarded: REFERRAL_CREDITS,
          rewardType: 'first_purchase',
          status: 'pending',
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        logger.warn('[linkReferrer] duplicate ReferralReward blocked by unique constraint', {
          referrerId: referrer.id,
          referredUserId: newUserId,
        })
        return { success: false, error: 'already_linked' }
      }
      throw err
    }

    return { success: true, referrerId: referrer.id }
  } catch (error: unknown) {
    logger.error('[linkReferrer] error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 피추천자가 첫 결제(크레딧팩 구매)를 완료하면 추천인에게 보상 지급.
// Stripe 웹훅(handleCheckoutCompleted)에서 구매자 크레딧 적립 직후 호출한다.
// pending 보상이 있을 때 한 번만 지급되며, 이후 결제에는 재지급되지 않는다.
export async function grantReferralRewardOnFirstPurchase(referredUserId: string): Promise<{
  granted: boolean
  referrerId?: string
  creditsAwarded?: number
  refereeBonusGranted?: boolean
  refereeBonusCredits?: number
}> {
  try {
    const pendingReward = await prisma.referralReward.findFirst({
      where: {
        referredUserId,
        status: 'pending',
        rewardType: 'first_purchase',
      },
    })

    if (!pendingReward) {
      return { granted: false }
    }

    // Pre-check the referrer still exists. If they deleted their account
    // between the link and the first purchase, addBonusCredits below
    // would crash on the User foreign key — the outer catch then logs
    // 'error' and returns { granted: false }, but ReferralReward stays
    // 'pending' so the next purchase webhook tries again, fails again,
    // and the reward never resolves. Mark it 'cancelled' so this call
    // path stops retrying, and continue on to the referee bonus path so
    // the referee isn't punished for the referrer leaving.
    const referrerUser = await prisma.user.findUnique({
      where: { id: pendingReward.userId },
      select: { email: true, name: true },
    })
    if (!referrerUser) {
      logger.warn('[grantReferralRewardOnFirstPurchase] referrer deleted, cancelling reward', {
        rewardId: pendingReward.id,
        referrerId: pendingReward.userId,
      })
      await prisma.referralReward.update({
        where: { id: pendingReward.id },
        data: { status: 'cancelled', completedAt: new Date() },
      })
      // Still grant the referee bonus — they did their part.
      let refereeBonusGranted = false
      try {
        await addBonusCredits(referredUserId, REFEREE_CREDITS, 'referral')
        refereeBonusGranted = true
      } catch (err) {
        logger.error(
          '[grantReferralRewardOnFirstPurchase] referee bonus after deleted referrer failed:',
          err
        )
      }
      return {
        granted: false,
        refereeBonusGranted,
        refereeBonusCredits: refereeBonusGranted ? REFEREE_CREDITS : 0,
      }
    }

    // Atomic claim: flip the reward from 'pending' to 'completed' in a
    // single updateMany before granting. If two webhook invocations race
    // (Stripe retry, duplicate event), only the first updateMany matches
    // (claimed.count === 1); subsequent claims see status='completed' and
    // claimed.count === 0, so they exit before re-granting credits.
    //
    // Trade-off: if addBonusCredits below throws after this claim, the
    // referrer gets no bonus and the reward is stuck at 'completed' so
    // there's no auto-retry. That's still safer than the previous order
    // (grant first, then flip), which would double-grant credits on a
    // retry whenever the status update failed after a successful grant.
    const claimed = await prisma.referralReward.updateMany({
      where: { id: pendingReward.id, status: 'pending' },
      data: { status: 'completed', completedAt: new Date() },
    })
    if (claimed.count === 0) {
      // Concurrent invocation got there first; treat this call as a no-op.
      return { granted: false }
    }
    await addBonusCredits(pendingReward.userId, pendingReward.creditsAwarded, 'referral')

    // 친구(피추천자) 본인에게도 첫 결제 보너스 지급. pendingReward 처리는
    // 이미 멱등 — 두 번째 호출 시 위에서 early return 되므로 referee 도
    // 1 회만 받음. addBonusCredits 가 실패해도 추천인 보상은 이미 완료
    // 상태이므로 log 만 남기고 silent fail.
    let refereeBonusGranted = false
    try {
      await addBonusCredits(referredUserId, REFEREE_CREDITS, 'referral')
      refereeBonusGranted = true
    } catch (err) {
      logger.error(
        '[grantReferralRewardOnFirstPurchase] Failed to grant referee first-purchase bonus:',
        err
      )
    }

    return {
      granted: true,
      referrerId: pendingReward.userId,
      creditsAwarded: pendingReward.creditsAwarded,
      refereeBonusGranted,
      refereeBonusCredits: refereeBonusGranted ? REFEREE_CREDITS : 0,
    }
  } catch (error: unknown) {
    logger.error('[grantReferralRewardOnFirstPurchase] error:', error)
    return { granted: false }
  }
}

// 특정 사용자의 source='referral' lot 하나(정확한 발급액과 일치)를 회수한다.
// remaining 경합(사용자가 그 사이 크레딧 사용) 시 소수 재시도. claimBonus-
// PurchaseForRefund 가 remaining 을 낙관적 잠금으로 보고 GREATEST(0,...) 로
// floor 하므로 이미 쓴 크레딧은 절대 마이너스로 회수되지 않는다(미사용분만 회수).
async function revokeOneReferralLot(
  userId: string,
  expectedAmount: number,
  sourceRef: string
): Promise<number> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const lot = await prisma.bonusCreditPurchase.findFirst({
      // 이 보상 크기(expectedAmount)와 일치하는 referral lot — 추천인이 여러 명을
      // 추천해 lot 이 여럿이어도 "이 보상 1건 분량"만 되돌린다.
      where: {
        userId,
        source: 'referral',
        amount: expectedAmount,
        expired: false,
        remaining: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, remaining: true },
    })
    if (!lot) return 0
    const res = await claimBonusPurchaseForRefund({
      purchaseId: lot.id,
      ownerUserId: userId,
      amount: lot.amount,
      expectedRemaining: lot.remaining,
      reason: 'referral_reversed_on_refund',
      initiatedBy: 'system',
      sourceRef,
      // requireSourcePurchase 생략 → referral lot 회수 허용.
    })
    if (res.claimed) return res.reclaimed
    // lock 실패 = remaining 이 경합으로 바뀜 → 재읽기 후 재시도.
  }
  return 0
}

/**
 * 추천 대상 구매가 환불됐을 때 그 구매가 트리거한 first_purchase 추천 보상을
 * 되돌린다 — 추천인·피추천인 양쪽의 referral 크레딧을 회수하고 보상을 'reversed'
 * 로 표시한다. (업계 표준: 추천 보상은 구매 완료가 조건이라 그 구매가 환불되면
 * 회수. 자기추천 파밍[A·B 둘 다 통제 → B가 결제·환불]을 완전히 닫는다.)
 *
 * 멱등: status completed → reversed 를 원자적 updateMany 로 claim 하므로,
 * 동시/재시도 환불이 이중 회수하지 않는다. lot 회수는 미사용분만(floored) 되므로
 * 이미 쓴 크레딧을 마이너스로 만들지 않는다. sourceRef 는 트리거한 환불의
 * stripePaymentId(원장 추적용).
 */
export async function reverseReferralRewardOnRefund(
  refundedBuyerUserId: string,
  sourceRef: string
): Promise<{ reversed: boolean; referrerReclaimed?: number; refereeReclaimed?: number }> {
  try {
    const reward = await prisma.referralReward.findFirst({
      where: {
        referredUserId: refundedBuyerUserId,
        status: 'completed',
        rewardType: 'first_purchase',
      },
    })
    if (!reward) return { reversed: false }

    // 원자적 claim — 이 환불이 보상을 되돌리는 유일한 처리자가 되게 한다.
    const claimed = await prisma.referralReward.updateMany({
      where: { id: reward.id, status: 'completed' },
      data: { status: 'reversed', completedAt: new Date() },
    })
    if (claimed.count === 0) return { reversed: false } // 동시/재시도 — 이미 처리됨

    const referrerReclaimed = await revokeOneReferralLot(
      reward.userId,
      reward.creditsAwarded,
      sourceRef
    )
    const refereeReclaimed = await revokeOneReferralLot(
      refundedBuyerUserId,
      REFEREE_CREDITS,
      sourceRef
    )

    logger.info('[reverseReferralRewardOnRefund] reversed', {
      rewardId: reward.id,
      referrerId: reward.userId,
      refereeId: refundedBuyerUserId,
      referrerReclaimed,
      refereeReclaimed,
    })
    return { reversed: true, referrerReclaimed, refereeReclaimed }
  } catch (error: unknown) {
    logger.error('[reverseReferralRewardOnRefund] error:', error)
    return { reversed: false }
  }
}

// (레거시) 첫 분석 완료 시 추천 보상 지급 — 현재 추천 보상은 친구의 첫
// 로그인 시점에 linkReferrer 로 즉시 지급된다. 이 경로는 first_analysis
// pending 보상이 생성되는 곳이 없어 사실상 호출돼도 no_pending_reward 다.
export async function claimReferralReward(
  referredUserId: string
): Promise<{ success: boolean; creditsAwarded?: number; error?: string }> {
  try {
    // 대기 중인 보상 찾기
    const pendingReward = await prisma.referralReward.findFirst({
      where: {
        referredUserId,
        status: 'pending',
        rewardType: 'first_analysis',
      },
    })

    if (!pendingReward) {
      return { success: false, error: 'no_pending_reward' }
    }

    // 추천인에게 크레딧 지급 (source 를 명시하지 않으면 addBonusCredits 기본값
    // 'purchase' 로 기록돼 결제 지표에 잡히므로 반드시 'referral' 로 지정).
    await addBonusCredits(pendingReward.userId, pendingReward.creditsAwarded, 'referral')

    // 보상 상태 업데이트
    await prisma.referralReward.update({
      where: { id: pendingReward.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    })

    return { success: true, creditsAwarded: pendingReward.creditsAwarded }
  } catch (error: unknown) {
    logger.error('[claimReferralReward] error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 내 추천 현황 조회
export async function getReferralStats(userId: string) {
  const [userSettings, referrals, rewards] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId },
      select: { referralCode: true },
    }),
    prisma.user.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        // "분석 완료 여부" — 옛 Reading 모델 제거(TarotReading + CounselorChatSession
        // 으로 대체, schema.prisma 참조) 반영. 타로 리딩 또는 상담 세션을 하나라도
        // 했으면 활동(완료)으로 본다.
        tarotReadings: { take: 1, select: { id: true } },
        counselorChatSessions: { take: 1, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.referralReward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // 코드가 없으면 생성
  const referralCode = userSettings?.referralCode || (await getUserReferralCode(userId))

  const hasAnalysis = (r: (typeof referrals)[number]) =>
    r.tarotReadings.length > 0 || r.counselorChatSessions.length > 0
  const totalReferrals = referrals.length
  const completedReferrals = referrals.filter(hasAnalysis).length
  const pendingReferrals = totalReferrals - completedReferrals
  const totalCreditsEarned = rewards
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.creditsAwarded, 0)

  return {
    referralCode,
    stats: {
      total: totalReferrals,
      completed: completedReferrals,
      pending: pendingReferrals,
      creditsEarned: totalCreditsEarned,
    },
    referrals: referrals.map((r) => ({
      id: r.id,
      name: r.name || 'Anonymous',
      joinedAt: r.createdAt,
      hasAnalysis: hasAnalysis(r),
    })),
    rewards: rewards.map((r) => ({
      id: r.id,
      credits: r.creditsAwarded,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    })),
  }
}

// 추천 링크 URL 생성
export function getReferralUrl(code: string, baseUrl?: string): string {
  // 폴백 도메인은 공유링크(siteBaseUrl)·메인 메타와 동일하게 .com 으로 통일 —
  // .me 로 어긋나면 NEXT_PUBLIC_BASE_URL 미설정 환경에서 추천 링크가 잘못된
  // 도메인을 가리켜 추천 퍼널 전체가 깨졌다.
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'
  return `${base}/?ref=${code}`
}
