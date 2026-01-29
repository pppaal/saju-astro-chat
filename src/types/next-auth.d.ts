import 'next-auth'
import 'next-auth/jwt'

// next-auth 모듈을 확장합니다.

declare module 'next-auth' {
  /**
   * User 객체에 id를 추가합니다.
   */
  interface User {
    id: string
    email?: string | null
    plan?: string
  }

  /**
   * Session 객체의 user 타입을 확장한 User 타입으로 덮어씁니다.
   */
  interface Session {
    user?: User
  }
}

declare module 'next-auth/jwt' {
  /**
   * JWT 토큰(token)에 id를 추가합니다.
   */
  interface JWT {
    id: string
  }
}
