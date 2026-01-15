/**
 * K6 Spike Test
 *
 * Tests how the API handles sudden traffic spikes
 *
 * Run with:
 *   k6 run tests/performance/k6/spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Spike test configuration - sudden increase then sudden decrease
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Start with 10 users
    { duration: '10s', target: 10 },   // Stay at 10 users
    { duration: '10s', target: 100 },  // Sudden spike to 100 users
    { duration: '30s', target: 100 },  // Stay at spike
    { duration: '10s', target: 10 },   // Drop back to 10 users
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s during spike
    errors: ['rate<0.15'], // Allow up to 15% errors during spike
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log('Starting spike test...');
  console.log('Testing sudden traffic increase handling');

  return { baseUrl: BASE_URL, startTime: Date.now() };
}

export default function (data) {
  const stage = getCurrentStage(data.startTime);

  // Test session endpoint during spike
  const res = http.get(`${data.baseUrl}/api/auth/session`);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => {
      // Allow higher response times during spike
      if (stage === 'spike') {
        return r.timings.duration < 3000;
      }
      return r.timings.duration < 1000;
    },
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
  }

  errorRate.add(!success);

  // Log spike period performance
  if (stage === 'spike' && res.status !== 200) {
    console.log(`Spike period - Status: ${res.status}, Duration: ${res.timings.duration}ms`);
  }

  sleep(1);
}

function getCurrentStage(startTime) {
  const elapsed = (Date.now() - startTime) / 1000; // seconds

  if (elapsed < 20) return 'baseline';
  if (elapsed < 30) return 'ramping';
  if (elapsed < 60) return 'spike';
  if (elapsed < 70) return 'recovery';
  return 'cooldown';
}

export function teardown(data) {
  console.log('Spike test completed');
  console.log('Check how the system handled sudden traffic increase');
}
