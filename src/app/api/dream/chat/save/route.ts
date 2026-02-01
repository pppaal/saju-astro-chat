// src/app/api/dream/chat/save/route.ts
// Dream Chat History Save API - 드림 상담 대화 저장

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { logger } from '@/lib/logger';
import { type ChatMessage } from "@/lib/api";

import { parseRequestBody } from '@/lib/api/requestParser';
import { HTTP_STATUS } from '@/lib/constants/http';
interface SaveDreamChatRequest {
  dreamId?: string;  // Optional: link to existing dream interpretation
  dreamText: string;
  messages: ChatMessage[];
  summary?: string;
  locale?: string;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`dream-chat-save:${ip}`, { limit: 30, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      );
    }

    // Auth check - only logged in users can save
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Login required to save chat history" },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers }
      );
    }

    const body = await parseRequestBody<SaveDreamChatRequest>(req, { context: 'Dream Chat Save' });
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      );
    }

    const { dreamText, messages, summary, locale = "ko" } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages to save" },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      );
    }

    // Build full report from messages
    const fullReport = messages
      .map(m => `${m.role === "user" ? "👤" : "🌙"} ${m.content}`)
      .join("\n\n");

    // Extract summary from first assistant message if not provided
    const autoSummary = summary ||
      messages.find(m => m.role === "assistant")?.content.slice(0, 200) ||
      "드림 상담";

    // Extract user questions for context
    const userQuestions = messages
      .filter(m => m.role === "user")
      .map(m => m.content)
      .join(" | ");

    // Save to ConsultationHistory
    const consultation = await prisma.consultationHistory.create({
      data: {
        userId: session.user.id,
        theme: "dream",
        summary: autoSummary,
        fullReport,
        jungQuotes: undefined,  // Could be enhanced to extract Jung quotes from responses
        signals: dreamText ? { dreamText: dreamText.slice(0, 1000) } : undefined,
        userQuestion: userQuestions.slice(0, 500),
        locale,
      },
    });

    // Update PersonaMemory
    try {
      const existing = await prisma.personaMemory.findUnique({
        where: { userId: session.user.id },
      });

      if (existing) {
        const lastTopics = (existing.lastTopics as string[]) || [];
        const dominantThemes = (existing.dominantThemes as string[]) || [];

        // Add "dream" to themes if not present
        if (!dominantThemes.includes("dream")) {
          dominantThemes.push("dream");
        }

        // Add to recent topics
        const updatedTopics = ["dream", ...lastTopics.filter(t => t !== "dream")].slice(0, 10);

        await prisma.personaMemory.update({
          where: { userId: session.user.id },
          data: {
            dominantThemes,
            lastTopics: updatedTopics,
            sessionCount: existing.sessionCount + 1,
          },
        });
      } else {
        await prisma.personaMemory.create({
          data: {
            userId: session.user.id,
            dominantThemes: ["dream"],
            lastTopics: ["dream"],
            sessionCount: 1,
          },
        });
      }
    } catch (memoryError) {
      logger.error("[DreamChatSave] PersonaMemory update failed:", memoryError);
      // Continue - main save succeeded
    }

    return NextResponse.json({
      success: true,
      consultationId: consultation.id,
      message: "Chat history saved",
    }, { headers: limit.headers });

  } catch (err) {
    logger.error("[DreamChatSave] Error:", err);
    return NextResponse.json(
      { error: "Failed to save chat history" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}

// GET - 이전 드림 상담 기록 조회
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`dream-chat-history:${ip}`, { limit: 30, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Login required" },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers }
      );
    }

    const { searchParams } = new URL(req.url);
    const limitCount = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    // Get recent dream consultations
    const consultations = await prisma.consultationHistory.findMany({
      where: {
        userId: session.user.id,
        theme: "dream",
      },
      orderBy: { createdAt: "desc" },
      take: limitCount,
      select: {
        id: true,
        createdAt: true,
        summary: true,
        fullReport: true,
        signals: true,
        userQuestion: true,
      },
    });

    // Get persona memory for context
    const memory = await prisma.personaMemory.findUnique({
      where: { userId: session.user.id },
      select: {
        sessionCount: true,
        dominantThemes: true,
        lastTopics: true,
        keyInsights: true,
        emotionalTone: true,
      },
    });

    return NextResponse.json({
      consultations: consultations.map(c => ({
        id: c.id,
        createdAt: c.createdAt.toISOString(),
        summary: c.summary,
        dreamText: (c.signals as Record<string, unknown>)?.dreamText || null,
        userQuestions: c.userQuestion,
        // Parse fullReport back to messages
        messages: parseMessagesFromReport(c.fullReport),
      })),
      memory: memory ? {
        sessionCount: memory.sessionCount,
        dominantThemes: memory.dominantThemes,
        recentTopics: memory.lastTopics,
        keyInsights: memory.keyInsights,
        emotionalTone: memory.emotionalTone,
      } : null,
    }, { headers: limit.headers });

  } catch (err) {
    logger.error("[DreamChatHistory] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}

// Helper to parse messages from saved fullReport
function parseMessagesFromReport(fullReport: string): ChatMessage[] {
  if (!fullReport) {return [];}

  const messages: ChatMessage[] = [];
  const parts = fullReport.split(/\n\n/);

  for (const part of parts) {
    if (part.startsWith("👤")) {
      messages.push({ role: "user", content: part.slice(2).trim() });
    } else if (part.startsWith("🌙")) {
      messages.push({ role: "assistant", content: part.slice(2).trim() });
    }
  }

  return messages;
}
