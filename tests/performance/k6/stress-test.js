/**
 * K6 Stress Test
 *
 * Pushes the API to its limits to find breaking points
 *
 * Run with:
 *   k6 run tests/performance/k6/stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const serverErrorRate = new Rate('server_errors');

// Stress test configuration - gradually increase load until breaking point
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '2m', target: 300 },  // Ramp up to 300 users
    { duration: '3m', target: 300 },  // Stay at 300 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Relaxed thresholds for stress testing
    http_req_duration: ['p(99)<5000'], // 99% under 5s
    http_req_failed: ['rate<0.25'], // Allow up to 25% failures under stress
    server_errors: ['rate<0.10'], // Server errors should stay under 10%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log('Starting stress test...');
  console.log('This test will push the API to its limits');

  return { baseUrl: BASE_URL };
}

export default function (data) {
  // Random endpoint selection to distribute load
  const endpoints = [
    '/api/auth/session',
    '/api/cities?query=Seoul',
    '/api/visitors-today',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const headers = {};

  // Add metrics token for protected endpoint
  if (endpoint.includes('visitors-today')) {
    const metricsToken = __ENV.METRICS_TOKEN || '';
    if (metricsToken) {
      headers['x-metrics-token'] = metricsToken;
    }
  }

  const res = http.get(`${data.baseUrl}${endpoint}`, { headers });

  const success = check(res, {
    'status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
  });

  const serverError = check(res, {
    'no server error': (r) => r.status < 500,
  });

  errorRate.add(!success);
  serverErrorRate.add(!serverError);

  // Log when we start seeing problems
  if (res.status >= 500) {
    console.log(`Server error ${res.status} at VU count: ${__VU}`);
  }

  sleep(0.5); // Shorter sleep for stress test
}

export function teardown(data) {
  console.log('Stress test completed');
  console.log('Check the results to find the breaking point');
}
