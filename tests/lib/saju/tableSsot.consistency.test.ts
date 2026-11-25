/**
 * 사주 표 SSOT 정합 — 로컬 복사본이 정본(saju/constants)에서 파생한 값과 같음을 잠근다.
 *
 * 천간·지지 이름 배열과 천간/지지 → 오행 표가 15곳 남짓에 리터럴로 복사돼 있다.
 * 정리(D8 2단계: 복사본을 정본 import 로 교체)에 앞서, 지금 이 복사본들이 정본과
 * 같다는 것을 먼저 증명한다. 이 테스트가 초록인 상태에서만 교체를 시작한다.
 *
 * 정본: STEMS / BRANCHES (이름·오행·음양) 와 ELEMENT_KO_TO_EN(`'Wood'` 대문자 표기)
 * — saju/constants. 한글 음은 saju/ganjiKo(STEM_KO / BRANCH_KO).
 *
 * 오행 표기가 두 벌이다: 정본 ELEMENT_KO_TO_EN 은 `'Wood'`, 캘린더 계층은 `'wood'`.
 * 여기선 `'wood'` 표기를 `ELEMENT_KO_TO_EN[ko].toLowerCase()` 로 파생해 비교한다.
 *
 * 대부분의 복사본은 export 되지 않은 모듈 지역 상수라 소스 텍스트에서 리터럴을
 * 읽어 비교한다(tableConsistency.drift-lock.test.ts 와 같은 접근, 다만 import 대신
 * 소스 파싱). export 된 복사본은 import 해서 값으로 비교한다.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { STEMS, BRANCHES, ELEMENT_KO_TO_EN } from '@/lib/saju/constants'
import { STEM_KO, BRANCH_KO } from '@/lib/saju/ganjiKo'
import { ILGAN_ORDER } from '@/lib/saju/ilganCompat'
import { STEM_ORDER, BRANCH_ORDER } from '@/lib/saju/pillar-lookup/constants'
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from '@/data/yearly-fortune-generator'

// ── 정본에서 파생한 기대값 ──────────────────────────────────────────────────
const STEM_NAMES = STEMS.map((s) => s.name)
const BRANCH_NAMES = BRANCHES.map((b) => b.name)
const STEM_ELEMENT_KO = Object.fromEntries(STEMS.map((s) => [s.name, s.element]))
const BRANCH_ELEMENT_KO = Object.fromEntries(BRANCHES.map((b) => [b.name, b.element]))
const toKey = (ko: string) => ELEMENT_KO_TO_EN[ko].toLowerCase()
const STEM_ELEMENT_KEY = Object.fromEntries(STEMS.map((s) => [s.name, toKey(s.element)]))
const BRANCH_ELEMENT_KEY = Object.fromEntries(BRANCHES.map((b) => [b.name, toKey(b.element)]))
const STEM_HANGUL = STEM_NAMES.map((s) => STEM_KO[s])
const BRANCH_HANGUL = BRANCH_NAMES.map((b) => BRANCH_KO[b])
const ELEMENT_KO_TO_KEY = Object.fromEntries(
  Object.keys(ELEMENT_KO_TO_EN).map((ko) => [ko, toKey(ko)])
)
/** 양력월 1~12 → 지지(丑…子): 정본 지지 순서를 한 칸 회전. */
const SOLAR_MONTH_BRANCH = [...BRANCH_NAMES.slice(1), BRANCH_NAMES[0]]

// ── 소스 리터럴 파서 ──────────────────────────────────────────────────────
const ROOT = process.cwd()

function readSource(...candidates: string[]): { file: string; text: string } {
  for (const rel of candidates) {
    const abs = path.resolve(ROOT, rel)
    if (fs.existsSync(abs)) return { file: rel, text: fs.readFileSync(abs, 'utf8') }
  }
  throw new Error(`none of these files exist: ${candidates.join(', ')}`)
}

/** `[ ... ]` 또는 `{ ... }` 짝 괄호 끝 인덱스(따옴표 안 괄호는 무시). */
function matchBracket(text: string, open: number): number {
  const pairs: Record<string, string> = { '[': ']', '{': '}' }
  const stack: string[] = [pairs[text[open]]]
  let quote: string | null = null
  for (let i = open + 1; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch
    else if (ch === '[' || ch === '{') stack.push(pairs[ch])
    else if (ch === ']' || ch === '}') {
      if (stack.pop() !== ch) throw new Error(`unbalanced bracket at ${i}`)
      if (stack.length === 0) return i
    }
  }
  throw new Error('unterminated literal')
}

