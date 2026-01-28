import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';

import { parseRequestBody } from '@/lib/api/requestParser';
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type CounselorChatPostBody = {
  sessionId?: string;
  theme?: string;
  locale?: string;
  userMessage?: string;
  assistantMessage?: string;
};

type CounselorChatPatchBody = {
  sessionId?: string;
  summary?: string;
  keyTopics?: string[];
};

// GET: ?? ?? ??? ????
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme") || undefined;
    const limit = parseInt(searchParams.get("limit") || "5");

    // ?? ?? ?? ??
    const chatSessions = await prisma.counselorChatSession.findMany({
      where: {
        userId: session.user.id,
        ...(theme && { theme }),
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        theme: true,
        summary: true,
        keyTopics: true,
        messageCount: true,
        lastMessageAt: true,
        createdAt: true,
        messages: true, // ?? ??? ??
      },
    });

    // ???? ??? ?? (?? ??)
    const personaMemory = await prisma.personaMemory.findUnique({
      where: { userId: session.user.id },
      select: {
        sessionCount: true,
        lastTopics: true,
        recurringIssues: true,
        emotionalTone: true,
      },
    });

    return NextResponse.json({
      success: true,
      sessions: chatSessions,
      persona: personaMemory,
      isReturningUser: (personaMemory?.sessionCount || 0) > 0,
    });
  } catch (err: unknown) {
    logger.error("[CounselorChatHistory GET error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: ? ??? ?? (?? ??/??)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as CounselorChatPostBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const theme = typeof body.theme === "string" ? body.theme : "chat";
    const locale = typeof body.locale === "string" ? body.locale : "ko";
    const userMessage = typeof body.userMessage === "string" ? body.userMessage : "";
    const assistantMessage = typeof body.assistantMessage === "string" ? body.assistantMessage : "";

    const now = new Date();
    const newMessages: ChatMessage[] = [];

    if (userMessage) {
      newMessages.push({
        role: "user",
        content: userMessage,
        timestamp: now.toISOString(),
      });
    }
    if (assistantMessage) {
      newMessages.push({
        role: "assistant",
        content: assistantMessage,
        timestamp: now.toISOString(),
      });
    }

    if (sessionId) {
      // ?? ?? ????
      const existingSession = await prisma.counselorChatSession.findUnique({
        where: { id: sessionId, userId: session.user.id },
      });

      if (!existingSession) {
        return NextResponse.json(
          { error: "session_not_found" },
          { status: 404 }
        );
      }

      const existingMessages = (existingSession.messages as ChatMessage[]) || [];
      const updatedMessages = [...existingMessages, ...newMessages];

      const updated = await prisma.counselorChatSession.update({
        where: { id: sessionId },
        data: {
          messages: updatedMessages,
          messageCount: updatedMessages.length,
          lastMessageAt: now,
        },
      });

      return NextResponse.json({
        success: true,
        session: updated,
        action: "updated",
      });
    } else {
      // ? ?? ??
      const created = await prisma.counselorChatSession.create({
        data: {
          userId: session.user.id,
          theme,
          locale,
          messages: newMessages,
          messageCount: newMessages.length,
          lastMessageAt: now,
        },
      });

      // PersonaMemory ?? ??? ??
      await prisma.personaMemory.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          sessionCount: 1,
          lastTopics: [theme],
        },
        update: {
          sessionCount: { increment: 1 },
        },
      });

      return NextResponse.json({
        success: true,
        session: created,
        action: "created",
      });
    }
  } catch (err: unknown) {
    logger.error("[CounselorChatHistory POST error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH: ?? ?? ???? (?? ?? ?)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as CounselorChatPatchBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const summary = typeof body.summary === "string" ? body.summary : "";
    const keyTopics = Array.isArray(body.keyTopics) ? body.keyTopics.filter((topic) => typeof topic === "string") : undefined;

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id_required" },
        { status: 400 }
      );
    }

    const updated = await prisma.counselorChatSession.update({
      where: { id: sessionId, userId: session.user.id },
      data: {
        ...(summary && { summary }),
        ...(keyTopics && { keyTopics }),
      },
    });

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (err: unknown) {
    logger.error("[CounselorChatHistory PATCH error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
