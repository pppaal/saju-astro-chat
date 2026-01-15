/**
 * K6 Endurance (Soak) Test
 *
 * Tests API stability over extended period to detect memory leaks,
 * degradation, or other issues that appear over time
 *
 * Run with:
 *   k6 run tests/performance/k6/endurance-test.js
 *
 * Note: This test runs for 30+ minutes by default
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const memoryIssues = new Counter('potential_memory_issues');

// Endurance test - moderate load for extended period
export const options = {
  stages: [
    { duration: '2m', target: 30 },   // Ramp up to 30 users
    { duration: '30m', target: 30 },  // Stay at 30 users for 30 minutes
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Should stay stable
    errors: ['rate<0.05'], // Should stay under 5%
    response_time: ['p(95)<1000'], // Response time shouldn't degrade
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log('Starting endurance test...');
  console.log('Running for ~30 minutes to detect degradation');
  console.log('Watch for increasing response times or error rates');

  return {
    baseUrl: BASE_URL,
    startTime: Date.now(),
    baselineResponseTime: null,
  };
}

export default function (data) {
  const elapsed = (Date.now() - data.startTime) / 1000 / 60; // minutes

  // Make various requests to simulate real usage
  const requests = [
    { url: '/api/auth/session', weight: 40 },
    { url: '/api/cities?query=Seoul', weight: 30 },
    { url: '/api/visitors-today', weight: 20 },
  ];

  // Weighted random selection
  const rand = Math.random() * 100;
  let cumulative = 0;
  let selectedRequest = requests[0];

  for (const req of requests) {
    cumulative += req.weight;
    if (rand <= cumulative) {
      selectedRequest = req;
      break;
    }
  }

  const headers = {};
  if (selectedRequest.url.includes('visitors-today')) {
    const metricsToken = __ENV.METRICS_TOKEN || '';
    if (metricsToken) {
      headers['x-metrics-token'] = metricsToken;
    }
  }

  const res = http.get(`${data.baseUrl}${selectedRequest.url}`, { headers });

  responseTime.add(res.timings.duration);

  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time stable': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);

  // Check for degradation (response time increasing over time)
  if (elapsed > 10 && res.timings.duration > 3000) {
    memoryIssues.add(1);
    console.log(`Potential degradation at ${elapsed.toFixed(1)}min: ${res.timings.duration}ms`);
  }

  // Log checkpoints
  if (Math.floor(elapsed) > 0 && Math.floor(elapsed) % 5 === 0 && elapsed % 1 < 0.1) {
    console.log(`Checkpoint: ${Math.floor(elapsed)}min elapsed, response time: ${res.timings.duration.toFixed(2)}ms`);
  }

  sleep(2); // Normal user think time
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`Endurance test completed after ${duration.toFixed(1)} minutes`);
  console.log('Check metrics for degradation over time');
}
