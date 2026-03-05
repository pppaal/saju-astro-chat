import path from 'node:path'
import { runTypecheck, writeJson } from './typecheck-utils.mjs'

function readArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index === process.argv.length - 1) return null
  return process.argv[index + 1]
}

const outPath = readArg('--out') ?? 'reports/typecheck/baseline.json'
const mirrorOutPath = readArg('--mirror-out') ?? 'data/ops/typecheck-metrics.json'
const project = readArg('--project') ?? 'tsconfig.json'
const failOnErrors = process.argv.includes('--fail-on-errors')

const result = runTypecheck(project)
const payload = {
  generatedAt: new Date().toISOString(),
  project,
  command: result.command,
  tscExitCode: result.exitCode,
  totalErrors: result.totalErrors,
  errorCodes: result.errorCodes,
  hotspotCount: result.fileHotspots.length,
  hotspots: result.fileHotspots.slice(0, 20),
}

writeJson(outPath, payload)
if (mirrorOutPath && mirrorOutPath !== outPath) {
  writeJson(mirrorOutPath, payload)
}

console.log(`[typecheck-metrics] wrote ${path.normalize(outPath)}`)
if (mirrorOutPath && mirrorOutPath !== outPath) {
  console.log(`[typecheck-metrics] wrote ${path.normalize(mirrorOutPath)}`)
}
console.log(`[typecheck-metrics] totalErrors=${payload.totalErrors}`)

for (const [code, count] of Object.entries(payload.errorCodes)) {
  console.log(`[typecheck-metrics] ${code}=${count}`)
}

if (payload.totalErrors === 0) {
  console.log('[typecheck-metrics] TypeScript baseline is clean.')
}

if (failOnErrors && payload.totalErrors > 0) {
  process.exit(1)
}
