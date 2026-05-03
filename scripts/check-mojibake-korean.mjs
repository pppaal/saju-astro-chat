#!/usr/bin/env node
/**
 * Korean mojibake 회귀 검사 — 한국어가 `??`로 깨져 저장된 파일 detect.
 *
 * 검사 룰:
 *  1) src/ 안의 .ts / .tsx / .json 파일 중
 *  2) ASCII-only이면서 (한국어 문자가 하나도 없음)
 *  3) `?? ` 또는 `??.` 또는 `???` 같은 mojibake 패턴이 5건 이상 발견되면 깨짐 의심
 *  4) 또는 UTF-8이지만 `?? ?? ??` 같은 3연속 패턴이 발견되면 부분 깨짐
 *
 * Usage:
 *   node scripts/check-mojibake-korean.mjs
 *
 * exit 1 if any mojibake found.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = path.join(__dirname, '..', 'src')

// LLM에 보내는 프롬프트 안에 의도된 ?? (예: '뭐?? 진짜?') vs 깨짐 구별:
// 깨짐은 보통 ?? 가 3-10번 연속 패턴 (`?? ?? ??`)로 나옴
const MOJIBAKE_PATTERN = /(\?\s*\?\s*){2,}/g

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'public',
  'dist',
  'build',
  '.git',
])

const SKIP_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'])

function listFiles(root) {
  const out = []
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (!SKIP_DIRS.has(ent.name)) stack.push(full)
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name)
        if (SKIP_EXTS.has(ext)) continue
        if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md'].includes(ext)) {
          out.push(full)
        }
      }
    }
  }
  return out
}

function checkFile(filePath) {
  let content
  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
  const matches = content.match(MOJIBAKE_PATTERN)
  if (!matches) return null
  // 의도적인 케이스 필터링: '?? 정말?' 같은 자연스러운 한국어 의문문은 ?? 1번만 나옴
  // 우리는 2번 이상 = ??패턴 = 깨짐으로 판정
  return {
    file: path.relative(path.join(SRC_ROOT, '..'), filePath),
    count: matches.length,
    samples: matches.slice(0, 3),
  }
}

const files = listFiles(SRC_ROOT)
const issues = []
for (const f of files) {
  const result = checkFile(f)
  if (result) issues.push(result)
}

if (issues.length === 0) {
  console.log('✓ Korean mojibake 검출 안 됨 (' + files.length + ' 파일 검사)')
  process.exit(0)
}

console.error(`✗ Korean mojibake 발견 — ${issues.length}개 파일`)
console.error()
issues.sort((a, b) => b.count - a.count)
let total = 0
for (const issue of issues) {
  console.error(`  ${String(issue.count).padStart(4)}건  ${issue.file}`)
  total += issue.count
}
console.error()
console.error(`총 ${total}건 깨짐. 복구 필요.`)
console.error()
console.error('비고: 한국어 의문문 (예: "정말?")이 아닌, 인코딩 손실로 인한 ??패턴.')
console.error('해결: 같은 파일의 git history에서 UTF-8 원본을 찾거나, 영문 i18n 파일을 참조해 재작성.')
process.exit(1)
