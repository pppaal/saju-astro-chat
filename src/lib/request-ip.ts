export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",").map((h) => h.trim()).find(Boolean);
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  const cfConnecting = headers.get("cf-connecting-ip");
  if (cfConnecting) return cfConnecting;
  return "unknown";
}
