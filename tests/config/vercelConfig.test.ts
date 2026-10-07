/**
 * vercel.json 정합성 가드 — 설정이 가리키는 대상이 실제로 존재하는지.
 *
 * 왜 테스트로 묶는가:
 * vercel.json 은 레포 안에 있지만 해석은 Vercel 에서만 일어난다. 그래서
 * 존재하지 않는 경로를 가리켜도 lint·typecheck·테스트가 전부 통과하고,
 * 틀린 걸 알게 되는 건 **배포가 실패할 때**다. 그것도 로그가 Vercel
 * 대시보드에만 남아서 원인 파악이 오래 걸린다.
 *
 * 실제 사고(2026-10-07):
 * `functions` 키가 `app/api/...` 로 적혀 있었는데 이 프로젝트는 `src/app/...`
 * 이다. 게다가 `app/api/calendar/route.ts` 는 애초에 존재한 적이 없다(실제는
 * calendar/day/route.ts). 두 패턴이 **0개 파일**에 매칭됐고, 그 결과:
 *   · 의도했던 maxDuration 60 이 적용된 적이 없다 → 무거운 점성/운흐름 계산이
 *     기본 타임아웃으로 돌고 있었다(해당 라우트들은 파일 안에 maxDuration 을
 *     선언하지 않아 vercel.json 이 유일한 설정 경로였다).
 *   · includeFiles(swisseph 네이티브 .node 번들링)도 적용된 적이 없다.
 *
 * 같은 날 두 번째: crons 에 /api/cron/social-publish 가 **3번** 중복 등록돼
 * 있었다(22/03/10 UTC). Vercel 은 동일 path 중복을 설정 검증에서 거부한다.
 * 3개를 `0 3,10,22 * * *` 한 줄로 합쳐 발행 시각은 그대로 유지했다.
 *
 * glob 은 직접 구현한다 — fs.globSync 는 Node 22+ 전용이고(CI 는 Node 20),
 * fast-glob/tinyglobby 는 선언된 의존성이 아니라 전이 의존성이라 사라질 수 있다.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const vercelConfig = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')) as {
  functions?: Record<string, unknown>
  crons?: { path: string; schedule: string }[]
}

/** glob → RegExp. `**` 은 세그먼트 0개 이상, `*` 은 한 세그먼트 내부. */
function globToRegExp(pattern: string): RegExp {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // `**/` 는 "디렉터리 0개 이상" — zero-dir 케이스도 매칭돼야 한다
        // (src/app/api/astrology/**/*.ts 가 astrology/route.ts 를 잡아야 함).
        if (pattern[i + 2] === '/') {
          out += '(?:[^/]+/)*'
          i += 2
        } else {
          out += '.*'
          i += 1
        }
      } else {
        out += '[^/]*'
      }
    } else if ('\\^$.|?+()[]{}'.includes(c)) {
      out += `\\${c}`
    } else {
      out += c
    }
  }
  return new RegExp(`^${out}$`)
}

