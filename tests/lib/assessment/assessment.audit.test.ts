import { spawnSync } from 'node:child_process'

describe('assessment content audit', () => {
  it('passes assessment content audit script checks', () => {
    const result = spawnSync('npx', ['tsx', 'scripts/audit-assessment-content.ts'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: true,
    })

    if (result.status !== 0) {
      console.error(result.stdout)
      console.error(result.stderr)
    }

    expect(result.status).toBe(0)
  })
})
