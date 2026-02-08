/**
 * Safe JSON parsing utility
 * Prevents JSON.parse from throwing exceptions on invalid input
 */

import { logger } from '@/lib/logger'

/**
 * Safely parse JSON string with type inference
 * Returns null on invalid JSON instead of throwing
 *
 * @param json - The JSON string to parse
 * @param fallback - Optional fallback value (defaults to null)
 * @returns Parsed value or fallback
 *
 * @example
 * const data = safeJsonParse<User>('{"name": "John"}');
 * // data: User | null
 *
 * @example
 * const data = safeJsonParse<Config>('invalid', { timeout: 30 });
 * // data: Config (fallback value)
 */
export function safeJsonParse<T>(json: string): T | null
export function safeJsonParse<T>(json: string, fallback: T): T
export function safeJsonParse<T>(json: string, fallback?: T): T | null {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    logger.debug('[safeJsonParse] Failed to parse JSON:', {
      preview: json.slice(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return fallback ?? null
  }
}

/**
 * Safely parse JSON with validation function
 * Returns null if parsing fails OR validation fails
 *
 * @param json - The JSON string to parse
 * @param validator - Function to validate the parsed result
 * @returns Validated value or null
 *
 * @example
 * const user = safeJsonParseWithValidation<User>(
 *   jsonString,
 *   (data) => typeof data.name === 'string'
 * );
 */
export function safeJsonParseWithValidation<T>(
  json: string,
  validator: (data: unknown) => data is T
): T | null {
  try {
    const parsed = JSON.parse(json)
    if (validator(parsed)) {
      return parsed
    }
    logger.debug('[safeJsonParseWithValidation] Validation failed')
    return null
  } catch (error) {
    logger.debug('[safeJsonParseWithValidation] Failed to parse JSON:', {
      preview: json.slice(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * Extract and parse JSON from a string that may contain non-JSON content
 * Useful for parsing AI responses that include JSON within text
 *
 * @param text - Text that may contain JSON
 * @returns Parsed JSON object or null
 *
 * @example
 * const response = "Here's the data: {\"name\": \"test\"} and more text";
 * const data = extractJsonFromText<{ name: string }>(response);
 * // data: { name: "test" }
 */
export function extractJsonFromText<T>(text: string): T | null {
  try {
    // Try to find JSON object pattern
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    return JSON.parse(jsonMatch[0]) as T
  } catch (error) {
    logger.debug('[extractJsonFromText] Failed to extract/parse JSON:', {
      preview: text.slice(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}
