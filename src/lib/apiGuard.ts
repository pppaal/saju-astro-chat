import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { NextResponse } from "next/server";

type GuardOptions = {
  path: string;
  limit?: number;
  windowSeconds?: number;
  requireTokenEnv?: string; // env var name, e.g., PUBLIC_API_TOKEN
};

export async function apiGuard(req: Request, opts: GuardOptions) {
  const headers = req.headers;
  const ip = getClientIp(headers);

  // token check (optional)
  if (opts.requireTokenEnv) {
    const expected = process.env[opts.requireTokenEnv];
    if (expected) {
      const auth = headers.get("authorization") || "";
      const token =
        auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : headers.get("x-api-key");
      if (token !== expected) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }
  }

  // rate limit
  const res = await rateLimit(`api:${opts.path}:${ip}`, {
    limit: opts.limit ?? 60,
    windowSeconds: opts.windowSeconds ?? 60,
  });
  if (!res.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: res.reset },
      { status: 429, headers: res.headers }
    );
  }

  const responseHeaders = res.headers;
  return { headers: responseHeaders };
}
