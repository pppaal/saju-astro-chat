import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,

  // 여기부터 추가
  callbacks: {
    async session({ session, token }) {
      // user.id를 세션에 주입(Stripe metadata 등에 활용)
      if (session.user && token?.sub) {
        (session.user as any).id = token.sub
      }
      return session
    },
  },
  // 여기까지 추가
}