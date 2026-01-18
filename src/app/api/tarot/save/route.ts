import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

interface SaveTarotRequest {
  question: string;
  theme?: string;
  spreadId: string;
  spreadTitle: string;
  cards: Array<{
    cardId: string;
    name: string;
    image: string;
    isReversed: boolean;
    position: string;
  }>;
  overallMessage?: string;
  cardInsights?: Array<{
    position: string;
    card_name: string;
    is_reversed: boolean;
    interpretation: string;
  }>;
  guidance?: string;
  affirmation?: string;
  source?: "standalone" | "counselor";
  counselorSessionId?: string;
  locale?: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body: SaveTarotRequest = await request.json();
    const {
      question,
      theme,
      spreadId,
      spreadTitle,
      cards,
      overallMessage,
      cardInsights,
      guidance,
      affirmation,
      source = "standalone",
      counselorSessionId,
      locale = "ko",
    } = body;

    // 입력 검증 강화
    if (!question || typeof question !== 'string' || question.length > 1000) {
      return NextResponse.json({ error: "invalid_question" }, { status: 400 });
    }
    if (!spreadId || typeof spreadId !== 'string' || spreadId.length > 100) {
      return NextResponse.json({ error: "invalid_spreadId" }, { status: 400 });
    }
    if (!spreadTitle || typeof spreadTitle !== 'string' || spreadTitle.length > 200) {
      return NextResponse.json({ error: "invalid_spreadTitle" }, { status: 400 });
    }
    if (!cards || !Array.isArray(cards) || cards.length === 0 || cards.length > 20) {
      return NextResponse.json({ error: "invalid_cards" }, { status: 400 });
    }
    if (theme && (typeof theme !== 'string' || theme.length > 100)) {
      return NextResponse.json({ error: "invalid_theme" }, { status: 400 });
    }
    if (overallMessage && (typeof overallMessage !== 'string' || overallMessage.length > 5000)) {
      return NextResponse.json({ error: "invalid_overallMessage" }, { status: 400 });
    }
    if (guidance && (typeof guidance !== 'string' || guidance.length > 2000)) {
      return NextResponse.json({ error: "invalid_guidance" }, { status: 400 });
    }
    if (affirmation && (typeof affirmation !== 'string' || affirmation.length > 500)) {
      return NextResponse.json({ error: "invalid_affirmation" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const tarotReading = await prisma.tarotReading.create({
      data: {
        userId: user.id,
        question,
        theme,
        spreadId,
        spreadTitle,
        cards,
        overallMessage,
        cardInsights,
        guidance,
        affirmation,
        source,
        counselorSessionId,
        locale,
      },
    });

    return NextResponse.json({
      success: true,
      readingId: tarotReading.id,
    });
  } catch (error) {
    logger.error("[Tarot Save Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);
    const offsetParam = parseInt(searchParams.get("offset") || "0", 10);
    const theme = searchParams.get("theme");

    // 입력 검증
    const limit = Math.min(Math.max(1, limitParam), 100); // 1-100
    const offset = Math.max(0, offsetParam);
    if (theme && theme.length > 100) {
      return NextResponse.json({ error: "invalid_theme" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const where = {
      userId: user.id,
      ...(theme && { theme }),
    };

    const [readings, total] = await Promise.all([
      prisma.tarotReading.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          createdAt: true,
          question: true,
          theme: true,
          spreadTitle: true,
          cards: true,
          overallMessage: true,
          source: true,
        },
      }),
      prisma.tarotReading.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      readings,
      total,
      hasMore: offset + readings.length < total,
    });
  } catch (error) {
    logger.error("[Tarot List Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
