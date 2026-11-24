// tests/paid-routes-money-guards.test.ts
//
// 가드(=훅): 돈 나가는(크레딧 차감) 모든 라우트가 두 가지 돈 불변식을 지키는지
// 소스 레벨로 강제한다. 한쪽 라우트에만 보호가 들어가 다른 쪽이 빠지는
// 드리프트(이번에 궁합 라우트에서 발견·수정한 그 패턴)가 재발하면 CI 가 잡는다.
// 새 유료 라우트를 추가할 때도 이 가드가 같이 적용된다.
//
// 불변식 1 (free-replay 차단): 멱등 키 스토어(createIdempotencyStore)를 쓰는
//   라우트는 keyFor 에 content 태그(idemContentTag(...) 또는 contentTag 인자)를
//   반드시 넘겨야 한다. 안 그러면 같은 x-idempotency-key 를 다른 질문에 재사용해
//   첫 차감 후 공짜로 받을 수 있다. (타로 draw/interpret 는 더 강한 서버 발급
//   nonce 를 쓰므로 이 목록엔 없다 — 패턴이 다름.)
//
// 불변식 2 (charge-without-refund 차단): 실제로 차감하는 라우트는 실패 시
//   환불(refundCreditsOnce)을 호출해야 한다. 차감만 하고 환불 경로가 없으면
//   LLM 실패 시 사용자가 돈만 내고 결과를 못 받는다.
//
// (소스 grep 방식은 레포의 counselor-session-regression 와 동일 패턴 — 라우트마다
//  패턴이 달라 단일 함수로 못 묶는 대신, 만족해야 할 불변식을 한 곳에서 강제한다.)
//
// 차감 라우트 목록은 src/lib/credits/chargingRoutes.ts(CHARGING_ROUTES)가 단일 출처다 —
// 클라이언트 잔액 갱신(@/lib/api/client 의 apiFetch)과 이 가드가 같은 목록을 본다. 완전성 가드가
// consumeCredits/checkAndConsumeCredits 를 *호출하는* route.ts 를 AST 로 전수 수집해
// 목록과 정확히 일치하는지 강제하므로, 새 차감 라우트를 목록에 빠뜨리면 CI 가 잡는다.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import ts from 'typescript'
import { CHARGING_ROUTES } from '@/lib/credits/chargingRoutes'

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

// 크레딧을 실제로 차감하는 함수. checkCreditsOnly(잔액 확인만)는 차감이 아니라 제외.
const CHARGE_FNS = new Set(['consumeCredits', 'checkAndConsumeCredits'])

function listRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(resolve(process.cwd(), dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listRouteFiles(rel))
    else if (entry.name === 'route.ts') out.push(rel.split('\\').join('/'))
  }
  return out
}

// 주석·문자열 속 언급은 무시하고 실제 호출식(foo(...) / obj.foo(...))만 센다.
function callsChargeFn(path: string): boolean {
  const sf = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true)
  let found = false
  const visit = (node: ts.Node): void => {
    if (found) return
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : undefined
      if (name && CHARGE_FNS.has(name)) {
        found = true
        return
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

// 멱등 키 스토어(createIdempotencyStore) 기반 유료 라우트 — content 태그 필수.
const IDEM_STORE_ROUTES: Array<{ label: string; path: string }> = [
  { label: '운명상담사 realtime', path: 'src/app/api/counselor/realtime/route.ts' },
  { label: '궁합 상담사', path: 'src/app/api/compatibility/counselor/route.ts' },
  { label: '타로 후속질문(followup)', path: 'src/app/api/tarot/followup/route.ts' },
]

describe('유료 라우트 돈 불변식 가드(=훅) — 드리프트 재발 방지', () => {
  describe('불변식 1: 멱등 키에 content 태그 (free-replay 차단)', () => {
    for (const { label, path } of IDEM_STORE_ROUTES) {
      it(`${label}: keyFor 에 content 태그를 전달한다`, () => {
        const src = read(path)
        // keyFor(...) 호출 안 3번째 인자로 content 태그가 들어가는지(줄바꿈 허용).
        // 두 표기 모두 인정: idemContentTag(...) (상담사) / contentTag 변수 (타로).
        const ok = /keyFor\([\s\S]{0,200}?(idemContentTag\s*\(|contentTag)\b/.test(src)
        expect(
          ok,
          `${path}: idemStore.keyFor(...) 의 contentTag 인자가 빠졌다 — free-replay 누수 위험`
        ).toBe(true)
      })
    }
  })

  describe('불변식 2: 차감 라우트는 실패 시 환불 (charge-without-refund 차단)', () => {
    for (const { apiPath, file: path } of CHARGING_ROUTES) {
      it(`${apiPath}: 환불 경로가 있다 (refundCreditsOnce 직접 호출 또는 makeChargedRefunder)`, () => {
        const src = read(path)
        // 환불은 refundCreditsOnce 직접 호출이거나, 그 불변식(creditType='reading'
        // + refundKey dedupe)을 캡슐화한 공유 헬퍼 makeChargedRefunder 를 통한다.
        const hasRefundPath =
          src.includes('refundCreditsOnce') || src.includes('makeChargedRefunder')
        expect(
          hasRefundPath,
          `${path}: 차감은 하는데 환불 경로(refundCreditsOnce / makeChargedRefunder)가 없다 — 실패 시 사용자 과금 위험`
        ).toBe(true)
      })
    }
  })

  describe('완전성: CHARGING_ROUTES(SSOT) = 실제로 차감을 호출하는 route.ts 전체', () => {
    it('목록의 각 항목은 존재하는 라우트 파일이고 apiPath 가 파일 경로와 일치한다', () => {
      for (const { apiPath, file } of CHARGING_ROUTES) {
        expect(existsSync(resolve(process.cwd(), file)), `${file}: 라우트 파일이 없다`).toBe(true)
        expect(file, `${apiPath}: file 경로가 apiPath 와 어긋난다`).toBe(
          `src/app${apiPath}/route.ts`
        )
      }
      const paths = CHARGING_ROUTES.map((r) => r.apiPath)
      expect(new Set(paths).size, 'CHARGING_ROUTES 에 중복 항목이 있다').toBe(paths.length)
    })

    it('consumeCredits/checkAndConsumeCredits 를 호출하는 모든 route.ts 가 목록에 있다 (역방향도)', () => {
      const charging = listRouteFiles('src/app').filter(callsChargeFn).sort()
      const listed = CHARGING_ROUTES.map((r) => r.file).sort()
      // 감지기 자체가 죽지 않았는지(0건이면 무조건 통과하는 가짜 가드) 먼저 확인.
      expect(charging.length, '차감 호출 감지기가 아무 라우트도 못 찾았다').toBeGreaterThan(0)
      expect(
        charging,
        '차감 라우트 목록 드리프트 — src/lib/credits/chargingRoutes.ts 의 CHARGING_ROUTES 를 갱신하라 ' +
          '(빠지면 환불 가드·클라 잔액 갱신이 모두 누락된다)'
      ).toEqual(listed)
    })
  })
})
