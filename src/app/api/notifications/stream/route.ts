import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { registerClient, unregisterClient } from "@/lib/notifications/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events (SSE) endpoint for real-time notifications
 * GET /api/notifications/stream?userId=user@example.com
 */
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.email;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this user
      registerClient(userId, controller);

      // Send initial connection message
      const data = JSON.stringify({
        id: Date.now().toString(),
        type: "system",
        title: "Connected",
        message: "Notification system connected",
        createdAt: Date.now(),
        read: true,
      });
      controller.enqueue(`data: ${data}\n\n`);

      // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      controller.enqueue(`: heartbeat\n\n`);
    }, 30000); // Every 30 seconds

      // Cleanup on connection close
      _request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unregisterClient(userId);
        try {
          controller.close();
        } catch {
          // Controller already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
