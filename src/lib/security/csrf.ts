/**
 * CSRF Protection Utilities
 * Validates request origin to prevent cross-site request forgery.
 *
 * This is the single shared origin validator used by BOTH the edge
 * middleware (`middleware.ts`) and the API context layer
 * (`src/lib/api/middleware/context.ts`). It must stay edge-compatible:
 * only Web-standard APIs (Headers, URL) — no Node-only modules.
 */

/**
 * Collect the set of hosts the request was addressed to.
 * Includes the `host` header and any `x-forwarded-host` values
 * (comma-separated when behind multiple proxies). All lower-cased.
 */
function getRequestHosts(headers: Headers): Set<string> {
  const hosts = new Set<string>();
  const host = headers.get("host");
  if (host) hosts.add(host.toLowerCase());

  const forwardedHost = headers.get("x-forwarded-host");
  if (forwardedHost) {
    for (const value of forwardedHost.split(",")) {
      const normalized = value.trim().toLowerCase();
      if (normalized) hosts.add(normalized);
    }
  }
  return hosts;
}

/**
 * Returns true if `urlValue` parses to a URL whose host matches one of
 * the request's own hosts (same-origin / same-host request). Supports
 * Vercel preview URLs and custom domains automatically.
 */
function isSameHostUrl(urlValue: string, requestHosts: Set<string>): boolean {
  try {
    const parsed = new URL(urlValue);
    return requestHosts.has(parsed.host.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Build the set of explicitly allowed origins from environment config.
 * - NEXT_PUBLIC_BASE_URL and VERCEL_URL are normalized via URL.origin.
 * - ALLOWED_ORIGINS entries are added as raw (trimmed) strings to support
 *   non-http schemes (e.g. capacitor://, ionic://, file://) whose URL.origin
 *   normalizes to the string "null".
 */
function getAllowedOrigins(): Set<string> {
  const allowedOrigins = new Set<string>();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (baseUrl) {
    try {
      allowedOrigins.add(new URL(baseUrl).origin);
    } catch {
      // Invalid base URL
    }
  }

  // Allow Vercel preview deployments for the same project
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    try {
      allowedOrigins.add(new URL(`https://${vercelUrl}`).origin);
    } catch {
      // Invalid VERCEL_URL
    }
  }

  // Additional allowed origins from env (comma-separated).
  // http(s) origins are normalized via URL.origin (lowercased scheme+host) so
  // they match the browser's Origin header, which is always lowercase per
  // RFC 3986 / WHATWG URL — otherwise a config like `https://Partner.com`
  // would reject the legitimate `https://partner.com` request (false CSRF
  // block / self-DoS). Custom-scheme origins (capacitor://, ionic://, file://,
  // Electron) are kept raw because URL.origin normalizes them to "null".
  const additionalOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
  for (const o of additionalOrigins) {
    const trimmed = o.trim();
    if (!trimmed) {
      continue;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        allowedOrigins.add(new URL(trimmed).origin);
      } catch {
        allowedOrigins.add(trimmed);
      }
    } else {
      allowedOrigins.add(trimmed);
    }
  }

  return allowedOrigins;
}

/**
 * Strict localhost dev allowlist. Only specific well-known local dev ports
 * are permitted, which prevents DNS-rebinding attacks that resolve an
 * attacker domain to 127.0.0.1 (a bare `startsWith('localhost')` check is
 * not enough — the Host header is attacker-controllable).
 */
const SAFE_LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1):(3000|3001|4000)$/;

/**
 * Validates that the request origin matches allowed origins.
 *
 * @param headers - Request headers (works for both `Request.headers` and
 *                   `NextRequest.headers`, which are standard `Headers`).
 * @returns true if origin is valid, false otherwise.
 */
export function validateOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const referer = headers.get("referer");
  const requestHosts = getRequestHosts(headers);

  // SECURITY: Require origin/referer even in development for better security
  // hygiene. Only allow a localhost bypass for specific safe dev ports to
  // prevent DNS-rebinding attacks.
  if (!origin && !referer) {
    if (process.env.NODE_ENV === "development") {
      const host = headers.get("host");
      if (host && SAFE_LOCAL_HOST_PATTERN.test(host)) {
        return true;
      }
    }
    return false;
  }

  // Same-host requests are always allowed (supports Vercel preview URLs and
  // custom domains automatically).
  if (origin && isSameHostUrl(origin, requestHosts)) {
    return true;
  }
  if (referer && isSameHostUrl(referer, requestHosts)) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check origin header against the explicit allowlist
  if (origin && allowedOrigins.has(origin)) {
    return true;
  }

  // Check referer header as a fallback (compare its origin)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowedOrigins.has(refererUrl.origin)) {
        return true;
      }
    } catch {
      // Invalid referer URL
    }
  }

  return false;
}

/**
 * Creates a CSRF validation middleware response.
 * @param headers - Request headers
 * @returns Response object if CSRF check fails, null otherwise
 */
export function csrfGuard(headers: Headers): Response | null {
  if (!validateOrigin(headers)) {
    return new Response(
      JSON.stringify({ error: "csrf_validation_failed" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  return null;
}
