// src/lib/api/client.ts
// Client-safe fetch wrapper for internal Next.js API routes, plus the global
// credit-modal and balance-refresh event names it dispatches.
//
// Client code imports this module directly ('@/lib/api/client'), never the
// '@/lib/api' barrel, which re-exports server-only helpers (an ESLint
// no-restricted-imports rule enforces this). Keep this file free of server-only
// imports: it ships in the browser bundle.

import { CHARGING_ROUTES } from '@/lib/credits/chargingRoutes'

// ==========================================
// Simple fetch wrapper for internal API calls
// ==========================================

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  /**
   * 401/402 를 받아도 전역 크레딧/로그인 모달을 띄우지 않는다. 사용자가 명시적으로
   * 시작하지 않은 조용한 부수작업(예: 진입 시 컨텍스트 워밍)에서 쓴다 —
   * 비로그인 게스트에게 진입하자마자 로그인 모달이 뜨는 걸 막는다.
   */
  suppressAuthModal?: boolean
}

/**
 * 크레딧/인증 관련 응답을 단일 지점에서 감지해 전역 이벤트로 알린다. 크레딧을
 * 쓰는 모든 호출이 apiFetch 를 거치면, 어떤 화면이든 동일하게 모달이 뜬다.
 * (플로우마다 모달을 따로 부르던 불일치 제거.)
 *  - 402 → 크레딧 소진(로그인 사용자) → 구매 유도 (CreditModalContext)
 *  - 401 → 비로그인 → blur 로그인 모달 (LoginModalContext)
 * body 는 건드리지 않으므로 SSE 스트리밍 응답에도 안전하다.
 */
export const CREDIT_MODAL_EVENT = 'dp:credit-modal'
export type CreditModalKind = 'depleted' | 'guest'

/**
 * 잔액 위젯(CreditBadge) 재조회 신호. 크레딧을 차감(또는 환불)하는 라우트의
 * 응답이 돌아온 시점에 쏘면, 화면 어디의 뱃지든 최신 잔액으로 갱신된다.
 * (직전엔 결제 성공 페이지만 이 이벤트를 쏴서, 상담 채팅 등 장수명 화면에서
 * 턴마다 차감돼도 마운트 시점 숫자가 그대로 남는 stale 표시가 났다.)
 */
export const CREDIT_UPDATE_EVENT = 'credit-update'

// 크레딧을 차감/환불하는 내부 라우트. POST 응답이 오면 잔액이 변했을 수
// 있으므로 CREDIT_UPDATE_EVENT 를 쏜다. 차감은 스트림 본문 전에 커밋되므로
// 헤더 도착 시점이면 이미 반영돼 있다. 목록은 CHARGING_ROUTES(SSOT)에서 파생 —
// 라우트 추가는 src/lib/credits/chargingRoutes.ts 에서만 한다.
const CREDIT_MUTATING_ROUTES: readonly string[] = CHARGING_ROUTES.map((r) => r.apiPath)

function notifyCreditBalanceMaybeChanged(url: string, method?: string): void {
  if (typeof window === 'undefined') return
  if ((method ?? 'GET').toUpperCase() !== 'POST') return
  const path = url.split('?')[0]
  if (!CREDIT_MUTATING_ROUTES.some((route) => path === route || path.endsWith(route))) return
  try {
    window.dispatchEvent(new CustomEvent(CREDIT_UPDATE_EVENT))
  } catch {
    /* 잔액 갱신 신호 실패가 요청 자체를 깨뜨리면 안 됨 */
  }
}

function notifyCreditLimit(res: Response): void {
  if (typeof window === 'undefined') return
  let kind: CreditModalKind | null = null
  if (res.status === 402) kind = 'depleted'
  // 401 = 비로그인. 게스트 폐지 후 모든 gated 액션은 로그인 필수 → blur 로그인
  // 모달로 유도(LoginModalContext 가 'guest' 이벤트를 수신). (audit 2026-06)
  else if (res.status === 401) kind = 'guest'
  if (!kind) return
  try {
    window.dispatchEvent(new CustomEvent(CREDIT_MODAL_EVENT, { detail: { kind } }))
  } catch {
    /* 모달 신호 실패가 요청 자체를 깨뜨리면 안 됨 */
  }
}

/**
 * Wrapper around fetch for API requests to Next.js internal routes.
 * Authentication is handled server-side via session cookies - no client tokens needed.
 */
export async function apiFetch(url: string, options?: ApiFetchOptions): Promise<Response> {
  const { suppressAuthModal, ...fetchOptions } = options ?? {}
  const headers: Record<string, string> = {
    ...options?.headers,
  }

  // Add public API token for internal API routes that require it
  // This token is public (exposed to client) and used for basic API access control
  const publicToken = process.env.NEXT_PUBLIC_API_TOKEN
  if (publicToken) {
    headers['x-api-token'] = publicToken
  }

  // Note: Authentication is handled via httpOnly session cookies
  // No need to send tokens from client-side - this prevents token exposure

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Ensure cookies are sent with requests
  })
  // 크레딧/게스트 한도 응답이면 전역 모달 신호. body 는 안 읽으므로 스트림 안전.
  if (!suppressAuthModal) notifyCreditLimit(response)
  // 과금 라우트 응답이면 잔액 위젯 재조회 신호 (모달 억제 여부와 무관).
  notifyCreditBalanceMaybeChanged(url, fetchOptions.method ?? undefined)
  return response
}
