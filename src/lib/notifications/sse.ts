/**
 * Server-Side Events Notification Manager
 * Manages SSE connections and sends real-time notifications
 * Uses Redis for cross-instance notification delivery
 */

import { recordCounter, recordGauge } from "@/lib/metrics";

// Store active connections (local to this instance)
const clients = new Map<string, ReadableStreamDefaultController>();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export interface NotificationPayload {
  type: "like" | "comment" | "reply" | "mention" | "system";
  title: string;
  message: string;
  link?: string;
  avatar?: string;
}

/**
 * Register a new SSE client connection
 */
export function registerClient(
  userId: string,
  controller: ReadableStreamDefaultController
): void {
  clients.set(userId, controller);
  recordCounter("sse_client_connect", 1, { user: "masked" });
  recordGauge("sse_active_connections", clients.size);

  // Store connection info in Redis with 1 hour TTL
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    storeConnectionInRedis(userId).catch((err) => {
      console.error("[SSE] Failed to register in Redis:", err);
    });
  }
}

/**
 * Unregister an SSE client connection
 */
export function unregisterClient(userId: string): void {
  clients.delete(userId);
  recordCounter("sse_client_disconnect", 1, { user: "masked" });
  recordGauge("sse_active_connections", clients.size);

  // Remove from Redis
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    removeConnectionFromRedis(userId).catch((err) => {
      console.error("[SSE] Failed to unregister from Redis:", err);
    });
  }
}

/**
 * Send a notification to a specific user
 * Uses Redis pub/sub to reach user across all server instances
 */
export async function sendNotification(
  userId: string,
  notification: NotificationPayload
): Promise<boolean> {
  const data = {
    id: Date.now().toString(),
    ...notification,
    createdAt: Date.now(),
    read: false,
  };

  // Try local connection first
  const controller = clients.get(userId);
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch (error) {
      console.error("[SSE] Error sending to local connection:", error);
      clients.delete(userId);
    }
  }

  // If no local connection, use Redis pub/sub
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await publishNotificationToRedis(userId, data);
      return true;
    } catch (error) {
      console.error("[SSE] Failed to publish to Redis:", error);
    }
  }

  // Silently fail if user is not connected anywhere
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[SSE] User ${userId} is not connected (${clients.size} active local connections)`);
  }
  return false;
}

/**
 * Store connection info in Redis
 */
async function storeConnectionInRedis(userId: string): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;

  const key = `sse:connection:${userId}`;
  await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["SET", key, Date.now().toString(), "EX", 3600], // 1 hour TTL
    ]),
    cache: "no-store",
  });
}

/**
 * Remove connection info from Redis
 */
async function removeConnectionFromRedis(userId: string): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;

  const key = `sse:connection:${userId}`;
  await fetch(`${UPSTASH_URL}/del/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    cache: "no-store",
  });
}

/**
 * Publish notification to Redis pub/sub channel
 */
async function publishNotificationToRedis(userId: string, notification: unknown): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;

  const channel = `sse:notify:${userId}`;
  await fetch(`${UPSTASH_URL}/publish/${encodeURIComponent(channel)}/${encodeURIComponent(JSON.stringify(notification))}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    cache: "no-store",
  });
}

/**
 * Get all active SSE connections count
 */
export function getActiveConnectionsCount(): number {
  return clients.size;
}

/**
 * Get all connected user IDs
 */
export function getConnectedUsers(): string[] {
  return Array.from(clients.keys());
}

/**
 * Check if a user is connected
 */
export function isUserConnected(userId: string): boolean {
  return clients.has(userId);
}
