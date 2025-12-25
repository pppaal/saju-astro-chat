import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

// GET: 개별 상담 기록 조회 (프리미엄 전용)
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "invalid_params" }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // 프리미엄 체크
    const isPremium = await checkStripeActive(session.user.email);
    if (!isPremium) {
      return NextResponse.json(
        {
          error: "premium_required",
          message: "상담 기록 열람은 프리미엄 구독자 전용입니다.",
          message_en: "Consultation history is available for premium subscribers only."
        },
        { status: 402 }
      );
    }

    const consultation = await prisma.consultationHistory.findFirst({
      where: {
        id,
        userId: session.user.id, // 본인 기록만 조회 가능
      },
    });

    if (!consultation) {
      return NextResponse.json(
        { error: "not_found", message: "상담 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: consultation,
    });
  } catch (err: unknown) {
    console.error("[Consultation GET by ID error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: 상담 기록 삭제 (본인 기록만)
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "invalid_params" }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // 본인 기록인지 확인
    const existing = await prisma.consultationHistory.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "not_found", message: "상담 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.consultationHistory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "상담 기록이 삭제되었습니다.",
    });
  } catch (err: unknown) {
    console.error("[Consultation DELETE error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
