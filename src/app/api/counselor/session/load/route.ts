import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    let chatSession;

    if (sessionId) {
      // Load specific session by ID
      chatSession = await prisma.counselorChatSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
        },
      });
    } else {
      // Get most recent session for this theme
      chatSession = await prisma.counselorChatSession.findFirst({
        where: {
          userId: user.id,
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
    console.error("[Counselor Session Load Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
