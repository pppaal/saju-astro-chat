// 서버 측 세션 조회 시임(shim).
//
// v4 시절 모든 서버 코드는 `getServerSession(authOptions)` (from 'next-auth')
// 를 직접 호출했고, 테스트들도 'next-auth' 모듈을 목킹했다. v5 는
// NextAuth() 가 돌려주는 auth() 함수를 쓰는 구조라 호출/목킹 지점이 전부
// 흩어지게 되는데, 이 모듈을 유일한 세션 접근 창구로 두면:
//   1) 소스는 import 경로만 바꾸면 되고 (시그니처에서 authOptions 인자만 제거)
//   2) 테스트는 vi.mock('next-auth') → vi.mock('@/lib/auth/session') 치환만으로 유지된다.
//
// 새 코드는 getServerSession() 또는 auth() 어느 쪽을 import 해도 된다 — 동일 함수.

import type { Session } from 'next-auth'
import { auth } from './nextAuth'

export async function getServerSession(): Promise<Session | null> {
  return auth()
}

export { auth }
