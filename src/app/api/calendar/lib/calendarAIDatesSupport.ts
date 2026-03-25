/**
 * @file Calendar AI date enrichment support
 * Isolates backend validation, circuit state, and AI date fetch orchestration.
 */

import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api/ApiClient'

type AIDatesCircuitState = {
  consecutiveFailures: number
  openUntilMs: number
}

const DEFAULT_AI_DATES_TIMEOUT_MS = 12000
const DEFAULT_AI_DATES_RETRIES = 1
const DEFAULT_AI_DATES_RETRY_DELAY_MS = 400
const DEFAULT_AI_DATES_FAILURE_THRESHOLD = 2
const DEFAULT_AI_DATES_COOLDOWN_MS = 3 * 60 * 1000

const aiDatesCircuitState: AIDatesCircuitState = {
  consecutiveFailures: 0,
  openUntilMs: 0,
}

export function validateBackendUrl(url: string) {
  if (!url.startsWith('https://') && process.env.NODE_ENV === 'production') {
    logger.warn('[Calendar API] Using non-HTTPS AI backend in production')
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    logger.warn('[Calendar API] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL')
  }
}

function parsePositiveInt(
  rawValue: string | undefined,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
): number {
  if (!rawValue) return fallback
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return fallback
  const rounded = Math.floor(parsed)
  if (rounded < min) return fallback
  if (rounded > max) return max
  return rounded
}

function readAIDatesCircuitConfig() {
  const circuitEnabled =
    process.env.CALENDAR_AI_ENRICHMENT_CIRCUIT_ENABLED === 'true' || process.env.NODE_ENV !== 'test'

  return {
    disabled: process.env.CALENDAR_AI_ENRICHMENT_DISABLED === 'true',
    circuitEnabled,
    timeoutMs: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_TIMEOUT_MS,
      DEFAULT_AI_DATES_TIMEOUT_MS,
      1000,
      60000
    ),
    retries: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_RETRIES,
      DEFAULT_AI_DATES_RETRIES,
      0,
      5
    ),
    retryDelayMs: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_RETRY_DELAY_MS,
      DEFAULT_AI_DATES_RETRY_DELAY_MS,
      0,
      10000
    ),
    failureThreshold: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_FAILURE_THRESHOLD,
      DEFAULT_AI_DATES_FAILURE_THRESHOLD,
      1,
      20
    ),
    cooldownMs: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_COOLDOWN_MS,
      DEFAULT_AI_DATES_COOLDOWN_MS,
      1000,
      60 * 60 * 1000
    ),
  }
}

function isAIDatesCircuitOpen(nowMs: number): boolean {
  return aiDatesCircuitState.openUntilMs > nowMs
}

function markAIDatesFailure(nowMs: number, failureThreshold: number, cooldownMs: number): void {
  aiDatesCircuitState.consecutiveFailures += 1
  if (aiDatesCircuitState.consecutiveFailures >= failureThreshold) {
    aiDatesCircuitState.openUntilMs = nowMs + cooldownMs
  }
}

function resetAIDatesFailureState(): void {
  aiDatesCircuitState.consecutiveFailures = 0
  aiDatesCircuitState.openUntilMs = 0
}

export function __resetAIDatesCircuitStateForTests(): void {
  resetAIDatesFailureState()
}

export async function fetchAIDates(
  sajuData: Record<string, unknown>,
  astroData: Record<string, unknown>,
  theme: string = 'overall'
): Promise<{
  auspicious: Array<{ date?: string; description?: string; is_auspicious?: boolean }>
  caution: Array<{ date?: string; description?: string; is_auspicious?: boolean }>
} | null> {
  const nowMs = Date.now()
  const config = readAIDatesCircuitConfig()

  if (config.disabled) {
    logger.info('[Calendar] AI enrichment disabled via env flag')
    return null
  }

  if (config.circuitEnabled && isAIDatesCircuitOpen(nowMs)) {
    logger.warn('[Calendar] AI enrichment circuit open, skipping call', {
      retryAfterMs: Math.max(0, aiDatesCircuitState.openUntilMs - nowMs),
      consecutiveFailures: aiDatesCircuitState.consecutiveFailures,
    })
    return null
  }

  try {
    const response = await apiClient.post(
      '/api/theme/important-dates',
      {
        theme,
        saju: sajuData,
        astro: astroData,
      },
      {
        timeout: config.timeoutMs,
        retries: config.retries,
        retryDelay: config.retryDelayMs,
      }
    )

    if (response.ok && response.data) {
      resetAIDatesFailureState()
      const resData = response.data as { auspicious_dates?: string[]; caution_dates?: string[] }
      return {
        auspicious: (resData.auspicious_dates || []).map((date) => ({ date, is_auspicious: true })),
        caution: (resData.caution_dates || []).map((date) => ({ date, is_auspicious: false })),
      }
    }

    if (config.circuitEnabled) {
      markAIDatesFailure(nowMs, config.failureThreshold, config.cooldownMs)
    }
    logger.warn('[Calendar] AI backend returned non-ok response', {
      status: response.status,
      error: response.error,
      consecutiveFailures: aiDatesCircuitState.consecutiveFailures,
      circuitOpenUntilMs: aiDatesCircuitState.openUntilMs,
    })
  } catch (error) {
    if (config.circuitEnabled) {
      markAIDatesFailure(nowMs, config.failureThreshold, config.cooldownMs)
    }
    logger.warn('[Calendar] AI backend not available, using local calculation:', error)
  }

  return null
}
