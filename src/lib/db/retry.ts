// 일시적(transient) DB 연결 실패를 짧은 백오프로 재시도하는 헬퍼.
//
// 배경: 서버리스(Vercel) + Supabase 풀러(PgBouncer/Supavisor) 환경에서는
// 풀러 콜드 스타트·커넥션 슬롯 고갈 때문에 쿼리 한 방이 일시적으로 실패할
// 수 있다. 이런 실패는 보통 "즉시 다시 시도하면 성공"한다 — 풀러가 슬롯을
// 비우거나 컴퓨트가 깨어나기까지 수십~수백 ms 면 충분하기 때문.
//
// 특히 NextAuth OAuth 콜백 경로(getUserByAccount/createUser/linkAccount)에서
// 어댑터가 throw 하면 @auth/core 가 그 에러를 CallbackRouteError 로 감싸고,
// 그건 client-safe 목록에 없어서 무조건 `?error=Configuration` 페이지("서버
// 설정 문제")로 떨어진다. 즉 일시적 DB hiccup 한 번이 곧바로 "가끔 로그인이
// 안 되는" 증상으로 보인다. 여기서 한두 번 재시도해 흡수하면 그 증상이 거의
// 사라진다.
//
// 주의: 논리 에러(unique 위반 등)는 transient 가 아니므로 재시도하지 않고
// 그대로 throw 한다. write(create/link)도 재시도 대상이지만, 지배적 실패
// 모드인 "커넥션 체크아웃 타임아웃"은 쿼리가 실행되기 전에 실패하므로
// 재시도가 안전하다. (이미 commit 된 뒤 연결이 끊긴 희귀 케이스에서 재시도가
// unique 위반을 만나면 그건 non-transient 로 분류돼 즉시 throw 된다.)

import { logger } from '@/lib/logger'

const TRANSIENT_MARKERS = [
  'echeckouttimeout',
  'unable to check out a connection',
  'timed out fetching a new connection',
  'connection terminated',
  'connection terminated unexpectedly',
  'server closed the connection',
  'connection closed',
  'terminating connection due to administrator command',
  "can't reach database server",
  'too many connections',
  'remaining connection slots',
  'sorry, too many clients already',
  'connection refused',
  'connection reset',
]

const TRANSIENT_CODES = /\b(econnreset|etimedout|econnrefused|epipe|enotfound|eai_again)\b/

/** pg/Prisma/네트워크 에러 메시지·코드를 보고 일시적 연결 실패인지 판별. */
export function isTransientDbError(err: unknown): boolean {
  if (!err) {
    return false
  }
  const parts: string[] = []
  const collect = (e: unknown, depth: number) => {
    if (!e || typeof e !== 'object' || depth > 3) {
      return
    }
    const o = e as { message?: unknown; code?: unknown; cause?: unknown }
    if (typeof o.message === 'string') {
      parts.push(o.message)
    }
    if (typeof o.code === 'string') {
      parts.push(o.code)
    }
    if (o.cause) {
      collect(o.cause, depth + 1)
    }
  }
  collect(err, 0)
  const hay = parts.join(' ').toLowerCase()
  if (!hay) {
    return false
  }
  if (TRANSIENT_CODES.test(hay)) {
    return true
  }
  return TRANSIENT_MARKERS.some((m) => hay.includes(m))
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface DbRetryOptions {
  /** 최초 시도 외 추가 재시도 횟수. 기본 2 (총 3회 시도). */
  retries?: number
  /** 백오프 기준(ms). 실제 대기 = base*2^attempt + jitter. 기본 120. */
  baseDelayMs?: number
  /** 로그용 라벨. */
  label?: string
}

/**
 * `fn` 을 실행하고, 일시적 DB 연결 실패일 때만 짧은 지수 백오프로 재시도한다.
 * 성공 시 결과를 그대로 반환하므로 호출부 동작은 변하지 않는다(투명).
 */
export async function withDbRetry<T>(fn: () => Promise<T>, opts: DbRetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 2
  const baseDelayMs = opts.baseDelayMs ?? 120
  const label = opts.label ?? 'db'
  let attempt = 0
  for (;;) {
    try {
      return await fn()
    } catch (err) {
      if (attempt >= retries || !isTransientDbError(err)) {
        throw err
      }
      const backoff = baseDelayMs * 2 ** attempt
      const jitter = Math.floor(Math.random() * baseDelayMs)
      const delay = backoff + jitter
      attempt += 1
      logger.warn(`[db] transient error on ${label} — retry ${attempt}/${retries} in ${delay}ms`)
      await sleep(delay)
    }
  }
}
