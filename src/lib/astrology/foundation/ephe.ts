// Shared Swiss Ephemeris accessor (server-only)
// IMPORTANT: This file must not have any top-level imports that would fail in the browser.
// All Node.js-specific imports (path, swisseph) are done dynamically inside getSwisseph().

let sw: unknown;
let ephePathSet = false;

/**
 * Returns the Swiss Ephemeris module. Server-only.
 * Throws an error if called from the browser.
 */
export function getSwisseph() {
  // Prevent usage in browser environment
  if (typeof window !== "undefined") {
    throw new Error("swisseph is server-only and must not run in the browser.");
  }

  if (!sw) {
    // Dynamic require to avoid bundling into client
     
    sw = require("swisseph");
  }

  if (!ephePathSet && sw) {
    // Dynamic require of path module
     
    const path = require("path");
    const ephePath = process.env.EPHE_PATH || path.join(process.cwd(), "public", "ephe");
    sw.swe_set_ephe_path(ephePath);
    ephePathSet = true;
  }

  return sw;
}
