import 'next-auth'
import 'next-auth/jwt'
import type { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  interface User extends DefaultUser {
    id: string
    email?: string | null
    plan?: string
  }

  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      id: string
      plan?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    plan?: string
  }
}
