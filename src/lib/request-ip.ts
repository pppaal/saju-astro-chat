/**
 * Trusted proxy IPs (Cloudflare, Vercel, etc.)
 * Extend with TRUSTED_PROXY_CIDRS env (comma-separated CIDRs/IPs).
 */
const TRUSTED_PROXY_CIDRS = new Set<string>([
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

const EXTRA_TRUSTED_CIDRS = (process.env.TRUSTED_PROXY_CIDRS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

for (const cidr of EXTRA_TRUSTED_CIDRS) {
  TRUSTED_PROXY_CIDRS.add(cidr)
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let num = 0
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const value = Number(part)
    if (value < 0 || value > 255) return null
    num = (num << 8) + value
  }
  return num >>> 0
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [base, maskStr] = cidr.split('/')
  if (!maskStr) {
    return ip === cidr
  }
  const ipInt = ipv4ToInt(ip)
  const baseInt = ipv4ToInt(base)
  if (ipInt === null || baseInt === null) {
    return false
  }
  const maskBits = Number(maskStr)
  if (!Number.isInteger(maskBits) || maskBits < 0 || maskBits > 32) {
    return false
  }
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0
  return (ipInt & mask) === (baseInt & mask)
}

/**
 * Check if IP is in trusted proxy range
 */
function isTrustedProxy(ip: string): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true // Trust all in development
  }
  if (!ip) return false

  for (const cidr of TRUSTED_PROXY_CIDRS) {
    if (cidr.includes('/')) {
      if (ipInCidr(ip, cidr)) return true
    } else if (ip === cidr) {
      return true
    }
  }
  return false
}

function shouldTrustProxyHeaders(headers: Headers, remoteAddr?: string): boolean {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') return true
  if (process.env.TRUST_PROXY === 'true') return true
  const vercelEnv = process.env.VERCEL
  if (vercelEnv === '1' || vercelEnv === 'true') return true
  if (headers.get('cf-ray')) return true
  if (remoteAddr && isTrustedProxy(remoteAddr)) return true
  return false
}

function getFirstForwardedIp(value: string | null): string | null {
  if (!value) return null
  const first = value
    .split(',')
    .map((part) => part.trim())
    .find(Boolean)
  return first || null
}

/**
 * Get client IP with spoofing protection
 * Only trusts proxy headers when request comes from trusted proxy
 */
export function getClientIp(headers: Headers, remoteAddr?: string): string {
  const directIp = remoteAddr || null
  const trustProxyHeaders = shouldTrustProxyHeaders(headers, remoteAddr)

  if (!trustProxyHeaders) {
    return directIp || 'unknown'
  }

  // Trusted proxy - check proxy headers
  const cfConnecting = headers.get('cf-connecting-ip')
  if (cfConnecting) return cfConnecting

  const vercelForwarded = getFirstForwardedIp(headers.get('x-vercel-forwarded-for'))
  if (vercelForwarded) return vercelForwarded

  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp

  const forwarded = getFirstForwardedIp(headers.get('x-forwarded-for'))
  if (forwarded) return forwarded

  return directIp || 'unknown'
}
