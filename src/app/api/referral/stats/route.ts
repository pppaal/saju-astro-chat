import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const userId = session.user.id;

    // Get or create referral code
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user?.referralCode) {
      // Generate unique referral code (8 characters)
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      user = { referralCode: code };
    }

    // 최적화: Prisma aggregation 사용 (메모리 필터링 제거)
    const [totalReferrals, pendingCount, completedStats] = await Promise.all([
      prisma.user.count({
        where: { referrerId: userId },
      }),
      prisma.referralReward.count({
        where: { userId, status: "pending" },
      }),
      prisma.referralReward.aggregate({
        where: { userId, status: "completed" },
        _count: true,
        _sum: { creditsAwarded: true },
      }),
    ]);

    const pendingRewards = pendingCount;
    const completedRewards = completedStats._count;
    const totalCreditsEarned = completedStats._sum.creditsAwarded || 0;

    return NextResponse.json({
      referralCode: user.referralCode,
      totalReferrals,
      pendingRewards,
      completedRewards,
      totalCreditsEarned,
    });
  } catch (error) {
    logger.error("Referral stats error:", { error: error });
    return NextResponse.json(
      { error: "Failed to fetch referral stats" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
