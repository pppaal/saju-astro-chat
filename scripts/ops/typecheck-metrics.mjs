import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const result = spawnSync('pnpm', ['-s', 'exec', 'tsc', '--noEmit'], {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
})

const output = `${result.stdout || ''}\n${result.stderr || ''}`
const lines = output.split('\n').filter((line) => /error TS\d+/.test(line))

const byCode = {}
for (const line of lines) {
  const m = line.match(/error (TS\d+):/)
  if (!m) continue
  byCode[m[1]] = (byCode[m[1]] || 0) + 1
}

const payload = {
  checkedAt: new Date().toISOString(),
  passed: result.status === 0,
  totalErrors: lines.length,
  byCode,
}

const outPath = path.join(process.cwd(), 'data', 'ops', 'typecheck-metrics.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2))

console.log(JSON.stringify(payload, null, 2))
process.exit(result.status === 0 ? 0 : 1)
