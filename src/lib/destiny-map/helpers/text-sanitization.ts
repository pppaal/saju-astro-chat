/**
 * Text Sanitization Utilities
 * 텍스트 정화 유틸리티
 *
 * This module provides utilities for cleaning and sanitizing text content,
 * particularly for removing dangerous HTML/script content while preserving
 * valid JSON structures and markdown formatting.
 */

/**
 * Basic cleansing to remove HTML/script/style directives
 *
 * IMPORTANT: Preserves JSON structure (curly braces) for structured responses.
 * This function intelligently detects whether the input is JSON or markdown/text
 * and applies appropriate sanitization strategies.
 *
 * **For JSON responses:**
 * - Preserves JSON structure (curly braces, quotes)
 * - Only removes dangerous content (scripts, styles, event handlers)
 * - Maintains data integrity
 *
 * **For Markdown/Text responses:**
 * - Removes all HTML tags
 * - Removes script and style tags
 * - Removes event handlers
 * - Cleans up whitespace
 *
 * @param raw - Raw text input that may contain HTML, scripts, or malicious content
 * @returns Sanitized text safe for display
 *
 * @example
 * ```typescript
 * // JSON response - preserves structure
 * const json = cleanseText('{"title": "Test", "script": "<script>alert(1)</script>"}');
 * // Result: '{"title": "Test", "script": ""}'
 *
 * // Markdown response - removes HTML
 * const md = cleanseText('# Title\n<script>alert(1)</script>\n<p>Content</p>');
 * // Result: '# Title\n\nContent'
 * ```
 */
export function cleanseText(raw: string): string {
  if (!raw) {return "";}

  // Check if this is a JSON response
  const isJsonResponse =
    raw.trim().startsWith("{") ||
    raw.includes('"lifeTimeline"') ||
    raw.includes('"categoryAnalysis"');

  if (isJsonResponse) {
    // For JSON responses, only clean dangerous content but preserve structure
    return raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove event handlers like onclick="..."
      .replace(/on\w+\s*=\s*[^\s>]*/gi, "") // Remove event handlers without quotes
      .trim();
  }

  // For non-JSON (markdown/text) responses, do full cleansing
  // IMPORTANT: Remove script/style tags FIRST before removing other HTML tags
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "") // Remove scripts first
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")   // Remove styles first
    .replace(/<\/?[^>]+(>|$)/g, "")                       // Then remove other HTML tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")         // Remove event handlers like onclick="..."
    .replace(/on\w+\s*=\s*[^\s>]*/gi, "")                 // Remove event handlers without quotes
    .replace(/@import.*?;/gi, "")
    .replace(
      /(html|body|svg|button|form|document\.write|font\-family|background)/gi,
      ""
    )
    .replace(/&nbsp;/g, " ")
    .replace(/[<>]/g, "") // Only remove angle brackets, NOT curly braces
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Detect if text is a JSON response
 *
 * @param text - Text to check
 * @returns True if text appears to be JSON
 */
export function isJsonResponse(text: string): boolean {
  if (!text) {return false;}
  const trimmed = text.trim();
  return (
    trimmed.startsWith("{") ||
    trimmed.includes('"lifeTimeline"') ||
    trimmed.includes('"categoryAnalysis"')
  );
}
