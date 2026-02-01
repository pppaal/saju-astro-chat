/**
 * Server-Side Events Notification Manager
 * Manages SSE connections and sends real-time notifications
 * Uses Redis for cross-instance notification delivery
 */

import { recordCounter, recordGauge } from "@/lib/metrics";
import { logger } from "@/lib/logger";

// Store active connections (local to this instance)
const clients = new Map<string, ReadableStreamDefaultController>();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_TTL_SECONDS = 3600;
const QUEUE_MAX_ITEMS = 100;

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
      logger.error("[SSE] Failed to register in Redis:", err);
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
      logger.error("[SSE] Failed to unregister from Redis:", err);
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
      logger.error("[SSE] Error sending to local connection:", error);
      clients.delete(userId);
    }
  }

  // If no local connection, queue for other instances
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const queued = await queueNotificationInRedis(userId, data);
      if (queued) {
        return true;
      }
    } catch (error) {
      logger.error("[SSE] Failed to queue in Redis:", error);
    }
  }

  // Silently fail if user is not connected anywhere
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[SSE] User ${userId} is not connected (${clients.size} active local connections)`);
  }
  return false;
}

/**
 * Store connection info in Redis
 */
async function storeConnectionInRedis(userId: string): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {return;}

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
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {return;}

  const key = `sse:connection:${userId}`;
  await fetch(`${UPSTASH_URL}/del/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    cache: "no-store",
  });
}

/**
 * Queue notification in Redis for cross-instance delivery
 */
async function queueNotificationInRedis(userId: string, notification: unknown): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {return false;}

  const key = `sse:queue:${userId}`;
  const payload = JSON.stringify(notification);

  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["LPUSH", key, payload],
      ["LTRIM", key, 0, QUEUE_MAX_ITEMS - 1],
      ["EXPIRE", key, QUEUE_TTL_SECONDS],
    ]),
    cache: "no-store",
  });

  return res.ok;
}

/**
 * Drain queued notifications for a user (FIFO)
 */
export async function drainQueuedNotifications(
  userId: string,
  maxItems: number = 20
): Promise<unknown[]> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {return [];}

  const key = `sse:queue:${userId}`;
  const safeMax = Math.max(1, Math.min(maxItems, QUEUE_MAX_ITEMS));

  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["LRANGE", key, 0, safeMax - 1],
        ["LTRIM", key, safeMax, -1],
      ]),
      cache: "no-store",
    });

    if (!res.ok) {return [];}

    const data = await res.json();
    if (!Array.isArray(data) || !data[0] || !Array.isArray(data[0].result)) {
      return [];
    }

    const rawItems = data[0].result as unknown[];
    const parsed: unknown[] = [];
    for (const item of rawItems) {
      if (typeof item !== "string") {continue;}
      try {
        parsed.push(JSON.parse(item));
      } catch {
        // Skip malformed entries
      }
    }

    return parsed;
  } catch (error) {
    logger.error("[SSE] Failed to drain queue:", error);
    return [];
  }
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
