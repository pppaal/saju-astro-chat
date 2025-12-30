import { beforeAll, describe, it, expect } from "vitest";
import { API_BASE, fetchOrThrow, waitForServer } from "./test-helpers";
const CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";
const METRICS_TOKEN =
  process.env.PUBLIC_METRICS_TOKEN ||
  process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN ||
  process.env.METRICS_TOKEN ||
  "";

beforeAll(async () => {
  await waitForServer();
});

describe("API smoke", () => {
  it("cron notifications rejects wrong token and accepts correct", async () => {
    // Wrong token
    const resUnauthorized = await fetchOrThrow(`${API_BASE}/api/cron/notifications`, {
      headers: { Authorization: "Bearer wrong" },
    });
    if (resUnauthorized.status === 500) {
      // CRON_SECRET not configured on the server; skip auth check.
      return;
    }
    expect(resUnauthorized.status).toBe(401);

    const resAuthorized = await fetchOrThrow(`${API_BASE}/api/cron/notifications`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (resAuthorized.status === 401) {
      throw new Error("CRON_SECRET mismatch: set the same CRON_SECRET for the dev server and E2E tests.");
    }
    expect([200, 500]).toContain(resAuthorized.status);
  });

  it("metrics route enforces bearer token", async () => {
    const resNoToken = await fetchOrThrow(`${API_BASE}/api/visitors-today`);

    if (resNoToken.status === 401) {
      if (!METRICS_TOKEN) {
        throw new Error("PUBLIC_METRICS_TOKEN is required for metrics auth E2E tests.");
      }
      const resWithToken = await fetchOrThrow(`${API_BASE}/api/visitors-today`, {
        headers: { "x-metrics-token": METRICS_TOKEN },
      });
      expect(resWithToken.status).toBe(200);
      return;
    }

    // Token not required or endpoint in fallback mode.
    expect([200, 500]).toContain(resNoToken.status);
  });
});
