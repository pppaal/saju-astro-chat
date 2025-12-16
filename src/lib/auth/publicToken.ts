export function requirePublicToken(req: Request) {
  const expected = process.env.PUBLIC_API_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.error("[SECURITY] PUBLIC_API_TOKEN not configured in production");
      return false;
    }
    // Dev mode: allow when token is not set.
    return true;
  }

  const got = req.headers.get("x-api-token");
  return got === expected;
}
