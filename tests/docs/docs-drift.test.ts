/**
 * 문서 drift / 무결성 가드 — 코드 SSOT 와 docs/ 가 어긋나면 CI 에서 실패.
 *
 * 1) 자동 섹션(<!-- gen:* -->)이 최신인가? (docs:sync 안 돌린 채 커밋 차단)
 * 2) 활성 서비스마다 서비스 문서가 존재하는가?
 * 3) [[wikilink]] 가 실제 노트로 풀리는가? (깨진 링크 차단)
 * 4) 상대 파일 링크(](../...))가 실제 파일/폴더로 풀리는가? (dead source ref 차단)
 * 5) 모든 vault 문서에 frontmatter(title·tags·status)가 있는가?
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ENABLED_SERVICES } from '@/config/enabledServices'

const ROOT = process.cwd()
const DOCS = path.join(ROOT, 'docs')

// 새 구조 vault 만 검사 (레거시 flat 문서는 대상 외)
const VAULT_DIRS = ['doctrine', 'services', 'architecture', 'reference']

function vaultDocs(): string[] {
  // 구조화된 레이어 문서만 무결성 가드 대상. (docs/README.md 는 GitHub 허브 —
  // 상대 링크 + frontmatter 없음 → 별도 규칙이라 제외)
  const out: string[] = []
  for (const d of VAULT_DIRS) {
    const dir = path.join(DOCS, d)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.md')) out.push(path.join(dir, f))
  }
  return out
}

// 코드/인라인코드 안의 [[..]] 예시는 링크가 아니므로 제거
function stripCode(md: string): string {
  return md.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
}

function allNoteBasenames(): Set<string> {
  const names = new Set<string>()
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name))
      else if (e.name.endsWith('.md')) names.add(e.name.replace(/\.md$/, ''))
    }
  }
  walk(DOCS)
  return names
}

describe('docs drift guard', () => {
  it('자동 생성 섹션이 코드 SSOT 와 일치 (docs:sync 최신)', () => {
    // --check: 갱신 필요하면 비-0 종료. 셸 경유(execSync) — Windows/CI 안정.
    expect(() => execSync('npm run docs:sync:check', { cwd: ROOT, stdio: 'pipe' })).not.toThrow()
  })

  it('활성 서비스마다 서비스 문서가 존재', () => {
    const slug: Record<string, string> = { destinyMap: 'destiny-counselor' }
    const missing = ENABLED_SERVICES.map((s) => slug[s.id] ?? s.id).filter(
      (name) => !fs.existsSync(path.join(DOCS, 'services', `${name}.md`))
    )
    expect(missing, `누락된 서비스 문서: ${missing.join(', ')}`).toEqual([])
  })

  it('모든 [[wikilink]] 가 실제 노트로 풀린다', () => {
    const notes = allNoteBasenames()
    const broken: string[] = []
    for (const file of vaultDocs()) {
      const body = stripCode(fs.readFileSync(file, 'utf8'))
      for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
        // [[target|alias]] / [[target#heading]] → target 의 basename
        const target = m[1].split('|')[0].split('#')[0].trim()
        const base = target.split('/').pop() ?? target
        if (!notes.has(base)) broken.push(`${path.relative(ROOT, file)} → [[${m[1]}]]`)
      }
    }
    expect(broken, `깨진 wikilink:\n${broken.join('\n')}`).toEqual([])
  })

  it('모든 상대 파일 링크(](../...))가 실제로 존재한다', () => {
    const broken: string[] = []
    for (const file of vaultDocs()) {
      const body = stripCode(fs.readFileSync(file, 'utf8'))
      for (const m of body.matchAll(/\]\((\.\.?\/[^)]+)\)/g)) {
        const raw = m[1].split('#')[0].trim() // #Lxx 라인앵커 제거
        if (!raw) continue
        const resolved = path.resolve(path.dirname(file), raw)
        if (!fs.existsSync(resolved)) broken.push(`${path.relative(ROOT, file)} → ${m[1]}`)
      }
    }
    expect(broken, `깨진 소스/상대 링크:\n${broken.join('\n')}`).toEqual([])
  })

  it('모든 vault 문서에 frontmatter(title·tags·status)가 있다', () => {
    const bad: string[] = []
    for (const file of vaultDocs()) {
      const head = fs.readFileSync(file, 'utf8').slice(0, 400)
      const ok =
        head.startsWith('---') &&
        /\btitle:/.test(head) &&
        /\btags:/.test(head) &&
        /\bstatus:/.test(head)
      if (!ok) bad.push(path.relative(ROOT, file))
    }
    expect(bad, `frontmatter 누락: ${bad.join(', ')}`).toEqual([])
  })
})
