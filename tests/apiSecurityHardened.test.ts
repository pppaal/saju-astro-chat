import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET as calendarGet } from "../src/app/api/calendar/route";
import { POST as compatibilityPost } from "../src/app/api/compatibility/route";
import { POST as feedbackPost } from "../src/app/api/feedback/route";

const restoreEnv = (key: string, value: string | undefined) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};

describe("API auth/validation guards", () => {
  const originalToken = process.env.PUBLIC_API_TOKEN;

  beforeEach(() => {
    process.env.PUBLIC_API_TOKEN = "public-token";
  });

  afterEach(() => {
    restoreEnv("PUBLIC_API_TOKEN", originalToken);
  });

  it("calendar rejects missing/invalid token", async () => {
    const res = await calendarGet(new Request("http://test/api/calendar?birthDate=1990-01-01", {
      headers: { "x-api-token": "wrong" },
    }) as any);
    expect(res.status).toBe(401);
  });

  it("calendar validates required params", async () => {
    const res = await calendarGet(new Request("http://test/api/calendar?birthDate=", {
      headers: { "x-api-token": "public-token" },
    }) as any);
    expect(res.status).toBe(400);
  });

  it("compatibility rejects invalid token", async () => {
    const res = await compatibilityPost(new Request("http://test/api/compatibility", {
      method: "POST",
      headers: { "x-api-token": "wrong", "Content-Type": "application/json" },
      body: JSON.stringify({ persons: [] }),
    }) as any);
    expect(res.status).toBe(401);
  });

  it("compatibility enforces payload shape", async () => {
    const res = await compatibilityPost(new Request("http://test/api/compatibility", {
      method: "POST",
      headers: { "x-api-token": "public-token", "Content-Type": "application/json" },
      body: JSON.stringify({ persons: [] }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it("feedback rejects invalid token", async () => {
    const res = await feedbackPost(new Request("http://test/api/feedback", {
      method: "POST",
      headers: { "x-api-token": "wrong", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }) as any);
    expect(res.status).toBe(401);
  });

  it("feedback requires core fields", async () => {
    const res = await feedbackPost(new Request("http://test/api/feedback", {
      method: "POST",
      headers: { "x-api-token": "public-token", "Content-Type": "application/json" },
      body: JSON.stringify({ helpful: true }),
    }) as any);
    expect(res.status).toBe(400);
  });
});
