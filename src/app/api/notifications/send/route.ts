import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { sendNotification } from "@/lib/notifications/sse";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/send
 * Send a notification to a user (for testing or from other API routes)
 */
export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ip = getClientIp(_request.headers);
    const limit = await rateLimit(`notify:${session.user.id ?? session.user.email}:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: limit.headers });
    }

    const body = await _request.json();
    const { targetUserId, type, title, message, link, avatar } = body;

    if (!targetUserId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const allowedTargets = new Set(
      [session.user.id, session.user.email].filter(Boolean) as string[]
    );
    if (!allowedTargets.has(targetUserId)) {
      return NextResponse.json(
        { error: "Forbidden: cannot send to other users" },
        { status: 403, headers: limit.headers }
      );
    }

    const sent = await sendNotification(targetUserId, {
      type,
      title,
      message,
      link,
      avatar,
    });

    return NextResponse.json({
      success: sent,
      message: sent
        ? "Notification sent"
        : "User not connected to notification stream",
    }, { headers: limit.headers });
  } catch (error) {
    logger.error("Error in send notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/send
 * Test endpoint to send a sample notification
 */
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(_request.headers);
  const limit = await rateLimit(`notify:test:${session.user.id ?? session.user.email}:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: limit.headers });
  }

  // Send a test notification to the current user
  const sent = await sendNotification(session.user.email, {
    type: "system",
    title: "Test Notification",
    message: "This is a test notification from the system",
    link: "/notifications",
  });

  return NextResponse.json({
    success: sent,
    message: sent ? "Test notification sent" : "You are not connected to SSE",
  }, { headers: limit.headers });
}
