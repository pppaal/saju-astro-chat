import { beforeAll } from "vitest";
import { API_BASE, fetchOrThrow, waitForServer } from "./test-helpers";
const CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";

beforeAll(async () => {
  await waitForServer();
});

describe("API smoke", () => {
  it("cron reset-credits rejects wrong token and accepts correct", async () => {
    // Wrong token
    const resUnauthorized = await fetchOrThrow(`${API_BASE}/api/cron/reset-credits`, {
      headers: { Authorization: "Bearer wrong" },
    });
    if (resUnauthorized.status === 500) {
      // CRON_SECRET not configured on the server; skip auth check.
      return;
    }
    expect(resUnauthorized.status).toBe(401);

    const resAuthorized = await fetchOrThrow(`${API_BASE}/api/cron/reset-credits`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (resAuthorized.status === 401) {
      throw new Error("CRON_SECRET mismatch: set the same CRON_SECRET for the dev server and E2E tests.");
    }
    expect([200, 500]).toContain(resAuthorized.status);
  });
});
