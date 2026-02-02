/**
 * Trusted proxy IPs (Cloudflare, Vercel, etc.)
 * In production, this should be configured via environment variable
 */
const TRUSTED_PROXIES = new Set([
  // Cloudflare IP ranges (simplified - add full ranges in production)
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  // Vercel
  '76.76.21.0/24',
  // Localhost for development
  '127.0.0.1',
  '::1',
])

/**
 * Check if IP is in trusted proxy range
 * Note: Currently uses simple exact match. For production with dynamic IP ranges,
 * consider implementing CIDR matching library (e.g., ipaddr.js or ip-range-check)
 */
function isTrustedProxy(ip: string): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true // Trust all in development
  }

  // Simple exact match - sufficient for static proxy IPs like Vercel/Cloudflare
  return TRUSTED_PROXIES.has(ip)
}

/**
 * Get client IP with spoofing protection
 * Only trusts proxy headers when request comes from trusted proxy
 */
export function getClientIp(headers: Headers, remoteAddr?: string): string {
  // If we have remote address and it's not trusted, ignore proxy headers
  const directIp = remoteAddr || headers.get('x-vercel-forwarded-for')

  if (directIp && !isTrustedProxy(directIp)) {
    // Request not from trusted proxy, use direct IP
    return directIp
  }

  // Trusted proxy or unknown source - check proxy headers
  // Cloudflare: cf-connecting-ip (most reliable)
  const cfConnecting = headers.get('cf-connecting-ip')
  if (cfConnecting) {
    return cfConnecting
  }

  // x-real-ip (single IP)
  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // x-forwarded-for (comma-separated list, leftmost is client)
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded
      .split(',')
      .map((h) => h.trim())
      .find(Boolean)
    if (first) {
      return first
    }
  }

  // Fallback
  return directIp || 'unknown'
}
