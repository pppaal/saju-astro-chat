// tests/lib/config/calculationStandards.readers.test.ts
//
// CALCULATION_STANDARDS 의 모든 키는 src 코드가 실제로 읽어야 한다 (엔진 감사 F16).
// docs/doctrine/calculation-standards.md 는 "코드가 이 값을 직접 읽는다" 고 말하는데,
// baseTimezone 은 정의만 있고 아무도 읽지 않았다. docs:sync 생성기도 같은 검사로
// 실패하지만(읽는 곳 열), 여기서는 키별로 바로 어떤 키가 끊겼는지 보여 준다.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

const ROOT = process.cwd()
const DEFINITION = path.join('src', 'lib', 'config', 'calculationStandards.ts')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...sourceFiles(full))
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full)
  }
  return out
}

// 주석 속 언급은 읽는 곳이 아니다.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const SOURCES = sourceFiles(path.join(ROOT, 'src'))
  .filter((f) => path.relative(ROOT, f) !== DEFINITION)
  .map((f) => ({ rel: path.relative(ROOT, f), code: stripComments(fs.readFileSync(f, 'utf8')) }))

const KEYS = (Object.keys(CALCULATION_STANDARDS) as (keyof typeof CALCULATION_STANDARDS)[]).flatMap(
  (group) => Object.keys(CALCULATION_STANDARDS[group]).map((key) => ({ group, key }))
)

describe('CALCULATION_STANDARDS — 모든 키에 읽는 곳이 있다', () => {
  it('키 목록이 비어 있지 않다', () => {
    expect(KEYS.length).toBeGreaterThan(0)
  })

  it.each(KEYS)('$group.$key', ({ group, key }) => {
    const pattern = new RegExp(`CALCULATION_STANDARDS\\.${group}\\.${key}\\b`)
    const readers = SOURCES.filter((s) => pattern.test(s.code)).map((s) => s.rel)
    expect(readers, `CALCULATION_STANDARDS.${group}.${key} 를 읽는 src 코드가 없다`).not.toEqual([])
  })

  it('baseTimezone 은 사주 엔진의 timezone 폴백이다 (saju.ts)', () => {
    const saju = SOURCES.find((s) => s.rel === path.join('src', 'lib', 'saju', 'saju.ts'))!
    expect(saju.code).toMatch(
      /normalizeTimeZone\(timezone, CALCULATION_STANDARDS\.saju\.baseTimezone\)/
    )
  })
})
