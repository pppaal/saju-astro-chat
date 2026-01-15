import { beforeAll } from "vitest";
import { API_BASE, fetchOrThrow, waitForServer } from "./test-helpers";

beforeAll(async () => {
  await waitForServer();
});

describe("Auth flow", () => {
  it("exposes providers and csrf endpoints", async () => {
    const providersRes = await fetchOrThrow(`${API_BASE}/api/auth/providers`);
    expect(providersRes.status).toBe(200);
    const providers = await providersRes.json();
    expect(providers).not.toBeNull();
    expect(typeof providers).toBe("object");
    if (process.env.GOOGLE_CLIENT_ID) {
      expect(providers.google).toBeTruthy();
    }

    const csrfRes = await fetchOrThrow(`${API_BASE}/api/auth/csrf`);
    expect(csrfRes.status).toBe(200);
    const csrf = await csrfRes.json();
    expect(typeof csrf?.csrfToken).toBe("string");
  });

  it("serves the sign-in page", async () => {
    const res = await fetchOrThrow(`${API_BASE}/auth/signin`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type") || "";
    expect(contentType).toContain("text/html");
  });
});
