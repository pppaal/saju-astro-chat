/**
 * Performance Testing Helpers
 *
 * Utilities for running load and performance tests on API endpoints
 */

import * as autocannon from 'autocannon';

export const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  url: string;
  connections?: number;
  duration?: number;
  pipelining?: number;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  setupRequest?: (req: autocannon.Request) => autocannon.Request;
  title?: string;
}

/**
 * Performance test result
 */
export interface PerformanceTestResult {
  title: string;
  duration: number;
  connections: number;
  requests: {
    total: number;
    sent: number;
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  latency: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  throughput: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    total: number;
  };
  errors: number;
  timeouts: number;
  non2xx: number;
  '1xx': number;
  '2xx': number;
  '3xx': number;
  '4xx': number;
  '5xx': number;
}

/**
 * Performance thresholds for validation
 */
export interface PerformanceThresholds {
  maxAverageLatency?: number; // milliseconds
  minThroughput?: number; // requests per second
  maxErrorRate?: number; // percentage (0-100)
  maxP95Latency?: number; // milliseconds
  maxP99Latency?: number; // milliseconds
}

/**
 * Run a performance test using autocannon
 */
export async function runPerformanceTest(
  config: PerformanceTestConfig
): Promise<PerformanceTestResult> {
  const {
    url,
    connections = 10,
    duration = 10,
    pipelining = 1,
    method = 'GET',
    headers,
    body,
    setupRequest,
    title = url,
  } = config;

  const result = await autocannon({
    url,
    connections,
    duration,
    pipelining,
    method,
    headers,
    body,
    setupRequest,
  });

  return {
    title,
    duration: result.duration,
    connections: result.connections,
    requests: {
      total: result.requests.total,
      sent: result.requests.sent,
      average: result.requests.average,
      mean: result.requests.mean,
      stddev: result.requests.stddev,
      min: result.requests.min,
      max: result.requests.max,
      p50: result.requests.p50,
      p90: result.requests.p90,
      p95: result.requests.p95,
      p99: result.requests.p99,
    },
    latency: {
      average: result.latency.average,
      mean: result.latency.mean,
      stddev: result.latency.stddev,
      min: result.latency.min,
      max: result.latency.max,
      p50: result.latency.p50,
      p90: result.latency.p90,
      p95: result.latency.p95,
      p99: result.latency.p99,
    },
    throughput: {
      average: result.throughput.average,
      mean: result.throughput.mean,
      stddev: result.throughput.stddev,
      min: result.throughput.min,
      max: result.throughput.max,
      total: result.throughput.total,
    },
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx,
    '1xx': result['1xx'],
    '2xx': result['2xx'],
    '3xx': result['3xx'],
    '4xx': result['4xx'],
    '5xx': result['5xx'],
  };
}

/**
 * Validate performance test results against thresholds
 */
