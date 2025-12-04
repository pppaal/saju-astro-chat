import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import KakaoProvider from 'next-auth/providers/kakao'
import FacebookProvider from 'next-auth/providers/facebook'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

const providers: any[] = []

// Email/Password (always included)
providers.push(
  CredentialsProvider({
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null
      const user = await prisma.user.findUnique({ where: { email: credentials.email } })
      if (!user?.passwordHash) return null
      const ok = await bcrypt.compare(credentials.password, user.passwordHash)
      if (!ok) return null
      return { id: user.id, email: user.email, name: user.name }
    },
  })
)

// Google
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }))
}

// Kakao
if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  providers.push(KakaoProvider({
    clientId: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
  }))
}

// Facebook
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  providers.push(FacebookProvider({
    clientId: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
  }))
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: 'jwt' },
  pages: { signIn: '/myjourney' },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
      }
      return session
    },
  },
}
