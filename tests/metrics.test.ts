const test = require("node:test");
const assert = require("node:assert/strict");
const { recordCounter, recordTiming, recordGauge, getMetricsSnapshot, resetMetrics, toPrometheus } = require("../src/lib/metrics");

test("prometheus output renders labels", () => {
  resetMetrics();
  recordCounter("api_requests_total", 2, { route: "/api/metrics" });
  recordTiming("request_latency_ms", 150, { route: "/api/metrics" });
  const prom = toPrometheus();
  assert.match(prom, /api_requests_total\{route="\/api\/metrics"\} 2/);
  assert.match(prom, /request_latency_ms_seconds_count\{route="\/api\/metrics"\} 1/);
});

test("snapshot returns structured samples", () => {
  resetMetrics();
  recordCounter("sample_counter", 1, { tag: "a" });
  recordGauge("connections", 3, { kind: "sse" });
  const snap = getMetricsSnapshot();
  assert.equal(Array.isArray(snap.counters), true);
  assert.equal(snap.counters[0].name, "sample_counter");
  assert.equal(snap.counters[0].value, 1);
  assert.equal(snap.counters[0].labels.tag, "a");
  assert.equal(snap.gauges[0].name, "connections");
  assert.equal(snap.gauges[0].value, 3);
});