export function validatePerformance(
  result: PerformanceTestResult,
  thresholds: PerformanceThresholds
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  // Check average latency
  if (
    thresholds.maxAverageLatency !== undefined &&
    result.latency.average > thresholds.maxAverageLatency
  ) {
    failures.push(
      `Average latency ${result.latency.average.toFixed(2)}ms exceeds threshold ${thresholds.maxAverageLatency}ms`
    );
  }

  // Check P95 latency
  if (
    thresholds.maxP95Latency !== undefined &&
    result.latency.p95 > thresholds.maxP95Latency
  ) {
    failures.push(
      `P95 latency ${result.latency.p95.toFixed(2)}ms exceeds threshold ${thresholds.maxP95Latency}ms`
    );
  }

  // Check P99 latency
  if (
    thresholds.maxP99Latency !== undefined &&
    result.latency.p99 > thresholds.maxP99Latency
  ) {
    failures.push(
      `P99 latency ${result.latency.p99.toFixed(2)}ms exceeds threshold ${thresholds.maxP99Latency}ms`
    );
  }

  // Check throughput
  if (
    thresholds.minThroughput !== undefined &&
    result.requests.average < thresholds.minThroughput
  ) {
    failures.push(
      `Average throughput ${result.requests.average.toFixed(2)} req/s is below threshold ${thresholds.minThroughput} req/s`
    );
  }

  // Check error rate
  if (thresholds.maxErrorRate !== undefined) {
    const errorRate =
      ((result.errors + result.timeouts + result['5xx']) / result.requests.total) * 100;
    if (errorRate > thresholds.maxErrorRate) {
      failures.push(
        `Error rate ${errorRate.toFixed(2)}% exceeds threshold ${thresholds.maxErrorRate}%`
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Print performance test results in a readable format
 */
export function printPerformanceResults(result: PerformanceTestResult): void {
  console.log(`\n━━━ Performance Test Results: ${result.title} ━━━`);
  console.log(`\nTest Configuration:`);
  console.log(`  Duration: ${result.duration}s`);
  console.log(`  Connections: ${result.connections}`);

  console.log(`\nRequests:`);
  console.log(`  Total: ${result.requests.total}`);
  console.log(`  Average: ${result.requests.average.toFixed(2)} req/s`);
  console.log(`  Min: ${result.requests.min} req/s`);
  console.log(`  Max: ${result.requests.max} req/s`);

  console.log(`\nLatency:`);
  console.log(`  Average: ${result.latency.average.toFixed(2)}ms`);
  console.log(`  P50: ${result.latency.p50.toFixed(2)}ms`);
  console.log(`  P90: ${result.latency.p90.toFixed(2)}ms`);
  console.log(`  P95: ${result.latency.p95.toFixed(2)}ms`);
  console.log(`  P99: ${result.latency.p99.toFixed(2)}ms`);
  console.log(`  Max: ${result.latency.max.toFixed(2)}ms`);

  console.log(`\nThroughput:`);
  console.log(`  Average: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`  Total: ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB`);

  console.log(`\nHTTP Status Codes:`);
  console.log(`  2xx: ${result['2xx']}`);
  console.log(`  4xx: ${result['4xx']}`);
  console.log(`  5xx: ${result['5xx']}`);
  console.log(`  Errors: ${result.errors}`);
  console.log(`  Timeouts: ${result.timeouts}`);

  const errorRate =
    ((result.errors + result.timeouts + result['5xx']) / result.requests.total) * 100;
  console.log(`  Error Rate: ${errorRate.toFixed(2)}%`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(
  url: string = `${API_BASE}/api/auth/session`,
  timeoutMs: number = 30000
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2000),
      });

      if (response.status < 500) {
        console.log('✓ Server is ready');
        return;
      }
    } catch (error) {
      // Continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Server not ready at ${API_BASE} after ${timeoutMs}ms. Please start the dev server first.`
  );
}

/**
 * Generate random test data for POST requests
 */
export function generateTestData(type: 'user' | 'birthInfo' | 'question'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  switch (type) {
    case 'user':
      return JSON.stringify({
        email: `test-${timestamp}-${random}@example.com`,
        password: 'TestPassword123!',
        name: `Test User ${random}`,
      });

    case 'birthInfo':
      return JSON.stringify({
        year: 1990,
        month: Math.floor(Math.random() * 12) + 1,
        day: Math.floor(Math.random() * 28) + 1,
        hour: Math.floor(Math.random() * 24),
        minute: Math.floor(Math.random() * 60),
        city: 'Seoul',
        lat: 37.5665,
        lng: 126.978,
      });

    case 'question':
      return JSON.stringify({
        question: `Test question ${timestamp}`,
        category: 'general',
      });

    default:
      return JSON.stringify({});
  }
}

/**
 * Create a test session/token for authenticated endpoints
 */
export async function getTestToken(): Promise<string> {
  // This would be implemented based on your auth system
  // For now, return a placeholder
  return process.env.TEST_API_TOKEN || 'test-token';
}
