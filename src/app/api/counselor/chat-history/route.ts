import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

// GET: 이전 대화 세션들 불러오기
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme") || undefined;
    const limit = parseInt(searchParams.get("limit") || "5");

    // 최근 대화 세션들 조회
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
        messages: true, // 최근 세션의 메시지들
      },
    });

    // 페르소나 메모리도 함께 반환 (재방문 인사용)
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
  } catch (err: any) {
    console.error("[CounselorChatHistory GET error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: 새 메시지 저장 (세션 생성/업데이트)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      sessionId,      // 기존 세션 ID (있으면 업데이트, 없으면 새로 생성)
      theme = "chat",
      locale = "ko",
      userMessage,    // 사용자 메시지
      assistantMessage, // AI 응답
    } = body;

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
      // 기존 세션 업데이트
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
      // 새 세션 생성
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

      // PersonaMemory 세션 카운트 증가
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
  } catch (err: any) {
    console.error("[CounselorChatHistory POST error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH: 세션 요약 업데이트 (대화 종료 시)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, summary, keyTopics } = body;

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
  } catch (err: any) {
    console.error("[CounselorChatHistory PATCH error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
