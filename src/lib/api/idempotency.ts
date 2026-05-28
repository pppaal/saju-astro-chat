// 새로고침/뒤로가기/다른 탭 등으로 같은 요청이 다시 들어왔을 때 크레딧이
// 중복 차감되지 않도록 막는 멱등성 가드.
//
// 패턴:
//   1) 클라이언트가 매 turn 마다 고유 키(UUID 또는 결정론적 signature)를
//      'x-idempotency-key' 헤더로 보냄.
//   2) 라우트 핸들러는 (userId|ip):key 로 scope 해서 모듈 스코프 Map 에
//      6 시간 TTL 로 기억.
//   3) 같은 키가 재진입하면 isIdempotentReplay 가 true — 크레딧 차감만
//      건너뛰고 (LLM 호출은 정상 진행 가능, 결과는 다시 받음).
//
// 한계: Vercel serverless 인스턴스 lifespan 안에서만 유효 (cold start 되면
// 잊음). 그래서 1 차 방어는 클라이언트의 sessionStorage / 명시적
// idempotency-key 생성. 여기는 그걸 뚫고 들어온 케이스만 잡으면 충분.

import type { NextRequest } from 'next/server'

const IDEMPOTENCY_TTL_MS = 6 * 60 * 60 * 1000
const IDEMPOTENCY_MAX_ENTRIES = 500

/**
 * 라우트별 독립 store. 한 라우트의 키가 다른 라우트로 새지 않게 라우트
 * 핸들러에서 createIdempotencyStore() 로 한 번 생성해 모듈 스코프에 보관.
 */
export function createIdempotencyStore() {
  const processed = new Map<string, number>()

  /** 클라이언트 헤더에서 키 추출. ownerKey 는 보통 userId 또는 ip. */
  function keyFor(req: NextRequest, ownerKey: string): string | null {
    const raw = req.headers.get('x-idempotency-key')?.trim()
    if (!raw) return null
    // 길이 가드 — 비정상 헤더 거부.
    if (raw.length > 256) return null
    return `${ownerKey}:${raw}`
  }

  function isReplay(scopedKey: string): boolean {
    const expiresAt = processed.get(scopedKey)
    if (!expiresAt) return false
    if (Date.now() > expiresAt) {
      processed.delete(scopedKey)
      return false
    }
    return true
  }

  function mark(scopedKey: string): void {
    // size 가 너무 커지면 만료된 항목부터 청소. 만료 없이도 한계 넘으면 가장
    // 오래된 것 일부를 절단 — 메모리 무한 증가 방지.
    if (processed.size > IDEMPOTENCY_MAX_ENTRIES) {
      const now = Date.now()
      for (const [k, exp] of processed.entries()) {
        if (now > exp) processed.delete(k)
      }
      if (processed.size > IDEMPOTENCY_MAX_ENTRIES) {
        const dropCount = processed.size - IDEMPOTENCY_MAX_ENTRIES
        const it = processed.keys()
        for (let i = 0; i < dropCount; i += 1) {
          const k = it.next().value
          if (k !== undefined) processed.delete(k)
        }
      }
    }
    processed.set(scopedKey, Date.now() + IDEMPOTENCY_TTL_MS)
  }

  return { keyFor, isReplay, mark }
}

export type IdempotencyStore = ReturnType<typeof createIdempotencyStore>
