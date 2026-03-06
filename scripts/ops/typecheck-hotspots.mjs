import { spawnSync } from 'node:child_process'

const result = spawnSync('pnpm', ['-s', 'exec', 'tsc', '--noEmit'], {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
})

const output = `${result.stdout || ''}\n${result.stderr || ''}`
const lines = output.split('\n').filter((line) => /\.ts\(\d+,\d+\): error TS\d+/.test(line))

const byFile = new Map()
for (const line of lines) {
  const m = line.match(/^(.*\.ts)\(\d+,\d+\): error (TS\d+):/)
  if (!m) continue
  const file = m[1]
  const code = m[2]
  const entry = byFile.get(file) || { total: 0, codes: {} }
  entry.total += 1
  entry.codes[code] = (entry.codes[code] || 0) + 1
  byFile.set(file, entry)
}

const sorted = [...byFile.entries()]
  .map(([file, stats]) => ({ file, ...stats }))
  .sort((a, b) => b.total - a.total)

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  passed: result.status === 0,
  hotspotCount: sorted.length,
  top10: sorted.slice(0, 10),
}, null, 2))

process.exit(result.status === 0 ? 0 : 1)
