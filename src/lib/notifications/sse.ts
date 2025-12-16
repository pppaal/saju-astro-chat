/**
 * Server-Side Events Notification Manager
 * Manages SSE connections and sends real-time notifications
 */

import { recordCounter, recordGauge } from "@/lib/metrics";

// Store active connections
const clients = new Map<string, ReadableStreamDefaultController>();

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
}

/**
 * Unregister an SSE client connection
 */
export function unregisterClient(userId: string): void {
  clients.delete(userId);
  recordCounter("sse_client_disconnect", 1, { user: "masked" });
  recordGauge("sse_active_connections", clients.size);
}

/**
 * Send a notification to a specific user
 * This function can be called from any API route
 */
export function sendNotification(
  userId: string,
  notification: NotificationPayload
): boolean {
  const controller = clients.get(userId);

  if (!controller) {
    console.log(`User ${userId} is not connected to SSE`);
    return false;
  }

  const data = JSON.stringify({
    id: Date.now().toString(),
    ...notification,
    createdAt: Date.now(),
    read: false,
  });

  try {
    controller.enqueue(`data: ${data}\n\n`);
    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    clients.delete(userId);
    return false;
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
