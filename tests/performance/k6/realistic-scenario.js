/**
 * K6 Realistic User Scenario Test
 *
 * Simulates realistic user behavior patterns
 *
 * Run with:
 *   k6 run tests/performance/k6/realistic-scenario.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const userJourneySuccess = new Rate('user_journey_success');
const journeyDuration = new Trend('journey_duration');

// Realistic load pattern
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Morning traffic
    { duration: '3m', target: 30 },  // Peak hours
    { duration: '2m', target: 50 },  // Busy period
    { duration: '2m', target: 30 },  // Afternoon
    { duration: '1m', target: 10 },  // Evening
    { duration: '1m', target: 0 },   // Night
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.05'],
    user_journey_success: ['rate>0.90'], // 90% of journeys should complete successfully
    journey_duration: ['p(95)<10000'], // Complete journey in under 10s
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log('Starting realistic user scenario test...');
  return { baseUrl: BASE_URL };
}

// Simulate a new user journey
function newUserJourney(baseUrl) {
  group('New User Journey', () => {
    // 1. Land on homepage (implicit - checking session)
    let res = http.get(`${baseUrl}/api/auth/session`);
    check(res, { 'homepage load': (r) => r.status === 200 });

    sleep(2); // User reads homepage

    // 2. Search for their city
    res = http.get(`${baseUrl}/api/cities?query=Seoul`);
    check(res, { 'city search': (r) => r.status === 200 });

    sleep(1);

    // 3. Try to calculate Saju (might fail without auth, that's ok)
    res = http.post(
      `${baseUrl}/api/saju`,
      JSON.stringify({
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30,
        city: 'Seoul',
        lat: 37.5665,
        lng: 126.978,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    // Accept both success and auth required
    check(res, { 'saju calculation': (r) => r.status === 200 || r.status === 401 });

    sleep(3); // User reads results
  });
}

// Simulate a returning user journey
function returningUserJourney(baseUrl) {
  group('Returning User Journey', () => {
    // 1. Check session
    let res = http.get(`${baseUrl}/api/auth/session`);
    check(res, { 'session check': (r) => r.status === 200 });

    sleep(1);

    // 2. Browse features - check astrology
    res = http.post(
      `${baseUrl}/api/astrology`,
      JSON.stringify({
        year: 1985,
        month: 8,
        day: 20,
        hour: 10,
        minute: 0,
        city: 'Tokyo',
        lat: 35.6762,
        lng: 139.6503,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    check(res, { 'astrology check': (r) => r.status === 200 || r.status === 401 });

    sleep(2);

    // 3. Check compatibility (if available)
    res = http.post(
      `${baseUrl}/api/compatibility`,
      JSON.stringify({
        person1: {
          year: 1985,
          month: 8,
          day: 20,
          hour: 10,
          minute: 0,
        },
        person2: {
          year: 1990,
          month: 5,
          day: 15,
          hour: 14,
          minute: 30,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    // Might not be available or require auth
    check(res, { 'compatibility check': (r) => r.status < 500 });

    sleep(2);
  });
}

// Simulate a quick visitor
function quickVisitorJourney(baseUrl) {
  group('Quick Visitor Journey', () => {
    // Just check a few pages and leave
    let res = http.get(`${baseUrl}/api/auth/session`);
    check(res, { 'quick visit': (r) => r.status === 200 });

    sleep(1);

    res = http.get(`${baseUrl}/api/cities?query=London`);
    check(res, { 'quick search': (r) => r.status === 200 });

    sleep(0.5); // Bounce quickly
  });
}

export default function (data) {
  const journeyStart = Date.now();
  let journeySuccess = true;

  try {
    // Randomly select user journey type
    const rand = Math.random();

    if (rand < 0.5) {
      // 50% new users
      newUserJourney(data.baseUrl);
    } else if (rand < 0.85) {
      // 35% returning users
      returningUserJourney(data.baseUrl);
    } else {
      // 15% quick visitors
      quickVisitorJourney(data.baseUrl);
    }
  } catch (error) {
    journeySuccess = false;
    console.log(`Journey failed: ${error}`);
  }

  const duration = Date.now() - journeyStart;
  journeyDuration.add(duration);
  userJourneySuccess.add(journeySuccess);

  // Random think time between journeys
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

export function teardown(data) {
  console.log('Realistic scenario test completed');
}
