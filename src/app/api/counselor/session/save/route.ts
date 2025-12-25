import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, theme, locale, messages } = body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    // Check if session exists first
    const existingSession = await prisma.counselorChatSession.findFirst({
      where: {
        id: sessionId,
        user: { email: session.user.email },
      },
      select: { id: true },
    });

    if (existingSession) {
      // Update existing session
      await prisma.counselorChatSession.update({
        where: { id: sessionId },
        data: {
          messages,
          messageCount: messages.length,
          lastMessageAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, sessionId });
    }

    // Create new session - need user.id for this
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const chatSession = await prisma.counselorChatSession.create({
      data: {
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
    console.error("[Counselor Session Save Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
