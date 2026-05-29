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

// The entire `src/lib/destiny-matrix/ai-report/` engine was removed from the
// codebase. Every `consistency-and-guards` / golden suite this gate used to
// run imported those now-deleted modules and could no longer even load, so
// the destiny gate failed on every PR. The orphaned test files have no
// backing source to guard; until/unless the engine is reintroduced, the gate
// runs the checks that still apply to the surviving destiny-matrix surface
// (mojibake + typecheck above). The blocking quality suites are intentionally
// dropped rather than pointed at non-existent modules.
void mode

console.log('[destiny-gate] PASSED')
