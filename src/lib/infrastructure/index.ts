/**
 * Infrastructure Utilities
 * Central export for infrastructure-related utilities
 *
 * Usage:
 * import { isCircuitOpen, rateLimit, recordCounter } from '@/lib/infrastructure';
 *
 * Note: Original files remain at root level for backward compatibility.
 * This index provides a cleaner import path for new code.
 */

// Circuit Breaker - 외부 서비스 호출 실패 시 빠른 폴백
export {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  withCircuitBreaker,
  getCircuitStatus,
  resetAllCircuits,
} from '../circuitBreaker'

// Rate Limiting - API 요청 제한
export { rateLimit } from '../rateLimit'

// Metrics - 성능/사용량 측정
export {
  recordCounter,
  recordTiming,
  recordGauge,
  getMetricsSnapshot,
  resetMetrics,
  toPrometheus,
  toOtlp,
} from '../metrics'

// Telemetry - 원격 측정
export { captureServerError } from '../telemetry'

// Redis Cache
export { cacheGet, cacheSet, makeCacheKey } from '../cache/redis-cache'
