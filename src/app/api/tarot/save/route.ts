import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

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

    if (!question || !spreadId || !spreadTitle || !cards || cards.length === 0) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
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
    console.error("[Tarot Save Error]:", error);
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
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const theme = searchParams.get("theme");

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
    console.error("[Tarot List Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
