import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    // Safe JSON parsing
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === "") {
        return NextResponse.json({ error: "empty_body" }, { status: HTTP_STATUS.BAD_REQUEST });
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const { sessionId, theme, locale, messages } = body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "invalid_request" }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // Get user first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: HTTP_STATUS.NOT_FOUND });
    }

    // Upsert: create if not exists, update if exists
    const chatSession = await prisma.counselorChatSession.upsert({
      where: { id: sessionId },
      update: {
        messages,
        messageCount: messages.length,
        lastMessageAt: new Date(),
      },
      create: {
        id: sessionId,
        userId: user.id,
        theme: theme || "chat",
        locale: locale || "ko",
        messages,
        messageCount: messages.length,
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, sessionId: chatSession.id });
  } catch (error) {
    logger.error("[Counselor Session Save Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
