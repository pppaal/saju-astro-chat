// Shared Swiss Ephemeris accessor (server-only)
import path from "path";

let sw: any;
let ephePathSet = false;

function ensureEphePath() {
  if (ephePathSet || !sw) return;
  const ephePath = process.env.EPHE_PATH || path.join(process.cwd(), "public", "ephe");
  sw.swe_set_ephe_path(ephePath);
  ephePathSet = true;
}

export function getSwisseph() {
  if (typeof window !== "undefined") {
    throw new Error("swisseph is server-only and must not run in the browser.");
  }
  if (!sw) {
    // Lazy require to avoid bundling into client
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sw = require("swisseph");
  }
  ensureEphePath();
  return sw;
}
