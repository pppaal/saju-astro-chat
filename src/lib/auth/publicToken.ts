import { recordCounter } from "@/lib/metrics";
import { logger } from "@/lib/logger";

export type TokenValidationResult = { valid: true } | { valid: false; reason: string };

export function requirePublicToken(req: Request): TokenValidationResult {
  const expected = process.env.PUBLIC_API_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      logger.error("[SECURITY] PUBLIC_API_TOKEN not configured in production");
      recordCounter("api.auth.misconfig", 1, { env: "prod" });
      return { valid: false, reason: "Token not configured" };
    }
    // Dev mode: allow when token is not set.
    return { valid: true };
  }

  const got = req.headers.get("x-api-token");
  const ok = got === expected;
  if (!ok) {
    recordCounter("api.auth.invalid_token", 1);
    return { valid: false, reason: "Invalid or missing token" };
  }
  return { valid: true };
}
