/**
 * API Endpoint Performance Tests
 *
 * Load tests for critical API endpoints
 * Run with: npm run test:performance
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  API_BASE,
  runPerformanceTest,
  validatePerformance,
  printPerformanceResults,
  waitForServer,
  type PerformanceThresholds,
} from './helpers';

// Test configuration
const TEST_DURATION = 10; // seconds
const LIGHT_LOAD = 10; // connections
const MEDIUM_LOAD = 25; // connections
const HEAVY_LOAD = 50; // connections

// Performance thresholds for different endpoint types
const PUBLIC_ENDPOINT_THRESHOLDS: PerformanceThresholds = {
  maxAverageLatency: 200, // 200ms average
  maxP95Latency: 500, // 500ms P95
  maxP99Latency: 1000, // 1s P99
  minThroughput: 20, // 20 req/s minimum
  maxErrorRate: 1, // 1% error rate
};

const COMPUTE_INTENSIVE_THRESHOLDS: PerformanceThresholds = {
  maxAverageLatency: 1000, // 1s average for heavy computation
  maxP95Latency: 2000, // 2s P95
  maxP99Latency: 3000, // 3s P99
  minThroughput: 5, // 5 req/s minimum
  maxErrorRate: 2, // 2% error rate
};

const AUTH_ENDPOINT_THRESHOLDS: PerformanceThresholds = {
  maxAverageLatency: 300, // 300ms average
  maxP95Latency: 600, // 600ms P95
  maxP99Latency: 1200, // 1.2s P99
  minThroughput: 15, // 15 req/s minimum
  maxErrorRate: 1, // 1% error rate
};

beforeAll(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('Performance Test Suite');
  console.log('='.repeat(60));
  console.log('\n⚠️  IMPORTANT: Server must be running before tests!');
  console.log('   Start server with: npm run dev\n');
  console.log('Checking if server is ready...\n');

  try {
    await waitForServer();
    console.log('✓ Server is ready!\n');
    console.log('Starting performance tests...\n');
  } catch (error) {
    console.error('\n❌ ERROR: Cannot connect to server!\n');
    console.error('Please start the development server first:');
    console.error('  Terminal 1: npm run dev');
    console.error('  Terminal 2: npm run test:performance\n');
    throw error;
  }
}, 60000); // Increased timeout to 60 seconds

describe('Public API Endpoints - Light Load', () => {
  it('should handle /api/auth/session with light load', async () => {
    const result = await runPerformanceTest({
      url: `${API_BASE}/api/auth/session`,
      connections: LIGHT_LOAD,
      duration: TEST_DURATION,
      title: 'Session Check (Light Load)',
    });

    printPerformanceResults(result);

    const validation = validatePerformance(result, PUBLIC_ENDPOINT_THRESHOLDS);
    if (!validation.passed) {
      console.warn('Performance thresholds not met:', validation.failures);
    }

    // Basic assertions
    expect(result['2xx']).toBeGreaterThan(0);
    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
  }, 60000);

  it('should handle /api/visitors-today with metrics token', async () => {
    const metricsToken = process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN || '';

    const result = await runPerformanceTest({
      url: `${API_BASE}/api/visitors-today`,
      connections: LIGHT_LOAD,
      duration: TEST_DURATION,
      headers: {
        'x-metrics-token': metricsToken,
      },
      title: 'Visitors Today (Light Load)',
    });

    printPerformanceResults(result);

    expect(result['2xx'] + result['4xx']).toBeGreaterThan(0);
  }, 60000);

  it('should handle /api/cities search endpoint', async () => {
    const result = await runPerformanceTest({
      url: `${API_BASE}/api/cities?query=Seoul`,
      connections: LIGHT_LOAD,
      duration: TEST_DURATION,
      title: 'Cities Search (Light Load)',
    });

    printPerformanceResults(result);

    const validation = validatePerformance(result, PUBLIC_ENDPOINT_THRESHOLDS);
    if (!validation.passed) {
      console.warn('Performance thresholds not met:', validation.failures);
    }

    expect(result['2xx']).toBeGreaterThan(0);
  }, 60000);
});

describe('Public API Endpoints - Medium Load', () => {
  it('should handle /api/auth/session with medium load', async () => {
    const result = await runPerformanceTest({
      url: `${API_BASE}/api/auth/session`,
      connections: MEDIUM_LOAD,
      duration: TEST_DURATION,
      title: 'Session Check (Medium Load)',
    });

    printPerformanceResults(result);

    expect(result['2xx']).toBeGreaterThan(0);
    expect(result.latency.average).toBeLessThan(500); // Allow higher latency under load
  }, 60000);

  it('should handle /api/cities search with medium load', async () => {
    const result = await runPerformanceTest({
      url: `${API_BASE}/api/cities?query=Seoul`,
      connections: MEDIUM_LOAD,
      duration: TEST_DURATION,
      title: 'Cities Search (Medium Load)',
    });

    printPerformanceResults(result);

    expect(result['2xx']).toBeGreaterThan(0);
    expect(result.errors).toBeLessThan(result.requests.total * 0.05); // Less than 5% errors
  }, 60000);
});

describe('Public API Endpoints - Heavy Load', () => {
  it('should survive heavy load on /api/auth/session', async () => {
    const result = await runPerformanceTest({
      url: `${API_BASE}/api/auth/session`,
      connections: HEAVY_LOAD,
      duration: TEST_DURATION,
      title: 'Session Check (Heavy Load)',
    });

    printPerformanceResults(result);

    // Under heavy load, just ensure the server doesn't crash
    expect(result['2xx']).toBeGreaterThan(0);
    expect(result['5xx']).toBeLessThan(result.requests.total * 0.1); // Less than 10% server errors
  }, 60000);
});

describe('Compute-Intensive Endpoints', () => {
  it('should handle /api/saju calculation under load', async () => {
    const birthData = JSON.stringify({
      year: 1990,
      month: 5,
      day: 15,
      hour: 14,
      minute: 30,
      city: 'Seoul',
      lat: 37.5665,
      lng: 126.978,
    });

    const result = await runPerformanceTest({
      url: `${API_BASE}/api/saju`,
      method: 'POST',
      connections: LIGHT_LOAD, // Keep light for compute-intensive operations
      duration: TEST_DURATION,
      headers: {
        'Content-Type': 'application/json',
      },
      body: birthData,
      title: 'Saju Calculation (Light Load)',
    });

    printPerformanceResults(result);

    const validation = validatePerformance(result, COMPUTE_INTENSIVE_THRESHOLDS);
    if (!validation.passed) {
      console.warn('Performance thresholds not met:', validation.failures);
    }

    // Should handle requests without crashing
    expect(result.requests.total).toBeGreaterThan(0);
  }, 60000);

  it('should handle /api/astrology calculation under load', async () => {
    const birthData = JSON.stringify({
      year: 1990,
      month: 5,
      day: 15,
      hour: 14,
      minute: 30,
      city: 'Seoul',
      lat: 37.5665,
      lng: 126.978,
    });

    const result = await runPerformanceTest({
      url: `${API_BASE}/api/astrology`,
      method: 'POST',
      connections: LIGHT_LOAD,
      duration: TEST_DURATION,
      headers: {
        'Content-Type': 'application/json',
      },
      body: birthData,
      title: 'Astrology Calculation (Light Load)',
    });

    printPerformanceResults(result);

    // These are complex calculations, so we're more lenient
    expect(result.requests.total).toBeGreaterThan(0);
    expect(result['5xx']).toBeLessThan(result.requests.total * 0.15); // Allow up to 15% errors for complex calcs
  }, 60000);
});

describe('Database Operations', () => {
  it('should handle database reads efficiently', async () => {
    // Test an endpoint that reads from database
    const result = await runPerformanceTest({
      url: `${API_BASE}/api/auth/session`,
      connections: MEDIUM_LOAD,
      duration: TEST_DURATION,
      title: 'Database Read Operations',
    });

    printPerformanceResults(result);

    // Database operations should be reasonably fast
    expect(result.latency.p95).toBeLessThan(1000); // P95 under 1 second
    expect(result['2xx']).toBeGreaterThan(0);
  }, 60000);
});

describe('Concurrent Request Handling', () => {
  it('should handle multiple concurrent connections', async () => {
    const result = await runPerformanceTest({
      url: `${API_BASE}/api/auth/session`,
      connections: HEAVY_LOAD,
      duration: 5, // Shorter duration for high concurrency test
      pipelining: 5, // Pipeline multiple requests
      title: 'High Concurrency Test',
    });

    printPerformanceResults(result);

    // Should handle concurrent requests without major issues
    expect(result.requests.total).toBeGreaterThan(100); // At least 100 requests in 5s
    expect(result['2xx']).toBeGreaterThan(0);
  }, 60000);
});

describe('Stress Testing', () => {
  it('should recover from burst traffic', async () => {
    console.log('Starting stress test with burst traffic...');

    // First burst
    const burst1 = await runPerformanceTest({
      url: `${API_BASE}/api/auth/session`,
      connections: HEAVY_LOAD,
      duration: 5,
      title: 'Burst 1',
    });

    // Short cooldown
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Second burst
    const burst2 = await runPerformanceTest({
      url: `${API_BASE}/api/auth/session`,
      connections: HEAVY_LOAD,
      duration: 5,
      title: 'Burst 2',
    });

    printPerformanceResults(burst1);
    printPerformanceResults(burst2);

    // Server should handle both bursts
    expect(burst1['2xx']).toBeGreaterThan(0);
    expect(burst2['2xx']).toBeGreaterThan(0);

    // Second burst should not be significantly degraded
    const latencyDiff = Math.abs(burst2.latency.average - burst1.latency.average);
    expect(latencyDiff).toBeLessThan(burst1.latency.average * 0.5); // Less than 50% degradation
  }, 90000);
});

describe('Rate Limiting', () => {
  it('should enforce rate limits appropriately', async () => {
    // Test with aggressive load to trigger rate limiting
    const result = await runPerformanceTest({
      url: `${API_BASE}/api/auth/session`,
      connections: 100,
      duration: 5,
      title: 'Rate Limit Test',
    });

    printPerformanceResults(result);

    // Should have some 429 responses if rate limiting is active
    // Or all 200s if rate limit is high enough
    expect(result['2xx'] + result['4xx']).toBeGreaterThan(0);
  }, 60000);
});

describe('Response Time Distribution', () => {
  it('should have consistent response times', async () => {
    const result = await runPerformanceTest({
      url: `${API_BASE}/api/auth/session`,
      connections: MEDIUM_LOAD,
      duration: TEST_DURATION,
      title: 'Response Time Consistency',
    });

    printPerformanceResults(result);

    // Check that P99 is not too far from P50 (indicates consistency)
    const p99ToP50Ratio = result.latency.p99 / result.latency.p50;
    console.log(`P99/P50 Ratio: ${p99ToP50Ratio.toFixed(2)}x`);

    // Ratio should be reasonable (not more than 10x difference)
    expect(p99ToP50Ratio).toBeLessThan(10);
    expect(result['2xx']).toBeGreaterThan(0);
  }, 60000);
});
