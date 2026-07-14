// tests/determinism-guard.test.ts
//
// 가드(=훅): "엔진 계산이 시계를 직접 읽어 비결정적이 되는" 재발을 소스 레벨로
// 막는다.
//
// 근본 원인(CLAUDE.md Determinism 불변식): 엔진은 순수·재현가능해야 한다. "지금"이
// 필요한 값(대운/세운/트랜짓/나이)은 주입된 `now: Date` 로만 계산해야 하고, 계산
// 깊은 곳에서 절대 `new Date()`/`Date.now()` 로 벽시계를 읽으면 안 된다. 지금까지
// 엔진이 clean 한 건 사람이 규율로 지켜서인데, 규율은 손이 바뀌면 깨지고 그때마다
// 감사가 같은 위반을 다시 찾는다.
//
// 해결: 아래 엔진 디렉터리에서 argless `new Date()` / `Date.now()` 를 금지한다.
// 허용되는 유일한 형태는 (1) 주입 지점(default/fallback: `= new Date()`,
// `?? new Date()`) 과 (2) 계산이 아닌 캐시·영속 부기(bookkeeping)로 명시 등재된
// 소수 지점뿐이다. 새 위반은 `now` 를 주입하거나, 정말 부기라면 아래 ALLOW 에
// 이유와 함께 등재해야 통과한다.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'

const ROOT = process.cwd()
const ENGINE_DIRS = ['src/lib/saju', 'src/lib/astrology', 'src/lib/calendar-engine']

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) out.push(full)
  }
  return out
}

const rel = (f: string) => relative(ROOT, f).replace(/\\/g, '/')

// 주석 라인(블록/JSDoc `*`, 라인 `//`, 블록 시작 `/*`)은 통째로 무시하고, 코드
// 라인은 인라인 `//` 뒷부분만 제거한다. 주석 속 `new Date()` 언급(옛 버그 설명
// 등)이 위반으로 잡히지 않게 한다.
function codeOf(line: string): string {
  const t = line.trimStart()
  if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return ''
  const i = line.indexOf('//')
  return i >= 0 ? line.slice(0, i) : line
}

// argless 벽시계 읽기: `new Date()`(인자 0개) 또는 `Date.now()`.
const CLOCK = /\bnew Date\(\s*\)|\bDate\.now\(\s*\)/

// 주입 지점(default 파라미터 / nullish fallback) — 사실상의 sanctioned 주입.
const INJECTION = /(=|\?\?)\s*new Date\(\s*\)/

// 계산이 아닌 부기(cache TTL/timestamp, 영속 builtAt)로 승인된 지점. 코드 스니펫
// 으로 매칭(라인번호 drift 무관). 새 항목은 "왜 결정성에 무해한지"를 달고 추가.
const ALLOW: { snippet: string; why: string }[] = [
  { snippet: 'timestamp: Date.now()', why: 'saju 인메모리 캐시 저장 시각(부기, 계산 아님)' },
  { snippet: 'Date.now() - cached.timestamp', why: 'saju 캐시 TTL 비교(부기)' },
  { snippet: 'builtAt: new Date()', why: 'CalendarBuildCache 영속 행의 생성 시각(부기)' },
]

describe('결정성 가드(=훅) — 엔진 계산의 벽시계 직접 읽기 재발 방지', () => {
  it(`${ENGINE_DIRS.join(', ')} 에서 주입/부기 외의 new Date()/Date.now() 를 금지한다`, () => {
    const offenders: string[] = []
    for (const dir of ENGINE_DIRS) {
      for (const file of walk(resolve(ROOT, dir))) {
        const lines = readFileSync(file, 'utf8').split('\n')
        lines.forEach((raw, idx) => {
          const code = codeOf(raw)
          if (!CLOCK.test(code)) return
          if (INJECTION.test(code)) return // 주입 지점 허용
          if (ALLOW.some((a) => code.includes(a.snippet))) return // 부기 허용
          offenders.push(`${rel(file)}:${idx + 1}  ${raw.trim()}`)
        })
      }
    }
    expect(
      offenders,
      `엔진 계산이 벽시계를 직접 읽는다(비결정적). 주입된 now 를 쓰거나, 정말 ` +
        `부기라면 ALLOW 에 이유와 함께 등재하라:\n  ${offenders.join('\n  ')}`
    ).toEqual([])
  })
})
