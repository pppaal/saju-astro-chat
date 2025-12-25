import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const candidates = [
  process.env.PYTHON,
  process.env.npm_config_python,
  platform() === "win32" ? "py" : null,
  "python3",
  "python"
].filter(Boolean);

let python = null;
for (const cmd of candidates) {
  const probe = spawnSync(cmd, ["--version"], { stdio: "pipe" });
  if (probe.status === 0) {
    python = cmd;
    break;
  }
}

if (!python) {
  console.error("❌ Python executable not found. Set PYTHON or NPM_CONFIG_PYTHON.");
  process.exit(1);
}

const env = {
  ...process.env,
  SETUPTOOLS_USE_DISTUTILS: "local"
};

const cmds = [
  [python, ["-m", "ensurepip", "--upgrade"]],
  [python, ["-m", "pip", "install", "--upgrade", "pip"]],
  [python, ["-m", "pip", "install", "--upgrade", "setuptools==69.5.1", "wheel"]]
];

for (const [cmd, args] of cmds) {
  const label = `${cmd} ${args.join(" ")}`;
  console.warn(`▶ ${label}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", env });
  if (result.status !== 0) {
    console.error(`❌ Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.warn("✅ Python environment ready (setuptools vendored distutils installed).");