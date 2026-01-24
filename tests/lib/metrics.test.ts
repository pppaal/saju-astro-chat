import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordCounter,
  recordTiming,
  recordGauge,
  getMetricsSnapshot,
  resetMetrics,
  toPrometheus,
  toOtlp,
} from '@/lib/metrics';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Metrics System', () => {
  beforeEach(() => {
    resetMetrics();
    vi.clearAllMocks();
  });

  describe('recordCounter', () => {
    it('should record a basic counter', () => {
      recordCounter('test_counter', 1);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toHaveLength(1);
      expect(snapshot.counters[0].name).toBe('test_counter');
      expect(snapshot.counters[0].value).toBe(1);
    });

    it('should increment counter value', () => {
      recordCounter('test_counter', 1);
      recordCounter('test_counter', 2);
      recordCounter('test_counter', 3);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(6); // 1 + 2 + 3
    });

    it('should default to incrementing by 1', () => {
      recordCounter('test_counter');
      recordCounter('test_counter');

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(2);
    });

    it('should record counter with labels', () => {
      recordCounter('http_requests', 1, { method: 'GET', route: '/api' });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].labels).toEqual({ method: 'GET', route: '/api' });
    });

    it('should separate counters by labels', () => {
      recordCounter('http_requests', 1, { method: 'GET' });
      recordCounter('http_requests', 2, { method: 'POST' });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toHaveLength(2);
      expect(snapshot.counters[0].value).toBe(1);
      expect(snapshot.counters[1].value).toBe(2);
    });

    it('should handle numeric labels', () => {
      recordCounter('test_counter', 1, { status: 200 });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].labels?.status).toBe(200);
    });

    it('should handle boolean labels', () => {
      recordCounter('test_counter', 1, { success: true });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].labels?.success).toBe(true);
    });

    it('should handle negative values', () => {
      recordCounter('test_counter', -5);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(-5);
    });

    it('should handle zero values', () => {
      recordCounter('test_counter', 0);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(0);
    });

    it('should handle very large values', () => {
      recordCounter('test_counter', 1000000);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(1000000);
    });

    it('should handle decimal values', () => {
      recordCounter('test_counter', 1.5);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(1.5);
    });
  });

  describe('recordTiming', () => {
    it('should record a timing', () => {
      recordTiming('request_duration', 150);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings).toHaveLength(1);
      expect(snapshot.timings[0].name).toBe('request_duration');
      expect(snapshot.timings[0].count).toBe(1);
      expect(snapshot.timings[0].sum).toBe(150);
      expect(snapshot.timings[0].max).toBe(150);
    });

    it('should calculate averages', () => {
      recordTiming('request_duration', 100);
      recordTiming('request_duration', 200);
      recordTiming('request_duration', 300);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].count).toBe(3);
      expect(snapshot.timings[0].sum).toBe(600);
      expect(snapshot.timings[0].avg).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should track maximum timing', () => {
      recordTiming('request_duration', 100);
      recordTiming('request_duration', 500);
      recordTiming('request_duration', 200);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].max).toBe(500);
    });

    it('should record timings with labels', () => {
      recordTiming('request_duration', 150, { route: '/api/users' });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].labels).toEqual({ route: '/api/users' });
    });

    it('should separate timings by labels', () => {
      recordTiming('request_duration', 100, { route: '/api/users' });
      recordTiming('request_duration', 200, { route: '/api/posts' });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings).toHaveLength(2);
    });

    it('should handle zero timing', () => {
      recordTiming('request_duration', 0);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].sum).toBe(0);
      expect(snapshot.timings[0].max).toBe(0);
    });

    it('should handle very large timing', () => {
      recordTiming('slow_request', 300000); // 5 minutes

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].sum).toBe(300000);
    });

    it('should handle decimal timing', () => {
      recordTiming('request_duration', 123.456);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].sum).toBe(123.456);
    });
  });

  describe('recordGauge', () => {
    it('should record a gauge', () => {
      recordGauge('connections', 5);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges).toHaveLength(1);
      expect(snapshot.gauges[0].name).toBe('connections');
      expect(snapshot.gauges[0].value).toBe(5);
    });

    it('should overwrite gauge value', () => {
      recordGauge('connections', 5);
      recordGauge('connections', 10);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges[0].value).toBe(10); // Latest value
    });

    it('should record gauge with labels', () => {
      recordGauge('connections', 5, { type: 'websocket' });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges[0].labels).toEqual({ type: 'websocket' });
    });

    it('should separate gauges by labels', () => {
      recordGauge('connections', 5, { type: 'sse' });
      recordGauge('connections', 10, { type: 'websocket' });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges).toHaveLength(2);
    });

    it('should handle negative gauge', () => {
      recordGauge('temperature', -10);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges[0].value).toBe(-10);
    });

    it('should handle zero gauge', () => {
      recordGauge('connections', 0);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges[0].value).toBe(0);
    });

    it('should handle decimal gauge', () => {
      recordGauge('cpu_usage', 45.67);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges[0].value).toBe(45.67);
    });
  });

  describe('getMetricsSnapshot', () => {
    it('should return empty snapshot initially', () => {
      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters).toEqual([]);
      expect(snapshot.gauges).toEqual([]);
      expect(snapshot.timings).toEqual([]);
    });

    it('should return all metric types', () => {
      recordCounter('counter', 1);
      recordTiming('timing', 100);
      recordGauge('gauge', 5);

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters).toHaveLength(1);
      expect(snapshot.timings).toHaveLength(1);
      expect(snapshot.gauges).toHaveLength(1);
    });

    it('should calculate timing averages', () => {
      recordTiming('request', 100);
      recordTiming('request', 200);

      const snapshot = getMetricsSnapshot();

      expect(snapshot.timings[0].avg).toBe(150);
    });

    it('should handle zero-count timings', () => {
      // No timings recorded
      const snapshot = getMetricsSnapshot();

      expect(snapshot.timings).toEqual([]);
    });

    it('should return snapshot with multiple metrics', () => {
      recordCounter('requests', 10, { route: '/api' });
      recordCounter('requests', 5, { route: '/auth' });
      recordTiming('latency', 50, { route: '/api' });
      recordTiming('latency', 100, { route: '/auth' });
      recordGauge('connections', 3, { type: 'sse' });

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters).toHaveLength(2);
      expect(snapshot.timings).toHaveLength(2);
      expect(snapshot.gauges).toHaveLength(1);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      recordCounter('counter', 1);
      recordTiming('timing', 100);
      recordGauge('gauge', 5);

      resetMetrics();

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toEqual([]);
      expect(snapshot.timings).toEqual([]);
      expect(snapshot.gauges).toEqual([]);
    });

    it('should allow recording after reset', () => {
      recordCounter('counter', 1);
      resetMetrics();
      recordCounter('counter', 2);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(2);
    });
  });

  describe('toPrometheus', () => {
    it('should format counter', () => {
      recordCounter('api_requests_total', 2, { route: '/api/metrics' });

      const prom = toPrometheus();

      expect(prom).toContain('# TYPE api_requests_total counter');
      expect(prom).toContain('api_requests_total{route="/api/metrics"} 2');
    });

    it('should format timing as summary', () => {
      recordTiming('request_latency_ms', 150, { route: '/api/metrics' });

      const prom = toPrometheus();

      expect(prom).toContain('# TYPE request_latency_ms_seconds summary');
      expect(prom).toContain('request_latency_ms_seconds_count{route="/api/metrics"} 1');
      expect(prom).toMatch(/request_latency_ms_seconds_sum\{route="\/api\/metrics"\} 0\.\d+/);
    });

    it('should format gauge', () => {
      recordGauge('connections', 3, { kind: 'sse' });

      const prom = toPrometheus();

      expect(prom).toContain('# TYPE connections gauge');
      expect(prom).toContain('connections{kind="sse"} 3');
    });

    it('should handle metrics without labels', () => {
      recordCounter('simple_counter', 5);

      const prom = toPrometheus();

      expect(prom).toContain('simple_counter 5');
      expect(prom).not.toContain('{}');
    });

    it('should sort labels alphabetically', () => {
      recordCounter('test', 1, { zebra: 'z', alpha: 'a', beta: 'b' });

      const prom = toPrometheus();

      // Labels should be sorted: alpha, beta, zebra
      expect(prom).toMatch(/alpha="a",beta="b",zebra="z"/);
    });

    it('should convert timing ms to seconds', () => {
      recordTiming('request', 1000); // 1 second

      const prom = toPrometheus();

      expect(prom).toMatch(/request_seconds_sum 1\.000000/);
    });

    it('should include max timing', () => {
      recordTiming('request', 100);
      recordTiming('request', 200);

      const prom = toPrometheus();

      expect(prom).toMatch(/request_seconds_max 0\.200000/);
    });

    it('should handle empty metrics', () => {
      const prom = toPrometheus();

      expect(prom).toBe('');
    });

    it('should handle multiple metric types', () => {
      recordCounter('counter', 1);
      recordTiming('timing', 100);
      recordGauge('gauge', 5);

      const prom = toPrometheus();

      expect(prom).toContain('# TYPE counter counter');
      expect(prom).toContain('# TYPE timing_seconds summary');
      expect(prom).toContain('# TYPE gauge gauge');
    });
  });

  describe('toOtlp', () => {
    it('should return OTLP structure', () => {
      const otlp = toOtlp();

      expect(otlp).toHaveProperty('resourceMetrics');
      expect(Array.isArray(otlp.resourceMetrics)).toBe(true);
    });

    it('should include counter metrics', () => {
      recordCounter('test_counter', 5, { tag: 'value' });

      const otlp = toOtlp();
      const metrics = otlp.resourceMetrics[0].scopeMetrics[0].metrics;
      const counter = metrics.find((m: any) => m.name === 'test_counter');

      expect(counter).toBeDefined();
      expect(counter.type).toBe('counter');
      expect(counter.value).toBe(5);
      expect(counter.labels).toEqual({ tag: 'value' });
    });

    it('should include timing metrics', () => {
      recordTiming('request_duration', 150, { route: '/api' });

      const otlp = toOtlp();
      const metrics = otlp.resourceMetrics[0].scopeMetrics[0].metrics;
      const timing = metrics.find((m: any) => m.name === 'request_duration');

      expect(timing).toBeDefined();
      expect(timing.type).toBe('summary');
      expect(timing.count).toBe(1);
      expect(timing.sum_ms).toBe(150);
      expect(timing.max_ms).toBe(150);
    });

    it('should include gauge metrics', () => {
      recordGauge('connections', 3, { type: 'sse' });

      const otlp = toOtlp();
      const metrics = otlp.resourceMetrics[0].scopeMetrics[0].metrics;
      const gauge = metrics.find((m: any) => m.name === 'connections');

      expect(gauge).toBeDefined();
      expect(gauge.type).toBe('gauge');
      expect(gauge.value).toBe(3);
    });

    it('should handle metrics without labels', () => {
      recordCounter('simple_counter', 1);

      const otlp = toOtlp();
      const metrics = otlp.resourceMetrics[0].scopeMetrics[0].metrics;

      expect(metrics[0].labels).toEqual({});
    });

    it('should include all metrics', () => {
      recordCounter('counter', 1);
      recordTiming('timing', 100);
      recordGauge('gauge', 5);

      const otlp = toOtlp();
      const metrics = otlp.resourceMetrics[0].scopeMetrics[0].metrics;

      expect(metrics).toHaveLength(3);
    });
  });

  describe('Label Handling', () => {
    it('should handle special characters in labels', () => {
      recordCounter('test', 1, { path: '/api/user?id=123' });

      const prom = toPrometheus();

      expect(prom).toContain('path="/api/user?id=123"');
    });

    it('should handle empty string label values', () => {
      recordCounter('test', 1, { tag: '' });

      const prom = toPrometheus();

      expect(prom).toContain('tag=""');
    });

    it('should handle quotes in label values', () => {
      recordCounter('test', 1, { msg: 'hello "world"' });

      const prom = toPrometheus();

      expect(prom).toContain('msg="hello "world""');
    });

    it('should handle multiple labels', () => {
      recordCounter('test', 1, { a: '1', b: '2', c: '3' });

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters[0].labels).toEqual({ a: '1', b: '2', c: '3' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long metric names', () => {
      const longName = 'a'.repeat(200);
      recordCounter(longName, 1);

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters[0].name).toBe(longName);
    });

    it('should handle concurrent metric recording', () => {
      for (let i = 0; i < 100; i++) {
        recordCounter('test', 1);
      }

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters[0].value).toBe(100);
    });

    it('should handle NaN values gracefully', () => {
      recordCounter('test', NaN);

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters[0].value).toBeNaN();
    });

    it('should handle Infinity values', () => {
      recordCounter('test', Infinity);

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters[0].value).toBe(Infinity);
    });

    it('should handle negative Infinity', () => {
      recordCounter('test', -Infinity);

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters[0].value).toBe(-Infinity);
    });
  });

  describe('Integration Scenarios', () => {
    it('should track HTTP request metrics', () => {
      // Simulate HTTP request tracking
      recordCounter('http_requests_total', 1, { method: 'GET', status: 200 });
      recordTiming('http_request_duration_ms', 150, { method: 'GET', route: '/api' });

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters.find((c) => c.name === 'http_requests_total')).toBeDefined();
      expect(snapshot.timings.find((t) => t.name === 'http_request_duration_ms')).toBeDefined();
    });

    it('should track database metrics', () => {
      recordCounter('db_queries_total', 1, { operation: 'SELECT' });
      recordTiming('db_query_duration_ms', 50, { operation: 'SELECT' });
      recordGauge('db_connections_active', 5);

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters).toHaveLength(1);
      expect(snapshot.timings).toHaveLength(1);
      expect(snapshot.gauges).toHaveLength(1);
    });

    it('should track cache metrics', () => {
      recordCounter('cache_hits', 10);
      recordCounter('cache_misses', 2);
      recordGauge('cache_size_bytes', 1024000);

      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters).toHaveLength(2);
      expect(snapshot.gauges).toHaveLength(1);
    });
  });
});
