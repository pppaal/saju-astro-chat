/**
 * CSRF Protection Utilities
 * Validates request origin to prevent cross-site request forgery
 */

/**
 * Validates that the request origin matches allowed origins
 * @param headers - Request headers
 * @returns true if origin is valid, false otherwise
 */
export function validateOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const referer = headers.get("referer");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  // In development, allow requests without origin (e.g., curl, Postman)
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // If no origin/referer and no base URL configured, deny by default
  if (!origin && !referer) {
    return false;
  }

  // Parse allowed origins
  const allowedOrigins = new Set<string>();
  if (baseUrl) {
    try {
      const url = new URL(baseUrl);
      allowedOrigins.add(url.origin);
    } catch {
      // Invalid base URL
    }
  }

  // Add additional allowed origins from env (comma-separated)
  const additionalOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
  for (const o of additionalOrigins) {
    const trimmed = o.trim();
    if (trimmed) {
      allowedOrigins.add(trimmed);
    }
  }

  // Check origin header
  if (origin && allowedOrigins.has(origin)) {
    return true;
  }

  // Check referer header as fallback
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
 * Creates a CSRF validation middleware response
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
