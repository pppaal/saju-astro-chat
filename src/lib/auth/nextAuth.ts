// NextAuth v5 (Auth.js) 인스턴스 — 앱 전체에서 단 한 번 초기화한다.
// handlers 는 /api/auth/[...nextauth] 라우트가, auth() 는 서버 측 세션
// 조회(@/lib/auth/session 경유)가 사용한다.

import NextAuth from 'next-auth'
import { authOptions } from './authOptions'

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
