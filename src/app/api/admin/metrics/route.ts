/**
 * Admin Metrics Dashboard API
 *
 * GET /api/admin/metrics - Get metrics dashboard data
 * GET /api/admin/metrics?format=prometheus - Get Prometheus format
 * GET /api/admin/metrics?format=otlp - Get OTLP JSON format
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import {
  getMetricsSnapshot,
  toPrometheus,
  toOtlp,
  DashboardRequestSchema,
  type DashboardSummary,
  type DashboardTimeRange,
} from "@/lib/metrics/index";
import { logger } from "@/lib/logger";

// Helper to get admin emails (dynamic for testing)
function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
}

export async function GET(req: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`metrics:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: limit.headers }
      );
    }

    // Admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const isAdmin = getAdminEmails().includes(session.user.email.toLowerCase());
    if (!isAdmin) {
      logger.warn("[Metrics] Unauthorized access attempt", { email: session.user.email });
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: limit.headers });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const timeRange = (searchParams.get("timeRange") || "24h") as DashboardTimeRange;

    // Validate request
    const validationResult = DashboardRequestSchema.safeParse({
      timeRange,
      includeRaw: searchParams.get("includeRaw") === "true",
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validationResult.error.flatten() },
        { status: 400, headers: limit.headers }
      );
    }

    // Return raw formats
    if (format === "prometheus") {
      const prometheusData = toPrometheus();
      return new NextResponse(prometheusData, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          ...Object.fromEntries(limit.headers),
        },
      });
    }

    if (format === "otlp") {
      const otlpData = toOtlp();
      return NextResponse.json(otlpData, { headers: limit.headers });
    }

    // Generate dashboard summary
    const snapshot = getMetricsSnapshot();
    const summary = generateDashboardSummary(snapshot, timeRange);

    const response: {
      success: boolean;
      data: DashboardSummary;
      raw?: ReturnType<typeof getMetricsSnapshot>;
    } = {
      success: true,
      data: summary,
    };

    if (validationResult.data.includeRaw) {
      response.raw = snapshot;
    }

    return NextResponse.json(response, { headers: limit.headers });
  } catch (err) {
    logger.error("[Metrics API Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Metric names for accurate filtering
const REQUEST_METRICS = [
  "api.request.total",
  "http.request.total",
  "destiny.report.total",
  "tarot.reading.total",
  "dream.analysis.total",
  "astrology.chart.total",
];

const ERROR_METRICS = [
  "api.error.total",
];

const CREDIT_METRICS = [
  "credits.usage.total",
];

/**
 * Check if metric name matches any allowed names
 */
function matchesMetricName(name: string, allowed: string[]): boolean {
  return allowed.includes(name);
}

/**
 * Generate dashboard summary from metrics snapshot
 */
function generateDashboardSummary(
  snapshot: ReturnType<typeof getMetricsSnapshot>,
  timeRange: DashboardTimeRange
): DashboardSummary {
  const { counters, timings, gauges } = snapshot;

  // Calculate overview metrics
  let totalRequests = 0;
  let totalErrors = 0;
  let totalLatencySum = 0;
  let totalLatencyCount = 0;

  const serviceMetrics: Record<string, { requests: number; errors: number; latencySum: number; latencyCount: number; p95Samples: number[] }> = {};
  const allLatencySamples: number[] = [];
  const errorCounts: Record<string, number> = {};
  const creditsByService: Record<string, number> = {};

  // Process counters with precise metric matching
  for (const counter of counters) {
    const name = counter.name;
    const labels = counter.labels || {};
    const service = String(labels.service || labels.theme || "unknown");

    // API requests - only count explicit request metrics
    if (matchesMetricName(name, REQUEST_METRICS)) {
      totalRequests += counter.value;

      if (!serviceMetrics[service]) {
        serviceMetrics[service] = { requests: 0, errors: 0, latencySum: 0, latencyCount: 0, p95Samples: [] };
      }
      serviceMetrics[service].requests += counter.value;
    }

    // Errors - only count explicit error metrics
    if (matchesMetricName(name, ERROR_METRICS)) {
      totalErrors += counter.value;

      if (serviceMetrics[service]) {
        serviceMetrics[service].errors += counter.value;
      } else {
        serviceMetrics[service] = { requests: 0, errors: counter.value, latencySum: 0, latencyCount: 0, p95Samples: [] };
      }

      const errorKey = `${service}:${labels.error_category || "unknown"}`;
      errorCounts[errorKey] = (errorCounts[errorKey] || 0) + counter.value;
    }

    // Credits - only count credit usage metrics
    if (matchesMetricName(name, CREDIT_METRICS)) {
      creditsByService[service] = (creditsByService[service] || 0) + counter.value;
    }
  }

  // Process timings (with p95 support)
  for (const timing of timings) {
    const labels = timing.labels || {};
    const service = String(labels.service || labels.theme || "unknown");

    totalLatencySum += timing.sum;
    totalLatencyCount += timing.count;

    // Collect p95 value from timing
    if (timing.p95 !== undefined) {
      allLatencySamples.push(timing.p95);
    }

    if (serviceMetrics[service]) {
      serviceMetrics[service].latencySum += timing.sum;
      serviceMetrics[service].latencyCount += timing.count;
      if (timing.p95 !== undefined) {
        serviceMetrics[service].p95Samples.push(timing.p95);
      }
    }
  }

  // Calculate overall p95 as max of individual p95s (conservative upper bound)
  // Note: Taking p95 of p95s is statistically incorrect; max gives a valid upper bound
  const overallP95 = allLatencySamples.length > 0 ? Math.max(...allLatencySamples) : 0;

  // Process gauges for active users
  let activeUsers = 0;
  for (const gauge of gauges) {
    if (gauge.name.includes("session") || gauge.name.includes("active")) {
      activeUsers += gauge.value;
    }
  }

  // Build service summary with p95 (max of p95s per service)
  const services: DashboardSummary["services"] = {};
  for (const [service, metrics] of Object.entries(serviceMetrics)) {
    if (service === "unknown") continue;
    services[service] = {
      requests: metrics.requests,
      errors: metrics.errors,
      avgLatencyMs: metrics.latencyCount > 0 ? Math.round(metrics.latencySum / metrics.latencyCount) : 0,
      p95LatencyMs: metrics.p95Samples.length > 0 ? Math.max(...metrics.p95Samples) : undefined,
    };
  }

  // Build top errors list
  const topErrors: DashboardSummary["topErrors"] = Object.entries(errorCounts)
    .map(([key, count]) => {
      const [service, category] = key.split(":");
      return { service, category, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    timeRange,
    timestamp: new Date().toISOString(),
    overview: {
      totalRequests,
      errorRate: totalRequests > 0 ? Number((totalErrors / totalRequests * 100).toFixed(2)) : 0,
      avgLatencyMs: totalLatencyCount > 0 ? Math.round(totalLatencySum / totalLatencyCount) : 0,
      p95LatencyMs: overallP95,
      activeUsers,
    },
    services,
    topErrors,
    credits: {
      totalUsed: Object.values(creditsByService).reduce((sum, v) => sum + v, 0),
      byService: creditsByService,
    },
  };
}
