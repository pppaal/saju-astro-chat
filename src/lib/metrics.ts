import { logger } from "@/lib/logger";

type Labels = Record<string, string | number | boolean>;

type CounterSample = { name: string; labels?: Labels; value: number };
type TimingSample = { name: string; labels?: Labels; count: number; sum: number; max: number; samples: number[] };
type GaugeSample = { name: string; labels?: Labels; value: number };

// Maximum samples to keep for percentile calculations
const MAX_SAMPLES = 1000;

const counters: Record<string, CounterSample> = {};
const timings: Record<string, TimingSample> = {};
const gauges: Record<string, GaugeSample> = {};

const labelStr = (labels?: Labels) =>
  labels
    ? Object.entries(labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}="${String(v)}"`)
        .join(",")
    : "";

function makeKey(name: string, labels?: Labels) {
  return `${name}|${labelStr(labels)}`;
}

export function recordCounter(name: string, value = 1, labels?: Labels) {
  const key = makeKey(name, labels);
  const sample = (counters[key] = counters[key] || { name, labels, value: 0 });
  sample.value += value;
  if (process.env.NODE_ENV !== "production") {
    logger.debug(`[metric] counter ${name}=${sample.value}`, labels ?? {});
  }
}

export function recordTiming(name: string, ms: number, labels?: Labels) {
  const key = makeKey(name, labels);
  const bucket = (timings[key] =
    timings[key] || { name, labels, count: 0, sum: 0, max: 0, samples: [] });
  bucket.count += 1;
  bucket.sum += ms;
  bucket.max = Math.max(bucket.max, ms);

  // Keep samples for percentile calculation (circular buffer)
  if (bucket.samples.length < MAX_SAMPLES) {
    bucket.samples.push(ms);
  } else {
    // Replace oldest sample (simple circular)
    bucket.samples[bucket.count % MAX_SAMPLES] = ms;
  }

  if (process.env.NODE_ENV !== "production") {
    logger.debug(`[metric] timing ${name}=${ms.toFixed(1)}ms`, labels ?? {});
  }
}

// Gauges represent the latest value (not cumulative)
export function recordGauge(name: string, value: number, labels?: Labels) {
  const key = makeKey(name, labels);
  gauges[key] = { name, labels, value };
  if (process.env.NODE_ENV !== "production") {
    logger.debug(`[metric] gauge ${name}=${value}`, labels ?? {});
  }
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedSamples: number[], percentile: number): number {
  if (sortedSamples.length === 0) {return 0;}
  const index = Math.ceil((percentile / 100) * sortedSamples.length) - 1;
  return sortedSamples[Math.max(0, Math.min(index, sortedSamples.length - 1))];
}

export function getMetricsSnapshot() {
  return {
    counters: Object.values(counters),
    gauges: Object.values(gauges),
    timings: Object.values(timings).map((t) => {
      const sortedSamples = [...t.samples].sort((a, b) => a - b);
      return {
        name: t.name,
        labels: t.labels,
        count: t.count,
        sum: t.sum,
        max: t.max,
        avg: t.count ? t.sum / t.count : 0,
        p50: calculatePercentile(sortedSamples, 50),
        p95: calculatePercentile(sortedSamples, 95),
        p99: calculatePercentile(sortedSamples, 99),
      };
    }),
  };
}

export function resetMetrics() {
  Object.keys(counters).forEach((k) => delete counters[k]);
  Object.keys(timings).forEach((k) => delete timings[k]);
  Object.keys(gauges).forEach((k) => delete gauges[k]);
}

export function toPrometheus() {
  const lines: string[] = [];
  for (const sample of Object.values(counters)) {
    const suffix = labelStr(sample.labels);
    const labelsFmt = suffix ? `{${suffix}}` : "";
    lines.push(`# TYPE ${sample.name} counter`);
    lines.push(`${sample.name}${labelsFmt} ${sample.value}`);
  }
  for (const sample of Object.values(gauges)) {
    const suffix = labelStr(sample.labels);
    const labelsFmt = suffix ? `{${suffix}}` : "";
    lines.push(`# TYPE ${sample.name} gauge`);
    lines.push(`${sample.name}${labelsFmt} ${sample.value}`);
  }
  for (const sample of Object.values(timings)) {
    const suffix = labelStr(sample.labels);
    const labelsFmt = suffix ? `{${suffix}}` : "";
    const avg = sample.count ? sample.sum / sample.count : 0;
    const sortedSamples = [...sample.samples].sort((a, b) => a - b);
    const p50 = calculatePercentile(sortedSamples, 50);
    const p95 = calculatePercentile(sortedSamples, 95);
    const p99 = calculatePercentile(sortedSamples, 99);

    lines.push(`# TYPE ${sample.name}_seconds summary`);
    lines.push(`${sample.name}_seconds_count${labelsFmt} ${sample.count}`);
    lines.push(`${sample.name}_seconds_sum${labelsFmt} ${(sample.sum / 1000).toFixed(6)}`);
    lines.push(`${sample.name}_seconds_avg${labelsFmt} ${(avg / 1000).toFixed(6)}`);
    lines.push(`${sample.name}_seconds_max${labelsFmt} ${(sample.max / 1000).toFixed(6)}`);
    lines.push(`${sample.name}_seconds{quantile="0.5"${suffix ? "," + suffix : ""}} ${(p50 / 1000).toFixed(6)}`);
    lines.push(`${sample.name}_seconds{quantile="0.95"${suffix ? "," + suffix : ""}} ${(p95 / 1000).toFixed(6)}`);
    lines.push(`${sample.name}_seconds{quantile="0.99"${suffix ? "," + suffix : ""}} ${(p99 / 1000).toFixed(6)}`);
  }
  return lines.join("\n");
}

// Minimal OTLP-style payload for HTTP/JSON receivers
export function toOtlp() {
  return {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              ...Object.values(counters).map((c) => ({
                name: c.name,
                type: "counter",
                value: c.value,
                labels: c.labels ?? {},
              })),
              ...Object.values(timings).map((t) => {
                const sortedSamples = [...t.samples].sort((a, b) => a - b);
                return {
                  name: t.name,
                  type: "summary",
                  count: t.count,
                  sum_ms: t.sum,
                  max_ms: t.max,
                  p50_ms: calculatePercentile(sortedSamples, 50),
                  p95_ms: calculatePercentile(sortedSamples, 95),
                  p99_ms: calculatePercentile(sortedSamples, 99),
                  labels: t.labels ?? {},
                };
              }),
              ...Object.values(gauges).map((g) => ({
                name: g.name,
                type: "gauge",
                value: g.value,
                labels: g.labels ?? {},
              })),
            ],
          },
        ],
      },
    ],
  };
}