/** 패턴의 와일드카드 앞 고정 디렉터리 — 거기서부터만 걷는다. */
function staticPrefixDir(pattern: string): string {
  const wildcardAt = pattern.search(/[*?[{]/)
  const head = wildcardAt === -1 ? pattern : pattern.slice(0, wildcardAt)
  const lastSlash = head.lastIndexOf('/')
  return lastSlash === -1 ? '' : head.slice(0, lastSlash)
}

function walkFiles(relDir: string): string[] {
  const abs = path.join(ROOT, relDir)
  if (!existsSync(abs)) return []
  if (!statSync(abs).isDirectory()) return [relDir]
  const out: string[] = []
  for (const entry of readdirSync(abs)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
    const rel = relDir ? `${relDir}/${entry}` : entry
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...walkFiles(rel))
    else out.push(rel)
  }
  return out
}

function matchPattern(pattern: string): string[] {
  const re = globToRegExp(pattern)
  return walkFiles(staticPrefixDir(pattern)).filter((f) => re.test(f))
}

describe('vercel.json — functions 패턴', () => {
  const patterns = Object.keys(vercelConfig.functions ?? {})

  it('functions 블록이 비어 있지 않다(가드가 조용히 무력화되는 것 방지)', () => {
    expect(patterns.length).toBeGreaterThan(0)
  })

  // 자기검증: 매처가 실제로 동작하는지. 매처가 망가져서 "전부 매칭됨" 이 되면
  // 아래 가드가 통과만 하고 아무것도 안 잡는다.
  it('glob 매처 자체가 동작한다', () => {
    expect(matchPattern('src/app/api/astrology/**/*.ts').length).toBeGreaterThan(1)
    // zero-dir 케이스
    expect(matchPattern('src/app/api/astrology/**/*.ts')).toContain(
      'src/app/api/astrology/route.ts'
    )
    // 존재하지 않는 경로는 0건이어야 한다 — 사고 당시의 잘못된 패턴.
    expect(matchPattern('app/api/calendar/route.ts')).toEqual([])
    expect(matchPattern('app/api/astrology/**/*.ts')).toEqual([])
  })

  it.each(patterns)('%s 가 실제 파일 1개 이상에 매칭된다', (pattern) => {
    expect(
      matchPattern(pattern).length,
      `vercel.json 의 functions 패턴 "${pattern}" 이 아무 파일에도 매칭되지 않는다. ` +
        `maxDuration/includeFiles 가 적용되지 않고, Vercel 이 배포를 거부할 수 있다. ` +
        `이 프로젝트의 라우트는 src/app/ 아래에 있다.`
    ).toBeGreaterThan(0)
  })

  it('패턴이 src/ 프리픽스를 쓴다 (app/ 로 쓰면 0건 매칭)', () => {
    for (const pattern of patterns) {
      expect(pattern.startsWith('src/'), `"${pattern}" 은 src/ 로 시작해야 한다`).toBe(true)
    }
  })
})

describe('vercel.json — crons', () => {
  const crons = vercelConfig.crons ?? []

  it('cron 이 등록돼 있다', () => {
    expect(crons.length).toBeGreaterThan(0)
  })

  it('동일 path 가 중복 등록되지 않는다 (Vercel 설정 검증에서 거부됨)', () => {
    const seen = new Map<string, number>()
    for (const c of crons) seen.set(c.path, (seen.get(c.path) ?? 0) + 1)
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([p, n]) => `${p} ×${n}`)
    expect(
      dupes,
      `cron path 중복 — Vercel 이 배포를 거부한다. 여러 시각에 돌려야 하면 ` +
        `엔트리를 늘리지 말고 cron 식에 콤마 리스트를 쓴다(예: "0 3,10,22 * * *"): ` +
        dupes.join(', ')
    ).toEqual([])
  })

  it.each(crons.map((c) => c.path))('%s 에 대응하는 route.ts 가 존재한다', (cronPath) => {
    // 쿼리스트링이 붙어 있을 수 있으므로 떼고 검사.
    const clean = cronPath.split('?')[0]
    const routeFile = path.join(ROOT, 'src/app', clean, 'route.ts')
    expect(
      existsSync(routeFile),
      `cron "${cronPath}" 이 가리키는 핸들러가 없다 — 매일 404 를 호출하게 된다. ` +
        `기대 경로: src/app${clean}/route.ts`
    ).toBe(true)
  })

  it('cron 식이 5필드 표준 형식이다', () => {
    for (const c of crons) {
      const fields = c.schedule.trim().split(/\s+/)
      expect(fields, `"${c.path}" 의 schedule "${c.schedule}" 은 5필드여야 한다`).toHaveLength(5)
    }
  })

  // social-publish 는 라우트 주석이 "22/03/10 UTC" 를 명시한다. 중복 엔트리를
  // 한 줄로 합칠 때 시각이 바뀌지 않았는지 고정한다.
  it('social-publish 는 03/10/22 UTC 세 번 그대로 돈다', () => {
    const sp = crons.filter((c) => c.path === '/api/cron/social-publish')
    expect(sp).toHaveLength(1)
    expect(sp[0].schedule).toBe('0 3,10,22 * * *')
  })
})
