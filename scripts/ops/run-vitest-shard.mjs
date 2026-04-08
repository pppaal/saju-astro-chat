import { readdirSync, statSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

function parseFlag(name, fallback) {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (direct) return direct.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  return fallback
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full, out)
      continue
    }
    if (!/\.(test)\.(ts|tsx|js|jsx)$/.test(entry)) continue
    out.push(relative(process.cwd(), full).replace(/\\/g, '/'))
  }
  return out
}

const shardIndex = Number.parseInt(parseFlag('index', '0'), 10)
const shardTotal = Number.parseInt(parseFlag('total', '3'), 10)
const jsonOut = parseFlag('jsonOut', '')

if (!Number.isInteger(shardIndex) || !Number.isInteger(shardTotal) || shardIndex < 0 || shardTotal < 1) {
  console.error('[vitest-shard] invalid shard arguments')
  process.exit(1)
}

const allTests = walk(join(process.cwd(), 'tests')).sort((a, b) => a.localeCompare(b))
const selected = allTests.filter((_, index) => index % shardTotal === shardIndex)

if (selected.length === 0) {
  console.log(`[vitest-shard] no tests selected for shard ${shardIndex + 1}/${shardTotal}`)
  process.exit(0)
}

console.log(`[vitest-shard] shard ${shardIndex + 1}/${shardTotal} running ${selected.length} tests`)

const tmpDir = join(process.cwd(), 'tmp')
mkdirSync(tmpDir, { recursive: true })
const shardConfigPath = join(tmpDir, `vitest-shard-${shardIndex}.mjs`)

writeFileSync(
  shardConfigPath,
  [
    "import baseConfig from '../vitest.config.ts'",
    '',
    'export default {',
    '  ...baseConfig,',
    '  test: {',
    '    ...(baseConfig.test || {}),',
    `    include: ${JSON.stringify(selected, null, 2)},`,
    '  },',
    '}',
    '',
  ].join('\n'),
  'utf8'
)

const vitestArgs = ['vitest', 'run', '--config', shardConfigPath]
if (jsonOut) {
  mkdirSync(dirname(jsonOut), { recursive: true })
  vitestArgs.push('--reporter=json', '--outputFile', jsonOut)
}

const result = spawnSync('npx', vitestArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
})

try {
  unlinkSync(shardConfigPath)
} catch {
  // ignore temp cleanup failure
}

process.exit(result.status ?? 1)
