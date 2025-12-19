import { prisma } from "@/lib/db/prisma";
import { addBonusCredits } from "@/lib/credits/creditService";
import { randomBytes } from "crypto";

const REFERRAL_CREDITS = 5; // 추천 시 지급 크레딧

// 고유 추천 코드 생성 (8자리)
export function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

// 유저의 추천 코드 조회 (없으면 생성)
export async function getUserReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (user?.referralCode) {
    return user.referralCode;
  }

  // 새 코드 생성
  const newCode = generateReferralCode();
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: newCode },
  });

  return newCode;
}

// 추천 코드로 추천인 찾기
export async function findUserByReferralCode(code: string) {
  return prisma.user.findFirst({
    where: { referralCode: code.toUpperCase() },
    select: { id: true, name: true, referralCode: true },
  });
}

// 회원가입 시 추천인 연결
export async function linkReferrer(
  newUserId: string,
  referralCode: string
): Promise<{ success: boolean; referrerId?: string; error?: string }> {
  try {
    const referrer = await findUserByReferralCode(referralCode);
    if (!referrer) {
      return { success: false, error: "invalid_code" };
    }

    // 자기 자신 추천 방지
    if (referrer.id === newUserId) {
      return { success: false, error: "self_referral" };
    }

    // 추천인 연결
    await prisma.user.update({
      where: { id: newUserId },
      data: { referrerId: referrer.id },
    });

    // 보상 대기 레코드 생성 (첫 분석 완료 시 지급)
    await prisma.referralReward.create({
      data: {
        userId: referrer.id,
        referredUserId: newUserId,
        creditsAwarded: REFERRAL_CREDITS,
        rewardType: "first_analysis",
        status: "pending",
      },
    });

    return { success: true, referrerId: referrer.id };
  } catch (error: any) {
    console.error("[linkReferrer] error:", error);
    return { success: false, error: error.message };
  }
}

// 첫 분석 완료 시 추천 보상 지급
export async function claimReferralReward(
  referredUserId: string
): Promise<{ success: boolean; creditsAwarded?: number; error?: string }> {
  try {
    // 대기 중인 보상 찾기
    const pendingReward = await prisma.referralReward.findFirst({
      where: {
        referredUserId,
        status: "pending",
        rewardType: "first_analysis",
      },
    });

    if (!pendingReward) {
      return { success: false, error: "no_pending_reward" };
    }

    // 추천인에게 크레딧 지급
    await addBonusCredits(pendingReward.userId, pendingReward.creditsAwarded);

    // 보상 상태 업데이트
    await prisma.referralReward.update({
      where: { id: pendingReward.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    return { success: true, creditsAwarded: pendingReward.creditsAwarded };
  } catch (error: any) {
    console.error("[claimReferralReward] error:", error);
    return { success: false, error: error.message };
  }
}

// 내 추천 현황 조회
export async function getReferralStats(userId: string) {
  const [user, referrals, rewards] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
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
      orderBy: { createdAt: "desc" },
    }),
    prisma.referralReward.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 코드가 없으면 생성
  const referralCode = user?.referralCode || (await getUserReferralCode(userId));

  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter((r) => r.readings.length > 0).length;
  const pendingReferrals = totalReferrals - completedReferrals;
  const totalCreditsEarned = rewards
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.creditsAwarded, 0);

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
      name: r.name || "Anonymous",
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
  };
}

// 추천 링크 URL 생성
export function getReferralUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.me";
  return `${base}/destiny-pal?ref=${code}`;
}
