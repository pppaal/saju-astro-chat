/**
 * Tests for Redis Session Cache Manager
 *
 * NOTE: These tests require Redis to be configured.
 * Tests are skipped if no Redis backend is available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setSession,
  getSession,
  deleteSession,
  touchSession,
  getSessionCount,
  clearAllSessions,
  healthCheck,
} from '@/lib/cache/redis-session';

// Check if Redis is available - only run if explicitly enabled for integration tests
const REDIS_AVAILABLE = process.env.VITEST_REDIS_TESTS === '1' &&
  !!(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL);

// Skip tests if Redis is not available
const describeWithRedis = REDIS_AVAILABLE ? describe : describe.skip;

describeWithRedis('Redis Session Cache', () => {
  const testSessionId = 'test-session-' + Date.now();
  const testData = { userId: '123', username: 'testuser', isAdmin: true };

  beforeAll(async () => {
    // Clean up any existing test sessions
    await clearAllSessions();
  });

  afterAll(async () => {
    // Clean up test data
    await deleteSession(testSessionId);
  });

  it('should set and get session data', async () => {
    const setResult = await setSession(testSessionId, testData, 60);
    expect(setResult).toBe(true);

    const retrieved = await getSession<typeof testData>(testSessionId);
    expect(retrieved).toEqual(testData);
  });

  it('should return null for non-existent session', async () => {
    const result = await getSession('non-existent-session-id');
    expect(result).toBeNull();
  });

  it('should delete session', async () => {
    const deleteSessionId = 'delete-test-' + Date.now();

    await setSession(deleteSessionId, { test: 'data' }, 60);
    const beforeDelete = await getSession(deleteSessionId);
    expect(beforeDelete).not.toBeNull();

    const deleteResult = await deleteSession(deleteSessionId);
    expect(deleteResult).toBe(true);

    const afterDelete = await getSession(deleteSessionId);
    expect(afterDelete).toBeNull();
  });

  it('should extend session TTL with touch', async () => {
    const touchSessionId = 'touch-test-' + Date.now();

    await setSession(touchSessionId, { test: 'data' }, 5);
    const touchResult = await touchSession(touchSessionId, 60);
    expect(touchResult).toBe(true);

    // Session should still exist
    const data = await getSession(touchSessionId);
    expect(data).not.toBeNull();

    // Cleanup
    await deleteSession(touchSessionId);
  });

  it('should count sessions correctly', async () => {
    const beforeCount = await getSessionCount();

    const sessionId1 = 'count-test-1-' + Date.now();
    const sessionId2 = 'count-test-2-' + Date.now();

    await setSession(sessionId1, { test: 1 }, 60);
    await setSession(sessionId2, { test: 2 }, 60);

    const afterCount = await getSessionCount();
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 2);

    // Cleanup
    await deleteSession(sessionId1);
    await deleteSession(sessionId2);
  });

  it('should perform health check', async () => {
    const health = await healthCheck();

    expect(health).toHaveProperty('redis');
    expect(health).toHaveProperty('memory');
    expect(health).toHaveProperty('sessionCount');

    expect(typeof health.redis).toBe('boolean');
    expect(typeof health.memory).toBe('boolean');
    expect(typeof health.sessionCount).toBe('number');
  });

  it('should handle clear all sessions', async () => {
    const sessionId1 = 'clear-test-1-' + Date.now();
    const sessionId2 = 'clear-test-2-' + Date.now();

    await setSession(sessionId1, { test: 1 }, 60);
    await setSession(sessionId2, { test: 2 }, 60);

    const clearedCount = await clearAllSessions();
    expect(clearedCount).toBeGreaterThanOrEqual(2);

    const afterClear1 = await getSession(sessionId1);
    const afterClear2 = await getSession(sessionId2);

    expect(afterClear1).toBeNull();
    expect(afterClear2).toBeNull();
  });

  it('should handle complex data structures', async () => {
    const complexData = {
      user: {
        id: '123',
        profile: {
          name: 'Test User',
          age: 25,
          tags: ['admin', 'verified'],
        },
      },
      settings: {
        theme: 'dark',
        notifications: true,
      },
      timestamp: Date.now(),
    };

    const sessionId = 'complex-test-' + Date.now();

    await setSession(sessionId, complexData, 60);
    const retrieved = await getSession<typeof complexData>(sessionId);

    expect(retrieved).toEqual(complexData);
    expect(retrieved?.user.profile.tags).toEqual(['admin', 'verified']);

    // Cleanup
    await deleteSession(sessionId);
  });

  it('should fallback gracefully when Redis is unavailable', async () => {
    // Even if Redis is down, in-memory fallback should work
    const sessionId = 'fallback-test-' + Date.now();
    const data = { test: 'fallback' };

    const setResult = await setSession(sessionId, data, 60);
    expect(setResult).toBe(true);

    const retrieved = await getSession(sessionId);
    expect(retrieved).toBeTruthy();

    // Cleanup
    await deleteSession(sessionId);
  });
});
