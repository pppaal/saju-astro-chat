import { prisma } from '@/lib/db/prisma'
import { addBonusCredits } from '@/lib/credits/creditService'
import { randomBytes } from 'crypto'
import { sendReferralRewardEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

const REFERRAL_CREDITS = 3 // 추천 시 지급 크레딧

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

    // 멱등성 가드 — 이미 추천인이 연결된 사용자는 재지급 금지.
    // (link 엔드포인트가 중복 호출돼도 크레딧이 두 번 나가지 않게)
    const current = await prisma.user.findUnique({
      where: { id: newUserId },
      select: { referrerId: true },
    })
    if (current?.referrerId) {
      return { success: false, error: 'already_linked' }
    }

    // 추천인 연결
    await prisma.user.update({
      where: { id: newUserId },
      data: { referrerId: referrer.id },
    })

    // 어뷰징(멀티 계정 파밍) 방지: 가입만으로는 지급하지 않고 보상을 pending
    // 으로 예약한다. 피추천자가 첫 크레딧팩 결제를 완료하면(웹훅에서
    // grantReferralRewardOnFirstPurchase 호출) 그때 추천인에게 지급한다.
    await prisma.referralReward.create({
      data: {
        userId: referrer.id,
        referredUserId: newUserId,
        creditsAwarded: REFERRAL_CREDITS,
        rewardType: 'first_purchase',
        status: 'pending',
      },
    })

    return { success: true, referrerId: referrer.id }
  } catch (error: unknown) {
    logger.error('[linkReferrer] error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 피추천자가 첫 결제(크레딧팩 구매)를 완료하면 추천인에게 보상 지급.
// Stripe 웹훅(handleCheckoutCompleted)에서 구매자 크레딧 적립 직후 호출한다.
// pending 보상이 있을 때 한 번만 지급되며, 이후 결제에는 재지급되지 않는다.
export async function grantReferralRewardOnFirstPurchase(
  referredUserId: string
): Promise<{ granted: boolean; referrerId?: string; creditsAwarded?: number }> {
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

    await addBonusCredits(pendingReward.userId, pendingReward.creditsAwarded, 'referral')

    await prisma.referralReward.update({
      where: { id: pendingReward.id },
      data: { status: 'completed', completedAt: new Date() },
    })

    const referrerUser = await prisma.user.findUnique({
      where: { id: pendingReward.userId },
      select: { email: true, name: true },
    })
    if (referrerUser?.email) {
      sendReferralRewardEmail(pendingReward.userId, referrerUser.email, {
        userName: referrerUser.name || undefined,
        creditsAwarded: pendingReward.creditsAwarded,
      }).catch((err) => {
        logger.error('[grantReferralRewardOnFirstPurchase] Failed to send email:', err)
      })
    }

    return {
      granted: true,
      referrerId: pendingReward.userId,
      creditsAwarded: pendingReward.creditsAwarded,
    }
  } catch (error: unknown) {
    logger.error('[grantReferralRewardOnFirstPurchase] error:', error)
    return { granted: false }
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

    // 추천인에게 크레딧 지급
    await addBonusCredits(pendingReward.userId, pendingReward.creditsAwarded)

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
        readings: { take: 1, select: { id: true } }, // 분석 완료 여부
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

  const totalReferrals = referrals.length
  const completedReferrals = referrals.filter((r) => r.readings.length > 0).length
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
      hasAnalysis: r.readings.length > 0,
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
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.me'
  return `${base}/?ref=${code}`
}
