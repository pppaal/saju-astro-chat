/**
 * 사주 표 SSOT 정합 — 천간·지지 이름 배열과 천간/지지 → 오행 표가 정본(saju/constants)
 * 하나에서만 나오게 잠근다.
 *
 * 예전엔 이 표들이 15곳 남짓에 리터럴로 복사돼 있었다. D8 1단계(E0)는 그 복사본이 전부
 * 정본과 같음을 먼저 증명했고, 2단계(E17)는 파일 하나씩 정본 파생 export 로 바꿨다 —
 * STEM_NAMES · BRANCH_NAMES · STEM_HANGUL · BRANCH_HANGUL · STEM_ELEMENT_KO ·
 * BRANCH_ELEMENT_KO · STEM_ELEMENT_KEY · BRANCH_ELEMENT_KEY · ELEMENT_KO_TO_KEY. 교체할 때마다
 * 이 테스트가 앞뒤로 초록이었다(출력 동일).
 *
 * 정본: STEMS / BRANCHES (이름·오행·음양) 와 ELEMENT_KO_TO_EN(`'Wood'` 대문자 표기)
 * — saju/constants. 한글 음은 saju/ganjiKo(STEM_KO / BRANCH_KO).
 *
 * 오행 표기가 두 벌이다: 정본 ELEMENT_KO_TO_EN 은 `'Wood'`, 캘린더·리포트 계층은 `'wood'`.
 * 여기선 `'wood'` 표기를 `ELEMENT_KO_TO_EN[ko].toLowerCase()` 로 따로 파생해 비교한다.
 *
 * CASES 의 각 줄은 예전 복사본 하나다. `via` 가 있으면 그 파일에 리터럴이 남아 있지 않고
 * 그 파생 export 를 saju/constants 에서 import 하는지 본다(소스 파싱 — 대부분 export 되지
 * 않은 모듈 지역 상수였다). `removed` 는 읽는 곳이 없어 지운 복사본이다. `kept` 는 일부러
 * 남긴 리터럴(예: viralArchetype — 홈·Life 클라이언트 번들에 constants 를 싣지 않으려고)로,
 * 1단계처럼 리터럴을 읽어 정본 파생값과 비교한다. export 된
 * 복사본은 아래에서 import 해 값으로도 비교한다. saju.ts / unse.ts 의 G_BRANCH(양력월 →
 * 지지, 핫패스 결정론 배열)는 일부러 리터럴로 두고 값만 잠근다.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  STEMS,
  BRANCHES,
  ELEMENT_KO_TO_EN,
  STEM_NAMES as CANON_STEM_NAMES,
  BRANCH_NAMES as CANON_BRANCH_NAMES,
  STEM_HANGUL as CANON_STEM_HANGUL,
  BRANCH_HANGUL as CANON_BRANCH_HANGUL,
  ELEMENT_KO_TO_KEY as CANON_ELEMENT_KO_TO_KEY,
  STEM_ELEMENT_KO as CANON_STEM_ELEMENT_KO,
  BRANCH_ELEMENT_KO as CANON_BRANCH_ELEMENT_KO,
  STEM_ELEMENT_KEY as CANON_STEM_ELEMENT_KEY,
  BRANCH_ELEMENT_KEY as CANON_BRANCH_ELEMENT_KEY,
  STEM_TO_ELEMENT,
} from '@/lib/saju/constants'
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

/** 이 파일이 saju/constants 에서 `name` 을 import(또는 재export) 하는가. */
function importsFromSajuConstants(file: string, text: string, name: string): boolean {
  const target = path.normalize('src/lib/saju/constants')
  const re = /(?:import|export)\s*(?:type\s+)?\{([^}]*)\}\s*from\s*'([^']+)'/g
  for (const m of text.matchAll(re)) {
    const spec = m[2]
    const resolved = spec.startsWith('@/')
      ? path.normalize(path.join('src', spec.slice(2)))
      : spec.startsWith('.')
        ? path.normalize(path.join(path.dirname(file), spec))
        : null
    if (resolved !== target) continue
    const names = m[1].split(',').map((x) =>
      x
        .trim()
        .split(/\s+as\s+/)[0]
        .trim()
    )
    if (names.includes(name)) return true
  }
  return false
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
  /** D8 2단계 후: 리터럴 대신 import 하는 saju/constants 파생 export 이름. */
  via?: string
  /** D8 2단계 후: 읽는 곳이 없어 import 없이 지운 복사본. */
  removed?: boolean
  /** 일부러 리터럴로 남긴 복사본(이유). 값은 1단계 방식으로 정본과 비교한다. */
  kept?: string
}