/** `const NAME ... = [ ... ]` / `{ ... }` 리터럴 본문(전부). */
function literalsOf(text: string, name: string): string[] {
  const re = new RegExp(`(?:export\\s+)?const\\s+${name}\\b[^=]*=\\s*([\\[{])`, 'g')
  const out: string[] = []
  for (const m of text.matchAll(re)) {
    const open = (m.index ?? 0) + m[0].length - 1
    out.push(text.slice(open, matchBracket(text, open) + 1))
  }
  return out
}

function oneLiteral(text: string, name: string, file: string): string {
  const all = literalsOf(text, name)
  if (all.length !== 1)
    throw new Error(`${file}: expected one literal for ${name}, got ${all.length}`)
  return all[0]
}

const parseStringArray = (lit: string) => [...lit.matchAll(/'([^']*)'/g)].map((m) => m[1])

function parseStringRecord(lit: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of lit.matchAll(/([^\s,{}'":]+|'[^']*'|"[^"]*")\s*:\s*'([^']*)'/g)) {
    out[m[1].replace(/^['"]|['"]$/g, '')] = m[2]
  }
  return out
}

// ── 복사본 목록 (plan D8) ─────────────────────────────────────────────────
type Case = {
  files: string[]
  name: string
  kind: 'array' | 'record'
  expected: string[] | Record<string, string>
}

const CASES: Case[] = [
  // 천간 → 오행 (한글 '목')
  {
    files: ['src/lib/calendar-view/toDay.ts', 'src/components/calendar/adapters/toDay.ts'],
    name: 'STEM_TO_ELEMENT',
    kind: 'record',
    expected: STEM_ELEMENT_KO,
  },
  {
    files: ['src/lib/destiny/sajuFacts.ts'],
    name: 'STEM_ELEMENT',
    kind: 'record',
    expected: STEM_ELEMENT_KO,
  },
  {
    files: ['src/lib/saju/cycleRelations.ts'],
    name: 'STEM_TO_KO_ELEMENT',
    kind: 'record',
    expected: STEM_ELEMENT_KO,
  },
  // 천간 → 오행 (영문 키 'wood')
  {
    files: ['src/lib/report/viralArchetype.ts'],
    name: 'STEM_ELEMENT',
    kind: 'record',
    expected: STEM_ELEMENT_KEY,
  },
  // 지지 → 오행 (한글)
  {
    files: ['src/lib/destiny/sajuFacts.ts'],
    name: 'BRANCH_ELEMENT',
    kind: 'record',
    expected: BRANCH_ELEMENT_KO,
  },
  // 지지 → 오행 (영문 키)
  {
    files: ['src/lib/saju/datePillars.ts'],
    name: 'BRANCH_TO_ELEMENT',
    kind: 'record',
    expected: BRANCH_ELEMENT_KEY,
  },
  {
    files: ['src/lib/report/natalCrossEvaluators.ts'],
    name: 'BRANCH_TO_ELEMENT',
    kind: 'record',
    expected: BRANCH_ELEMENT_KEY,
  },
  {
    files: ['src/lib/compatibility/zodiacCompat.ts'],
    name: 'BRANCH_ELEMENT',
    kind: 'record',
    expected: BRANCH_ELEMENT_KEY,
  },
  // 천간·지지 이름 배열
  { files: ['src/lib/saju/iljuProfile.ts'], name: 'STEMS', kind: 'array', expected: STEM_NAMES },
  {
    files: ['src/lib/saju/iljuProfile.ts'],
    name: 'BRANCHES',
    kind: 'array',
    expected: BRANCH_NAMES,
  },
  {
    files: ['src/components/report/atoms/interpretations.ts'],
    name: 'STEM_CHARS',
    kind: 'array',
    expected: STEM_NAMES,
  },
  {
    files: ['src/components/report/atoms/interpretations.ts'],
    name: 'BRANCH_CHARS',
    kind: 'array',
    expected: BRANCH_NAMES,
  },
  {
    files: ['src/lib/compatibility/sajuSynastryData.ts'],
    name: 'STEM_ORDER',
    kind: 'array',
    expected: STEM_NAMES,
  },
  // 한글 음 배열
  {
    files: ['src/lib/social/generateDrafts.ts'],
    name: 'STEM_HANGUL',
    kind: 'array',
    expected: STEM_HANGUL,
  },
  {
    files: ['src/lib/social/generateDrafts.ts'],
    name: 'BRANCH_HANGUL',
    kind: 'array',
    expected: BRANCH_HANGUL,
  },
  // 오행 한글 → 소문자 영문 키 (정본은 'Wood' 대문자 — 표기 두 벌)
  {
    files: ['src/lib/calendar/constants.ts'],
    name: 'ELEMENT_KO_TO_EN',
    kind: 'record',
    expected: ELEMENT_KO_TO_KEY,
  },
  {
    files: ['src/lib/calendar-engine/extractors/saju-element-balance.ts'],
    name: 'ELEMENT_KO_TO_EN',
    kind: 'record',
    expected: ELEMENT_KO_TO_KEY,
  },
]

describe('table SSOT — 정본 파생값 자체 점검', () => {
  it('정본 STEMS/BRANCHES 가 10간·12지 고유 이름을 갖는다', () => {
    expect(new Set(STEM_NAMES).size).toBe(10)
    expect(new Set(BRANCH_NAMES).size).toBe(12)
    expect(STEM_NAMES.join('')).toBe('甲乙丙丁戊己庚辛壬癸')
    expect(BRANCH_NAMES.join('')).toBe('子丑寅卯辰巳午未申酉戌亥')
  })

  it('두 오행 표기(Wood / wood)는 대소문자만 다르다', () => {
    expect(Object.values(ELEMENT_KO_TO_KEY).sort()).toEqual(
      ['earth', 'fire', 'metal', 'water', 'wood'].sort()
    )
  })
})

describe('table SSOT — 소스 지역 복사본이 정본과 같다 (D8 1단계)', () => {
  for (const c of CASES) {
    it(`${c.files[c.files.length - 1]} ${c.name}`, () => {
      const { file, text } = readSource(...c.files)
      const lit = oneLiteral(text, c.name, file)
      if (c.kind === 'array') {
        expect(parseStringArray(lit), `${file} ${c.name}`).toEqual(c.expected)
      } else {
        expect(parseStringRecord(lit), `${file} ${c.name}`).toEqual(c.expected)
      }
    })
  }

  it('saju.ts / unse.ts G_BRANCH (양력월 → 지지) 는 정본 지지 순서의 1칸 회전', () => {
    for (const rel of ['src/lib/saju/saju.ts', 'src/lib/saju/unse.ts']) {
      const { text } = readSource(rel)
      const lits = literalsOf(text, 'G_BRANCH')
      expect(lits.length, `${rel} G_BRANCH count`).toBeGreaterThan(0)
      for (const lit of lits) expect(parseStringArray(lit), rel).toEqual(SOLAR_MONTH_BRANCH)
    }
  })
})

describe('table SSOT — export 된 복사본이 정본과 같다', () => {
  it('ilganCompat ILGAN_ORDER', () => {
    expect([...ILGAN_ORDER]).toEqual(STEM_NAMES)
  })

  it('pillar-lookup STEM_ORDER / BRANCH_ORDER', () => {
    expect(STEM_ORDER).toEqual(STEM_NAMES)
    expect(BRANCH_ORDER).toEqual(BRANCH_NAMES)
  })

  it('yearly-fortune-generator HEAVENLY_STEMS: 순서·한글 음·오행(Wood 표기)·음양', () => {
    expect(HEAVENLY_STEMS.map((s) => s.hanja)).toEqual(STEM_NAMES)
    expect(HEAVENLY_STEMS.map((s) => s.ko)).toEqual(STEM_HANGUL)
    expect(HEAVENLY_STEMS.map((s) => s.element)).toEqual(
      STEMS.map((s) => ELEMENT_KO_TO_EN[s.element])
    )
    expect(HEAVENLY_STEMS.map((s) => s.yin)).toEqual(STEMS.map((s) => s.yin_yang === '음'))
  })

  it('yearly-fortune-generator EARTHLY_BRANCHES: 순서·한글 음', () => {
    expect(EARTHLY_BRANCHES.map((b) => b.hanja)).toEqual(BRANCH_NAMES)
    expect(EARTHLY_BRANCHES.map((b) => b.ko)).toEqual(BRANCH_HANGUL)
  })
})
