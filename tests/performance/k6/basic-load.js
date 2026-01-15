/**
 * K6 Basic Load Test
 *
 * Tests basic API endpoints under various load patterns
 *
 * Run with:
 *   k6 run tests/performance/k6/basic-load.js
 *
 * Or with custom options:
 *   k6 run --vus 50 --duration 30s tests/performance/k6/basic-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const sessionCheckDuration = new Trend('session_check_duration');
const citiesSearchDuration = new Trend('cities_search_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '1m', target: 50 },  // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms, 99% under 1s
    http_req_failed: ['rate<0.05'], // Error rate under 5%
    errors: ['rate<0.05'],
    session_check_duration: ['p(95)<300'],
    cities_search_duration: ['p(95)<400'],
  },
};

// Configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);

  // Check if server is up
  const res = http.get(`${BASE_URL}/api/auth/session`);
  if (res.status >= 500) {
    throw new Error(`Server returned ${res.status}. Please ensure the server is running.`);
  }

  return { baseUrl: BASE_URL };
}

export default function (data) {
  // Test 1: Session Check
  {
    const startTime = Date.now();
    const res = http.get(`${data.baseUrl}/api/auth/session`);
    const duration = Date.now() - startTime;

    sessionCheckDuration.add(duration);

    const success = check(res, {
      'session check status is 200': (r) => r.status === 200,
      'session check response time OK': (r) => r.timings.duration < 500,
    });

    errorRate.add(!success);
  }

  sleep(1);

  // Test 2: Cities Search
  {
    const cities = ['Seoul', 'Tokyo', 'New York', 'London', 'Paris'];
    const city = cities[Math.floor(Math.random() * cities.length)];

    const startTime = Date.now();
    const res = http.get(`${data.baseUrl}/api/cities?query=${city}`);
    const duration = Date.now() - startTime;

    citiesSearchDuration.add(duration);

    const success = check(res, {
      'cities search status is 200': (r) => r.status === 200,
      'cities search has results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || (body && typeof body === 'object');
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
  }

  sleep(2);
}

export function teardown(data) {
  console.log(`Load test completed against ${data.baseUrl}`);
}
