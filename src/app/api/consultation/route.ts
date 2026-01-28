import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import Stripe from "stripe";
import { logger } from '@/lib/logger';

import { parseRequestBody } from '@/lib/api/requestParser';
export const dynamic = "force-dynamic";

const STRIPE_API_VERSION = "2025-10-29.clover" as Stripe.LatestApiVersion;

type ConsultationBody = {
  theme?: string;
  summary?: string;
  fullReport?: string;
  jungQuotes?: unknown;
  signals?: unknown;
  userQuestion?: string;
  locale?: string;
};

// 이메일 형식 검증 (Stripe 쿼리 인젝션 방지)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Stripe 구독 확인 (프리미엄 체크)
async function checkStripeActive(email?: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !email || !isValidEmail(email)) {return false;}

  const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  // Use parameterized API to prevent query injection
  const customers = await stripe.customers.list({
    email: email.toLowerCase(),
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
    if (active) {return true;}
  }
  return false;
}

// POST: 상담 기록 저장 (프리미엄 전용)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // 프리미엄 체크 - 상담 기록 저장은 프리미엄 전용
    const isPremium = await checkStripeActive(session.user.email);
    if (!isPremium) {
      return NextResponse.json(
        {
          error: "premium_required",
          message: "상담 기록 저장은 프리미엄 구독자 전용입니다.",
          message_en: "Saving consultation history is available for premium subscribers only."
        },
        { status: 402 }
      );
    }

    const body = (await request.json().catch(() => null)) as ConsultationBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const {
      theme,
      summary,
      fullReport,
      jungQuotes,
      signals,
      userQuestion,
      locale = "ko",
    } = body;

    if (!theme || !summary || !fullReport) {
      return NextResponse.json(
        { error: "Missing required fields: theme, summary, fullReport" },
        { status: 400 }
      );
    }

    // 상담 기록 저장
    const consultation = await prisma.consultationHistory.create({
      data: {
        userId: session.user.id,
        theme,
        summary,
        fullReport,
        jungQuotes: jungQuotes || undefined,
        signals: signals || undefined,
        userQuestion: userQuestion || undefined,
        locale,
      },
    });

    // 페르소나 메모리 업데이트 (세션 카운트 증가, 테마 추가)
    await updatePersonaMemory(session.user.id, theme);

    return NextResponse.json({
      success: true,
      id: consultation.id,
      createdAt: consultation.createdAt,
    });
  } catch (err: unknown) {
    logger.error("[Consultation POST error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET: 상담 기록 목록 조회 (프리미엄 전용)
export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    // 쿼리 빌드
    const where: { userId: string; theme?: string } = { userId: session.user.id };
    if (theme) {
      where.theme = theme;
    }

    const [consultations, total] = await Promise.all([
      prisma.consultationHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          theme: true,
          summary: true,
          createdAt: true,
          locale: true,
          userQuestion: true,
        },
      }),
      prisma.consultationHistory.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: consultations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + consultations.length < total,
      },
    });
  } catch (err: unknown) {
    logger.error("[Consultation GET error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 페르소나 메모리 업데이트 헬퍼
async function updatePersonaMemory(userId: string, theme: string) {
  try {
    const existing = await prisma.personaMemory.findUnique({
      where: { userId },
    });

    if (existing) {
      // 기존 메모리 업데이트
      const currentThemes = (existing.dominantThemes as string[]) || [];
      const lastTopics = (existing.lastTopics as string[]) || [];

      // 테마 빈도 업데이트
      if (!currentThemes.includes(theme)) {
        currentThemes.push(theme);
      }

      // 최근 토픽 업데이트 (최대 10개)
      const updatedLastTopics = [theme, ...lastTopics.filter(t => t !== theme)].slice(0, 10);

      await prisma.personaMemory.update({
        where: { userId },
        data: {
          dominantThemes: currentThemes,
          lastTopics: updatedLastTopics,
          sessionCount: existing.sessionCount + 1,
        },
      });
    } else {
      // 새 메모리 생성
      await prisma.personaMemory.create({
        data: {
          userId,
          dominantThemes: [theme],
          lastTopics: [theme],
          sessionCount: 1,
        },
      });
    }
  } catch (err) {
    logger.error("[updatePersonaMemory error]", err);
    // 메모리 업데이트 실패해도 상담 저장은 성공으로 처리
  }
}
