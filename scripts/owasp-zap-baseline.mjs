#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

const target = getArg('--target') || process.env.ZAP_TARGET_URL || process.env.TARGET_URL;
const outDir = resolve(getArg('--out') || 'reports/security');
const reportFile = getArg('--report') || 'zap-baseline.html';
const image = process.env.ZAP_IMAGE || 'ghcr.io/zaproxy/zaproxy:stable';

if (!target) {
  console.error('Missing target URL. Use --target https://example.com or set ZAP_TARGET_URL.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const extraDockerArgs = (process.env.OWASP_DOCKER_ARGS || '').split(/\s+/).filter(Boolean);

const dockerArgs = [
  'run',
  '--rm',
  ...extraDockerArgs,
  '-v',
  `${outDir}:/zap/wrk`,
  image,
  'zap-baseline.py',
  '-t',
  target,
  '-r',
  reportFile,
];

const result = spawnSync('docker', dockerArgs, { stdio: 'inherit' });

if (result.error) {
  console.error('Failed to run docker. Ensure Docker is installed and running.');
  console.error(result.error.message || String(result.error));
  process.exit(1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
