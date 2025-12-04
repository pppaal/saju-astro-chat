export function requirePublicToken(req: Request) {
  const expected = process.env.PUBLIC_API_TOKEN;
  if (!expected) return true; // if unset, allow (dev)
  const got = req.headers.get("x-api-token");
  return got === expected;
}
