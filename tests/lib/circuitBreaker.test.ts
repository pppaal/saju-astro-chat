/**
 * Tests for src/lib/circuitBreaker.ts
 * 서킷브레이커 패턴 테스트
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  withCircuitBreaker,
  getCircuitStatus,
  resetAllCircuits,
} from '@/lib/circuitBreaker';

describe('circuitBreaker', () => {
  beforeEach(() => {
    resetAllCircuits();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      const status = getCircuitStatus('test');
      expect(status.state).toBe('CLOSED');
      expect(status.failures).toBe(0);
      expect(status.lastFailure).toBeNull();
    });

    it('should allow requests when CLOSED', () => {
      expect(isCircuitOpen('test')).toBe(false);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      recordFailure('test');
      expect(getCircuitStatus('test').failures).toBe(1);
    });

    it('should open circuit after threshold failures', () => {
      recordFailure('test');
      recordFailure('test');
      recordFailure('test'); // default threshold = 3
      expect(getCircuitStatus('test').state).toBe('OPEN');
    });

    it('should respect custom threshold', () => {
      recordFailure('test', { failureThreshold: 5 });
      recordFailure('test', { failureThreshold: 5 });
      recordFailure('test', { failureThreshold: 5 });
      expect(getCircuitStatus('test').state).toBe('CLOSED');
      recordFailure('test', { failureThreshold: 5 });
      recordFailure('test', { failureThreshold: 5 });
      expect(getCircuitStatus('test').state).toBe('OPEN');
    });

    it('should block requests when OPEN', () => {
      recordFailure('test');
      recordFailure('test');
      recordFailure('test');
      expect(isCircuitOpen('test')).toBe(true);
    });
  });

  describe('recordSuccess', () => {
    it('should reset circuit to CLOSED', () => {
      recordFailure('test');
      recordFailure('test');
      recordSuccess('test');
      expect(getCircuitStatus('test').state).toBe('CLOSED');
      expect(getCircuitStatus('test').failures).toBe(0);
    });
  });

  describe('HALF_OPEN state', () => {
    it('should transition from OPEN to HALF_OPEN after timeout', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      recordFailure('test');
      recordFailure('test');
      recordFailure('test');
      expect(isCircuitOpen('test')).toBe(true);

      // Advance past timeout (default 60s)
      vi.spyOn(Date, 'now').mockReturnValue(now + 61000);
      expect(isCircuitOpen('test')).toBe(false); // allows test request
      expect(getCircuitStatus('test').state).toBe('HALF_OPEN');
    });

    it('should close circuit on success in HALF_OPEN', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      recordFailure('test');
      recordFailure('test');
      recordFailure('test');

      vi.spyOn(Date, 'now').mockReturnValue(now + 61000);
      isCircuitOpen('test'); // transition to HALF_OPEN

      recordSuccess('test');
      expect(getCircuitStatus('test').state).toBe('CLOSED');
    });

    it('should re-open circuit on failure in HALF_OPEN', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      recordFailure('test');
      recordFailure('test');
      recordFailure('test');

      vi.spyOn(Date, 'now').mockReturnValue(now + 61000);
      isCircuitOpen('test'); // transition to HALF_OPEN

      recordFailure('test');
      expect(getCircuitStatus('test').state).toBe('OPEN');
    });

    it('should limit HALF_OPEN attempts', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      recordFailure('test');
      recordFailure('test');
      recordFailure('test');

      vi.spyOn(Date, 'now').mockReturnValue(now + 61000);
      // 1st call: transitions OPEN->HALF_OPEN (attempts=0), returns false
      expect(isCircuitOpen('test')).toBe(false);
      // 2nd call: attempts=0 < max=1, increments to 1, returns false
      expect(isCircuitOpen('test')).toBe(false);
      // 3rd call: attempts=1 >= max=1, blocked
      expect(isCircuitOpen('test')).toBe(true);
    });
  });

  describe('withCircuitBreaker', () => {
    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withCircuitBreaker('test', fn, 'fallback');
      expect(result.result).toBe('success');
      expect(result.fromFallback).toBe(false);
    });

    it('should return fallback value on failure', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const result = await withCircuitBreaker('test', fn, 'fallback');
      expect(result.result).toBe('fallback');
      expect(result.fromFallback).toBe(true);
    });

    it('should call fallback function when circuit is open', async () => {
      // Open the circuit first
      recordFailure('test');
      recordFailure('test');
      recordFailure('test');

      const fn = vi.fn();
      const fallbackFn = vi.fn().mockReturnValue('fallback-value');
      const result = await withCircuitBreaker('test', fn, fallbackFn);

      expect(fn).not.toHaveBeenCalled();
      expect(result.result).toBe('fallback-value');
      expect(result.fromFallback).toBe(true);
    });

    it('should record success after successful call', async () => {
      recordFailure('test'); // add a failure first
      const fn = vi.fn().mockResolvedValue('ok');
      await withCircuitBreaker('test', fn, 'fallback');
      expect(getCircuitStatus('test').failures).toBe(0);
    });

    it('should record failure after failed call', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      await withCircuitBreaker('test', fn, 'fallback');
      expect(getCircuitStatus('test').failures).toBe(1);
    });

    it('should support async fallback function', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const fallbackFn = vi.fn().mockResolvedValue('async-fallback');
      const result = await withCircuitBreaker('test', fn, fallbackFn);
      expect(result.result).toBe('async-fallback');
    });
  });

  describe('multiple circuits', () => {
    it('should track circuits independently', () => {
      recordFailure('service-a');
      recordFailure('service-a');
      recordFailure('service-a');

      expect(isCircuitOpen('service-a')).toBe(true);
      expect(isCircuitOpen('service-b')).toBe(false);
    });
  });

  describe('resetAllCircuits', () => {
    it('should clear all circuit states', () => {
      recordFailure('a');
      recordFailure('b');
      resetAllCircuits();

      expect(getCircuitStatus('a').state).toBe('CLOSED');
      expect(getCircuitStatus('b').state).toBe('CLOSED');
    });
  });

  describe('getCircuitStatus', () => {
    it('should return lastFailure as Date when set', () => {
      recordFailure('test');
      const status = getCircuitStatus('test');
      expect(status.lastFailure).toBeInstanceOf(Date);
    });
  });
});
