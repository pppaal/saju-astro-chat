import { logger } from "@/lib/logger";

type Labels = Record<string, string | number | boolean>;

type CounterSample = { name: string; labels?: Labels; value: number };
type TimingSample = { name: string; labels?: Labels; count: number; sum: number; max: number };
type GaugeSample = { name: string; labels?: Labels; value: number };

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
    timings[key] || { name, labels, count: 0, sum: 0, max: 0 });
  bucket.count += 1;
  bucket.sum += ms;
  bucket.max = Math.max(bucket.max, ms);
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

export function getMetricsSnapshot() {
  return {
    counters: Object.values(counters),
    gauges: Object.values(gauges),
    timings: Object.values(timings).map((t) => ({
      ...t,
      avg: t.count ? t.sum / t.count : 0,
    })),
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
    lines.push(`# TYPE ${sample.name}_seconds summary`);
    lines.push(`${sample.name}_seconds_count${labelsFmt} ${sample.count}`);
    lines.push(`${sample.name}_seconds_sum${labelsFmt} ${(sample.sum / 1000).toFixed(6)}`);
    lines.push(`${sample.name}_seconds_avg${labelsFmt} ${(avg / 1000).toFixed(6)}`);
    lines.push(`${sample.name}_seconds_max${labelsFmt} ${(sample.max / 1000).toFixed(6)}`);
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
              ...Object.values(timings).map((t) => ({
                name: t.name,
                type: "summary",
                count: t.count,
                sum_ms: t.sum,
                max_ms: t.max,
                labels: t.labels ?? {},
              })),
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
