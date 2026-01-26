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
  if (!Array.isArray(value)) {return [];}
  const cleaned: string[] = [];
  for (const entry of value.slice(0, maxItems)) {
    if (typeof entry !== "string") {continue;}
    const trimmed = entry.trim();
    if (!trimmed) {continue;}
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

  if (!Array.isArray(raw)) {return [];}

  // Handle edge case: maxMessages of 0 should return empty array
  if (maxMessages === 0) {return [];}

  const normalized: ChatMessage[] = [];
  for (const m of raw.slice(-maxMessages)) {
    if (!isRecord(m)) {continue;}

    const role =
      typeof m.role === "string" && allowedRoles.has(m.role as ChatRole)
        ? (m.role as ChatRole)
        : null;
    const content = typeof m.content === "string" ? m.content.trim() : "";

    if (!role) {continue;}

    // Slice content first, then check if it's empty
    const slicedContent = content.slice(0, maxLength);
    if (!slicedContent) {continue;}

    normalized.push({ role, content: slicedContent });
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
  if (typeof value !== "string") {return defaultValue;}
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
  if (typeof value !== "number" || !Number.isFinite(value)) {return defaultValue;}
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitize boolean value
 */
export function sanitizeBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") {return value;}
  return defaultValue;
}

// Dangerous HTML patterns for server-side sanitization
const SCRIPT_PATTERN = /<script[\s\S]*?<\/script>/gi;
const STYLE_PATTERN = /<style[\s\S]*?<\/style>/gi;
const EVENT_HANDLER_PATTERN = /\s+on\w+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_URL_PATTERN = /javascript\s*:/gi;
const DATA_URL_PATTERN = /data\s*:\s*text\/html/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const DANGEROUS_CHARS_PATTERN = /[<>{}]/g;

/**
 * Sanitize HTML content - comprehensive XSS protection
 * Strips all HTML tags and returns plain text
 * Use for user-generated content that might contain HTML
 */
export function sanitizeHtml(
  value: unknown,
  maxLen = 10000,
  defaultValue = ""
): string {
  if (typeof value !== "string") {return defaultValue;}

  return value
    .replace(SCRIPT_PATTERN, "")           // Remove script tags
    .replace(STYLE_PATTERN, "")            // Remove style tags
    .replace(EVENT_HANDLER_PATTERN, "")    // Remove event handlers (onclick, onerror, etc.)
    .replace(JAVASCRIPT_URL_PATTERN, "")   // Remove javascript: URLs
    .replace(DATA_URL_PATTERN, "")         // Remove data:text/html URLs
    .replace(HTML_TAG_PATTERN, "")         // Remove all HTML tags
    .replace(DANGEROUS_CHARS_PATTERN, "")  // Remove dangerous chars
    .trim()
    .slice(0, maxLen);
}

/**
 * Sanitize HTML content but allow safe tags
 * Use when you want to preserve some formatting (bold, italic, links)
 * Note: For more complex HTML sanitization, consider using DOMPurify on client-side
 */
export function sanitizeHtmlSafe(
  value: unknown,
  maxLen = 10000,
  defaultValue = ""
): string {
  if (typeof value !== "string") {return defaultValue;}

  // First remove dangerous content
  let sanitized = value
    .replace(SCRIPT_PATTERN, "")
    .replace(STYLE_PATTERN, "")
    .replace(EVENT_HANDLER_PATTERN, "")
    .replace(JAVASCRIPT_URL_PATTERN, "")
    .replace(DATA_URL_PATTERN, "");

  // Only allow specific safe tags
  const ALLOWED_TAGS = ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"];
  const allowedTagsPattern = new RegExp(
    `<(?!\\/?(${ALLOWED_TAGS.join("|")})(\\s|>|\\/))[^>]*>`,
    "gi"
  );
  sanitized = sanitized.replace(allowedTagsPattern, "");

  // Clean href attributes on links - only allow http/https
  sanitized = sanitized.replace(
    /href\s*=\s*["'](?!https?:\/\/)[^"']*["']/gi,
    'href="#"'
  );

  return sanitized.trim().slice(0, maxLen);
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
