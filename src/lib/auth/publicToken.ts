import { recordCounter } from "@/lib/metrics";

export function requirePublicToken(req: Request) {
  const expected = process.env.PUBLIC_API_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.error("[SECURITY] PUBLIC_API_TOKEN not configured in production");
      recordCounter("api.auth.misconfig", 1, { env: "prod" });
      return false;
    }
    // Dev mode: allow when token is not set.
    return true;
  }

  const got = req.headers.get("x-api-token");
  const ok = got === expected;
  if (!ok) {
    recordCounter("api.auth.invalid_token", 1);
  }
  return ok;
}
