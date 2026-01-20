import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const target =
  process.env.OWASP_TARGET_URL ||
  process.env.SECURITY_SCAN_URL ||
  "http://localhost:3000";

const reportDir = resolve(process.env.OWASP_REPORT_DIR || "reports/owasp");
mkdirSync(reportDir, { recursive: true });

const rulesFile = resolve(".zap/rules.tsv");
const hasRulesFile = existsSync(rulesFile);

const image = process.env.OWASP_ZAP_IMAGE || "ghcr.io/zaproxy/zaproxy:stable";
const dockerArgs = (process.env.OWASP_DOCKER_ARGS || "")
  .split(" ")
  .map(arg => arg.trim())
  .filter(Boolean);
const extraArgs = (process.env.OWASP_ZAP_ARGS || "")
  .split(" ")
  .map(arg => arg.trim())
  .filter(Boolean);

// Add rules file mounting if it exists
const rulesMount = hasRulesFile
  ? ["-v", `${rulesFile}:/zap/rules.tsv:ro`]
  : [];
const rulesArgs = hasRulesFile ? ["-c", "/zap/rules.tsv"] : [];

const args = [
  "run",
  "--rm",
  "-t",
  ...dockerArgs,
  "-v",
  `${reportDir}:/zap/wrk`,
  ...rulesMount,
  image,
  "zap-baseline.py",
  "-t",
  target,
  "-r",
  "zap-baseline.html",
  "-J",
  "zap-baseline.json",
  "-w",
  "zap-baseline.md",
  ...rulesArgs,
  ...extraArgs,
];

const result = spawnSync("docker", args, { stdio: "inherit" });

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error("Docker is required to run OWASP ZAP. Install Docker and try again.");
  } else {
    console.error(result.error.message);
  }
  process.exit(1);
}

process.exit(result.status ?? 1);
