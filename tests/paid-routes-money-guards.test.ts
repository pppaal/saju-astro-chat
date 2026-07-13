// tests/counselor-idempotency-parity.test.ts
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
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

// 멱등 키 스토어(createIdempotencyStore) 기반 유료 라우트 — content 태그 필수.
const IDEM_STORE_ROUTES: Array<{ label: string; path: string }> = [
  { label: '운명상담사 realtime', path: 'src/app/api/counselor/realtime/route.ts' },
  { label: '궁합 상담사', path: 'src/app/api/compatibility/counselor/route.ts' },
  { label: '타로 후속질문(followup)', path: 'src/app/api/tarot/followup/route.ts' },
]

// 실제로 크레딧을 차감하는 유료 라우트 — 실패 시 환불 경로 필수.
const CHARGING_ROUTES: Array<{ label: string; path: string }> = [
  { label: '운명상담사 realtime', path: 'src/app/api/counselor/realtime/route.ts' },
  { label: '궁합 상담사', path: 'src/app/api/compatibility/counselor/route.ts' },
  { label: '타로 후속질문(followup)', path: 'src/app/api/tarot/followup/route.ts' },
  {
    label: '타로 해석 스트림(interpret-stream)',
    path: 'src/app/api/tarot/interpret-stream/route.ts',
  },
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
    for (const { label, path } of CHARGING_ROUTES) {
      it(`${label}: 환불 경로가 있다 (refundCreditsOnce 직접 호출 또는 makeChargedRefunder)`, () => {
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
})
