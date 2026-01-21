/**
 * Subresource Integrity (SRI) Hashes
 *
 * Pre-computed SRI hashes for external CDN scripts.
 * These hashes ensure that external scripts haven't been tampered with.
 *
 * To generate a new hash:
 * 1. Download the script: curl -s https://example.com/script.js > script.js
 * 2. Generate hash: openssl dgst -sha384 -binary script.js | openssl base64 -A
 * 3. Add prefix: sha384-<hash>
 *
 * Or use https://www.srihash.org/
 */

export interface SRIEntry {
  /** Script URL */
  url: string;
  /** SRI hash(es) - can include multiple for different algorithms */
  integrity: string;
  /** Cross-origin attribute */
  crossOrigin?: "anonymous" | "use-credentials";
  /** Script version for tracking */
  version?: string;
  /** Last updated date */
  updatedAt?: string;
}

/**
 * SRI hashes for external CDN scripts
 *
 * Note: These hashes need to be updated when CDN script versions change
 */
export const SRI_HASHES: Record<string, SRIEntry> = {
  // Kakao SDK 2.6.0
  // Note: Kakao SDK doesn't provide official SRI hashes
  // This hash should be verified by downloading and hashing the script
  kakaoSdk: {
    url: "https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js",
    // To generate: curl -s https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js | openssl dgst -sha384 -binary | openssl base64 -A
    integrity: "", // Empty until verified - SRI not enforced without hash
    crossOrigin: "anonymous",
    version: "2.6.0",
    updatedAt: "2026-01-21",
  },

  // Google Analytics gtag.js
  // Note: GA scripts are dynamically generated, SRI not recommended
  googleAnalytics: {
    url: "https://www.googletagmanager.com/gtag/js",
    integrity: "", // Dynamic content - cannot use SRI
    version: "dynamic",
  },

  // Microsoft Clarity
  // Note: Clarity scripts are dynamically generated
  clarity: {
    url: "https://www.clarity.ms/tag/",
    integrity: "", // Dynamic content - cannot use SRI
    version: "dynamic",
  },
};

/**
 * Get SRI attributes for a script URL
 */
export function getSRIAttributes(
  key: keyof typeof SRI_HASHES
): { integrity?: string; crossOrigin?: string } | null {
  const entry = SRI_HASHES[key];
  if (!entry || !entry.integrity) {
    return null;
  }

  return {
    integrity: entry.integrity,
    crossOrigin: entry.crossOrigin,
  };
}

/**
 * Check if SRI is available for a URL
 */
export function hasSRI(key: keyof typeof SRI_HASHES): boolean {
  const entry = SRI_HASHES[key];
  return !!entry?.integrity;
}

/**
 * Get all scripts that need SRI updates
 */
export function getScriptsNeedingSRI(): SRIEntry[] {
  return Object.values(SRI_HASHES).filter(
    (entry) => !entry.integrity && entry.version !== "dynamic"
  );
}

/**
 * Generate script tag with SRI if available
 */
export function generateScriptTag(
  key: keyof typeof SRI_HASHES,
  additionalAttrs: Record<string, string> = {}
): string {
  const entry = SRI_HASHES[key];
  if (!entry) {
    throw new Error(`Unknown script key: ${key}`);
  }

  const attrs: string[] = [`src="${entry.url}"`];

  if (entry.integrity) {
    attrs.push(`integrity="${entry.integrity}"`);
  }

  if (entry.crossOrigin) {
    attrs.push(`crossorigin="${entry.crossOrigin}"`);
  }

  for (const [key, value] of Object.entries(additionalAttrs)) {
    attrs.push(`${key}="${value}"`);
  }

  return `<script ${attrs.join(" ")}></script>`;
}

/**
 * Verify SRI hash (for testing/validation)
 * Note: This requires fetching the script, use server-side only
 */
export async function verifySRIHash(
  url: string,
  expectedHash: string
): Promise<{ valid: boolean; actualHash?: string; error?: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { valid: false, error: `Failed to fetch: ${response.status}` };
    }

    const content = await response.text();

    // Node.js crypto for server-side
    if (typeof window === "undefined") {
      const crypto = await import("crypto");
      const hash = crypto
        .createHash("sha384")
        .update(content)
        .digest("base64");
      const actualHash = `sha384-${hash}`;

      return {
        valid: actualHash === expectedHash,
        actualHash,
      };
    }

    // Browser SubtleCrypto
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-384", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode(...hashArray));
    const actualHash = `sha384-${hashBase64}`;

    return {
      valid: actualHash === expectedHash,
      actualHash,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
