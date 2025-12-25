// Backend AI health check and fallback logic

import { recordCounter, recordTiming } from "@/lib/metrics";

interface HealthStatus {
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const MAX_FAILURES = 3;
const CIRCUIT_BREAK_DURATION = 300000; // 5 minutes

let healthStatus: HealthStatus = {
  healthy: true,
  lastCheck: 0,
  consecutiveFailures: 0,
};

/**
 * Check backend AI health
 */
export async function checkBackendHealth(backendUrl: string): Promise<boolean> {
  const now = Date.now();

  // Circuit breaker: if too many failures, wait before retry
  if (!healthStatus.healthy && now - healthStatus.lastCheck < CIRCUIT_BREAK_DURATION) {
    console.warn(`[Backend] Circuit breaker active. Skipping health check.`);
    return false;
  }

  // Rate limit health checks
  if (now - healthStatus.lastCheck < HEALTH_CHECK_INTERVAL) {
    return healthStatus.healthy;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const start = Date.now();

    const response = await fetch(`${backendUrl}/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ADMIN_API_TOKEN
          ? { 'X-API-KEY': process.env.ADMIN_API_TOKEN }
          : {}),
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      recordTiming("backend.health.latency_ms", Date.now() - start, { backendUrl });
      recordCounter("backend.health.success", 1, { backendUrl });
      healthStatus = {
        healthy: true,
        lastCheck: now,
        consecutiveFailures: 0,
      };
      console.warn(`[Backend] Health check passed ✅`);
      return true;
    }
  } catch (error) {
    console.error(`[Backend] Health check failed:`, error);
  }

  // Record failure
  recordCounter("backend.health.failure", 1, { backendUrl });
  healthStatus.consecutiveFailures++;
  healthStatus.lastCheck = now;

  if (healthStatus.consecutiveFailures >= MAX_FAILURES) {
    healthStatus.healthy = false;
    console.error(`[Backend] Circuit breaker OPENED after ${MAX_FAILURES} failures 🔴`);
  }

  return false;
}

/**
 * Call backend with health check and fallback
 */
export async function callBackendWithFallback<T>(
  backendUrl: string,
  endpoint: string,
  body: any,
  fallbackResponse: T
): Promise<{ success: boolean; data: T }> {
  // Check health first
  const isHealthy = await checkBackendHealth(backendUrl);

  if (!isHealthy) {
    console.warn(`[Backend] Unhealthy, using fallback response`);
    return { success: false, data: fallbackResponse };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minutes
    const start = Date.now();

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ADMIN_API_TOKEN
          ? { 'X-API-KEY': process.env.ADMIN_API_TOKEN }
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Backend error ${response.status}`);
    }

    const data = await response.json();
    recordTiming("backend.call.latency_ms", Date.now() - start, { endpoint });
    recordCounter("backend.call.success", 1, { endpoint });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error(`[Backend] Request failed:`, error);
    recordCounter("backend.call.failure", 1, { endpoint });

    // Record failure
    healthStatus.consecutiveFailures++;
    if (healthStatus.consecutiveFailures >= MAX_FAILURES) {
      healthStatus.healthy = false;
    }

    return { success: false, data: fallbackResponse };
  }
}

/**
 * Get current health status
 */
export function getHealthStatus(): HealthStatus {
  return { ...healthStatus };
}

/**
 * Reset health status (for testing/admin)
 */
export function resetHealthStatus(): void {
  healthStatus = {
    healthy: true,
    lastCheck: 0,
    consecutiveFailures: 0,
  };
  console.warn(`[Backend] Health status reset ✅`);
}
