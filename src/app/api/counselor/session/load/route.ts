import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme") || "chat";
    const sessionId = searchParams.get("sessionId");

    // Single query with join through user relation
    let chatSession;

    if (sessionId) {
      // Load specific session by ID with email check
      chatSession = await prisma.counselorChatSession.findFirst({
        where: {
          id: sessionId,
          user: { email: session.user.email },
        },
      });
    } else {
      // Get most recent session for this theme
      chatSession = await prisma.counselorChatSession.findFirst({
        where: {
          user: { email: session.user.email },
          theme,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }

    if (!chatSession) {
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({
      sessionId: chatSession.id,
      messages: chatSession.messages,
      summary: chatSession.summary,
      keyTopics: chatSession.keyTopics,
    });
  } catch (error) {
    logger.error("[Counselor Session Load Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
