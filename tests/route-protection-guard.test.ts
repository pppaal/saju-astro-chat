// tests/route-protection-guard.test.ts
//
// 가드(=훅): "새 라우트가 CSRF/auth/rate-limit 을 깜빡하고 무방비로 배포되는"
// 재발을 소스 레벨로 막는다.
//
// 근본 원인: 이 앱엔 전역 엣지 middleware.ts 가 없다 — 모든 보호(CSRF/auth/
// rate-limit/credit)는 라우트마다 withApiMiddleware 로 *opt-in* 이다. 즉 라우트
// 하나가 래핑을 빠뜨리면 그 라우트는 아무 보호 없이 나간다. 이 실수는 리뷰로만
// 걸러지므로 반드시 재발한다.
//
// 해결: mutating 라우트(POST/PUT/PATCH/DELETE)는 (a) withApiMiddleware 를 타거나,
// (b) 손수 가드를 조립하는 의도적 예외로서 아래 HANDROLLED 목록에 등재되고 그
// 목록이 요구하는 보호 토큰을 실제로 포함해야 한다. 둘 다 아니면 CI 가 잡는다.
// 목록에 새 항목을 넣으려면 "왜 withApiMiddleware 를 안 쓰는지 + 무엇으로 보호
// 하는지"를 의식적으로 적어야 한다.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'

const ROOT = process.cwd()
const API_ROOT = resolve(ROOT, 'src/app/api')

function findRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findRouteFiles(full))
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') out.push(full)
  }
  return out
}

const rel = (f: string) => relative(ROOT, f).replace(/\\/g, '/')

// mutating handler(POST/PUT/PATCH/DELETE)를 export 하는가.
const MUTATING = /export\s+(?:async\s+function|const)\s+(?:POST|PUT|PATCH|DELETE)\b/

// 의도적으로 withApiMiddleware 를 우회하는 라우트 — 각 항목은 그 라우트가 반드시
// 포함해야 하는 보호 토큰(정규식)을 명시한다. 'disabled' 는 전 메서드가 404 를
// 돌려주는 스텁이라 보호가 필요 없음을 뜻한다.
const HANDROLLED: Record<string, { reason: string; requires: RegExp }> = {
  'src/app/api/auth/[...nextauth]/route.ts': {
    reason: 'Auth.js v5 프레임워크 핸들러(handlers) — 자체 보호',
    requires: /\bhandlers\b/,
  },
  'src/app/api/compatibility/counselor/route.ts': {
    reason: '스트리밍 과금 라우트 — initializeApiContext+createAuthenticatedGuard 수동 조립',
    requires: /initializeApiContext|createAuthenticatedGuard/,
  },
  'src/app/api/tarot/interpret-stream/route.ts': {
    reason: '스트리밍 과금 라우트 — initializeApiContext+createPublicStreamGuard 수동 조립',
    requires: /initializeApiContext|createPublicStreamGuard/,
  },
  'src/app/api/tarot/couple-reading/route.ts': {
    reason: '비활성 스텁 — 전 메서드 404',
    requires: /couple_tarot_disabled|status:\s*404/,
  },
  'src/app/api/astrology/advanced/progressions/route.ts': {
    reason: 'advanced 점성 — rateLimit+requirePublicToken 수동 조립',
    requires: /requirePublicToken/,
  },
  'src/app/api/astrology/advanced/solar-return/route.ts': {
    reason: 'advanced 점성 — rateLimit+requirePublicToken 수동 조립',
    requires: /requirePublicToken/,
  },
  // cron 라우트 — 전부 CRON_SECRET 로 인가(Vercel Cron/GitHub Actions 만 호출).
  'src/app/api/cron/anomaly-check/route.ts': { reason: 'cron', requires: /CRON_SECRET/ },
  'src/app/api/cron/ig-token-refresh/route.ts': { reason: 'cron', requires: /CRON_SECRET/ },
  'src/app/api/cron/keyday-push/route.ts': { reason: 'cron', requires: /CRON_SECRET/ },
  'src/app/api/cron/reconcile-activity/route.ts': { reason: 'cron', requires: /CRON_SECRET/ },
  'src/app/api/cron/social-drafts/route.ts': { reason: 'cron', requires: /CRON_SECRET/ },
  'src/app/api/cron/social-insights/route.ts': { reason: 'cron', requires: /CRON_SECRET/ },
  'src/app/api/cron/social-publish/route.ts': { reason: 'cron', requires: /CRON_SECRET/ },
  'src/app/api/cron/threads-token-refresh/route.ts': { reason: 'cron', requires: /CRON_SECRET/ },
  'src/app/api/cron/winback-push/route.ts': { reason: 'cron', requires: /CRON_SECRET/ },
}

describe('API 라우트 보호 커버리지 가드(=훅) — 무방비 라우트 재발 방지', () => {
  const routeFiles = findRouteFiles(API_ROOT)
  const mutatingFiles = routeFiles.filter((f) => MUTATING.test(readFileSync(f, 'utf8')))

  it('mutating 라우트는 전부 withApiMiddleware 를 타거나 HANDROLLED 예외에 등재돼 있다', () => {
    const offenders: string[] = []
    for (const file of mutatingFiles) {
      const r = rel(file)
      const src = readFileSync(file, 'utf8')
      const wrapped = /\bwithApiMiddleware\b/.test(src)
      if (!wrapped && !HANDROLLED[r]) offenders.push(r)
    }
    expect(
      offenders,
      `아래 mutating 라우트가 withApiMiddleware 도 안 쓰고 HANDROLLED 예외에도 없다.\n` +
        `보호를 붙이거나(withApiMiddleware), 의도적 예외면 이유+보호토큰과 함께 등재하라:\n  ` +
        offenders.join('\n  ')
    ).toEqual([])
  })

  it('HANDROLLED 예외 라우트는 명시한 보호 토큰을 실제로 포함한다 (naked 방지)', () => {
    const naked: string[] = []
    for (const [path, { requires }] of Object.entries(HANDROLLED)) {
      const abs = resolve(ROOT, path)
      let src = ''
      try {
        src = readFileSync(abs, 'utf8')
      } catch {
        continue // 존재성은 아래 stale 테스트가 검증
      }
      if (!requires.test(src)) naked.push(`${path} (요구: ${requires})`)
    }
    expect(
      naked,
      `HANDROLLED 예외인데 요구된 보호 토큰이 사라졌다(무방비 가능):\n  ${naked.join('\n  ')}`
    ).toEqual([])
  })

  it('HANDROLLED 목록에 stale 항목이 없다 (존재 + 실제로 unwrapped + mutating)', () => {
    const stale: string[] = []
    for (const path of Object.keys(HANDROLLED)) {
      const abs = resolve(ROOT, path)
      let src = ''
      try {
        src = readFileSync(abs, 'utf8')
      } catch {
        stale.push(`${path} (파일 없음)`)
        continue
      }
      if (/\bwithApiMiddleware\b/.test(src))
        stale.push(`${path} (이제 withApiMiddleware 사용 → 예외 불필요)`)
    }
    expect(stale, `HANDROLLED 목록을 정리하라:\n  ${stale.join('\n  ')}`).toEqual([])
  })
})
