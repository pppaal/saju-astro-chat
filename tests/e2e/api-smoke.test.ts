import { describe, it, expect } from "vitest";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";
const METRICS_TOKEN = process.env.METRICS_TOKEN || "test-metrics-token";

describe("API smoke", () => {
  it("cron notifications rejects wrong token and accepts correct", async () => {
    // Wrong token
    const resUnauthorized = await fetch(`${API_BASE}/api/cron/notifications`, {
      headers: { Authorization: "Bearer wrong" },
    });
    expect(resUnauthorized.status).toBe(401);

    // Correct token
    const resAuthorized = await fetch(`${API_BASE}/api/cron/notifications`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect([200, 500]).toContain(resAuthorized.status);
  });

  it("metrics route enforces bearer token", async () => {
    const resNoToken = await fetch(`${API_BASE}/api/metrics`);
    expect(resNoToken.status).toBe(401);

    const resWithToken = await fetch(`${API_BASE}/api/metrics`, {
      headers: { Authorization: `Bearer ${METRICS_TOKEN}` },
    });
    expect(resWithToken.status).toBe(200);
  });
});
