import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordApiRequest,
  recordServiceOperation,
  recordAuthEvent,
  recordRateLimitHit,
  recordCreditUsage,
  recordExternalCall,
  recordCacheOperation,
  recordCounter,
  recordTiming,
  recordGauge,
  getMetricsSnapshot,
  resetMetrics,
} from '@/lib/metrics/index';

describe('Metrics Module', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('recordApiRequest', () => {
    it('should record successful API request', () => {
      recordApiRequest('saju', 'calculate', 'success', 150);

      const snapshot = getMetricsSnapshot();

      const requestCounter = snapshot.counters.find(
        (c) => c.name === 'api.request.total'
      );
      expect(requestCounter?.value).toBe(1);
      expect(requestCounter?.labels?.service).toBe('saju');
      expect(requestCounter?.labels?.operation).toBe('calculate');
      expect(requestCounter?.labels?.status).toBe('success');
    });

    it('should record API request duration', () => {
      recordApiRequest('astrology', 'chart', 'success', 250);

      const snapshot = getMetricsSnapshot();

      const durationTiming = snapshot.timings.find(
        (t) => t.name === 'api.request.duration'
      );
      expect(durationTiming).toBeDefined();
      expect(durationTiming?.count).toBe(1);
    });

    it('should record error metrics for failed requests', () => {
      recordApiRequest('dream', 'analyze', 'error');

      const snapshot = getMetricsSnapshot();

      const errorCounter = snapshot.counters.find(
        (c) => c.name === 'api.error.total'
      );
      expect(errorCounter?.value).toBeGreaterThan(0);
    });

    it('should record validation errors', () => {
      recordApiRequest('tarot', 'reading', 'validation_error');

      const snapshot = getMetricsSnapshot();

      // Implementation uses error_category label, not status
      const errorCounter = snapshot.counters.find(
        (c) => c.name === 'api.error.total' && c.labels?.error_category === 'validation_error'
      );
      expect(errorCounter).toBeDefined();
    });

    it('should record timeout errors', () => {
      recordApiRequest('destiny', 'calculate', 'timeout', 5000);

      const snapshot = getMetricsSnapshot();

      // Implementation uses error_category label, not status
      const errorCounter = snapshot.counters.find(
        (c) => c.name === 'api.error.total' && c.labels?.error_category === 'timeout'
      );
      expect(errorCounter).toBeDefined();
    });
  });

  describe('recordServiceOperation', () => {
    it('should record service operation metrics', () => {
      recordServiceOperation('saju', 'success', 120);

      const snapshot = getMetricsSnapshot();

      // Implementation uses "saju.operation" format (replace - with _)
      const counter = snapshot.counters.find((c) =>
        c.name === 'saju.operation'
      );
      expect(counter).toBeDefined();
      expect(counter?.labels?.status).toBe('success');
    });

    it('should record service operation duration', () => {
      recordServiceOperation('dream', 'success', 300);

      const snapshot = getMetricsSnapshot();

      // Implementation uses "dream.operation.duration" format
      const timing = snapshot.timings.find((t) =>
        t.name === 'dream.operation.duration'
      );
      expect(timing).toBeDefined();
    });

    it('should handle extra labels', () => {
      recordServiceOperation('astrology', 'success', 150, {
        chart_type: 'natal',
        precision: 'high',
      });

      const snapshot = getMetricsSnapshot();

      const counter = snapshot.counters.find((c) =>
        c.name === 'astrology.operation'
      );
      expect(counter?.labels?.chart_type).toBe('natal');
      expect(counter?.labels?.precision).toBe('high');
    });

    it('should handle error status', () => {
      recordServiceOperation('tarot', 'error', 50);

      const snapshot = getMetricsSnapshot();

      const counter = snapshot.counters.find((c) =>
        c.name === 'tarot.operation'
      );
      expect(counter?.labels?.status).toBe('error');
    });
  });

  describe('recordAuthEvent', () => {
    it('should record login event', () => {
      recordAuthEvent('login', 'google', 'success');

      const snapshot = getMetricsSnapshot();

      const authCounter = snapshot.counters.find(
        (c) => c.name === 'auth.event.total'
      );
      expect(authCounter?.value).toBe(1);
      expect(authCounter?.labels?.event).toBe('login');
      expect(authCounter?.labels?.provider).toBe('google');
      expect(authCounter?.labels?.status).toBe('success');
    });

    it('should record logout event', () => {
      recordAuthEvent('logout', 'kakao', 'success');

      const snapshot = getMetricsSnapshot();

      const authCounter = snapshot.counters.find(
        (c) => c.name === 'auth.event.total' && c.labels?.event === 'logout'
      );
      expect(authCounter).toBeDefined();
    });

    it('should record session start', () => {
      recordAuthEvent('session_start', 'google', 'success');

      const snapshot = getMetricsSnapshot();

      const authCounter = snapshot.counters.find(
        (c) => c.labels?.event === 'session_start'
      );
      expect(authCounter).toBeDefined();
    });

    it('should record failed authentication', () => {
      recordAuthEvent('login', 'google', 'error');

      const snapshot = getMetricsSnapshot();

      const authCounter = snapshot.counters.find(
        (c) => c.name === 'auth.event.total' && c.labels?.status === 'error'
      );
      expect(authCounter).toBeDefined();
    });
  });

  describe('recordRateLimitHit', () => {
    it('should record rate limit hit with default type', () => {
      recordRateLimitHit('/api/dream');

      const snapshot = getMetricsSnapshot();

      const rateLimitCounter = snapshot.counters.find(
        (c) => c.name === 'ratelimit.hit.total'
      );
      expect(rateLimitCounter?.value).toBe(1);
      expect(rateLimitCounter?.labels?.endpoint).toBe('/api/dream');
      expect(rateLimitCounter?.labels?.limit_type).toBe('ip');
    });

    it('should record user-based rate limit', () => {
      recordRateLimitHit('/api/astrology', 'user');

      const snapshot = getMetricsSnapshot();

      const rateLimitCounter = snapshot.counters.find(
        (c) => c.labels?.limit_type === 'user'
      );
      expect(rateLimitCounter).toBeDefined();
    });

    it('should record global rate limit', () => {
      recordRateLimitHit('/api/saju', 'global');

      const snapshot = getMetricsSnapshot();

      const rateLimitCounter = snapshot.counters.find(
        (c) => c.labels?.limit_type === 'global'
      );
      expect(rateLimitCounter).toBeDefined();
    });

    it('should accumulate multiple hits', () => {
      recordRateLimitHit('/api/dream');
      recordRateLimitHit('/api/dream');
      recordRateLimitHit('/api/dream');

      const snapshot = getMetricsSnapshot();

      const rateLimitCounter = snapshot.counters.find(
        (c) => c.name === 'ratelimit.hit.total'
      );
      expect(rateLimitCounter?.value).toBe(3);
    });
  });

  describe('recordCreditUsage', () => {
    it('should record credit usage for authenticated user', () => {
      recordCreditUsage('saju', 10, 'authenticated');

      const snapshot = getMetricsSnapshot();

      const creditCounter = snapshot.counters.find(
        (c) => c.name === 'credits.usage.total'
      );
      expect(creditCounter?.value).toBe(10);
      expect(creditCounter?.labels?.service).toBe('saju');
      expect(creditCounter?.labels?.auth).toBe('authenticated');
    });

    it('should record credit usage for guest', () => {
      recordCreditUsage('tarot', 5, 'guest');

      const snapshot = getMetricsSnapshot();

      const creditCounter = snapshot.counters.find(
        (c) => c.labels?.auth === 'guest'
      );
      expect(creditCounter).toBeDefined();
      expect(creditCounter?.value).toBe(5);
    });

    it('should accumulate credit usage', () => {
      recordCreditUsage('dream', 3, 'authenticated');
      recordCreditUsage('dream', 7, 'authenticated');

      const snapshot = getMetricsSnapshot();

      const creditCounter = snapshot.counters.find(
        (c) => c.name === 'credits.usage.total' && c.labels?.service === 'dream'
      );
      expect(creditCounter?.value).toBe(10);
    });
  });

  describe('recordExternalCall', () => {
    it('should record OpenAI API call', () => {
      recordExternalCall('openai', 'gpt-4', 'success', 1500);

      const snapshot = getMetricsSnapshot();

      const requestCounter = snapshot.counters.find(
        (c) => c.name === 'external.openai.request'
      );
      expect(requestCounter?.value).toBe(1);
      expect(requestCounter?.labels?.model).toBe('gpt-4');
      expect(requestCounter?.labels?.status).toBe('success');
    });

    it('should record OpenAI call duration', () => {
      recordExternalCall('openai', 'gpt-4', 'success', 1200);

      const snapshot = getMetricsSnapshot();

      const timing = snapshot.timings.find(
        (t) => t.name === 'external.openai.duration'
      );
      expect(timing).toBeDefined();
      expect(timing?.count).toBe(1);
    });

    it('should record token usage', () => {
      recordExternalCall('openai', 'gpt-4', 'success', 1500, {
        input: 100,
        output: 200,
      });

      const snapshot = getMetricsSnapshot();

      const inputTokens = snapshot.counters.find(
        (c) => c.name === 'external.openai.tokens' && c.labels?.type === 'input'
      );
      const outputTokens = snapshot.counters.find(
        (c) => c.name === 'external.openai.tokens' && c.labels?.type === 'output'
      );

      expect(inputTokens?.value).toBe(100);
      expect(outputTokens?.value).toBe(200);
    });

    it('should handle errors', () => {
      recordExternalCall('openai', 'gpt-4', 'error', 500);

      const snapshot = getMetricsSnapshot();

      const requestCounter = snapshot.counters.find(
        (c) => c.name === 'external.openai.request' && c.labels?.status === 'error'
      );
      expect(requestCounter).toBeDefined();
    });

    it('should record Stripe calls', () => {
      recordExternalCall('stripe', 'payment', 'success', 300);

      const snapshot = getMetricsSnapshot();

      const requestCounter = snapshot.counters.find(
        (c) => c.name === 'external.stripe.request'
      );
      expect(requestCounter).toBeDefined();
    });
  });

  describe('recordCacheOperation', () => {
    it('should record cache hit', () => {
      recordCacheOperation('redis', true, 'saju');

      const snapshot = getMetricsSnapshot();

      const hitCounter = snapshot.counters.find((c) => c.name === 'cache.hit');
      expect(hitCounter?.value).toBe(1);
      expect(hitCounter?.labels?.cache_type).toBe('redis');
      expect(hitCounter?.labels?.key_prefix).toBe('saju');
    });

    it('should record cache miss', () => {
      recordCacheOperation('memory', false, 'tarot');

      const snapshot = getMetricsSnapshot();

      const missCounter = snapshot.counters.find((c) => c.name === 'cache.miss');
      expect(missCounter?.value).toBe(1);
      expect(missCounter?.labels?.cache_type).toBe('memory');
    });

    it('should track hit rate across operations', () => {
      recordCacheOperation('redis', true, 'saju');
      recordCacheOperation('redis', true, 'saju');
      recordCacheOperation('redis', false, 'saju');

      const snapshot = getMetricsSnapshot();

      const hits = snapshot.counters.find(
        (c) => c.name === 'cache.hit' && c.labels?.key_prefix === 'saju'
      );
      const misses = snapshot.counters.find(
        (c) => c.name === 'cache.miss' && c.labels?.key_prefix === 'saju'
      );

      expect(hits?.value).toBe(2);
      expect(misses?.value).toBe(1);
    });

    it('should differentiate cache types', () => {
      recordCacheOperation('redis', true, 'user');
      recordCacheOperation('memory', true, 'user');
      recordCacheOperation('firestore', true, 'user');

      const snapshot = getMetricsSnapshot();

      const redisHit = snapshot.counters.find(
        (c) => c.name === 'cache.hit' && c.labels?.cache_type === 'redis'
      );
      const memoryHit = snapshot.counters.find(
        (c) => c.name === 'cache.hit' && c.labels?.cache_type === 'memory'
      );
      const firestoreHit = snapshot.counters.find(
        (c) => c.name === 'cache.hit' && c.labels?.cache_type === 'firestore'
      );

      expect(redisHit).toBeDefined();
      expect(memoryHit).toBeDefined();
      expect(firestoreHit).toBeDefined();
    });
  });

  describe('Core metrics functions', () => {
    describe('recordCounter', () => {
      it('should record counter with default increment', () => {
        recordCounter('test.counter');

        const snapshot = getMetricsSnapshot();
        const counter = snapshot.counters.find((c) => c.name === 'test.counter');

        expect(counter?.value).toBe(1);
      });

      it('should record counter with custom increment', () => {
        recordCounter('test.counter', 5);

        const snapshot = getMetricsSnapshot();
        const counter = snapshot.counters.find((c) => c.name === 'test.counter');

        expect(counter?.value).toBe(5);
      });

      it('should accumulate counter values', () => {
        recordCounter('test.counter', 3);
        recordCounter('test.counter', 7);

        const snapshot = getMetricsSnapshot();
        const counter = snapshot.counters.find((c) => c.name === 'test.counter');

        expect(counter?.value).toBe(10);
      });

      it('should record counter with labels', () => {
        recordCounter('test.counter', 1, { env: 'prod', region: 'us' });

        const snapshot = getMetricsSnapshot();
        const counter = snapshot.counters.find((c) => c.name === 'test.counter');

        expect(counter?.labels?.env).toBe('prod');
        expect(counter?.labels?.region).toBe('us');
      });
    });

    describe('recordTiming', () => {
      it('should record timing metric', () => {
        recordTiming('test.duration', 150);

        const snapshot = getMetricsSnapshot();
        const timing = snapshot.timings.find((t) => t.name === 'test.duration');

        expect(timing).toBeDefined();
        expect(timing?.count).toBe(1);
      });

      it('should calculate timing statistics', () => {
        recordTiming('test.duration', 100);
        recordTiming('test.duration', 200);
        recordTiming('test.duration', 300);

        const snapshot = getMetricsSnapshot();
        const timing = snapshot.timings.find((t) => t.name === 'test.duration');

        expect(timing?.count).toBe(3);
        expect(timing?.max).toBe(300);
        expect(timing?.avg).toBe(200); // (100+200+300)/3
      });

      it('should record timing with labels', () => {
        recordTiming('test.duration', 150, { endpoint: '/api/test' });

        const snapshot = getMetricsSnapshot();
        const timing = snapshot.timings.find((t) => t.name === 'test.duration');

        expect(timing?.labels?.endpoint).toBe('/api/test');
      });
    });

    describe('recordGauge', () => {
      it('should record gauge metric', () => {
        recordGauge('test.gauge', 42);

        const snapshot = getMetricsSnapshot();
        const gauge = snapshot.gauges.find((g) => g.name === 'test.gauge');

        expect(gauge?.value).toBe(42);
      });

      it('should overwrite gauge values', () => {
        recordGauge('test.gauge', 10);
        recordGauge('test.gauge', 20);

        const snapshot = getMetricsSnapshot();
        const gauge = snapshot.gauges.find((g) => g.name === 'test.gauge');

        expect(gauge?.value).toBe(20); // Last value
      });

      it('should record gauge with labels', () => {
        recordGauge('test.gauge', 100, { server: 'web-1' });

        const snapshot = getMetricsSnapshot();
        const gauge = snapshot.gauges.find((g) => g.name === 'test.gauge');

        expect(gauge?.labels?.server).toBe('web-1');
      });
    });
  });

  describe('getMetricsSnapshot', () => {
    it('should return snapshot with all metric types', () => {
      recordCounter('test.counter');
      recordTiming('test.timing', 100);
      recordGauge('test.gauge', 50);

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters).toBeDefined();
      expect(snapshot.timings).toBeDefined();
      expect(snapshot.gauges).toBeDefined();
      expect(Array.isArray(snapshot.counters)).toBe(true);
      expect(Array.isArray(snapshot.timings)).toBe(true);
      expect(Array.isArray(snapshot.gauges)).toBe(true);
    });

    it('should return empty arrays when no metrics recorded', () => {
      resetMetrics();
      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters.length).toBe(0);
      expect(snapshot.timings.length).toBe(0);
      expect(snapshot.gauges.length).toBe(0);
    });
  });

  describe('resetMetrics', () => {
    it('should clear all metrics', () => {
      recordCounter('test.counter');
      recordTiming('test.timing', 100);
      recordGauge('test.gauge', 50);

      let snapshot = getMetricsSnapshot();
      expect(snapshot.counters.length + snapshot.timings.length + snapshot.gauges.length).toBeGreaterThan(0);

      resetMetrics();

      snapshot = getMetricsSnapshot();
      expect(snapshot.counters.length).toBe(0);
      expect(snapshot.timings.length).toBe(0);
      expect(snapshot.gauges.length).toBe(0);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple services simultaneously', () => {
      recordApiRequest('saju', 'calculate', 'success', 150);
      recordApiRequest('dream', 'analyze', 'success', 300);
      recordApiRequest('tarot', 'reading', 'success', 200);

      const snapshot = getMetricsSnapshot();

      const sajuRequest = snapshot.counters.find(
        (c) => c.labels?.service === 'saju'
      );
      const dreamRequest = snapshot.counters.find(
        (c) => c.labels?.service === 'dream'
      );
      const tarotRequest = snapshot.counters.find(
        (c) => c.labels?.service === 'tarot'
      );

      expect(sajuRequest).toBeDefined();
      expect(dreamRequest).toBeDefined();
      expect(tarotRequest).toBeDefined();
    });

    it('should track complete request lifecycle', () => {
      // Incoming request
      recordApiRequest('saju', 'calculate', 'success', 250);

      // Service operations
      recordServiceOperation('saju', 'success', 200);

      // External API call
      recordExternalCall('openai', 'gpt-4', 'success', 1500, {
        input: 50,
        output: 100,
      });

      // Cache operation
      recordCacheOperation('redis', true, 'saju-result');

      // Credit usage
      recordCreditUsage('saju', 10, 'authenticated');

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters.length).toBeGreaterThan(0);
      expect(snapshot.timings.length).toBeGreaterThan(0);
    });
  });
});
