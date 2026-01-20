/**
 * SLA Monitoring API
 *
 * GET /api/admin/metrics/sla - Check SLA compliance
 *
 * Acceptance Criteria:
 * - p95 API < 700ms
 * - Error rate < 0.5%
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { getMetricsSnapshot } from "@/lib/metrics";
import { SLA_THRESHOLDS } from "@/lib/metrics/schema";
import { logger } from "@/lib/logger";

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];

interface SLAStatus {
  metric: string;
  current: number;
  threshold: number;
  unit: string;
  status: "pass" | "warning" | "fail";
  message: string;
}

interface SLAReport {
  timestamp: string;
  overallStatus: "healthy" | "degraded" | "critical";
  metrics: SLAStatus[];
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    failed: number;
  };
}

export async function GET(req: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`sla:${ip}`, { limit: 60, windowSeconds: 60 });
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

    const isAdmin = ADMIN_EMAILS.includes(session.user.email.toLowerCase());
    if (!isAdmin) {
      logger.warn("[SLA] Unauthorized access attempt", { email: session.user.email });
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: limit.headers });
    }

    // Get metrics snapshot
    const snapshot = getMetricsSnapshot();

    // Calculate p95 latency across all API endpoints
    let allP95Values: number[] = [];
    let totalRequests = 0;
    let totalErrors = 0;

    for (const timing of snapshot.timings) {
      if (timing.name.includes("api") || timing.name.includes("request") || timing.name.includes("duration")) {
        if (timing.p95 > 0) {
          allP95Values.push(timing.p95);
        }
      }
    }

    for (const counter of snapshot.counters) {
      const labels = counter.labels || {};
      if (counter.name.includes("request") || counter.name.includes("total")) {
        totalRequests += counter.value;
      }
      if (counter.name.includes("error") || counter.name.includes("fail") || labels.status === "error") {
        totalErrors += counter.value;
      }
    }

    // Calculate overall p95 (weighted average or max)
    const overallP95 = allP95Values.length > 0
      ? Math.max(...allP95Values)
      : 0;

    // Calculate error rate
    const errorRate = totalRequests > 0
      ? (totalErrors / totalRequests) * 100
      : 0;

    // Build SLA status report
    const metrics: SLAStatus[] = [];

    // p95 Latency Check
    const p95Status: SLAStatus = {
      metric: "p95_latency",
      current: Math.round(overallP95),
      threshold: SLA_THRESHOLDS.P95_LATENCY_MS,
      unit: "ms",
      status: overallP95 <= SLA_THRESHOLDS.P95_LATENCY_MS ? "pass" :
              overallP95 <= SLA_THRESHOLDS.P95_LATENCY_MS * 1.2 ? "warning" : "fail",
      message: overallP95 <= SLA_THRESHOLDS.P95_LATENCY_MS
        ? `p95 latency (${Math.round(overallP95)}ms) is within threshold`
        : `p95 latency (${Math.round(overallP95)}ms) exceeds ${SLA_THRESHOLDS.P95_LATENCY_MS}ms threshold`,
    };
    metrics.push(p95Status);

    // Error Rate Check
    const errorRateStatus: SLAStatus = {
      metric: "error_rate",
      current: Number(errorRate.toFixed(3)),
      threshold: SLA_THRESHOLDS.ERROR_RATE_PERCENT,
      unit: "%",
      status: errorRate <= SLA_THRESHOLDS.ERROR_RATE_PERCENT ? "pass" :
              errorRate <= SLA_THRESHOLDS.ERROR_RATE_PERCENT * 2 ? "warning" : "fail",
      message: errorRate <= SLA_THRESHOLDS.ERROR_RATE_PERCENT
        ? `Error rate (${errorRate.toFixed(3)}%) is within threshold`
        : `Error rate (${errorRate.toFixed(3)}%) exceeds ${SLA_THRESHOLDS.ERROR_RATE_PERCENT}% threshold`,
    };
    metrics.push(errorRateStatus);

    // Calculate summary
    const passed = metrics.filter((m) => m.status === "pass").length;
    const warnings = metrics.filter((m) => m.status === "warning").length;
    const failed = metrics.filter((m) => m.status === "fail").length;

    // Determine overall status
    let overallStatus: SLAReport["overallStatus"] = "healthy";
    if (failed > 0) {
      overallStatus = "critical";
    } else if (warnings > 0) {
      overallStatus = "degraded";
    }

    const report: SLAReport = {
      timestamp: new Date().toISOString(),
      overallStatus,
      metrics,
      summary: {
        totalChecks: metrics.length,
        passed,
        warnings,
        failed,
      },
    };

    // Log SLA violations
    if (overallStatus !== "healthy") {
      logger.warn("[SLA] SLA violation detected", {
        status: overallStatus,
        violations: metrics.filter((m) => m.status !== "pass"),
      });
    }

    return NextResponse.json(
      { success: true, data: report },
      { headers: limit.headers }
    );
  } catch (err) {
    logger.error("[SLA API Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
