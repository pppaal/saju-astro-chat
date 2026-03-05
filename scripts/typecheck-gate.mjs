import fs from 'node:fs'
import path from 'node:path'
import { runTypecheck, readJson } from './typecheck-utils.mjs'

function readArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index === process.argv.length - 1) return null
  return process.argv[index + 1]
}

const baselinePath = readArg('--baseline') ?? 'reports/typecheck/baseline.json'
const project = readArg('--project') ?? 'tsconfig.json'

if (!fs.existsSync(baselinePath)) {
  console.error(
    `[typecheck-gate] baseline not found at ${path.normalize(baselinePath)}. Run ops:typecheck:update-baseline first.`
  )
  process.exit(1)
}

const baseline = readJson(baselinePath)
const current = runTypecheck(project)

const baselineCodes = baseline.errorCodes ?? {}
const currentCodes = current.errorCodes ?? {}
const codes = new Set([...Object.keys(baselineCodes), ...Object.keys(currentCodes)])

const increasedCodes = []
for (const code of [...codes].sort()) {
  const before = baselineCodes[code] ?? 0
  const after = currentCodes[code] ?? 0
  if (after > before) {
    increasedCodes.push({ code, before, after, delta: after - before })
  }
}

const totalBefore = Number(baseline.totalErrors ?? 0)
const totalAfter = current.totalErrors
const totalDelta = totalAfter - totalBefore
const failed = totalDelta > 0 || increasedCodes.length > 0

console.log(`[typecheck-gate] baseline=${totalBefore}, current=${totalAfter}, delta=${totalDelta}`)

if (increasedCodes.length > 0) {
  console.log('[typecheck-gate] increased error codes:')
  for (const row of increasedCodes) {
    console.log(`- ${row.code}: ${row.before} -> ${row.after} (+${row.delta})`)
  }
}

if (failed) {
  console.error('[typecheck-gate] FAILED: TypeScript error budget regressed.')
  process.exit(1)
}

console.log('[typecheck-gate] PASSED: no regression against baseline.')

