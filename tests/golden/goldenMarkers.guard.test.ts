/**
 * Release-gate guard (engine audit stage E16; F10, F11, SD-18 closure).
 *
 * E0 checked in the golden set with a harness that ran every value a later engine
 * stage would fix as an expected failure, tagged with that stage id. E1–E14 and
 * F1–F3 fixed them all, and E16 removed the harness. This file keeps it that way:
 *
 *  1. No expected-failure, skip, todo or only marker in tests/golden, and no
 *     known-defect bookkeeping anywhere under tests/.
 *  2. No test checks for native swisseph on its own: a real-ephemeris file goes
 *     through tests/helpers/realEphemeris.ts, which skips locally but fails in CI
 *     and in the destiny release gate when the native module is missing.
 *  3. `npm run test:destiny:release` runs the goldens and the real-ephemeris suites.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')
const SELF = relative(ROOT, __filename)

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(name)) out.push(p)
  }
  return out
}

const rel = (p: string) => relative(ROOT, p)
const GOLDEN_FILES = walk(join(ROOT, 'tests/golden')).filter((p) => rel(p) !== SELF)
const TEST_FILES = walk(join(ROOT, 'tests')).filter((p) => rel(p) !== SELF)
const read = (p: string) => readFileSync(p, 'utf8')

function hits(files: string[], pattern: RegExp): string[] {
  const out: string[] = []
  for (const f of files) {
    read(f)
      .split('\n')
      .forEach((line, i) => {
        if (pattern.test(line)) out.push(`${rel(f)}:${i + 1}: ${line.trim()}`)
      })
  }
  return out
}

describe('golden markers guard (E16)', () => {
  it('tests/golden has golden suites to guard', () => {
    const suites = GOLDEN_FILES.map(rel).filter((f) => f.endsWith('.test.ts'))
    expect(suites).toEqual(
      expect.arrayContaining([
        'tests/golden/saju.golden.test.ts',
        'tests/golden/sajuDerived.golden.test.ts',
        'tests/golden/astro.golden.node.test.ts',
        'tests/golden/cross.golden.test.ts',
      ])
    )
  })

  it('no expected-failure, skip, todo or only marker in tests/golden', () => {
    const marker =
      /\b(?:it|test|describe)\s*\.\s*(?:fails|skip|skipIf|runIf|todo|only)\b|\.fails\s*\(|\bx(?:it|describe)\s*\(/
    expect(hits(GOLDEN_FILES, marker)).toEqual([])
  })

  it('no known-defect bookkeeping under tests/', () => {
    expect(hits(TEST_FILES, /knownDefect|KNOWN_DEFECTS|GOLDEN_SHOW_DEFECTS/)).toEqual([])
  })

  it('real-ephemeris availability is decided only by tests/helpers/realEphemeris.ts', () => {
    const helper = 'tests/helpers/realEphemeris.ts'
    const own = hits(
      TEST_FILES.filter((f) => rel(f) !== helper),
      /import\(\s*['"]swisseph['"]\s*\)/
    )
    expect(own).toEqual([])
  })

  it('every golden file that unmocks swisseph uses describeRealEphemeris', () => {
    const bad = GOLDEN_FILES.filter((f) => {
      const src = read(f)
      return /vi\.unmock\(\s*['"]swisseph['"]/.test(src) && !src.includes('describeRealEphemeris(')
    }).map(rel)
    expect(bad).toEqual([])
  })

  it('the destiny release gate runs the goldens and the real-ephemeris suites', () => {
    const pkg = JSON.parse(read(join(ROOT, 'package.json'))) as {
      scripts: Record<string, string>
    }
    const gate = pkg.scripts['test:destiny:release']
    expect(pkg.scripts['ops:destiny:release']).toContain('npm run test:destiny:release')
    for (const part of [
      'tests/golden/',
      'real.node',
      'tests/lib/report/integratedReport.real.test.ts',
      'tests/lib/calendar-engine/buildCalendar.determinism.test.ts',
      'tests/lib/astrology/real-ephemeris-correctness.test.ts',
      // 사주 카드 빌더 · 홈 샘플 카드 골든(real ephemeris, wave 11 — G14 에서 게이트에 추가).
      'tests/lib/card/',
    ]) {
      expect(gate, part).toContain(part)
    }
  })
})
