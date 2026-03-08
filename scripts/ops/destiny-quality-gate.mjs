import { spawnSync } from 'node:child_process'

function runStep(name, cmd, args, { allowFailure = false } = {}) {
  console.log(`\n[destiny-gate] ${name}`)
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  })

  if (result.status !== 0) {
    if (allowFailure) {
      console.warn(`[destiny-gate] advisory step failed (non-blocking): ${name}`)
      return
    }
    console.error(`[destiny-gate] FAILED at step: ${name}`)
    process.exit(result.status ?? 1)
  }
}

const mode = process.argv.includes('--full') ? 'full' : 'quick'
console.log(`[destiny-gate] mode=${mode}`)

runStep('mojibake-lint', 'npm', ['run', '-s', 'lint:mojibake'])
runStep('typecheck', 'npm', ['run', '-s', 'typecheck'])

runStep('consistency-and-guards', 'npx', [
  'vitest',
  'run',
  'tests/lib/destiny-matrix/ai-report/rewriteGuards.test.ts',
  'tests/lib/destiny-matrix/ai-report/reportQuality.test.ts',
  'tests/lib/destiny-matrix/ai-report/consistencyPriority.golden.test.ts',
  'tests/app/api/destiny-map/chat-stream/route.mega.test.ts',
])

if (mode === 'full') {
  runStep('full-golden-suite-blocking', 'npx', [
    'vitest',
    'run',
    'tests/lib/destiny-matrix/ai-report/coreConsistency30cases.golden.test.ts',
    'tests/lib/destiny-matrix/ai-report/matrixGraphRagFlow.e2e.test.ts',
    'tests/lib/destiny-matrix/ai-report/graphRagEvidence20cases.test.ts',
  ])
  runStep('full-quality-golden', 'npx', [
    'vitest',
    'run',
    'tests/lib/destiny-matrix/ai-report/qualityGoldenSet.test.ts',
  ])
}

console.log('[destiny-gate] PASSED')
