// src/lib/api/sanitizers.ts
// Common sanitization functions for API routes

/**
 * Type guard to check if value is a plain object
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Sanitize an array of strings with length limits
 */
export function cleanStringArray(
  value: unknown,
  maxItems = 20,
  maxLen = 60
): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned: string[] = [];
  for (const entry of value.slice(0, maxItems)) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    cleaned.push(trimmed.slice(0, maxLen));
  }
  return cleaned;
}

/**
 * Chat message role type
 */
export type ChatRole = "user" | "assistant" | "system";

/**
 * Standard chat message interface
 */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const ALLOWED_ROLES = new Set<ChatRole>(["user", "assistant", "system"]);

/**
 * Normalize and sanitize chat messages array
 */
export function normalizeMessages(
  raw: unknown,
  options: {
    maxMessages?: number;
    maxLength?: number;
    allowedRoles?: Set<ChatRole>;
  } = {}
): ChatMessage[] {
  const {
    maxMessages = 20,
    maxLength = 2000,
    allowedRoles = ALLOWED_ROLES,
  } = options;

  if (!Array.isArray(raw)) return [];

  const normalized: ChatMessage[] = [];
  for (const m of raw.slice(-maxMessages)) {
    if (!isRecord(m)) continue;

    const role =
      typeof m.role === "string" && allowedRoles.has(m.role as ChatRole)
        ? (m.role as ChatRole)
        : null;
    const content = typeof m.content === "string" ? m.content.trim() : "";

    if (!role || !content) continue;
    normalized.push({ role, content: content.slice(0, maxLength) });
  }

  return normalized;
}

/**
 * Sanitize a string field with max length
 */
export function sanitizeString(
  value: unknown,
  maxLen: number,
  defaultValue = ""
): string {
  if (typeof value !== "string") return defaultValue;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLen) : defaultValue;
}

/**
 * Sanitize number within range
 */
export function sanitizeNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitize boolean value
 */
export function sanitizeBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") return value;
  return defaultValue;
}

/**
 * Sanitize HTML content - removes script tags and dangerous characters
 * Use for user-generated content that might contain HTML
 */
export function sanitizeHtml(
  value: unknown,
  maxLen = 10000,
  defaultValue = ""
): string {
  if (typeof value !== "string") return defaultValue;
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "") // Remove script tags
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/[<>{}]/g, "") // Remove dangerous chars
    .trim()
    .slice(0, maxLen);
}

/**
 * Sanitize enum value - ensures value is one of allowed options
 */
export function sanitizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  defaultValue: T
): T {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  return defaultValue;
}
