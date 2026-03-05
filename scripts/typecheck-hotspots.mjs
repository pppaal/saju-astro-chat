import path from 'node:path'
import { runTypecheck, writeJson } from './typecheck-utils.mjs'

function readArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index === process.argv.length - 1) return null
  return process.argv[index + 1]
}

const outPath = readArg('--out') ?? 'reports/typecheck/hotspots.json'
const mirrorOutPath = readArg('--mirror-out') ?? 'data/ops/typecheck-hotspots.json'
const project = readArg('--project') ?? 'tsconfig.json'
const top = Number(readArg('--top') ?? '20')

const result = runTypecheck(project)

const payload = {
  generatedAt: new Date().toISOString(),
  project,
  totalErrors: result.totalErrors,
  topFiles: result.fileHotspots.slice(0, top),
  topCodes: Object.entries(result.errorCodes).slice(0, top).map(([code, count]) => ({
    code,
    count,
  })),
}

writeJson(outPath, payload)
if (mirrorOutPath && mirrorOutPath !== outPath) {
  writeJson(mirrorOutPath, payload)
}

console.log(`[typecheck-hotspots] wrote ${path.normalize(outPath)}`)
if (mirrorOutPath && mirrorOutPath !== outPath) {
  console.log(`[typecheck-hotspots] wrote ${path.normalize(mirrorOutPath)}`)
}
console.log(`[typecheck-hotspots] totalErrors=${payload.totalErrors}`)

if (payload.topFiles.length === 0) {
  console.log('[typecheck-hotspots] No hotspots found. TypeScript is clean.')
} else {
  console.log('[typecheck-hotspots] top files:')
  for (const hotspot of payload.topFiles.slice(0, 10)) {
    console.log(`- ${hotspot.file}: ${hotspot.count}`)
  }
}
