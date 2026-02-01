import { recordCounter, recordTiming } from '@/lib/metrics'
import { logger } from '@/lib/logger'

type InternalHealthStatus = {
  healthy: boolean
  lastCheck: number
  lastResult: boolean
  consecutiveFailures: number
  circuitOpenedAt: number
}

const HEALTH_CHECK_INTERVAL_MS = 60_000
const CIRCUIT_BREAK_DURATION_MS = 5 * 60_000
const MAX_FAILURES = 3
const HEALTH_TIMEOUT_MS = 5_000

const healthStatus: InternalHealthStatus = {
  healthy: true,
  lastCheck: 0,
  lastResult: true,
  consecutiveFailures: 0,
  circuitOpenedAt: 0,
}

function normalizeBackendUrl(backendUrl: string) {
  return backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl
}

function getApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (process.env.ADMIN_API_TOKEN) {
    headers['X-API-KEY'] = process.env.ADMIN_API_TOKEN
  }
  return headers
}

function isCircuitActive(now: number) {
  if (!healthStatus.healthy && healthStatus.consecutiveFailures >= MAX_FAILURES) {
    if (
      healthStatus.circuitOpenedAt &&
      now - healthStatus.circuitOpenedAt < CIRCUIT_BREAK_DURATION_MS
    ) {
      return true
    }
  }
  return false
}

function markSuccess(now: number) {
  healthStatus.healthy = true
  healthStatus.consecutiveFailures = 0
  healthStatus.lastCheck = now
  healthStatus.lastResult = true
  healthStatus.circuitOpenedAt = 0
}

function markFailure(now: number) {
  healthStatus.consecutiveFailures += 1
  healthStatus.lastCheck = now
  healthStatus.lastResult = false

  if (healthStatus.consecutiveFailures >= MAX_FAILURES) {
    if (healthStatus.healthy) {
      logger.error('[Backend] Circuit breaker OPENED')
    }
    healthStatus.healthy = false
    if (!healthStatus.circuitOpenedAt) {
      healthStatus.circuitOpenedAt = now
    }
  }
}

export async function checkBackendHealth(backendUrl: string): Promise<boolean> {
  const now = Date.now()

  if (isCircuitActive(now)) {
    logger.warn('[Backend] Circuit breaker active')
    return false
  }

  if (healthStatus.lastCheck > 0 && now - healthStatus.lastCheck < HEALTH_CHECK_INTERVAL_MS) {
    return healthStatus.lastResult
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  const start = Date.now()
  const healthUrl = `${normalizeBackendUrl(backendUrl)}/`

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: getApiHeaders(),
      signal: controller.signal,
    })
    const duration = Date.now() - start
    recordTiming('backend.health.latency_ms', duration, { backendUrl })

    if (response.ok) {
      recordCounter('backend.health.success', 1, { backendUrl })
      logger.info('[Backend] Health check passed')
      markSuccess(Date.now())
      return true
    }

    recordCounter('backend.health.failure', 1, { backendUrl })
    markFailure(Date.now())
    return false
  } catch (error) {
    const duration = Date.now() - start
    recordTiming('backend.health.latency_ms', duration, { backendUrl })
    recordCounter('backend.health.failure', 1, { backendUrl })
    logger.error('[Backend] Health check error', error)
    markFailure(Date.now())
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

export function getHealthStatus() {
  return {
    healthy: healthStatus.healthy,
    lastCheck: healthStatus.lastCheck,
    consecutiveFailures: healthStatus.consecutiveFailures,
  }
}

export function resetHealthStatus() {
  healthStatus.healthy = true
  healthStatus.lastCheck = 0
  healthStatus.lastResult = true
  healthStatus.consecutiveFailures = 0
  healthStatus.circuitOpenedAt = 0
  logger.info('[Backend] Health status reset')
}

export async function callBackendWithFallback<TPayload extends Record<string, unknown>, TFallback>(
  backendUrl: string,
  endpoint: string,
  payload: TPayload,
  fallback: TFallback
): Promise<{ success: boolean; data: TFallback | unknown }> {
  const healthy = await checkBackendHealth(backendUrl)
  if (!healthy) {
    logger.warn('[Backend] Unhealthy, using fallback')
    return { success: false, data: fallback }
  }

  const normalizedBackend = normalizeBackendUrl(backendUrl)
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${normalizedBackend}${normalizedEndpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...getApiHeaders(),
  }

  const start = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const duration = Date.now() - start
    recordTiming('backend.call.latency_ms', duration, { endpoint: normalizedEndpoint })

    if (!response.ok) {
      recordCounter('backend.call.failure', 1, { endpoint: normalizedEndpoint })
      markFailure(Date.now())
      return { success: false, data: fallback }
    }

    let data: unknown = null
    try {
      data = await response.json()
    } catch (error) {
      recordCounter('backend.call.failure', 1, { endpoint: normalizedEndpoint })
      markFailure(Date.now())
      return { success: false, data: fallback }
    }

    const payloadHasData =
      data !== null &&
      typeof data === 'object' &&
      Object.prototype.hasOwnProperty.call(data, 'data')
    const responseData =
      payloadHasData &&
      (data as { data: unknown }).data !== null &&
      (data as { data: unknown }).data !== undefined
        ? (data as { data: unknown }).data
        : data

    recordCounter('backend.call.success', 1, { endpoint: normalizedEndpoint })
    return { success: true, data: responseData }
  } catch (error) {
    recordCounter('backend.call.failure', 1, { endpoint: normalizedEndpoint })
    markFailure(Date.now())
    return { success: false, data: fallback }
  }
}
