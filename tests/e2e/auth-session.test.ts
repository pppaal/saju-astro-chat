import { beforeAll } from "vitest";
import { API_BASE, fetchOrThrow, waitForServer } from "./test-helpers";
const TEST_SESSION_COOKIE = process.env.AUTH_TEST_SESSION_COOKIE;

beforeAll(async () => {
  await waitForServer();
});

describe("Auth session", () => {
  it("returns null session when not authenticated", async () => {
    const res = await fetchOrThrow(`${API_BASE}/api/auth/session`);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data === null) return;
    expect(data.user).toBeUndefined();
  });

  it("returns user when session cookie provided", async () => {
    if (!TEST_SESSION_COOKIE) return;
    const res = await fetchOrThrow(`${API_BASE}/api/auth/session`, {
      headers: { Cookie: TEST_SESSION_COOKIE },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data?.user).toBeTruthy();
  });
});
