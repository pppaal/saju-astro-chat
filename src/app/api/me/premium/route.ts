import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import Stripe from "stripe";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

const STRIPE_API_VERSION = "2025-10-29.clover" as Stripe.LatestApiVersion;

// 이메일 형식 검증 (Stripe 쿼리 인젝션 방지)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Stripe 구독 확인 (프리미엄 체크)
async function checkStripeActive(email?: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !email || !isValidEmail(email)) return false;

  const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  const customers = await stripe.customers.search({
    query: `email:'${email}'`,
    limit: 3,
  });

  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: "all",
      limit: 5,
    });
    const active = subs.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    );
    if (active) return true;
  }
  return false;
}

// GET: 현재 사용자의 프리미엄 상태 확인
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // 로그인 안 됨
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({
        isLoggedIn: false,
        isPremium: false,
      });
    }

    // 프리미엄 체크
    const isPremium = await checkStripeActive(session.user.email);

    return NextResponse.json({
      isLoggedIn: true,
      isPremium,
    });
  } catch (err: unknown) {
    logger.error("[Premium check error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
