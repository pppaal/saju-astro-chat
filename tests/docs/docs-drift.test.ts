/**
 * 문서 drift 가드 — 코드 SSOT 와 docs/ 가 어긋나면 CI 에서 실패시킨다.
 *
 * 1) 자동 섹션(<!-- gen:* -->)이 최신인가? (docs:sync 안 돌린 채 커밋 차단)
 * 2) 활성 서비스마다 서비스 문서가 존재하는가?
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ENABLED_SERVICES } from '@/config/enabledServices'

const ROOT = process.cwd()

describe('docs drift guard', () => {
  it('자동 생성 섹션이 코드 SSOT 와 일치 (docs:sync 최신)', () => {
    // --check: 갱신 필요하면 비-0 종료. 통과하면 문서가 최신.
    // 셸 경유(execSync) — Windows/CI 에서 npm/tsx 바이너리 해석이 안정적.
    expect(() =>
      execSync('npm run docs:sync:check', { cwd: ROOT, stdio: 'pipe' })
    ).not.toThrow()
  })

  it('활성 서비스마다 서비스 문서가 존재', () => {
    // 서비스 id → 문서 슬러그 매핑 (destinyMap 은 destiny-counselor 로 운영)
    const slug: Record<string, string> = { destinyMap: 'destiny-counselor' }
    const missing = ENABLED_SERVICES.map((s) => slug[s.id] ?? s.id).filter(
      (name) => !fs.existsSync(path.join(ROOT, 'docs', 'services', `${name}.md`))
    )
    expect(missing, `누락된 서비스 문서: ${missing.join(', ')}`).toEqual([])
  })
})
