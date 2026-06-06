/**
 * Photo URL host allowlist.
 *
 * Why: client-submitted photo URLs (User.image 등) used
 * to be validated as `z.string().max(500)` only — which accepts
 * `javascript:alert(1)`, `data:text/html,<script>...</script>`,
 * `http://169.254.169.254/...` (AWS metadata SSRF), and arbitrary attacker
 * domains. Once persisted, those URLs render in <img>/next-image and can
 * execute script in some browsers/extensions, hotlink attacker content, or
 * trip server-side image proxies into SSRF.
 *
 * The allowlist below mirrors the hosts our app already trusts for image
 * rendering — keep it in sync with `next.config.ts` `images.remotePatterns`
 * (single source of truth for "where can <Image> load from"). Adding a new
 * Blob/Storage backend means updating BOTH.
 */

/**
 * Exact hostnames or `*.suffix` wildcards. `*.foo.com` matches any subdomain
 * of foo.com (but not `foo.com` itself, by design — we never want a bare
 * apex matching a wildcard-only entry).
 */
export const PHOTO_HOST_ALLOWLIST: readonly string[] = [
  // Vercel Blob — profile-photos/<userId>/… uploaded via /api/me/upload-photo.
  // Store-id is part of the subdomain so we need wildcard.
  '*.public.blob.vercel-storage.com',
  // Firebase Storage (legacy uploads still live here).
  'firebasestorage.googleapis.com',
  // GCS direct.
  'storage.googleapis.com',
  // Provider avatars surfaced via NextAuth (Google / GitHub).
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
  // Unsplash — used for marketing/seed imagery in matchmaking flows.
  'images.unsplash.com',
]

function hostnameMatches(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1) // ".public.blob.vercel-storage.com"
    return hostname.endsWith(suffix) && hostname.length > suffix.length
  }
  return hostname === pattern
}

/**
 * Returns true iff `url` parses as a valid https URL whose hostname matches
 * one of PHOTO_HOST_ALLOWLIST. Anything else — `javascript:`, `data:`,
 * `http:`, malformed, ip-literal hosts, attacker.com — returns false.
 *
 * NOTE: do not loosen this to "starts with https://" string check. URL
 * parsing also rejects `https://user@evil.com/` style auth confusion and
 * normalizes uppercase scheme.
 */
export function isAllowedPhotoHost(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2000) {
    return false
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:') {
    return false
  }

  // Reject embedded credentials (`https://attacker.com@trusted.com/…` would
  // parse with hostname=trusted.com but the browser sends auth to attacker).
  // We just refuse the URL entirely.
  if (parsed.username || parsed.password) {
    return false
  }

  const hostname = parsed.hostname.toLowerCase()
  if (!hostname) {
    return false
  }

  return PHOTO_HOST_ALLOWLIST.some((pattern) => hostnameMatches(hostname, pattern))
}
