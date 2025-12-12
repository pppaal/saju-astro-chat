export function requirePublicToken(req: Request) {
  const expected = process.env.PUBLIC_API_TOKEN;

  if (!expected) {
    // 운영환경에서는 토큰 필수 - 설정 누락 시 차단
    if (process.env.NODE_ENV === "production") {
      console.error("[SECURITY] PUBLIC_API_TOKEN not configured in production");
      return false;
    }
    return true; // 개발환경에서만 허용
  }

  const got = req.headers.get("x-api-token");
  return got === expected;
}
