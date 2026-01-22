/**
 * k6 Load Testing Configuration
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run: k6 run tests/load/k6-config.js
 *
 * Scenarios:
 * 1. Smoke Test - 1 VU for 30s (basic functionality)
 * 2. Load Test - 50 VUs for 5min (normal traffic)
 * 3. Stress Test - 100 VUs ramping to 200 (find breaking point)
 * 4. Spike Test - sudden traffic surge
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const successCounter = new Counter('successful_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || '';

// Test scenarios - choose one by setting K6_SCENARIO env variable
const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },  // Ramp up to 50 users
      { duration: '5m', target: 50 },  // Stay at 50 for 5 minutes
      { duration: '2m', target: 0 },   // Ramp down to 0
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 }, // Ramp up to 100
      { duration: '5m', target: 100 }, // Stay at 100
      { duration: '2m', target: 200 }, // Spike to 200
      { duration: '5m', target: 200 }, // Stay at 200
      { duration: '5m', target: 0 },   // Ramp down
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 }, // Fast ramp up
      { duration: '1m', target: 100 },
      { duration: '10s', target: 1000 }, // Spike!
      { duration: '3m', target: 1000 },
      { duration: '10s', target: 100 },
      { duration: '3m', target: 0 },
    ],
  },
};

const selectedScenario = __ENV.K6_SCENARIO || 'smoke';

export const options = {
  scenarios: {
    [selectedScenario]: scenarios[selectedScenario],
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    errors: ['rate<0.05'],                          // Custom error rate < 5%
  },
};

// Test endpoints
const endpoints = [
  {
    name: 'Health Check',
    url: '/api/health',
    method: 'GET',
    weight: 10, // 10% of requests
  },
  {
    name: 'Saju Analysis',
    url: '/api/saju',
    method: 'POST',
    weight: 30,
    body: {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      gender: 'male',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
    },
  },
  {
    name: 'Tarot Reading',
    url: '/api/tarot/interpret',
    method: 'POST',
    weight: 25,
    body: {
      categoryId: 'love',
      spreadId: '3-card',
      spreadTitle: 'Past Present Future',
      cards: [
        { name: 'The Fool', isReversed: false, position: 'Past' },
        { name: 'The Magician', isReversed: false, position: 'Present' },
        { name: 'The High Priestess', isReversed: true, position: 'Future' },
      ],
      language: 'ko',
    },
  },
  {
    name: 'Dream Analysis',
    url: '/api/dream',
    method: 'GET',
    weight: 15,
  },
  {
    name: 'Calendar',
    url: '/api/calendar',
    method: 'POST',
    weight: 10,
    body: {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      gender: 'male',
      timezone: 'Asia/Seoul',
    },
  },
  {
    name: 'User History',
    url: '/api/me/history',
    method: 'GET',
    weight: 10,
  },
];

// Weighted random endpoint selection
function selectEndpoint() {
  const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;

  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }

  return endpoints[0];
}

export default function () {
  const endpoint = selectEndpoint();

  const params = {
    headers: {
      'Content-Type': 'application/json',
      ...(API_TOKEN && { 'x-api-token': API_TOKEN }),
    },
    tags: { name: endpoint.name },
  };

  let res;
  const startTime = Date.now();

  if (endpoint.method === 'POST') {
    res = http.post(
      `${BASE_URL}${endpoint.url}`,
      JSON.stringify(endpoint.body),
      params
    );
  } else {
    res = http.get(`${BASE_URL}${endpoint.url}`, params);
  }

  const duration = Date.now() - startTime;
  apiDuration.add(duration, { endpoint: endpoint.name });

  // Checks
  const checkResult = check(res, {
    'status is 200': (r) => r.status === 200,
    'status is not 500': (r) => r.status !== 500,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  // Record metrics
  errorRate.add(!checkResult);
  if (checkResult) {
    successCounter.add(1);
  }

  // Random think time between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors !== false;

  let output = '\n';
  output += `${indent}Test Summary\n`;
  output += `${indent}============\n\n`;
  output += `${indent}Scenario: ${selectedScenario}\n`;
  output += `${indent}Duration: ${data.state.testRunDurationMs / 1000}s\n`;
  output += `${indent}VUs: ${data.metrics.vus.values.max}\n\n`;

  output += `${indent}HTTP Metrics:\n`;
  output += `${indent}  Requests: ${data.metrics.http_reqs.values.count}\n`;
  output += `${indent}  Duration (p95): ${data.metrics.http_req_duration.values['p(95)']}ms\n`;
  output += `${indent}  Duration (p99): ${data.metrics.http_req_duration.values['p(99)']}ms\n`;
  output += `${indent}  Failed: ${data.metrics.http_req_failed.values.rate * 100}%\n\n`;

  output += `${indent}Custom Metrics:\n`;
  output += `${indent}  Error Rate: ${data.metrics.errors.values.rate * 100}%\n`;
  output += `${indent}  Successful: ${data.metrics.successful_requests.values.count}\n`;

  return output;
}