const CASES: Case[] = [
  // 천간 → 오행 (한글 '목')
  {
    files: ['src/lib/calendar-view/toDay.ts'],
    name: 'STEM_TO_ELEMENT',
    kind: 'record',
    expected: STEM_ELEMENT_KO,
    via: 'STEM_ELEMENT_KO',
  },
  {
    files: ['src/lib/destiny/sajuFacts.ts'],
    name: 'STEM_ELEMENT',
    kind: 'record',
    expected: STEM_ELEMENT_KO,
    via: 'STEM_ELEMENT_KO',
  },
  {
    files: ['src/lib/saju/cycleRelations.ts'],
    name: 'STEM_TO_KO_ELEMENT',
    kind: 'record',
    expected: STEM_ELEMENT_KO,
    via: 'STEM_ELEMENT_KO',
  },
  // 천간 → 오행 (영문 키 'wood')
  {
    files: ['src/lib/report/viralArchetype.ts'],
    name: 'STEM_ELEMENT',
    kind: 'record',
    expected: STEM_ELEMENT_KEY,
    // 홈·Life 클라이언트 번들 모듈 — constants import 시 두 번들 +약 4KB(E17 측정). 리터럴로 두고 값만 잠근다.
    kept: 'client-bundle',
  },
  // 지지 → 오행 (한글)
  {
    files: ['src/lib/destiny/sajuFacts.ts'],
    name: 'BRANCH_ELEMENT',
    kind: 'record',
    expected: BRANCH_ELEMENT_KO,
    via: 'BRANCH_ELEMENT_KO',
  },
  // 지지 → 오행 (영문 키)
  {
    files: ['src/lib/saju/datePillars.ts'],
    name: 'BRANCH_TO_ELEMENT',
    kind: 'record',
    expected: BRANCH_ELEMENT_KEY,
    via: 'BRANCH_ELEMENT_KEY',
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
  {
    files: ['src/lib/saju/iljuProfile.ts'],
    name: 'STEMS',
    kind: 'array',
    expected: STEM_NAMES,
    via: 'STEM_NAMES',
  },
  {
    files: ['src/lib/saju/iljuProfile.ts'],
    name: 'BRANCHES',
    kind: 'array',
    expected: BRANCH_NAMES,
    via: 'BRANCH_NAMES',
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
    via: 'STEM_ELEMENT_KEY',
  },
  {
    files: ['src/lib/calendar-engine/extractors/saju-element-balance.ts'],
    name: 'ELEMENT_KO_TO_EN',
    kind: 'record',
    expected: ELEMENT_KO_TO_KEY,
    via: 'ELEMENT_KO_TO_KEY',
  },
  // 같은 파일들 안의 export 된 복사본 (궁합 STEM_EL/BRANCH_EL, 정본과 같은 'Wood' 표)
  {
    files: ['src/lib/compatibility/sajuSynastryData.ts'],
    name: 'STEM_EL',
    kind: 'record',
    expected: STEM_ELEMENT_KO,
  },
  {
    files: ['src/lib/compatibility/sajuSynastryData.ts'],
    name: 'BRANCH_EL',
    kind: 'record',
    expected: BRANCH_ELEMENT_KO,
  },
  {
    files: ['src/lib/saju/iljuProfile.ts'],
    name: 'ELEMENT_EN',
    kind: 'record',
    expected: ELEMENT_KO_TO_EN,
    via: 'ELEMENT_KO_TO_EN',
  },
  {
    files: ['src/lib/social/generateDrafts.ts'],
    name: 'ELEMENT_EN',
    kind: 'record',
    expected: ELEMENT_KO_TO_EN,
  },
  // export 된 이름 배열 — 아래 값 비교에 더해, 소스에 리터럴이 없는지도 본다
  {
    files: ['src/lib/saju/ilganCompat.ts'],
    name: 'ILGAN_ORDER',
    kind: 'array',
    expected: STEM_NAMES,
    via: 'STEM_NAMES',
  },
  {
    files: ['src/lib/saju/pillar-lookup/constants.ts'],
    name: 'STEM_ORDER',
    kind: 'array',
    expected: STEM_NAMES,
    via: 'STEM_NAMES',
  },

  {
    files: ['src/lib/saju/pillar-lookup/constants.ts'],
    name: 'BRANCH_ORDER',
    kind: 'array',
    expected: BRANCH_NAMES,
    via: 'BRANCH_NAMES',
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

describe('table SSOT — 정본 파생 export (D8 2단계)', () => {
  it('saju/constants 파생 export 가 이 테스트의 독립 파생값과 같다', () => {
    expect(CANON_STEM_NAMES).toEqual(STEM_NAMES)
    expect(CANON_BRANCH_NAMES).toEqual(BRANCH_NAMES)
    expect(CANON_STEM_HANGUL).toEqual(STEM_HANGUL)
    expect(CANON_BRANCH_HANGUL).toEqual(BRANCH_HANGUL)
    expect(CANON_ELEMENT_KO_TO_KEY).toEqual(ELEMENT_KO_TO_KEY)
    expect(CANON_STEM_ELEMENT_KO).toEqual(STEM_ELEMENT_KO)
    expect(CANON_BRANCH_ELEMENT_KO).toEqual(BRANCH_ELEMENT_KO)
    expect(CANON_STEM_ELEMENT_KEY).toEqual(STEM_ELEMENT_KEY)
    expect(CANON_BRANCH_ELEMENT_KEY).toEqual(BRANCH_ELEMENT_KEY)
  })

  it('정본 순서로 읽은 값 — 손으로 적은 기대값과 같다', () => {
    expect(CANON_STEM_HANGUL.join('')).toBe('갑을병정무기경신임계')
    expect(CANON_BRANCH_HANGUL.join('')).toBe('자축인묘진사오미신유술해')
    expect(CANON_STEM_NAMES.map((s) => CANON_STEM_ELEMENT_KO[s]).join('')).toBe(
      '목목화화토토금금수수'
    )
    expect(CANON_BRANCH_NAMES.map((b) => CANON_BRANCH_ELEMENT_KO[b]).join('')).toBe(
      '수토목목토화화토금금토수'
    )
    expect(CANON_STEM_NAMES.map((s) => CANON_STEM_ELEMENT_KEY[s])).toEqual([
      'wood',
      'wood',
      'fire',
      'fire',
      'earth',
      'earth',
      'metal',
      'metal',
      'water',
      'water',
    ])
    expect(CANON_BRANCH_NAMES.map((b) => CANON_BRANCH_ELEMENT_KEY[b])).toEqual([
      'water',
      'earth',
      'wood',
      'wood',
      'earth',
      'fire',
      'fire',
      'earth',
      'metal',
      'metal',
      'earth',
      'water',
    ])
    expect(CANON_ELEMENT_KO_TO_KEY).toEqual({
      목: 'wood',
      화: 'fire',
      토: 'earth',
      금: 'metal',
      수: 'water',
    })
  })

  it('파생 오행 표는 한자 키만 — 한글 키(갑)도 받는 STEM_TO_ELEMENT 와 다른 표', () => {
    expect(Object.keys(CANON_STEM_ELEMENT_KO)).toEqual(STEM_NAMES)
    expect(Object.keys(CANON_BRANCH_ELEMENT_KO)).toEqual(BRANCH_NAMES)
    expect(Object.keys(CANON_STEM_ELEMENT_KEY)).toEqual(STEM_NAMES)
    expect(Object.keys(CANON_BRANCH_ELEMENT_KEY)).toEqual(BRANCH_NAMES)
    expect(CANON_STEM_ELEMENT_KO['갑']).toBeUndefined()
    expect(STEM_TO_ELEMENT['갑']).toBe('목')
  })
})

describe('table SSOT — 소스 지역 복사본이 정본과 같다 (D8 1·2단계)', () => {
  for (const c of CASES) {
    const after = c.via ? ` → ${c.via}` : c.removed ? ' (삭제)' : c.kept ? ` (유지: ${c.kept})` : ''
    it(`${c.files[c.files.length - 1]} ${c.name}${after}`, () => {
      const { file, text } = readSource(...c.files)
      if (c.removed) {
        expect(literalsOf(text, c.name), `${file} ${c.name} 리터럴이 남아 있음`).toEqual([])
        expect(new RegExp(`\\b${c.name}\\b`).test(text), `${file} 가 아직 ${c.name} 를 읽음`).toBe(
          false
        )
        return
      }
      if (c.via) {
        // 교체 후: 리터럴 복사본이 없고, 정본 파생 export 를 saju/constants 에서 가져온다.
        expect(literalsOf(text, c.name), `${file} ${c.name} 리터럴이 남아 있음`).toEqual([])
        expect(
          importsFromSajuConstants(file, text, c.via),
          `${file} 는 ${c.via} 를 saju/constants 에서 import 해야 한다`
        ).toBe(true)
        return
      }
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
