import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const reading = await prisma.tarotReading.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!reading) {
      return NextResponse.json({ error: "reading_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      reading: {
        id: reading.id,
        question: reading.question,
        theme: reading.theme,
        spreadId: reading.spreadId,
        spreadTitle: reading.spreadTitle,
        cards: reading.cards,
        overallMessage: reading.overallMessage,
        cardInsights: reading.cardInsights,
        guidance: reading.guidance,
        affirmation: reading.affirmation,
        source: reading.source,
        locale: reading.locale,
        createdAt: reading.createdAt,
      },
    });
  } catch (error) {
    logger.error("[Tarot Get Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
