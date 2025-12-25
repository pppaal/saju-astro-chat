import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// GET: List all chat sessions for a user (optionally filtered by theme)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Single query with join through user relation
    const sessions = await prisma.counselorChatSession.findMany({
      where: {
        user: { email: session.user.email },
        ...(theme && { theme }),
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        theme: true,
        locale: true,
        messageCount: true,
        summary: true,
        keyTopics: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[Counselor Session List Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a specific chat session
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "session_id_required" }, { status: 400 });
    }

    // Single query to verify ownership and delete
    const chatSession = await prisma.counselorChatSession.findFirst({
      where: {
        id: sessionId,
        user: { email: session.user.email },
      },
    });

    if (!chatSession) {
      return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    }

    await prisma.counselorChatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Counselor Session Delete Error]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
